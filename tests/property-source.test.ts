import test from "node:test";
import assert from "node:assert/strict";
import {
  imageHeader,
  mutedPhotoColor,
  normaliseTrace,
  buildCustomProperty,
  releaseCustomProperty,
  type SavedPropertySource,
} from "../lib/property-source";
function source(): SavedPropertySource {
  return {
    version: 1,
    name: "Uploaded apartment",
    width: 12,
    floorplan: new Blob(["plan"]),
    floorplanName: "plan.png",
    imageWidth: 1200,
    imageHeight: 800,
    traces: [{ id: "living", x: 0, y: 0, width: 0.5, height: 0.5 }],
    photos: [],
    splat: null,
    splatName: "",
    mode: "traced-floorplan",
  };
}
function png(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}
test("image headers reject active/unknown formats and oversized dimensions before decoding", () => {
  assert.deepEqual(imageHeader(png(1200, 800)), {
    type: "image/png",
    width: 1200,
    height: 800,
  });
  assert.throws(
    () =>
      imageHeader(new TextEncoder().encode('<svg onload="alert(1)"></svg>')),
    /JPG, PNG or WebP/,
  );
  assert.throws(() => imageHeader(png(6001, 100)), /6,000/);
  assert.throws(() => imageHeader(png(6000, 6000)), /24 megapixels/);
  assert.throws(() => imageHeader(png(0, 800)), /dimensions/);
});
test("standard JPEG and WebP dimensions are parsed deterministically", () => {
  const jpg = new Uint8Array([255, 216, 255, 192, 0, 17, 8, 3, 32, 4, 176, 0]);
  assert.deepEqual(imageHeader(jpg), {
    type: "image/jpeg",
    width: 1200,
    height: 800,
  });
  const webp = new Uint8Array(30);
  webp.set(new TextEncoder().encode("RIFF"), 0);
  webp.set(new TextEncoder().encode("WEBPVP8X"), 8);
  webp[24] = 175;
  webp[25] = 4;
  webp[27] = 31;
  webp[28] = 3;
  assert.deepEqual(imageHeader(webp), {
    type: "image/webp",
    width: 1200,
    height: 800,
  });
});
test("drag traces are clamped, direction independent and reject accidental tiny gestures", () => {
  assert.deepEqual(
    normaliseTrace("kitchen", { x: 0.8, y: 0.9 }, { x: 0.2, y: 0.3 }),
    {
      id: "kitchen",
      x: 0.2,
      y: 0.3,
      width: 0.6000000000000001,
      height: 0.6000000000000001,
    },
  );
  assert.equal(
    normaliseTrace("living", { x: 0, y: 0 }, { x: 0.01, y: 0.01 }),
    null,
  );
  assert.deepEqual(
    normaliseTrace("hallway", { x: -1, y: -1 }, { x: 2, y: 2 }),
    { id: "hallway", x: 0, y: 0, width: 1, height: 1 },
  );
});
test("photo palette is deterministic, muted, and ignores transparent/extreme pixels", () => {
  const values = new Uint8ClampedArray([
    150, 90, 50, 255, 255, 255, 255, 255, 0, 0, 0, 255, 240, 0, 0, 0,
  ]);
  const first = mutedPhotoColor(values);
  assert.equal(first, mutedPhotoColor(values));
  assert.match(first, /^#[0-9a-f]{6}$/);
  assert.equal(mutedPhotoColor(new Uint8ClampedArray([0, 0, 0, 0])), "#beb9aa");
  assert.notEqual(first, "#965a32");
});
test("traced rooms scale to centre-based world coordinates and retain mapped photo palette", () => {
  const input = source();
  input.photos = [
    {
      id: "photo",
      roomId: "living",
      file: new Blob(["photo"]),
      name: "photo.png",
      color: "#aabbcc",
    },
  ];
  const property = buildCustomProperty(input);
  try {
    assert.equal(property.width, 12);
    assert.equal(property.depth, 8);
    assert.equal(property.rooms[0].x, -3);
    assert.equal(property.rooms[0].z, -2);
    assert.equal(property.rooms[0].width, 6);
    assert.equal(property.rooms[0].depth, 4);
    assert.equal(property.rooms[0].color, "#aabbcc");
    assert.match(property.rooms[0].photoUrl!, /^blob:/);
    assert.equal(property.source, "traced-floorplan");
  } finally {
    releaseCustomProperty(property);
  }
});
test("no custom preview is built without traced rooms or an actual Gaussian file", () => {
  assert.throws(
    () => buildCustomProperty({ ...source(), traces: [] }),
    /at least one room/,
  );
  assert.throws(
    () => buildCustomProperty({ ...source(), width: 0 }),
    /between 3 and 60/,
  );
  assert.throws(
    () => buildCustomProperty({ ...source(), mode: "gaussian-splat" }),
    /trained .splat/,
  );
  const property = buildCustomProperty({
    ...source(),
    mode: "gaussian-splat",
    splat: new Blob([new Uint8Array(32)]),
  });
  assert.match(property.splatUrl!, /^blob:/);
  releaseCustomProperty(property);
});
test("extreme aspect ratios and out-of-bounds or duplicate rooms cannot generate invalid geometry", () => {
  assert.throws(
    () =>
      buildCustomProperty({ ...source(), imageWidth: 1, imageHeight: 6000 }),
    /depth outside/,
  );
  assert.throws(
    () =>
      buildCustomProperty({
        ...source(),
        traces: [{ id: "living", x: 0.9, y: 0, width: 0.5, height: 0.5 }],
      }),
    /inside the floor plan/,
  );
  const duplicate = source();
  duplicate.traces.push({ ...duplicate.traces[0] });
  assert.throws(() => buildCustomProperty(duplicate), /unique/);
});
