import { isOperator } from "@/lib/server/auth";
import { integrationStatus } from "@/lib/server/grok";
export async function GET(request: Request) {
  return Response.json(
    { ...(await integrationStatus()), authenticated: isOperator(request) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
