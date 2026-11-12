export const propertyRoomIds = [
  "living",
  "kitchen",
  "bathroom",
  "bedroom",
  "hallway",
] as const;
export type PropertyRoomId = (typeof propertyRoomIds)[number];
export const propertyRoomNames: Record<PropertyRoomId, string> = {
  living: "Living room",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  bedroom: "Bedroom",
  hallway: "Hallway",
};
export const defaultRoomColors: Record<PropertyRoomId, string> = {
  living: "#b2b99e",
  kitchen: "#aab49d",
  bathroom: "#bacac5",
  bedroom: "#c5b6a5",
  hallway: "#c7bda7",
};
export type TracedRoom = {
  id: PropertyRoomId;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type PropertyPhoto = {
  id: string;
  roomId: PropertyRoomId;
  file: Blob;
  name: string;
  color: string;
};
export type SavedPropertySource = {
  version: 1;
  name: string;
  width: number;
  floorplan: Blob | null;
  floorplanName: string;
  imageWidth: number;
  imageHeight: number;
  traces: TracedRoom[];
  photos: PropertyPhoto[];
  splat: Blob | null;
  splatName: string;
  mode: "traced-floorplan" | "gaussian-splat";
};
export type CustomProperty = {
  name: string;
  width: number;
  depth: number;
  floorplanUrl: string;
  rooms: Array<{
    id: PropertyRoomId;
    name: string;
    x: number;
    z: number;
    width: number;
    depth: number;
    color: string;
    photoUrl?: string;
  }>;
  splatUrl?: string;
  source: "traced-floorplan" | "gaussian-splat";
};
export const MAX_FLOORPLAN_BYTES = 15 * 1024 * 1024,
  MAX_PHOTO_BYTES = 10 * 1024 * 1024,
  MAX_SPLAT_BYTES = 100 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 6000,
  MAX_IMAGE_PIXELS = 24_000_000;

/** Header dimensions are checked before browser bitmap allocation. No SVG or active content. */
export function imageHeader(bytes: Uint8Array): {
  type: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (a: number, b: number) =>
    String.fromCharCode(...bytes.subarray(a, b));
  let type: "image/png" | "image/jpeg" | "image/webp",
    width = 0,
    height = 0;
  if (
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    ascii(1, 4) === "PNG" &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  ) {
    type = "image/png";
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  ) {
    type = "image/jpeg";
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset++] !== 255) continue;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 0 || marker === 1 || (marker >= 208 && marker <= 215))
        continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        offset + 7 <= bytes.length
      ) {
        height = view.getUint16(offset + 3);
        width = view.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  } else if (
    bytes.length >= 30 &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 12) === "WEBP"
  ) {
    type = "image/webp";
    const chunk = ascii(12, 16);
    if (chunk === "VP8X") {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (chunk === "VP8L" && bytes[20] === 47) {
      const bits = view.getUint32(21, true);
      width = (bits & 0x3fff) + 1;
      height = ((bits >>> 14) & 0x3fff) + 1;
    } else if (
      chunk === "VP8 " &&
      bytes[23] === 157 &&
      bytes[24] === 1 &&
      bytes[25] === 42
    ) {
      width = view.getUint16(26, true) & 0x3fff;
      height = view.getUint16(28, true) & 0x3fff;
    }
  } else
    throw new Error(
      "Choose a JPG, PNG or WebP image. SVG and other file types are not supported.",
    );
  if (!width || !height)
    throw new Error(
      "Image dimensions could not be read. Export the image as a standard JPG or PNG.",
    );
  if (
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  )
    throw new Error(
      "Use an image no larger than 6,000 pixels per side and 24 megapixels.",
    );
  return { type, width, height };
}
export async function validateImage(file: File, maxBytes: number) {
  if (!file.size || file.size > maxBytes)
    throw new Error(
      `“${file.name}” must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`,
    );
  const header = imageHeader(
    new Uint8Array(await file.slice(0, 1024 * 1024).arrayBuffer()),
  );
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`“${file.name}” could not be decoded. Try another image.`);
  });
  try {
    if (
      bitmap.width > MAX_IMAGE_DIMENSION ||
      bitmap.height > MAX_IMAGE_DIMENSION ||
      bitmap.width * bitmap.height > MAX_IMAGE_PIXELS
    )
      throw new Error(
        "Use an image no larger than 6,000 pixels per side and 24 megapixels.",
      );
    return { ...header, width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
/** Deterministic muted average, deliberately labelled palette rather than geometry. */
export function mutedPhotoColor(pixels: Uint8ClampedArray): string {
  let red = 0,
    green = 0,
    blue = 0,
    count = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const luminance = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    if (luminance < 28 || luminance > 242) continue;
    red += pixels[i];
    green += pixels[i + 1];
    blue += pixels[i + 2];
    count++;
  }
  if (!count) return "#beb9aa";
  const values = [red / count, green / count, blue / count],
    grey = values.reduce((a, b) => a + b) / 3;
  return (
    "#" +
    values
      .map((v) =>
        Math.round((v * 0.48 + grey * 0.52) * 0.74 + 235 * 0.26)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export async function photoPalette(file: Blob) {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context)
      throw new Error(
        "Photo colour extraction is unavailable in this browser.",
      );
    context.drawImage(bitmap, 0, 0, 32, 32);
    return mutedPhotoColor(context.getImageData(0, 0, 32, 32).data);
  } finally {
    bitmap.close();
  }
}
export function normaliseTrace(
  id: PropertyRoomId,
  start: { x: number; y: number },
  end: { x: number; y: number },
): TracedRoom | null {
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const x = Math.min(clamp(start.x), clamp(end.x)),
    y = Math.min(clamp(start.y), clamp(end.y)),
    width = Math.abs(clamp(end.x) - clamp(start.x)),
    height = Math.abs(clamp(end.y) - clamp(start.y));
  return width < 0.025 || height < 0.025 ? null : { id, x, y, width, height };
}
export function buildCustomProperty(
  source: SavedPropertySource,
): CustomProperty {
  if (!Number.isFinite(source.width) || source.width < 3 || source.width > 60)
    throw new Error("Set a building width between 3 and 60 metres.");
  if (
    source.mode === "traced-floorplan" &&
    (!source.floorplan ||
      !source.traces.length ||
      !source.imageWidth ||
      !source.imageHeight)
  )
    throw new Error("Upload a floor plan and draw at least one room.");
  if (source.mode === "gaussian-splat" && !source.splat)
    throw new Error("Choose a trained .splat file.");
  const depth =
    source.imageWidth && source.imageHeight
      ? (source.width * source.imageHeight) / source.imageWidth
      : source.width * 0.75;
  if (!Number.isFinite(depth) || depth < 2 || depth > 100)
    throw new Error(
      "The plan proportions imply a depth outside 2–100 metres. Crop excess margins or adjust the building width.",
    );
  if (
    source.traces.length > 5 ||
    new Set(source.traces.map((room) => room.id)).size !==
      source.traces.length ||
    source.traces.some(
      (room) =>
        !propertyRoomIds.includes(room.id) ||
        ![room.x, room.y, room.width, room.height].every(Number.isFinite) ||
        room.x < 0 ||
        room.y < 0 ||
        room.width < 0.025 ||
        room.height < 0.025 ||
        room.x + room.width > 1.000001 ||
        room.y + room.height > 1.000001,
    )
  )
    throw new Error(
      "Room rectangles must be unique, inside the floor plan and large enough to preview.",
    );
  const floorplanUrl = source.floorplan
    ? URL.createObjectURL(source.floorplan)
    : "";
  return {
    name: source.name.trim() || "My property",
    width: source.width,
    depth,
    floorplanUrl,
    source: source.mode,
    ...(source.mode === "gaussian-splat"
      ? { splatUrl: URL.createObjectURL(source.splat!) }
      : {}),
    rooms: source.traces.map((trace) => {
      const photo = source.photos.find((p) => p.roomId === trace.id);
      return {
        id: trace.id,
        name: propertyRoomNames[trace.id],
        x: (trace.x + trace.width / 2 - 0.5) * source.width,
        z: (trace.y + trace.height / 2 - 0.5) * depth,
        width: trace.width * source.width,
        depth: trace.height * depth,
        color: photo?.color || defaultRoomColors[trace.id],
        ...(photo ? { photoUrl: URL.createObjectURL(photo.file) } : {}),
      };
    }),
  };
}
/** Caller owns applied URLs; release after replacing/removing the custom scene. */
export function releaseCustomProperty(property: CustomProperty | null) {
  if (!property) return;
  for (const url of [
    property.floorplanUrl,
    property.splatUrl,
    ...property.rooms.map((r) => r.photoUrl),
  ])
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}
const DB_NAME = "caretakr-property-preview",
  STORE = "sources";
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Local storage is unavailable. You can still preview this property.",
        ),
      );
  });
}
export async function savePropertySource(source: SavedPropertySource) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(source, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          new Error("Could not save locally. Browser storage may be full."),
        );
      tx.onabort = () => reject(new Error("Local save was interrupted."));
    });
  } finally {
    db.close();
  }
}
export async function loadPropertySource(): Promise<SavedPropertySource | null> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction(STORE, "readonly")
        .objectStore(STORE)
        .get("current");
      request.onsuccess = () => {
        const value = request.result;
        resolve(value?.version === 1 ? value : null);
      };
      request.onerror = () =>
        reject(new Error("Saved property could not be read."));
    });
  } finally {
    db.close();
  }
}
export async function loadStoredProperty(): Promise<CustomProperty | null> {
  const source = await loadPropertySource();
  return source ? buildCustomProperty(source) : null;
}
export async function clearStoredProperty() {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete("current");
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(new Error("Saved property could not be removed."));
    });
  } finally {
    db.close();
  }
}
