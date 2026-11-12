"use client";
import { create } from "zustand";
import { agents, AgentId, AgentState, Finding, WorkOrder } from "./scenario";
export type VisualAgent = {
  id: AgentId;
  color: string;
  roomId: string;
  state: AgentState;
  task: string;
};
export type WorkflowEvent = {
  id: string;
  timestamp: string;
  agentId: AgentId;
  type: string;
  roomId?: string;
  findingId?: string;
  payload: Record<string, unknown>;
};
export type Snapshot = {
  id: string;
  mode: "live" | "demo";
  status: string;
  agents: Record<string, unknown> | unknown[];
  findings: Finding[];
  workOrders: WorkOrder[];
  events: WorkflowEvent[];
  summary?: string;
  score?: number;
};
const initialAgents = (): VisualAgent[] =>
  agents.map((a) => ({
    id: a.id,
    color: a.color,
    roomId: a.id === "manager" ? "living" : "hallway",
    state: "Idle",
    task: "Ready when you are",
  }));
type State = {
  inspectionId: string | null;
  mode: "live" | "demo";
  status: string;
  agents: VisualAgent[];
  findings: Finding[];
  workOrders: WorkOrder[];
  events: WorkflowEvent[];
  summary: string;
  score: number | null;
  selectedAgent: string | null;
  selectedFinding: string | null;
  focusRoom: string | null;
  cameraMode: "orbit" | "follow" | "top";
  resetKey: number;
  error: string | null;
  apply: (e: WorkflowEvent) => void;
  hydrate: (s: Snapshot) => void;
  reset: () => void;
};
export const useInspection = create<State>((set) => ({
  inspectionId: null,
  mode: "demo",
  status: "idle",
  agents: initialAgents(),
  findings: [],
  workOrders: [],
  events: [],
  summary: "",
  score: null,
  selectedAgent: null,
  selectedFinding: null,
  focusRoom: null,
  cameraMode: "orbit",
  resetKey: 0,
  error: null,
  reset: () =>
    set({
      inspectionId: null,
      status: "idle",
      agents: initialAgents(),
      findings: [],
      workOrders: [],
      events: [],
      summary: "",
      score: null,
      error: null,
      selectedFinding: null,
    }),
  hydrate: (s) =>
    set((state) => ({
      inspectionId: s.id,
      mode: s.mode,
      status: s.status,
      findings: s.findings,
      workOrders: s.workOrders,
      events: s.events,
      summary: s.summary || "",
      score: s.score ?? null,
      agents: state.agents.map((a) => {
        const source = Array.isArray(s.agents)
          ? s.agents.find((x: unknown) => (x as { id: string }).id === a.id)
          : (s.agents as Record<string, unknown>)[a.id];
        return { ...a, ...((source as Partial<VisualAgent>) || {}) };
      }),
    })),
  apply: (e) =>
    set((s) => {
      if (s.events.some((x) => x.id === e.id)) return {};
      const p = e.payload;
      let state: AgentState | undefined = p.state as AgentState | undefined;
      if (e.type === "agent.moving") state = "Moving";
      if (e.type === "task.failed") state = "Error";
      if (e.type === "task.completed") state = "Completed";
      const next: Partial<State> = {
        events: [...s.events, e],
        agents: s.agents.map((a) =>
          a.id === e.agentId
            ? {
                ...a,
                ...(state ? { state } : {}),
                ...(e.roomId ? { roomId: e.roomId } : {}),
                ...(typeof p.task === "string" ? { task: p.task } : {}),
              }
            : a,
        ),
      };
      if (e.type === "finding.created" && p.finding) {
        const f = p.finding as Finding;
        next.findings = [...s.findings.filter((x) => x.id !== f.id), f];
      }
      if (e.type === "workorder.created" && p.workOrder) {
        const w = p.workOrder as WorkOrder;
        next.workOrders = [...s.workOrders.filter((x) => x.id !== w.id), w];
      }
      if (e.type === "inspection.completed") {
        next.status = "completed";
        next.summary = String(p.summary || "");
        next.score = Number(p.score);
        if (p.findings) next.findings = p.findings as Finding[];
        if (p.workOrders) next.workOrders = p.workOrders as WorkOrder[];
      }
      if (e.type === "task.failed") {
        next.error = String(p.error || p.message || "An agent task failed.");
        next.status = "error";
      }
      return next;
    }),
}));
