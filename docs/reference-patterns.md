# Reference repositories reviewed

Reviewed on 12 November 2026. These projects informed architectural decisions; Caretakr's scene and workflow code are original. No third-party avatar renderer, mesh asset or office source is copied here. The Grok Bot transport integration is documented separately in `grok-integration.md`.

| Repository / reviewed commit | Relevant source | Pattern applicable to Caretakr |
| --- | --- | --- |
| [Munizada/agent-office](https://github.com/Munizada/agent-office/tree/228080bc0a8786b19e3eceebf416e2ceb02b3a16) | `src/scene/agentBehavior.ts`, `src/App.tsx`, `server/index.mjs` | Resolve poses from actual task phase/status; a currently running task takes precedence over a previous terminal animation. SSE snapshots supersede older HTTP requests. Stream errors expose a disconnected state, rather than pretending the worker is still live. |
| [JuniorXcoder/hermes-virtual-office](https://github.com/JuniorXcoder/hermes-virtual-office/tree/1d23350d7df734b551bea52167d02aeaf23158e2) | `src/lib/hermes/a2a-transcript.ts`, `src/app/api/hermes/a2a/live/route.ts` | Display agent-to-agent interactions only from genuine transcript/tool-call sources with known participant identity and timestamps. Deduplicate observations; unknown peers have no invented destination. A coordinator dispatch is distinguishable from a bot-authored conversation. |
| [Bogdusik/AI-Office](https://github.com/Bogdusik/AI-Office/tree/08ebafed09a7353b1c55d7503fa6f519f67ab16d) | `backend/app/events.py`, `backend/app/api/v1/events.py`, README architecture | Keep backend state authoritative. SSE notifies the scene of changes; snapshots recover after reconnect. Heartbeats, subscriber cleanup and bounded queues prevent hanging connections and unbounded memory. Legal workflow transitions belong in backend rules. Separate real and demo workers. |
| [RongleCat/grok-bot-avatar-engine](https://github.com/RongleCat/grok-bot-avatar-engine/tree/a995c0675e36ba113de41ead3a5d9be3fcd567e3) | `README.md`, `LICENSE`, `SECURITY.md` | Distinct shape/colour identities and state-driven gaze, rest and completion reactions make workers legible. Renderer can pause offscreen and respect reduced motion. Caretakr uses original procedural characters. |

## Licensing observations

Each reviewed repository includes an MIT license: Agent Office contributors (2026), Hermes Virtual Office Contributors (2026), Bohdan Bozhenko (2026), and RongleCat (2026), respectively. Reusing substantial source portions requires preserving the applicable copyright and license notice.

The avatar engine's README explicitly says its renderer includes declarations lifted byte-for-byte from an unpacked Grok Bot client bundle. Its repository's MIT notice alone does not independently establish rights to that extracted upstream code. Caretakr therefore does not vendor that renderer or its extracted assets; its characters use original geometry inspired by the general idea of expressive, coloured bot teammates.

## Event and provenance rules

- The browser presents server-confirmed agent state. An animated trip is a visual representation of a reported task location, not evidence of physical inspection.
- A live `finding.created` event follows schema and evidence-reference validation. Room markers use those findings, not predicted future script steps.
- Preserve run ID, tool-call identity, timestamp, agent identity and supporting evidence IDs. A reconnect must not double-count findings or work orders.
- A `message.sent` event must represent a real dispatch or bot tool call. Avoid invented dialogue, inferred peer conversations or fabricated timestamps.
- A disconnected, blocked or failed integration remains visible as such. Demo state never silently replaces live output.
- All supplied property evidence is synthetic and mapped onto an illustrative apartment, with no claim of inspection at a real address.

## Local validation

`npx tsx --test tests/scenario.test.ts` checks consumption arithmetic, severity scoring, evidence and work-order referential integrity, malformed outputs, provider dependency ordering and failure propagation. These tests validate Caretakr's deterministic logic; they do not establish a real Grok Bot round trip.

`npx tsx --test tests/server.test.ts tests/scenario.test.ts` additionally checks operator and demo cookie scope, session bootstrap origin checks, role credential spoofing, body-size enforcement, safe error responses, authenticated MCP mutation rejection, backend dependency gates and timestamped tool events. A Demo capability authorises only synthetic replay creation; it cannot mutate Live inspections or publish findings through MCP. Local tests do not verify external SDK connectivity.

HTTP smoke validation against `next dev` on localhost:3000 also passed: unauthenticated Demo/Live inspection starts and MCP mutations returned 401; same-origin Demo bootstrap returned 200; a Demo cookie could not start Live (401); a 4× Demo run returned 201, streamed an SSE snapshot, and completed with 3 sourced findings, 3 work orders, score 62 and 35 timestamped events. The run explicitly identified synthetic deterministic execution and no live AI execution. This is an application flow check, not an external Grok Bot round-trip check.
