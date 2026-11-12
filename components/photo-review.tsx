"use client";
import Image from "next/image";
import { X, ArrowUpRight, ScanLine, Check, ImageOff } from "lucide-react";
import type { Evidence, PhotoObservation } from "@/lib/scenario";
export function PhotoReviewCard({
  evidence,
  agentName,
  agentColor,
  observation,
  mode,
  onClose,
  onOpen,
}: {
  evidence: Evidence;
  agentName: string;
  agentColor: string;
  observation?: PhotoObservation;
  mode: "demo" | "live";
  onClose: () => void;
  onOpen: () => void;
}) {
  return (
    <figure
      className="photo-review-card"
      aria-label={`${agentName} reviewing ${evidence.sourceName}`}
    >
      <div className="photo-review-heading">
        <span style={{ background: agentColor }} />
        <strong>{agentName}</strong>
        <span>
          {mode === "demo"
            ? "Reference image"
            : observation
              ? "Reviewed"
              : "Viewing source…"}
        </span>
        <button aria-label="Hide source image" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <button
        className="photo-review-image"
        onClick={onOpen}
        aria-label={`Open ${evidence.sourceName}`}
      >
        {/* Source image is a verified local derivative, not a generated inspection photograph. */}
        {evidence.photoUrl ? (
          <Image
            unoptimized
            src={evidence.photoUrl}
            alt={evidence.sourceName}
            width={480}
            height={300}
          />
        ) : (
          <ImageOff size={30} />
        )}
        <span>
          <ArrowUpRight size={16} />
        </span>
      </button>
      <figcaption>
        <div>
          <span>
            {observation?.access === "viewed" ? (
              <Check size={13} />
            ) : (
              <ScanLine size={13} />
            )}
          </span>
          <strong>{evidence.sourceName}</strong>
        </div>
        {observation ? (
          <p>{observation.summary}</p>
        ) : (
          <p>
            {mode === "demo"
              ? "Archival reference · synthetic scenario"
              : "Grok Bot is examining the source image."}
          </p>
        )}
        <button onClick={onOpen}>
          Source &amp; observation <ArrowUpRight size={12} />
        </button>
      </figcaption>
    </figure>
  );
}
export function SourceImageDetails({
  evidence,
  observation,
}: {
  evidence: Evidence;
  observation?: PhotoObservation;
}) {
  return (
    <>
      <h2>{evidence.sourceName}</h2>
      {evidence.photoUrl && (
        <>
          <Image
            unoptimized
            className="source-detail-image"
            src={evidence.photoUrl}
            alt={evidence.sourceName}
            width={800}
            height={500}
          />
        </>
      )}
      <p className="source-context">
        Archival reference photograph. Demo incidents are synthetic and are not
        assertions about this image.
      </p>
      {observation && (
        <>
          <h3>
            {observation.access === "viewed"
              ? "Grok Bot observation"
              : "Image unavailable"}
          </h3>
          <p>{observation.summary}</p>
          <details className="source-limitations">
            <summary>Limits &amp; provenance</summary>
            <p>{observation.limitations}</p>
            <p>
              {new Date(observation.timestamp).toLocaleString("en-GB")} ·{" "}
              {observation.provenance.provider === "grok-bot-sdk"
                ? "Actual Grok Bot review"
                : "Dataset coverage record"}
            </p>
            {observation.provenance.provider === "grok-bot-sdk" && (
              <code>Request {observation.provenance.requestId}</code>
            )}
          </details>
        </>
      )}
      <h3>Source</h3>
      <p>{evidence.content}</p>
      {evidence.capturedAt && (
        <p className="source-credit">Recorded date: {evidence.capturedAt}</p>
      )}
      <p className="source-credit">{evidence.attribution}</p>
      <p className="source-credit">{evidence.rights}</p>
      {evidence.sourceUrl && (
        <a
          className="source-record-link"
          href={evidence.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          Library of Congress record <ArrowUpRight size={14} />
        </a>
      )}
    </>
  );
}
