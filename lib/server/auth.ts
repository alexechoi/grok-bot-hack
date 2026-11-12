import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
export const secretsDir = resolve(".caretakr");
export function constantEqual(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function sessionKey() {
  if (process.env.CARETAKR_SESSION_SECRET)
    return process.env.CARETAKR_SESSION_SECRET;
  if (process.env.NODE_ENV === "production" || process.env.NETLIFY === "true")
    throw new Error("SESSION_NOT_CONFIGURED");
  mkdirSync(secretsDir, { recursive: true, mode: 0o700 });
  const path = resolve(secretsDir, "session-key");
  try {
    return readFileSync(path, "utf8");
  } catch {
    const key = randomBytes(32).toString("hex");
    try {
      writeFileSync(path, key, { mode: 0o600, flag: "wx" });
      return key;
    } catch {
      return readFileSync(path, "utf8");
    }
  }
}
export function signSession(scope: "operator" | "demo" = "operator") {
  const data = Buffer.from(
    JSON.stringify({
      exp:
        Date.now() + (scope === "demo" ? 60 * 60 * 1000 : 8 * 60 * 60 * 1000),
      scope,
    }),
  ).toString("base64url");
  return `${data}.${createHmac("sha256", sessionKey()).update(data).digest("base64url")}`;
}
export function isOperator(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (
    bearer &&
    process.env.CARETAKR_OPERATOR_TOKEN &&
    constantEqual(bearer, process.env.CARETAKR_OPERATOR_TOKEN)
  )
    return true;
  return validSessionCookie(request, "caretakr_session", "operator");
}
function validSessionCookie(request: Request, name: string, scope: string) {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(name + "="))
    ?.slice(name.length + 1);
  if (!cookie) return false;
  const [data, sig] = cookie.split(".");
  if (
    (process.env.NODE_ENV === "production" || process.env.NETLIFY === "true") &&
    !process.env.CARETAKR_SESSION_SECRET
  )
    return false;
  if (!data || !sig) return false;
  if (
    !constantEqual(
      sig,
      createHmac("sha256", sessionKey()).update(data).digest("base64url"),
    )
  )
    return false;
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString());
    return parsed.scope === scope && parsed.exp > Date.now();
  } catch {
    return false;
  }
}
export function isDemo(request: Request) {
  return (
    isOperator(request) || validSessionCookie(request, "caretakr_demo", "demo")
  );
}
export function requireDemo(request: Request) {
  if (!sameOrigin(request)) throw new Error("ORIGIN_REJECTED");
  if (!isDemo(request)) throw new Error("AUTH_REQUIRED");
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (
    !origin ||
    origin === new URL(request.url).origin ||
    origin === process.env.CARETAKR_PUBLIC_URL
  );
}
export function requireOperator(request: Request) {
  if (!sameOrigin(request)) throw new Error("ORIGIN_REJECTED");
  if (!isOperator(request)) throw new Error("AUTH_REQUIRED");
}
export const roles = ["inspector", "energy", "maintenance", "manager"] as const;
export type Role = (typeof roles)[number];
export function roleFromRequest(request: Request): Role | null {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  return (
    roles.find((role) => {
      const expected = process.env[`CARETAKR_MCP_${role.toUpperCase()}_TOKEN`];
      return (
        !!expected && expected.length >= 24 && constantEqual(token, expected)
      );
    }) ?? null
  );
}
export async function jsonBody(request: Request, max = 128 * 1024) {
  if (Number(request.headers.get("content-length") || 0) > max)
    throw new Error("BODY_TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY_BODY");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "REQUEST_FAILED";
  const allowed = [
    "AUTH_REQUIRED",
    "ORIGIN_REJECTED",
    "BODY_TOO_LARGE",
    "NOT_FOUND",
    "LIVE_NOT_CONFIGURED",
    "RUN_ALREADY_ACTIVE",
    "RATE_LIMITED",
    "SESSION_NOT_CONFIGURED",
    "WORKSPACE_NOT_CONFIGURED",
  ];
  const safe = allowed.includes(message) ? message : "REQUEST_FAILED";
  return Response.json(
    { error: safe },
    {
      status:
        safe === "SESSION_NOT_CONFIGURED" || safe === "WORKSPACE_NOT_CONFIGURED"
          ? 503
          : safe === "AUTH_REQUIRED"
            ? 401
            : safe === "ORIGIN_REJECTED"
              ? 403
              : safe === "NOT_FOUND"
                ? 404
                : safe === "BODY_TOO_LARGE"
                  ? 413
                  : safe === "RATE_LIMITED"
                    ? 429
                    : 400,
    },
  );
}
