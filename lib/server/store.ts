import { randomUUID } from "node:crypto";
import {verifySourceImage} from './dataset';
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
  PhotoObservation,
  photoObservationSchema,
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
  | "tool.called"
  | "photo.review.started"
  | "photo.observation.created";
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
  datasetId: string;
  propertyName: string;
  evidence: Evidence[];
  photoObservations: PhotoObservation[];
  referencePhotosEnabled: boolean;
};
export type InspectionContext = Pick<Inspection,'datasetId'|'propertyName'|'evidence'|'provenance'|'referencePhotosEnabled'>;
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
export function createInspection(mode: "demo" | "live", context?:InspectionContext) {
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
    datasetId: context?.datasetId ?? 'synthetic-apartment',
    propertyName: context?.propertyName ?? 'The Willow Apartment',
    evidence: structuredClone(context?.evidence ?? evidence),
    photoObservations: [],
    referencePhotosEnabled: context?.referencePhotosEnabled ?? false,
    score: null,
    scoringMethod,
    provenance: context?.provenance ?? (
      mode === "demo"
        ? "Synthetic deterministic scenario. No live AI execution."
        : "Actual Grok Bot desktop-protocol execution via unofficial SDK. Property inputs are synthetic."),
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
  if (run.status !== 'running') {
    const terminalStatus = type === 'agent.status' && payload.state === (run.status === 'error' ? 'Error' : 'Completed');
    const terminalEvent = run.status === 'error' ? type === 'task.failed' : type === 'inspection.completed';
    if (!terminalStatus && !terminalEvent) throw new Error('Inspection is terminal');
  }
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
  if ((run.status === 'error' && state !== 'Error') || (run.status === 'completed' && state !== 'Completed')) throw new Error('Inspection is terminal');
  run.agents[agentId] = {
    state,
    task,
    roomId: roomId ?? run.agents[agentId].roomId,
  };
  const photo=(run.evidence??evidence).find(item=>item.roomId===run.agents[agentId].roomId&&(item.type==='photo'||item.photoUnavailable));
  emit(
    run,
    agentId,
    state === "Moving" ? "agent.moving" : "agent.status",
    { state, task, ...(photo?{evidenceIds:[photo.id],photoUrl:photo.photoUrl??null,sourceUrl:photo.sourceUrl,photoUnavailable:photo.photoUnavailable??false}: {}) },
    roomId,
  );
}
export function sourceEvidence(ids: string[], roomId: string, sources:Evidence[]=evidence): Evidence[] {
  const items = ids.map((id) => {
    const item = sources.find((e) => e.id === id);
    if (!item) throw new Error("Unknown evidence reference");
    if (item.roomId !== roomId && item.type !== "epc" && item.scope !== 'synthetic-context')
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
  const sources=sourceEvidence(finding.evidenceIds, finding.roomId,run.evidence??evidence);
  if(run.referencePhotosEnabled&&!sources.some(source=>source.synthetic&&source.roomId===finding.roomId&&(source.scope==='synthetic-incident'||source.scope==='synthetic-reading')))throw new Error('Reference photos provide context only; incident findings require the matching synthetic incident or meter input');
  if(run.referencePhotosEnabled&&!/synthetic|simulat/i.test(finding.description))throw new Error('Incident findings must explicitly identify the synthetic scenario');
  if (run.findings.some((f) => f.id === finding.id))
    throw new Error("Duplicate finding");
  if (run.findings.length >= 20) throw new Error("Finding limit reached");
  run.findings.push(finding);
  emit(run, role, "finding.created", { finding }, finding.roomId, finding.id);
  return finding;
}
export function recordPhotoObservation(run:Inspection,input:unknown){
  if(run.mode!=='live'||run.status!=='running')throw new Error('Photo observations require a running live inspection');
  const observation=photoObservationSchema.parse(input);
  const photo=(run.evidence??evidence).find(item=>item.id===observation.evidenceId);
  if(!photo||photo.roomId!==observation.roomId||photo.sourceUrl!==observation.sourceUrl||photo.scope!=='reference-context')throw new Error('Photo observation source mismatch');
  if(observation.access==='viewed'&&(!photo.imageUrl||photo.photoUnavailable||photo.type!=='photo'||observation.provenance.provider!=='grok-bot-sdk'||!observation.provenance.sourceDigestVerified||!verifySourceImage(photo.imageUrl,observation,run.datasetId)))throw new Error('Unavailable or unverified photo cannot be marked visually reviewed');
  if(observation.provenance.provider==='dataset-manifest'&&(observation.access!=='unavailable'||!photo.photoUnavailable))throw new Error('Manifest observations only record unavailable reference photos');
  if(run.photoObservations.some(item=>item.id===observation.id||item.evidenceId===observation.evidenceId&&item.agentId===observation.agentId))throw new Error('Duplicate photo observation');
  run.photoObservations.push(observation);
  emit(run,observation.agentId,'photo.observation.created',{observation,photoUrl:photo.photoUrl??null,sourceUrl:photo.sourceUrl,evidenceIds:[photo.id],photoUnavailable:observation.access==='unavailable'},observation.roomId);
  return observation;
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
  if(run.mode==='live'&&run.referencePhotosEnabled){
    if(['hallway','bathroom','kitchen'].some(roomId=>!run.photoObservations.some(observation=>observation.roomId===roomId)))throw new Error('Every reference zone requires a reviewed-photo result or an explicit unavailability record');
    if(!run.photoObservations.some(observation=>observation.access==='viewed'))throw new Error('No reference photograph passed actual visual-review and source-byte verification');
  }
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
    photoObservations: run.photoObservations,
    evidence: run.evidence,
    datasetId: run.datasetId,
    propertyName: run.propertyName,
  });
  return run;
}
