<div align="center">

# Caretakr

### A team of Grok Bots that conduct property inspections

Upload a floor plan, property photos and it will be turned into a virtual apartment which Grok Bots walk around and inspect.

**Grok Bot Real Estate Hackathon London · Track 4: Asset and property management**

[**Launch live demo ↗**](https://caretakr.alexchoi.xyz) · [Run locally](#try-it-in-60-seconds) · [Meet the team](#four-specialists-one-shared-mission) · [Grok Bot integration](docs/grok-integration.md)

![Caretakr illustrated overview: four specialists turn property evidence into findings, work orders and a report.](docs/assets/caretakr-overview.svg)

</div>

## From “something looks wrong” to “here’s what to do”

Walkthrough notes, meter readings and maintenance decisions belong in one connected workflow. Caretakr gives each specialist a job, ties findings to their sources and turns the results into a plan a property manager can act on.

| 🏠 See the work | 🔎 Follow the evidence | 🛠 Leave with a plan |
| :--- | :--- | :--- |
| Orbit a floor-plan-derived 3D twin. Follow agents, focus rooms and open finding markers. | Inspect source evidence, timestamped activity and specialist handoffs. | Review priorities, work orders and a health score. Export HTML or JSON. |

## Four specialists. One shared mission.

| Agent | Owns | Hands off |
| :--- | :--- | :--- |
| 🔵 **Scout** · Inspector | Walkthrough evidence | Sourced apparent defects |
| 🟣 **Watt** · Energy Analyst | Consumption and occupancy | Energy anomalies |
| 🟠 **Fix** · Maintenance Engineer | Published specialist findings | Prioritised work orders |
| 🟢 **Cleo** · Property Manager | Brief and coordination | Final sourced plan |

```mermaid
flowchart LR
    A["Cleo · brief"] --> B["Scout · inspect"]
    A --> C["Watt · analyse"]
    B --> D["Fix · plan actions"]
    C --> D
    D --> E["Cleo · final report"]
```

## Try it in 60 seconds

**[Open the deployed demo →](https://caretakr.alexchoi.xyz)** Keep **Demo** selected and click **Inspect property**. No Grok Bot account needed.

Prefer to run locally?

Requires **Node.js 22.13+** and a browser with WebGL.

```sh
npm install
npm run grok:setup
npm run dev
```

Open [localhost:3000](http://localhost:3000), keep **Demo** selected and click **Inspect property**. No Grok Bot account needed.

**Judge’s walkthrough:** follow an agent → open a finding → inspect its evidence → open the completed report → download the action plan. Use **4×** playback for a quick tour.

| 💧 Bathroom | ⚡ Kitchen | 🚪 Hallway |
| :--- | :--- | :--- |
| Suspected ceiling moisture | **4.8 kWh** vs **1.2 kWh** baseline | Potentially obstructed escape route |
| Investigate the source | **300% above baseline** | Clear and measure access |

*Demo uses synthetic incident notes: 3 findings → 3 work orders → an illustrative 62/100 score. The default Webster House example uses its matching source floor plan and room photographs for context. The photographs do not show the simulated incidents; their original rights remain with their owners.*

## Real Grok Bot teammates. Visible handoffs.

**Demo** runs a deterministic backend scenario. **Live** dispatches real tasks to Grok Bot teammates through a pinned, unofficial SDK, validates their replies and streams workflow events into the scene. Live errors stay visible.

The [verified hosted Webster Live run](docs/grok-integration.md#verified-full-four-bot-inspection) completed in 90 seconds: **4 Bots · 3 source-verified photo reviews · 3 simulated incident findings · 3 work orders · 116 events**. Each reviewed image passed an independent SHA-256 and dimension check. The scenario score was **76/100**; Live classifications can differ from Demo.

**Custom MCP tools** let connected Bots read evidence, publish findings, create work orders and complete inspections. SDK replies and actual MCP calls are distinguished in the event stream. [Connect your Bots →](docs/grok-integration.md)

<div align="center">

**Next.js 16 · React 19 · React Three Fiber · Three.js · Zustand · Zod**

Node backend → validated events → SSE → interactive 3D scene

</div>

## Under the hood

[Setup, architecture & checks](docs/technical-guide.md) · [Live integration & security](docs/grok-integration.md) · [Environment settings](.env.example) · [Attribution](docs/reference-patterns.md) · [License](LICENSE)

Local development uses one Node process. Hosted Netlify inspections run in Background Functions with durable snapshots and events in private Blobs storage. Website visitors unlock Live in the browser; terminal unlock links are only for localhost. Keep `.env.local` and `.caretakr/` private. [Hosted setup](docs/hosted-setup.md).
