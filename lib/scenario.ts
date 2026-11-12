import { z } from "zod";

export const findingSchema = z.object({
  id: z.string(),
  roomId: z.enum(["bathroom", "kitchen", "hallway", "bedroom", "living"]),
  category: z.enum(["water", "energy", "safety", "other"]),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1).nullable(),
  evidenceIds: z.array(z.string()).min(1),
  recommendedAction: z.string().min(1),
  agentId: z.enum(["inspector", "energy", "maintenance", "manager"]),
  status: z.enum(["new", "reviewed", "actioned"]),
});
export type Finding = z.infer<typeof findingSchema>;
export const workOrderSchema = z.object({
  id: z.string(),
  findingIds: z.array(z.string()).min(1),
  title: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  action: z.string(),
  trade: z.string(),
});
export type WorkOrder = z.infer<typeof workOrderSchema>;
export type Evidence = {
  id: string;
  roomId: string;
  type: "photo" | "note" | "meter" | "epc";
  sourceName: string;
  content: string;
  synthetic: boolean;
  capturedAt?: string;
  sourceUrl?: string;
  photoUrl?: string;
  imageUrl?: string;
  photoUnavailable?: boolean;
  rights?: string;
  attribution?: string;
  sourceDatasetId?: string;
  scope?: 'reference-context' | 'synthetic-incident' | 'synthetic-reading' | 'synthetic-context';
};
export const photoObservationResultSchema = z.object({
  roomId: z.enum(['bathroom','kitchen','hallway','bedroom','living']),
  evidenceId: z.string().min(1),
  sourceUrl: z.string().url(),
  access: z.enum(['viewed','unavailable']),
  imageSha256: z.string().regex(/^[a-f0-9]{64}$/i).nullable(),
  width: z.number().int().positive().max(20000).nullable(),
  height: z.number().int().positive().max(20000).nullable(),
  summary: z.string().min(1).max(4000),
  limitations: z.string().min(1).max(2000),
});
export const photoObservationSchema = photoObservationResultSchema.extend({
  id: z.string().min(1),
  agentId: z.enum(['inspector','energy']),
  timestamp: z.string().datetime(),
  provenance: z.union([
    z.object({provider:z.literal('grok-bot-sdk'),botId:z.string(),requestId:z.string(),entryId:z.string().nullable(),sourceCursor:z.string(),accessBasis:z.enum(['bot-reported-visual-review','verified-image-digest-and-bot-review']),toolActivityObserved:z.boolean(),sourceDigestVerified:z.boolean()}),
    z.object({provider:z.literal('dataset-manifest'),reason:z.string().min(1)}),
  ]),
});
export type PhotoObservation=z.infer<typeof photoObservationSchema>;
export const evidence: Evidence[] = [
  {
    id: "EV-001",
    roomId: "bathroom",
    type: "note",
    sourceName: "Synthetic bathroom incident note",
    content:
      "Synthetic training incident, not an observation of the reference property or its photographs: simulate a brown water stain approximately 30 cm across at the bathroom ceiling junction, with bubbling paint and no active dripping. Moisture readings and source investigation have not yet been carried out. This scenario does not assert that any reference photo shows staining or damage.",
    synthetic: true,
    scope: 'synthetic-incident',
    capturedAt: "2026-11-12T09:00:00Z",
  },
  {
    id: "EV-002",
    roomId: "hallway",
    type: "note",
    sourceName: "Synthetic circulation-route incident note",
    content:
      "Synthetic training incident, not an observation of the reference property or its photographs: simulate two storage boxes near an entrance circulation route, narrowing apparent escape access. Clear width is not measured. Recommend review and clearance of the simulated obstruction. This scenario does not assert that the reference photographs contain boxes or a safety defect.",
    synthetic: true,
    scope: 'synthetic-incident',
    capturedAt: "2026-11-12T09:05:00Z",
  },
  {
    id: "EV-003",
    roomId: "kitchen",
    type: "meter",
    sourceName: "Synthetic electricity submeter · 00:00–06:00",
    content:
      "Seven comparable six-hour baseline nights: 1.1, 1.3, 1.2, 1.0, 1.4, 1.2, 1.2 kWh. Inspection night: 4.8 kWh. Meter covers the kitchen circuit. These are synthetic totals, not a real meter feed.",
    synthetic: true,
    scope: 'synthetic-reading',
    capturedAt: "2026-11-12T06:00:00Z",
  },
  {
    id: "EV-004",
    roomId: "kitchen",
    type: "note",
    sourceName: "Occupancy and appliance schedule",
    content:
      "Two residents. Both report being away on the inspection night. Fridge remains on; oven and dishwasher are scheduled off between 00:00 and 06:00. Occupancy is a synthetic assumption, not independently verified.",
    synthetic: true,
    scope: 'synthetic-context',
    capturedAt: "2026-11-12T09:00:00Z",
  },
  {
    id: "EV-005",
    roomId: "living",
    type: "note",
    sourceName: "Synthetic operations context · not a property certificate",
    content:
      "Synthetic operations scenario only: electric heating and hot-water loads are hypothetical and have not been verified for any reference building. No EPC rating, property certificate, live meter feed or actual occupancy record is asserted. The bedroom and living zone have no incident notes in this scenario; that is not a safety certification.",
    synthetic: true,
    scope: 'synthetic-context',
    capturedAt: "2026-11-12T09:00:00Z",
  },
];
export const baselineReadings = [1.1, 1.3, 1.2, 1.0, 1.4, 1.2, 1.2];
export function calculateEnergy(readings = baselineReadings, observed = 4.8) {
  if (
    !readings.length ||
    readings.some((n) => !Number.isFinite(n) || n < 0) ||
    !Number.isFinite(observed) ||
    observed < 0
  )
    throw new Error("Invalid meter readings");
  const baseline = readings.reduce((a, b) => a + b, 0) / readings.length;
  if (baseline <= 0) throw new Error("Baseline must be positive");
  return {
    baseline: Number(baseline.toFixed(2)),
    observed,
    deviationPercent: Math.round(((observed - baseline) / baseline) * 100),
    excessKwh: Number((observed - baseline).toFixed(2)),
  };
}
export const energyMetrics = calculateEnergy();
export const demoFindings: Finding[] = [
  {
    id: "F-001",
    roomId: "bathroom",
    category: "water",
    title: "Suspected ceiling moisture",
    description:
      "Synthetic scenario: water staining and bubbling paint suggest a possible moisture issue above the shower. The source is unconfirmed; a note alone cannot establish an active leak.",
    severity: "high",
    confidence: null,
    evidenceIds: ["EV-001"],
    recommendedAction:
      "Arrange a prompt plumbing inspection. Check the ceiling void, trace the moisture source and assess damage before repairing finishes.",
    agentId: "inspector",
    status: "new",
  },
  {
    id: "F-002",
    roomId: "kitchen",
    category: "energy",
    title: "Unusual overnight consumption",
    description: `Synthetic scenario: the kitchen used ${energyMetrics.observed} kWh against a ${energyMetrics.baseline} kWh comparable-night average: ${energyMetrics.deviationPercent}% above baseline while occupants were away. A running appliance, schedule fault or metering error warrants investigation. Cause is not confirmed.`,
    severity: "medium",
    confidence: null,
    evidenceIds: ["EV-003", "EV-004", "EV-005"],
    recommendedAction:
      "Check appliance schedules, standby loads and the submeter. Take appliance-level readings on a comparable night before attributing the excess.",
    agentId: "energy",
    status: "new",
  },
  {
    id: "F-003",
    roomId: "hallway",
    category: "safety",
    title: "Potentially obstructed escape route",
    description:
      "Synthetic scenario: storage boxes appear to narrow the hallway escape route. Clear width has not been measured, so compliance cannot be determined from this walkthrough note.",
    severity: "high",
    confidence: null,
    evidenceIds: ["EV-002"],
    recommendedAction:
      "Remove the boxes promptly and review the full escape route. Verify clear access and escalate any remaining concern to a competent fire safety assessor.",
    agentId: "inspector",
    status: "new",
  },
];
const deductions = { low: 3, medium: 8, high: 15, critical: 30 };
export function healthScore(findings: Finding[]) {
  return Math.max(
    0,
    100 - findings.reduce((sum, f) => sum + deductions[f.severity], 0),
  );
}
export const scoringMethod =
  "Operational scenario score: start at 100; subtract 3 per low, 8 per medium, 15 per high and 30 per critical finding; floor at 0. Not a certified building or safety assessment.";
export const reportSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(findingSchema).min(1).max(20),
  workOrders: z.array(workOrderSchema).max(20),
});
export type Analysis = z.infer<typeof reportSchema>;
export function validateAnalysis(input: unknown): Analysis {
  const parsed = reportSchema.parse(input);
  const ids = new Set<string>();
  for (const f of parsed.findings) {
    if (ids.has(f.id)) throw new Error("Duplicate finding ID");
    ids.add(f.id);
    for (const id of f.evidenceIds) {
      const e = evidence.find((e) => e.id === id);
      if (!e) throw new Error(`Unknown evidence: ${id}`);
      if (e.roomId !== f.roomId && e.type !== "epc" && e.scope !== 'synthetic-context')
        throw new Error(`Evidence ${id} does not support room ${f.roomId}`);
    }
  }
  const orderIds = new Set<string>();
  for (const w of parsed.workOrders) {
    if (orderIds.has(w.id)) throw new Error("Duplicate work order ID");
    orderIds.add(w.id);
    if (w.findingIds.some((id) => !ids.has(id)))
      throw new Error("Work order references unknown finding");
  }
  if (
    parsed.findings.some(
      (f) => !parsed.workOrders.some((w) => w.findingIds.includes(f.id)),
    )
  )
    throw new Error("Every finding requires a work order");
  return parsed;
}
export const agents = [
  {
    id: "inspector",
    name: "Scout",
    role: "Property inspector",
    color: "#579bff",
    symbol: "S",
    description:
      "Examines walkthrough evidence, records apparent defects and links each observation to its source.",
  },
  {
    id: "energy",
    name: "Watt",
    role: "Energy analyst",
    color: "#b08aff",
    symbol: "W",
    description:
      "Compares measured consumption with the deterministic baseline and checks occupancy and appliance schedules.",
  },
  {
    id: "maintenance",
    name: "Fix",
    role: "Maintenance engineer",
    color: "#ffb260",
    symbol: "F",
    description:
      "Reviews published findings, evaluates urgency and creates prioritised maintenance work orders.",
  },
  {
    id: "manager",
    name: "Cleo",
    role: "Property manager",
    color: "#9cce92",
    symbol: "C",
    description:
      "Assigns the inspection, waits for specialist reviews and consolidates the final operational report.",
  },
] as const;
export type AgentId = (typeof agents)[number]["id"];
export type AgentState =
  | "Idle"
  | "Assigned"
  | "Moving"
  | "Investigating"
  | "Waiting"
  | "Reporting"
  | "Completed"
  | "Error";
export const rooms: Record<
  string,
  { name: string; point: [number, number, number] }
> = {
  living: { name: "Living room", point: [-3.3, 0, 5.8] },
  kitchen: { name: "Kitchen", point: [3.6, 0, -0.2] },
  bathroom: { name: "Main-floor bathroom", point: [-4.15, 0, -2.2] },
  bedroom: { name: "Main-floor bedroom", point: [-3.3, 0, 1.1] },
  hallway: { name: "Entry / stair circulation", point: [-0.7, 0, 6.4] },
};
