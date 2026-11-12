import type { Config, Context } from "@netlify/functions";
import { z } from "zod";
import { apiError, isOperator, jsonBody, requireDemo, requireOperator } from "../../lib/server/auth";
import { createInspection, registry } from "../../lib/server/store";
import { integrationStatus } from "../../lib/server/grok";
import { datasetContext } from "../../lib/server/dataset";
import { DATASET_ID, FARNSWORTH_DATASET_ID } from "../../lib/dataset-registry";
import { claimLiveSlot, createHostedRun, hostedStore, loadHostedRun, markDispatchUnconfirmed, releaseLiveSlot, requestHostedCancel, workerSignature } from "../../lib/server/hosted-store";

export default async function handler(request: Request, context: Context) {
  try {
    const path = new URL(request.url).pathname;
    if (path === "/api/integration/status" && request.method === "GET") {
      const verification = await hostedStore().get("integration-verification", { type: "json" });
      return Response.json({ ...(await integrationStatus()), roundTripVerified: Boolean(verification), authenticated: isOperator(request), execution: "netlify-background", durableRuns: true }, { headers: { "Cache-Control": "no-store" } });
    }
    if (path === "/api/inspections" && request.method === "POST") {
      const input = z.object({ mode: z.enum(["demo", "live"]), speed: z.union([z.literal(1), z.literal(2), z.literal(4)]).default(1), datasetId: z.enum([DATASET_ID, FARNSWORTH_DATASET_ID, "synthetic-apartment"]).optional() }).parse(await jsonBody(request, 4096));
      if (input.mode === "live") { requireOperator(request); if (!(await integrationStatus()).configured) throw new Error("LIVE_NOT_CONFIGURED"); }
      else requireDemo(request);
      const run = createInspection(input.mode, datasetContext(input.datasetId));
      let slotAcquired = false;
      let stored = false;
      let dispatchAttempted = false;
      try {
        if (run.mode === "live") { await claimLiveSlot(run.id); slotAcquired = true; }
        await createHostedRun(run);
        stored = true;
        const timestamp = String(Date.now());
        const signature = workerSignature(run.id, timestamp);
        // The immutable deploy permalink keeps previews and production isolated.
        // Both parts are platform metadata, never caller-controlled headers.
        const siteName = context.site.name || "";
        if (!/^[a-f0-9]{24}$/.test(context.deploy.id) || !/^[a-z0-9][a-z0-9-]*$/.test(siteName)) throw new Error("Invalid platform deployment metadata");
        const origin = `https://${context.deploy.id}--${siteName}.netlify.app`;
        dispatchAttempted = true;
        try {
          const response = await fetch(new URL("/.netlify/functions/caretakr-inspection-background", origin), {
            method: "POST", headers: { "Content-Type": "application/json", "x-caretakr-dispatched-at": timestamp, "x-caretakr-worker-signature": signature },
            body: JSON.stringify({ id: run.id, speed: input.speed }), signal: AbortSignal.timeout(15000),
          });
          if (response.status !== 202) throw new Error("Background dispatch unconfirmed");
        } catch {
          // A timeout can happen after acceptance: retain the Live slot and
          // cancel through a separate object. Never retry ambiguous Bot work.
          await markDispatchUnconfirmed(run.id);
          return Response.json({ id: run.id, mode: run.mode, dispatchUnconfirmed: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
        }
        return Response.json({ id: run.id, mode: run.mode }, { status: 201, headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        if (stored && !dispatchAttempted) {
          run.status = "error";
          run.summary = "Hosted worker dispatch failed before execution. No Grok Bot task was sent.";
          await hostedStore().setJSON(`runs/${run.id}/snapshot`, run);
        }
        if (slotAcquired && !dispatchAttempted) await releaseLiveSlot(run.id);
        throw error;
      } finally { registry.runs.delete(run.id); }
    }
    const match = /^\/api\/inspections\/([a-f0-9-]+)(?:\/(events|cancel))?$/.exec(path);
    if (!match) return new Response(null, { status: 405 });
    const [, id, action] = match;
    const run = await loadHostedRun(id);
    if (run.mode === "live") requireOperator(request);
    if (request.method === "POST" && action === "cancel") {
      if (run.mode === "demo") requireDemo(request);
      if (run.status !== "running") return Response.json({ id, cancelled: false });
      await requestHostedCancel(id);
      return Response.json({ id, cancelled: true }, { headers: { "Cache-Control": "no-store" } });
    }
    if (request.method !== "GET") return new Response(null, { status: 405 });
    if (!action) return Response.json(run, { headers: { "Cache-Control": "no-store" } });
    if (action !== "events") return new Response(null, { status: 405 });
    const encoder = new TextEncoder();
    let stopped = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const started = Date.now();
        const seen = new Set(run.events.map(event => event.id));
        const send = (data: string) => { if (!stopped) controller.enqueue(encoder.encode(data)); };
        try {
          send("retry: 1500\n\n");
          send(`event: snapshot\ndata: ${JSON.stringify(run)}\n\n`);
          while (!stopped && !request.signal.aborted && Date.now() - started < 45000) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            if (stopped || request.signal.aborted) break;
            const latest = await loadHostedRun(id);
            for (const event of latest.events) if (!seen.has(event.id)) {
              send(`id: ${event.id}\nevent: agent-event\ndata: ${JSON.stringify(event)}\n\n`);
              seen.add(event.id);
            }
            send(": heartbeat\n\n");
            if (latest.status !== "running") { send(`event: snapshot\ndata: ${JSON.stringify(latest)}\n\n`); break; }
          }
        } catch {
          // EventSource reconnects and starts from a strongly consistent snapshot.
        } finally { if (!stopped) { stopped = true; controller.close(); } }
      },
      cancel() { stopped = true; },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
  } catch (error) { return apiError(error); }
}
export const config: Config = { path: ["/api/integration/status", "/api/inspections", "/api/inspections/:id", "/api/inspections/:id/events", "/api/inspections/:id/cancel"] };
