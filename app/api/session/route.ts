import {
  constantEqual,
  jsonBody,
  sameOrigin,
  signSession,
  apiError,
} from "@/lib/server/auth";
const attempts = new Map<string, { count: number; at: number }>();
export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) throw new Error("ORIGIN_REJECTED");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    const previous = attempts.get(ip);
    const entry =
      previous && Date.now() - previous.at < 60000
        ? previous
        : { count: 0, at: Date.now() };
    entry.count++;
    attempts.set(ip, entry);
    if (entry.count > 10) throw new Error("RATE_LIMITED");
    if (attempts.size > 1000) attempts.clear();
    const { token, mode, password } = await jsonBody(request, 4096);
    if (mode === "demo") {
      if (
        request.headers.get("origin") !== new URL(request.url).origin &&
        request.headers.get("origin") !== process.env.CARETAKR_PUBLIC_URL
      )
        throw new Error("ORIGIN_REJECTED");
      if (request.headers.get("sec-fetch-site") !== "same-origin")
        throw new Error("ORIGIN_REJECTED");
      return Response.json(
        { authenticated: true, scope: "demo" },
        {
          headers: {
            "Set-Cookie": `caretakr_demo=${signSession("demo")}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
          },
        },
      );
    }
    if (password !== undefined) {
      const origin = request.headers.get("origin");
      if (
        !origin ||
        (origin !== new URL(request.url).origin &&
          origin !== process.env.CARETAKR_PUBLIC_URL)
      )
        throw new Error("ORIGIN_REJECTED");
      if (request.headers.get("sec-fetch-site") === "cross-site")
        throw new Error("ORIGIN_REJECTED");
      const expectedPassword = process.env.CARETAKR_WORKSPACE_PASSWORD;
      if (!expectedPassword) throw new Error("WORKSPACE_NOT_CONFIGURED");
      if (
        typeof password !== "string" ||
        !constantEqual(password, expectedPassword)
      )
        throw new Error("AUTH_REQUIRED");
    } else {
      const expected = process.env.CARETAKR_OPERATOR_TOKEN;
      if (
        !expected ||
        typeof token !== "string" ||
        !constantEqual(token, expected)
      )
        throw new Error("AUTH_REQUIRED");
    }
    return Response.json(
      { authenticated: true },
      {
        headers: {
          "Set-Cookie": `caretakr_session=${signSession()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "ORIGIN_REJECTED" }, { status: 403 });
  return Response.json(
    { authenticated: false },
    {
      headers: {
        "Set-Cookie":
          "caretakr_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      },
    },
  );
}
