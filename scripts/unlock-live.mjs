#!/usr/bin/env node
import { randomBytes, createHash, createHmac } from "node:crypto";
import { mkdir, writeFile, readdir, stat, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
export async function createUnlockLink(origin = "http://localhost:3000") {
  try {
    process.loadEnvFile(".env.local");
  } catch {}
  const parsed = new URL(origin);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
    parsed.protocol !== "http:"
  )
    throw new Error("Local unlock links require a localhost HTTP origin.");
  const secret = process.env.CARETAKR_SESSION_SECRET;
  if (!secret)
    throw new Error("Run npm run grok:setup once before unlocking Live.");
  const directory = resolve(".caretakr", "unlock-nonces");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  for (const name of await readdir(directory)) {
    if(!/^[a-f0-9]{64}(?:\.claimed)?$/.test(name)) continue;
    const path = join(directory, name);
    try {
      if ((await stat(path)).mtimeMs < Date.now() - 5 * 60 * 1000)
        await rm(path, {recursive:true,force:true});
    } catch {}
  }
  const nonce = randomBytes(24).toString("hex"),
    exp = Date.now() + 5 * 60 * 1000;
  await writeFile(
    join(directory, createHash("sha256").update(nonce).digest("hex")),
    JSON.stringify({ exp, origin: parsed.origin }),
    { mode: 0o600, flag: "wx" },
  );
  const payload = Buffer.from(
    JSON.stringify({
      purpose: "caretakr-local-unlock",
      origin: parsed.origin,
      exp,
      nonce,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${parsed.origin}/api/session/unlock?ticket=${payload}.${signature}`;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    console.log(
      await createUnlockLink(process.argv[2] || "http://localhost:3000"),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
