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
  capturedAt: string;
};
export const evidence: Evidence[] = [
  {
    id: "EV-001",
    roomId: "bathroom",
    type: "note",
    sourceName: "Bathroom walkthrough note",
    content:
      "A brown water stain approximately 30 cm across is visible at the ceiling junction above the shower. Paint is bubbling. No active dripping was observed. Moisture readings and source investigation have not yet been carried out.",
    synthetic: true,
    capturedAt: "2026-11-12T09:00:00Z",
  },
  {
    id: "EV-002",
    roomId: "hallway",
    type: "note",
    sourceName: "Hallway walkthrough note",
    content:
      "Two storage boxes are positioned beside the entrance and narrow the apparent escape route. Clear width was not measured. Review and clear the route, and confirm safe access.",
    synthetic: true,
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
    capturedAt: "2026-11-12T09:00:00Z",
  },
  {
    id: "EV-005",
    roomId: "living",
    type: "epc",
    sourceName: "Illustrative EPC information",
    content:
      "Synthetic EPC band C. Electric space heating and hot water. No public EPC record or real property address was used. Bedroom and living room walkthrough notes describe no apparent concerns; that is not a safety certification.",
    synthetic: true,
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
      "Water staining and bubbling paint suggest a possible moisture issue above the shower. The source is unconfirmed; a note alone cannot establish an active leak.",
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
    description: `The kitchen used ${energyMetrics.observed} kWh against a ${energyMetrics.baseline} kWh comparable-night average: ${energyMetrics.deviationPercent}% above baseline while occupants were away. A running appliance, schedule fault or metering error warrants investigation. Cause is not confirmed.`,
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
      "Storage boxes appear to narrow the hallway escape route. Clear width has not been measured, so compliance cannot be determined from this walkthrough note.",
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
  "Demo operational score: start at 100; subtract 3 per low, 8 per medium, 15 per high and 30 per critical finding; floor at 0. Not a certified building or safety assessment.";
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
      if (e.roomId !== f.roomId && e.type !== "epc")
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
  living: { name: "Living room", point: [-3, 0, 2.2] },
  kitchen: { name: "Kitchen", point: [-3, 0, -2.2] },
  bathroom: { name: "Bathroom", point: [3.4, 0, -2.3] },
  bedroom: { name: "Bedroom", point: [3.4, 0, 2.4] },
  hallway: { name: "Hallway", point: [0.4, 0, 0] },
};
