import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEnergy,
  healthScore,
  demoFindings,
  validateAnalysis,
  evidence,
  type Analysis,
  type Finding,
} from "../lib/scenario";
import {
  demoProvider,
  executeProvider,
  importedProvider,
  type AIProvider,
} from "../lib/providers";

async function validReport(): Promise<Analysis> {
  return structuredClone(await executeProvider(demoProvider));
}

test("energy calculation measures comparable-night excess deterministically", () => {
  assert.deepEqual(calculateEnergy(), {
    baseline: 1.2,
    observed: 4.8,
    deviationPercent: 300,
    excessKwh: 3.6,
  });
  assert.deepEqual(calculateEnergy([2, 4], 1.5), {
    baseline: 3,
    observed: 1.5,
    deviationPercent: -50,
    excessKwh: -1.5,
  });
});

test("invalid or zero meter baselines cannot produce plausible-looking metrics", () => {
  for (const readings of [[], [0, 0], [-1, 2], [NaN], [Infinity]])
    assert.throws(() => calculateEnergy(readings));
  for (const observed of [-1, NaN, Infinity])
    assert.throws(() => calculateEnergy([1], observed));
});

test("health score uses documented severity deductions and floors at zero", () => {
  assert.equal(healthScore([]), 100);
  assert.equal(healthScore(demoFindings), 62);
  const template = demoFindings[0];
  const allSeverities: Finding[] = (
    ["low", "medium", "high", "critical"] as const
  ).map((severity) => ({ ...template, severity }));
  assert.equal(healthScore(allSeverities), 44);
  assert.equal(
    healthScore(
      Array.from({ length: 5 }, () => ({
        ...template,
        severity: "critical" as const,
      })),
    ),
    0,
  );
});

test("self-contained demo produces sourced findings, matching work orders and a summary", async () => {
  const report = await validReport();
  assert.equal(report.findings.length, 3);
  assert.deepEqual(
    new Set(report.findings.map((f) => f.category)),
    new Set(["water", "energy", "safety"]),
  );
  assert.ok(report.summary.includes("synthetic"));
  for (const finding of report.findings) {
    assert.ok(
      finding.evidenceIds.every((id) =>
        evidence.some((e) => e.id === id && e.synthetic),
      ),
    );
    assert.ok(report.workOrders.some((w) => w.findingIds.includes(finding.id)));
    assert.equal(finding.confidence, null);
  }
});

test("unknown evidence, wrong-room evidence and duplicate finding IDs are rejected", async () => {
  const unknown = await validReport();
  unknown.findings[0].evidenceIds = ["EV-INVENTED"];
  assert.throws(() => validateAnalysis(unknown), /Unknown evidence/);
  const wrongRoom = await validReport();
  wrongRoom.findings[0].evidenceIds = ["EV-002"];
  assert.throws(() => validateAnalysis(wrongRoom), /does not support room/);
  const duplicate = await validReport();
  duplicate.findings.push({ ...duplicate.findings[0] });
  assert.throws(() => validateAnalysis(duplicate), /Duplicate finding ID/);
});

test("orders cannot refer to invented findings, repeat IDs or leave findings unassigned", async () => {
  const unknown = await validReport();
  unknown.workOrders[0].findingIds = ["F-INVENTED"];
  assert.throws(() => validateAnalysis(unknown), /unknown finding/);
  const duplicate = await validReport();
  duplicate.workOrders.push({ ...duplicate.workOrders[0] });
  assert.throws(() => validateAnalysis(duplicate), /Duplicate work order ID/);
  const uncovered = await validReport();
  uncovered.workOrders = [];
  assert.throws(() => validateAnalysis(uncovered), /Every finding requires/);
});

test("runtime schema rejects malformed model output and invalid confidence", async () => {
  assert.throws(() =>
    validateAnalysis({ summary: "invented", findings: [], workOrders: [] }),
  );
  const malformed = await validReport();
  malformed.findings[0].confidence = 1.1;
  assert.throws(() => validateAnalysis(malformed));
  assert.throws(() => importedProvider({ summary: "Only a summary" }));
});

test("imported analyses preserve outputs and do not claim verified provider identity", async () => {
  const input = await validReport();
  const provider = importedProvider(input);
  assert.match(provider.name, /origin unverified/);
  const output = await executeProvider(provider);
  assert.deepEqual(output.findings, input.findings);
  assert.deepEqual(output.workOrders, input.workOrders);
  assert.equal(output.summary, input.summary);
});

test("maintenance waits for both specialists; report waits for work orders", async () => {
  const calls: string[] = [];
  let finishInspection!: (value: Finding[]) => void;
  let finishEnergy!: (value: Finding[]) => void;
  const inspector = new Promise<Finding[]>((resolve) => {
    finishInspection = resolve;
  });
  const energy = new Promise<Finding[]>((resolve) => {
    finishEnergy = resolve;
  });
  const provider: AIProvider = {
    name: "Dependency test",
    analyseInspectionEvidence() {
      calls.push("inspection");
      return inspector;
    },
    analyseEnergyReadings() {
      calls.push("energy");
      return energy;
    },
    async assessMaintenance(findings) {
      calls.push("maintenance");
      assert.equal(findings.length, 3);
      return demoProvider.assessMaintenance(findings);
    },
    async generatePropertyReport(findings, orders) {
      calls.push("report");
      assert.equal(orders.length, 3);
      return demoProvider.generatePropertyReport(findings, orders);
    },
  };
  const result = executeProvider(provider);
  assert.deepEqual(calls, ["inspection", "energy"]);
  finishInspection(demoFindings.filter((f) => f.category !== "energy"));
  await Promise.resolve();
  assert.deepEqual(calls, ["inspection", "energy"]);
  finishEnergy(demoFindings.filter((f) => f.category === "energy"));
  await result;
  assert.deepEqual(calls, ["inspection", "energy", "maintenance", "report"]);
});

test("provider failure propagates and cannot create an apparently completed report", async () => {
  let maintenanceCalled = false;
  const broken: AIProvider = {
    ...demoProvider,
    async analyseInspectionEvidence() {
      throw new Error("Provider unavailable");
    },
    async assessMaintenance() {
      maintenanceCalled = true;
      return [];
    },
  };
  await assert.rejects(executeProvider(broken), /Provider unavailable/);
  assert.equal(maintenanceCalled, false);
});
