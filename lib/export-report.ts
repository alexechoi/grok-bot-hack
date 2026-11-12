import {
  evidence,
  scoringMethod,
  energyMetrics,
  Finding,
  WorkOrder,
} from "./scenario";
import { WorkflowEvent } from "./client-store";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function downloadReport(
  data: {
    id: string | null;
    mode: string;
    summary: string;
    score: number | null;
    findings: Finding[];
    workOrders: WorkOrder[];
    events: WorkflowEvent[];
  },
  format: "html" | "json" = "html",
) {
  const report = {
    ...data,
    generatedAt: new Date().toISOString(),
    property: "The Willow apartment · illustrative digital twin",
    provenance:
      "All inspection inputs are synthetic. This digital twin does not represent a real inspected address.",
    scoringMethod,
    energyMetrics,
    evidence,
  };
  const content =
    format === "json"
      ? JSON.stringify(report, null, 2)
      : `<!doctype html><html lang="en"><meta charset="utf-8"><title>Caretakr inspection report</title><style>body{font:16px/1.6 system-ui;max-width:850px;margin:60px auto;padding:24px;color:#263126}h1{font-size:42px}h2{margin-top:36px}article{border-top:1px solid #ddd;padding:20px 0}.tag{color:#84705d}pre{white-space:pre-wrap;font-size:12px} @media print{body{margin:0}article{break-inside:avoid}}</style><p>CARETAKR / PROPERTY OPERATIONS</p><h1>The Willow apartment</h1><p>${escape(report.provenance)}</p><p>Execution: <strong>${escape(data.mode)}</strong> · ${escape(report.generatedAt)} · Inspection ${escape(data.id || "example")}</p><h2>Health score: ${data.score}/100</h2><p>${escape(scoringMethod)}</p><p>${escape(data.summary)}</p><h2>Findings & evidence</h2>${data.findings
          .map(
            (f) =>
              `<article><p class="tag">${escape(f.id)} / ${escape(f.roomId)} / ${escape(f.severity)}</p><h3>${escape(f.title)}</h3><p>${escape(f.description)}</p><p><strong>Action:</strong> ${escape(f.recommendedAction)}</p>${f.evidenceIds
                .map((id) => {
                  const e = evidence.find((e) => e.id === id);
                  return e
                    ? `<p><strong>${escape(e.id)} · ${escape(e.sourceName)} · SYNTHETIC</strong><br>${escape(e.content)}</p>`
                    : "";
                })
                .join("")}</article>`,
          )
          .join(
            "",
          )}<h2>Work orders</h2>${data.workOrders.map((w) => `<article><h3>${escape(w.id)} · ${escape(w.title)}</h3><p>${escape(w.priority)} · ${escape(w.trade)} · ${escape(w.findingIds.join(", "))}</p><p>${escape(w.action)}</p></article>`).join("")}<h2>Energy calculation</h2><p>Baseline ${energyMetrics.baseline} kWh; observed ${energyMetrics.observed} kWh; deviation +${energyMetrics.deviationPercent}%; excess ${energyMetrics.excessKwh} kWh. Deviation = (observed − baseline) / baseline × 100.</p><h2>Timestamped event record</h2><pre>${escape(JSON.stringify(data.events, null, 2))}</pre></html>`;
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
