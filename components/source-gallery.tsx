"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ExternalLink, X } from "lucide-react";
import type { Evidence, PhotoObservation } from "@/lib/scenario";
import { propertyDatasets } from "@/lib/dataset-registry";
import "./source-gallery.css";

function safeUrl(value?: string, local = false) {
  if (!value) return undefined;
  if (
    local &&
    ((value.startsWith("/") && !value.startsWith("//")) ||
      value.startsWith("blob:"))
  )
    return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export type SourceGalleryProps = {
  items: Evidence[];
  observations: PhotoObservation[];
  initialId?: string | null;
  onClose: () => void;
};

export function SourceGallery({
  items,
  observations,
  initialId,
  onClose,
}: SourceGalleryProps) {
  const images = useMemo(
    () =>
      items.filter(
        (item) =>
          !item.photoUnavailable &&
          safeUrl(item.photoUrl || item.imageUrl, true),
      ),
    [items],
  );
  const [selectedId, setSelectedId] = useState(initialId || images[0]?.id);
  const [failedId, setFailedId] = useState<string | null>(null);
  const dialog = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const position = Math.max(
    0,
    images.findIndex((item) => item.id === selectedId),
  );
  const item = images[position];
  const dataset = propertyDatasets.find(
    (source) =>
      source.id === item?.sourceDatasetId ||
      source.photos.some((photo) => photo.sourceUrl === item?.sourceUrl) ||
      source.floorplan.sourceUrl === item?.sourceUrl,
  );
  const record =
    item &&
    dataset &&
    (dataset.photos.find((photo) => photo.sourceUrl === item.sourceUrl) ||
      (dataset.floorplan.sourceUrl === item.sourceUrl
        ? dataset.floorplan
        : undefined));
  const title = record?.title || item?.sourceName || "Property gallery";
  const photoObservations = item
    ? observations.filter((observation) => observation.evidenceId === item.id)
    : [];
  const move = (direction: number) => {
    if (images.length)
      setSelectedId(
        images[(position + direction + images.length) % images.length].id,
      );
  };

  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected && previous !== document.body) previous.focus();
    };
  }, []);
  useEffect(() => {
    const selected = strip.current?.querySelector<HTMLElement>(
      '[aria-current="true"]',
    );
    if (selected && strip.current) {
      const left = selected.offsetLeft - strip.current.offsetLeft;
      if (left < strip.current.scrollLeft) strip.current.scrollLeft = left;
      else if (
        left + selected.offsetWidth >
        strip.current.scrollLeft + strip.current.clientWidth
      )
        strip.current.scrollLeft =
          left + selected.offsetWidth - strip.current.clientWidth;
    }
  }, [selectedId]);

  return (
    <div className="ct-gallery-backdrop" onClick={onClose}>
      <section
        className="ct-gallery"
        role="dialog"
        aria-modal="true"
        aria-label="Property photo gallery"
        ref={dialog}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(event.key === "ArrowLeft" ? -1 : 1);
          }
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled),a[href],summary,[tabindex="0"]',
            ),
          ).filter((element) => element.getClientRects().length > 0);
          const first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <header className="ct-gallery-header">
          <div>
            <span className="ct-gallery-eyebrow">
              {dataset?.name || "Property gallery"}
            </span>
            <span className="ct-gallery-count" aria-live="polite">
              {images.length
                ? `${position + 1} / ${images.length}`
                : "No images"}
            </span>
          </div>
          <button
            type="button"
            className="ct-gallery-icon"
            aria-label="Close gallery"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="ct-gallery-stage">
          {item && failedId !== item.id ? (
            <Image
              key={item.id}
              src={safeUrl(item.photoUrl || item.imageUrl, true)!}
              alt={title}
              fill
              unoptimized
              sizes="92vw"
              className="ct-gallery-image"
              onError={() => setFailedId(item.id)}
            />
          ) : (
            <p className="ct-gallery-unavailable">
              {item
                ? "This image could not be loaded."
                : "No source images are available."}
            </p>
          )}
          {images.length > 1 && (
            <>
              <button
                type="button"
                className="ct-gallery-icon ct-gallery-prev"
                aria-label="Previous image"
                onClick={() => move(-1)}
              >
                <ArrowLeft size={21} />
              </button>
              <button
                type="button"
                className="ct-gallery-icon ct-gallery-next"
                aria-label="Next image"
                onClick={() => move(1)}
              >
                <ArrowRight size={21} />
              </button>
            </>
          )}
        </div>
        <div className="ct-gallery-bottom">
          <div className="ct-gallery-caption">
            <div>
              <h2>{title}</h2>
              <p>
                {record && "description" in record
                  ? record.description
                  : item?.content}
              </p>
            </div>
            {safeUrl(item?.imageUrl || item?.photoUrl, true) && (
              <a
                className="ct-gallery-original"
                href={safeUrl(item?.imageUrl || item?.photoUrl, true)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Full image <ExternalLink size={14} />
              </a>
            )}
          </div>
          {images.length > 1 && (
            <div
              ref={strip}
              className="ct-gallery-strip"
              aria-label="Choose an image"
            >
              {images.map((image, index) => (
                <button
                  type="button"
                  key={image.id}
                  aria-label={`Image ${index + 1}: ${image.sourceName}`}
                  aria-current={image.id === item?.id ? "true" : undefined}
                  onClick={() => setSelectedId(image.id)}
                >
                  <Image
                    src={safeUrl(image.photoUrl || image.imageUrl, true)!}
                    alt=""
                    fill
                    unoptimized
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}
          {item && (
            <details className="ct-gallery-details" key={item.id}>
              <summary>Source &amp; observations</summary>
              <div className="ct-gallery-detailBody">
                <p>
                  {item.attribution ||
                    (record && "credit" in record
                      ? record.credit
                      : item.sourceName)}
                </p>
                <p>
                  {item.rights || record?.rights}{" "}
                  {item.capturedAt ? `Recorded date: ${item.capturedAt}.` : ""}
                </p>
                <div className="ct-gallery-links">
                  {safeUrl(item.sourceUrl) && (
                    <a
                      href={safeUrl(item.sourceUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Archive record <ExternalLink size={13} />
                    </a>
                  )}
                  {record && (
                    <a
                      href={safeUrl(record.rightsSourceUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Rights record <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                {photoObservations.length ? (
                  photoObservations.map((observation) => (
                    <article key={observation.id}>
                      <h3>
                        {observation.agentId === "inspector"
                          ? "Inspector"
                          : "Energy Analyst"}{" "}
                        ·{" "}
                        {observation.access === "viewed"
                          ? "Photo review"
                          : "Image unavailable"}
                      </h3>
                      <p>{observation.summary}</p>
                      <p className="ct-gallery-limitations">
                        {observation.limitations}
                      </p>
                      <small>
                        {new Date(observation.timestamp).toLocaleString()} ·{" "}
                        {observation.provenance.provider === "grok-bot-sdk"
                          ? `Grok Bot · ${observation.provenance.botId} · Request ${observation.provenance.requestId}`
                          : "Dataset availability record"}
                      </small>
                      {observation.provenance.provider === "grok-bot-sdk" && (
                        <p className="ct-gallery-limitations">
                          {observation.provenance.sourceDigestVerified
                            ? "Source image checksum verified."
                            : "Visual review reported by the bot; source checksum unverified."}{" "}
                          {!observation.provenance.toolActivityObserved &&
                            "Browser-tool activity was not observed."}
                        </p>
                      )}
                      {observation.imageSha256 && (
                        <small>
                          SHA-256 {observation.imageSha256}
                          {observation.width && observation.height
                            ? ` · ${observation.width} × ${observation.height}px`
                            : ""}
                        </small>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="ct-gallery-limitations">
                    No agent photo review recorded.
                  </p>
                )}
                <small>Evidence {item.id}</small>
              </div>
            </details>
          )}
          <p className="ct-gallery-footnote">
            Reference images. Synthetic inspection incidents are separate.
          </p>
        </div>
      </section>
    </div>
  );
}
export default SourceGallery;
