"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Html,
  Line,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { Group, Mesh, OrthographicCamera, Vector3 } from "three";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { rooms } from "@/lib/scenario";

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
  agents: SceneAgent[];
  findings: SceneFinding[];
  selectedAgent: string | null;
  focusRoom: string | null;
  cameraMode: "orbit" | "follow" | "top";
  resetKey: number;
  onAgentSelect: (id: string) => void;
  onFindingSelect: (id: string) => void;
  onRoomSelect: (id: string) => void;
};

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
      <Box p={[-0.1, -0.21, 0.065]} s={[w * 0.55, 0.18, 0.015]} c="#7f8c68" />
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
  c = "#8e9c7b",
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
        c="#9a9b7e"
        radius={0.015}
      />
      {Array.from({ length: 13 }, (_, i) => (
        <Box
          key={i}
          p={[-3.35, 0.058, 0.85 + i * 0.19]}
          s={[3.5, 0.008, 0.012]}
          c="#a8a990"
        />
      ))}
      <group position={[-4.85, 0, 2]} rotation={[0, Math.PI / 2, 0]}>
        <Soft p={[0, 0.38, 0]} s={[2.65, 0.55, 1.05]} c="#8eab8c" />
        <Soft p={[0, 0.88, -0.4]} s={[2.65, 0.85, 0.25]} c="#96b193" />
        <Soft p={[-1.25, 0.65, 0]} s={[0.25, 0.65, 1.1]} c="#96b193" />
        <Soft p={[1.25, 0.65, 0]} s={[0.25, 0.65, 1.1]} c="#96b193" />
        {[-0.77, 0, 0.77].map((x) => (
          <Soft key={x} p={[x, 0.71, 0.07]} s={[0.7, 0.14, 0.75]} c="#a4bca0" />
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
      <Box p={[-1.12, 1.15, 1.7]} s={[0.09, 0.95, 1.6]} c="#343b35" />
      <Box p={[-1.18, 1.15, 1.7]} s={[0.01, 0.83, 1.46]} c="#1d2928" />
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
          <Box p={[x, 0.52, -3.9]} s={[0.97, 1.04, 0.82]} c="#7e9381" />
          <Box p={[x, 0.52, -3.47]} s={[0.87, 0.88, 0.035]} c="#8da08b" />
          <Box p={[x + 0.3, 0.83, -3.43]} s={[0.15, 0.035, 0.025]} c={brass} />
        </group>
      ))}
      <Box p={[-3.65, 1.08, -3.86]} s={[4.05, 0.11, 1.02]} c="#e9e3cf" />
      <Box p={[-3.65, 1.5, -4.37]} s={[4.05, 0.6, 0.055]} c="#d2d6bd" />
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
      <Box p={[-3.65, 2.05, -4.1]} s={[2.7, 0.8, 0.55]} c="#9ca98c" />
      {[-4.55, -3.65, -2.75].map((x) => (
        <Box key={x} p={[x, 2.05, -3.81]} s={[0.84, 0.72, 0.04]} c="#a6b297" />
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
            c={(x + z) % 2 ? "#c4d5cb" : "#b3c8bd"}
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
        c="#98b8b0"
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
        c="#c3dcd2"
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
        c="#a6c0b6"
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
      <Box p={[1.65, 0.65, 3.45]} s={[0.7, 1.3, 1.55]} c="#a2a68c" />
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
        c="#2c3e35"
        radius={0.015}
      />
      <Box p={[0.35, 1.33, -4.05]} s={[0.61, 0.45, 0.04]} c="#31443b" />
      <Box p={[0.35, 1.33, -4.02]} s={[0.51, 0.36, 0.008]} c="#9cc594" />
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
function Apartment({ onRoomSelect }: { onRoomSelect: (id: string) => void }) {
  return (
    <group>
      <Soft
        p={[0, -0.54, 0]}
        s={[12.65, 0.62, 9.65]}
        c="#3a4939"
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
      <LivingRoom />
      <Kitchen />
      <Bathroom />
      <Bedroom />
      <Hallway />
      {Object.entries(rooms).map(([id, room]) => (
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
function targetFor(agent: SceneAgent): Vector3 {
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
            : (rooms[agent.roomId]?.point ?? rooms.hallway.point),
    offset = agentOffsets[agent.id] ?? [0, 0, 0];
  return new Vector3(point[0] + offset[0], 0, point[2] + offset[2]);
}
function Robot({
  agent,
  selected,
  onSelect,
  positions,
}: {
  agent: SceneAgent;
  selected: boolean;
  onSelect: () => void;
  positions: Map<string, Vector3>;
}) {
  const group = useRef<Group>(null),
    body = useRef<Group>(null),
    scan = useRef<Mesh>(null),
    antenna = useRef<Mesh>(null);
  const destination = useMemo(() => targetFor(agent), [agent]);
  const [initial] = useState(() => targetFor(agent)),
    path = useRef<Vector3[]>([]),
    lastRoom = useRef(agent.roomId);
  const normalizedState = agent.state.toLowerCase(),
    investigating = normalizedState === "investigating",
    reporting = normalizedState === "reporting";
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
      const old = rooms[lastRoom.current]?.point;
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
    route.push(destination.clone());
    path.current = route;
    lastRoom.current = agent.roomId;
  }, [destination, agent.roomId]);
  useFrame(({ clock }, dt) => {
    if (!group.current || !body.current) return;
    const current = group.current.position,
      next = path.current[0];
    let moving = false;
    if (next) {
      const delta = next.clone().sub(current);
      if (delta.length() < 0.06) {
        current.copy(next);
        path.current.shift();
      } else {
        current.addScaledVector(delta.normalize(), Math.min(dt, 0.05) * 1.5);
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
    <group ref={group} position={initial}>
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
      {reporting && <Handoff agent={agent} positions={positions} />}
      <Html
        position={[0, 1.55, 0]}
        center
        distanceFactor={22}
        style={{ pointerEvents: "none" }}
        zIndexRange={[15, 0]}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: "var(--font-geist-sans), sans-serif",
            padding: "5px 8px",
            background: "rgba(26,36,29,.88)",
            border: "1px solid " + agent.color + "66",
            borderRadius: 7,
            color: "#f4efdc",
            fontSize: 11,
            boxShadow: "0 3px 15px #0002",
            textAlign: "center",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 5,
              height: 5,
              borderRadius: 20,
              background: agent.color,
              marginRight: 5,
            }}
          />
          {names[agent.id] ?? agent.id}
          {(selected || investigating) && (
            <span
              style={{
                display: "block",
                fontSize: 9,
                opacity: 0.7,
                maxWidth: 150,
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 3,
              }}
            >
              {agent.task}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}
function Handoff({
  agent,
  positions,
}: {
  agent: SceneAgent;
  positions: Map<string, Vector3>;
}) {
  const packet = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const origin = positions.get(agent.id),
      target = positions.get("manager");
    if (!packet.current || !origin || !target) return;
    const t = (clock.elapsedTime * 0.4) % 1;
    packet.current.position.copy(target.clone().sub(origin).multiplyScalar(t));
    packet.current.position.y = 0.8 + Math.sin(t * Math.PI) * 1.5;
  });
  return (
    <mesh ref={packet}>
      <octahedronGeometry args={[0.12]} />
      <meshStandardMaterial
        color={agent.color}
        emissive={agent.color}
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
  const marker = useRef<Group>(null),
    ring = useRef<Mesh>(null);
  const point = rooms[finding.roomId]?.point ?? rooms.hallway.point;
  const color =
    finding.category === "energy"
      ? "#b68aff"
      : finding.severity === "high" || finding.severity === "critical"
        ? "#ee8d69"
        : "#e7ba75";
  useFrame(({ clock }) => {
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
        <Html
          center
          distanceFactor={22}
          zIndexRange={[20, 0]}
          style={{ pointerEvents: "auto" }}
        >
          <button
            title={`Open finding ${finding.id}`}
            onClick={onSelect}
            style={{
              cursor: "pointer",
              border: 0,
              background: "transparent",
              color: "#302d24",
              fontSize: 16,
              fontWeight: 800,
              width: 22,
              height: 25,
            }}
          >
            {finding.category === "energy" ? "ϟ" : "!"}
          </button>
        </Html>
      </group>
    </group>
  );
}
function EnergyZone() {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current)
      group.current.children.forEach((child, i) => {
        child.position.y =
          0.06 + ((clock.elapsedTime * 0.18 + i * 0.25) % 1) * 0.8;
      });
  });
  return (
    <group position={[-3.3, 0, -2.25]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <planeGeometry args={[5.15, 4.1]} />
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
            <ringGeometry args={[1.2 + i * 0.2, 1.22 + i * 0.2, 64]} />
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
  cameraMode,
  focusRoom,
  selectedAgent,
  resetKey,
  positions,
}: {
  cameraMode: PropertySceneProps["cameraMode"];
  focusRoom: string | null;
  selectedAgent: string | null;
  resetKey: number;
  positions: Map<string, Vector3>;
}) {
  const controls = useRef<OrbitControlsType>(null),
    { size } = useThree();
  const transition = useRef(true),
    wanted = useRef(new Vector3(0, 0, 0)),
    desiredZoom = useRef(47),
    desiredPosition = useRef(new Vector3(13, 15, 18));
  useEffect(() => {
    const base = Math.min(size.width / 17, size.height / 13);
    desiredZoom.current =
      cameraMode === "follow" ? base * 1.45 : focusRoom ? base * 1.3 : base;
    const p =
      focusRoom && rooms[focusRoom] ? rooms[focusRoom].point : [0, 0, 0];
    wanted.current.set(p[0], 0, p[2]);
    desiredPosition.current
      .copy(wanted.current)
      .add(
        cameraMode === "top"
          ? new Vector3(0.01, 23, 0.01)
          : new Vector3(13, 15, 18),
      );
    transition.current = true;
  }, [focusRoom, cameraMode, resetKey, size]);
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
      const factor = 1 - Math.exp(-dt * 3);
      camera.position.lerp(desiredPosition.current, factor);
      controls.current.target.lerp(wanted.current, factor);
      const cam = camera as OrthographicCamera;
      cam.zoom += (desiredZoom.current - cam.zoom) * factor;
      cam.updateProjectionMatrix();
      if (
        cameraMode !== "follow" &&
        camera.position.distanceTo(desiredPosition.current) < 0.025
      )
        transition.current = false;
      controls.current.update();
    }
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      minZoom={20}
      maxZoom={130}
      minPolarAngle={0.01}
      maxPolarAngle={Math.PI / 2.1}
      enableDamping
      dampingFactor={0.06}
      onStart={() => {
        transition.current = false;
      }}
    />
  );
}
function World(props: PropertySceneProps) {
  const positions = useMemo(() => new Map<string, Vector3>(), []);
  return (
    <>
      <color attach="background" args={["#20291f"]} />
      <fog attach="fog" args={["#20291f", 35, 80]} />
      <ambientLight intensity={1.25} color="#fff3d8" />
      <hemisphereLight args={["#e5eddf", "#697557", 1.4]} />
      <directionalLight
        position={[-5, 12, 6]}
        intensity={3.5}
        color="#ffe1b3"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-normalBias={0.03}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[8, 8, -6]} intensity={1.3} color="#d9e8e1" />
      <mesh
        position={[0, -0.92, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#20291f" roughness={1} />
      </mesh>
      <ContactShadows
        position={[0, -0.87, 0]}
        opacity={0.55}
        scale={25}
        blur={2.5}
        far={10}
        resolution={512}
        color="#09140b"
        frames={1}
      />
      <Apartment onRoomSelect={props.onRoomSelect} />
      {props.agents.map((agent) => (
        <Robot
          key={agent.id}
          agent={agent}
          selected={props.selectedAgent === agent.id}
          onSelect={() => props.onAgentSelect(agent.id)}
          positions={positions}
        />
      ))}
      {props.findings.map((f) => (
        <FindingMarker
          key={f.id}
          finding={f}
          onSelect={() => props.onFindingSelect(f.id)}
        />
      ))}
      {props.findings.some((f) => f.category === "energy") && <EnergyZone />}
      <CameraRig {...props} positions={positions} />
    </>
  );
}
export default function PropertyScene(props: PropertySceneProps) {
  return (
    <Canvas
      orthographic
      shadows
      dpr={[1, 1.7]}
      camera={{ position: [13, 15, 18], zoom: 47, near: 0.1, far: 150 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
    >
      <Suspense fallback={null}>
        <World {...props} />
      </Suspense>
    </Canvas>
  );
}
