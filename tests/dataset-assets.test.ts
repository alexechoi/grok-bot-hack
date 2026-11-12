import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { propertyDataset, DATASET_ID } from "../lib/property-dataset";
test("same-residence reference set retains verified per-file rights and original record IDs", () => {
  assert.equal(propertyDataset.id, DATASET_ID);
  assert.equal(propertyDataset.rightsVerified, true);
  assert.equal(propertyDataset.photos.length, 5);
  for (const photo of propertyDataset.photos) {
    assert.equal(photo.license, "PD-Highsmith");
    assert.equal(photo.photographer, "Carol M. Highsmith");
    assert.match(photo.sourceUrl, /^https:\/\/www\.loc\.gov\/item\/\d+\/$/);
    assert.match(photo.rightsSourceUrl, /Farnsworth/);
    assert.match(photo.imageUrl, /^https:\/\/thumb\.wikimedia\.org\//);
  }
  assert.equal(propertyDataset.floorplan.license, "PD-US-NPS");
});
test("published asset bytes match recorded checksums and stay within the preview budget", () => {
  for (const asset of [propertyDataset.floorplan, ...propertyDataset.photos]) {
    const path = "public" + asset.localUrl;
    assert.ok(statSync(path).size < 2 * 1024 * 1024);
    assert.equal(
      createHash("sha256").update(readFileSync(path)).digest("hex"),
      asset.sha256,
    );
  }
});
test("unavailable room photos and open-plan circulation are explicit rather than fabricated", () => {
  assert.equal(propertyDataset.roomPhotoCoverage.kitchen, false);
  assert.equal(propertyDataset.roomPhotoCoverage.bathroom, false);
  assert.ok(
    !propertyDataset.photos.some(
      (p) => new Set<string>(["kitchen", "bathroom"]).has(p.roomId),
    ),
  );
  const circulation = propertyDataset.photos.find(
    (p) => p.roomId === "hallway",
  )!;
  assert.match(circulation.description, /not an enclosed hallway/);
  assert.match(
    propertyDataset.provenance,
    /not current inspection photographs/,
  );
});
