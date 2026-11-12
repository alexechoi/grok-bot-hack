import {
  evidence as scenarioEvidence,
  scoringMethod,
  energyMetrics,
  type Finding,
  type WorkOrder,
  type Evidence,
  type PhotoObservation,
} from "./scenario";
import type { WorkflowEvent } from "./client-store";
import { getPropertyDataset } from "./dataset-registry";
export type ReportInput = {
  id: string | null;
  mode: string;
  summary: string;
  score: number | null;
  findings: Finding[];
  workOrders: WorkOrder[];
  events: WorkflowEvent[];
  propertyName?: string;
  datasetId?: string | null;
  evidence?: Evidence[];
  photoObservations?: PhotoObservation[];
};
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const safeUrl = (url: string | undefined) =>
  url && /^https?:\/\//.test(url) ? escape(url) : null;
export function createReport(data: ReportInput) {
  const dataset = data.datasetId ? getPropertyDataset(data.datasetId) : undefined;
  const sourceEvidence=data.evidence||scenarioEvidence;
  if(dataset&&sourceEvidence.some(item=>item.sourceDatasetId&&item.sourceDatasetId!==dataset.id))throw new Error('Reference evidence belongs to a different property dataset');
  return {
    ...data,
    generatedAt: new Date().toISOString(),
    property: dataset?.name || data.propertyName || "Illustrative property",
    provenance:
      dataset
        ? `${dataset.provenance} Incident notes, occupancy assumptions and meter readings are synthetic training inputs, not verified defects or operating data for this home.`
        : "This is a synthetic inspection scenario, not a certified assessment of a real property.",
    scoringMethod,
    energyMetrics,
    evidence: sourceEvidence,
    photoObservations: data.photoObservations || [],
    ...(dataset ? { referenceDataset: dataset } : {}),
  };
}
export function reportHtml(report: ReturnType<typeof createReport>) {
  const priorities = { critical: 0, high: 1, medium: 2, low: 3 };
  const ordered = [...report.workOrders].sort((a, b) => priorities[a.priority] - priorities[b.priority]);
  const urgent = report.workOrders.filter(w => w.priority === "critical" || w.priority === "high").length;
  const energyCount = report.findings.filter(f => f.category === "energy").length;
  const evidenceBlock = (e: Evidence) =>
    `<section class="evidence"><p><strong>${escape(e.id)} · ${escape(e.sourceName)}</strong> <span class="tag">${e.synthetic ? "Synthetic input" : "Reference photo"}</span></p><p>${escape(e.content)}</p>${e.capturedAt ? `<p class="tag">Recorded date: ${escape(e.capturedAt)}</p>` : ""}${e.attribution ? `<p class="tag">${escape(e.attribution)}</p>` : ""}${e.rights ? `<p class="tag">${escape(e.rights)}</p>` : ""}${safeUrl(e.sourceUrl) ? `<p><a href="${safeUrl(e.sourceUrl)}">Original source record</a></p>` : ""}</section>`;
  const actions = ordered.map((w, index) => {
    const recommendations = w.findingIds.map(id => report.findings.find(f => f.id === id)?.recommendedAction).filter((action): action is string => Boolean(action));
    const compactAction = recommendations.length ? recommendations.map(action => action.replace(/^Rating: [^.]+\. /, "")).join(" ") : w.action;
    return `<article class="action"><div class="action-head"><span class="number">${index + 1}</span><div><span class="priority ${escape(w.priority)}">${escape(w.priority)} priority</span><h3>${escape(w.title)}</h3></div></div><p>${escape(compactAction)}</p><p class="tag">${escape(w.trade)} · ${escape(w.id)} · Findings ${escape(w.findingIds.join(", "))}</p><details><summary>Full maintenance assessment</summary><p class="long-copy">${escape(w.action)}</p></details></article>`;
  }).join("");
  const findings = report.findings.map(f => `<article><p class="tag">${escape(f.id)} / ${escape(f.roomId)} / ${escape(f.severity)}</p><h3>${escape(f.title)}</h3><p>${escape(f.description)}</p><p><strong>Recommended action:</strong> ${escape(f.recommendedAction)}</p><details><summary>Supporting evidence · ${f.evidenceIds.length} references</summary>${f.evidenceIds.map(id => report.evidence.find(e => e.id === id)).filter((e): e is Evidence => !!e).map(evidenceBlock).join("")}</details></article>`).join("");
  const photos = report.photoObservations.length ? report.photoObservations.map(o => {
    const e = report.evidence.find(item => item.id === o.evidenceId);
    return `<article><h3>${escape(e?.sourceName || o.evidenceId)}</h3><p class="tag">${escape(o.agentId)} · ${escape(o.timestamp)} · ${escape(o.access)} · ${o.provenance.provider === "grok-bot-sdk" ? "Actual Grok Bot response" : "Dataset coverage record"}</p>${safeUrl(e?.imageUrl) ? `<img loading="lazy" src="${safeUrl(e?.imageUrl)}" alt="${escape(e?.sourceName || "Room reference")}">` : ""}<p>${escape(o.summary)}</p><p><strong>Limits:</strong> ${escape(o.limitations)}</p>${e ? evidenceBlock(e) : ""}</article>`;
  }).join("") : "<p>No live visual review was performed in this run. Reference photographs illustrate the property; synthetic incident notes drive the Demo findings.</p>";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'"><title>${escape(report.property)} · Caretakr inspection</title><style>
  *{box-sizing:border-box}body{font:15px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;color:#243244;background:#eef1f4}main{max-width:920px;margin:40px auto;background:#fff;padding:52px 64px;box-shadow:0 12px 48px #2332440a}header{border-bottom:2px solid #243244;padding-bottom:30px}.brand{color:#647b92;font-size:15px;font-weight:650;margin:0 0 28px}h1{font-size:38px;font-weight:550;letter-spacing:-.04em;line-height:1.15;margin:8px 0 14px}h2{margin:36px 0 16px;font-size:23px;font-weight:550;letter-spacing:-.025em}h3{font-size:17px;line-height:1.4;margin:6px 0 12px;font-weight:600}p{margin:10px 0}.tag,.notice{font-size:12px;color:#647183}.notice{max-width:66ch}.metrics{display:grid;grid-template-columns:1.3fr repeat(3,1fr);gap:20px;padding:27px 0;border-bottom:1px solid #dfe5eb}.metric strong{display:block;font-size:29px;font-weight:550;letter-spacing:-.03em;line-height:1.25}.metric span{font-size:12px;color:#647183}.metric.score strong{color:#416681;font-size:39px}.metric small{font-size:17px;color:#82909d}article{padding:21px 0;border-bottom:1px solid #e3e8ed;break-inside:avoid}.action-head{display:flex;gap:14px;align-items:flex-start}.action-head h3{margin-bottom:0}.number{display:grid;place-items:center;background:#eef3f7;border-radius:50%;width:29px;height:29px;flex:none;color:#546e85;font-size:13px;margin-top:5px}.action>p{margin-left:43px}.priority{font-size:11px;display:inline-block;padding:2px 8px;border-radius:4px;background:#edf1f5;color:#566c7e}.priority.high,.priority.critical{background:#fff0e8;color:#a2512d}.priority.medium{background:#faf3de;color:#826b30}.priority.low{background:#eaf1f5;color:#526d81}details{border:1px solid #e0e6eb;border-radius:6px;padding:13px 16px;margin:14px 0}summary{cursor:pointer;font-size:13px;color:#49647e;font-weight:550}details[open]>summary{margin-bottom:16px}.evidence{padding:12px 16px;background:#f4f6f8;margin:12px 0;font-size:13px}.evidence .tag{display:block}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:10px;line-height:1.5;background:#f4f6f8;padding:14px}a{color:#416b91;text-underline-offset:3px}img{display:block;max-width:100%;max-height:410px;object-fit:contain;margin:16px auto}.long-copy{white-space:pre-wrap;font-size:14px}footer{margin-top:34px;border-top:1px solid #dfe5eb;padding-top:14px;font-size:11px;color:#7b8793}@media(max-width:650px){main{margin:0;padding:28px 22px}h1{font-size:31px}.metrics{grid-template-columns:repeat(2,1fr)}.action>p{margin-left:0}}@media print{body{background:white}main{margin:0;padding:15mm;max-width:none;box-shadow:none}header{padding-bottom:18px}h2{break-after:avoid}.metrics{gap:12px}details{break-inside:avoid}img{max-height:270px}a{color:inherit}footer{font-size:9px}}
  </style></head><body><main><header><p class="brand">caretakr. / inspection report</p><h1>${escape(report.property)}</h1><p class="tag">${escape(report.generatedAt)} · ${escape(report.mode)} execution</p><p class="notice">Operational scenario using synthetic incident notes and readings. This report is an action-planning example, not a certified assessment of this property.</p></header>
  <section class="metrics" aria-label="Inspection summary"><div class="metric score"><strong>${escape(String(report.score ?? "—"))}<small> / 100</small></strong><span>Operational scenario score</span></div><div class="metric"><strong>${report.findings.length}</strong><span>Findings</span></div><div class="metric"><strong>${report.workOrders.length}</strong><span>Maintenance actions · ${urgent} high priority</span></div><div class="metric"><strong>${energyCount}</strong><span>Energy anomalies</span></div></section>
  <h2>Prioritised action plan</h2>${actions || "<p>No maintenance actions were recorded.</p>"}
  <h2>Inspection findings</h2>${findings || "<p>No findings were recorded.</p>"}
  <details><summary>Full agent summary &amp; provenance</summary><p class="long-copy">${escape(report.summary)}</p><h3>Data provenance</h3><p>${escape(report.provenance)}</p><p class="tag">Run ${escape(report.id || "example")} · ${escape(report.mode)}</p><h3>Scoring method</h3><p>${escape(scoringMethod)}</p></details>
  <details><summary>Reference photo reviews · ${report.photoObservations.length}</summary>${photos}</details>
  <details><summary>Energy calculation &amp; source records</summary><p>Synthetic baseline ${energyMetrics.baseline} kWh; observed example ${energyMetrics.observed} kWh; deviation +${energyMetrics.deviationPercent}%; excess ${energyMetrics.excessKwh} kWh. Deviation = (observed − baseline) / baseline × 100.</p>${report.referenceDataset ? `<h3>Floor plan &amp; image sources</h3><p>${escape(report.referenceDataset.provenance)}</p><p>${escape(report.referenceDataset.credit)}</p>${safeUrl(report.referenceDataset.floorplan.sourceUrl) ? `<p><a href="${safeUrl(report.referenceDataset.floorplan.sourceUrl)}">Source floor plan</a></p>` : ""}` : ""}</details>
  <details class="audit"><summary>Timestamped event record · ${report.events.length} events</summary><pre>${escape(JSON.stringify(report.events, null, 2))}</pre></details><footer>Caretakr · Evidence-linked property operations · Generated ${escape(report.generatedAt)}</footer></main></body></html>`;
}
export function downloadReport(
  data: ReportInput,
  format: "html" | "json" = "html",
) {
  const report = createReport(data),
    content =
      format === "json" ? JSON.stringify(report, null, 2) : reportHtml(report);
  const url = URL.createObjectURL(
    new Blob([content], {
      type: format === "json" ? "application/json" : "text/html",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `caretakr-inspection.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
