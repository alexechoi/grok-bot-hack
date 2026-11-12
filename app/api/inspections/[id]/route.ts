import { apiError, requireOperator } from "@/lib/server/auth";
import { getInspection } from "@/lib/server/store";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const run = getInspection((await params).id);
    if (run.mode === "live") requireOperator(request);
    return Response.json(run, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
