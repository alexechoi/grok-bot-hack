# Caretakr

A tiny team of AI property inspectors inside a 3D apartment. Watch Scout, Watt, Fix and Cleo investigate source evidence, flag operational concerns and turn findings into prioritised maintenance actions.

Built for the **Grok Bot Real Estate Hackathon London · Track 4: Asset and property management**.

## Run locally

Requires **Node.js 22.13+**, npm and a browser with WebGL support.

```sh
npm install
npm run grok:setup
npm run dev
```

Open [localhost:3000](http://localhost:3000), leave **Demo** selected and click **Inspect property**. No Grok Bot account or model credentials are needed for Demo. The browser obtains a signed, scoped Demo capability automatically; that capability cannot start Live tasks or publish findings through MCP.

`grok:setup` generates local authentication secrets in ignored `.env.local` without printing them. Restart the server after changing environment variables. Never commit `.env.local` or `.caretakr/`.

## Explore the apartment

- Drag to orbit, scroll to zoom and use the camera controls to reset, follow an agent or view the floor plan from above.
- Click a room to focus it, or click an agent to view its current task and timestamped activity.
- Start an inspection to see room assignments, movement, scanning states, issue markers and the kitchen energy overlay.
- Click a finding marker or the Findings tab to inspect the original synthetic evidence and recommended action.
- Open the completed report to review priorities, work orders and scoring, then download HTML or JSON. The HTML report can also be printed from a browser.
- Use **Run inspection again** to repeat the scenario. Demo playback supports 1×, 2× and 4× speed.

The default example is Webster House from the user-selected Openhouse-3D dataset: one matching floor plan, five room-reference photographs and procedural reconstruction geometry. The source plan includes inferred dimensions, and the furniture is illustrative. Photograph rights remain with the original owners; the pinned photos are remote hackathon references. Incident notes, electricity readings and occupancy assumptions are synthetic. No EPC rating or actual property defect is asserted. Farnsworth and a synthetic apartment remain separate fallback datasets.

## Demo and Live are different execution modes

| Mode | What actually runs |
| --- | --- |
| **Demo** | A deterministic backend scenario with validated structured findings. SSE events drive the scene. No live model execution and no invented Grok Bot conversations. |
| **Live Grok Bot** | The Node backend sends real tasks to actual Grok Bot teammates through the unofficial desktop-protocol SDK, validates their replies and streams the resulting workflow events. Errors remain visible; Live never silently falls back to Demo. |

A complete **Webster House Live inspection** was verified on **12 November 2026, 20:28:39–20:30:35 UTC**. Four actual Grok Bot teammates produced **3 source-verified photo observations, 3 simulated incident findings, 3 work orders and a sourced action plan**, with **85 timestamped events** and a scenario score of **76/100**. Eight validated replies cover assignment, bathroom/kitchen/entry image review, synthetic inspection/energy analysis, maintenance and reporting. The backend verifies each image’s digest and dimensions against the pinned source, without supplying the expected values in the photo task.

The first SDK evidence round trip and a native desktop evidence test were also verified. SDK offline compatibility tests passed 48 checks. Authentication credentials and full Live receipts stay in ignored, permission-restricted `.caretakr/` files. A non-secret native response capture is in [docs/captures/scout-desktop.json](captures/scout-desktop.json).

## Connect actual Grok Bot teammates

Caretakr targets **Grok Bot**, not Grok Build and not the xAI model API. The integration uses `grok-bot-sdk`, pinned to commit `42c75eb13f24630d1b689629502d4320c4219cdb`. It is unofficial and sensitive to product/protocol changes.

```sh
npm run grok:login
npm run grok:check
npm run grok:check -- --round-trip
# Continue after receiving a validated reply:
npm run grok:provision
npm run dev
```

Finish the login in your own browser. The login command saves its session only to ignored `.caretakr/grok-credentials.json`; it does not extract the desktop app's Keychain credentials. `grok:check -- --round-trip` sends the supplied synthetic bathroom note to an owned Bot and accepts success only after a matching, schema-valid reply. `grok:provision` discovers the four native-created Caretakr Bots and stores their IDs in `.env.local`. Create them in the desktop app first: Caretakr · Scout Inspector, Caretakr · Watt, Caretakr · Fix, Caretakr · Cleo. This account’s SDK-created Bots used an incompatible BOX harness; discovery verifies the actual TEMPORAL harness before mapping a role.

Open the one-use **Live workspace link** printed by `npm run dev`, then choose Live. Run `npm run unlock:live` for a fresh link if needed. Each link expires after five minutes, sets a signed HttpOnly operator cookie and redirects to a clean URL. No token needs to be copied into the interface, and Grok Bot credentials remain on the server.

The roles are:

| Bot | Role | Dependency |
| --- | --- | --- |
| Scout · blue | Inspector | Reviews walkthrough evidence and publishes sourced apparent defects. |
| Watt · purple | Energy Analyst | Reviews meter/occupancy data in parallel with Scout. |
| Fix · orange | Maintenance Engineer | Waits for specialist reviews, then prepares actions for published findings. |
| Cleo · green | Property Manager | Creates the task brief, collects findings/actions and writes the final sourced plan. |

Live outputs may differ from Demo. No specific issue count, severity or score is forced onto a live response.

See [actual Grok Bot integration and security notes](grok-integration.md) for credentials, compatibility checks, official connector instructions and failure handling. [.env.example](../.env.example) lists the supported server settings.

## Caretakr MCP connector

The authenticated Streamable HTTP endpoint is **`/api/mcp`**, exposing:

`get_property`, `get_room_evidence`, `get_energy_readings`, `record_finding`, `publish_agent_status`, `create_work_order`, `complete_inspection`.

Use Grok Bot's **Connect apps → Add a custom connector → Remote HTTPS** flow. Its cloud computer needs a publicly reachable HTTPS endpoint; laptop localhost is not reachable there. Configure the connector with the relevant per-role bearer credential, not a credential in task text. Full setup is in [docs/grok-integration.md](grok-integration.md#official-mcp-connector-setup).

The automatic workflow also accepts schema-validated SDK JSON replies. Events distinguish SDK responses from actual MCP tool calls. Adding an MCP endpoint does not by itself attach the connector to a Bot.

## Evidence and calculations

Demo covers suspected bathroom moisture, unusual overnight kitchen consumption and a potentially obstructed hallway escape route. Every simulated finding cites its incident or meter input. Genuine reference photos have separate observation records, source credits and byte-verification metadata; photos alone cannot substantiate the simulated defects. Recommendations identify missing measurements and unconfirmed causes.

Consumption deviation is calculated in code: baseline **1.2 kWh**, observed **4.8 kWh**, excess **3.6 kWh**, or **300% above baseline**. The score starts at 100 and deducts 3 per low, 8 per medium, 15 per high and 30 per critical finding, floored at zero. Demo's two high and one medium findings produce **62/100**. This is an illustrative operational score, not a certified building or safety assessment.

## Architecture and deployment

Next.js 16, React 19, TypeScript, React Three Fiber, Drei, Three.js, Zustand and Zod. Backend workflow state is authoritative; the browser receives an initial snapshot and subsequent SSE events. Validated events determine character task/location, issue markers and completion. The scene is an illustrative view of evidence-processing work, not a claim of physical robotic inspection.

Run **one persistent Node process**:

```sh
npm run build
npm start
```

The hackathon backend keeps bounded inspections and event history in process memory. Restarting loses inspections. Multiple replicas or ephemeral/serverless request execution require a durable shared event store and worker; do not assume background tasks or SSE survive request freezing. Grok Bot MCP additionally needs HTTPS and `CARETAKR_PUBLIC_URL` set to its reachable origin.

Mutation endpoints require scoped authentication. Live snapshots/streams require operator access. MCP credentials bind calls to roles; schema and reference validation reject forged identities, unknown evidence, invalid dependencies and actions without findings. Same-account Bots share Grok Bot's account-level access; per-role connector credentials do not create isolation between those Bots.

## Checks

```sh
npx tsc --noEmit
npm run lint
npx tsx --test tests/*.test.ts
npm run build
```

The local test suites cover energy arithmetic, scoring, source references, malformed outputs, workflow dependencies, failure propagation, scoped authentication and MCP mutation guards. HTTP smoke testing also verified Demo session creation, auth rejection, SSE snapshots and a completed 3-finding/3-work-order report. Local checks are separate from Live integration verification.

## Reference projects and attribution

Reviewed patterns from [agent-office](https://github.com/Munizada/agent-office), [hermes-virtual-office](https://github.com/JuniorXcoder/hermes-virtual-office), [AI-Office](https://github.com/Bogdusik/AI-Office), [grok-bot-sdk](https://github.com/RongleCat/grok-bot-sdk) and [grok-bot-avatar-engine](https://github.com/RongleCat/grok-bot-avatar-engine). Scene geometry and characters are original; the extracted Grok Bot avatar renderer was not copied. The pinned SDK is a third-party MIT dependency and retains its own license.

See [reference review, pinned commits and licensing observations](reference-patterns.md). Repository license: [LICENSE](../LICENSE).
