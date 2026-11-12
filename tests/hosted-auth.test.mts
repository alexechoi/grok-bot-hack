import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  validRunId,
  validWorkerRequest,
  workerSignature,
  hostedStoreName,
  createHostedRun,
  loadHostedRun,
  claimHostedRun,
  claimLiveSlot,
  recoverExpiredLiveSlot,
  markDispatchUnconfirmed,
  type HostedBlobStore,
} from "../lib/server/hosted-store";
import { createInspection, registry } from "../lib/server/store";

const originalKey = process.env.CARETAKR_SESSION_SECRET;
const fixtureKey = "hosted-worker-fixture-key-never-a-real-credential";
const id = "a8a1e8d0-a1f0-4cf0-b90d-e40000000001";
beforeEach(() => {
  process.env.CARETAKR_SESSION_SECRET = fixtureKey;
});
afterEach(() => {
  if (originalKey === undefined) delete process.env.CARETAKR_SESSION_SECRET;
  else process.env.CARETAKR_SESSION_SECRET = originalKey;
  registry.runs.clear();
});

function memoryBlobs() {
  const values = new Map<string, unknown>();
  const store = {
    async get(key: string) {
      return values.has(key) ? structuredClone(values.get(key)) : null;
    },
    async setJSON(
      key: string,
      value: unknown,
      options?: { onlyIfNew?: boolean },
    ) {
      if (options?.onlyIfNew && values.has(key)) return { modified: false };
      values.set(key, structuredClone(value));
      return { modified: true };
    },
    async delete(key: string) {
      values.delete(key);
    },
  } as unknown as HostedBlobStore;
  return { store, values };
}
test("runtime deploy context isolates previews from production and sanitizes identifiers", () => {
  assert.equal(
    hostedStoreName({ context: "production", id: "production-deploy" }),
    "caretakr-production",
  );
  assert.equal(
    hostedStoreName({ context: "deploy-preview", id: "preview-123" }),
    "caretakr-preview-preview-123",
  );
  assert.notEqual(
    hostedStoreName({ context: "deploy-preview", id: "preview-123" }),
    hostedStoreName({ context: "deploy-preview", id: "preview-456" }),
  );
  assert.doesNotMatch(
    hostedStoreName({ context: "branch-deploy", id: "../../unsafe/deploy" }),
    /\.\.|\//,
  );
});
test("durable snapshots survive separate reads and duplicate worker deliveries claim exactly once", async () => {
  const { store, values } = memoryBlobs();
  const run = createInspection("live");
  await createHostedRun(run, store);
  await assert.rejects(
    createHostedRun({ ...run, propertyName: "forged replacement" }, store),
    /RUN_ALREADY_ACTIVE/,
  );
  const first = await loadHostedRun(run.id, store);
  first.propertyName = "only local memory changed";
  assert.equal(
    (await loadHostedRun(run.id, store)).propertyName,
    run.propertyName,
  );
  const claims = await Promise.all(
    Array.from({ length: 8 }, () => claimHostedRun(run.id, store)),
  );
  assert.equal(claims.filter(Boolean).length, 1);
  assert.ok(values.has(`runs/${run.id}/worker-claim`));
});
test("unconfirmed dispatch records cancellation without competing snapshot writes or retrying Bot work", async () => {
  const { store, values } = memoryBlobs();
  const run = createInspection("live");
  await createHostedRun(run, store);
  await markDispatchUnconfirmed(run.id, store);
  const original = values.get(`runs/${run.id}/snapshot`) as typeof run;
  assert.equal(original.status, "running");
  assert.ok(values.has(`runs/${run.id}/cancel`));
  const view = await loadHostedRun(run.id, store);
  assert.equal(view.status, "error");
  assert.equal(
    view.events.filter((event) => event.payload.source === "hosted-dispatch")
      .length,
    1,
  );
  assert.ok(!values.has(`runs/${run.id}/worker-claim`));
  assert.equal(
    (await loadHostedRun(run.id, store)).events.length,
    view.events.length,
  );
});
test("stale-worker recovery respects the latest worker start and one recovery closes the old run", async () => {
  const { store, values } = memoryBlobs();
  const run = createInspection("live");
  await createHostedRun(run, store);
  const now = Date.now();
  values.set("live-slot", {
    id: run.id,
    createdAt: new Date(now - 30 * 60_000).toISOString(),
  });
  values.set(`runs/${run.id}/worker-claim`, {
    startedAt: new Date(now - 2 * 60_000).toISOString(),
  });
  await recoverExpiredLiveSlot(store, now);
  assert.ok(values.has("live-slot"));
  assert.equal((await loadHostedRun(run.id, store)).status, "running");
  values.set(`runs/${run.id}/worker-claim`, {
    startedAt: new Date(now - 20 * 60_000).toISOString(),
  });
  await Promise.all(
    Array.from({ length: 8 }, () => recoverExpiredLiveSlot(store, now)),
  );
  const closed = await loadHostedRun(run.id, store);
  assert.equal(closed.status, "error");
  assert.equal(
    closed.events.filter(
      (event) => event.payload.source === "hosted-worker-recovery",
    ).length,
    1,
  );
  assert.ok(values.has(`runs/${run.id}/cancel`));
  assert.ok(!values.has("live-slot"));
  assert.equal(await claimHostedRun(run.id, store), false);
  const next = createInspection("live");
  await claimLiveSlot(next.id, store);
  assert.equal((values.get("live-slot") as { id: string }).id, next.id);
});
function request(
  runId = id,
  timestamp = String(Date.now()),
  signature = workerSignature(runId, timestamp),
) {
  return new Request(
    "https://caretakr.example/.netlify/functions/caretakr-inspection-background",
    {
      method: "POST",
      headers: {
        "x-caretakr-dispatched-at": timestamp,
        "x-caretakr-worker-signature": signature,
      },
    },
  );
}
test("worker dispatch accepts only the signed run and timestamp with the inspection purpose", () => {
  const timestamp = String(Date.now());
  const signed = request(id, timestamp);
  assert.equal(validWorkerRequest(signed, id), true);
  assert.equal(
    validWorkerRequest(signed, "a8a1e8d0-a1f0-4cf0-b90d-e40000000002"),
    false,
  );
  assert.equal(
    validWorkerRequest(
      request(
        id,
        String(Number(timestamp) + 1),
        workerSignature(id, timestamp),
      ),
      id,
    ),
    false,
  );
  const unrelated = createHmac("sha256", fixtureKey)
    .update(`other-purpose\n${id}\n${timestamp}`)
    .digest("hex");
  assert.equal(
    validWorkerRequest(request(id, timestamp, unrelated), id),
    false,
  );
});
test("unsigned, changed, stale and excessively future worker requests cannot execute", () => {
  assert.equal(
    validWorkerRequest(new Request("https://caretakr.example"), id),
    false,
  );
  const timestamp = String(Date.now());
  const signature = workerSignature(id, timestamp);
  assert.equal(
    validWorkerRequest(
      request(
        id,
        timestamp,
        `${signature.slice(0, -1)}${signature.endsWith("a") ? "b" : "a"}`,
      ),
      id,
    ),
    false,
  );
  for (const offset of [-601_000, 601_000]) {
    const stale = String(Date.now() + offset);
    assert.equal(validWorkerRequest(request(id, stale), id), false);
  }
  assert.equal(
    validWorkerRequest(request(id, "not-a-timestamp", "wrong"), id),
    false,
  );
});
test("run identifiers reject traversal and worker signing fails closed without a configured secret", () => {
  assert.equal(validRunId(id), true);
  for (const invalid of [
    "../snapshot",
    "",
    `${id}/cancel`,
    "a8a1e8d0-a1f0-4cf0-b90d-e4000000000z",
  ])
    assert.equal(validRunId(invalid), false);
  delete process.env.CARETAKR_SESSION_SECRET;
  assert.throws(
    () => workerSignature(id, String(Date.now())),
    /LIVE_NOT_CONFIGURED/,
  );
});
