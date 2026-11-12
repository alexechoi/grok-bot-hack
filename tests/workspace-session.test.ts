import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/session/route";
import { isOperator, signSession } from "../lib/server/auth";
const original = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env))
    if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
});
let attempt = 0;
function request(
  body: unknown,
  origin: string | null = "https://caretakr.example",
) {
  return new Request("https://caretakr.example/api/session", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `test-${attempt++}`,
      ...(origin ? { origin } : {}),
      "sec-fetch-site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}
function configure() {
  process.env.CARETAKR_WORKSPACE_PASSWORD = "private-test-passcode";
  process.env.CARETAKR_SESSION_SECRET = "stable-test-session-secret-32-bytes";
}
test("workspace passcode produces an operator-only Secure HttpOnly cookie and rejects wrong passcodes", async () => {
  configure();
  assert.equal((await POST(request({ password: "wrong" }))).status, 401);
  const response = await POST(
    request({ password: process.env.CARETAKR_WORKSPACE_PASSWORD }),
  );
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")!;
  assert.match(
    cookie,
    /HttpOnly; SameSite=Strict; Path=\/; Max-Age=28800; Secure/,
  );
  assert.equal(
    isOperator(
      new Request("https://caretakr.example", {
        headers: { cookie: cookie.split(";")[0] },
      }),
    ),
    true,
  );
  assert.equal(
    cookie.includes(process.env.CARETAKR_WORKSPACE_PASSWORD!),
    false,
  );
});
test("workspace password login rejects foreign and missing origins", async () => {
  configure();
  for (const origin of ["https://attacker.example", null])
    assert.equal(
      (
        await POST(
          request(
            { password: process.env.CARETAKR_WORKSPACE_PASSWORD },
            origin,
          ),
        )
      ).status,
      403,
    );
});
test("production cannot mint ephemeral sessions without stable signing secret", async () => {
  configure();
  Object.assign(process.env, { NODE_ENV: "production" });
  delete process.env.CARETAKR_SESSION_SECRET;
  assert.throws(() => signSession(), /SESSION_NOT_CONFIGURED/);
  assert.equal(
    (await POST(request({ password: process.env.CARETAKR_WORKSPACE_PASSWORD })))
      .status,
    503,
  );
  assert.equal(
    isOperator(
      new Request("https://caretakr.example", {
        headers: { cookie: "caretakr_session=invalid.signature" },
      }),
    ),
    false,
  );
});
test("workspace password login rate limits repeated attempts", async () => {
  configure();
  const make = () =>
    new Request("https://caretakr.example/api/session", {
      method: "POST",
      headers: {
        origin: "https://caretakr.example",
        "content-type": "application/json",
        "x-forwarded-for": "workspace-rate-test",
      },
      body: JSON.stringify({ password: "wrong" }),
    });
  for (let i = 0; i < 10; i++) assert.equal((await POST(make())).status, 401);
  assert.equal((await POST(make())).status, 429);
});

test("Netlify functions require stable signing even when NODE_ENV is unset", async () => {
  configure();
  Reflect.deleteProperty(process.env, "NODE_ENV");
  process.env.NETLIFY = "true";
  delete process.env.CARETAKR_SESSION_SECRET;
  assert.equal(
    (await POST(request({ password: process.env.CARETAKR_WORKSPACE_PASSWORD })))
      .status,
    503,
  );
});
