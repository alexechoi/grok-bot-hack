import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { mkdtemp, mkdir, writeFile, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Each test worker has its own cwd and fixture key. Neither the CLI's dotenv
// loader nor auth's secretsDir can touch the real workspace credentials.
const originalCwd = process.cwd();
let fixture: string;
const originalKey = process.env.CARETAKR_SESSION_SECRET;
const fixtureKey = randomBytes(32).toString("hex");
const script = resolve("scripts/unlock-live.mjs");
const moduleUrl = pathToFileURL(resolve("lib/server/operator-unlock.ts")).href;
const authUrl = pathToFileURL(resolve("lib/server/auth.ts")).href;
let redeemOperatorLink: (request: Request) => Promise<Response>;
let isOperator: (request: Request) => boolean;
before(async () => {
  fixture = await mkdtemp(join(tmpdir(), "caretakr-unlock-test-"));
  process.chdir(fixture);
  process.env.CARETAKR_SESSION_SECRET = fixtureKey;
  ({ redeemOperatorLink } = await import(moduleUrl));
  ({ isOperator } = await import(authUrl));
});
after(async () => {
  process.chdir(originalCwd);
  if (originalKey === undefined) delete process.env.CARETAKR_SESSION_SECRET;
  else process.env.CARETAKR_SESSION_SECRET = originalKey;
  await rm(fixture, { recursive: true, force: true });
});
const origin = "http://localhost:3000";
function cliLink() {
  return execFileSync(process.execPath, [script, origin], {
    cwd: fixture,
    env: { ...process.env, CARETAKR_SESSION_SECRET: fixtureKey },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
type Claims = { purpose: string; origin: string; exp: number; nonce: string };
function claimsFor(link: string): Claims {
  const encoded = new URL(link).searchParams.get("ticket")!.split(".")[0];
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
}
function signedLink(claims: Claims) {
  const data = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", fixtureKey).update(data).digest("base64url");
  return `${origin}/api/session/unlock?ticket=${data}.${sig}`;
}
async function savedNonce(claims: Claims) {
  const directory = join(fixture, ".caretakr", "unlock-nonces");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const path = join(
    directory,
    createHash("sha256").update(claims.nonce).digest("hex"),
  );
  await writeFile(
    path,
    JSON.stringify({ exp: claims.exp, origin: claims.origin }),
    { mode: 0o600 },
  );
  return path;
}
test("CLI-issued ticket redeems once to a clean Live URL and signed HttpOnly operator cookie", async () => {
  const link = cliLink();
  const claims = claimsFor(link);
  assert.equal(claims.purpose, "caretakr-local-unlock");
  assert.match(claims.nonce, /^[a-f0-9]{48}$/);
  assert.ok(claims.exp > Date.now() && claims.exp <= Date.now() + 300_000);
  const noncePath = join(
    fixture,
    ".caretakr",
    "unlock-nonces",
    createHash("sha256").update(claims.nonce).digest("hex"),
  );
  assert.equal((await stat(noncePath)).mode & 0o777, 0o600);
  const response = await redeemOperatorLink(new Request(link));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), `${origin}/?mode=live`);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  const cookie = response.headers.get("set-cookie")!;
  assert.match(
    cookie,
    /^caretakr_session=.+; HttpOnly; SameSite=Strict; Path=\/; Max-Age=28800$/,
  );
  assert.ok(
    isOperator(
      new Request(origin, { headers: { cookie: cookie.split(";")[0] } }),
    ),
  );
  assert.equal((await redeemOperatorLink(new Request(link))).status, 401);
});
test("bad signatures and absent tickets cannot consume a valid nonce", async () => {
  const link = cliLink();
  const url = new URL(link);
  const [data, sig] = url.searchParams.get("ticket")!.split(".");
  url.searchParams.set(
    "ticket",
    `${data}.${sig[0] === "a" ? "b" : "a"}${sig.slice(1)}`,
  );
  assert.equal((await redeemOperatorLink(new Request(url))).status, 401);
  assert.equal(
    (await redeemOperatorLink(new Request(`${origin}/api/session/unlock`)))
      .status,
    401,
  );
  assert.equal((await redeemOperatorLink(new Request(link))).status, 303);
});
test("expired and excessively future signed tickets are rejected before deleting their nonce", async () => {
  for (const exp of [Date.now() - 1000, Date.now() + 360_000]) {
    const claims = {
      purpose: "caretakr-local-unlock",
      origin,
      exp,
      nonce: randomBytes(24).toString("hex"),
    };
    const nonce = await savedNonce(claims);
    assert.equal(
      (await redeemOperatorLink(new Request(signedLink(claims)))).status,
      401,
    );
    assert.ok(await stat(nonce));
  }
});
test("cross-origin header and altered request origin reject without consuming the ticket", async () => {
  const link = cliLink();
  assert.equal(
    (
      await redeemOperatorLink(
        new Request(link, { headers: { origin: "https://untrusted.example" } }),
      )
    ).status,
    401,
  );
  const otherOrigin = new URL(link);
  otherOrigin.hostname = "127.0.0.1";
  assert.equal(
    (await redeemOperatorLink(new Request(otherOrigin))).status,
    401,
  );
  assert.equal(
    (await redeemOperatorLink(new Request(link, { headers: { origin } })))
      .status,
    303,
  );
});
test("parallel redemption grants exactly one session", async () => {
  const link = cliLink();
  const responses = await Promise.all(
    Array.from({ length: 8 }, () => redeemOperatorLink(new Request(link))),
  );
  assert.equal(responses.filter((r) => r.status === 303).length, 1);
  assert.equal(responses.filter((r) => r.status === 401).length, 7);
  assert.equal(responses.filter((r) => r.headers.has("set-cookie")).length, 1);
});
test("signed path traversal nonce, mismatched saved claims and nonexistent nonce cannot redeem", async () => {
  const base = {
    purpose: "caretakr-local-unlock",
    origin,
    exp: Date.now() + 60_000,
    nonce: "../session-key",
  };
  assert.equal(
    (await redeemOperatorLink(new Request(signedLink(base)))).status,
    401,
  );
  const claims = { ...base, nonce: randomBytes(24).toString("hex") };
  assert.equal(
    (await redeemOperatorLink(new Request(signedLink(claims)))).status,
    401,
  );
  await savedNonce({ ...claims, exp: claims.exp + 1 });
  assert.equal(
    (await redeemOperatorLink(new Request(signedLink(claims)))).status,
    401,
  );
});
test("CLI refuses to mint unlock capabilities for remote or HTTPS origins", () => {
  for (const url of [
    "https://localhost:3000",
    "http://untrusted.example",
    "http://localhost.untrusted.example",
  ]) {
    assert.throws(() =>
      execFileSync(process.execPath, [script, url], {
        cwd: fixture,
        env: { ...process.env, CARETAKR_SESSION_SECRET: fixtureKey },
        stdio: "pipe",
      }),
    );
  }
});

test("CLI prunes expired claim tombstones while preserving unrelated files", async () => {
  const directory = join(fixture, ".caretakr", "unlock-nonces");
  const staleClaim = join(directory, `${"a".repeat(64)}.claimed`);
  const unrelated = join(directory, "operator-notes");
  await mkdir(staleClaim);
  await writeFile(unrelated, "fixture only");
  const expired = new Date(Date.now() - 360_000);
  await utimes(staleClaim, expired, expired);
  await utimes(unrelated, expired, expired);
  cliLink();
  await assert.rejects(stat(staleClaim), { code: "ENOENT" });
  assert.ok(await stat(unrelated));
});
