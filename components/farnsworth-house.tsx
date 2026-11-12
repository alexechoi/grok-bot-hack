"use client";

import { memo, useLayoutEffect, useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import {
  CatmullRomCurve3,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Vector3,
} from "three";

type Point = [number, number, number];
export type PropertyZoneMap = Record<string, { name: string; point: Point }>;
/** Coordinates digitised from HABS IL-1105 sheet3 (Elizabeth Milnarik,2009).
 * Origin: upper-platform centre. +x right and +z down the measured plan.
 * Horizontal footprint/core/terraces follow sheet3; clear height2.8702m,
 * cornice height3.4036m and terrace drop0.7112m follow sheet5. Furniture and
 * grade are simplified interpretations of same-property Highsmith photographs.
 */
export const farnsworthDimensions = {
  upperWidth: 23.57,
  upperDepth: 8.74,
  glassWest: -5.04,
  glassEast: 11.785,
  coreWest: 0.45,
  coreEast: 7.94,
  coreNorth: -3.02,
  coreSouth: 0.34,
  lowerWidth: 16.84,
  lowerDepth: 6.9,
  lowerCentre: [-10.05, -0.7112, 8.05] as Point,
};
export const farnsworthZones: PropertyZoneMap = {
  living: { name: "Living area", point: [4, 0, 2.7] },
  kitchen: { name: "Kitchen", point: [4.2, 0, -3.65] },
  bathroom: { name: "Guest bathroom", point: [1.65, 0, -1.1] },
  bedroom: { name: "Sleeping area", point: [10.4, 0, -3.2] },
  hallway: { name: "Entry & circulation", point: [-3.8, 0, 0.1] },
};
export const farnsworthOffice: Point = [-2.2, 0, 2.6];
export const farnsworthOverview = {
  width: 30.25,
  depth: 17.5,
  centre: [-3.2, 0, 3.5] as Point,
};
/** Door-aware routes go around the measured service core, never through it. */
export function farnsworthRoute(from: string, to: string): Point[] {
  const west: Point = [-0.3, 0, 0.85],
    northwest: Point = [-0.3, 0, -3.65],
    northeast: Point = [8.45, 0, -3.65];
  const exit: Record<string, Point[]> = {
    living: [west],
    hallway: [west],
    bathroom: [[0.18, 0, -1.1], [-0.3, 0, -1.1], west],
    kitchen: [northwest, west],
    bedroom: [northeast, northwest, west],
  };
  const enter: Record<string, Point[]> = {
    living: [west],
    hallway: [west],
    bathroom: [west, [-0.3, 0, -1.1], [0.18, 0, -1.1]],
    kitchen: [west, northwest],
    bedroom: [west, northwest, northeast],
  };
  if (from === to) return [];
  // The kitchen and sleeping zone share the open northern passage.
  if (from === "kitchen" && to === "bedroom") return [northeast];
  if (from === "bedroom" && to === "kitchen") return [northeast];
  return [...(exit[from] ?? [west]), ...(enter[to] ?? [west])].filter(
    (p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[2] !== a[i - 1][2],
  );
}
const white = "#eceeea",
  stone = "#d5cdbb",
  timber = "#b98854",
  leather = "#765241";
function Box({
  p,
  s,
  c = white,
  r = 0,
  metal = false,
}: {
  p: Point;
  s: Point;
  c?: string;
  r?: number;
  metal?: boolean;
}) {
  return (
    <mesh position={p} rotation={[0, r, 0]} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        roughness={metal ? 0.28 : 0.8}
        metalness={metal ? 0.65 : 0}
      />
    </mesh>
  );
}
function Soft({
  p,
  s,
  c = white,
  r = 0,
  radius = 0.045,
}: {
  p: Point;
  s: Point;
  c?: string;
  r?: number;
  radius?: number;
}) {
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
      <meshStandardMaterial color={c} roughness={0.68} />
    </RoundedBox>
  );
}
function Rail({
  points,
  radius = 0.024,
}: {
  points: Point[];
  radius?: number;
}) {
  const curve = useMemo(
    () => new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
    [points],
  );
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 16, radius, 6, false]} />
      <meshStandardMaterial color="#b8c2c7" metalness={0.85} roughness={0.2} />
    </mesh>
  );
}
function StoneDeck({
  width,
  depth,
  p,
}: {
  width: number;
  depth: number;
  p: Point;
}) {
  const mesh = useRef<InstancedMesh>(null),
    cols = Math.max(1, Math.round(width / 0.838)),
    rows = Math.max(1, Math.round(depth / 0.61));
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4(),
      palette = ["#d8d0be", "#d4cbb8", "#dbd2c1", "#d5cdba"].map(
        (c) => new Color(c),
      );
    for (let z = 0; z < rows; z++)
      for (let x = 0; x < cols; x++) {
        matrix.makeScale(width / cols - 0.009, 0.025, depth / rows - 0.009);
        matrix.setPosition(
          -width / 2 + ((x + 0.5) * width) / cols,
          0.013,
          -depth / 2 + ((z + 0.5) * depth) / rows,
        );
        const i = z * cols + x;
        mesh.current.setMatrixAt(i, matrix);
        mesh.current.setColorAt(i, palette[(x * 7 + z * 3) % palette.length]);
      }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [width, depth, cols, rows]);
  return (
    <group position={p}>
      <Box p={[0, -0.18, 0]} s={[width, 0.34, depth]} c={white} />
      <Box
        p={[0, -0.025, 0]}
        s={[width - 0.08, 0.06, depth - 0.08]}
        c={stone}
      />
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, cols * rows]}
        receiveShadow
      >
        <boxGeometry />
        <meshStandardMaterial roughness={0.92} />
      </instancedMesh>
    </group>
  );
}
function SteelColumn({
  x,
  z,
  bottom = -1.65,
  top = 3.4036,
}: {
  x: number;
  z: number;
  bottom?: number;
  top?: number;
}) {
  const h = top - bottom,
    y = (top + bottom) / 2;
  return (
    <group position={[x, 0, z]}>
      <Box p={[-0.11, y, 0]} s={[0.045, h, 0.25]} />
      <Box p={[0.11, y, 0]} s={[0.045, h, 0.25]} />
      <Box p={[0, y, 0]} s={[0.2, h, 0.055]} />
      <Box p={[0, bottom, 0.015]} s={[0.34, 0.06, 0.34]} c="#bdc2bd" metal />
    </group>
  );
}
function GlassWall({
  p,
  width,
  r = 0,
}: {
  p: Point;
  width: number;
  r?: number;
}) {
  const panels = Math.max(1, Math.round(width / 1.68));
  return (
    <group position={p} rotation={[0, r, 0]}>
      <mesh position={[0, 1.42, 0]}>
        <planeGeometry args={[width, 2.76]} />
        <meshStandardMaterial
          color="#b9d0dc"
          transparent
          opacity={0.095}
          roughness={0.12}
          metalness={0.1}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <Box p={[0, 0.09, 0]} s={[width, 0.12, 0.08]} />
      <Box p={[0, 2.78, 0]} s={[width, 0.13, 0.09]} />
      {Array.from({ length: panels + 1 }, (_, i) => (
        <Box
          key={i}
          p={[-width / 2 + (i * width) / panels, 1.43, 0]}
          s={[0.045, 2.73, 0.075]}
        />
      ))}
    </group>
  );
}
function TuftedSeat({
  p,
  width,
  depth,
}: {
  p: Point;
  width: number;
  depth: number;
}) {
  const cols = Math.round(width / 0.27),
    rows = Math.round(depth / 0.26);
  return (
    <group position={p}>
      {Array.from({ length: cols }, (_, x) =>
        Array.from({ length: rows }, (_, z) => (
          <Soft
            key={`${x}-${z}`}
            p={[
              -width / 2 + ((x + 0.5) * width) / cols,
              0,
              -depth / 2 + ((z + 0.5) * depth) / rows,
            ]}
            s={[width / cols + 0.005, 0.11, depth / rows + 0.005]}
            c={leather}
            radius={0.045}
          />
        )),
      )}
    </group>
  );
}
function BarcelonaChair({ p, r = 0 }: { p: Point; r?: number }) {
  return (
    <group position={p} rotation={[0, r, 0]}>
      <TuftedSeat p={[0, 0.48, 0]} width={0.72} depth={0.68} />
      <group position={[0, 0.81, -0.32]} rotation={[-Math.PI / 2 + 0.15, 0, 0]}>
        <TuftedSeat p={[0, 0, 0]} width={0.72} depth={0.65} />
      </group>
      {[-0.31, 0.31].map((x) => (
        <group key={x}>
          <Rail
            points={[
              [x, 0.06, -0.38],
              [x, 0.11, -0.12],
              [x, 0.47, 0.35],
            ]}
          />
          <Rail
            points={[
              [x, 0.06, 0.39],
              [x, 0.15, 0.05],
              [x, 0.42, -0.32],
              [x, 0.93, -0.4],
            ]}
          />
        </group>
      ))}
    </group>
  );
}
function DiningChair({ p, r = 0 }: { p: Point; r?: number }) {
  return (
    <group position={p} rotation={[0, r, 0]}>
      <Soft p={[0, 0.46, 0]} s={[0.44, 0.07, 0.43]} c={leather} />
      <Soft p={[0, 0.75, -0.22]} s={[0.44, 0.48, 0.055]} c={leather} />
      {[-0.24, 0.24].map((x) => (
        <Rail
          key={x}
          points={[
            [x, 0.07, -0.3],
            [x, 0.07, 0.25],
            [x, 0.4, 0.29],
            [x, 0.47, 0.1],
            [x, 0.75, -0.23],
            [x, 0.96, -0.22],
          ]}
        />
      ))}
    </group>
  );
}
function DiningArea() {
  return (
    <group position={[-2.45, 0, -2.45]}>
      <Box p={[0, 0.76, 0]} s={[2.5, 0.065, 0.95]} c="#936c48" />
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Box
            key={`${x}-${z}`}
            p={[x * 1.05, 0.38, z * 0.35]}
            s={[0.045, 0.76, 0.045]}
            c="#aebbc1"
            metal
          />
        )),
      )}
      {[-0.8, 0, 0.8].flatMap((x, i) =>
        [-1, 1].map((z) => (
          <DiningChair
            key={`${i}-${z}`}
            p={[x, 0, z * 0.83]}
            r={z > 0 ? 0 : Math.PI}
          />
        )),
      )}
      {[-0.55, 0.55].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.91, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.24, 16]} />
            <meshStandardMaterial
              color="#d8e4e7"
              transparent
              opacity={0.4}
              roughness={0.15}
            />
          </mesh>
          <Box p={[x, 0.85, 0]} s={[0.055, 0.1, 0.055]} c="#efeadb" />
        </group>
      ))}
    </group>
  );
}
function LivingArea() {
  return (
    <group>
      <Soft
        p={[4.1, 0.035, 2.4]}
        s={[6, 0.035, 3.25]}
        c="#ddd8cd"
        radius={0.015}
      />
      <Box p={[3.25, 0.34, 1.65]} s={[2.75, 0.13, 1.02]} c="#73513b" />
      <TuftedSeat p={[3.25, 0.46, 1.65]} width={2.75} depth={1.02} />
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Box
            key={`${x}-${z}`}
            p={[3.25 + x * 1.15, 0.16, 1.65 + z * 0.4]}
            s={[0.04, 0.32, 0.04]}
            c="#adbac1"
            metal
          />
        )),
      )}
      <mesh
        position={[2.2, 0.62, 1.65]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.13, 0.13, 0.85, 20]} />
        <meshStandardMaterial color={leather} />
      </mesh>
      <BarcelonaChair p={[6.6, 0, 1.75]} r={-0.9} />
      <BarcelonaChair p={[6.7, 0, 3.35]} r={-2.3} />
      <mesh position={[6.3, 0.48, 2.62]} castShadow>
        <boxGeometry args={[0.85, 0.035, 0.85]} />
        <meshStandardMaterial
          color="#bfd4dc"
          transparent
          opacity={0.42}
          roughness={0.12}
          metalness={0.1}
        />
      </mesh>
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Box
            key={`${x}-${z}`}
            p={[6.3 + x * 0.34, 0.24, 2.62 + z * 0.34]}
            s={[0.025, 0.48, 0.025]}
            c="#afbbc0"
            metal
          />
        )),
      )}
    </group>
  );
}
function BathFixtures({ x, mirror = false }: { x: number; mirror?: boolean }) {
  return (
    <group position={[x, 0, -1.22]}>
      <Soft
        p={[mirror ? 0.66 : -0.66, 0.37, -0.45]}
        s={[0.42, 0.62, 0.62]}
        c="#f2f0e7"
        radius={0.1}
      />
      <Soft
        p={[mirror ? 0.66 : -0.66, 0.7, -0.45]}
        s={[0.44, 0.08, 0.62]}
        c="#f5f3eb"
        radius={0.035}
      />
      <Soft
        p={[mirror ? -0.05 : 0.05, 0.88, -0.45]}
        s={[0.65, 0.11, 0.5]}
        c="#f0eee5"
      />
      <Box
        p={[mirror ? -0.05 : 0.05, 0.63, -0.45]}
        s={[0.5, 0.5, 0.4]}
        c="#c6b89c"
      />
      <Soft p={[0, 0.3, 1.05]} s={[2.1, 0.5, 0.58]} c="#eeeae1" radius={0.08} />
      <Soft
        p={[0, 0.57, 1.05]}
        s={[1.83, 0.035, 0.4]}
        c="#aebfc4"
        radius={0.012}
      />
    </group>
  );
}
function ServiceCore() {
  return (
    <group>
      {/* The two actual bathrooms flank the mechanical core. Cutaway heights expose their layout. */}
      <Box p={[4.2, 0.49, -2.63]} s={[7.49, 0.98, 0.78]} c={timber} />
      <Box p={[4.2, 1.01, -2.63]} s={[7.5, 0.08, 0.8]} c="#ddd9cd" />
      {Array.from({ length: 10 }, (_, i) => (
        <Box
          key={i}
          p={[0.81 + i * 0.75, 0.49, -3.04]}
          s={[0.012, 0.87, 0.012]}
          c="#8c653d"
        />
      ))}
      <Box p={[2.9, 1.065, -2.63]} s={[0.78, 0.02, 0.55]} c="#3e474b" />
      {[-0.2, 0.2].flatMap((x) =>
        [-0.14, 0.14].map((z) => (
          <mesh
            key={`${x}-${z}`}
            position={[2.9 + x, 1.084, -2.63 + z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[0.1, 0.012, 6, 20]} />
            <meshStandardMaterial
              color="#aeb8bb"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        )),
      )}
      <Box p={[4.5, 1.065, -2.63]} s={[0.66, 0.025, 0.45]} c="#a7b9bf" />
      <Box p={[4.5, 1.08, -2.63]} s={[0.5, 0.01, 0.32]} c="#71858d" />
      <Box p={[4.5, 1.25, -2.94]} s={[0.035, 0.35, 0.035]} c="#b2bdc3" metal />
      <Box p={[4.5, 1.43, -2.85]} s={[0.035, 0.035, 0.2]} c="#b2bdc3" metal />
      <Box p={[0.45, 1.05, -2.32]} s={[0.12, 2.1, 1.4]} c={timber} />
      <Box p={[0.45, 1.05, 0.04]} s={[0.12, 2.1, 0.6]} c={timber} />
      <Box p={[7.94, 1.05, -2.32]} s={[0.12, 2.1, 1.4]} c={timber} />
      <Box p={[7.94, 1.05, 0.04]} s={[0.12, 2.1, 0.6]} c={timber} />
      <Box p={[2.96, 0.8, -1.05]} s={[0.12, 1.6, 2.22]} c="#d6b987" />
      <Box p={[5.43, 0.8, -1.05]} s={[0.12, 1.6, 2.22]} c="#d6b987" />
      <Box p={[4.2, 1.1, -1.05]} s={[2.36, 2.2, 2.2]} c={timber} />
      <Box p={[4.2, 0.38, 0.32]} s={[7.5, 0.76, 0.12]} c="#c6bda9" />
      <Box p={[4.2, 0.52, 0.4]} s={[1.85, 0.66, 0.05]} c="#2b3034" />
      <Box p={[4.2, 0.2, 0.55]} s={[2.25, 0.13, 0.45]} c="#d0c7b2" />
      <Box p={[4.2, 1.59, 0.32]} s={[7.5, 1.65, 0.14]} c={timber} />
      {Array.from({ length: 11 }, (_, i) => (
        <Box
          key={i}
          p={[0.72 + i * 0.7, 1.6, 0.4]}
          s={[0.012, 1.62, 0.01]}
          c="#966a3d"
        />
      ))}
      <BathFixtures x={1.72} />
      <BathFixtures x={6.65} mirror />
    </group>
  );
}
function SleepingArea() {
  return (
    <group>
      {/* Wardrobe footprint is drawn on sheet3; the low bed follows Highsmith photo3512. */}
      <Box p={[9.22, 1.1, 1.8]} s={[0.69, 2.2, 3.66]} c="#a8784a" />
      {[-1.25, -0.4, 0.4, 1.25].map((z) => (
        <Box
          key={z}
          p={[9.574, 1.1, 1.8 + z]}
          s={[0.012, 2.12, 0.015]}
          c="#7c5539"
        />
      ))}
      <Box p={[9.7, 0.23, -1.32]} s={[2.35, 0.42, 1.85]} c="#9a714c" />
      <Soft
        p={[9.7, 0.57, -1.32]}
        s={[2.32, 0.35, 1.83]}
        c="#eeeae1"
        radius={0.11}
      />
      <Soft p={[10, 0.78, -1.32]} s={[1.7, 0.14, 1.84]} c="#e9e6df" />
      {[-0.46, 0.46].map((z) => (
        <Soft
          key={z}
          p={[8.95, 0.83, -1.32 + z]}
          s={[0.58, 0.2, 0.75]}
          c="#f2eee6"
          r={-0.04}
        />
      ))}
      <BarcelonaChair p={[10.65, 0, 1.5]} r={-0.4} />
    </group>
  );
}
function FarnsworthModel() {
  return (
    <group>
      <StoneDeck width={23.57} depth={8.74} p={[0, 0, 0]} />
      <StoneDeck width={16.84} depth={6.9} p={[-10.05, -0.7112, 8.05]} />
      {[-10.05, -3.35, 3.38, 10.07].flatMap((x) =>
        [-4.48, 4.48].map((z) => <SteelColumn key={`${x}-${z}`} x={x} z={z} />),
      )}
      {[-16.75, -3.35].flatMap((x) =>
        [4.73, 11.34].map((z) => (
          <SteelColumn
            key={`lower-${x}-${z}`}
            x={x}
            z={z}
            bottom={-1.65}
            top={-0.76}
          />
        )),
      )}
      {Array.from({ length: 4 }, (_, i) => (
        <group key={i}>
          <Box
            p={[-6.7, -(i + 1) * 0.1778 - 0.08, 4.63 + i * 0.5]}
            s={[3.65, 0.16, 0.52]}
            c="#ddd5c4"
          />
          <Box
            p={[-6.7, -0.89 - i * 0.2, 11.75 + i * 0.36]}
            s={[3.65, 0.16, 0.38]}
            c="#ddd5c4"
          />
        </group>
      ))}
      <GlassWall p={[3.3725, 0, -4.37]} width={16.825} />
      <GlassWall p={[3.3725, 0, 4.37]} width={16.825} />
      <GlassWall p={[11.785, 0, 0]} width={8.74} r={Math.PI / 2} />
      <GlassWall p={[-5.04, 0, -2.65]} width={3.44} r={Math.PI / 2} />
      <GlassWall p={[-5.04, 0, 2.65]} width={3.44} r={Math.PI / 2} />
      <Box p={[-5.04, 2.78, 0]} s={[0.1, 0.13, 1.86]} />
      <Box p={[-5.04, 0.08, 0]} s={[0.08, 0.1, 1.86]} />
      {/* Actual flat roof is hidden for inspection; its structural perimeter remains. */}
      <Box p={[0, 3.137, -4.48]} s={[23.75, 0.5332, 0.2]} />
      <Box p={[0, 3.137, 4.48]} s={[23.75, 0.5332, 0.2]} />
      <Box p={[-11.84, 3.137, 0]} s={[0.2, 0.5332, 8.98]} />
      <Box p={[11.84, 3.137, 0]} s={[0.2, 0.5332, 8.98]} />
      <mesh position={[-8.42, 3.137, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.72, 8.7]} />
        <meshStandardMaterial
          color="#e7e8e1"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <ServiceCore />
      <DiningArea />
      <LivingArea />
      <SleepingArea />
    </group>
  );
}
const StaticFarnsworthModel = memo(FarnsworthModel);
function FarnsworthHouse({
  onRoomSelect,
}: {
  onRoomSelect: (id: string) => void;
}) {
  return (
    <group>
      <StaticFarnsworthModel />
      {Object.entries(farnsworthZones).map(([id, zone]) => (
        <mesh
          key={id}
          position={[zone.point[0], 0.045, zone.point[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            onRoomSelect(id);
          }}
        >
          <planeGeometry
            args={
              id === "living"
                ? [6.8, 2.8]
                : id === "kitchen"
                  ? [7, 1.2]
                  : id === "bedroom"
                    ? [3.3, 2.2]
                    : id === "bathroom"
                      ? [2.25, 1.8]
                      : [3.8, 1.8]
            }
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
export default memo(FarnsworthHouse);
