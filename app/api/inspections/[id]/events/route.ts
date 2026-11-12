import { apiError, requireOperator } from "@/lib/server/auth";
import { AgentEvent, getInspection, registry } from "@/lib/server/store";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const run = getInspection((await params).id);
    if (run.mode === "live") requireOperator(request);
    const encoder = new TextEncoder();
    let cleanup = () => {};
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        const send = (text: string) => {
          if (!closed) {
            if ((controller.desiredSize ?? 1) < -100) {
              cleanup();
              return;
            }
            try {
              controller.enqueue(encoder.encode(text));
            } catch {
              cleanup();
            }
          }
        };
        send("retry: 2000\n\n");
        send(`event: snapshot\ndata: ${JSON.stringify(run)}\n\n`);
        const listener = (event: AgentEvent) =>
          send(
            `id: ${event.id}\nevent: agent-event\ndata: ${JSON.stringify(event)}\n\n`,
          );
        const listeners = registry.listeners.get(run.id) ?? new Set();
        listeners.add(listener);
        registry.listeners.set(run.id, listeners);
        const heartbeat = setInterval(() => send(": heartbeat\n\n"), 15000);
        cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          listeners.delete(listener);
          request.signal.removeEventListener("abort", cleanup);
          try {
            controller.close();
          } catch {}
        };
        request.signal.addEventListener("abort", cleanup, { once: true });
      },
      cancel() {
        cleanup();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
