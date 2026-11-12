"use client";
/* eslint-disable @next/next/no-img-element -- Images are validated browser-local Blob URLs, not remotely optimisable assets. */
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Layers,
  LoaderCircle,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  buildCustomProperty,
  defaultRoomColors,
  loadPropertySource,
  MAX_FLOORPLAN_BYTES,
  MAX_PHOTO_BYTES,
  MAX_SPLAT_BYTES,
  normaliseTrace,
  releaseCustomProperty,
  photoPalette,
  propertyRoomIds,
  propertyRoomNames,
  savePropertySource,
  validateImage,
  type CustomProperty,
  type PropertyRoomId,
  type SavedPropertySource,
  type TracedRoom,
  type PropertyPhoto,
} from "@/lib/property-source";
import "./property-import.css";
const styles = {
  addPhoto: "ct-import-addPhoto",
  applyButton: "ct-import-applyButton",
  backdrop: "ct-import-backdrop",
  body: "ct-import-body",
  error: "ct-import-error",
  footer: "ct-import-footer",
  header: "ct-import-header",
  help: "ct-import-help",
  iconButton: "ct-import-iconButton",
  modeSwitch: "ct-import-modeSwitch",
  optional: "ct-import-optional",
  panel: "ct-import-panel",
  photo: "ct-import-photo",
  photoTools: "ct-import-photoTools",
  photos: "ct-import-photos",
  plan: "ct-import-plan",
  planFooter: "ct-import-planFooter",
  positionControls: "ct-import-positionControls",
  removePhoto: "ct-import-removePhoto",
  roomChoices: "ct-import-roomChoices",
  savedNote: "ct-import-savedNote",
  sectionHeading: "ct-import-sectionHeading",
  selectedTrace: "ct-import-selectedTrace",
  splatContent: "ct-import-splatContent",
  textButton: "ct-import-textButton",
  topFields: "ct-import-topFields",
  trace: "ct-import-trace",
  unitInput: "ct-import-unitInput",
  uploadZone: "ct-import-uploadZone",
};

const emptySource = (): SavedPropertySource => ({
  version: 1,
  name: "My property",
  width: 12,
  floorplan: null,
  floorplanName: "",
  imageWidth: 0,
  imageHeight: 0,
  traces: [],
  photos: [],
  splat: null,
  splatName: "",
  mode: "traced-floorplan",
});
type PreviewUrls = { floorplan: string; photos: Record<string, string> };
export default function PropertyImport({
  onApply,
  onClose,
}: {
  onApply: (property: CustomProperty) => void;
  onClose: () => void;
}) {
  const [source, setSource] = useState(emptySource),
    [urls, setUrls] = useState<PreviewUrls>({ floorplan: "", photos: {} }),
    [selectedRoom, setSelectedRoom] = useState<PropertyRoomId>("living"),
    [photoRoom, setPhotoRoom] = useState<PropertyRoomId>("living"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [restored, setRestored] = useState(false),
    [drag, setDrag] = useState<{
      start: { x: number; y: number };
      end: { x: number; y: number };
    } | null>(null);
  const ownedUrls = useRef(new Set<string>()),
    dialog = useRef<HTMLElement>(null),
    plan = useRef<HTMLDivElement>(null),
    uploadLock = useRef(false);
  const makeUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    ownedUrls.current.add(url);
    return url;
  };
  useEffect(() => {
    const owned = ownedUrls.current;
    return () => {
      for (const url of owned) URL.revokeObjectURL(url);
      owned.clear();
    };
  }, []);
  useEffect(() => {
    let active = true;
    loadPropertySource()
      .then((saved) => {
        if (!active || !saved) return;
        const previews: PreviewUrls = {
          floorplan: saved.floorplan
            ? URL.createObjectURL(saved.floorplan)
            : "",
          photos: {},
        };
        if (previews.floorplan) ownedUrls.current.add(previews.floorplan);
        for (const photo of saved.photos) {
          previews.photos[photo.id] = URL.createObjectURL(photo.file);
          ownedUrls.current.add(previews.photos[photo.id]);
        }
        setSource(saved);
        setUrls(previews);
        setRestored(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = dialog.current;
    node?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploadLock.current) {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !node) return;
      const targets = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length);
      if (!targets.length) {
        event.preventDefault();
        return;
      }
      const first = targets[0],
        last = targets.at(-1)!;
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === node)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  const revokeUrl = (url: string | undefined) => {
    if (url) {
      URL.revokeObjectURL(url);
      ownedUrls.current.delete(url);
    }
  };
  const floorplanUpload = async (file: File | undefined) => {
    if (!file || uploadLock.current) return;
    uploadLock.current = true;
    setBusy(true);
    setError("");
    try {
      const dimensions = await validateImage(file, MAX_FLOORPLAN_BYTES);
      const url = makeUrl(file);
      revokeUrl(urls.floorplan);
      setUrls((current) => ({ ...current, floorplan: url }));
      setSource((current) => ({
        ...current,
        floorplan: file,
        floorplanName: file.name,
        imageWidth: dimensions.width,
        imageHeight: dimensions.height,
        traces: [],
        mode: "traced-floorplan",
      }));
      setRestored(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      uploadLock.current = false;
      setBusy(false);
    }
  };
  const photoUpload = async (files: FileList | null) => {
    if (!files?.length || uploadLock.current) return;
    const selected = Array.from(files);
    if (selected.length + source.photos.length > 8) {
      setError("Use up to 8 room photos. Remove a photo before adding more.");
      return;
    }
    uploadLock.current = true;
    setBusy(true);
    setError("");
    try {
      const additions: PropertyPhoto[] = [];
      for (const file of selected) {
        await validateImage(file, MAX_PHOTO_BYTES);
        const color = await photoPalette(file);
        additions.push({
          id: crypto.randomUUID(),
          roomId: photoRoom,
          file,
          name: file.name,
          color,
        });
      }
      const previews: Record<string, string> = {};
      for (const photo of additions) previews[photo.id] = makeUrl(photo.file);
      setUrls((current) => ({
        ...current,
        photos: { ...current.photos, ...previews },
      }));
      setSource((current) => ({
        ...current,
        photos: [...current.photos, ...additions],
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      uploadLock.current = false;
      setBusy(false);
    }
  };
  const splatUpload = async (file: File | undefined) => {
    if (!file || uploadLock.current) return;
    setError("");
    if (
      !file.name.toLowerCase().endsWith(".splat") ||
      !file.size ||
      file.size > MAX_SPLAT_BYTES
    ) {
      setError("Choose a trained .splat file smaller than 100 MB.");
      return;
    }
    if (file.size % 32 !== 0) {
      setError(
        "This file is not a standard 32-byte-per-point .splat. Export a compatible trained splat.",
      );
      return;
    }
    setSource((current) => ({
      ...current,
      splat: file,
      splatName: file.name,
      mode: "gaussian-splat",
    }));
  };
  const point = (event: React.PointerEvent) => {
    const rect = plan.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };
  const saveTrace = (trace: TracedRoom) =>
    setSource((current) => ({
      ...current,
      traces: [...current.traces.filter((room) => room.id !== trace.id), trace],
    }));
  const selectedTrace = source.traces.find((room) => room.id === selectedRoom),
    draft = drag ? normaliseTrace(selectedRoom, drag.start, drag.end) : null;
  const updateTrace = (
    key: "x" | "y" | "width" | "height",
    percent: number,
  ) => {
    if (!selectedTrace || !Number.isFinite(percent)) return;
    const changed = {
      ...selectedTrace,
      [key]: Math.max(0, Math.min(1, percent / 100)),
    };
    changed.width = Math.max(0.025, Math.min(changed.width, 1 - changed.x));
    changed.height = Math.max(0.025, Math.min(changed.height, 1 - changed.y));
    changed.x = Math.min(changed.x, 1 - changed.width);
    changed.y = Math.min(changed.y, 1 - changed.height);
    saveTrace(changed);
  };
  const apply = async () => {
    if (uploadLock.current) return;
    setSaving(true);
    setError("");
    try {
      const property = buildCustomProperty(source);
      try {
        await savePropertySource(source);
      } catch (e) {
        releaseCustomProperty(property);
        throw e;
      }
      onApply(property);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const depth = source.imageWidth
    ? (source.width * source.imageHeight) / source.imageWidth
    : source.width * 0.75;
  return (
    <div className={styles.backdrop}>
      <section
        ref={dialog}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-import-title"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <h2 id="property-import-title">Import property</h2>
            <p>Preview your floor plan and room photo colours.</p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onClose}
            aria-label="Close property import"
          >
            <X size={20} />
          </button>
        </header>
        <div className={styles.body}>
          <div className={styles.topFields}>
            <label>
              Property name
              <input
                value={source.name}
                maxLength={80}
                onChange={(event) =>
                  setSource((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Building width
              <span className={styles.unitInput}>
                <input
                  type="number"
                  min={3}
                  max={60}
                  step={0.5}
                  value={source.width}
                  onChange={(event) =>
                    setSource((current) => ({
                      ...current,
                      width:
                        event.target.value === ""
                          ? 0
                          : Number(event.target.value),
                    }))
                  }
                />
                <span>m</span>
              </span>
            </label>
          </div>
          <div
            className={styles.modeSwitch}
            role="group"
            aria-label="Property source"
          >
            <button
              type="button"
              aria-pressed={source.mode === "traced-floorplan"}
              onClick={() =>
                setSource((current) => ({
                  ...current,
                  mode: "traced-floorplan",
                }))
              }
            >
              <Layers size={15} />
              Floor plan & photos
            </button>
            <button
              type="button"
              aria-pressed={source.mode === "gaussian-splat"}
              onClick={() =>
                setSource((current) => ({ ...current, mode: "gaussian-splat" }))
              }
            >
              Trained Gaussian splat
            </button>
          </div>
          {source.mode === "traced-floorplan" ? (
            <>
              {!source.floorplan ? (
                <label className={styles.uploadZone}>
                  <Upload size={25} />
                  <strong>Add a floor plan</strong>
                  <span>JPG, PNG or WebP · up to 15 MB</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy}
                    onChange={(event) => {
                      void floorplanUpload(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              ) : (
                <>
                  <div className={styles.sectionHeading}>
                    <div>
                      <h3>Draw rooms</h3>
                      <p>Select a room, then drag a rectangle on the plan.</p>
                    </div>
                    <label className={styles.textButton}>
                      Replace plan
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={busy}
                        onChange={(event) => {
                          void floorplanUpload(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <div
                    className={styles.roomChoices}
                    role="group"
                    aria-label="Room to draw"
                  >
                    {propertyRoomIds.map((id) => (
                      <button
                        type="button"
                        key={id}
                        aria-pressed={selectedRoom === id}
                        onClick={() => setSelectedRoom(id)}
                      >
                        <span style={{ background: defaultRoomColors[id] }} />
                        {propertyRoomNames[id]}
                        {source.traces.some((room) => room.id === id) && (
                          <Check size={12} />
                        )}
                      </button>
                    ))}
                  </div>
                  <div
                    ref={plan}
                    className={styles.plan}
                    style={{
                      aspectRatio: `${source.imageWidth}/${source.imageHeight}`,
                    }}
                    onPointerDown={(event) => {
                      if (busy || !event.isPrimary || event.button !== 0)
                        return;
                      event.preventDefault();
                      event.currentTarget.setPointerCapture(event.pointerId);
                      const start = point(event);
                      setDrag({ start, end: start });
                    }}
                    onPointerMove={(event) => {
                      if (drag && event.isPrimary)
                        setDrag((current) =>
                          current ? { ...current, end: point(event) } : null,
                        );
                    }}
                    onPointerUp={(event) => {
                      if (!drag || !event.isPrimary) return;
                      const trace = normaliseTrace(
                        selectedRoom,
                        drag.start,
                        point(event),
                      );
                      if (trace) {
                        saveTrace(trace);
                        setError("");
                      } else
                        setError(
                          "Draw a slightly larger rectangle, or use the room position controls.",
                        );
                      setDrag(null);
                    }}
                    onPointerCancel={() => setDrag(null)}
                    aria-label="Floor plan tracing area. Select a room and drag to draw; keyboard users can add a rectangle with the controls below."
                  >
                    {/* Local decoded object URL, no remote image request. */}
                    <img
                      src={urls.floorplan}
                      alt={`Floor plan for ${source.name || "your property"}`}
                      draggable={false}
                    />
                    {[
                      ...source.traces.filter(
                        (room) => !draft || room.id !== selectedRoom,
                      ),
                      ...(draft ? [draft] : []),
                    ].map((room) => (
                      <div
                        key={room.id}
                        className={`${styles.trace} ${room.id === selectedRoom ? styles.selectedTrace : ""}`}
                        style={{
                          left: `${room.x * 100}%`,
                          top: `${room.y * 100}%`,
                          width: `${room.width * 100}%`,
                          height: `${room.height * 100}%`,
                          backgroundColor: `${defaultRoomColors[room.id]}66`,
                        }}
                      >
                        <span>{propertyRoomNames[room.id]}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.planFooter}>
                    <span>
                      {source.traces.length} of 5 rooms ·{" "}
                      {Number.isFinite(depth) ? depth.toFixed(1) : "—"} m depth
                      from plan ratio
                    </span>
                    {selectedTrace ? (
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() =>
                          setSource((current) => ({
                            ...current,
                            traces: current.traces.filter(
                              (room) => room.id !== selectedRoom,
                            ),
                          }))
                        }
                      >
                        <Trash2 size={13} />
                        Delete {propertyRoomNames[selectedRoom].toLowerCase()}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() =>
                          saveTrace({
                            id: selectedRoom,
                            x: 0.3,
                            y: 0.3,
                            width: 0.3,
                            height: 0.3,
                          })
                        }
                      >
                        <Plus size={13} />
                        Add rectangle
                      </button>
                    )}
                  </div>
                  {selectedTrace && (
                    <details className={styles.positionControls}>
                      <summary>Room position controls</summary>
                      <div>
                        {(["x", "y", "width", "height"] as const).map((key) => (
                          <label key={key}>
                            {
                              {
                                x: "Left",
                                y: "Top",
                                width: "Width",
                                height: "Height",
                              }[key]
                            }{" "}
                            %
                            <input
                              aria-label={`${propertyRoomNames[selectedRoom]} ${key} percent`}
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={Math.round(selectedTrace[key] * 100)}
                              onChange={(event) =>
                                updateTrace(key, Number(event.target.value))
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
              <div className={styles.sectionHeading}>
                <div>
                  <h3>
                    Room photos{" "}
                    <span className={styles.optional}>optional</span>
                  </h3>
                  <p>
                    Up to 8 photos, 10 MB each. Assign each photo to a room.
                  </p>
                </div>
                <div className={styles.photoTools}>
                  <select
                    aria-label="Room for new photos"
                    value={photoRoom}
                    onChange={(event) =>
                      setPhotoRoom(event.target.value as PropertyRoomId)
                    }
                  >
                    {propertyRoomIds.map((id) => (
                      <option key={id} value={id}>
                        {propertyRoomNames[id]}
                      </option>
                    ))}
                  </select>
                  <label className={styles.addPhoto}>
                    <ImagePlus size={16} />
                    <span>Add photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy || source.photos.length >= 8}
                      onChange={(event) => {
                        void photoUpload(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              {!!source.photos.length && (
                <div className={styles.photos}>
                  {source.photos.map((photo) => (
                    <div className={styles.photo} key={photo.id}>
                      <img
                        src={urls.photos[photo.id]}
                        alt={`${propertyRoomNames[photo.roomId]} uploaded reference`}
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${photo.name}`}
                        className={styles.removePhoto}
                        onClick={() => {
                          revokeUrl(urls.photos[photo.id]);
                          setUrls((current) => {
                            const photos = { ...current.photos };
                            delete photos[photo.id];
                            return { ...current, photos };
                          });
                          setSource((current) => ({
                            ...current,
                            photos: current.photos.filter(
                              (item) => item.id !== photo.id,
                            ),
                          }));
                        }}
                      >
                        <X size={12} />
                      </button>
                      <select
                        aria-label={`Room for ${photo.name}`}
                        value={photo.roomId}
                        onChange={(event) =>
                          setSource((current) => ({
                            ...current,
                            photos: current.photos.map((item) =>
                              item.id === photo.id
                                ? {
                                    ...item,
                                    roomId: event.target
                                      .value as PropertyRoomId,
                                  }
                                : item,
                            ),
                          }))
                        }
                      >
                        {propertyRoomIds.map((id) => (
                          <option key={id} value={id}>
                            {propertyRoomNames[id]}
                          </option>
                        ))}
                      </select>
                      <small>
                        <i style={{ background: photo.color }} />
                        Photo palette
                      </small>
                    </div>
                  ))}
                </div>
              )}
              <p className={styles.help}>
                Photos add a colour palette. Gaussian reconstruction needs
                overlapping captures and a trained .splat file.
              </p>
            </>
          ) : (
            <div className={styles.splatContent}>
              <label className={styles.uploadZone}>
                <Upload size={25} />
                <strong>
                  {source.splatName || "Add a trained .splat file"}
                </strong>
                <span>Standard .splat format · up to 100 MB</span>
                <input
                  type="file"
                  accept=".splat"
                  onChange={(event) => {
                    void splatUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              <p>
                This displays an existing trained Gaussian scene. Uploading a
                floor plan or a few photos does not train a Gaussian splat. The
                preview has no inspection findings.
              </p>
            </div>
          )}
          {restored && (
            <p className={styles.savedNote}>
              <Check size={13} />
              Restored from this browser.
            </p>
          )}
          {busy && (
            <p className={styles.savedNote} role="status">
              <LoaderCircle size={14} />
              Checking your images…
            </p>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className={styles.footer}>
          <p>
            Stored in this browser. Nothing is uploaded.
            <br />
            <span>Preview only · not an inspected property</span>
          </p>
          <button
            type="button"
            className={styles.applyButton}
            disabled={
              busy ||
              saving ||
              (source.mode === "traced-floorplan"
                ? !source.floorplan || !source.traces.length
                : !source.splat)
            }
            onClick={() => void apply()}
          >
            {saving ? <LoaderCircle size={16} /> : null}
            {saving ? "Saving…" : "Build preview"}
          </button>
        </footer>
      </section>
    </div>
  );
}
