import type { Config } from "@netlify/functions";
import { z } from "zod";
import { agents } from "../../lib/scenario";
import { claimHostedRun, hostedStore, isHostedCancelled, loadHostedRun, markDispatchUnconfirmed, releaseLiveSlot, saveHostedEvent, validWorkerRequest } from "../../lib/server/hosted-store";
import { emit, registry, status, type Inspection } from "../../lib/server/store";
import { runDemo } from "../../lib/server/demo";
import { runLive } from "../../lib/server/grok";
import { jsonBody } from "../../lib/server/auth";

export default async function handler(request: Request) {
  // Invalid public invocations return normally: background HTTP acceptance is
  // always 202, and throwing here would make Netlify retry forged requests.
  if (request.method !== "POST") return;
  let input: { id: string; speed: 1 | 2 | 4 };
  try {
    input = z.object({ id: z.string().uuid(), speed: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1) }).parse(await jsonBody(request, 2048));
    if (!validWorkerRequest(request, input.id)) return;
  } catch { return; }
  const { id, speed } = input;
  let claimed = false;
  let run: Inspection | undefined;
  let writes = Promise.resolve();
  let persistenceError: unknown;
  const flush = async () => {
    let pending: Promise<void>;
    do { pending = writes; await pending; } while (pending !== writes);
  };
  let stopped = false;
  let monitor = Promise.resolve();
  const cancel = (message: string) => {
    if (!run || run.status !== "running") return;
    run.status = "error";
    registry.controls.get(id)?.abort();
    for (const agent of agents) if (run.agents[agent.id].state !== "Completed") status(run, agent.id, "Error", message);
    emit(run, "manager", "task.failed", { message, source: "hosted-worker" });
  };
  try {
    // Delivery retries never dispatch the same Bot task twice. Claims are
    // immutable; stale recovery closes old runs, never resumes their tasks.
    claimed = await claimHostedRun(id);
    if (!claimed) return;
    run = await loadHostedRun(id);
    registry.runs.set(id, run);
    if (run.status !== "running") {
      await hostedStore().setJSON(`runs/${id}/snapshot`, run);
      return;
    }
    const activeRun = run;
    const persist = () => {
      const snapshot = structuredClone(activeRun);
      const event = snapshot.events.at(-1);
      if (event) writes = writes.then(() => saveHostedEvent(snapshot, event)).catch(error => {
        persistenceError = error;
        registry.controls.get(id)?.abort();
        cancel("Hosted event persistence failed; inspection stopped safely.");
      });
    };
    registry.listeners.set(id, new Set([persist]));
    const deadline = Date.now() + 13 * 60 * 1000;
    // Awaited background invocation owns this cancellation/deadline monitor.
    // Cancellation flags never compete with the single snapshot writer.
    monitor = (async () => {
      while (!stopped) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (stopped) break;
        try {
          if (Date.now() > deadline) { cancel("Hosted inspection exceeded its 13-minute execution deadline."); break; }
          if (await isHostedCancelled(id)) cancel("Inspection cancelled by operator. Already-dispatched Grok Bot tasks may finish independently.");
        } catch { cancel("Hosted cancellation channel became unavailable; inspection stopped safely."); break; }
      }
    })();
    if (await isHostedCancelled(id)) cancel("Inspection cancelled before execution.");
    if (run.status === "running") {
      if (run.mode === "live") await runLive(run);
      else await runDemo(run, speed);
    }
    await flush();
    if (persistenceError) cancel("Hosted event persistence failed; inspection stopped safely.");
    await flush();
    await hostedStore().setJSON(`runs/${id}/snapshot`, structuredClone(run));
    const response = run.events.find(event => event.type === "evidence.reviewed" && event.payload.source === "grok-bot-sdk" && typeof event.payload.requestId === "string");
    if (run.mode === "live" && response) await hostedStore().setJSON("integration-verification", { verifiedAt: new Date().toISOString(), inspectionId: id, requestId: response.payload.requestId, entryId: response.payload.entryId });
  } catch {
    cancel("Hosted workflow failed. No synthetic results were substituted for Live execution.");
    try {
      await flush();
      if (run) await hostedStore().setJSON(`runs/${id}/snapshot`, structuredClone(run));
      else if (claimed) await markDispatchUnconfirmed(id);
    } catch { console.error("Caretakr could not persist a stopped hosted run", id); }
  } finally {
    stopped = true;
    await monitor;
    await flush();
    if (claimed) {
      registry.listeners.delete(id);
      registry.runs.delete(id);
      registry.controls.delete(id);
    }
    // At this point any execution started by this claimed invocation has been
    // awaited and stopped. An ambiguous claim is retained for stale recovery.
    if (claimed) await releaseLiveSlot(id);
  }
}
export const config: Config = { background: true };
