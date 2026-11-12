import test from "node:test";
import assert from "node:assert/strict";
import { parseStructuredReply } from "../lib/structured";
import {
  createInspection,
  recordFinding,
  createWorkOrder,
  status,
  registry,
} from "../lib/server/store";
import { demoFindings } from "../lib/scenario";
test("structured replies preserve valid JSON escapes and wrapped JSON", () => {
  const value = {
    requestId: "nonce",
    result: { text: 'Line\n"quoted" \\ path\ttab' },
  };
  assert.deepEqual(parseStructuredReply(JSON.stringify(value)), value);
  assert.deepEqual(
    parseStructuredReply("```json\n" + JSON.stringify(value) + "\n```"),
    value,
  );
});
test("literal control characters inside JSON strings are normalised without losing text", () => {
  assert.deepEqual(
    parseStructuredReply(
      '{"requestId":"nonce","result":{"summary":"First line\nSecond\tline\rEnd"}}',
    ),
    {
      requestId: "nonce",
      result: { summary: "First line\nSecond\tline\rEnd" },
    },
  );
});
test("normalisation neither evaluates expressions nor invents nonce/result fields", () => {
  for (const input of [
    "({result:process.env})",
    '{"result":1}; globalThis.compromised=true',
    '{"result":undefined}',
    '{"result":"unterminated',
  ])
    assert.throws(() => parseStructuredReply(input));
  assert.deepEqual(parseStructuredReply('{"summary":"No nonce"}'), {
    summary: "No nonce",
  });
});
test("escape-route action priority is raised transparently without changing model finding or input order", () => {
  const run = createInspection("live");
  try {
    const finding = { ...demoFindings[2], severity: "medium" as const };
    recordFinding(run, "inspector", finding);
    status(run, "inspector", "Completed", "Done");
    status(run, "energy", "Completed", "Done");
    const raw = {
      id: "WO-ESCAPE",
      title: "Review escape route",
      findingIds: [finding.id],
      priority: "medium" as const,
      action: "Measure clear width",
      trade: "Property operations",
    };
    const result = createWorkOrder(run, "maintenance", raw);
    assert.equal(result.priority, "high");
    assert.match(result.action, /Operational policy:/);
    assert.equal(raw.priority, "medium");
    assert.equal(raw.action, "Measure clear width");
    assert.equal(run.findings[0].severity, "medium");
    const event = run.events.at(-1)!;
    assert.equal(event.payload.originalPriority, "medium");
    assert.equal(
      event.payload.priorityPolicy,
      "escape-route-review-minimum-high",
    );
  } finally {
    registry.runs.clear();
    registry.listeners.clear();
  }
});
test("unrelated energy action priority and critical escape-route urgency are preserved", () => {
  for (const source of [demoFindings[1], demoFindings[2]]) {
    const run = createInspection("live");
    try {
      recordFinding(run, source.agentId, source);
      status(run, "inspector", "Completed", "Done");
      status(run, "energy", "Completed", "Done");
      const priority =
        source.category === "energy" ? ("low" as const) : ("critical" as const);
      const result = createWorkOrder(run, "maintenance", {
        id: "WO",
        title: source.title,
        findingIds: [source.id],
        priority,
        action: "Review source evidence",
        trade: "Operations",
      });
      assert.equal(result.priority, priority);
      assert.equal(run.events.at(-1)!.payload.priorityPolicy, undefined);
    } finally {
      registry.runs.clear();
      registry.listeners.clear();
    }
  }
});
