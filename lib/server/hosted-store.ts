/** Hosted runs are single-writer documents, not transactional counters.
 * Immutable events/claims and context-isolated strong reads are kept in Blobs.
 * Preview deployments never read or write the production namespace.
 */
import { getStore, type Store } from "@netlify/blobs";
import { getContext } from "@netlify/functions";
import { createHmac, randomUUID } from "node:crypto";
import { constantEqual } from "./auth";
import type { AgentEvent, Inspection } from "./store";

export function hostedStoreName(deploy?: { context: string; id: string }) {
  let context = "local";
  let deployId: string | undefined;
  try {
    const runtime = deploy || getContext().deploy;
    context = runtime.context;
    deployId = runtime.id;
  } catch {
    if (process.env.NETLIFY === "true") throw new Error("Missing native Function deployment context");
    /* Pure tests and local Next.js use an isolated local namespace. */
  }
  return context === "production" ? "caretakr-production" : `caretakr-preview-${(deployId || context).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40)}`;
}
export function hostedStore() {
  return getStore({ name: hostedStoreName(), consistency: "strong" });
}
export function validRunId(id: string) {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
}
export type HostedBlobStore = Pick<Store, "get" | "setJSON" | "delete">;
export async function loadHostedRun(id: string, store: HostedBlobStore = hostedStore()): Promise<Inspection> {
  if (!validRunId(id)) throw new Error("NOT_FOUND");
  const run = await store.get(`runs/${id}/snapshot`, { type: "json" }) as Inspection | null;
  if (!run || run.id !== id) throw new Error("NOT_FOUND");
  const dispatchFailure = run.status === "running" ? await store.get(`runs/${id}/dispatch-error`, { type: "json" }) as AgentEvent | null : null;
  if (dispatchFailure) {
    // Derived from a durable cancellation receipt; only the background worker
    // writes the authoritative snapshot while it can still be executing.
    run.status = "error";
    for (const agent of Object.values(run.agents)) if (agent.state !== "Completed") { agent.state = "Error"; agent.task = "Hosted dispatch cancelled"; }
    if (!run.events.some(event => event.id === dispatchFailure.id)) run.events.push(dispatchFailure);
  }
  return run;
}
export async function createHostedRun(run: Inspection, store: HostedBlobStore = hostedStore()) {
  const { modified } = await store.setJSON(`runs/${run.id}/snapshot`, run, { onlyIfNew: true });
  if (!modified) throw new Error("RUN_ALREADY_ACTIVE");
}
export async function saveHostedEvent(run: Inspection, event: AgentEvent) {
  const store = hostedStore();
  await store.setJSON(`runs/${run.id}/events/${event.id}`, event, { onlyIfNew: true });
  await store.setJSON(`runs/${run.id}/snapshot`, run);
}
export async function claimHostedRun(id: string, store: HostedBlobStore = hostedStore()) {
  const result = await store.setJSON(`runs/${id}/worker-claim`, { startedAt: new Date().toISOString() }, { onlyIfNew: true });
  return result.modified;
}
/** Recovery never re-dispatches a task. After 16 minutes, the platform's
 * 15-minute invocation ceiling guarantees the old writer has stopped. A unique
 * recovery claim permits exactly one replacement writer to close the document.
 */
export async function recoverExpiredLiveSlot(store: HostedBlobStore = hostedStore(), now = Date.now()) {
  const owner = await store.get("live-slot", { type: "json" }) as { id: string; createdAt: string } | null;
  if (!owner || !validRunId(owner.id)) return;
  const claim = await store.get(`runs/${owner.id}/worker-claim`, { type: "json" }) as { startedAt: string } | null;
  const lastStart = Math.max(Date.parse(owner.createdAt), claim ? Date.parse(claim.startedAt) : 0);
  if (!Number.isFinite(lastStart) || now - lastStart < 16 * 60 * 1000) return;
  const recovery = await store.setJSON(`runs/${owner.id}/recovery-claim`, { recoveredAt: new Date(now).toISOString() }, { onlyIfNew: true });
  if (!recovery.modified) return;
  await store.setJSON(`runs/${owner.id}/cancel`, { requestedAt: new Date(now).toISOString() }, { onlyIfNew: true });
  const run = await store.get(`runs/${owner.id}/snapshot`, { type: "json" }) as Inspection | null;
  if (run?.status === "running") {
    run.status = "error";
    for (const agent of Object.values(run.agents)) if (agent.state !== "Completed") { agent.state = "Error"; agent.task = "Hosted worker expired; start a new inspection"; }
    const event: AgentEvent = { id: randomUUID(), timestamp: new Date(now).toISOString(), inspectionId: run.id, agentId: "manager", type: "task.failed", payload: { source: "hosted-worker-recovery", message: "The hosted worker expired. Its tasks were not retried or replayed. Start a new inspection." } };
    run.events.push(event);
    run.events = run.events.slice(-500);
    await store.setJSON(`runs/${run.id}/events/${event.id}`, event, { onlyIfNew: true });
    await store.setJSON(`runs/${run.id}/snapshot`, run);
  }
  // No new owner can exist before this unique recovery releases the old slot.
  await store.delete("live-slot");
}
export async function claimLiveSlot(id: string, store: HostedBlobStore = hostedStore()) {
  await recoverExpiredLiveSlot(store);
  const result = await store.setJSON("live-slot", { id, createdAt: new Date().toISOString() }, { onlyIfNew: true });
  if (!result.modified) throw new Error("RUN_ALREADY_ACTIVE");
}
export async function releaseLiveSlot(id: string) {
  const store = hostedStore();
  const owner = await store.get("live-slot", { type: "json" }) as {id?: string} | null;
  if (owner?.id === id) await store.delete("live-slot");
}
export async function requestHostedCancel(id: string) {
  await hostedStore().setJSON(`runs/${id}/cancel`, { requestedAt: new Date().toISOString() }, { onlyIfNew: true });
}
export async function isHostedCancelled(id: string) {
  return (await hostedStore().get(`runs/${id}/cancel`)) !== null;
}
const dispatchPurpose = "caretakr-background-inspection-v1";
export function workerSignature(id: string, timestamp: string) {
  const secret = process.env.CARETAKR_SESSION_SECRET;
  if (!secret) throw new Error("LIVE_NOT_CONFIGURED");
  return createHmac("sha256", secret).update(`${dispatchPurpose}\n${id}\n${timestamp}`).digest("hex");
}
export function validWorkerRequest(request: Request, id: string) {
  const timestamp = request.headers.get("x-caretakr-dispatched-at") || "";
  const signature = request.headers.get("x-caretakr-worker-signature") || "";
  return validRunId(id) && /^\d{13}$/.test(timestamp) && Math.abs(Date.now() - Number(timestamp)) < 10 * 60 * 1000 && constantEqual(signature, workerSignature(id, timestamp));
}

export async function markDispatchUnconfirmed(id: string, store: HostedBlobStore = hostedStore()) {
  await store.setJSON(`runs/${id}/cancel`, { requestedAt: new Date().toISOString() }, { onlyIfNew: true });
  const event: AgentEvent = { id: randomUUID(), timestamp: new Date().toISOString(), inspectionId: id, agentId: "manager", type: "task.failed", payload: { source: "hosted-dispatch", message: "Hosted dispatch could not be confirmed and was cancelled. Already-dispatched Grok Bot tasks may finish independently; no tasks will be retried." } };
  await store.setJSON(`runs/${id}/dispatch-error`, event, { onlyIfNew: true });
}
