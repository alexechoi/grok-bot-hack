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
  return {
    ...data,
    generatedAt: new Date().toISOString(),
    property: data.propertyName || "Illustrative property",
    provenance:
      dataset
        ? `${dataset.provenance} Incident notes, occupancy assumptions and meter readings are synthetic training inputs, not verified defects or operating data for this home.`
        : "This is a synthetic inspection scenario, not a certified assessment of a real property.",
    scoringMethod,
    energyMetrics,
    evidence: data.evidence || scenarioEvidence,
    photoObservations: data.photoObservations || [],
    ...(dataset ? { referenceDataset: dataset } : {}),
  };
}
export function reportHtml(report: ReturnType<typeof createReport>) {
  const evidenceBlock = (e: Evidence) =>
    `<section class="evidence"><p><strong>${escape(e.id)} · ${escape(e.sourceName)}</strong> <span class="tag">${e.synthetic ? "SYNTHETIC INPUT" : "REFERENCE PHOTO"}</span></p><p>${escape(e.content)}</p>${e.capturedAt ? `<p class="tag">Recorded date: ${escape(e.capturedAt)}</p>` : ""}${e.attribution ? `<p class="tag">${escape(e.attribution)}</p>` : ""}${e.rights ? `<p class="tag">${escape(e.rights)}</p>` : ""}${safeUrl(e.sourceUrl) ? `<p><a href="${safeUrl(e.sourceUrl)}">Original source record</a></p>` : ""}</section>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'"><title>Caretakr inspection report</title><style>body{font:15px/1.7 system-ui;max-width:850px;margin:60px auto;padding:24px;color:#313740}h1{font-size:38px;font-weight:500;letter-spacing:-.03em;line-height:1.2}h2{margin-top:38px;font-size:23px;font-weight:500}h3{font-size:17px}article{border-top:1px solid #dce0e5;padding:18px 0}.tag{font-size:12px;color:#657180}.evidence{background:#f4f5f5;padding:14px 18px;margin:14px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:10px}a{color:#526d89;text-underline-offset:3px}img{display:block;width:100%;max-height:440px;object-fit:contain;margin:16px 0} @media print{body{margin:0}article,.evidence{break-inside:avoid}pre{font-size:8px}}</style><p class="tag">Caretakr / inspection report</p><h1>${escape(report.property)}</h1><p>${escape(report.provenance)}</p><p>Execution: <strong>${escape(report.mode)}</strong> · ${escape(report.generatedAt)} · Run ${escape(report.id || "example")}</p><h2>Scenario score: ${report.score}/100</h2><p>${escape(scoringMethod)}</p><p>${escape(report.summary)}</p><h2>Findings &amp; evidence</h2>${report.findings
    .map(
      (f) =>
        `<article><p class="tag">${escape(f.id)} / ${escape(f.roomId)} / ${escape(f.severity)}</p><h3>${escape(f.title)}</h3><p>${escape(f.description)}</p><p><strong>Action:</strong> ${escape(f.recommendedAction)}</p>${f.evidenceIds
          .map((id) => report.evidence.find((e) => e.id === id))
          .filter((e): e is Evidence => !!e)
          .map(evidenceBlock)
          .join("")}</article>`,
    )
    .join(
      "",
    )}<h2>Work orders</h2>${report.workOrders.map((w) => `<article><h3>${escape(w.id)} · ${escape(w.title)}</h3><p class="tag">${escape(w.priority)} · ${escape(w.trade)} · ${escape(w.findingIds.join(", "))}</p><p>${escape(w.action)}</p></article>`).join("")}<h2>Reference photo review</h2>${
    report.photoObservations.length
      ? report.photoObservations
          .map((o) => {
            const e = report.evidence.find((e) => e.id === o.evidenceId);
            return `<article><h3>${escape(e?.sourceName || o.evidenceId)}</h3><p class="tag">${escape(o.agentId)} · ${escape(o.timestamp)} · ${escape(o.access)} · ${o.provenance.provider === "grok-bot-sdk" ? "Actual Grok Bot response" : "Dataset coverage record"}</p>${safeUrl(e?.imageUrl) ? `<img src="${safeUrl(e?.imageUrl)}" alt="${escape(e?.sourceName || "Room reference")}">` : ""}<p>${escape(o.summary)}</p><p><strong>Limits:</strong> ${escape(o.limitations)}</p>${e ? evidenceBlock(e) : ""}</article>`;
          })
          .join("")
      : "<p>No live visual review was performed in this run. Reference photographs illustrate the property; synthetic incident notes drive the Demo findings.</p>"
  }<h2>Energy calculation</h2><p>Synthetic baseline ${energyMetrics.baseline} kWh; observed example ${energyMetrics.observed} kWh; deviation +${energyMetrics.deviationPercent}%; excess ${energyMetrics.excessKwh} kWh. Deviation = (observed − baseline) / baseline × 100.</p>${report.referenceDataset ? `<h2>Floor plan &amp; image sources</h2><p>${escape(report.referenceDataset.provenance)}</p><p>${escape(report.referenceDataset.credit)}</p><p><a href="${escape(report.referenceDataset.floorplan.sourceUrl)}">Source floor plan</a></p>` : ""}<h2>Timestamped event record</h2><pre>${escape(JSON.stringify(report.events, null, 2))}</pre></html>`;
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
