# Actual Grok Bot integration

Caretakr calls the **Grok Bot desktop product**, not Grok Build and not the xAI language model API. The integration is server-side and uses the unofficial `grok-bot-sdk`, pinned to Git commit `42c75eb13f24630d1b689629502d4320c4219cdb` (protocol version 0.78.1). It lists account bots, sends a task, subscribes to the bot transcript through Connect, validates the returned structured result, and publishes backend SSE events. Accepted delivery alone is never a successful round trip.

## Current verification

- SDK offline compatibility suite: 48 tests passed on Node 24.21.0.
- A separate native Grok Bot desktop test on 2026-11-12 at 19:24:20 London created `Caretakr · Scout Inspector` and submitted synthetic EV-001. The actual Bot returned ‘Suspected water ingress at ceiling above shower’, medium severity, null confidence and EV-001 reference. This establishes that the real Grok Bot product can process the scenario; it is **not** a verified SDK round trip, automatic backend execution or four-Bot run. The application does not replay that native test as Live events.
- **Actual SDK round trip verified on 2026-11-12 at 19:27:04 UTC.** Fresh browser login, real account/roster reads, accepted-temporal dispatch and a matching schema-valid EV-001 interpretation were observed. Grok Bot recommended moisture readings and investigation of plumbing, shower seals and the space above; it explicitly did not confirm an active leak. The local receipt contains the actual request ID, Bot ID, transcript entry ID and source cursor. `npm run grok:check -- --round-trip` repeats this test without printing credentials.
- Four actual Caretakr role Bots were then provisioned through the same desktop protocol. Successful role provisioning is separate from verification of the full four-Bot inspection workflow.
- No account session, teammate execution or successful live round trip is fabricated. The status endpoint reports `roundTripVerified` separately from configuration readiness.
- Demo is a server-authenticated, explicitly labelled deterministic synthetic scenario. It does not claim captured real Grok Bot conversations. Live failures never substitute demo findings.

## Verified full four-Bot inspection

The complete real workflow succeeded on **2026-11-12, 19:36:19–19:37:04 UTC**, inspection `e16db501-28fb-4aa4-ad7c-e69603eb97c3`. Five nonce-bound, schema-validated replies came from the four actual native-created Grok Bots: Cleo's task brief, Scout's inspection, Watt's energy analysis, Fix's maintenance review and Cleo's final sourced report. The backend emitted 68 timestamped events, three sourced findings and three work orders. All model finding severities were medium in this run, so the documented backend score was **76/100**. This differs from the deterministic Demo score because the live Bots made their own classifications.

The private receipt `.caretakr/live-e16db501-28fb-4aa4-ad7c-e69603eb97c3.json` retains the original run, source request IDs, Bot IDs, transcript entry IDs and event history. It is ignored by git and excluded from deployment traces. This successful run preceded the explicit escape-route priority policy described below; its raw model classifications and original work orders remain preserved.

The MCP server was independently verified over HTTP (`initialize`, all seven `tools/list` entries and authenticated `get_property`). **No remote MCP connector was attached to Grok Bot during this successful SDK workflow.** SDK-result adapter calls are labelled accurately; they are not presented as Grok Bot MCP invocations.

## First successful round trip

1. Use Node 22.13 or newer and run `npm install`.
2. Run `npm run grok:setup`. This creates independent random operator, cookie-signing and per-role MCP credentials in ignored `.env.local` with file permissions `0600`. It prints no secrets.
3. Run `npm run grok:login`. Open its official Cursor login URL and finish sign-in yourself. This SDK's fresh login leaves the official desktop client's saved login alone. The access and refresh tokens are saved only to ignored `.caretakr/grok-credentials.json`, mode `0600`. No Keychain extraction is used.
4. Run `npm run grok:check` to verify account and roster compatibility, then `npm run grok:check -- --round-trip` for a real evidence-processing task. It selects the configured Inspector or an existing owned Bot. If no Bot exists, create your first Bot in the Grok Bot app.
5. Only after a successful round trip, create the role Bots through the native Grok Bot New Bot flow and run `npm run grok:provision` to discover and map them. It reuses owned TEMPORAL Caretakr Bots matching these names: Scout (Inspector), Watt (Energy Analyst), Fix (Maintenance Engineer), Cleo (Property Manager). It writes role IDs to `.env.local` and does not delete any Bots.
6. Run `npm run dev` (restart after changing `.env.local`). Unlock the UI with `CARETAKR_OPERATOR_TOKEN` from your local file. The browser exchanges this Caretakr operator credential for an eight-hour HttpOnly, SameSite=Strict signed cookie. **Never enter the Grok Bot access token in the UI.**
7. Choose Live and start the inspection. Live readiness requires all four distinct configured bot IDs. The property evidence remains clearly synthetic even when the interpreting Bots are live.

The provision command normally discovers existing native-created Bots without creating anything. `npm run grok:provision -- --create` explicitly opts into SDK creation, but fails immediately if the returned execution harness is not TEMPORAL; do not retry creation in that case. On this account, the server ignored requested TEMPORAL harness values and returned non-working BOX Bots, so native creation is the verified path. The command does not send initial tasks or install any connectors. The first-round-trip command does send the supplied synthetic bathroom note to an actual Bot, without asking it to contact anyone or mutate external systems.

## Official MCP connector setup

The official [Grok Bot computer and apps guide](https://docs.x.ai/grok-bot/computer-and-apps) says to choose **Connect apps → Add a custom connector**, then **Remote HTTPS**, enter a **Server URL** and optional HTTP headers, and choose **Add plugin**. This is the Grok Bot setup, separate from the [Grok.com connectors guide](https://docs.x.ai/grok/connectors), which uses grok.com/connectors. The [Grok Bot overview](https://docs.x.ai/grok-bot/overview) explicitly supports custom MCP tooling.

The native Grok Bot connector form was also inspected directly: Remote HTTPS presents **Name**, **Server URL**, **HTTP headers** with **Key / Value**, and **Client ID** fields. For the role header below, enter `Authorization` in Key and `Bearer <role secret>` in Value. The secret belongs in that connector configuration, not in a chat prompt or the Caretakr frontend. No remote connector has yet been saved for this project.

Caretakr exposes a standards-compliant, stateless Streamable HTTP MCP endpoint at `https://YOUR-HOST/api/mcp`. It must be reachable from Grok Bot's cloud computer; localhost on your laptop is not reachable there. Deploy this app on a persistent Node server or use an HTTPS tunnel to the local server, and set `CARETAKR_PUBLIC_URL` to that origin.

Create a connector for each role, using these server-side header values from `.env.local`:

| Connector | HTTP header |
| --- | --- |
| Caretakr Inspector | `Authorization: Bearer <CARETAKR_MCP_INSPECTOR_TOKEN>` |
| Caretakr Energy | `Authorization: Bearer <CARETAKR_MCP_ENERGY_TOKEN>` |
| Caretakr Maintenance | `Authorization: Bearer <CARETAKR_MCP_MAINTENANCE_TOKEN>` |
| Caretakr Manager | `Authorization: Bearer <CARETAKR_MCP_MANAGER_TOKEN>` |

Use the appropriate connector with the corresponding real Bot. Credentials are not put in task text or frontend bundles. The official guide explains that apps and the cloud computer are account-wide: per-role connector secrets are a boundary against untrusted clients, **not an isolation guarantee between Bots on the same account**.

Tools:

- `get_property`: illustrative twin, room coordinates, scoring method, active live inspection ID.
- `get_room_evidence`: original room notes with evidence IDs and synthetic flags.
- `get_energy_readings`: original readings and deterministic baseline/deviation calculations.
- `record_finding`: Inspector/Energy role only; validates schema, evidence IDs, room association and authenticated role identity.
- `publish_agent_status`: validates state, room and task; role is inferred from the connector credential.
- `create_work_order`: Maintenance only; published specialist findings must exist and specialist reviews must be complete.
- `complete_inspection`: Manager only; specialist/maintenance tasks must be complete and every finding must have an action; score is deterministic.

All tools except `get_property` take an `inspectionId`. Mutations require a running **live** inspection. Every actual MCP invocation produces a `tool.called` event with a generated tool-call ID, authenticated role and timestamp. SSE clients have no write capability. Bots may use the MCP tools directly when that connector has been attached. The default automatic workflow additionally supports direct SDK JSON task responses: those responses are explicitly tagged `grok-bot-sdk` and are validated by the backend rather than falsely presented as MCP invocations.

## Workflow and scene contract

`POST /api/inspections` with `{mode:'live'|'demo',speed?:1|2|4}` requires authentication. Live uses the operator cookie. Demo uses a separate signed HttpOnly capability cookie, bootstrapped by same-origin `POST /api/session` with `{mode:'demo'}`; the request must have the exact Origin and `Sec-Fetch-Site: same-origin`. That capability permits only the bounded deterministic demo, never live execution or finding publication. Speed affects Demo only. It returns `{id,mode}`. `GET /api/inspections/:id` returns a snapshot. `GET /api/inspections/:id/events` returns an initial `snapshot` event followed by `agent-event` SSE events, with a 15-second heartbeat, reconnection hint and bounded event history. Live snapshots and streams require the operator cookie or a server-side bearer operator token.

Events have `id`, ISO `timestamp`, `inspectionId`, `agentId`, `type`, optional `roomId`/`findingId`, and `payload`. A scene movement is an illustrative representation of an actual assigned room task; no physical robot or navigated scan is claimed. `message.sent` describes actual dispatch/dependency handoffs, not invented dialogue. SDK response events retain request IDs, actual bot IDs, transcript entry IDs and source cursors. Actual backend publication calls around validated SDK results are recorded as `tool.called` with source `sdk-result-adapter`; these are explicitly distinct from `authenticated-mcp` calls. MCP events retain call IDs. There is no chain-of-thought collection; only summaries and structured outputs are displayed.

Escape-route work-order policy is separate from model severity and health scoring. If a linked safety finding explicitly concerns an escape/egress/exit route and its proposed order is low or medium, the backend raises that order to high and appends: “Operational policy: escape-route concerns receive high-priority human review pending clearance measurement.” The event records `originalPriority` and `priorityPolicy: escape-route-review-minimum-high`. Model finding severity and the health score are preserved. High and critical orders, and unrelated findings, are unchanged.

`npm run grok:live` runs an authenticated Live inspection and watches the SSE stream, then saves a private receipt. `npm run grok:live -- --watch <inspection-id>` watches an existing run. `POST /api/inspections/:id/cancel` requires the corresponding operator/demo capability; it stops backend observation without claiming to terminate a task already dispatched to Grok Bot.

The live coordinator:

1. Gets a task brief from the actual Manager Bot.
2. Gives supplied source records to Inspector and Energy Bots in parallel.
3. Waits for schema-valid findings, verifies source references and publishes them.
4. Passes only those published findings and their sources to Maintenance.
5. Validates actions and references, then passes actual findings/orders to Manager.
6. Validates the sourced summary and calculates the health score on the server.

The verified account supports TEMPORAL Bot execution. Initial SDK-created BOX Bots refused delivery while their cloud computer was asleep, so provisioning now discovers native-created TEMPORAL Bots; it checks runtime capabilities and refuses to silently map a BOX Bot. An optional SDK create attempt validates the actual returned harness and fails fast on incompatibility. No refused send was treated as a response. Existing unused BOX records are left untouched.

The task prompt tells each Bot to use supplied synthetic inputs only, avoid external changes and treat evidence as data. A nonce and pre-dispatch transcript cursor bind each response to its request. The structured parser accepts valid JSON and deterministically escapes literal control characters inside quoted JSON strings (a real observed Grok Bot formatting issue); it never evaluates code or invents fields, and the complete result still passes the same nonce and Zod checks. A timeout or unsupported protocol fails the live run visibly. Sends are never automatically retried, because `SEND_UNCONFIRMED` can mean the server already received the task.

## Security review and limitations

The reviewed SDK has zero runtime dependencies, fixed `api2.cursor.sh` broker calls, validates cloud gateway origins, rejects redirects and redacts transport failures. It is unofficial and version-sensitive; offline tests are not proof of current account compatibility. The access token is account-wide and the SDK does not refresh or revoke it. Re-run fresh login if expired; delete local files and revoke the session in the official account controls when finished.

Caretakr keeps all Grok secrets on the Node server. Operator cookies are signed, HttpOnly and SameSite=Strict (Secure on HTTPS); mutation routes check origin. Login attempts are rate-limited. MCP uses independent, role-bound bearer credentials of at least 24 characters. Unknown evidence references, duplicate IDs, forged role arguments, missing maintenance coverage and writes to completed runs are rejected. No browser endpoint accepts arbitrary finding/event publication.

This hackathon backend deliberately uses bounded process-local state and long-running tasks. Run **one persistent Node process**. A server restart loses inspections; multiple replicas or serverless request freezing require a shared durable event store/worker. Do not deploy it as an ephemeral serverless workflow and assume jobs survive. The Next output tracing configuration explicitly excludes `.caretakr`, `.env*`, `.git` and `.concord` from every server build trace. Provision credentials on the running host (or use server environment secrets); they are never deployment artifacts. The local credential/receipt files are ignored by git; do not serve `.caretakr` as static assets.

## References inspected

- [grok-bot-sdk](https://github.com/RongleCat/grok-bot-sdk): actual desktop-protocol account/roster/send/Connect transcript path; MIT, pinned dependency.
- [agent-office](https://github.com/Munizada/agent-office): live events drive the representation of current agent tasks rather than fixed movement loops.
- [hermes-virtual-office](https://github.com/JuniorXcoder/hermes-virtual-office): source-backed collaboration handoffs and deduplication.
- [AI-Office](https://github.com/Bogdusik/AI-Office): authoritative backend state, SSE heartbeats/snapshot reconciliation.
- [grok-bot-avatar-engine](https://github.com/RongleCat/grok-bot-avatar-engine): considered for visual identity; its extracted client renderer was not copied. Caretakr uses original procedural geometry.
