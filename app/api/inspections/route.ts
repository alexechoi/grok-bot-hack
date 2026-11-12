import { z } from "zod";
import {
  apiError,
  jsonBody,
  requireDemo,
  requireOperator,
} from "@/lib/server/auth";
import { runDemo } from "@/lib/server/demo";
import { integrationStatus, runLive } from "@/lib/server/grok";
import {datasetContext} from "@/lib/server/dataset";
import {DATASET_ID,FARNSWORTH_DATASET_ID} from "@/lib/dataset-registry";
import { createInspection, registry } from "@/lib/server/store";
export async function POST(request: Request) {
  try {
    const { mode, speed, datasetId } = z
      .object({
        mode: z.enum(["demo", "live"]),
        datasetId:z.enum([DATASET_ID,FARNSWORTH_DATASET_ID,"synthetic-apartment"]).optional(),
        speed: z
          .union([z.literal(1), z.literal(2), z.literal(4)])
          .optional()
          .default(1),
      })
      .parse(await jsonBody(request, 4096));
    if (mode === "demo") requireDemo(request);
    if (mode === "live") {
      requireOperator(request);
      if (!(await integrationStatus()).configured)
        throw new Error("LIVE_NOT_CONFIGURED");
      if (
        [...registry.runs.values()].some(
          (run) => run.mode === "live" && run.status === "running",
        )
      )
        throw new Error("RUN_ALREADY_ACTIVE");
    }
    if (Date.now() - registry.lastStart < 1000) throw new Error("RATE_LIMITED");
    registry.lastStart = Date.now();
    const run = createInspection(mode,datasetContext(datasetId));
    if (mode === "demo") void runDemo(run, speed);
    else void runLive(run);
    return Response.json({ id: run.id, mode }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
