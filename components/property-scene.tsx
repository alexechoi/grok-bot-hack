"use client";

import {
  Component,
  memo,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
  createContext,
  useContext,
} from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls, RoundedBox, Splat } from "@react-three/drei";
import {
  Group,
  Mesh,
  OrthographicCamera,
  Vector3,
  Texture,
  SRGBColorSpace,
} from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import FarnsworthHouse, {
  farnsworthZones,
  farnsworthOffice,
  farnsworthOverview,
  farnsworthRoute,
  type PropertyZoneMap,
} from "./farnsworth-house";
import type { CustomProperty } from "@/lib/property-source";

type Point = [number, number, number];
type SceneAgent = {
  id: string;
  color: string;
  roomId: string;
  state: string;
  task: string;
};
type SceneFinding = {
  id: string;
  roomId: string;
  category: string;
  severity: string;
};
export type PropertySceneProps = {
  propertyId?: "farnsworth" | "willow";
  customProperty?: CustomProperty | null;
  agents: SceneAgent[];
  findings: SceneFinding[];
  selectedAgent: string | null;
  focusRoom: string | null;
  cameraMode: "orbit" | "follow" | "top";
  resetKey: number;
  handoff?: { id: string; from: string; to: string };
  onAgentSelect: (id: string) => void;
  onFindingSelect: (id: string) => void;
  onRoomSelect: (id: string) => void;
};

const willowRooms: PropertyZoneMap = {
  living: { name: "Living room", point: [-3, 0, 2.2] },
  kitchen: { name: "Kitchen", point: [-3, 0, -2.2] },
  bathroom: { name: "Bathroom", point: [3.4, 0, -2.3] },
  bedroom: { name: "Bedroom", point: [3.4, 0, 2.4] },
  hallway: { name: "Hallway", point: [0.4, 0, 0] },
};
const SceneRooms = createContext<PropertyZoneMap>(willowRooms);
const SceneProperty = createContext<"farnsworth" | "willow">("willow");
const ReducedMotion = createContext(false);
function subscribeMotion(listener: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const motionPreference = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverMotionPreference = () => false;

const cream = "#e9e1ca",
  wood = "#ba8c61",
  darkWood = "#725444",
  brass = "#b99c66";
function Box({
  p,
  s,
  c = cream,
  r = 0,
  rough = 0.75,
  onClick,
}: {
  p: Point;
  s: Point;
  c?: string;
  r?: number;
  rough?: number;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <mesh
      position={p}
      rotation={[0, r, 0]}
      castShadow
      receiveShadow
      onClick={onClick}
    >
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={rough} />
    </mesh>
  );
}
function Soft({
  p,
  s,
  c = cream,
  r = 0,
  radius = 0.07,
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
      <meshStandardMaterial color={c} roughness={0.75} />
    </RoundedBox>
  );
}
function Cylinder({
  p,
  top = 0.15,
  bottom = 0.15,
  h = 0.3,
  c = cream,
}: {
  p: Point;
  top?: number;
  bottom?: number;
  h?: number;
  c?: string;
}) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <cylinderGeometry args={[top, bottom, h, 24]} />
      <meshStandardMaterial color={c} roughness={0.7} />
    </mesh>
  );
}
function Sphere({ p, s, c }: { p: Point; s: Point; c: string }) {
  return (
    <mesh position={p} scale={s} castShadow>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial color={c} roughness={0.75} />
    </mesh>
  );
}
function Plant({ p, scale = 1 }: { p: Point; scale?: number }) {
  return (
    <group position={p} scale={scale}>
      <Cylinder
        p={[0, 0.19, 0]}
        top={0.22}
        bottom={0.16}
        h={0.38}
        c="#b76f4d"
      />
      <Cylinder
        p={[0, 0.39, 0]}
        top={0.18}
        bottom={0.18}
        h={0.035}
        c="#423a28"
      />
      <Cylinder p={[0, 0.75, 0]} top={0.025} h={0.7} c="#65734a" />
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <group key={n} rotation={[0, n * 2.4, 0]}>
          <mesh
            position={[0.17, 0.68 + n * 0.07, 0]}
            rotation={[0, 0, -0.7]}
            scale={[0.13, 0.36, 0.07]}
            castShadow
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={n % 2 ? "#7e9664" : "#547153"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function Books({ p }: { p: Point }) {
  return (
    <group position={p}>
      {["#a85e47", "#e3c887", "#6e8274", "#d6bfa1", "#454e46"].map((c, i) => (
        <Box
          key={c}
          p={[i * 0.13, 0.13, 0]}
          s={[0.105, 0.25 + (i % 2) * 0.08, 0.25]}
          c={c}
        />
      ))}
    </group>
  );
}
function Frame({
  p,
  c = "#c5815f",
  w = 0.9,
}: {
  p: Point;
  c?: string;
  w?: number;
}) {
  return (
    <group position={p}>
      <Box p={[0, 0, 0]} s={[w, 0.85, 0.06]} c={wood} />
      <Box p={[0, 0, 0.04]} s={[w - 0.08, 0.77, 0.025]} c="#f5ead2" />
      <mesh position={[0.1, 0.05, 0.06]}>
        <circleGeometry args={[0.22, 32]} />
        <meshStandardMaterial color={c} />
      </mesh>
      <Box p={[-0.1, -0.21, 0.065]} s={[w * 0.55, 0.18, 0.015]} c="#8194a4" />
    </group>
  );
}
function Window({ p, w = 1.6 }: { p: Point; w?: number }) {
  return (
    <group position={p}>
      <Box p={[0, 0, 0]} s={[w + 0.15, 1.25, 0.1]} c="#c1bca7" />
      <Box p={[0, 0.02, 0.07]} s={[w, 1.07, 0.035]} c="#b7d5d0" rough={0.2} />
      <Box p={[0, 0, 0.1]} s={[0.06, 1.1, 0.06]} c="#f5ebd7" />
      <Box p={[0, 0, 0.1]} s={[w, 0.05, 0.06]} c="#f5ebd7" />
      <Box p={[0, -0.62, 0.14]} s={[w + 0.3, 0.1, 0.34]} c="#f1e6ce" />
    </group>
  );
}
function Chair({
  p,
  r = 0,
  c = "#8d9eab",
}: {
  p: Point;
  r?: number;
  c?: string;
}) {
  return (
    <group position={p} rotation={[0, r, 0]}>
      <Soft p={[0, 0.55, 0]} s={[0.65, 0.14, 0.65]} c={c} />
      <Soft p={[0, 0.93, -0.27]} s={[0.65, 0.7, 0.1]} c={c} />
      {[-1, 1].flatMap((x) =>
        [-1, 1].map((z) => (
          <Box
            key={`${x}${z}`}
            p={[x * 0.23, 0.26, z * 0.23]}
            s={[0.07, 0.55, 0.07]}
            c={darkWood}
          />
        )),
      )}
    </group>
  );
}
function Lamp({ p }: { p: Point }) {
  return (
    <group position={p}>
      <Cylinder p={[0, 0.04, 0]} top={0.24} h={0.08} c={brass} />
      <Cylinder p={[0, 0.85, 0]} top={0.028} h={1.7} c={brass} />
      <Cylinder p={[0, 1.72, 0]} top={0.22} bottom={0.4} h={0.42} c="#f0d9a5" />
      <pointLight
        position={[0, 1.6, 0]}
        color="#ffce8a"
        intensity={2}
        distance={3}
      />
    </group>
  );
}
function LivingRoom() {
  return (
    <group>
      <Soft
        p={[-3.35, 0.035, 2]}
        s={[3.6, 0.035, 2.6]}
        c="#9a9ca2"
        radius={0.015}
      />
      {Array.from({ length: 13 }, (_, i) => (
        <Box
          key={i}
          p={[-3.35, 0.058, 0.85 + i * 0.19]}
          s={[3.5, 0.008, 0.012]}
          c="#b1b2b6"
        />
      ))}
      <group position={[-4.85, 0, 2]} rotation={[0, Math.PI / 2, 0]}>
        <Soft p={[0, 0.38, 0]} s={[2.65, 0.55, 1.05]} c="#9baebd" />
        <Soft p={[0, 0.88, -0.4]} s={[2.65, 0.85, 0.25]} c="#a4b7c5" />
        <Soft p={[-1.25, 0.65, 0]} s={[0.25, 0.65, 1.1]} c="#a4b7c5" />
        <Soft p={[1.25, 0.65, 0]} s={[0.25, 0.65, 1.1]} c="#a4b7c5" />
        {[-0.77, 0, 0.77].map((x) => (
          <Soft key={x} p={[x, 0.71, 0.07]} s={[0.7, 0.14, 0.75]} c="#b2c2cc" />
        ))}
        <Soft
          p={[-0.75, 0.95, -0.17]}
          s={[0.47, 0.43, 0.15]}
          c="#e8c88b"
          r={0.15}
        />
        <Soft
          p={[0.8, 0.95, -0.17]}
          s={[0.45, 0.45, 0.15]}
          c="#e9debf"
          r={-0.2}
        />
        <Box p={[0.9, 0.8, 0.3]} s={[0.5, 0.025, 0.7]} c="#be835f" />
      </group>
      <Cylinder p={[-3, 0.55, 2]} top={0.67} bottom={0.67} h={0.12} c={wood} />
      <Cylinder
        p={[-3, 0.28, 2]}
        top={0.32}
        bottom={0.4}
        h={0.5}
        c={darkWood}
      />
      <Box
        p={[-3.15, 0.64, 2.05]}
        s={[0.45, 0.065, 0.34]}
        c="#e8d8b5"
        r={0.2}
      />
      <Box
        p={[-3.15, 0.68, 2.05]}
        s={[0.43, 0.025, 0.32]}
        c="#a86243"
        r={0.2}
      />
      <Cylinder
        p={[-2.77, 0.68, 1.82]}
        top={0.09}
        bottom={0.08}
        h={0.17}
        c="#e6e1ce"
      />
      <Soft p={[-1.15, 0.37, 1.7]} s={[0.35, 0.65, 2.6]} c={wood} />
      <Box p={[-1.12, 1.15, 1.7]} s={[0.09, 0.95, 1.6]} c="#343a42" />
      <Box p={[-1.18, 1.15, 1.7]} s={[0.01, 0.83, 1.46]} c="#202a34" />
      <Plant p={[-1.2, 0.7, 2.75]} scale={0.4} />
      <Plant p={[-5.25, 0, 3.65]} scale={1.15} />
      <Lamp p={[-5.25, 0, 0.65]} />
      <Box p={[-4.8, 0.48, 0.15]} s={[1.7, 0.85, 0.38]} c={wood} />
      <Books p={[-5.45, 0.92, 0.15]} />
      <Frame p={[-4.55, 1.95, -0.11]} c="#c5a46e" />
    </group>
  );
}
function Kitchen() {
  return (
    <group>
      {[-5.15, -4.15, -3.15, -2.15].map((x) => (
        <group key={x}>
          <Box p={[x, 0.52, -3.9]} s={[0.97, 1.04, 0.82]} c="#8797a6" />
          <Box p={[x, 0.52, -3.47]} s={[0.87, 0.88, 0.035]} c="#97a6b3" />
          <Box p={[x + 0.3, 0.83, -3.43]} s={[0.15, 0.035, 0.025]} c={brass} />
        </group>
      ))}
      <Box p={[-3.65, 1.08, -3.86]} s={[4.05, 0.11, 1.02]} c="#e9e3cf" />
      <Box p={[-3.65, 1.5, -4.37]} s={[4.05, 0.6, 0.055]} c="#d3d8dc" />
      {Array.from({ length: 12 }, (_, i) => (
        <Box
          key={i}
          p={[-5.5 + i * 0.33, 1.5, -4.33]}
          s={[0.012, 0.58, 0.02]}
          c="#eae8d9"
        />
      ))}
      <Box p={[-4.45, 1.15, -3.8]} s={[0.79, 0.035, 0.62]} c="#31423b" />
      {[-0.19, 0.19].flatMap((x) =>
        [-0.16, 0.16].map((z) => (
          <group key={`${x}${z}`}>
            <mesh
              position={[-4.45 + x, 1.177, -3.8 + z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.1, 0.013, 6, 24]} />
              <meshStandardMaterial color="#7e8882" />
            </mesh>
          </group>
        )),
      )}
      <Box p={[-4.45, 0.6, -3.425]} s={[0.75, 0.5, 0.04]} c="#34423b" />
      <Box p={[-4.45, 0.64, -3.395]} s={[0.6, 0.31, 0.02]} c="#1d2b27" />
      <Box p={[-4.45, 0.9, -3.37]} s={[0.55, 0.04, 0.04]} c={brass} />
      <Box p={[-2.65, 1.15, -3.85]} s={[0.7, 0.035, 0.52]} c="#9aaba2" />
      <Box p={[-2.65, 1.17, -3.85]} s={[0.53, 0.015, 0.38]} c="#697f78" />
      <Cylinder p={[-2.65, 1.39, -4.04]} top={0.025} h={0.45} c={brass} />
      <Box p={[-2.65, 1.61, -3.96]} s={[0.05, 0.05, 0.2]} c={brass} />
      <Soft p={[-1.15, 0.99, -3.84]} s={[0.95, 1.95, 1.05]} c="#d8d6c7" />
      <Box p={[-1.15, 1.35, -3.3]} s={[0.85, 0.03, 0.025]} c="#aaa99a" />
      <Box p={[-0.82, 1, -3.27]} s={[0.04, 0.44, 0.04]} c={brass} />
      <Box p={[-3.65, 2.05, -4.1]} s={[2.7, 0.8, 0.55]} c="#a8b3bd" />
      {[-4.55, -3.65, -2.75].map((x) => (
        <Box key={x} p={[x, 2.05, -3.81]} s={[0.84, 0.72, 0.04]} c="#b6c0c8" />
      ))}
      <Cylinder p={[-5.1, 1.3, -3.8]} top={0.12} h={0.3} c="#b97c53" />
      <Plant p={[-1.95, 1.13, -4]} scale={0.35} />
      <Soft p={[-4.1, 0.9, -1.65]} s={[2.25, 0.14, 1.1]} c="#d8bd92" />
      {[-4.9, -3.3].map((x) => (
        <Box key={x} p={[x, 0.44, -1.65]} s={[0.11, 0.88, 0.11]} c={wood} />
      ))}
      <Chair p={[-4.5, 0, -0.8]} r={Math.PI} />
      <Chair p={[-3.6, 0, -2.5]} />
      <Cylinder
        p={[-4.1, 1.03, -1.65]}
        top={0.28}
        bottom={0.19}
        h={0.13}
        c="#d8d9bd"
      />
      <Sphere p={[-4.2, 1.16, -1.65]} s={[0.1, 0.1, 0.1]} c="#ce8853" />
      <Sphere p={[-4, 1.15, -1.6]} s={[0.11, 0.1, 0.1]} c="#b6b970" />
    </group>
  );
}
function Bathroom() {
  return (
    <group>
      {Array.from({ length: 7 }, (_, x) =>
        Array.from({ length: 6 }, (_, z) => (
          <Box
            key={`${x}-${z}`}
            p={[1.55 + x * 0.62, 0.015, -4.12 + z * 0.62]}
            s={[0.59, 0.025, 0.59]}
            c={(x + z) % 2 ? "#c6d1d7" : "#b7c7d0"}
          />
        )),
      )}
      <Soft
        p={[4.5, 0.38, -3.45]}
        s={[2.15, 0.65, 1.15]}
        c="#f2eee1"
        radius={0.2}
      />
      <Soft
        p={[4.5, 0.73, -3.45]}
        s={[1.8, 0.07, 0.84]}
        c="#9db7c7"
        radius={0.03}
      />
      <Cylinder p={[5.35, 1.1, -3.45]} top={0.035} h={1.25} c={brass} />
      <Box p={[5.15, 1.72, -3.45]} s={[0.45, 0.06, 0.06]} c={brass} />
      <mesh position={[4.95, 1.68, -3.45]}>
        <cylinderGeometry args={[0.16, 0.16, 0.035, 24]} />
        <meshStandardMaterial color={brass} />
      </mesh>
      <Box
        p={[3.32, 1.1, -3.55]}
        s={[0.04, 1.65, 1.6]}
        c="#c8dbe4"
        rough={0.15}
      />
      <Box p={[2.15, 0.55, -3.98]} s={[1.25, 1, 0.75]} c={wood} />
      <Soft p={[2.15, 1.1, -3.98]} s={[1.4, 0.16, 0.85]} c="#ece9db" />
      <Cylinder
        p={[2.15, 1.18, -3.9]}
        top={0.31}
        bottom={0.2}
        h={0.15}
        c="#f4f1e8"
      />
      <Cylinder p={[2.15, 1.4, -4.2]} top={0.025} h={0.4} c={brass} />
      <Box p={[2.15, 1.9, -4.37]} s={[1, 1.1, 0.07]} c={brass} />
      <Box
        p={[2.15, 1.9, -4.32]}
        s={[0.9, 1, 0.015]}
        c="#acbecb"
        rough={0.15}
      />
      <Soft p={[4.8, 0.37, -1.1]} s={[0.65, 0.62, 0.95]} c="#eceee2" />
      <Soft p={[4.8, 0.71, -1.1]} s={[0.7, 0.09, 0.95]} c="#f6f4e9" />
      <Box p={[4.8, 0.88, -1.52]} s={[0.68, 0.95, 0.3]} c="#e9e9dc" />
      <Box p={[5.85, 1.13, -2]} s={[0.06, 0.055, 1]} c={brass} />
      <Box p={[5.78, 0.95, -2]} s={[0.08, 0.5, 0.65]} c="#d6c39f" />
      <Plant p={[2, 0, -0.95]} scale={0.65} />
      <Soft
        p={[3.9, 0.03, -1.65]}
        s={[1.35, 0.03, 0.65]}
        c="#dfd5ba"
        radius={0.012}
      />
      <mesh position={[4.55, 1.99, -4.38]} scale={[0.45, 0.19, 0.015]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#9a8468" transparent opacity={0.65} />
      </mesh>
    </group>
  );
}
function Bedroom() {
  return (
    <group>
      <Soft
        p={[3.65, 0.035, 2.35]}
        s={[3.6, 0.035, 3.7]}
        c="#c4ab84"
        radius={0.012}
      />
      <Box p={[4.55, 0.53, 2.45]} s={[2.35, 0.58, 3.1]} c={wood} />
      <Soft p={[4.55, 0.91, 2.45]} s={[2.27, 0.36, 3]} c="#e4ddc6" />
      <Soft p={[4.55, 1.17, 3.12]} s={[2.3, 0.22, 1.65]} c="#b77957" />
      <Box p={[4.55, 1.3, 3.7]} s={[2.31, 0.025, 0.23]} c="#d3a27d" />
      <Soft p={[4.55, 1.12, 0.92]} s={[2.45, 1.3, 0.17]} c="#936d50" />
      <Soft p={[4, 1.17, 1.35]} s={[0.91, 0.22, 0.59]} c="#eee6d0" r={-0.06} />
      <Soft
        p={[5.08, 1.17, 1.35]}
        s={[0.91, 0.22, 0.59]}
        c="#eee6d0"
        r={0.04}
      />
      <Box p={[2.9, 0.48, 1.05]} s={[0.7, 0.75, 0.75]} c={wood} />
      <Cylinder
        p={[2.9, 0.94, 1.05]}
        top={0.11}
        bottom={0.17}
        h={0.2}
        c={brass}
      />
      <Cylinder
        p={[2.9, 1.17, 1.05]}
        top={0.2}
        bottom={0.26}
        h={0.27}
        c="#e9d9ae"
      />
      <Box p={[1.65, 0.65, 3.45]} s={[0.7, 1.3, 1.55]} c="#9da8b0" />
      <Box p={[1.65, 1.34, 3.45]} s={[0.76, 0.08, 1.6]} c="#d8c49f" />
      <Plant p={[1.65, 1.4, 3.8]} scale={0.4} />
      <Books p={[1.4, 1.4, 3.1]} />
      <Plant p={[5.45, 0, 0.55]} scale={0.75} />
      <Frame p={[3.85, 1.98, 0.14]} c="#a66f50" w={1.3} />
    </group>
  );
}
function Hallway() {
  return (
    <group>
      <Soft
        p={[0.35, 0.035, 1.35]}
        s={[1.1, 0.03, 3]}
        c="#bcac86"
        radius={0.012}
      />
      {Array.from({ length: 10 }, (_, i) => (
        <Box
          key={i}
          p={[0.35, 0.057, 0.05 + i * 0.28]}
          s={[0.99, 0.005, 0.025]}
          c="#d7c69d"
        />
      ))}
      <Box p={[0.35, 0.55, -3.7]} s={[1.25, 0.12, 0.75]} c={wood} />
      {[-0.15, 0.85].map((x) => (
        <Box key={x} p={[x, 0.27, -3.7]} s={[0.08, 0.54, 0.08]} c={darkWood} />
      ))}
      <Box p={[0.25, 0.67, -3.7]} s={[0.65, 0.07, 0.43]} c="#5f7869" />
      <Box p={[0.25, 0.71, -3.7]} s={[0.6, 0.025, 0.4]} c="#eadcba" />
      <Soft
        p={[0.35, 1.1, -3.88]}
        s={[0.61, 0.04, 0.37]}
        c="#293749"
        radius={0.015}
      />
      <Box p={[0.35, 1.33, -4.05]} s={[0.61, 0.45, 0.04]} c="#35475b" />
      <Box p={[0.35, 1.33, -4.02]} s={[0.51, 0.36, 0.008]} c="#9cb9cf" />
      <Box p={[0.83, 0.32, 3.65]} s={[0.5, 0.62, 0.5]} c="#b7976c" />
      <Box p={[0.83, 0.64, 3.65]} s={[0.53, 0.03, 0.53]} c="#c4a97d" />
      <Box p={[0.67, 0.82, 3.58]} s={[0.4, 0.35, 0.4]} c="#cfb58c" />
      <Cylinder
        p={[0.35, 0.04, 4.25]}
        top={0.33}
        bottom={0.33}
        h={0.06}
        c="#7e8a70"
      />
    </group>
  );
}

const FurnishedLivingRoom = memo(LivingRoom),
  FurnishedKitchen = memo(Kitchen),
  FurnishedBathroom = memo(Bathroom),
  FurnishedBedroom = memo(Bedroom),
  FurnishedHallway = memo(Hallway);

class SceneAssetBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Room photographs stay local and are downsampled before GPU upload. */
function RoomPhoto({ url }: { url: string }) {
  const [image, setImage] = useState<{
    texture: Texture;
    aspect: number;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true,
      texture: Texture | undefined,
      bitmap: ImageBitmap | undefined;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Photo unavailable");
        return response.blob();
      })
      .then((blob) =>
        createImageBitmap(blob, {
          resizeWidth: 512,
          resizeQuality: "high",
          imageOrientation: "flipY",
        }),
      )
      .then((decoded) => {
        bitmap = decoded;
        if (!active) {
          decoded.close();
          return;
        }
        texture = new Texture(decoded);
        texture.colorSpace = SRGBColorSpace;
        texture.needsUpdate = true;
        setImage({ texture, aspect: decoded.width / decoded.height });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      texture?.dispose();
      bitmap?.close();
    };
  }, [url]);
  return (
    <group>
      <Box p={[0, 0, 0]} s={[1.45, 1.05, 0.065]} c={wood} />
      <Box p={[0, 0, 0.04]} s={[1.36, 0.96, 0.02]} c="#f3eee1" />
      {image && (
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry
            args={[
              Math.min(1.3, 0.9 * image.aspect),
              Math.min(0.9, 1.3 / image.aspect),
            ]}
          />
          <meshBasicMaterial map={image.texture} toneMapped={false} />
        </mesh>
      )}
      {failed && (
        <SceneLabel
          position={[0, 0, 0.08]}
          text="Photo unavailable"
          color="#c7bda7"
        />
      )}
    </group>
  );
}
function TracedFurniture({ room }: { room: CustomProperty["rooms"][number] }) {
  const scale = Math.max(
    0.12,
    Math.min(room.width / 3.3, room.depth / 3.1, 1.3),
  );
  return (
    <group scale={scale}>
      {room.id === "bedroom" && (
        <>
          <Box p={[0, 0.35, 0.25]} s={[1.75, 0.5, 2.25]} c={wood} />
          <Soft p={[0, 0.7, 0.25]} s={[1.73, 0.28, 2.2]} c="#eee7d6" />
          <Soft p={[0, 0.88, 0.75]} s={[1.75, 0.16, 1.2]} c={room.color} />
          <Soft p={[0, 0.9, -0.85]} s={[1.9, 0.95, 0.14]} c={wood} />
          {[-0.45, 0.45].map((x) => (
            <Soft
              key={x}
              p={[x, 0.91, -0.5]}
              s={[0.7, 0.18, 0.45]}
              c="#f6f0e1"
            />
          ))}
          <Box p={[-1.18, 0.36, -0.65]} s={[0.5, 0.7, 0.55]} c={wood} />
          <Cylinder
            p={[-1.18, 0.86, -0.65]}
            top={0.14}
            bottom={0.2}
            h={0.27}
            c="#e5d6b6"
          />
        </>
      )}
      {room.id === "living" && (
        <>
          <Soft p={[-0.72, 0.37, 0]} s={[0.87, 0.5, 2.3]} c={room.color} />
          <Soft p={[-1.1, 0.8, 0]} s={[0.2, 0.85, 2.3]} c={room.color} />
          {[-0.75, 0, 0.75].map((z) => (
            <Soft
              key={z}
              p={[-0.65, 0.67, z]}
              s={[0.64, 0.12, 0.68]}
              c="#dddcc6"
            />
          ))}
          <Soft p={[-0.68, 0.91, -0.76]} s={[0.16, 0.4, 0.4]} c="#e8d5b2" />
          <Cylinder
            p={[0.38, 0.45, 0]}
            top={0.53}
            bottom={0.53}
            h={0.12}
            c={wood}
          />
          <Cylinder
            p={[0.38, 0.23, 0]}
            top={0.25}
            bottom={0.3}
            h={0.4}
            c={darkWood}
          />
          <Box p={[0.35, 0.55, 0]} s={[0.35, 0.05, 0.25]} c="#bd966e" />
          <Plant p={[0.85, 0, -0.95]} scale={0.65} />
        </>
      )}
      {room.id === "kitchen" && (
        <>
          {[-0.95, 0, 0.95].map((x) => (
            <group key={x}>
              <Box p={[x, 0.5, -0.85]} s={[0.91, 1, 0.75]} c={room.color} />
              <Box
                p={[x, 0.52, -0.45]}
                s={[0.83, 0.86, 0.035]}
                c={room.color}
              />
              <Box
                p={[x + 0.25, 0.8, -0.42]}
                s={[0.18, 0.035, 0.03]}
                c={brass}
              />
            </group>
          ))}
          <Box p={[0, 1.05, -0.85]} s={[2.9, 0.1, 0.87]} c="#ede6d6" />
          <Box p={[-0.85, 1.12, -0.85]} s={[0.7, 0.025, 0.55]} c="#34423b" />
          {[-0.18, 0.18].map((x) => (
            <mesh
              key={x}
              position={[-0.85 + x, 1.14, -0.85]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.1, 0.012, 6, 20]} />
              <meshStandardMaterial color="#9da69b" />
            </mesh>
          ))}
          <Box p={[0.8, 1.12, -0.85]} s={[0.6, 0.03, 0.45]} c="#9baba0" />
          <Cylinder p={[0.8, 1.29, -1.05]} top={0.025} h={0.4} c={brass} />
          <Soft p={[0.7, 0.8, 0.65]} s={[1.4, 0.13, 0.7]} c={wood} />
          <Box p={[0.7, 0.4, 0.65]} s={[0.2, 0.8, 0.2]} c={darkWood} />
          <Chair p={[-0.3, 0, 0.7]} r={Math.PI / 2} />
        </>
      )}
      {room.id === "bathroom" && (
        <>
          <Soft
            p={[0.35, 0.35, -0.65]}
            s={[1.9, 0.6, 1]}
            c="#f2eee1"
            radius={0.18}
          />
          <Soft
            p={[0.35, 0.68, -0.65]}
            s={[1.6, 0.07, 0.75]}
            c="#b7cdd8"
            radius={0.025}
          />
          <Cylinder p={[1.1, 1, -0.65]} top={0.025} h={1.3} c={brass} />
          <Box p={[0.96, 1.66, -0.65]} s={[0.32, 0.05, 0.05]} c={brass} />
          <Box p={[-1, 0.45, 0.65]} s={[0.7, 0.9, 0.65]} c={wood} />
          <Soft p={[-1, 0.98, 0.65]} s={[0.8, 0.15, 0.75]} c="#f2eee1" />
          <Cylinder
            p={[-1, 1.07, 0.65]}
            top={0.24}
            bottom={0.17}
            h={0.12}
            c="#f8f4e8"
          />
          <Plant p={[0.95, 0, 0.85]} scale={0.6} />
        </>
      )}
      {room.id === "hallway" && (
        <>
          <Soft
            p={[0, 0.035, 0]}
            s={[1.1, 0.03, 2.4]}
            c={room.color}
            radius={0.012}
          />
          <Box p={[0.8, 0.62, -0.85]} s={[1, 0.12, 0.65]} c={wood} />
          {[0.45, 1.15].map((x) => (
            <Box
              key={x}
              p={[x, 0.3, -0.85]}
              s={[0.07, 0.6, 0.07]}
              c={darkWood}
            />
          ))}
          <Books p={[0.45, 0.73, -0.85]} />
          <Plant p={[-0.9, 0, -0.85]} scale={0.75} />
        </>
      )}
    </group>
  );
}
const MemoTracedFurniture = memo(TracedFurniture);

function TracedRoom({
  room,
  onSelect,
}: {
  room: CustomProperty["rooms"][number];
  onSelect: () => void;
}) {
  const floor = room.id === "bathroom" ? "#c6d0d7" : "#d4b991";
  const planks = Math.min(24, Math.max(3, Math.floor(room.depth / 0.32)));
  const photoScale = Math.min(1, room.width / 2, room.depth / 2);
  return (
    <group position={[room.x, 0, room.z]}>
      <Box
        p={[0, -0.03, 0]}
        s={[room.width, 0.08, room.depth]}
        c={floor}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      />
      {Array.from({ length: planks }, (_, i) => (
        <Box
          key={i}
          p={[0, 0.015, -room.depth / 2 + ((i + 0.5) * room.depth) / planks]}
          s={[
            Math.max(0.1, room.width - 0.04),
            0.012,
            Math.max(0.02, room.depth / planks - 0.018),
          ]}
          c={
            room.id === "bathroom"
              ? i % 2
                ? "#cbd7df"
                : "#c1ced7"
              : i % 2
                ? "#d9c19e"
                : "#d3b793"
          }
        />
      ))}
      <Box
        p={[0, 0.8, -room.depth / 2]}
        s={[room.width + 0.08, 1.6, 0.12]}
        c="#e8e2d2"
      />
      <Box
        p={[-room.width / 2, 0.56, 0]}
        s={[0.12, 1.12, room.depth]}
        c="#e0dece"
      />
      <Box
        p={[0, 1.63, -room.depth / 2]}
        s={[room.width + 0.14, 0.065, 0.16]}
        c="#f1ebdd"
      />
      <Box
        p={[-room.width / 2, 1.15, 0]}
        s={[0.16, 0.06, room.depth + 0.08]}
        c="#eee7d7"
      />
      <MemoTracedFurniture room={room} />
      {room.photoUrl && (
        <group position={[0, 1.12, -room.depth / 2 + 0.09]} scale={photoScale}>
          <RoomPhoto key={room.photoUrl} url={room.photoUrl} />
        </group>
      )}
      <SceneLabel
        position={[0, 0.14, Math.max(0, room.depth / 2 - 0.25)]}
        text={room.name}
        color={room.color}
      />
    </group>
  );
}
function CustomApartment({
  property,
  onRoomSelect,
}: {
  property: CustomProperty;
  onRoomSelect: (id: string) => void;
}) {
  return (
    <group>
      <Soft
        p={[0, -0.49, 0]}
        s={[property.width + 0.55, 0.65, property.depth + 0.55]}
        c="#39424d"
        radius={0.13}
      />
      <Soft
        p={[0, -0.12, 0]}
        s={[property.width + 0.3, 0.15, property.depth + 0.3]}
        c="#d5c7ad"
        radius={0.055}
      />
      {!property.splatUrl &&
        property.rooms.map((room) => (
          <TracedRoom
            key={room.id}
            room={room}
            onSelect={() => onRoomSelect(room.id)}
          />
        ))}
    </group>
  );
}
function ScanAsset({ property }: { property: CustomProperty }) {
  const [result, setResult] = useState<
    { scale: number; offset: Point; error?: never } | { error: string } | null
  >(null);
  useEffect(() => {
    let active = true;
    fetch(property.splatUrl!)
      .then((response) => {
        if (!response.ok) throw new Error("The scan file is unavailable.");
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (!buffer.byteLength || buffer.byteLength % 32)
          throw new Error(
            "This file is not a supported 32-byte Gaussian .splat.",
          );
        const data = new Float32Array(buffer),
          min = [Infinity, Infinity, Infinity],
          max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < data.length; i += 8) {
          for (let axis = 0; axis < 3; axis++) {
            const value = data[i + axis];
            if (!Number.isFinite(value))
              throw new Error("The scan contains invalid coordinates.");
            min[axis] = Math.min(min[axis], value);
            max[axis] = Math.max(max[axis], value);
          }
        }
        const span = max.map((v, i) => Math.max(0.01, v - min[i]));
        const scale = Math.min(
          property.width / span[0],
          property.depth / span[2],
          5 / span[1],
        );
        const offset: Point = [
          (-(min[0] + max[0]) / 2) * scale,
          max[1] * scale + 0.05,
          ((min[2] + max[2]) / 2) * scale,
        ];
        if (active) setResult({ scale, offset });
      })
      .catch((error) => {
        if (active)
          setResult({
            error:
              error instanceof Error
                ? error.message
                : "The scan could not be opened.",
          });
      });
    return () => {
      active = false;
    };
  }, [property]);
  if (!result)
    return (
      <SceneLabel
        position={[0, 1.5, 0]}
        text="Opening your 3D scan…"
        color="#c7bda7"
      />
    );
  if ("error" in result)
    return (
      <SceneLabel
        position={[0, 1.5, 0]}
        text={result.error ?? "The scan could not be opened."}
        color="#e5a985"
      />
    );
  return (
    <group position={result.offset} scale={result.scale}>
      <Splat src={property.splatUrl!} toneMapped={false} alphaTest={0.01} />
    </group>
  );
}

function Apartment({ onRoomSelect }: { onRoomSelect: (id: string) => void }) {
  return (
    <group>
      <Soft
        p={[0, -0.54, 0]}
        s={[12.65, 0.62, 9.65]}
        c="#39424d"
        radius={0.15}
      />
      <Soft p={[0, -0.19, 0]} s={[12.3, 0.22, 9.3]} c="#d9cbb0" radius={0.08} />
      <Box p={[0, -0.06, 0]} s={[12, 0.13, 9]} c="#d0b38b" />
      {Array.from({ length: 29 }, (_, z) => (
        <group key={z}>
          {Array.from({ length: 6 }, (_, x) => (
            <Box
              key={x}
              p={[-5 + x * 2, 0.008, -4.35 + z * 0.3]}
              s={[1.97, 0.016, 0.285]}
              c={["#c6a47c", "#d3b58e", "#cbae86", "#d6b993"][(x + z) % 4]}
            />
          ))}
        </group>
      ))}
      <Box p={[0, 1.3, -4.5]} s={[12.2, 2.6, 0.18]} c={cream} />
      <Box p={[-6, 1.3, 0]} s={[0.18, 2.6, 9]} c="#dedcc9" />
      <Box p={[6, 0.7, 0]} s={[0.18, 1.4, 9]} c="#e2dac3" />
      <Box p={[0, 0.15, 4.5]} s={[12.2, 0.3, 0.18]} c="#e9dfc7" />
      <Box p={[-6, 2.63, 0]} s={[0.24, 0.09, 9.1]} c="#f5edda" />
      <Box p={[0, 2.63, -4.5]} s={[12.3, 0.09, 0.24]} c="#f5edda" />
      <Box p={[-3.35, 0.7, 0]} s={[5.3, 1.4, 0.15]} c="#e9dfc7" />
      <Box p={[3.65, 0.65, 0]} s={[4.7, 1.3, 0.15]} c="#e9dfc7" />
      {[-0.65, 1.3].map((x) => (
        <group key={x}>
          <Box p={[x, 0.72, -3.5]} s={[0.14, 1.44, 2]} c="#e9dfc7" />
          <Box p={[x, 0.72, 0.03]} s={[0.14, 1.44, 1.3]} c="#e9dfc7" />
          <Box p={[x, 0.72, 3.5]} s={[0.14, 1.44, 2]} c="#e9dfc7" />
          <Box p={[x, 1.48, -3.5]} s={[0.2, 0.06, 2.05]} c="#f6edda" />
          <Box p={[x, 1.48, 0.03]} s={[0.2, 0.06, 1.34]} c="#f6edda" />
        </group>
      ))}
      <Window p={[-4.55, 1.64, -4.36]} w={1.5} />
      <Window p={[0.35, 1.8, -4.36]} w={1.05} />
      <group position={[-5.88, 1.62, 2.2]} rotation={[0, Math.PI / 2, 0]}>
        <Window p={[0, 0, 0]} w={2.35} />
      </group>
      <group position={[-5.88, 1.62, -1.5]} rotation={[0, Math.PI / 2, 0]}>
        <Frame p={[0, 0, 0]} w={1.1} />
      </group>
      <FurnishedLivingRoom />
      <FurnishedKitchen />
      <FurnishedBathroom />
      <FurnishedBedroom />
      <FurnishedHallway />
      {Object.entries(willowRooms).map(([id, room]) => (
        <group key={id} position={[room.point[0], 0.08, room.point[2]]}>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onRoomSelect(id);
            }}
          >
            <planeGeometry args={id === "hallway" ? [1.3, 7] : [4.7, 3.7]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** DOM anchors avoid nested React roots and remain readable at every camera zoom. */
function SceneLabel({
  position,
  text,
  color,
  detail,
  kind = "agent",
  onSelect,
  accessibleLabel,
}: {
  position: Point;
  text: string;
  color: string;
  detail?: string;
  kind?: "agent" | "finding";
  onSelect?: () => void;
  accessibleLabel?: string;
}) {
  const anchor = useRef<Group>(null),
    element = useRef<HTMLElement | null>(null);
  const { gl } = useThree();
  const projected = useMemo(() => new Vector3(), []);
  useEffect(() => {
    const node = document.createElement(kind === "finding" ? "button" : "div");
    Object.assign(node.style, {
      position: "absolute",
      left: "0",
      top: "0",
      whiteSpace: "nowrap",
      fontFamily: "var(--font-geist-sans), sans-serif",
      fontSize: kind === "finding" ? "16px" : "11px",
      fontWeight: kind === "finding" ? "800" : "400",
      color: kind === "finding" ? "#302d24" : "#f4efdc",
      pointerEvents: kind === "finding" ? "auto" : "none",
      zIndex: "4",
      textAlign: "center",
    });
    if (kind === "finding") {
      Object.assign(node.style, {
        width: "44px",
        height: "44px",
        border: "0",
        background: "transparent",
        padding: "0",
        cursor: "pointer",
      });
      node.textContent = text;
      node.setAttribute("aria-label", accessibleLabel ?? text);
      node.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect?.();
      });
    } else {
      Object.assign(node.style, {
        padding: "5px 8px",
        background: "rgba(37,39,43,.92)",
        borderRadius: "7px",
        boxShadow: "0 3px 12px #0002",
      });
      const dot = document.createElement("span");
      Object.assign(dot.style, {
        display: "inline-block",
        width: "5px",
        height: "5px",
        borderRadius: "50%",
        background: color,
        marginRight: "5px",
      });
      node.append(dot, document.createTextNode(text));
      if (detail) {
        const task = document.createElement("span");
        task.textContent = detail;
        Object.assign(task.style, {
          display: "block",
          fontSize: "9px",
          opacity: ".75",
          maxWidth: "150px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          marginTop: "3px",
        });
        node.append(task);
      }
    }
    gl.domElement.parentElement?.appendChild(node);
    element.current = node;
    return () => {
      node.remove();
      element.current = null;
    };
  }, [gl, text, color, detail, kind, onSelect, accessibleLabel]);
  useFrame(({ camera, size }) => {
    if (!anchor.current || !element.current) return;
    anchor.current.getWorldPosition(projected);
    projected.project(camera);
    element.current.style.display =
      projected.z > 1 || projected.z < -1 ? "none" : "block";
    element.current.style.transform = `translate3d(${(projected.x * 0.5 + 0.5) * size.width}px,${(-projected.y * 0.5 + 0.5) * size.height}px,0) translate(-50%,-50%)`;
  });
  return <group ref={anchor} position={position} />;
}
const names: Record<string, string> = {
  inspector: "Scout",
  energy: "Watt",
  maintenance: "Fix",
  manager: "Cleo",
};
const agentOffsets: Record<string, Point> = {
  inspector: [-0.3, 0, 0.4],
  energy: [0.3, 0, -0.2],
  maintenance: [0.35, 0, 0.55],
  manager: [0, 0, 0],
};
function targetFarnsworth(agent: SceneAgent): Vector3 {
  if (agent.id === "manager") return new Vector3(...farnsworthOffice);
  if (agent.state.toLowerCase() === "idle") {
    const index = agent.id === "inspector" ? 0 : agent.id === "energy" ? 1 : 2;
    const stations: Point[] = [
      [-4.2, 0, 0.6],
      [-2.8, 0, -0.2],
      [-1.2, 0, 1.7],
    ];
    return new Vector3(...stations[index]);
  }
  const point =
    farnsworthZones[agent.roomId]?.point ?? farnsworthZones.hallway.point;
  return new Vector3(
    point[0] + (agent.id === "inspector" ? -0.15 : 0.1),
    0,
    point[2] + (agent.id === "maintenance" ? 0.3 : 0),
  );
}
function targetFor(agent: SceneAgent): Vector3 {
  if (
    agent.state.toLowerCase() === "idle" &&
    agent.id !== "manager" &&
    agent.roomId === "hallway"
  ) {
    const queue: Record<string, number> = {
      inspector: 1.9,
      energy: -0.9,
      maintenance: 0.45,
    };
    return new Vector3(0.35, 0, queue[agent.id] ?? 0);
  }
  if (
    agent.id === "manager" &&
    (agent.roomId === "hallway" ||
      agent.state === "Idle" ||
      agent.state === "Waiting")
  )
    return new Vector3(0.35, 0, -2.6);
  const point =
      agent.roomId === "living"
        ? [-3.1, 0, 3.25]
        : agent.roomId === "bedroom"
          ? [2.1, 0, 2]
          : agent.roomId === "kitchen"
            ? [-2.3, 0, -2]
            : (willowRooms[agent.roomId]?.point ?? willowRooms.hallway.point),
    offset = agentOffsets[agent.id] ?? [0, 0, 0];
  return new Vector3(point[0] + offset[0], 0, point[2] + offset[2]);
}
function Robot({
  customPoint,
  previewScale = 1,
  agent,
  selected,
  onSelect,
  positions,
}: {
  customPoint?: Point;
  previewScale?: number;
  agent: SceneAgent;
  selected: boolean;
  onSelect: () => void;
  positions: Map<string, Vector3>;
}) {
  const roomMap = useContext(SceneRooms),
    propertyId = useContext(SceneProperty);
  const reducedMotion = useContext(ReducedMotion);
  const group = useRef<Group>(null),
    body = useRef<Group>(null),
    scan = useRef<Mesh>(null),
    antenna = useRef<Mesh>(null);
  const destination = useMemo(
    () =>
      customPoint
        ? new Vector3(...customPoint)
        : propertyId === "farnsworth"
          ? targetFarnsworth(agent)
          : targetFor(agent),
    [agent, customPoint, propertyId],
  );
  const [initial] = useState(() =>
      customPoint
        ? new Vector3(...customPoint)
        : propertyId === "farnsworth"
          ? targetFarnsworth(agent)
          : targetFor(agent),
    ),
    path = useRef<Vector3[]>([]),
    lastRoom = useRef(agent.roomId);
  const normalizedState = agent.state.toLowerCase(),
    investigating = normalizedState === "investigating";
  useEffect(() => {
    if (!group.current) return;
    const p = group.current.position;
    if (p.distanceTo(destination) < 0.05) return;
    const queuedDestination = path.current[path.current.length - 1];
    if (
      lastRoom.current === agent.roomId &&
      queuedDestination &&
      queuedDestination.distanceTo(destination) < 0.001
    )
      return;
    const route: Vector3[] = [];
    if (lastRoom.current !== agent.roomId) {
      // All inter-room journeys pass through the door openings and central corridor.
      const old = roomMap[lastRoom.current]?.point;
      if (propertyId === "farnsworth")
        route.push(
          ...farnsworthRoute(lastRoom.current, agent.roomId).map(
            (point) => new Vector3(...point),
          ),
        );
      else {
        if (old && lastRoom.current !== "hallway")
          route.push(
            new Vector3(
              lastRoom.current === "living"
                ? -1.8
                : lastRoom.current === "kitchen"
                  ? -2
                  : old[0],
              0,
              old[2] < 0 ? -2 : 2,
            ),
            new Vector3(0.35, 0, old[2] < 0 ? -2 : 2),
          );
        if (agent.roomId !== "hallway")
          route.push(
            new Vector3(0.35, 0, destination.z < 0 ? -2 : 2),
            new Vector3(
              agent.roomId === "living" ? -1.8 : destination.x,
              0,
              destination.z < 0 ? -2 : 2,
            ),
          );
      }
    }
    route.push(destination.clone());
    path.current = route;
    lastRoom.current = agent.roomId;
  }, [destination, agent.roomId, propertyId, roomMap]);
  useFrame(({ clock }, dt) => {
    if (!group.current || !body.current) return;
    if (customPoint) {
      group.current.position.copy(destination);
      path.current = [];
    }
    if (reducedMotion) {
      group.current.position.copy(destination);
      path.current = [];
      body.current.position.y = 0.035;
      body.current.rotation.z = 0;
      positions.set(agent.id, group.current.position.clone());
      return;
    }
    const current = group.current.position,
      next = path.current[0];
    let moving = false;
    if (next) {
      const delta = next.clone().sub(current);
      if (delta.length() < 0.06) {
        current.copy(next);
        path.current.shift();
      } else {
        current.addScaledVector(
          delta.normalize(),
          Math.min(dt, 0.05) * (propertyId === "farnsworth" ? 2.1 : 1.5),
        );
        body.current.rotation.y = Math.atan2(delta.x, delta.z);
        moving = true;
      }
    }
    body.current.position.y =
      0.035 +
      Math.sin(clock.elapsedTime * (moving ? 13 : 2.3)) *
        (moving ? 0.045 : 0.012);
    body.current.rotation.z = moving
      ? Math.sin(clock.elapsedTime * 13) * 0.045
      : 0;
    if (scan.current) {
      scan.current.rotation.z = clock.elapsedTime * 0.8;
      scan.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.09);
    }
    if (antenna.current) {
      const material = antenna.current.material;
      if (!Array.isArray(material) && "emissiveIntensity" in material)
        material.emissiveIntensity =
          0.8 + Math.sin(clock.elapsedTime * 4) * 0.5;
    }
    positions.set(agent.id, current.clone());
  });
  return (
    <group
      ref={group}
      position={initial}
      scale={propertyId === "farnsworth" && !customPoint ? 1.18 : previewScale}
    >
      <group
        ref={body}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.38, 48]} />
          <meshBasicMaterial
            color={agent.color}
            transparent
            opacity={selected ? 0.9 : 0.3}
          />
        </mesh>
        <Soft
          p={[0, 0.48, 0]}
          s={[0.48, 0.48, 0.37]}
          c={agent.color}
          radius={0.13}
        />
        <Soft
          p={[0, 0.86, 0.025]}
          s={[0.64, 0.48, 0.49]}
          c="#f4eddb"
          radius={0.14}
        />
        <Soft
          p={[0, 0.86, 0.278]}
          s={[0.49, 0.29, 0.035]}
          c="#263c36"
          radius={0.07}
        />
        {[-0.13, 0.13].map((x) => (
          <mesh key={x} position={[x, 0.88, 0.301]}>
            <capsuleGeometry args={[0.032, 0.065, 4, 8]} />
            <meshStandardMaterial
              color={agent.color}
              emissive={agent.color}
              emissiveIntensity={1.8}
            />
          </mesh>
        ))}
        <Box p={[0, 0.77, 0.305]} s={[0.06, 0.015, 0.01]} c="#9bc8a8" />
        <Cylinder p={[0, 1.16, 0]} top={0.025} h={0.16} c={brass} />
        <mesh ref={antenna} position={[0, 1.26, 0]}>
          <sphereGeometry args={[0.07, 16, 12]} />
          <meshStandardMaterial
            color={agent.color}
            emissive={agent.color}
            emissiveIntensity={1}
          />
        </mesh>
        <Sphere
          p={[-0.34, 0.48, 0.02]}
          s={[0.085, 0.18, 0.09]}
          c={agent.color}
        />
        <Sphere
          p={[0.34, 0.48, 0.02]}
          s={[0.085, 0.18, 0.09]}
          c={agent.color}
        />
        <Soft
          p={[-0.15, 0.16, 0.08]}
          s={[0.21, 0.2, 0.35]}
          c="#ebe5d3"
          radius={0.07}
        />
        <Soft
          p={[0.15, 0.16, 0.08]}
          s={[0.21, 0.2, 0.35]}
          c="#ebe5d3"
          radius={0.07}
        />
        <Box p={[0, 0.46, 0.195]} s={[0.15, 0.14, 0.03]} c="#f3ecdb" />
        <Box p={[0, 0.46, 0.216]} s={[0.055, 0.055, 0.013]} c={agent.color} />
        {agent.id === "maintenance" && (
          <group position={[0.37, 0.45, 0.1]} rotation={[0, 0, -0.3]}>
            <Box p={[0, 0, 0]} s={[0.05, 0.35, 0.05]} c={brass} />
            <Box p={[0, 0.16, 0]} s={[0.17, 0.055, 0.08]} c="#77847a" />
          </group>
        )}
        {agent.id === "inspector" && (
          <Soft
            p={[0.36, 0.51, 0.13]}
            s={[0.18, 0.12, 0.16]}
            c="#526e7a"
            radius={0.03}
          />
        )}
      </group>
      {(investigating || selected) && (
        <mesh
          ref={scan}
          position={[0, 0.07, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.62, 0.64, 64, 1, 0, Math.PI * 1.7]} />
          <meshBasicMaterial
            color={agent.color}
            transparent
            opacity={0.7}
            depthWrite={false}
          />
        </mesh>
      )}
      {investigating && (
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.7, 0.7, 1.1, 48, 1, true]} />
          <meshBasicMaterial
            color={agent.color}
            transparent
            opacity={0.045}
            depthWrite={false}
          />
        </mesh>
      )}
      <SceneLabel
        position={[0, 1.55, 0]}
        text={names[agent.id] ?? agent.id}
        color={agent.color}
        detail={selected || investigating ? agent.task : undefined}
      />
    </group>
  );
}
function Handoff({
  handoff,
  positions,
  color,
}: {
  handoff: { id: string; from: string; to: string };
  positions: Map<string, Vector3>;
  color: string;
}) {
  const packet = useRef<Mesh>(null),
    started = useRef<number | null>(null);
  useFrame(({ clock }) => {
    const origin = positions.get(handoff.from),
      target = positions.get(handoff.to);
    if (!packet.current || !origin || !target) return;
    if (started.current === null) started.current = clock.elapsedTime;
    const t = (clock.elapsedTime - started.current) / 2.4;
    packet.current.visible = t <= 1;
    if (t > 1) return;
    packet.current.position.copy(origin).lerp(target, t);
    packet.current.position.y = 0.9 + Math.sin(t * Math.PI) * 1.6;
    packet.current.rotation.y = clock.elapsedTime * 4;
  });
  return (
    <mesh ref={packet} visible={false}>
      <octahedronGeometry args={[0.15]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
      />
    </mesh>
  );
}
function FindingMarker({
  finding,
  onSelect,
}: {
  finding: SceneFinding;
  onSelect: () => void;
}) {
  const reducedMotion = useContext(ReducedMotion);
  const marker = useRef<Group>(null),
    ring = useRef<Mesh>(null);
  const roomMap = useContext(SceneRooms);
  const point = roomMap[finding.roomId]?.point ?? roomMap.hallway.point;
  const color =
    finding.category === "energy"
      ? "#b68aff"
      : finding.severity === "high" || finding.severity === "critical"
        ? "#ee8d69"
        : "#e7ba75";
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    if (marker.current)
      marker.current.position.y = 1.95 + Math.sin(clock.elapsedTime * 2) * 0.07;
    if (ring.current) {
      ring.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.08);
    }
  });
  return (
    <group position={[point[0] + 0.75, 0, point[2] - 0.4]}>
      <mesh ref={ring} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.41, 0.45, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
      <Line
        points={[
          [0, 0.1, 0],
          [0, 1.8, 0],
        ]}
        color={color}
        transparent
        opacity={0.45}
        lineWidth={1}
      />
      <group
        ref={marker}
        position={[0, 1.95, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.32, 0.32, 0.16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.25}
          />
        </mesh>
        <SceneLabel
          position={[0, 0, 0]}
          text={finding.category === "energy" ? "ϟ" : "!"}
          color={color}
          kind="finding"
          onSelect={onSelect}
          accessibleLabel={`Open finding ${finding.id}`}
        />
      </group>
    </group>
  );
}
function EnergyZone() {
  const source = useContext(SceneProperty),
    farnsworth = source === "farnsworth";
  const reducedMotion = useContext(ReducedMotion);
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    if (group.current)
      group.current.children.forEach((child, i) => {
        child.position.y =
          0.06 + ((clock.elapsedTime * 0.18 + i * 0.25) % 1) * 0.8;
      });
  });
  return (
    <group position={farnsworth ? [4.2, 0, -3.65] : [-3.3, 0, -2.25]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <planeGeometry args={farnsworth ? [7.2, 1.15] : [5.15, 4.1]} />
        <meshBasicMaterial
          color="#ac7bf7"
          transparent
          opacity={0.19}
          depthWrite={false}
        />
      </mesh>
      <group ref={group}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry
              args={
                farnsworth
                  ? [0.25 + i * 0.1, 0.27 + i * 0.1, 64]
                  : [1.2 + i * 0.2, 1.22 + i * 0.2, 64]
              }
            />
            <meshBasicMaterial
              color="#b891ff"
              transparent
              opacity={0.25 - i * 0.05}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
function CameraRig({
  propertyId,
  customProperty,
  cameraMode,
  focusRoom,
  selectedAgent,
  resetKey,
  positions,
}: {
  propertyId?: "farnsworth" | "willow";
  customProperty?: CustomProperty | null;
  cameraMode: PropertySceneProps["cameraMode"];
  focusRoom: string | null;
  selectedAgent: string | null;
  resetKey: number;
  handoff?: { id: string; from: string; to: string };
  positions: Map<string, Vector3>;
}) {
  const roomMap = useContext(SceneRooms);
  const reducedMotion = useContext(ReducedMotion);
  const controls = useRef<OrbitControlsType>(null),
    { size } = useThree();
  const transition = useRef(true),
    wanted = useRef(new Vector3(0, 0, 0)),
    desiredZoom = useRef(47),
    desiredPosition = useRef(new Vector3(13, 15, 18));
  useEffect(() => {
    const fitWidth = customProperty
      ? customProperty.width * 0.81 + customProperty.depth * 0.59 + 3
      : propertyId === "farnsworth"
        ? farnsworthOverview.width * (size.width < 700 ? 0.5 : 0.81) +
          farnsworthOverview.depth * (size.width < 700 ? 0.86 : 0.59) +
          3
        : 17;
    const fitHeight = customProperty
      ? customProperty.width * 0.35 + customProperty.depth * 0.49 + 5
      : propertyId === "farnsworth"
        ? farnsworthOverview.width * (size.width < 700 ? 0.55 : 0.35) +
          farnsworthOverview.depth * (size.width < 700 ? 0.32 : 0.49) +
          5
        : 13;
    const base = Math.min(size.width / fitWidth, size.height / fitHeight);
    const perspective = Boolean(customProperty?.splatUrl);
    desiredZoom.current = perspective
      ? 1
      : cameraMode === "follow"
        ? base * 1.45
        : focusRoom
          ? base * 1.3
          : base;
    const customRoom = customProperty?.rooms.find(
      (room) => room.id === focusRoom,
    );
    const p = customProperty
      ? customRoom
        ? [customRoom.x, 0, customRoom.z]
        : [0, 0, 0]
      : focusRoom && roomMap[focusRoom]
        ? roomMap[focusRoom].point
        : propertyId === "farnsworth"
          ? [
              farnsworthOverview.centre[0] - (size.width > 900 ? 2 : 0),
              0,
              farnsworthOverview.centre[2] + (size.width > 900 ? 1.4 : 0),
            ]
          : size.width > 900
            ? [-1.1, 0, 0.8]
            : [0, 0, 0];
    wanted.current.set(p[0], 0, p[2]);
    desiredPosition.current
      .copy(wanted.current)
      .add(
        cameraMode === "top"
          ? new Vector3(0, 23, 0.01)
          : propertyId === "farnsworth" && size.width < 700
            ? new Vector3(24, 26, 14)
            : new Vector3(13, 15, 18),
      );
    if (perspective) {
      const distance = size.height / base / (2 * Math.tan(Math.PI / 8));
      desiredPosition.current
        .sub(wanted.current)
        .normalize()
        .multiplyScalar(distance)
        .add(wanted.current);
    } else if (customProperty || propertyId === "farnsworth") {
      desiredPosition.current
        .sub(wanted.current)
        .multiplyScalar(
          Math.max(
            1,
            (customProperty
              ? Math.max(customProperty.width, customProperty.depth)
              : farnsworthOverview.width) / 14,
          ),
        )
        .add(wanted.current);
    }
    transition.current = true;
  }, [
    focusRoom,
    cameraMode,
    resetKey,
    size,
    customProperty,
    propertyId,
    roomMap,
  ]);
  useFrame(({ camera }, dt) => {
    if (!controls.current) return;
    if (cameraMode === "follow" && selectedAgent) {
      const pos = positions.get(selectedAgent);
      if (pos) {
        wanted.current.copy(pos);
        desiredPosition.current.copy(pos).add(new Vector3(10, 12, 14));
        transition.current = true;
      }
    }
    if (transition.current) {
      const factor = reducedMotion ? 1 : 1 - Math.exp(-dt * 3);
      camera.position.lerp(desiredPosition.current, factor);
      controls.current.target.lerp(wanted.current, factor);
      const cam = camera as OrthographicCamera;
      cam.zoom += (desiredZoom.current - cam.zoom) * factor;
      cam.updateProjectionMatrix();
      if (
        cameraMode !== "follow" &&
        camera.position.distanceTo(desiredPosition.current) < 0.025 &&
        Math.abs(cam.zoom - desiredZoom.current) < 0.025 &&
        controls.current.target.distanceTo(wanted.current) < 0.025
      )
        transition.current = false;
      controls.current.update();
    }
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      minZoom={12}
      maxZoom={130}
      minDistance={2}
      maxDistance={300}
      minPolarAngle={0.01}
      maxPolarAngle={Math.PI / 2.1}
      enableDamping={!reducedMotion}
      dampingFactor={0.06}
      onStart={() => {
        transition.current = false;
      }}
    />
  );
}
function World(props: PropertySceneProps) {
  const reducedMotion = useContext(ReducedMotion);
  const positions = useMemo(() => new Map<string, Vector3>(), []);
  return (
    <>
      <color attach="background" args={["#25272b"]} />
      <fog
        attach="fog"
        args={[
          "#25272b",
          props.customProperty
            ? Math.max(props.customProperty.width, props.customProperty.depth) *
                6 +
              40
            : props.propertyId === "farnsworth"
              ? 110
              : 35,
          props.customProperty
            ? 600
            : props.propertyId === "farnsworth"
              ? 300
              : 80,
        ]}
      />
      <ambientLight intensity={1.2} color="#fff9ee" />
      <hemisphereLight args={["#edf0f4", "#717780", 1.25]} />
      <directionalLight
        position={[-5, 12, 6]}
        intensity={2.8}
        color="#ffe9cc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={props.propertyId === "farnsworth" ? -30 : -10}
        shadow-camera-right={props.propertyId === "farnsworth" ? 30 : 10}
        shadow-camera-top={props.propertyId === "farnsworth" ? 25 : 10}
        shadow-camera-bottom={props.propertyId === "farnsworth" ? -25 : -10}
        shadow-radius={4}
        shadow-normalBias={0.03}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[8, 8, -6]} intensity={1.3} color="#dce5ef" />
      <mesh
        position={[
          0,
          !props.customProperty && props.propertyId === "farnsworth"
            ? -1.75
            : -0.92,
          0,
        ]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial color="#25272b" toneMapped={false} />
      </mesh>
      <mesh
        position={
          !props.customProperty && props.propertyId === "farnsworth"
            ? [-3.2, -1.745, 3.5]
            : [0.25, -0.915, 0.15]
        }
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry
          args={
            !props.customProperty && props.propertyId === "farnsworth"
              ? [43, 30]
              : [20, 16]
          }
        />
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexShader={`varying vec2 shadowUv; void main() { shadowUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
          fragmentShader={`varying vec2 shadowUv; void main() { vec2 p=(shadowUv-0.5)*2.0; float d=length(p); float alpha=(1.0-smoothstep(0.2,1.0,d))*0.5; gl_FragColor=vec4(0.025,0.03,0.04,alpha); }`}
        />
      </mesh>
      {props.customProperty ? (
        <CustomApartment
          property={props.customProperty}
          onRoomSelect={props.onRoomSelect}
        />
      ) : props.propertyId === "farnsworth" ? (
        <FarnsworthHouse onRoomSelect={props.onRoomSelect} />
      ) : (
        <Apartment onRoomSelect={props.onRoomSelect} />
      )}
      {props.customProperty?.splatUrl && (
        <SceneAssetBoundary
          key={props.customProperty.splatUrl}
          fallback={
            <SceneLabel
              position={[0, 1.5, 0]}
              text="This scan could not be rendered. Try another trained .splat file."
              color="#e5a985"
            />
          }
        >
          <Suspense
            fallback={
              <SceneLabel
                position={[0, 1.5, 0]}
                text="Loading Gaussian scan…"
                color="#c7bda7"
              />
            }
          >
            <ScanAsset property={props.customProperty} />
          </Suspense>
        </SceneAssetBoundary>
      )}
      {props.customProperty
        ? !props.customProperty.splatUrl &&
          props.customProperty.rooms.length > 0 &&
          props.agents.map((agent, index) => {
            const preferred =
              agent.id === "energy"
                ? "kitchen"
                : agent.id === "maintenance"
                  ? "bathroom"
                  : agent.id === "manager"
                    ? "hallway"
                    : "living";
            const room =
              props.customProperty!.rooms.find(
                (room) => room.id === preferred,
              ) ??
              props.customProperty!.rooms[
                index % props.customProperty!.rooms.length
              ];
            const scale = Math.min(
              1,
              Math.max(0.2, Math.min(room.width, room.depth) / 2),
            );
            const point: Point = [
              room.x + (index % 2 ? 0.2 : -0.2) * scale,
              0,
              room.z + room.depth * 0.3,
            ];
            return (
              <Robot
                key={`custom-${agent.id}-${room.id}`}
                agent={{
                  ...agent,
                  roomId: room.id,
                  state: "Idle",
                  task: "Property preview · no inspection running",
                }}
                customPoint={point}
                previewScale={scale}
                selected={props.selectedAgent === agent.id}
                onSelect={() => props.onAgentSelect(agent.id)}
                positions={positions}
              />
            );
          })
        : props.agents.map((agent) => (
            <Robot
              key={agent.id}
              agent={agent}
              selected={props.selectedAgent === agent.id}
              onSelect={() => props.onAgentSelect(agent.id)}
              positions={positions}
            />
          ))}
      {props.handoff && !props.customProperty && !reducedMotion && (
        <Handoff
          key={props.handoff.id}
          handoff={props.handoff}
          positions={positions}
          color={
            props.agents.find((a) => a.id === props.handoff?.from)?.color ??
            "#e5a985"
          }
        />
      )}
      {!props.customProperty &&
        props.findings.map((f) => (
          <FindingMarker
            key={f.id}
            finding={f}
            onSelect={() => props.onFindingSelect(f.id)}
          />
        ))}
      {!props.customProperty &&
        props.findings.some((f) => f.category === "energy") && <EnergyZone />}
      <CameraRig {...props} positions={positions} />
    </>
  );
}
function FirstFrame({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(({ invalidate }) => {
    frames.current += 1;
    if (frames.current === 1) invalidate();
    if (frames.current === 2) onReady();
  });
  return null;
}
export default function PropertyScene({
  propertyId = "farnsworth",
  ...otherProps
}: PropertySceneProps) {
  const props = { ...otherProps, propertyId };
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    motionPreference,
    serverMotionPreference,
  );
  const [rendered, setRendered] = useState(false);
  const markReady = useCallback(() => setRendered(true), []);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#25272b",
      }}
    >
      <Canvas
        key={props.customProperty?.splatUrl ? "splat" : "diorama"}
        orthographic={!props.customProperty?.splatUrl}
        shadows
        dpr={[1, 1.7]}
        frameloop={
          reducedMotion && !props.customProperty?.splatUrl ? "demand" : "always"
        }
        camera={{
          position: [13, 15, 18],
          zoom: props.customProperty?.splatUrl ? 1 : 47,
          fov: 45,
          near: 0.1,
          far: 500,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
        fallback={
          <p style={{ padding: 24 }}>
            This property needs a browser with WebGL enabled.
          </p>
        }
      >
        <Suspense fallback={null}>
          <ReducedMotion.Provider value={reducedMotion}>
            <SceneProperty.Provider
              value={
                !props.customProperty && props.propertyId === "farnsworth"
                  ? "farnsworth"
                  : "willow"
              }
            >
              <SceneRooms.Provider
                value={
                  !props.customProperty && props.propertyId === "farnsworth"
                    ? farnsworthZones
                    : willowRooms
                }
              >
                <World {...props} />
                <FirstFrame onReady={markReady} />
              </SceneRooms.Provider>
            </SceneProperty.Provider>
          </ReducedMotion.Provider>
        </Suspense>
      </Canvas>
      {!rendered && (
        <div
          role="status"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            pointerEvents: "none",
            background: "#25272b",
            fontSize: 12,
            color: "#c2c5bb",
          }}
        >
          Opening the property…
        </div>
      )}
    </div>
  );
}
