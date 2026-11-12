"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Focus,
  House,
  Layers,
  LoaderCircle,
  Maximize2,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
  Settings2,
  ScanLine,
  MoveUpRight,
  Upload,
} from "lucide-react";
import {
  agents,
  rooms,
  scoringMethod,
  energyMetrics,
  type Evidence,
} from "@/lib/scenario";
import { useInspection, WorkflowEvent, Snapshot } from "@/lib/client-store";
import { downloadReport } from "@/lib/export-report";
import { propertyDataset, DATASET_ID } from "@/lib/property-dataset";
import { PhotoReviewCard, SourceImageDetails } from "@/components/photo-review";
import {
  releaseCustomProperty,
  type CustomProperty,
} from "@/lib/property-source";
const PropertyImport = dynamic(() => import("@/components/property-import"), {
  ssr: false,
});
const PropertyScene = dynamic(() => import("@/components/property-scene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading">
      <div className="loading-orbit" />
      <span>Loading property…</span>
    </div>
  ),
});
type Integration = {
  configured: boolean;
  authenticated: boolean;
  missing: string[];
  sdkVersion: string;
  roundTripVerified: boolean;
};
const icons = {
  inspector: ScanLine,
  energy: Zap,
  maintenance: Settings2,
  manager: ShieldCheck,
};

export default function Home() {
  const s = useInspection();
  const stream = useRef<EventSource | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const [tab, setTab] = useState<"team" | "findings">("team");
  const [modal, setModal] = useState<
    "report" | "integration" | "agent" | "property" | "sources" | null
  >(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [dismissedPhoto, setDismissedPhoto] = useState<string | null>(null);
  const [customProperty, setCustomProperty] = useState<CustomProperty | null>(
    null,
  );
  useEffect(
    () => () => releaseCustomProperty(customProperty),
    [customProperty],
  );
  const [starting, setStarting] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [cinematic, setCinematic] = useState(true);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [notice, setNotice] = useState("");
  const refreshIntegration = () =>
    fetch("/api/integration/status")
      .then((r) => r.json())
      .then((data) => {
        setIntegration(data);
        const url = new URL(window.location.href);
        if (data.authenticated && url.searchParams.get("mode") === "live") {
          useInspection.setState({ mode: "live" });
          url.searchParams.delete("mode");
          window.history.replaceState(null, "", url.pathname + url.search);
        }
        return data;
      })
      .catch(() => setIntegration(null));
  useEffect(() => {
    void refreshIntegration();
    return () => stream.current?.close();
  }, []);
  useEffect(() => {
    if (!s.inspectionId) return;
    const runId = s.inspectionId;
    const isCurrent = () => useInspection.getState().inspectionId === runId;
    const source = new EventSource(`/api/inspections/${runId}/events`);
    stream.current = source;
    source.addEventListener("snapshot", (event) => {
      if (!isCurrent()) return;
      try {
        useInspection.getState().hydrate(JSON.parse(event.data) as Snapshot);
      } catch {
        setNotice("Could not read inspection snapshot.");
      }
    });
    source.addEventListener("agent-event", (event) => {
      if (!isCurrent()) return;
      try {
        const e = JSON.parse(event.data) as WorkflowEvent;
        useInspection.getState().apply(e);
        if (e.type === "inspection.completed") {
          void refreshIntegration();
          useInspection.setState((current) => ({
            cameraMode: "orbit",
            focusRoom: null,
            selectedAgent: null,
            resetKey: current.resetKey + 1,
          }));
        }
      } catch {
        setNotice("Could not read agent event.");
      }
    });
    source.onerror = () => {
      if (isCurrent()) setNotice("Event connection interrupted. Reconnecting…");
    };
    source.onopen = () => {
      if (isCurrent()) setNotice("");
    };
    return () => {
      source.close();
      stream.current = null;
    };
  }, [s.inspectionId]);

  useEffect(() => {
    if (
      !cinematic ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      s.status !== "running"
    )
      return;
    const event = s.events.at(-1);
    if (event?.type === "agent.moving" && event.agentId !== "manager")
      useInspection.setState({
        selectedAgent: event.agentId,
        cameraMode: "follow",
      });
  }, [s.events, cinematic, s.status]);
  useEffect(() => {
    if (!modal || modal === "property") return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => previous?.focus();
  }, [modal]);
  const restoreDemo = () => {
    s.reset();
    setCustomProperty(null);
    useInspection.setState((current) => ({
      mode: "demo",
      resetKey: current.resetKey + 1,
    }));
  };
  const applyProperty = (property: CustomProperty) => {
    stream.current?.close();
    s.reset();
    setCustomProperty(property);
    useInspection.setState((current) => ({ resetKey: current.resetKey + 1 }));
    setModal(null);
  };
  const chooseMode = (mode: "demo" | "live") => {
    if (mode === s.mode || s.status === "running") return;
    stream.current?.close();
    s.reset();
    useInspection.setState({
      mode,
      selectedAgent: null,
      cameraMode: "orbit",
      focusRoom: null,
    });
  };
  const start = async () => {
    setStarting(true);
    setNotice("");
    try {
      if (s.mode === "demo") {
        const session = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "demo" }),
        });
        if (!session.ok)
          throw new Error("Could not initialise the demo session.");
      }
      const r = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: s.mode, speed, datasetId: DATASET_ID }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not start inspection");
      s.reset();
      useInspection.setState({
        inspectionId: data.id,
        mode: s.mode,
        status: "running",
      });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Inspection could not start");
      if (s.mode === "live") setModal("integration");
    } finally {
      setStarting(false);
    }
  };
  const selectAgent = (id: string) => {
    useInspection.setState({
      selectedAgent: id,
      selectedFinding: null,
      cameraMode: "follow",
      focusRoom: null,
    });
    setModal("agent");
  };
  const selectFinding = (id: string) => {
    const f = s.findings.find((f) => f.id === id);
    useInspection.setState({
      selectedFinding: id,
      focusRoom: f?.roomId || null,
      cameraMode: "orbit",
    });
    setModal(null);
  };
  const handoffEvent = s.events.findLast(
    (e) => e.type === "message.sent" && typeof e.payload.toAgentId === "string",
  );
  const handoff = handoffEvent
    ? {
        id: handoffEvent.id,
        from: handoffEvent.agentId,
        to: String(handoffEvent.payload.toAgentId),
      }
    : undefined;
  const referencePhotos: Evidence[] = propertyDataset.photos.map((p) => ({
    id: p.id,
    roomId: p.roomId,
    type: "photo",
    sourceName: p.title,
    content: p.description,
    synthetic: false,
    scope: "reference-context",
    capturedAt: p.capturedAt,
    photoUrl: p.localUrl,
    sourceUrl: p.sourceUrl,
    rights: p.rights,
    attribution: p.credit,
    sourceDatasetId: DATASET_ID,
  }));
  const planEvidence: Evidence = {
    id: propertyDataset.floorplan.id,
    roomId: "living",
    type: "photo",
    sourceName: "Measured floor plan",
    content: propertyDataset.dimensions.source,
    synthetic: false,
    scope: "reference-context",
    capturedAt: propertyDataset.floorplan.capturedAt,
    photoUrl: propertyDataset.floorplan.localUrl,
    sourceUrl: propertyDataset.floorplan.sourceUrl,
    rights: propertyDataset.floorplan.rights,
    attribution: propertyDataset.floorplan.credit,
    sourceDatasetId: DATASET_ID,
  };
  const sourcePhotos = referencePhotos.map(
    (p) => s.evidence.find((e) => e.id === p.id) || p,
  );
  const sourceItems = [planEvidence, ...sourcePhotos];
  const sourceItem = sourceItems.find((p) => p.id === selectedSource);
  const currentPhotoEvent = s.events.findLast(
    (e) => e.type === "photo.review.started",
  );
  const currentPhotoId = (
    currentPhotoEvent?.payload.evidenceIds as string[] | undefined
  )?.[0];
  const currentPhoto = sourcePhotos.find((e) => e.id === currentPhotoId);
  const photoAgent = agents.find((a) => a.id === currentPhotoEvent?.agentId);
  const currentObservation = s.photoObservations.findLast(
    (o) => o.evidenceId === currentPhotoId,
  );
  const openSource = (id: string | null) => {
    setSelectedSource(id);
    setModal("sources");
  };
  const selectedFinding = s.findings.find((f) => f.id === s.selectedFinding);
  const selectedAgent = agents.find((a) => a.id === s.selectedAgent);
  const agentState = s.agents.find((a) => a.id === s.selectedAgent);
  const complete = s.status === "completed";
  const running = s.status === "running";
  const progress = complete
    ? 100
    : s.workOrders.length
      ? 78
      : s.findings.length
        ? 35 + s.findings.length * 10
        : running
          ? 12
          : 0;
  const exportData = {
    id: s.inspectionId,
    mode: s.mode,
    summary: s.summary,
    score: s.score,
    findings: s.findings,
    workOrders: s.workOrders,
    events: s.events,
    propertyName: s.propertyName || propertyDataset.name,
    evidence: s.evidence,
    photoObservations: s.photoObservations,
    datasetId: s.datasetId || DATASET_ID,
  };
  const activity = s.events
    .filter(
      (e) => !["agent.status", "agent.moving", "tool.called"].includes(e.type),
    )
    .slice(-3)
    .reverse();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#property-world">
        Skip to property
      </a>
      <header className="topbar" inert={!!modal}>
        <Link className="brand" href="/" aria-label="Caretakr home">
          <span className="brand-icon">
            <House size={22} />
            <span />
          </span>
          caretakr<span className="brand-period">.</span>
        </Link>
        <div className="nav-location">
          <span>WORKSPACE</span>
          <ChevronDown size={13} />
          <i />
          Willow House <span className="property-count">01</span>
        </div>
        <div className="top-actions">
          <button
            className="import-button"
            onClick={() => setModal("property")}
            aria-label="Import property"
            title="Import floor plan and photos"
            disabled={running}
          >
            <Upload size={17} />
            <span>Import property</span>
          </button>
          <button
            className="integration-pill"
            onClick={() =>
              customProperty ? setModal("property") : setModal("integration")
            }
          >
            <span className={s.mode === "live" ? "dot live" : "dot"} />
            {customProperty
              ? "PREVIEW"
              : s.mode === "live"
                ? s.inspectionId
                  ? "LIVE"
                  : "LIVE · READY"
                : "DEMO"}
            <ChevronDown size={12} />
          </button>
          <button
            className="report-nav"
            disabled={!complete}
            onClick={() => setModal("report")}
          >
            <FileText size={15} /> Inspection report <ArrowUpRight size={14} />
          </button>
          <div className="user-avatar">AC</div>
        </div>
      </header>
      <main className="world" id="property-world" inert={!!modal}>
        <PropertyScene
          propertyId="farnsworth"
          agents={s.agents}
          handoff={customProperty ? undefined : handoff}
          customProperty={customProperty}
          findings={s.findings}
          selectedAgent={s.selectedAgent}
          focusRoom={s.focusRoom}
          cameraMode={s.cameraMode}
          resetKey={s.resetKey}
          onAgentSelect={selectAgent}
          onFindingSelect={selectFinding}
          onRoomSelect={(id) =>
            useInspection.setState({ focusRoom: id, cameraMode: "orbit" })
          }
        />
        <div className="property-heading">
          <h1>
            {customProperty?.name || s.propertyName || propertyDataset.name}
          </h1>
          {!customProperty && (
            <button
              className="property-source-button"
              onClick={() => openSource(null)}
            >
              <FileText size={12} />
              Plan &amp; photos
            </button>
          )}
        </div>
        <div className="scene-badge">
          <span className={running ? "dot live pulse" : "dot"} />
          {customProperty
            ? "UNINSPECTED"
            : running
              ? "INSPECTING"
              : complete
                ? "COMPLETE"
                : "READY"}
          <span className="scene-badge-separator" />{" "}
          {customProperty
            ? customProperty.source === "gaussian-splat"
              ? "UPLOADED SPLAT"
              : "TRACED PLAN"
            : s.mode === "demo"
              ? "SYNTHETIC INCIDENTS"
              : s.inspectionId
                ? "LIVE · SYNTHETIC INCIDENTS"
                : "AWAITING LIVE EXECUTION"}
        </div>
        <aside className="workforce">
          <div className="panel-heading">
            <span>Team</span>
          </div>
          <div className="panel-tabs">
            <button
              className={tab === "team" ? "active" : ""}
              onClick={() => setTab("team")}
            >
              Agents
            </button>
            <button
              className={tab === "findings" ? "active" : ""}
              onClick={() => setTab("findings")}
            >
              Findings <span>{s.findings.length}</span>
            </button>
          </div>
          {tab === "team" ? (
            <div className="agent-list">
              {agents.map((a) => {
                const current = s.agents.find((x) => x.id === a.id)!;
                const Icon = icons[a.id];
                return (
                  <button
                    className={`agent-card ${s.selectedAgent === a.id ? "selected" : ""}`}
                    key={a.id}
                    onClick={() => selectAgent(a.id)}
                  >
                    <div
                      className="agent-avatar"
                      style={
                        { "--agent-color": a.color } as React.CSSProperties
                      }
                    >
                      <Icon size={19} />
                      <span
                        className={
                          current.state === "Idle"
                            ? "agent-light"
                            : "agent-light active"
                        }
                      />
                    </div>
                    <div className="agent-copy">
                      <div>
                        <strong>{a.name}</strong>
                        <span>
                          {customProperty
                            ? "Preview"
                            : current.state === "Idle"
                              ? "Ready"
                              : current.state}
                        </span>
                      </div>
                      <p>{a.role}</p>
                      <small>{current.task}</small>
                    </div>
                    <ArrowUpRight className="agent-arrow" size={14} />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="finding-list">
              {s.findings.length ? (
                s.findings.map((f) => (
                  <button
                    onClick={() => selectFinding(f.id)}
                    key={f.id}
                    className="finding-mini"
                  >
                    <span className={`severity-dot ${f.severity}`} />
                    <div>
                      <strong>{f.title}</strong>
                      <p>
                        {rooms[f.roomId].name} · {f.severity} priority
                      </p>
                    </div>
                    <ArrowUpRight size={13} />
                  </button>
                ))
              ) : (
                <div className="empty-findings">
                  <ScanLine size={25} />
                  <p>No findings yet.</p>
                </div>
              )}
            </div>
          )}
          <div className="team-footer">
            <span>
              {s.mode === "demo"
                ? "Deterministic example workflow"
                : s.inspectionId
                  ? "Connected Grok Bot teammates"
                  : "Grok Bot execution selected"}
            </span>
            <button
              aria-label="Integration details"
              onClick={() => setModal("integration")}
            >
              <ArrowUpRight size={13} />
            </button>
          </div>
        </aside>
        <div className="camera-tools">
          <button
            title="Reset camera"
            aria-label="Reset camera"
            onClick={() =>
              useInspection.setState({
                resetKey: s.resetKey + 1,
                cameraMode: "orbit",
                focusRoom: null,
                selectedAgent: null,
              })
            }
          >
            <RotateCcw size={17} />
          </button>
          <button
            title="Top-down view"
            aria-label="Top-down view"
            className={s.cameraMode === "top" ? "active" : ""}
            onClick={() =>
              useInspection.setState({
                cameraMode: s.cameraMode === "top" ? "orbit" : "top",
                focusRoom: null,
              })
            }
          >
            <Layers size={18} />
          </button>
          <span />
          <button
            title="Cinematic tracking"
            aria-label="Toggle cinematic camera"
            className={cinematic ? "active" : ""}
            onClick={() => setCinematic(!cinematic)}
          >
            <Focus size={18} />
          </button>
          <button
            aria-label="Toggle fullscreen"
            title="Fullscreen"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen();
            }}
          >
            <Maximize2 size={17} />
          </button>
        </div>
        <div className="room-switcher">
          {Object.entries(rooms).map(([id, r]) => (
            <button
              className={s.focusRoom === id ? "active" : ""}
              onClick={() =>
                useInspection.setState({
                  focusRoom: s.focusRoom === id ? null : id,
                  cameraMode: "orbit",
                })
              }
              key={id}
            >
              {r.name}
            </button>
          ))}
        </div>
        <div className="activity-panel">
          <div className="activity-heading">
            <Radio size={13} />
            <span>FIELD NOTES</span>
            <span className="activity-live">
              {s.events.length ? `${s.events.length} events` : "Standing by"}
            </span>
          </div>
          {activity.length ? (
            activity.map((e) => (
              <div className="activity-line" key={e.id}>
                <span
                  style={{
                    background: agents.find((a) => a.id === e.agentId)?.color,
                  }}
                />
                <div>
                  <p>
                    <b>{agents.find((a) => a.id === e.agentId)?.name}</b>{" "}
                    {String(
                      e.payload.message ||
                        e.payload.task ||
                        e.payload.title ||
                        e.type.replaceAll(".", " "),
                    )}
                  </p>
                  <time>
                    {new Date(e.timestamp).toLocaleTimeString("en-GB")}
                  </time>
                </div>
              </div>
            ))
          ) : (
            <p className="activity-idle">No activity yet.</p>
          )}
        </div>
        {!customProperty &&
          running &&
          currentPhoto &&
          photoAgent &&
          currentPhotoEvent?.id !== dismissedPhoto && (
            <PhotoReviewCard
              evidence={currentPhoto}
              agentName={photoAgent.name}
              agentColor={photoAgent.color}
              observation={currentObservation}
              mode={s.mode}
              onClose={() => setDismissedPhoto(currentPhotoEvent?.id || null)}
              onOpen={() => openSource(currentPhoto.id)}
            />
          )}
        {complete && (
          <button
            className="completion-toast"
            onClick={() => setModal("report")}
          >
            <div className="score-mini">{s.score}</div>
            <div>
              <span>COMPLETE</span>
              <strong>Report ready</strong>
              <p>
                {s.findings.length} findings · {s.workOrders.length} work orders
                ready
              </p>
            </div>
            <ArrowUpRight size={22} />
          </button>
        )}
        {(s.error || notice) && (
          <div className="notice" role="status">
            {s.error || notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => {
                setNotice("");
                useInspection.setState({ error: null });
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="world-caption">
          <span>↖ Drag to orbit · Scroll to explore</span>
          <span>Built with care. Inspected with intelligence.</span>
        </div>
      </main>
      <footer className="control-deck" inert={!!modal}>
        <div className="inspection-status">
          <div className={`status-icon ${running ? "spinning" : ""}`}>
            {complete ? (
              <Check size={20} />
            ) : running ? (
              <ScanLine size={20} />
            ) : (
              <Sparkles size={20} />
            )}
          </div>
          <div>
            <strong>
              {customProperty
                ? "Uninspected preview"
                : complete
                  ? "Inspection complete"
                  : running
                    ? "Inspecting"
                    : "Ready to inspect"}
            </strong>
            <span>
              {complete
                ? "Report ready."
                : running
                  ? `${s.findings.length} findings recorded · ${s.workOrders.length} work orders created`
                  : "4 agents ready."}
            </span>
          </div>
        </div>
        <div className="workflow-progress" hidden={!!customProperty}>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div>
            <span className={progress > 0 ? "done" : ""}>Assign</span>
            <span className={progress >= 35 ? "done" : ""}>Investigate</span>
            <span className={progress >= 78 ? "done" : ""}>Collaborate</span>
            <span className={complete ? "done" : ""}>Report</span>
          </div>
        </div>
        <div className="start-controls">
          {!running && !customProperty && (
            <button
              className="speed-button"
              title="Demo playback speed"
              disabled={s.mode === "live"}
              onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1)}
            >
              {speed}× <ChevronDown size={12} />
            </button>
          )}
          <button
            className="start-button"
            onClick={
              customProperty
                ? restoreDemo
                : complete
                  ? () => setModal("report")
                  : start
            }
            disabled={running || starting}
          >
            {customProperty ? (
              <House size={17} />
            ) : starting ? (
              <LoaderCircle className="spinning" size={17} />
            ) : complete ? (
              <FileText size={17} />
            ) : running ? (
              <span className="button-live-dot" />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
            {customProperty
              ? "Back to demo"
              : starting
                ? "Assembling the team…"
                : complete
                  ? "View report"
                  : running
                    ? "Inspecting…"
                    : "Inspect property"}
            {!running && !starting && <ArrowRight size={17} />}
          </button>
          {complete && (
            <button
              className="replay-button"
              title="Run again"
              aria-label="Run inspection again"
              onClick={start}
            >
              <RotateCcw size={17} />
            </button>
          )}
        </div>
      </footer>
      {selectedFinding && (
        <div className="detail-card">
          <button
            className="close-button"
            aria-label="Close finding"
            onClick={() => useInspection.setState({ selectedFinding: null })}
          >
            <X size={18} />
          </button>
          <div className="eyebrow">
            {selectedFinding.id} / {rooms[selectedFinding.roomId].name}
          </div>
          <span className={`severity-label ${selectedFinding.severity}`}>
            {selectedFinding.severity} priority
          </span>
          <h2>{selectedFinding.title}</h2>
          <p>{selectedFinding.description}</p>
          {selectedFinding.category === "energy" && (
            <div className="energy-chart">
              <div>
                <span>Typical night</span>
                <i style={{ width: "25%" }} />
                <b>{energyMetrics.baseline} kWh</b>
              </div>
              <div>
                <span>Inspection night</span>
                <i style={{ width: "100%" }} />
                <b>{energyMetrics.observed} kWh</b>
              </div>
              <strong>+{energyMetrics.deviationPercent}% above baseline</strong>
            </div>
          )}
          <h3>Recommended next step</h3>
          <p>{selectedFinding.recommendedAction}</p>
          <h3>Follow the evidence</h3>
          {selectedFinding.evidenceIds.map((id) => {
            const e = s.evidence.find((x) => x.id === id);
            return (
              e && (
                <details className="evidence-item" key={id}>
                  <summary>
                    <FileText size={14} />
                    <span>
                      {e.id} · {e.sourceName}
                    </span>
                    <ChevronDown size={12} />
                  </summary>
                  <div>
                    <span className="synthetic-label">
                      SYNTHETIC {e.type.toUpperCase()}
                    </span>
                    <p>{e.content}</p>
                    <small>
                      {e.capturedAt
                        ? new Date(e.capturedAt).toLocaleString("en-GB")
                        : "Capture date not supplied"}
                    </small>
                  </div>
                </details>
              )
            );
          })}
          <div className="detail-footer">
            <ShieldCheck size={14} /> Observation requires human verification
          </div>
        </div>
      )}
      {modal === "property" && (
        <PropertyImport
          onApply={applyProperty}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal !== "property" && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "report"
                ? "Inspection report"
                : modal === "agent"
                  ? "Agent details"
                  : modal === "sources"
                    ? "Property sources"
                    : "Execution mode"
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setModal(null);
              }
              if (e.key !== "Tab") return;
              const items = Array.from(
                e.currentTarget.querySelectorAll<HTMLElement>(
                  'button:not(:disabled),input:not(:disabled),a[href],summary,[tabindex="0"]',
                ),
              ).filter((el) => el.getClientRects().length > 0);
              const first = items[0],
                last = items.at(-1);
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }}
            className={`modal ${modal === "report" ? "report-modal" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-button"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal === "sources" &&
              (sourceItem ? (
                <>
                  <button
                    className="source-back"
                    onClick={() => setSelectedSource(null)}
                  >
                    All sources
                  </button>
                  <SourceImageDetails
                    evidence={sourceItem}
                    observation={s.photoObservations.findLast(
                      (o) => o.evidenceId === sourceItem.id,
                    )}
                  />
                </>
              ) : (
                <>
                  <h2>Plan &amp; photos</h2>
                  <p className="source-attribution">
                    {propertyDataset.name}, {propertyDataset.location}. Archival
                    sources from one house. The inspection incidents are
                    synthetic.
                  </p>
                  <div className="source-gallery">
                    {sourceItems.map((item) => (
                      <button
                        key={item.id}
                        className={
                          item.id === planEvidence.id ? "source-plan" : ""
                        }
                        onClick={() => setSelectedSource(item.id)}
                      >
                        <Image
                          unoptimized
                          src={item.photoUrl!}
                          alt={item.sourceName}
                          width={350}
                          height={220}
                        />
                        <span>{item.sourceName}</span>
                      </button>
                    ))}
                  </div>
                  <p className="source-attribution">{propertyDataset.credit}</p>
                  <a
                    className="source-record-link"
                    href={propertyDataset.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Survey record <ArrowUpRight size={14} />
                  </a>
                </>
              ))}
            {modal === "integration" && (
              <>
                <div className="modal-icon">
                  <Radio size={24} />
                </div>

                <h2>Execution mode</h2>
                <p className="modal-intro">
                  Demo replays a synthetic scenario. Live sends that evidence to
                  your Grok Bot team.
                </p>
                <div className="mode-options">
                  <button
                    className={s.mode === "demo" ? "selected" : ""}
                    disabled={running}
                    onClick={() => chooseMode("demo")}
                  >
                    <Sparkles size={22} />
                    <strong>Demo</strong>
                    <p>Synthetic findings. No live model.</p>
                    {s.mode === "demo" && <Check size={16} />}
                  </button>
                  <button
                    className={s.mode === "live" ? "selected" : ""}
                    disabled={running}
                    onClick={() => chooseMode("live")}
                  >
                    <Radio size={22} />
                    <strong>Live Grok Bot</strong>
                    <p>
                      Actual bot tasks, MCP tool calls and streamed results.
                    </p>
                    {s.mode === "live" && <Check size={16} />}
                  </button>
                </div>
                <div className="connection-state">
                  <span
                    className={integration?.configured ? "dot live" : "dot"}
                  />
                  <strong>
                    {integration?.configured
                      ? "Backend configured"
                      : "Live connection needs setup"}
                  </strong>
                  <span>
                    {integration?.roundTripVerified
                      ? "Round trip verified"
                      : "Round trip not yet verified"}
                  </span>
                </div>
                {!!integration?.missing?.length && (
                  <div className="setup-note">
                    Server configuration needed:{" "}
                    {integration.missing.join(", ")}. See{" "}
                    <code>docs/grok-integration.md</code>. Run{" "}
                    <code>npm run grok:login</code> to authorise the unofficial
                    desktop SDK.
                  </div>
                )}
                {!integration?.authenticated && (
                  <div className="live-unlock">
                    <h3>Unlock Live</h3>
                    <p>
                      Open the local workspace link printed when you start the
                      app.
                    </p>
                    <code>npm run unlock:live</code>
                    <button
                      type="button"
                      onClick={() => void refreshIntegration()}
                    >
                      Refresh connection
                    </button>
                  </div>
                )}
                <p className="subtle-text">
                  Grok Bot desktop protocol SDK 0.78.1 · Unofficial integration.
                  Live never silently falls back to demo.{" "}
                  <a
                    href="https://docs.x.ai/grok-bot/overview"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official product docs ↗
                  </a>
                </p>
                <button className="primary-wide" onClick={() => setModal(null)}>
                  Back to the apartment <ArrowRight size={16} />
                </button>
              </>
            )}
            {modal === "agent" && selectedAgent && (
              <>
                <div
                  className="agent-profile-avatar"
                  style={{ color: selectedAgent.color }}
                >
                  {(() => {
                    const Icon = icons[selectedAgent.id];
                    return <Icon size={32} />;
                  })()}
                </div>

                <h2>
                  {selectedAgent.name}
                  <span className="profile-role">{selectedAgent.role}</span>
                </h2>
                <p className="modal-intro">{selectedAgent.description}</p>
                <div className="agent-current">
                  <span className="dot live" />
                  <strong>{agentState?.state}</strong>
                  <span>{agentState?.task}</span>
                </div>
                <h3>Observable activity</h3>
                <div className="agent-events">
                  {s.events
                    .filter((e) => e.agentId === selectedAgent.id)
                    .slice(-8)
                    .reverse()
                    .map((e) => (
                      <div key={e.id}>
                        <time>
                          {new Date(e.timestamp).toLocaleTimeString("en-GB")}
                        </time>
                        <span>
                          <strong>{e.type}</strong>
                          <p>
                            {String(
                              e.payload.message ||
                                e.payload.task ||
                                e.payload.tool ||
                                e.roomId ||
                                "Workflow transition recorded",
                            )}
                          </p>
                        </span>
                      </div>
                    ))}
                  {!s.events.some((e) => e.agentId === selectedAgent.id) && (
                    <p>
                      No activity yet. Start an inspection to follow their work.
                    </p>
                  )}
                </div>
                <h3>Linked outputs</h3>
                {s.findings
                  .filter((f) => f.agentId === selectedAgent.id)
                  .map((f) => (
                    <button
                      className="output-link"
                      key={f.id}
                      onClick={() => selectFinding(f.id)}
                    >
                      {f.id} · {f.title}
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                <p className="subtle-text">
                  Activity summaries describe observable workflow steps. Private
                  model reasoning is not displayed.{" "}
                  {customProperty
                    ? "This is an uninspected custom preview. Uploaded images have not been analysed by Grok Bot."
                    : s.mode === "demo"
                      ? "This is a deterministic example."
                      : "Events originate from authenticated backend tasks."}
                </p>
                <button className="primary-wide" onClick={() => setModal(null)}>
                  Follow {selectedAgent.name} in the apartment <Eye size={16} />
                </button>
              </>
            )}
            {modal === "report" && (
              <>
                <div className="report-kicker">
                  <span className="eyebrow">Farnsworth House / inspection</span>
                  <span className="synthetic-label">
                    {s.mode.toUpperCase()} · SYNTHETIC INCIDENTS
                  </span>
                </div>
                <div className="report-title">
                  <div>
                    <div className="report-check">
                      <Check size={24} />
                    </div>
                    <h2>
                      Inspection
                      <br />
                      complete.
                    </h2>
                    <p>
                      Findings and recommended actions.
                      <br />
                    </p>
                  </div>
                  <div className="health-score">
                    <svg viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="53" />
                      <circle
                        cx="60"
                        cy="60"
                        r="53"
                        strokeDasharray={`${(s.score || 0) * 3.33} 333`}
                      />
                    </svg>
                    <div>
                      <strong>{s.score}</strong>
                      <span>SCENARIO HEALTH</span>
                    </div>
                  </div>
                </div>
                <div className="report-stats">
                  <div>
                    <b>{s.findings.length.toString().padStart(2, "0")}</b>
                    <span>Findings</span>
                  </div>
                  <div>
                    <b>
                      {s.findings
                        .filter((f) =>
                          ["high", "critical"].includes(f.severity),
                        )
                        .length.toString()
                        .padStart(2, "0")}
                    </b>
                    <span>High priority</span>
                  </div>
                  <div>
                    <b>
                      {s.findings
                        .filter((f) => f.category === "energy")
                        .length.toString()
                        .padStart(2, "0")}
                    </b>
                    <span>Energy anomaly</span>
                  </div>
                  <div>
                    <b>{s.workOrders.length.toString().padStart(2, "0")}</b>
                    <span>Work orders</span>
                  </div>
                </div>
                <p className="report-summary">{s.summary}</p>
                <h3>Action plan</h3>
                <div className="report-findings">
                  {[...s.findings]
                    .sort(
                      (a, b) =>
                        ({ critical: 0, high: 1, medium: 2, low: 3 })[
                          a.severity
                        ] -
                        { critical: 0, high: 1, medium: 2, low: 3 }[b.severity],
                    )
                    .map((f) => (
                      <button key={f.id} onClick={() => selectFinding(f.id)}>
                        <span className={`severity-dot ${f.severity}`} />
                        <div>
                          <strong>{f.title}</strong>
                          <p>
                            {rooms[f.roomId].name} · {f.evidenceIds.join(", ")}{" "}
                            · {f.severity} priority
                          </p>
                        </div>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                </div>
                <details className="score-method">
                  <summary>
                    How is the score calculated?
                    <ChevronDown size={14} />
                  </summary>
                  <p>{scoringMethod}</p>
                </details>
                <div className="report-downloads">
                  <button
                    className="primary-wide"
                    onClick={() => downloadReport(exportData)}
                  >
                    <Download size={17} /> Download full report{" "}
                    <ArrowDownIcon />
                  </button>
                  <button
                    className="json-button"
                    onClick={() => downloadReport(exportData, "json")}
                  >
                    Export JSON
                  </button>
                </div>
                <p className="subtle-text">
                  Illustrative digital twin. No real address or inspection
                  records. Reports include all evidence references, work orders
                  and timestamped events.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function ArrowDownIcon() {
  return <MoveUpRight size={16} />;
}
