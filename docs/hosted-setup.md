# Hosted Live on Netlify

Production was verified on 2026-11-12: inspection `60276bed-57e4-4b33-bbe2-38fbd3f5e6dd` completed in 90 seconds with eight actual Grok Bot replies, three independently source-verified photo reviews, three findings, three work orders and a 76/100 scenario score. [Execution evidence](grok-integration.md#verified-full-four-bot-inspection).

Website visitors do not run npm commands. Open `/?mode=live`, enter the private workspace password and start an inspection. The server sets a signed HttpOnly, Secure cookie. Provider credentials are never sent to the browser. The owner can distribute or rotate the workspace password separately from Grok Bot credentials.

## Server configuration

Build with Node 24 using the committed `netlify.toml`. Set these private environment variables for the production deploy and include their Functions scope where the plan permits:

- `GROK_BOT_ACCESS_TOKEN` and `GROK_BOT_TEAM_ID`: from an authorised fresh Grok Bot login.
- `GROK_BOT_INSPECTOR_ID`, `GROK_BOT_ENERGY_ID`, `GROK_BOT_MAINTENANCE_ID`, `GROK_BOT_MANAGER_ID`: the four existing, distinct TEMPORAL teammates.
- `CARETAKR_OPERATOR_TOKEN` and `CARETAKR_SESSION_SECRET`: independent random server secrets. Keep the session secret stable across deploys.
- `CARETAKR_WORKSPACE_PASSWORD`: a private password of at least 12 characters. Do not commit or publish its value.
- `GROK_BOT_CLIENT_VERSION=0.78.1`, `GROK_BOT_TIMEOUT_MS=180000`, and `CARETAKR_PUBLIC_URL`: the public HTTPS origin.

Never prefix secrets with `NEXT_PUBLIC_`. Do not upload `.env.local` or `.caretakr/`. Native Functions receive Blobs access automatically; no personal Netlify token belongs in the application environment.

The SDK is unofficial and uses account-wide Grok Bot credentials. Expired credentials require a fresh authorised login and a server environment update. Configuration presence alone does not prove current compatibility.

## Execution and storage

`caretakr-api` serves the existing inspection/status URLs. It authenticates Live mutations, creates a durable run and sends a signed request to that same deploy’s immutable background-function URL. `caretakr-inspection-background` awaits the full Demo or Live workflow; it does not rely on a detached Next.js promise.

Production documents use `caretakr-production`; preview documents use their own deployment-specific namespace. Strong reads expose ordered snapshots and immutable events across instances. The 45-second SSE connection reconnects to the latest snapshot, permitting a multi-minute inspection without a single long streaming invocation. Browser disconnection does not cancel a run; the explicit Cancel action writes a separate durable flag.

One worker claim prevents duplicate execution on platform retries. A team-wide slot permits one Live inspection at a time. Unconfirmed dispatch is cancelled, never retried. Workers have a 13-minute deadline; after 16 minutes an atomic recovery claim can close a terminated worker and free the slot without re-dispatching its tasks. New inspections get new run IDs. Old Bot tasks are never resumed automatically.

The existing MCP server and connector setup are separate from SDK execution. The verified workflow uses the SDK result adapter; it does not claim that Bots called a remote MCP connector. Hosted background workers are the authoritative snapshot writers. Do not attach another writer to these documents without a coordinated task queue.

## Verify a deployment

1. Build and run `node scripts/audit-build-secrets.mjs`. The audit must inspect the native Function ZIPs as well as Next.js artifacts, and report no current credential values or sensitive paths. The configured native-file exclusions are required in addition to Next output-tracing exclusions.
2. Deploy. Check `/api/integration/status`: `configured` indicates server configuration; `roundTripVerified` only becomes true after an actual validated Grok Bot response is persisted by a hosted worker.
3. Sign in through the website. Confirm an unauthenticated client cannot start Live.
4. Start Demo, disconnect and reconnect its stream, and verify the same run completes from durable storage.
5. Start Live once. Confirm actual SDK response IDs, independently verified photo digests, sourced synthetic findings, work orders and a final report. This hosted test is separate from the previously verified local run.

Deploy from a clean Git checkout with secrets supplied by Netlify environment settings. A local framework-adapter build can copy an existing root `.env.local` into generated server artifacts even when the file is ignored by Git. Never manually publish those artifacts without inspecting the actual archives. The standalone `netlify functions:build` helper may also omit project bundling exclusions; validate the real configured build and its final ZIPs. An audit failure blocks publication.

`npm run unlock:live` deliberately issues localhost-only tickets. It is a development convenience, not hosted authentication.
