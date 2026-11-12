"use client";

/** Upper-level topology traced from Webster listing floorplan 31.jpg.
 * Pixel coordinates are retained for comparison with the source drawing.
 * Source drawing is approximate; all furnishings here are illustrative staging.
 * No inspection evidence or agent routes have been assigned to this level.
 */
import { useMemo } from "react";
import { Path, Shape } from "three";

type Point = [number, number];
type Position = [number, number, number];
const SCALE = 0.0348;
const ORIGIN: Point = [642, 624];
const world = ([x, y]: Point): Point => [(x - ORIGIN[0]) * SCALE, (y - ORIGIN[1]) * SCALE];
export const websterUpperOverview = {
  width: 10.5,
  depth: 11.5,
  centre: [0, 0, 0] as Position,
};
const C = { wall: "#e1dacf", trim: "#faf7ef", oak: "#c79e70", dark: "#765844", textile: "#96a8b4", tile: "#d1d9d9" };
function Box({ at, size, color = C.wall, y = 0, height = .2, rotation = 0 }: { at: Point; size: Point; color?: string; y?: number; height?: number; rotation?: number }) {
  const [x, z] = world(at);
  return <mesh castShadow receiveShadow position={[x, y + height / 2, z]} rotation={[0, rotation, 0]}><boxGeometry args={[size[0] * SCALE, height, size[1] * SCALE]} /><meshStandardMaterial color={color} roughness={.78} /></mesh>;
}
function Wall({ from, to, height = 1.08, color = C.wall }: { from: Point; to: Point; height?: number; color?: string }) {
  const a = world(from), b = world(to);
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return <group position={[(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2]} rotation={[0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0]}>
    <mesh castShadow receiveShadow position={[0, height / 2, 0]}><boxGeometry args={[length, height, .105]} /><meshStandardMaterial color={color} roughness={.85} /></mesh>
    <mesh position={[0, height + .012, 0]}><boxGeometry args={[length + .04, .025, .135]} /><meshStandardMaterial color={C.trim} /></mesh>
    <mesh position={[0, .05, 0]}><boxGeometry args={[length, .1, .13]} /><meshStandardMaterial color={C.trim} /></mesh>
  </group>;
}
function Slab({ points }: { points: Point[] }) {
  const shape = useMemo(() => {
    const s = new Shape();
    points.forEach((p, i) => { const [x, z] = world(p); if (i === 0) s.moveTo(x, -z); else s.lineTo(x, -z); });
    s.closePath();
    const stair = new Path();
    [[624,648],[654,648],[654,709],[624,709]].forEach((p, i) => {
      const [x, z] = world(p as Point);
      if (i === 0) stair.moveTo(x, -z); else stair.lineTo(x, -z);
    });
    stair.closePath();
    s.holes.push(stair);
    return s;
  }, [points]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.18, 0]} receiveShadow><extrudeGeometry args={[shape, { depth: .16, bevelEnabled: false }]} /><meshStandardMaterial color={C.oak} roughness={.8} /></mesh>;
}
function Window({ from, to }: { from: Point; to: Point }) {
  const a = world(from), b = world(to), length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return <group position={[(a[0] + b[0]) / 2, .8, (a[1] + b[1]) / 2]} rotation={[0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0]}>
    <mesh><boxGeometry args={[length, .52, .04]} /><meshStandardMaterial color="#b8d7e5" transparent opacity={.3} roughness={.18} /></mesh>
    {[-.27, .27].map(y => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[length + .09, .045, .1]} /><meshStandardMaterial color={C.trim} /></mesh>)}
    {[-length / 2, 0, length / 2].map(x => <mesh key={x} position={[x, 0, 0]}><boxGeometry args={[.035, .54, .07]} /><meshStandardMaterial color={C.trim} /></mesh>)}
  </group>;
}
function Bed({ at, color = C.textile, rotation = 0 }: { at: Point; color?: string; rotation?: number }) {
  const [x,z] = world(at);
  return <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
    <mesh castShadow receiveShadow position={[0,.18,0]}><boxGeometry args={[1.65,.36,2.05]} /><meshStandardMaterial color={C.dark} /></mesh>
    <mesh castShadow position={[0,.43,0]}><boxGeometry args={[1.6,.22,2]} /><meshStandardMaterial color="#fff9ed" roughness={1} /></mesh>
    <mesh castShadow position={[0,.56,.3]}><boxGeometry args={[1.64,.08,1.3]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
    <mesh castShadow position={[0,.55,-1.04]}><boxGeometry args={[1.75,1.1,.12]} /><meshStandardMaterial color={C.oak} /></mesh>
    {[-.41,.41].map(px=><mesh key={px} castShadow position={[px,.6,-.67]}><boxGeometry args={[.64,.16,.44]} /><meshStandardMaterial color="#f4eee2" roughness={1} /></mesh>)}
    {[-1.1,1.1].map(px=><group key={px} position={[px,0,-.7]}><mesh castShadow position={[0,.25,0]}><boxGeometry args={[.42,.5,.42]} /><meshStandardMaterial color={C.oak} /></mesh><mesh position={[0,.64,0]}><cylinderGeometry args={[.12,.18,.26,14]} /><meshStandardMaterial color="#eee7d4" /></mesh></group>)}
  </group>;
}
function Basin({ at }: { at: Point }) {
  return <><Box at={at} size={[14,12]} height={.72} color={C.oak} /><Box at={at} size={[15,13]} height={.06} y={.72} color={C.trim}/><Box at={at} size={[9,7]} height={.025} y={.78} color="#b6c9cf"/></>;
}
const outline: Point[] = [[540,460],[684,460],[684,540],[792,540],[792,788],[575,788],[575,774],[556,774],[556,788],[540,788],[540,721],[492,721],[492,605],[540,605]];
const walls: [Point,Point][] = [
  // External silhouette; inset deck remains outside the enclosed bedrooms.
  [[540,460],[565,460]],[[590,460],[603,460]],[[630,460],[684,460]],[[540,460],[540,605]],
  [[684,540],[747,540]],[[773,540],[792,540]],[[792,540],[792,562]],[[792,600],[792,788]],[[792,788],[782,788]],[[756,788],[732,788]],[[702,788],[622,788]],[[605,788],[575,788]],[[575,788],[575,774]],[[575,774],[556,774]],[[556,774],[556,788]],[[556,788],[540,788]],
  [[540,788],[540,721]],[[540,721],[540,653]],[[540,626],[540,605]],
  // Rear bedroom, its shallow cupboard and hall door.
  [[654,460],[654,484]],[[654,525],[654,580]],[[654,603],[654,624]],[[654,540],[684,540]],[[684,460],[684,540]],
  [[540,605],[624,605]],
  // Smaller bedroom, deck door, walk-in wardrobe and open landing.
  [[624,605],[624,625]],[[624,648],[624,721]],[[540,721],[624,721]],
  [[591,721],[591,788]],
  // Stairwell and primary closet are distinct from the circulation landing.
  [[624,709],[654,709]],[[654,667],[654,709]],[[654,667],[674,667]],
  [[674,689],[674,708]],[[624,721],[624,762]],[[624,762],[674,762]],
  [[674,708],[674,752]],
  // Two separate bathrooms, neither opens directly into the rear bedroom.
  [[654,603],[710,603]],[[710,540],[710,624]],
  [[710,624],[744,624]],[[768,624],[792,624]],[[710,603],[710,644]],
  [[674,644],[710,644]],
];
export default function WebsterUpper({ onRoomSelect }: { onRoomSelect?: (id: string) => void } = {}) {
  // Kept in the same component contract as the main floor, without inventing
  // upper-floor evidence targets for the five main-floor reference images.
  void onRoomSelect;
  return <group>
    <Slab points={outline} />
    <Box at={[516,663]} size={[48,116]} height={.035} y={.002} color="#ad9275" />
    {Array.from({length:18},(_,i)=><Box key={`deck${i}`} at={[493+i*2.7,663]} size={[.45,115]} height={.012} y={.04} color="#90785f"/>)}
    {/* Floor surfaces retain the source's bath/closet separation. */}
    <Box at={[682,571.5]} size={[55,63]} height={.025} color={C.tile} />
    <Box at={[751,582]} size={[82,84]} height={.025} color="#c9d3d3" />
    {walls.map(([from,to],i)=><Wall key={i} from={from} to={to}/>)}
    {([
      [[565,460],[590,460]],[[603,460],[630,460]],[[747,540],[773,540]],
      [[792,562],[792,600]],[[702,788],[732,788]],[[756,788],[782,788]],[[605,788],[622,788]],
    ] as [Point,Point][]).map(([from,to],i)=><Wall key={`sill${i}`} from={from} to={to} height={.52}/>)}
    {/* Deck is an open exterior space with a low balustrade. */}
    <Wall from={[492,605]} to={[540,605]} height={.72} color={C.dark}/>
    <Wall from={[492,605]} to={[492,721]} height={.72} color={C.dark}/>
    <Wall from={[492,721]} to={[540,721]} height={.72} color={C.dark}/>
    <Window from={[565,460]} to={[590,460]}/><Window from={[603,460]} to={[630,460]}/>
    <Window from={[747,540]} to={[773,540]}/><Window from={[792,562]} to={[792,600]}/>
    <Window from={[702,788]} to={[732,788]}/><Window from={[756,788]} to={[782,788]}/>
    <Window from={[605,788]} to={[622,788]}/>
    <Box at={[594,541]} size={[78,88]} height={.015} y={.018} color="#ded8cc"/>
    <Bed at={[592,524]} color="#91a6b7" />
    <Box at={[584,673]} size={[63,70]} height={.015} y={.018} color="#ddd6c9"/>
    <Bed at={[580,671]} rotation={Math.PI} color="#b8b09d"/>
    <Box at={[738,706]} size={[98,95]} height={.015} y={.018} color="#e4ddcf"/>
    <Bed at={[748,707]} rotation={Math.PI/2} color="#9cabb3"/>
    {/* Source-positioned fixtures; cabinetry/furniture are illustrative. */}
    <Box at={[682,551]} size={[45,18]} height={.5} color={C.trim}/>
    <Box at={[682,551]} size={[36,12]} height={.018} y={.5} color="#b8d0d4"/>
    <Basin at={[698,589]}/><Basin at={[720,586]}/>
    <Box at={[779,582]} size={[18,62]} height={.5} color={C.trim}/>
    <Box at={[779,582]} size={[12,51]} height={.018} y={.5} color="#b8d0d4"/>
    <Box at={[723,551]} size={[20,20]} height={.035} color="#ebeeeb"/>
    <Wall from={[733,541]} to={[733,561]} height={.9} color="#c2d8de"/>
    {/* Upper stair opening and visible treads descend below this level. */}
    <Box at={[639,678]} size={[27,58]} height={.025} y={-.68} color="#66574b"/>
    {Array.from({length:10},(_,i)=><Box key={`step${i}`} at={[639,652+i*5.5]} size={[27,5.3]} height={.06} y={-.04-i*.055} color={C.oak}/>)}
    <Wall from={[623,648]} to={[623,708]} height={.68} color={C.dark}/>
    {/* Walk-in closet shelves and rear-room cupboard. */}
    <Box at={[548,746]} size={[12,43]} height={.85} color={C.oak}/>
    <Box at={[579,746]} size={[12,43]} height={.85} color={C.oak}/>
    <Box at={[635,779]} size={[69,12]} height={.85} color={C.oak}/>
    <Box at={[668,484]} size={[22,43]} height={.85} color={C.oak}/>
  </group>;
}
