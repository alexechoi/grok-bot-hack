import { createHash, createHmac } from "node:crypto";
import { readFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { constantEqual, secretsDir, signSession } from "./auth";

/** A ticket is minted only by the local CLI, never by an unauthenticated endpoint. */
export async function redeemOperatorLink(request: Request) {
  const url = new URL(request.url);
  const ticket = url.searchParams.get("ticket") || "";
  const key = process.env.CARETAKR_SESSION_SECRET;
  const [encoded, signature, extra] = ticket.split(".");
  if (!key || !encoded || !signature || extra || ticket.length > 2048)
    return rejected();
  const expected = createHmac("sha256", key)
    .update(encoded)
    .digest("base64url");
  if (!constantEqual(signature, expected)) return rejected();
  let payload: {
    purpose?: string;
    origin?: string;
    exp?: number;
    nonce?: string;
  };
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return rejected();
  }
  if (
    payload.purpose !== "caretakr-local-unlock" ||
    payload.origin !== url.origin ||
    typeof payload.exp !== "number" ||
    payload.exp < Date.now() ||
    payload.exp > Date.now() + 5 * 60 * 1000 ||
    !/^[a-f0-9]{48}$/.test(payload.nonce || "")
  )
    return rejected();
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== payload.origin
  )
    return rejected();
  const noncePath = join(
    secretsDir,
    "unlock-nonces",
    createHash("sha256").update(payload.nonce!).digest("hex"),
  );
  try {
    // Exclusive claim remains as a short-lived tombstone against parallel reuse.
    await mkdir(`${noncePath}.claimed`, {mode:0o700});
    const saved = JSON.parse(await readFile(noncePath, "utf8"));
    if (saved.exp !== payload.exp || saved.origin !== payload.origin)
      return rejected();
    await unlink(noncePath);
  } catch {
    return rejected();
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/?mode=live", url.origin).toString(),
      "Set-Cookie": `caretakr_session=${signSession()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${url.protocol === "https:" ? "; Secure" : ""}`,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
function rejected() {
  return new Response(
    "This unlock link expired or was already used. Run npm run unlock:live for a fresh link.",
    {
      status: 401,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
