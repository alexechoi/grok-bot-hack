/** Approximate trace of the listing floorplan, photo 31. Pixel topology is
 * authoritative here; upstream plan.py is deliberately not used for walls.
 * Uniform scale from the printed living-room width: 14 ft / 126 pixels.
 * This is a visual reconstruction, not surveyed building information. */
export const traceScale = 4.2672 / 126;
export type Pixel = [number, number];
export const tracePoint = (x: number, y: number): [number, number, number] => [
  (x - 244) * traceScale,
  0,
  (y - 678) * traceScale,
];
export const outline: Pixel[] = [
  [95, 938],
  [221, 938],
  [221, 888],
  [393, 888],
  [393, 748],
  [358, 748],
  [358, 632],
  [391, 632],
  [391, 529],
  [358, 529],
  [358, 508],
  [378, 508],
  [378, 449],
  [358, 449],
  [358, 418],
  [254, 418],
  [254, 461],
  [121, 461],
  [121, 506],
  [95, 506],
  [95, 569],
  [140, 569],
  [140, 632],
  [95, 632],
];
export const traceRooms: Record<
  string,
  {
    polygon: Pixel[];
    bounds: [number, number, number, number];
    surface: "wood" | "carpet" | "tile";
  }
> = {
  living: {
    polygon: [
      [95, 782],
      [140, 782],
      [140, 748],
      [221, 748],
      [221, 938],
      [95, 938],
    ],
    bounds: [95, 221, 748, 938],
    surface: "carpet",
  },
  entry: {
    polygon: [
      [221, 748],
      [279, 748],
      [279, 888],
      [221, 888],
    ],
    bounds: [221, 279, 748, 888],
    surface: "carpet",
  },
  dining: {
    polygon: [
      [279, 748],
      [393, 748],
      [393, 888],
      [279, 888],
    ],
    bounds: [279, 393, 748, 888],
    surface: "wood",
  },
  porch: {
    polygon: [
      [221, 888],
      [393, 888],
      [393, 938],
      [221, 938],
    ],
    bounds: [221, 393, 888, 938],
    surface: "tile",
  },
  kitchen: {
    polygon: [
      [254, 632],
      [358, 632],
      [358, 748],
      [254, 748],
    ],
    bounds: [254, 358, 632, 748],
    surface: "wood",
  },
  bed_a: {
    polygon: [
      [95, 632],
      [221, 632],
      [221, 664],
      [254, 664],
      [254, 723],
      [221, 723],
      [221, 748],
      [95, 748],
    ],
    bounds: [95, 221, 632, 748],
    surface: "wood",
  },
  bath_a: {
    polygon: [
      [140, 569],
      [221, 569],
      [221, 632],
      [140, 632],
    ],
    bounds: [140, 221, 569, 632],
    surface: "tile",
  },
  vestibule: {
    polygon: [
      [221, 602],
      [254, 602],
      [254, 664],
      [221, 664],
    ],
    bounds: [221, 254, 602, 664],
    surface: "wood",
  },
  bed_b: {
    polygon: [
      [121, 461],
      [254, 461],
      [254, 602],
      [221, 602],
      [221, 569],
      [95, 569],
      [95, 506],
      [121, 506],
    ],
    bounds: [121, 254, 461, 569],
    surface: "wood",
  },
  family: {
    polygon: [
      [254, 418],
      [358, 418],
      [358, 449],
      [378, 449],
      [378, 508],
      [358, 508],
      [358, 529],
      [309, 529],
      [309, 632],
      [254, 632],
    ],
    bounds: [254, 358, 418, 632],
    surface: "wood",
  },
  laundry: {
    polygon: [
      [309, 568],
      [391, 568],
      [391, 632],
      [309, 632],
    ],
    bounds: [309, 391, 568, 632],
    surface: "tile",
  },
  service: {
    polygon: [
      [309, 529],
      [391, 529],
      [391, 568],
      [309, 568],
    ],
    bounds: [309, 391, 529, 568],
    surface: "wood",
  },
  wc: {
    polygon: [
      [95, 748],
      [140, 748],
      [140, 782],
      [95, 782],
    ],
    bounds: [95, 140, 748, 782],
    surface: "tile",
  },
  stair: {
    polygon: [
      [221, 723],
      [254, 723],
      [254, 746],
      [278, 746],
      [278, 808],
      [245, 808],
      [245, 766],
      [221, 766],
    ],
    bounds: [221, 278, 723, 808],
    surface: "carpet",
  },
};
export type TraceWall = {
  along: string;
  a0: number;
  a1: number;
  b0: number;
  b1: number;
  z0: number;
  z1: number;
  kind: string;
  cutHeight?: number;
};
export type TraceOpening = {
  name: string;
  along: string;
  a0: number;
  a1: number;
  b: number;
  z0: number;
  z1: number;
  kind: string;
};
const xy = (x: number, y: number) => {
  const p = tracePoint(x, y);
  return [p[0], 9 - p[2]];
};
function wall(a: Pixel, b: Pixel, outer = false): TraceWall {
  const p = xy(...a),
    q = xy(...b),
    along = a[1] === b[1] ? "X" : "Y";
  const av = along === "X" ? [p[0], q[0]] : [p[1], q[1]],
    bv = along === "X" ? p[1] : p[0];
  return {
    along,
    a0: Math.min(...av),
    a1: Math.max(...av),
    b0: bv - 0.065,
    b1: bv + 0.065,
    z0: 0,
    z1: 2.75,
    kind: outer ? "ext" : "int",
    cutHeight: outer
      ? a[1] >= 888 && b[1] >= 888
        ? 0.55
        : a[0] >= 358 && b[0] >= 358
          ? 1.05
          : 2.45
      : 1.15,
  };
}
export const traceWalls: TraceWall[] = outline.map((p, i) =>
  wall(p, outline[(i + 1) % outline.length], true),
);
const interior: [Pixel, Pixel][] = [
  [
    [95, 748],
    [221, 748],
  ],
  [
    [140, 748],
    [140, 782],
  ],
  [
    [95, 782],
    [140, 782],
  ],
  [
    [221, 748],
    [221, 938],
  ],
  [
    [279, 748],
    [279, 888],
  ],
  [
    [221, 888],
    [393, 888],
  ],
  [
    [279, 748],
    [393, 748],
  ],
  [
    [254, 632],
    [358, 632],
  ],
  [
    [221, 632],
    [221, 664],
  ],
  [
    [221, 664],
    [254, 664],
  ],
  [
    [254, 664],
    [254, 723],
  ],
  [
    [221, 723],
    [254, 723],
  ],
  [
    [221, 723],
    [221, 748],
  ],
  [
    [140, 632],
    [221, 632],
  ],
  [
    [221, 569],
    [221, 632],
  ],
  [
    [140, 569],
    [254, 569],
  ],
  [
    [254, 461],
    [254, 602],
  ],
  [
    [221, 602],
    [254, 602],
  ],
  [
    [254, 602],
    [254, 664],
  ],
  [
    [309, 529],
    [358, 529],
  ],
  [
    [309, 529],
    [309, 632],
  ],
  [
    [309, 568],
    [391, 568],
  ],
  [
    [358, 449],
    [358, 508],
  ],
];
traceWalls.push(...interior.map(([a, b]) => wall(a, b)));
function opening(
  name: string,
  a: Pixel,
  b: Pixel,
  kind = "door",
  z0 = 0,
  z1 = 2.2,
): TraceOpening {
  const p = xy(...a),
    q = xy(...b),
    along = a[1] === b[1] ? "X" : "Y",
    av = along === "X" ? [p[0], q[0]] : [p[1], q[1]];
  return {
    name,
    along,
    a0: Math.min(...av),
    a1: Math.max(...av),
    b: along === "X" ? p[1] : p[0],
    z0,
    z1,
    kind,
  };
}
export const traceOpenings: TraceOpening[] = [
  opening("ArchLiv", [221, 838], [221, 886], "arch"),
  opening("ArchDin", [279, 838], [279, 886], "arch"),
  opening("Front", [233, 888], [266, 888]),
  opening("French", [306, 888], [357, 888]),
  opening("KitchenDoor", [297, 748], [320, 748]),
  opening("KitchenFamily", [254, 632], [309, 632], "cased"),
  opening("LaundryAccess", [309, 632], [348, 632]),
  opening("MainBed", [221, 635], [221, 654]),
  opening("WC", [96, 748], [121, 748]),
  opening("Bath", [221, 604], [221, 631]),
  opening("RearBed", [254, 574], [254, 600]),
  opening("Rear", [254, 418], [317, 418]),
  opening("FamilyCloset", [358, 458], [358, 491]),
  opening("Service", [309, 568], [333, 568]),
  opening("LivingFront", [123, 938], [192, 938], "window", 0.75, 2.2),
  opening("LivingWest", [95, 800], [95, 828], "window", 0.85, 2.2),
  opening("BedroomWest", [95, 656], [95, 706], "window", 0.8, 2.2),
  opening("KitchenEast", [358, 661], [358, 724], "window", 1.05, 2.25),
  opening("DiningEast", [393, 776], [393, 816], "window", 0.8, 2.2),
  opening("BedRear", [145, 461], [214, 461], "window", 0.8, 2.2),
  opening("LaundryEast", [391, 579], [391, 614], "window", 1.0, 2.2),
  opening("BathWest", [140, 583], [140, 610], "window", 1.1, 2.2),
];
