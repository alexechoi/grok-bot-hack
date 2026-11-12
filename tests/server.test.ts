import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  isOperator,
  isDemo,
  requireDemo,
  requireOperator,
  roleFromRequest,
  signSession,
  jsonBody,
  apiError,
} from "../lib/server/auth";
import {
  createInspection,
  recordFinding,
  createWorkOrder,
  completeInspection,
  registry,
  status,
  emit,
} from "../lib/server/store";
import { callCaretakrTool } from "../lib/server/mcp";
import { demoFindings } from "../lib/scenario";
import {runDemo} from "../lib/server/demo";

const originalEnv = { ...process.env };
afterEach(() => {
  for (const key of Object.keys(process.env))
    if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  registry.runs.clear();
  registry.listeners.clear();
});
const req = (headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/inspections", { headers });

test("operator authentication rejects absent credentials and an untrusted origin", () => {
  process.env.CARETAKR_OPERATOR_TOKEN =
    "operator-test-secret-at-least-24-characters";
  assert.equal(isOperator(req()), false);
  assert.throws(() => requireOperator(req()), /AUTH_REQUIRED/);
  assert.equal(
    isOperator(
      req({ Authorization: `Bearer ${process.env.CARETAKR_OPERATOR_TOKEN}` }),
    ),
    true,
  );
  assert.throws(
    () =>
      requireOperator(
        req({
          Authorization: `Bearer ${process.env.CARETAKR_OPERATOR_TOKEN}`,
          Origin: "https://untrusted.example",
        }),
      ),
    /ORIGIN_REJECTED/,
  );
});

test("signed operator sessions are accepted, altered sessions rejected", () => {
  process.env.CARETAKR_SESSION_SECRET =
    "unit-test-signing-secret-at-least-32-characters";
  const cookie = signSession();
  assert.equal(isOperator(req({ Cookie: `caretakr_session=${cookie}` })), true);
  assert.equal(
    isOperator(req({ Cookie: `caretakr_session=${cookie.slice(0, -1)}!` })),
    false,
  );
});

test("MCP agent identity comes from a sufficiently long role credential", () => {
  process.env.CARETAKR_MCP_INSPECTOR_TOKEN =
    "inspector-token-with-at-least-24-characters";
  process.env.CARETAKR_MCP_ENERGY_TOKEN = "too-short";
  assert.equal(
    roleFromRequest(
      req({
        Authorization: `Bearer ${process.env.CARETAKR_MCP_INSPECTOR_TOKEN}`,
      }),
    ),
    "inspector",
  );
  assert.equal(
    roleFromRequest(req({ Authorization: "Bearer too-short" })),
    null,
  );
  assert.equal(
    roleFromRequest(req({ Authorization: "Bearer invented" })),
    null,
  );
});

test("streamed bodies cannot bypass the size limit by omitting Content-Length", async () => {
  const request = new Request("http://localhost:3000/api/inspections", {
    method: "POST",
    body: JSON.stringify({ value: "x".repeat(500) }),
  });
  await assert.rejects(jsonBody(request, 100), /BODY_TOO_LARGE/);
});

test("API errors do not disclose unknown exception details or credentials", async () => {
  const response = apiError(new Error("sensitive-token-is-not-for-browser"));
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "REQUEST_FAILED" });
});

test("findings cannot be written by manager or forged as another agent", () => {
  const run = createInspection("live");
  assert.throws(
    () => recordFinding(run, "manager", demoFindings[0]),
    /Role cannot/,
  );
  assert.throws(
    () => recordFinding(run, "energy", demoFindings[0]),
    /identity mismatch/,
  );
  const energyWithWater = { ...demoFindings[0], agentId: "energy" };
  assert.throws(
    () => recordFinding(run, "energy", energyWithWater),
    /category mismatch/,
  );
  assert.equal(run.findings.length, 0);
});

test("invalid provenance cannot emit a finding event", () => {
  const run = createInspection("live");
  assert.throws(
    () =>
      recordFinding(run, "inspector", {
        ...demoFindings[0],
        evidenceIds: ["EV-INVENTED"],
      }),
    /Unknown evidence/,
  );
  assert.throws(
    () =>
      recordFinding(run, "inspector", {
        ...demoFindings[0],
        evidenceIds: ["EV-002"],
      }),
    /room mismatch/,
  );
  assert.equal(run.events.length, 0);
  assert.equal(run.findings.length, 0);
});

test("work orders and completion enforce roles, finding references and action coverage", () => {
  const run = createInspection("live");
  recordFinding(run, "inspector", demoFindings[0]);
  status(run, "inspector", "Completed", "Review complete");
  status(run, "energy", "Completed", "Review complete");
  const order = {
    id: "WO-TEST",
    findingIds: [demoFindings[0].id],
    title: "Investigate",
    priority: "high",
    action: "Check plumbing and moisture",
    trade: "Plumber",
  };
  assert.throws(
    () => createWorkOrder(run, "manager", order),
    /Maintenance role/,
  );
  assert.throws(
    () =>
      createWorkOrder(run, "maintenance", {
        ...order,
        findingIds: ["invented"],
      }),
    /Unknown finding/,
  );
  assert.throws(() => completeInspection(run, "manager", "A sourced summary"));
  createWorkOrder(run, "maintenance", order);
  status(run, "maintenance", "Completed", "Review complete");
  status(run, "manager", "Reporting", "Writing report");
  assert.throws(
    () => completeInspection(run, "inspector", "A sourced summary"),
    /Manager role/,
  );
  completeInspection(
    run,
    "manager",
    "Investigate F-001 using EV-001. Synthetic example.",
  );
  assert.equal(run.status, "completed");
  assert.equal(run.score, 85);
  assert.throws(
    () => recordFinding(run, "inspector", demoFindings[2]),
    /not running/,
  );
  assert.equal(run.events.at(-1)?.type, "inspection.completed");
});

test("MCP tools reject demo runs and authenticated identity cannot be overridden by arguments", async () => {
  const demo = createInspection("demo");
  await assert.rejects(
    callCaretakrTool("inspector", "get_room_evidence", {
      inspectionId: demo.id,
      roomId: "bathroom",
    }),
    /running live inspection/,
  );
  const live = createInspection("live");
  await assert.rejects(
    callCaretakrTool("maintenance", "record_finding", {
      inspectionId: live.id,
      finding: demoFindings[0],
      role: "inspector",
    }),
    /Role cannot/,
  );
  assert.equal(live.findings.length, 0);
});

test("authenticated MCP evidence access and findings carry observable tool IDs and timestamps", async () => {
  const run = createInspection("live");
  const response = (await callCaretakrTool("inspector", "get_room_evidence", {
    inspectionId: run.id,
    roomId: "bathroom",
  })) as { evidence: { id: string }[] };
  assert.deepEqual(
    response.evidence.map((e) => e.id),
    ["EV-001"],
  );
  await callCaretakrTool("inspector", "record_finding", {
    inspectionId: run.id,
    finding: demoFindings[0],
  });
  assert.equal(run.findings.length, 1);
  const toolEvent = run.events.find((e) => e.type === "tool.called");
  assert.ok(toolEvent?.payload.toolCallId);
  assert.equal(toolEvent?.payload.source, "authenticated-mcp");
  assert.ok(
    run.events.every(
      (e) =>
        e.inspectionId === run.id && Number.isFinite(Date.parse(e.timestamp)),
    ),
  );
  assert.equal(
    run.events.filter((e) => e.type === "finding.created").length,
    1,
  );
});

test("backend blocks maintenance and report completion before dependent reviews finish", () => {
  const run = createInspection("live");
  recordFinding(run, "inspector", demoFindings[0]);
  const order = {
    id: "WO-EARLY",
    findingIds: [demoFindings[0].id],
    title: "Investigate",
    priority: "high",
    action: "Check moisture",
    trade: "Plumber",
  };
  assert.throws(() => createWorkOrder(run, "maintenance", order));
  assert.throws(() => completeInspection(run, "manager", "Premature summary"));
  assert.equal(run.status, "running");
  assert.equal(run.workOrders.length, 0);
  status(run, "inspector", "Completed", "Review complete");
  assert.throws(() => createWorkOrder(run, "maintenance", order));
  status(run, "energy", "Completed", "Review complete");
  createWorkOrder(run, "maintenance", order);
  assert.throws(() => completeInspection(run, "manager", "Premature summary"));
  status(run, "maintenance", "Completed", "Review complete");
  status(run, "manager", "Reporting", "Writing report");
  completeInspection(
    run,
    "manager",
    "F-001 cites EV-001; synthetic evidence requires investigation.",
  );
  assert.equal(run.status, "completed");
});

test("MCP HTTP handler rejects unauthenticated mutations before tool execution", async () => {
  const { POST: mcp } = await import("../app/api/mcp/route");
  const response = await mcp(
    new Request("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "record_finding", arguments: {} },
      }),
    }),
  );
  assert.equal(response.status, 401);
  assert.equal(registry.runs.size, 0);
});

test("demo capability is signed and cannot authenticate as operator or MCP role", () => {
  process.env.CARETAKR_SESSION_SECRET =
    "unit-test-signing-secret-at-least-32-characters";
  const signed = signSession("demo");
  const request = req({ Cookie: `caretakr_demo=${signed}` });
  assert.equal(isDemo(request), true);
  assert.doesNotThrow(() => requireDemo(request));
  assert.equal(isOperator(request), false);
  assert.equal(roleFromRequest(request), null);
  assert.throws(() => requireOperator(request), /AUTH_REQUIRED/);
  assert.equal(
    isOperator(req({ Cookie: `caretakr_session=${signed}` })),
    false,
  );
  assert.equal(
    isDemo(req({ Cookie: `caretakr_demo=${signed.slice(0, -1)}!` })),
    false,
  );
});

test("demo session bootstrap requires browser same-origin metadata and creates a scoped HttpOnly cookie", async () => {
  process.env.CARETAKR_SESSION_SECRET =
    "unit-test-signing-secret-at-least-32-characters";
  const { POST } = await import("../app/api/session/route");
  const sessionRequest = (headers: Record<string, string>) =>
    new Request("http://localhost:3000/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ mode: "demo" }),
    });
  for (const headers of [
    {},
    { Origin: "http://localhost:3000" },
    { Origin: "https://untrusted.example", "Sec-Fetch-Site": "same-origin" },
  ] as Record<string, string>[]) {
    const response = await POST(sessionRequest(headers));
    assert.equal(response.status, 403);
  }
  const response = await POST(
    sessionRequest({
      Origin: "http://localhost:3000",
      "Sec-Fetch-Site": "same-origin",
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    authenticated: true,
    scope: "demo",
  });
  const setCookie = response.headers.get("set-cookie")!;
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.equal(isDemo(req({ Cookie: setCookie.split(";")[0] })), true);
  assert.equal(isOperator(req({ Cookie: setCookie.split(";")[0] })), false);
});


test("cancelled runs reject late findings, handoffs and nonterminal state before mutation", () => {
  const run=createInspection('live');
  run.status='error';status(run,'inspector','Error','Cancelled');
  const beforeEvents=run.events.length,beforeAgent={...run.agents.inspector};
  assert.throws(()=>status(run,'inspector','Investigating','Late response','bathroom'),/terminal/);
  assert.throws(()=>emit(run,'inspector','tool.called',{tool:'record_finding'}),/terminal/);
  assert.throws(()=>emit(run,'inspector','message.sent',{toAgentId:'maintenance'}),/terminal/);
  assert.throws(()=>recordFinding(run,'inspector',demoFindings[0]),/not running/);
  assert.deepEqual(run.agents.inspector,beforeAgent);
  assert.equal(run.events.length,beforeEvents);
  assert.equal(run.findings.length,0);
});

test("cancelled demo stages stop without publishing subsequent findings or completion", async () => {
  const run=createInspection('demo');const workflow=runDemo(run,4);
  await new Promise(resolve=>setTimeout(resolve,5));
  run.status='error';status(run,'manager','Error','Cancelled');
  emit(run,'manager','task.failed',{message:'Cancelled'});const terminalCount=run.events.length;
  await workflow;
  assert.equal(run.events.length,terminalCount);
  assert.equal(run.findings.length,0);assert.equal(run.workOrders.length,0);
  assert.equal(run.status,'error');assert.equal(run.score,null);
});
