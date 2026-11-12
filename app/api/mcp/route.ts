import { roleFromRequest } from "@/lib/server/auth";
import { handleMcp } from "@/lib/server/mcp";
export async function POST(request: Request) {
  const role = roleFromRequest(request);
  if (!role)
    return Response.json(
      { error: "AUTH_REQUIRED" },
      {
        status: 401,
        headers: { "WWW-Authenticate": 'Bearer realm="Caretakr MCP"' },
      },
    );
  return handleMcp(request, role);
}
export async function GET(request: Request) {
  const role = roleFromRequest(request);
  if (!role) return Response.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  return Response.json(
    { error: "Use Streamable HTTP POST" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
