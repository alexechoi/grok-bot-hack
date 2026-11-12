import { apiError, requireOperator } from "@/lib/server/auth";
import { getGrokClient } from "@/lib/server/grok";
export async function GET(request: Request) {
  try {
    requireOperator(request);
    const { bots, truncated } = await (await getGrokClient()).listBots();
    return Response.json({
      bots: bots.map(({ id, name, sessionId }) => ({ id, name, sessionId })),
      truncated,
    });
  } catch (error) {
    return apiError(error);
  }
}
