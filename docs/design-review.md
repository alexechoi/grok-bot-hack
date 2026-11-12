# Caretakr design review

12 November 2026. Assessment A: independent visual and code review. The coordinating agent runs Assessment B (detector/browser evidence) separately before combining results. No detector findings were used to form this assessment.

## Installed skills

Installation was explicitly requested. Repository READMEs, package scripts and the Impeccable launcher were inspected before executing installation commands.

| Source | Reviewed repository commit | Installed project skill |
| --- | --- | --- |
| `pbakaus/impeccable` | `b4bff1626c344067788c2679f048a20057c7cc5a` | `.agents/skills/impeccable/SKILL.md` |
| `anthropics/skills` | `2c5958ecac7cee2b583967a2c4981d0f4a75c579` | `.agents/skills/frontend-design/SKILL.md` |
| `vercel-labs/agent-skills` | `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` | `.agents/skills/web-design-guidelines/SKILL.md` and `.agents/skills/react-best-practices/SKILL.md` |

Impeccable used its documented `npx --yes impeccable@4.8.2 install -y --providers=codex --scope=project --no-hooks` command. It installed skill 4.8.2 and its platform engine 0.1.21. The other skills used Codex's `install-skill-from-github.py` helper with project-local `--dest .agents/skills`. Existing Netlify skills were preserved. No design hook or live browser-injection agent was enabled. The platform binary is local tooling and should remain outside version control; the launcher can fetch a checksum-verified engine when required.

All four main skills, Impeccable critique/polish references, relevant Vercel re-render rules and freshly retrieved [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) were read. Skills become available through discovery on the next turn; current files were read directly for this review.

The required Impeccable context command ran once against `app/page.tsx`. It found no PRODUCT.md, DESIGN.md or surface brief, but did identify an existing visual implementation. Its `SCOPED_EXISTING_ALLOWED` directive permits narrow refinements using that incumbent system; this review does not use absent documents as a reason to block implementation. No automatic detector hook is active, so the final markup needs one manual detector pass after edits settle.

## Direction and evidence

The user has already specified the direction: Apple-like restraint, neutral charcoal, warm off-white diorama, minimal text and no dashboard appearance. The central apartment is the memorable object. Interface chrome should recede while remaining readable and operable. These explicit preferences take precedence over any skill's generic anti-pattern cautions.

Primary mode: **Experience**, with **Operate** behavior when inspecting findings or connecting agents.

Evidence inspected:

- Initial desktop screenshot: `/tmp/caretakr-preview-desktop.png`, 1440 × 1000.
- Independent fresh-page desktop capture: `/tmp/caretakr-assessment-a-desktop.png`, 1440 × 1000.
- Independent mobile integration-panel capture: `/tmp/caretakr-assessment-a-mobile.png`, 390 × 844.
- Current `app/page.tsx`, `app/globals.css`, `components/property-scene.tsx`, `lib/client-store.ts` and server event payloads.

A separate headless Chromium instance used a fresh page. Desktop and mobile had no horizontal document overflow. The modal test observed no dialog role and Escape did not dismiss it at the time of assessment. The initial brief render showed the scene-loading state; the final desktop capture waited for the rendered apartment. No browser overlay was injected during Assessment A.

## Assessment A baseline

Scores describe the pre-fix implementation reviewed, not a claim that every finding remains after the parallel polish work.

| Heuristic | Score / 4 | Evidence |
| --- | --- | --- |
| Visibility of system status | 3 | Explicit Demo/Live and agent states; remaining status text too small. |
| Match with real world | 4 | Furnished rooms and source-linked property issues communicate the subject immediately. |
| User control and freedom | 2 | Reset, focus and replay exist; modal keyboard handling was incomplete. |
| Consistency and standards | 3 | Coherent camera, specialist and report controls. |
| Error prevention | 3 | Role-bound backend, scoped Demo, source validation and no silent Live fallback. |
| Recognition rather than recall | 3 | Named specialists and room artifacts; role/task details need progressive disclosure. |
| Flexibility and efficiency | 2 | Pointer camera is capable; keyboard and reduced-motion paths need attention. |
| Aesthetic and minimalist design | 3 | Diorama leads; initial olive stage and microscopic chrome weakened the requested restraint. |
| Error recovery | 3 | Connection states and backend errors exist; snapshot error reconstruction was being improved. |
| Help and documentation | 3 | Detailed setup/provenance documentation, with controls mostly discoverable. |
| **Total** | **29 / 40** | **Good; targeted accessibility and legibility work remains.** |

Strengths:

- The miniature is specific to the product, with recognisable kitchen, shower, bed, lounge and four worker identities.
- One prominent inspection action and progressive evidence/report details keep the main viewport focused on the property.
- Source provenance and explicit execution modes support trust without a chatbot interface.

Cognitive load is low after text reduction: one primary action, two execution modes and four specialist rows. Avoid restoring explanatory panels across the scene. The emotional high point is the furnished apartment coming to life; the sourced report provides the closing payoff.

## Five priorities

1. **P1 — Legibility:** `app/globals.css` contains 6–9 px labels, including the quiet-canvas overrides around line 1954. Remove expendable labels rather than shrinking meaningful names/status/actions. Keep the remaining operating text at an intentional readable size; verify 200% zoom and mobile.
2. **P1 — Dialog accessibility:** the modal around `app/page.tsx:719` lacked dialog semantics, focus containment/restoration and Escape dismissal in the browser check. Add the complete keyboard path and ensure obscured controls cannot receive focus.
3. **P1 — Motion preference:** CSS reduced-motion rules do not affect Three.js frame loops or automatic camera following. Disable ornamental bobbing/pulsing and automatic tracking under `prefers-reduced-motion`; preserve event state and deliberate camera controls.
4. **P2 — Requested palette:** the original olive stage competed with the sage furniture. Neutral charcoal should frame the warm house, with accent colours reserved for workers and findings. The later independent capture already shows the charcoal change; verify the final shared tokens and shadow treatment together.
5. **P2 — React work per event:** `app/page.tsx` subscribes to the entire Zustand state. SSE events can re-render the whole page and static apartment, with fresh agent objects invalidating destination memoization. Use narrow selectors, stable primitive dependencies and memoised static scene structure where measurement warrants it. Keep the dynamically loaded Three.js boundary.

Persona checks: a keyboard user is affected most by modal/focus behavior; a mobile user faces tiny status text and a primary target measured at 41 px high; a first-time judge understands “Inspect property” without a tour. A visible Next development issue badge should be absent from the final recording.

Questions skipped: the user already supplied the palette, density, priority and implementation direction and explicitly authorised autonomous refinement. This is the independent A assessment supplied to the coordinating agent, which combines it with B; no additional design decision is required to implement these scoped fixes.

## Regression checks

`tests/client-store.test.ts` adds six checks using actual backend snapshots/events: visual identity hydration, stale-run rejection, reconnect deduplication, failed-run error reconstruction, movement/completion payload mapping and bounded history. Alongside the existing scenario/server checks, **30 tests pass** and TypeScript passes. These are state/provenance checks, not a substitute for visual and accessibility verification after polish.

## Additional motion and writing skills

The user subsequently requested Emil Kowalski's design skills and Richyuh's concise-writing skill. Their repository READMEs were inspected before installation; no repository package scripts were executed. The reviewed repositories were `emilkowalski/skills` at `f7ce8c02d6e3c8f0d980a44c57bcc41a40254349` and `richyuh/claude-skills` at `77b048bd8b86fe83d130ee8fd2874f074dac80c5`. Codex's reviewed installer copied these project-local skills without replacing existing folders:

- `.agents/skills/emil-design-eng/SKILL.md`
- `.agents/skills/apple-design/SKILL.md`
- `.agents/skills/writing-clearly-and-concisely/SKILL.md`

The full motion/design instructions and the writing skill's composition reference were read. Applied guidance: the house remains the visual focus; operating text stays specific; tracing responds directly to the pointer without decorative motion; advanced geometry controls remain behind disclosure; reduced-motion preferences apply to scene movement and camera work. Later in the session, the user enabled Impeccable's project hook; its configuration is preserved. The initial no-hook installation above is historical, not a statement about the final hook state.

| Before | After | Why |
| --- | --- | --- |
| Meaningful labels reduced to 6–9 px | Delete expendable labels; retain readable operating text | Restraint comes from hierarchy, not illegibility. |
| Modal lacked complete focus and Escape behavior | Dialog semantics, focus management, keyboard dismissal | Keyboard users need the same route in and out. |
| CSS-only reduced-motion override | Reduced movement and camera behavior in the Three.js loops | CSS cannot stop JavaScript frame animation. |
| “Bring your property in.” | “Import property” | Name the action directly. |
| Repeated palette and reconstruction explanations | One short tracing instruction and one accurate reconstruction note | Preserve the useful limitation without repeating it. |
| CSS module class exports missing under the custom Turbopack CSS loader | Dedicated `ct-import-*` global stylesheet imported by the component | Browser evidence showed every module class absent; namespaced CSS restores scoped appearance without changing global build configuration. |

The import feature stores source files and traces in IndexedDB on the current browser. It validates image headers before bitmap allocation, limits dimensions and file sizes, maps normalised room rectangles into centre-based world coordinates, and extracts a muted photo palette. It does not claim to reconstruct geometry from photos. A separately uploaded, previously trained `.splat` is displayed as an alternative. Imported previews are explicitly uninspected and do not inherit the synthetic demonstration report.

Final import checks passed in headless Chromium at 1440 × 1000 and 390 × 844: pointer tracing, keyboard rectangle creation, photo palette extraction, local save, reload and restoration in the import panel, preview application, no horizontal overflow and Escape dismissal. Captures: `/tmp/caretakr-import-panel-fixed.png` and `/tmp/caretakr-import-mobile-fixed.png`. The fix was verified through computed styles and rendered screenshots, not only a source diff. After adding image/security/geometry and structured-output/policy regressions, **44 local tests pass**, TypeScript passes and the owned import files pass ESLint. No extra manual detector scan was run after the user enabled the automatic hook.
