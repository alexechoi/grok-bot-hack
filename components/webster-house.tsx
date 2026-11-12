"use client";
/** Main-floor topology traced from OpenHouse3D listing floorplan photo 31.
 * Original procedural furnishing patterns adapted from houses/webster/plan.py.
 * MIT Copyright(c)2026 Yunfan Ye and contributors; licence retained in
 * public/THIRD_PARTY_LICENSES.md. Photo references are not bundled here.
 * Furnishings are illustrative staging; source photos show an empty house.
 */
import { createContext, memo, useContext, useEffect, useMemo } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  CanvasTexture,
  CatmullRomCurve3,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  Shape,
  ShapeGeometry,
} from "three";
import plan from "./webster-plan.json";
import {
  tracePoint,
  traceRooms,
  traceWalls,
  traceOpenings,
  type TraceWall,
  type TraceOpening,
  type Pixel,
} from "./webster-trace";
import type { PropertyZoneMap } from "./farnsworth-house";
type P = [number, number, number];
export const websterZones: PropertyZoneMap = {
  living: { name: "Living room", point: tracePoint(165, 840) },
  kitchen: { name: "Kitchen", point: tracePoint(306, 690) },
  bedroom: { name: "Main-floor bedroom", point: tracePoint(182, 688) },
  bathroom: { name: "Main-floor bathroom", point: tracePoint(183, 604) },
  hallway: { name: "Entry & circulation", point: tracePoint(244, 850) },
};
export const websterOffice: P = tracePoint(296, 820);
export const websterOverview = {
  width: 12.1,
  depth: 19.3,
  centre: [0, 0, 0] as P,
};
export function websterRoute(from: string, to: string): P[] {
  const entry = tracePoint(244, 850),
    dining = tracePoint(332, 820),
    kd = tracePoint(308, 748),
    aisle = tracePoint(308, 690),
    spine = tracePoint(280, 620);
  const exits: Record<string, P[]> = {
    living: [tracePoint(221, 850), entry],
    hallway: [entry],
    kitchen: [aisle, kd, dining, tracePoint(279, 850), entry],
    bedroom: [
      tracePoint(221, 644),
      tracePoint(236, 644),
      tracePoint(236, 615),
      spine,
      aisle,
      kd,
      dining,
      tracePoint(279, 850),
      entry,
    ],
    bathroom: [
      tracePoint(221, 615),
      tracePoint(236, 615),
      spine,
      aisle,
      kd,
      dining,
      tracePoint(279, 850),
      entry,
    ],
  };
  return [
    ...(exits[from] ?? [entry]),
    ...(exits[to] ?? [entry]).slice().reverse(),
  ].filter(
    (p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[2] !== a[i - 1][2],
  );
}
const palettes = {
  paint: "#d5d0c4",
  trim: "#f4edde",
  oak: "#c69a65",
  dark: "#75583d",
  blue: "#8b9fae",
};
const Materials = createContext<{
  wood: CanvasTexture | null;
  fabric: CanvasTexture | null;
}>({ wood: null, fabric: null });
function texture(kind: "wood" | "fabric") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const image = ctx.createImageData(256, 512);
  let seed = 37;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4,
        n =
          kind === "wood"
            ? Math.sin(x * 0.18 + Math.sin(y * 0.012) * 0.6) * 3 +
              Math.sin(x * 1.7 + y * 0.003) * 1.5 +
              rand() * 4
            : rand() * 24;
      image.data[i] = 238 + n;
      image.data[i + 1] = kind === "wood" ? 224 + n : 235 + n;
      image.data[i + 2] = kind === "wood" ? 201 + n : 230 + n;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
function B({
  p,
  s,
  c = palettes.paint,
  wood = false,
  metal = false,
  r = 0,
  opacity = 1,
}: {
  p: P;
  s: P;
  c?: string;
  wood?: boolean;
  metal?: boolean;
  r?: number;
  opacity?: number;
}) {
  const mats = useContext(Materials);
  return (
    <mesh
      position={p}
      rotation={[0, r, 0]}
      castShadow={opacity === 1}
      receiveShadow
    >
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        map={wood ? mats.wood : undefined}
        roughness={metal ? 0.24 : 0.78}
        metalness={metal ? 0.6 : 0}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity === 1}
      />
    </mesh>
  );
}
function S({
  p,
  s,
  c = palettes.trim,
  r = 0,
  radius = 0.07,
}: {
  p: P;
  s: P;
  c?: string;
  r?: number;
  radius?: number;
}) {
  const mats = useContext(Materials);
  return (
    <RoundedBox
      position={p}
      rotation={[0, r, 0]}
      args={s}
      radius={radius}
      smoothness={2}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={c} map={mats.fabric} roughness={0.82} />
    </RoundedBox>
  );
}
function C({
  p,
  rad = 0.15,
  h = 0.25,
  c = palettes.trim,
}: {
  p: P;
  rad?: number;
  h?: number;
  c?: string;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[rad, rad, h, 24]} />
      <meshStandardMaterial color={c} roughness={0.7} />
    </mesh>
  );
}
function Plant({ p, scale = 1 }: { p: P; scale?: number }) {
  return (
    <group position={p} scale={scale}>
      <C p={[0, 0.2, 0]} rad={0.19} h={0.4} c="#b28365" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <group key={i} rotation={[0, i * 2.4, 0]}>
          <mesh
            position={[0.16, 0.65 + i * 0.06, 0]}
            rotation={[0, 0, -0.5]}
            scale={[0.13, 0.36, 0.07]}
            castShadow
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={i % 2 ? "#849675" : "#627d68"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function Books({ p }: { p: P }) {
  return (
    <group position={p}>
      {["#bd9871", "#738b99", "#d3bd91", "#846654"].map((c, i) => (
        <B
          key={i}
          p={[i * 0.13, 0.15, 0]}
          s={[0.1, 0.3 + (i % 2) * 0.07, 0.23]}
          c={c}
        />
      ))}
    </group>
  );
}
function Lamp({ p }: { p: P }) {
  return (
    <group position={p}>
      <C p={[0, 0.05, 0]} rad={0.15} h={0.1} c="#b99c6b" />
      <C p={[0, 0.23, 0]} rad={0.03} h={0.36} c="#b99c6b" />
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.24, 0.3, 24]} />
        <meshStandardMaterial
          color="#f0dcb8"
          emissive="#d9ad6c"
          emissiveIntensity={0.1}
        />
      </mesh>
      <pointLight
        position={[0, 0.4, 0]}
        color="#ffddaa"
        intensity={0.7}
        distance={2.8}
      />
    </group>
  );
}
type Wall = TraceWall;
type Opening = TraceOpening;
function matching(w: Wall, o: Opening) {
  return (
    w.along === o.along &&
    o.b >= w.b0 - 0.001 &&
    o.b <= w.b1 + 0.001 &&
    o.a0 < w.a1 &&
    o.a1 > w.a0 &&
    o.z0 < w.z1
  );
}
function wallHeight(w: Wall) {
  if (w.kind === "int") return 1.25;
  if (w.along === "X" && w.b0 < 2.1) return 0.65;
  if (w.along === "Y" && w.b0 > 3) return 1.1;
  return 2.6;
}
function WallParts({ wall: w }: { wall: Wall }) {
  const h = w.cutHeight ?? wallHeight(w),
    holes = traceOpenings.filter((o) => matching(w, o)),
    cuts = [
      w.a0,
      w.a1,
      ...holes.flatMap((o) => [Math.max(w.a0, o.a0), Math.min(w.a1, o.a1)]),
    ].sort((a, b) => a - b),
    segments: { a: number; b: number; lo: number; hi: number }[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i],
      b = cuts[i + 1];
    if (b - a < 0.005) continue;
    const active = holes
      .filter((o) => (a + b) / 2 > o.a0 && (a + b) / 2 < o.a1)
      .sort((a, b) => a.z0 - b.z0);
    let z = 0;
    for (const hole of active) {
      if (hole.z0 > z) segments.push({ a, b, lo: z, hi: Math.min(h, hole.z0) });
      z = Math.max(z, hole.z1);
    }
    if (z < h) segments.push({ a, b, lo: z, hi: h });
  }
  return (
    <group>
      {segments
        .filter((s) => s.hi - s.lo > 0.01)
        .map((s, i) => {
          const a = (s.a + s.b) / 2,
            b = (w.b0 + w.b1) / 2;
          return (
            <group key={i}>
              <B
                p={
                  w.along === "X"
                    ? [a, (s.lo + s.hi) / 2, 9 - b]
                    : [b, (s.lo + s.hi) / 2, 9 - a]
                }
                s={
                  w.along === "X"
                    ? [s.b - s.a, s.hi - s.lo, w.b1 - w.b0]
                    : [w.b1 - w.b0, s.hi - s.lo, s.b - s.a]
                }
                c={palettes.paint}
              />
              {s.lo === 0 && (
                <B
                  p={w.along === "X" ? [a, 0.07, 9 - b] : [b, 0.07, 9 - a]}
                  s={
                    w.along === "X"
                      ? [s.b - s.a, 0.14, w.b1 - w.b0 + 0.035]
                      : [w.b1 - w.b0 + 0.035, 0.14, s.b - s.a]
                  }
                  c={palettes.trim}
                />
              )}
            </group>
          );
        })}
      {segments
        .filter((s) => s.hi === h)
        .map((s, i) => (
          <B
            key={`cap${i}`}
            p={
              w.along === "X"
                ? [(s.a + s.b) / 2, h + 0.02, 9 - (w.b0 + w.b1) / 2]
                : [(w.b0 + w.b1) / 2, h + 0.02, 9 - (s.a + s.b) / 2]
            }
            s={
              w.along === "X"
                ? [s.b - s.a, 0.065, w.b1 - w.b0 + 0.045]
                : [w.b1 - w.b0 + 0.045, 0.065, s.b - s.a]
            }
            c={palettes.trim}
          />
        ))}
    </group>
  );
}
function Window({ o }: { o: Opening }) {
  const w = o.a1 - o.a0,
    h = o.z1 - o.z0,
    along = o.along === "X",
    p: P = along
      ? [(o.a0 + o.a1) / 2, (o.z0 + o.z1) / 2, 9 - o.b]
      : [o.b, (o.z0 + o.z1) / 2, 9 - (o.a0 + o.a1) / 2];
  return (
    <group position={p} rotation={[0, along ? 0 : Math.PI / 2, 0]}>
      <B p={[0, 0, 0]} s={[w + 0.1, h + 0.1, 0.11]} c={palettes.trim} />
      <B
        p={[0, 0, 0.065]}
        s={[w - 0.06, h - 0.06, 0.025]}
        c="#b9d1d8"
        opacity={0.65}
      />
      <B p={[0, -h / 2, 0.12]} s={[w + 0.22, 0.08, 0.24]} c={palettes.trim} />
      <B p={[0, 0, 0.1]} s={[w, 0.035, 0.035]} c={palettes.trim} />
      {[-1, 1].map((x) => (
        <B
          key={x}
          p={[(x * w) / 6, h * 0.24, 0.105]}
          s={[0.025, h * 0.46, 0.035]}
          c={palettes.trim}
        />
      ))}
    </group>
  );
}
function Arch({ o }: { o: Opening }) {
  const w = o.a1 - o.a0,
    spring = 1.6,
    p: P =
      o.along === "X"
        ? [(o.a0 + o.a1) / 2, 0, 9 - o.b]
        : [o.b, 0, 9 - (o.a0 + o.a1) / 2],
    curve = useMemo(
      () =>
        new CatmullRomCurve3(
          Array.from({ length: 21 }, (_, i) => {
            const a = Math.PI - (i * Math.PI) / 20;
            return {
              x: (Math.cos(a) * w) / 2,
              y: spring + Math.sin(a) * (o.z1 - spring),
              z: 0,
            };
          }).map((p) => new Vector3(p.x, p.y, p.z)),
        ),
      [w, o.z1, spring],
    );
  return (
    <group position={p} rotation={[0, o.along === "X" ? 0 : Math.PI / 2, 0]}>
      {[-1, 1].map((x) => (
        <B
          key={x}
          p={[(x * w) / 2, spring / 2, 0]}
          s={[0.085, spring, 0.16]}
          c={palettes.trim}
        />
      ))}
      <mesh castShadow>
        <tubeGeometry args={[curve, 24, 0.052, 8, false]} />
        <meshStandardMaterial color={palettes.trim} />
      </mesh>
    </group>
  );
}
function StagedLiving() {
  return (
    <group>
      <S
        p={[-2.9, 0.035, 6.3]}
        s={[3.15, 0.035, 3.6]}
        c="#9aabb3"
        radius={0.015}
      />
      <S p={[-2.9, 0.39, 4.15]} s={[2.45, 0.56, 1.0]} c="#91a7b6" />
      <S p={[-2.9, 0.85, 3.78]} s={[2.45, 0.75, 0.2]} c="#9bb0be" />
      {[-1.17, 1.17].map((x) => (
        <S
          key={x}
          p={[-2.9 + x, 0.65, 4.15]}
          s={[0.2, 0.55, 1.03]}
          c="#9bb0be"
        />
      ))}
      {[-0.78, 0, 0.78].map((x) => (
        <S
          key={x}
          p={[-2.9 + x, 0.72, 4.18]}
          s={[0.7, 0.12, 0.75]}
          c="#adc0ca"
        />
      ))}
      <S p={[-3.65, 0.98, 4.02]} s={[0.42, 0.42, 0.16]} c="#e9d4b4" />
      <S p={[-2.18, 0.98, 4.02]} s={[0.42, 0.42, 0.16]} c="#c88e6c" />
      <C p={[-3, 0.49, 6.9]} rad={0.62} h={0.1} c={palettes.oak} />
      <C p={[-3, 0.25, 6.9]} rad={0.32} h={0.45} c={palettes.dark} />
      <B p={[-3.12, 0.58, 6.9]} s={[0.43, 0.065, 0.3]} c="#dfcda7" />
      <C p={[-2.7, 0.61, 7.05]} rad={0.08} h={0.15} />
      <B p={[-5.42, 0.5, 6.05]} s={[0.18, 0.9, 1.15]} c="#b9a78a" />
      <B p={[-5.3, 0.5, 6.05]} s={[0.1, 0.61, 0.75]} c="#303335" />
      <B p={[-5.22, 1.07, 6.05]} s={[0.42, 0.13, 1.45]} c={palettes.trim} />
      <B p={[-5.08, 0.09, 6.05]} s={[0.75, 0.18, 1.5]} c="#cab591" />
      <B p={[-2.75, 1.1, 3.3]} s={[2.3, 1.8, 0.09]} c={palettes.trim} />
      <B p={[-2.65, 1.15, 3.36]} s={[1.85, 1.5, 0.02]} c="#3f474a" />
      <B p={[-3.9, 1.1, 3.48]} s={[0.32, 1.9, 0.35]} c={palettes.trim} />
      <Books p={[-4, 1.3, 3.5]} />
      <Plant p={[-4.9, 0, 8.2]} scale={1.2} />
      <Plant p={[-1.8, 0, 8.15]} scale={0.7} />
    </group>
  );
}
function StagedBed({ p, r = 0 }: { p: P; r?: number }) {
  return (
    <group position={p} rotation={[0, r, 0]}>
      <S p={[0, 0.025, 0]} s={[3.1, 0.035, 3.3]} c="#c4b69b" radius={0.014} />
      <B p={[0, 0.35, 0]} s={[1.8, 0.5, 2.3]} c={palettes.oak} wood />
      <S p={[0, 0.7, 0]} s={[1.77, 0.3, 2.27]} c="#eee5d4" />
      <S p={[0, 0.91, 0.4]} s={[1.8, 0.16, 1.45]} c="#cc9b77" />
      <S p={[0, 0.92, -1.08]} s={[1.9, 1.1, 0.15]} c="#a88a65" />
      {[-0.45, 0.45].map((x) => (
        <S key={x} p={[x, 0.94, -0.65]} s={[0.75, 0.18, 0.5]} c="#f4ead7" />
      ))}
      <B p={[1.25, 0.37, -0.85]} s={[0.55, 0.7, 0.6]} c={palettes.oak} wood />
      <group position={[1.25, 0.73, -0.85]}>
        <Lamp p={[0, 0, 0]} />
      </group>
    </group>
  );
}
function StagedKitchen() {
  return (
    <group>
      {[-1.7, -0.75, 0.2, 1.15].map((z) => (
        <group key={z}>
          <B p={[5.18, 0.45, z]} s={[0.6, 0.9, 0.9]} c="#e9e4d8" />
          <B p={[4.865, 0.47, z]} s={[0.035, 0.77, 0.78]} c="#f6efe0" />
          <B p={[4.84, 0.77, z]} s={[0.04, 0.045, 0.15]} c="#ad9c7a" metal />
          <B p={[5.18, 0.93, z]} s={[0.68, 0.06, 0.95]} c="#78958a" />
        </group>
      ))}
      <S p={[2.42, 1.0, 1.3]} s={[0.66, 1.98, 0.85]} c="#bec5c3" />
      <B p={[2.78, 1, 1.3]} s={[0.035, 0.9, 0.8]} c="#d5d8d1" />
      <B p={[2.42, 0.45, -0.2]} s={[0.63, 0.9, 1.75]} c="#f1eadb" />
      <B p={[2.42, 0.93, -0.2]} s={[0.68, 0.06, 1.8]} c="#779285" />
      <B p={[2.42, 0.98, -0.2]} s={[0.48, 0.025, 0.8]} c="#303a3d" />
      {[-0.22, 0.22].flatMap((z) =>
        [-0.12, 0.12].map((x) => (
          <mesh
            key={`${x}-${z}`}
            position={[2.42 + x, 1.005, -0.2 + z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.075, 0.012, 6, 20]} />
            <meshStandardMaterial color="#aeb6b6" />
          </mesh>
        )),
      )}
      <B p={[5.2, 0.97, -0.4]} s={[0.43, 0.025, 0.8]} c="#e6e0c8" />
      <B p={[5.2, 0.985, -0.4]} s={[0.31, 0.015, 0.6]} c="#9fb3b5" />
      <C p={[5.4, 1.17, -0.4]} rad={0.025} h={0.42} c="#aebbbd" />
      <B p={[5.29, 1.38, -0.4]} s={[0.24, 0.035, 0.035]} c="#aebbbd" />
      <B p={[5.45, 1.27, 1.4]} s={[0.08, 0.5, 1.0]} c="#6f8c83" />
      <B p={[5.45, 1.27, -1.7]} s={[0.08, 0.5, 0.8]} c="#6f8c83" />
      <Plant p={[5.12, 0.98, 1.36]} scale={0.4} />
    </group>
  );
}
function StagedBath() {
  return (
    <group>
      {Array.from({ length: 16 }, (_, i) => (
        <B
          key={`tile${i}`}
          p={[-5.4 + (i % 8) * 0.31, 0.82 + Math.floor(i / 8) * 0.15, -3.29]}
          s={[0.3, 0.145, 0.035]}
          c={(i + Math.floor(i / 8)) % 2 === 0 ? "#b3c8ce" : "#d6b2a4"}
        />
      ))}
      <S
        p={[-4.65, 0.32, -1.58]}
        s={[1.65, 0.58, 0.75]}
        c="#f0e9d9"
        radius={0.13}
      />
      <S
        p={[-4.65, 0.64, -1.58]}
        s={[1.4, 0.045, 0.54]}
        c="#c1d4d5"
        radius={0.02}
      />
      <B p={[-5.35, 0.8, -1.58]} s={[0.04, 0.08, 0.04]} c="#c6a870" metal />
      <B
        p={[-3.32, 1.0, -1.55]}
        s={[0.055, 1.9, 1.0]}
        c="#c0d4d7"
        opacity={0.25}
      />
      <B
        p={[-3.8, 1.0, -2.05]}
        s={[1.0, 1.9, 0.055]}
        c="#bfd1d3"
        opacity={0.2}
      />
      <B p={[-3.8, 0.06, -1.55]} s={[1.0, 0.1, 1.0]} c="#e4dbc6" />
      <C p={[-3.32, 1.3, -1.94]} rad={0.025} h={0.75} c="#c7a96f" />
      <B p={[-3.45, 1.7, -1.94]} s={[0.3, 0.035, 0.035]} c="#c7a96f" />
      <B p={[-4.75, 0.48, -2.95]} s={[1.2, 0.9, 0.55]} c="#d3b88e" />
      <S p={[-4.75, 0.97, -2.95]} s={[1.3, 0.12, 0.65]} c="#f2ebdc" />
      <B p={[-4.75, 1.61, -3.28]} s={[1.05, 0.95, 0.05]} c="#aebec1" />
      <Plant p={[-5.25, 0, -3.1]} scale={0.5} />
    </group>
  );
}
function Dining() {
  return (
    <group>
      <S p={[3.4, 0.8, 4.6]} s={[2.25, 0.13, 1.15]} c="#bf9668" />
      {[-0.9, 0.9].map((x) => (
        <B key={x} p={[3.4 + x, 0.4, 4.6]} s={[0.12, 0.8, 0.12]} c="#805f44" />
      ))}
      {[-0.65, 0.65].flatMap((x) =>
        [-1, 1].map((z) => (
          <group
            key={`${x}-${z}`}
            position={[3.4 + x, 0, 4.6 + z * 0.85]}
            rotation={[0, z > 0 ? 0 : Math.PI, 0]}
          >
            <S p={[0, 0.47, 0]} s={[0.53, 0.12, 0.56]} c="#a9ada1" />
            <S p={[0, 0.8, -0.24]} s={[0.53, 0.58, 0.1]} c="#a9ada1" />
            {[-0.2, 0.2].map((xx) => (
              <B
                key={xx}
                p={[xx, 0.24, 0]}
                s={[0.05, 0.48, 0.42]}
                c="#7c6247"
              />
            ))}
          </group>
        )),
      )}
      <C p={[3.4, 0.99, 4.6]} rad={0.16} h={0.25} c="#bba17a" />
      <Plant p={[4.95, 0, 3.0]} scale={1.05} />
      <group position={[3.4, 2.35, 4.6]}>
        <B p={[0, 0.3, 0]} s={[0.025, 0.6, 0.025]} c="#3c3b34" />
        {[-0.7, 0.7].flatMap((x) =>
          [-0.3, 0.3].map((z) => (
            <B
              key={`${x}-${z}`}
              p={[x, 0, z]}
              s={[0.025, 0.5, 0.025]}
              c="#343b3d"
            />
          )),
        )}
        <B p={[0, 0.24, 0]} s={[1.45, 0.025, 0.65]} c="#343b3d" />
        <B p={[0, -0.24, 0]} s={[1.45, 0.025, 0.65]} c="#343b3d" />
        <pointLight intensity={1} color="#ffe3af" distance={4} />
      </group>
    </group>
  );
}
function TracedFloor({
  polygon,
  surface,
}: {
  polygon: Pixel[];
  surface: "wood" | "carpet" | "tile";
}) {
  const mats = useContext(Materials);
  const geometry = useMemo(() => {
    const shape = new Shape();
    polygon.forEach(([x, y], i) => {
      const p = tracePoint(x, y);
      if (i === 0) shape.moveTo(p[0], -p[2]);
      else shape.lineTo(p[0], -p[2]);
    });
    shape.closePath();
    return new ShapeGeometry(shape);
  }, [polygon]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.025, 0]}
      receiveShadow
    >
      <meshStandardMaterial
        side={2}
        color={
          surface === "carpet"
            ? "#b7b4af"
            : surface === "tile"
              ? "#c9c0ae"
              : "#c9b79b"
        }
        map={surface === "wood" ? mats.wood : mats.fabric}
        roughness={0.85}
      />
    </mesh>
  );
}
function MappedRoom({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const old = plan.ROOMS[id as keyof typeof plan.ROOMS],
    target = traceRooms[id].bounds;
  const min = tracePoint(target[0], target[2]),
    max = tracePoint(target[1], target[3]);
  const sx = (max[0] - min[0]) / (old[1] - old[0]),
    sz = (max[2] - min[2]) / (old[3] - old[2]);
  return (
    <group
      scale={[sx, 1, sz]}
      position={[min[0] - old[0] * sx, 0, min[2] - (9 - old[3]) * sz]}
    >
      {children}
    </group>
  );
}
function CompactStairs() {
  const first = tracePoint(261, 787),
    second = tracePoint(237, 735),
    landing = tracePoint(249.5, 756);
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => (
        <B
          key={`a${i}`}
          p={[first[0], 0.08 + i * 0.13, tracePoint(261, 805 - i * 5.5)[2]]}
          s={[1.04, 0.15, 0.19]}
          c="#bbb8b1"
        />
      ))}
      <B
        p={[landing[0], 0.94, landing[2]]}
        s={[1.88, 0.14, 0.65]}
        c="#bbb8b1"
      />
      {Array.from({ length: 5 }, (_, i) => (
        <B
          key={`b${i}`}
          p={[second[0], 1.05 + i * 0.15, tracePoint(237, 744 - i * 4)[2]]}
          s={[1.05, 0.15, 0.145]}
          c="#bbb8b1"
        />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <B
          key={`rail${i}`}
          p={[
            tracePoint(278, 0)[0],
            0.75 + i * 0.09,
            tracePoint(0, 806 - i * 7)[2],
          ]}
          s={[0.025, 1.0, 0.025]}
          c="#f3eee6"
        />
      ))}
    </group>
  );
}
function StaticWebster() {
  const mats = useMemo(
    () => ({ wood: texture("wood"), fabric: texture("fabric") }),
    [],
  );
  useEffect(
    () => () => {
      mats.wood?.dispose();
      mats.fabric?.dispose();
    },
    [mats],
  );
  return (
    <Materials.Provider value={mats}>
      <group>
        <S p={[0, -0.34, 0]} s={[11.1, 0.65, 18.7]} c="#43505a" radius={0.15} />
        {Object.entries(traceRooms).map(([id, r]) => (
          <TracedFloor key={id} polygon={r.polygon} surface={r.surface} />
        ))}
        {traceWalls.map((wall, i) => (
          <WallParts key={i} wall={wall} />
        ))}
        {traceOpenings
          .filter((o) => o.kind === "window")
          .map((o) => (
            <Window key={o.name} o={o} />
          ))}
        {traceOpenings
          .filter((o) => o.kind === "arch")
          .map((o) => (
            <Arch key={o.name} o={o} />
          ))}
        <group position={tracePoint(120, 760)}>
          <S p={[0, 0.22, 0.15]} s={[0.44, 0.38, 0.6]} c="#eeeae3" />
          <S p={[0, 0.45, -0.08]} s={[0.47, 0.55, 0.19]} c="#eeeae3" />
          <S p={[0, 0.43, 0.2]} s={[0.46, 0.08, 0.48]} c="#d9d8d1" />
        </group>
        <CompactStairs />
        <MappedRoom id="living">
          <StagedLiving />
        </MappedRoom>
        <MappedRoom id="kitchen">
          <StagedKitchen />
        </MappedRoom>
        <MappedRoom id="bath_a">
          <StagedBath />
        </MappedRoom>
        <MappedRoom id="bed_a">
          <StagedBed p={[-4.6, 0, 1.1]} />
        </MappedRoom>
        <MappedRoom id="bed_b">
          <StagedBed p={[-3, 0, -5.75]} r={-Math.PI / 2} />
        </MappedRoom>
        <MappedRoom id="dining">
          <Dining />
        </MappedRoom>
        <MappedRoom id="family">
          <S p={[1.5, 0.38, -7.2]} s={[2.4, 0.5, 0.95]} c="#9caeb6" />
          <S p={[1.5, 0.81, -7.55]} s={[2.4, 0.75, 0.18]} c="#a9b8be" />
          <C p={[1.4, 0.46, -5.8]} rad={0.6} h={0.1} c={palettes.oak} />
          <Plant p={[2.65, 0, -8.1]} scale={1.15} />
        </MappedRoom>
        <MappedRoom id="laundry">
          <B p={[4.5, 0.55, -3.8]} s={[1.5, 1.05, 0.62]} c="#eee8dc" />
          <Books p={[3.9, 1.12, -3.8]} />
        </MappedRoom>
      </group>
    </Materials.Provider>
  );
}
const Geometry = memo(StaticWebster);
export default function WebsterHouse({
  onRoomSelect,
}: {
  onRoomSelect: (id: string) => void;
}) {
  return (
    <group>
      <Geometry />
      {Object.entries(websterZones).map(([id, room]) => (
        <mesh
          key={id}
          position={[room.point[0], 0.06, room.point[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            onRoomSelect(id);
          }}
        >
          <planeGeometry
            args={
              id === "bathroom"
                ? [2.5, 1.9]
                : id === "hallway"
                  ? [1.8, 2]
                  : [3.6, 3.6]
            }
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
