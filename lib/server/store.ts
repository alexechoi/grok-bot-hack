import { randomUUID } from "node:crypto";
import {
  agents,
  AgentId,
  AgentState,
  Evidence,
  evidence,
  Finding,
  findingSchema,
  healthScore,
  scoringMethod,
  WorkOrder,
  workOrderSchema,
} from "../scenario";
export type EventType =
  | "task.started"
  | "agent.moving"
  | "agent.status"
  | "evidence.reviewed"
  | "finding.created"
  | "message.sent"
  | "workorder.created"
  | "task.completed"
  | "task.failed"
  | "inspection.completed"
  | "tool.called";
export type AgentEvent = {
  id: string;
  timestamp: string;
  inspectionId: string;
  agentId: AgentId;
  type: EventType;
  roomId?: string;
  findingId?: string;
  payload: Record<string, unknown>;
};
export type Inspection = {
  id: string;
  mode: "demo" | "live";
  status: "running" | "completed" | "error";
  createdAt: string;
  agents: Record<AgentId, { state: AgentState; task: string; roomId: string }>;
  findings: Finding[];
  workOrders: WorkOrder[];
  events: AgentEvent[];
  summary: string;
  score: number | null;
  scoringMethod: string;
  provenance: string;
};
type Registry = {
  runs: Map<string, Inspection>;
  listeners: Map<string, Set<(event: AgentEvent) => void>>;
  roundTripVerified: boolean;
  lastStart: number;
  controls: Map<string,AbortController>;
};
const globalRegistry = globalThis as typeof globalThis & {
  __caretakrRegistry?: Registry;
};
export const registry = (globalRegistry.__caretakrRegistry ??= {
  runs: new Map(),
  listeners: new Map(),
  roundTripVerified: false,
  lastStart: 0,
  controls: new Map(),
});
registry.controls ??= new Map();
export function createInspection(mode: "demo" | "live") {
  if (
    [...registry.runs.values()].filter((x) => x.status === "running").length >=
    8
  )
    throw new Error("RATE_LIMITED");
  for (const [id, run] of registry.runs) {
    if (registry.runs.size > 30 && run.status !== "running") {
      registry.runs.delete(id);
      registry.listeners.delete(id);
    }
  }
  const run: Inspection = {
    id: randomUUID(),
    mode,
    status: "running",
    createdAt: new Date().toISOString(),
    agents: Object.fromEntries(
      agents.map((a) => [
        a.id,
        { state: "Idle", task: "Ready for assignment", roomId: "living" },
      ]),
    ) as Inspection["agents"],
    findings: [],
    workOrders: [],
    events: [],
    summary: "",
    score: null,
    scoringMethod,
    provenance:
      mode === "demo"
        ? "Synthetic deterministic scenario. No live AI execution."
        : "Actual Grok Bot desktop-protocol execution via unofficial SDK. Property inputs are synthetic.",
  };
  registry.runs.set(run.id, run);
  return run;
}
export function getInspection(id: string) {
  const run = registry.runs.get(id);
  if (!run) throw new Error("NOT_FOUND");
  return run;
}
export function emit(
  run: Inspection,
  agentId: AgentId,
  type: EventType,
  payload: Record<string, unknown> = {},
  roomId?: string,
  findingId?: string,
) {
  const event: AgentEvent = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    inspectionId: run.id,
    agentId,
    type,
    payload,
    ...(roomId ? { roomId } : {}),
    ...(findingId ? { findingId } : {}),
  };
  run.events.push(event);
  if (run.events.length > 500) run.events.shift();
  for (const cb of registry.listeners.get(run.id) ?? []) cb(event);
  return event;
}
export function status(
  run: Inspection,
  agentId: AgentId,
  state: AgentState,
  task: string,
  roomId?: string,
) {
  run.agents[agentId] = {
    state,
    task,
    roomId: roomId ?? run.agents[agentId].roomId,
  };
  emit(
    run,
    agentId,
    state === "Moving" ? "agent.moving" : "agent.status",
    { state, task },
    roomId,
  );
}
export function sourceEvidence(ids: string[], roomId: string): Evidence[] {
  const items = ids.map((id) => {
    const item = evidence.find((e) => e.id === id);
    if (!item) throw new Error("Unknown evidence reference");
    if (item.roomId !== roomId && item.type !== "epc")
      throw new Error("Evidence room mismatch");
    return item;
  });
  if (!items.some((item) => item.roomId === roomId))
    throw new Error("Finding requires evidence from its room");
  return items;
}
export function recordFinding(run: Inspection, role: AgentId, input: unknown) {
  if (run.status !== "running") throw new Error("Inspection not running");
  if (role !== "inspector" && role !== "energy")
    throw new Error("Role cannot record findings");
  const finding = findingSchema.parse(input);
  if (finding.agentId !== role) throw new Error("Agent identity mismatch");
  if (role === "inspector" && finding.category === "energy")
    throw new Error("Inspector role cannot publish energy findings");
  if (role === "energy" && finding.category !== "energy")
    throw new Error("Energy role category mismatch");
  sourceEvidence(finding.evidenceIds, finding.roomId);
  if (run.findings.some((f) => f.id === finding.id))
    throw new Error("Duplicate finding");
  if (run.findings.length >= 20) throw new Error("Finding limit reached");
  run.findings.push(finding);
  emit(run, role, "finding.created", { finding }, finding.roomId, finding.id);
  return finding;
}
export function createWorkOrder(
  run: Inspection,
  role: AgentId,
  input: unknown,
) {
  if (run.status !== "running" || role !== "maintenance")
    throw new Error("Maintenance role required");
  if (
    run.agents.inspector.state !== "Completed" ||
    run.agents.energy.state !== "Completed"
  )
    throw new Error("Specialist reviews must complete before maintenance");
  const workOrder = workOrderSchema.parse(input);
  if (workOrder.findingIds.some((id) => !run.findings.some((f) => f.id === id)))
    throw new Error("Unknown finding reference");
  if (
    run.workOrders.some((w) => w.id === workOrder.id) ||
    run.workOrders.length >= 20
  )
    throw new Error("Duplicate or excessive work order");
  const originalPriority = workOrder.priority;
  const escapeRouteConcern = run.findings.some(finding => workOrder.findingIds.includes(finding.id) && finding.category === 'safety' && /escape|egress|exit route/i.test(`${finding.title} ${finding.description}`));
  const priorityPolicy = escapeRouteConcern && (originalPriority === 'low' || originalPriority === 'medium') ? 'escape-route-review-minimum-high' : undefined;
  if (priorityPolicy) {
    workOrder.priority = 'high';
    workOrder.action += ' Operational policy: escape-route concerns receive high-priority human review pending clearance measurement.';
  }
  run.workOrders.push(workOrder);
  emit(
    run,
    role,
    "workorder.created",
    { workOrder, originalPriority, ...(priorityPolicy ? {priorityPolicy} : {}) },
    run.findings.find((f) => f.id === workOrder.findingIds[0])?.roomId,
  );
  return workOrder;
}
export function completeInspection(
  run: Inspection,
  role: AgentId,
  summary: string,
) {
  if (role !== "manager" || run.status !== "running")
    throw new Error("Manager role required");
  if (
    ["inspector", "energy", "maintenance"].some(
      (id) => run.agents[id as AgentId].state !== "Completed",
    ) ||
    run.agents.manager.state !== "Reporting"
  )
    throw new Error(
      "All specialist and maintenance tasks must complete before reporting",
    );
  if (!summary.trim() || summary.length > 12000)
    throw new Error("Invalid summary");
  if (
    !run.findings.length ||
    run.findings.some(
      (f) => !run.workOrders.some((w) => w.findingIds.includes(f.id)),
    )
  )
    throw new Error("Every finding requires a maintenance action");
  run.summary = summary;
  run.score = healthScore(run.findings);
  run.status = "completed";
  for (const agent of agents)
    status(run, agent.id, "Completed", "Inspection complete");
  emit(run, role, "inspection.completed", {
    summary,
    score: run.score,
    scoringMethod,
    findings: run.findings,
    workOrders: run.workOrders,
  });
  return run;
}
