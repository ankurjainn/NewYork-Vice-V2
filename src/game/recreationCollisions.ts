import { RECREATION_ZONES, type RecreationZoneDef } from './cityLayout';

export type RecreationColliderCategory =
  | 'wall'
  | 'fence'
  | 'pier'
  | 'prop'
  | 'stadium'
  | 'arch'
  | 'tree'
  | 'pole'
  | 'bollard'
  | 'fountain'
  | 'dome';

export interface SolidBoxCollider {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  category: RecreationColliderCategory;
}

export interface SolidCylinderCollider {
  id: string;
  x: number;
  z: number;
  radius: number;
  height: number;
  category: RecreationColliderCategory;
}

export interface StadiumBowlCollider {
  id: string;
  cx: number;
  cz: number;
  innerRadius: number;
  outerRadius: number;
  height: number;
  /** Half-width of the open South pedestrian concourse tunnel centered at x = cx, z > cz */
  gateHalfWidth: number;
}

export interface RecreationColliderSet {
  boxes: SolidBoxCollider[];
  cylinders: SolidCylinderCollider[];
  stadiums: StadiumBowlCollider[];
}

export interface PerimeterSegmentSpec {
  /** Local X center relative to zone center */
  x: number;
  /** Local Z center relative to zone center */
  z: number;
  width: number;
  depth: number;
  axis: 'ew' | 'ns';
}

export interface Point2D {
  x: number;
  z: number;
}

export interface ParkLayoutBlueprint {
  inset: number;
  gateHalf: number;
  wallSegments: PerimeterSegmentSpec[];
  gatePiers: Point2D[];
  cornerPiers: Point2D[];
  fountain: { x: number; z: number; radius: number };
  pergola: { x: number; z: number; width: number; depth: number; posts: Point2D[] };
  trees: Array<{ x: number; z: number; scale: number }>;
  flowerbeds: Array<{ x: number; z: number; rotY: number; width: number; depth: number }>;
  benches: Array<{ x: number; z: number; rotY: number }>;
  lamps: Point2D[];
}

export interface PlaygroundLayoutBlueprint {
  inset: number;
  gateHalf: number;
  wallSegments: PerimeterSegmentSpec[];
  gatePiers: Point2D[];
  cornerPiers: Point2D[];
  fort: { x: number; z: number; width: number; depth: number };
  slide: { x: number; z: number; width: number; depth: number };
  stairs: { x: number; z: number; width: number; depth: number };
  swingFrames: Array<{ x: number; z: number; width: number; depth: number }>;
  dome: { x: number; z: number; radius: number };
  seesaw: { x: number; z: number; width: number; depth: number };
  springRiders: Point2D[];
  trees: Array<{ x: number; z: number; scale: number }>;
  benches: Array<{ x: number; z: number; rotY: number }>;
}

export interface CourtLayoutBlueprint {
  inset: number;
  gateHalf: number;
  fenceSegments: PerimeterSegmentSpec[];
  gatePosts: Point2D[];
  hoopPoles: Point2D[];
  tennisNet: { x: number; z: number; width: number; depth: number };
  bleachers: { x: number; z: number; width: number; depth: number };
  sidelineBenches: Array<{ x: number; z: number; width: number; depth: number }>;
  lightMasts: Point2D[];
}

export interface StadiumLayoutBlueprint {
  outfieldR: number;
  innerWallR: number;
  outerColonnadeR: number;
  gateHalfWidth: number;
  gateZ: number;
  gatePylonHalfX: number;
  pylons: Array<{ x: number; z: number; width: number; depth: number }>;
  ticketBooths: Array<{ x: number; z: number; width: number; depth: number }>;
  dugouts: Array<{ x: number; z: number; width: number; depth: number }>;
  battersEye: { x: number; z: number; width: number; depth: number };
  floodlightTowers: Point2D[];
  securityBollards: Point2D[];
  cornerPlanters: Array<{ x: number; z: number; width: number; depth: number }>;
}

/**
 * Shared perimeter wall/fence segment generator with 4 open cardinal gates (N, S, E, W).
 * Keeps visual enclosures and physics colliders 100% locked to the exact same geometry.
 */
function buildFourSidedPerimeter(
  width: number,
  depth: number,
  inset: number,
  gateHalf: number,
  thickness: number,
  pierOffset = 0.45,
): {
  segments: PerimeterSegmentSpec[];
  gatePiers: Point2D[];
  cornerPiers: Point2D[];
} {
  const edgeX = width * 0.5 - inset;
  const edgeZ = depth * 0.5 - inset;
  const segLenX = Math.max(2.0, edgeX - (gateHalf + pierOffset));
  const segLenZ = Math.max(2.0, edgeZ - (gateHalf + pierOffset));
  const centerX = gateHalf + pierOffset + segLenX * 0.5;
  const centerZ = gateHalf + pierOffset + segLenZ * 0.5;

  const segments: PerimeterSegmentSpec[] = [
    // North & South walls/fences (2 segments each, framing open N/S gates)
    { x: -centerX, z: -edgeZ, width: segLenX, depth: thickness, axis: 'ew' },
    { x: centerX, z: -edgeZ, width: segLenX, depth: thickness, axis: 'ew' },
    { x: -centerX, z: edgeZ, width: segLenX, depth: thickness, axis: 'ew' },
    { x: centerX, z: edgeZ, width: segLenX, depth: thickness, axis: 'ew' },
    // West & East walls/fences (2 segments each, framing open W/E gates)
    { x: -edgeX, z: -centerZ, width: thickness, depth: segLenZ, axis: 'ns' },
    { x: -edgeX, z: centerZ, width: thickness, depth: segLenZ, axis: 'ns' },
    { x: edgeX, z: -centerZ, width: thickness, depth: segLenZ, axis: 'ns' },
    { x: edgeX, z: centerZ, width: thickness, depth: segLenZ, axis: 'ns' },
  ];

  const pierCoord = gateHalf + pierOffset;
  const gatePiers: Point2D[] = [
    { x: -pierCoord, z: -edgeZ },
    { x: pierCoord, z: -edgeZ },
    { x: -pierCoord, z: edgeZ },
    { x: pierCoord, z: edgeZ },
    { x: -edgeX, z: -pierCoord },
    { x: -edgeX, z: pierCoord },
    { x: edgeX, z: -pierCoord },
    { x: edgeX, z: pierCoord },
  ];

  const cornerPiers: Point2D[] = [
    { x: -edgeX, z: -edgeZ },
    { x: edgeX, z: -edgeZ },
    { x: -edgeX, z: edgeZ },
    { x: edgeX, z: edgeZ },
  ];

  return { segments, gatePiers, cornerPiers };
}

export function getParkLayoutBlueprint(zone: RecreationZoneDef): ParkLayoutBlueprint {
  const hw = zone.width * 0.5;
  const hd = zone.depth * 0.5;
  const inset = 0.48;
  const gateHalf = 3.8;
  const perim = buildFourSidedPerimeter(zone.width, zone.depth, inset, gateHalf, 0.62, 0.45);

  const pergolaX = 7.4;
  const pergolaZ = -16.2;
  const pergolaW = 4.4;
  const pergolaD = 2.4;

  return {
    inset,
    gateHalf,
    wallSegments: perim.segments,
    gatePiers: perim.gatePiers,
    cornerPiers: perim.cornerPiers,
    // NE corner ornamental limestone fountain (clear of corner carts & cricket fielders)
    fountain: { x: hw - 5.6, z: -hd + 5.8, radius: 2.05 },
    // North-East lawn timber & copper shade pergola (open walkthrough underneath; 4 solid corner posts)
    pergola: {
      x: pergolaX,
      z: pergolaZ,
      width: pergolaW,
      depth: pergolaD,
      posts: [
        { x: pergolaX - pergolaW * 0.46, z: pergolaZ - pergolaD * 0.44 },
        { x: pergolaX + pergolaW * 0.46, z: pergolaZ - pergolaD * 0.44 },
        { x: pergolaX - pergolaW * 0.46, z: pergolaZ + pergolaD * 0.44 },
        { x: pergolaX + pergolaW * 0.46, z: pergolaZ + pergolaD * 0.44 },
      ],
    },
    // 8 lush perimeter shade trees clear of all vendor carts, gates, and the central cricket pitch
    trees: [
      { x: -hw + 3.1, z: -9.8, scale: 1.06 },
      { x: hw - 3.1, z: -9.8, scale: 1.08 },
      { x: -hw + 3.1, z: 9.8, scale: 1.04 },
      { x: hw - 3.1, z: 9.8, scale: 1.02 },
      { x: -9.8, z: -hd + 3.1, scale: 1.1 },
      { x: 9.8, z: hd - 3.1, scale: 1.12 },
      { x: -hw + 2.8, z: -hd + 2.8, scale: 0.96 },
      { x: hw - 2.8, z: hd - 2.8, scale: 1.0 },
    ],
    // Raised stone flowerbeds with shrubs & seasonal blossoms (keeping m21_s1 (-6,+17) open!)
    flowerbeds: [
      { x: -12.6, z: -hd + 1.95, rotY: 0, width: 3.4, depth: 1.45 },
      { x: 12.6, z: hd - 1.95, rotY: Math.PI, width: 3.4, depth: 1.45 },
      { x: -12.6, z: hd - 1.95, rotY: Math.PI, width: 3.4, depth: 1.45 },
      { x: hw - 1.95, z: 12.2, rotY: -Math.PI * 0.5, width: 1.45, depth: 3.4 },
    ],
    benches: [
      { x: -hw + 2.1, z: -6.2, rotY: Math.PI * 0.5 },
      { x: hw - 2.1, z: -6.2, rotY: -Math.PI * 0.5 },
      { x: -hw + 2.1, z: 6.2, rotY: Math.PI * 0.5 },
      { x: hw - 2.1, z: 6.2, rotY: -Math.PI * 0.5 },
    ],
    lamps: [
      { x: -hw + 2.2, z: -12.8 },
      { x: hw - 2.2, z: -12.8 },
      { x: -hw + 2.2, z: 12.8 },
      { x: hw - 2.2, z: 12.8 },
      { x: -5.4, z: -hd + 2.2 },
      { x: 5.4, z: hd - 2.2 },
    ],
  };
}

export function getPlaygroundLayoutBlueprint(zone: RecreationZoneDef): PlaygroundLayoutBlueprint {
  const hw = zone.width * 0.5;
  const hd = zone.depth * 0.5;
  const inset = 1.65;
  const gateHalf = 3.4;
  const perim = buildFourSidedPerimeter(zone.width, zone.depth, inset, gateHalf, 0.56, 0.42);

  return {
    inset,
    gateHalf,
    wallSegments: perim.segments,
    gatePiers: perim.gatePiers,
    cornerPiers: perim.cornerPiers,
    fort: { x: -7.5, z: -5.6, width: 2.8, depth: 2.8 },
    slide: { x: -7.5, z: -2.2, width: 1.35, depth: 3.6 },
    stairs: { x: -9.8, z: -5.6, width: 1.55, depth: 1.65 },
    swingFrames: [
      { x: 3.5, z: -5.0, width: 0.65, depth: 2.15 },
      { x: 9.5, z: -5.0, width: 0.65, depth: 2.15 },
    ],
    dome: { x: 0, z: 4.6, radius: 2.45 },
    seesaw: { x: 7.8, z: 5.4, width: 4.2, depth: 0.8 },
    springRiders: [
      { x: -8.6, z: 5.4 },
      { x: -5.6, z: 5.4 },
    ],
    // Placed cleanly away from SW/NW corner playground vendor carts at (-14, ±14)
    trees: [
      { x: hw - 3.0, z: -hd + 3.0, scale: 0.96 },
      { x: hw - 3.0, z: hd - 3.0, scale: 0.98 },
      { x: -hw + 2.7, z: -8.0, scale: 0.92 },
      { x: -hw + 2.7, z: 8.0, scale: 0.94 },
    ],
    benches: [
      { x: 9.2, z: 12.2, rotY: Math.PI },
      { x: -8.8, z: 12.2, rotY: Math.PI },
      { x: hw - 2.6, z: 0, rotY: -Math.PI * 0.5 },
    ],
  };
}

export function getCourtLayoutBlueprint(zone: RecreationZoneDef): CourtLayoutBlueprint {
  const hw = zone.width * 0.5;
  const hd = zone.depth * 0.5;
  const inset = 0.52;
  const gateHalf = 3.4;
  const perim = buildFourSidedPerimeter(zone.width, zone.depth, inset, gateHalf, 0.42, 0.35);

  return {
    inset,
    gateHalf,
    fenceSegments: perim.segments,
    gatePosts: perim.gatePiers,
    hoopPoles: [
      { x: -11.75, z: -8.5 },
      { x: 11.75, z: -8.5 },
    ],
    // Tennis court centered at z = +11.2 (net z ∈ [+7.2, +15.2]) — 2.2m clear of streetball crease (0, +5)!
    tennisNet: { x: 0, z: 11.2, width: 0.34, depth: 8.2 },
    // 4-tier aluminum spectator bleachers along east sideline (clear of leaveParkSport at +12, +6)
    bleachers: { x: 16.5, z: 0, width: 2.35, depth: 14.4 },
    // West sideline player benches
    sidelineBenches: [
      { x: -16.6, z: -8.5, width: 0.82, depth: 4.4 },
      { x: -16.6, z: 11.2, width: 0.82, depth: 4.4 },
    ],
    lightMasts: [
      { x: -hw + 3.2, z: -hd + 3.2 },
      { x: hw - 3.2, z: -hd + 3.2 },
      { x: -hw + 3.2, z: hd - 3.2 },
      { x: hw - 3.2, z: hd - 3.2 },
    ],
  };
}

export const BRONX_STADIUM_BLUEPRINT: StadiumLayoutBlueprint = {
  outfieldR: 29.0,
  innerWallR: 29.05,
  outerColonnadeR: 42.95,
  gateHalfWidth: 6.4,
  gateZ: 41.6,
  gatePylonHalfX: 8.4,
  pylons: [
    { x: -8.4, z: 41.6, width: 3.6, depth: 4.0 },
    { x: 8.4, z: 41.6, width: 3.6, depth: 4.0 },
  ],
  ticketBooths: [
    { x: -12.4, z: 42.4, width: 3.8, depth: 2.6 },
    { x: 12.4, z: 42.4, width: 3.8, depth: 2.6 },
  ],
  dugouts: [
    { x: -28.1, z: 0, width: 2.4, depth: 8.6 },
    { x: 28.1, z: 0, width: 2.4, depth: 8.6 },
  ],
  battersEye: { x: 0, z: -28.4, width: 11.4, depth: 1.4 },
  floodlightTowers: [0, 1, 2, 3].map((t) => {
    const ang = Math.PI * 0.25 + t * (Math.PI * 0.5);
    return { x: Math.sin(ang) * 42.1, z: Math.cos(ang) * 42.1 };
  }),
  // Spaced 2.4m apart (2.0m clear pedestrian walk-through gap; physically blocks cars from driving onto the pitch!)
  securityBollards: [-4.8, -2.4, 0, 2.4, 4.8].map((x) => ({ x, z: 44.8 })),
  // 4 corner landscaped granite plaza planters outside the circular colonnade
  cornerPlanters: [
    { x: -42.2, z: -42.2, width: 5.4, depth: 5.4 },
    { x: 42.2, z: -42.2, width: 5.4, depth: 5.4 },
    { x: -42.2, z: 42.2, width: 5.4, depth: 5.4 },
    { x: 42.2, z: 42.2, width: 5.4, depth: 5.4 },
  ],
};

/**
 * Builds the complete static solid collision geometry for all 7 NYC recreation zones
 * (Parks, Playgrounds, Cage Courts, Bronx Ballpark & Arena) plus Washington Square Arch piers.
 */
export function buildRecreationColliders(): RecreationColliderSet {
  const boxes: SolidBoxCollider[] = [];
  const cylinders: SolidCylinderCollider[] = [];
  const stadiums: StadiumBowlCollider[] = [];

  // 1. Washington Square Marble Triumphal Arch twin piers at (0, -90) — center roadway (-5.3..+5.3) stays wide open!
  for (const side of [-1, 1]) {
    boxes.push({
      id: `wash_arch_pier_${side < 0 ? 'w' : 'e'}`,
      x: side * 8.6,
      z: -90,
      width: 6.6,
      depth: 7.2,
      height: 15.6,
      category: 'arch',
    });
  }
  // Washington Square Arch framing elm/maple tree trunks (clear of stall_arch_informant at 10.5, -74)
  for (const x of [-18, -11.5, 11.5, 18]) {
    cylinders.push({ id: `wash_tree_s_${x}`, x, z: -76, radius: 0.42, height: 6.5, category: 'tree' });
    cylinders.push({ id: `wash_tree_n_${x}`, x, z: -101, radius: 0.42, height: 6.5, category: 'tree' });
  }

  // 2. All 7 Recreation Zones (Parks, Playgrounds, Sports Courts, Bronx Stadium)
  for (const zone of RECREATION_ZONES) {
    if (zone.kind === 'park') {
      const bp = getParkLayoutBlueprint(zone);
      bp.wallSegments.forEach((seg, idx) => {
        boxes.push({
          id: `${zone.id}_wall_${idx}`,
          x: zone.cx + seg.x,
          z: zone.cz + seg.z,
          width: seg.width,
          depth: seg.depth,
          height: 1.55,
          category: 'wall',
        });
      });
      bp.gatePiers.forEach((p, idx) => {
        boxes.push({
          id: `${zone.id}_gatepier_${idx}`,
          x: zone.cx + p.x,
          z: zone.cz + p.z,
          width: 0.92,
          depth: 0.92,
          height: 2.4,
          category: 'pier',
        });
      });
      bp.cornerPiers.forEach((p, idx) => {
        boxes.push({
          id: `${zone.id}_corner_${idx}`,
          x: zone.cx + p.x,
          z: zone.cz + p.z,
          width: 1.0,
          depth: 1.0,
          height: 2.0,
          category: 'pier',
        });
      });
      cylinders.push({
        id: `${zone.id}_fountain`,
        x: zone.cx + bp.fountain.x,
        z: zone.cz + bp.fountain.z,
        radius: bp.fountain.radius,
        height: 2.5,
        category: 'fountain',
      });
      bp.pergola.posts.forEach((p, idx) => {
        cylinders.push({
          id: `${zone.id}_pergola_post_${idx}`,
          x: zone.cx + p.x,
          z: zone.cz + p.z,
          radius: 0.22,
          height: 3.1,
          category: 'pole',
        });
      });
      bp.trees.forEach((t, idx) => {
        cylinders.push({
          id: `${zone.id}_tree_${idx}`,
          x: zone.cx + t.x,
          z: zone.cz + t.z,
          radius: 0.42 * t.scale,
          height: 7.0,
          category: 'tree',
        });
      });
      bp.flowerbeds.forEach((fb, idx) => {
        boxes.push({
          id: `${zone.id}_flowerbed_${idx}`,
          x: zone.cx + fb.x,
          z: zone.cz + fb.z,
          width: fb.width,
          depth: fb.depth,
          height: 0.85,
          category: 'prop',
        });
      });
      bp.benches.forEach((b, idx) => {
        const alongZ = Math.abs(Math.sin(b.rotY)) > 0.7;
        boxes.push({
          id: `${zone.id}_bench_${idx}`,
          x: zone.cx + b.x,
          z: zone.cz + b.z,
          width: alongZ ? 0.72 : 2.15,
          depth: alongZ ? 2.15 : 0.72,
          height: 0.95,
          category: 'prop',
        });
      });
      bp.lamps.forEach((l, idx) => {
        cylinders.push({
          id: `${zone.id}_lamp_${idx}`,
          x: zone.cx + l.x,
          z: zone.cz + l.z,
          radius: 0.24,
          height: 4.8,
          category: 'pole',
        });
      });
    } else if (zone.kind === 'playground') {
      const bp = getPlaygroundLayoutBlueprint(zone);
      bp.wallSegments.forEach((seg, idx) => {
        boxes.push({
          id: `${zone.id}_fence_${idx}`,
          x: zone.cx + seg.x,
          z: zone.cz + seg.z,
          width: seg.width,
          depth: seg.depth,
          height: 1.45,
          category: 'fence',
        });
      });
      bp.gatePiers.forEach((p, idx) => {
        boxes.push({
          id: `${zone.id}_pier_${idx}`,
          x: zone.cx + p.x,
          z: zone.cz + p.z,
          width: 0.86,
          depth: 0.86,
          height: 2.1,
          category: 'pier',
        });
      });
      boxes.push(
        {
          id: `${zone.id}_fort`,
          x: zone.cx + bp.fort.x,
          z: zone.cz + bp.fort.z,
          width: bp.fort.width,
          depth: bp.fort.depth,
          height: 4.6,
          category: 'prop',
        },
        {
          id: `${zone.id}_slide`,
          x: zone.cx + bp.slide.x,
          z: zone.cz + bp.slide.z,
          width: bp.slide.width,
          depth: bp.slide.depth,
          height: 2.3,
          category: 'prop',
        },
        {
          id: `${zone.id}_stairs`,
          x: zone.cx + bp.stairs.x,
          z: zone.cz + bp.stairs.z,
          width: bp.stairs.width,
          depth: bp.stairs.depth,
          height: 2.4,
          category: 'prop',
        },
        {
          id: `${zone.id}_seesaw`,
          x: zone.cx + bp.seesaw.x,
          z: zone.cz + bp.seesaw.z,
          width: bp.seesaw.width,
          depth: bp.seesaw.depth,
          height: 1.05,
          category: 'prop',
        },
      );
      bp.swingFrames.forEach((sf, idx) => {
        boxes.push({
          id: `${zone.id}_swing_frame_${idx}`,
          x: zone.cx + sf.x,
          z: zone.cz + sf.z,
          width: sf.width,
          depth: sf.depth,
          height: 3.6,
          category: 'prop',
        });
      });
      cylinders.push({
        id: `${zone.id}_dome`,
        x: zone.cx + bp.dome.x,
        z: zone.cz + bp.dome.z,
        radius: bp.dome.radius,
        height: 2.4,
        category: 'dome',
      });
      bp.springRiders.forEach((sr, idx) => {
        cylinders.push({
          id: `${zone.id}_spring_${idx}`,
          x: zone.cx + sr.x,
          z: zone.cz + sr.z,
          radius: 0.52,
          height: 1.1,
          category: 'prop',
        });
      });
      bp.trees.forEach((t, idx) => {
        cylinders.push({
          id: `${zone.id}_tree_${idx}`,
          x: zone.cx + t.x,
          z: zone.cz + t.z,
          radius: 0.4 * t.scale,
          height: 6.5,
          category: 'tree',
        });
      });
      bp.benches.forEach((b, idx) => {
        const alongZ = Math.abs(Math.sin(b.rotY)) > 0.7;
        boxes.push({
          id: `${zone.id}_bench_${idx}`,
          x: zone.cx + b.x,
          z: zone.cz + b.z,
          width: alongZ ? 0.72 : 2.15,
          depth: alongZ ? 2.15 : 0.72,
          height: 0.95,
          category: 'prop',
        });
      });
    } else if (zone.kind === 'courts') {
      const bp = getCourtLayoutBlueprint(zone);
      bp.fenceSegments.forEach((seg, idx) => {
        boxes.push({
          id: `${zone.id}_cage_${idx}`,
          x: zone.cx + seg.x,
          z: zone.cz + seg.z,
          width: seg.width,
          depth: seg.depth,
          height: 3.6,
          category: 'fence',
        });
      });
      bp.gatePosts.forEach((p, idx) => {
        cylinders.push({
          id: `${zone.id}_gatepost_${idx}`,
          x: zone.cx + p.x,
          z: zone.cz + p.z,
          radius: 0.18,
          height: 3.7,
          category: 'pole',
        });
      });
      bp.hoopPoles.forEach((hp, idx) => {
        boxes.push({
          id: `${zone.id}_hoop_${idx}`,
          x: zone.cx + hp.x,
          z: zone.cz + hp.z,
          width: 0.72,
          depth: 0.72,
          height: 3.8,
          category: 'prop',
        });
      });
      boxes.push(
        {
          id: `${zone.id}_tennis_net`,
          x: zone.cx + bp.tennisNet.x,
          z: zone.cz + bp.tennisNet.z,
          width: bp.tennisNet.width,
          depth: bp.tennisNet.depth,
          height: 1.25,
          category: 'fence',
        },
        {
          id: `${zone.id}_bleachers`,
          x: zone.cx + bp.bleachers.x,
          z: zone.cz + bp.bleachers.z,
          width: bp.bleachers.width,
          depth: bp.bleachers.depth,
          height: 2.1,
          category: 'prop',
        },
      );
      bp.sidelineBenches.forEach((sb, idx) => {
        boxes.push({
          id: `${zone.id}_bench_${idx}`,
          x: zone.cx + sb.x,
          z: zone.cz + sb.z,
          width: sb.width,
          depth: sb.depth,
          height: 0.85,
          category: 'prop',
        });
      });
      bp.lightMasts.forEach((lm, idx) => {
        cylinders.push({
          id: `${zone.id}_mast_${idx}`,
          x: zone.cx + lm.x,
          z: zone.cz + lm.z,
          radius: 0.25,
          height: 8.8,
          category: 'pole',
        });
      });
    } else if (zone.kind === 'stadium') {
      const bp = BRONX_STADIUM_BLUEPRINT;
      stadiums.push({
        id: `${zone.id}_bowl`,
        cx: zone.cx,
        cz: zone.cz,
        innerRadius: bp.innerWallR,
        outerRadius: bp.outerColonnadeR,
        height: 18.0,
        gateHalfWidth: bp.gateHalfWidth,
      });
      bp.pylons.forEach((p, idx) => {
        boxes.push({
          id: `${zone.id}_pylon_${idx}`,
          x: zone.cx + p.x,
          z: zone.cz + p.z,
          width: p.width,
          depth: p.depth,
          height: 18.5,
          category: 'stadium',
        });
      });
      bp.ticketBooths.forEach((tb, idx) => {
        boxes.push({
          id: `${zone.id}_ticket_${idx}`,
          x: zone.cx + tb.x,
          z: zone.cz + tb.z,
          width: tb.width,
          depth: tb.depth,
          height: 3.4,
          category: 'stadium',
        });
      });
      bp.dugouts.forEach((dg, idx) => {
        boxes.push({
          id: `${zone.id}_dugout_${idx}`,
          x: zone.cx + dg.x,
          z: zone.cz + dg.z,
          width: dg.width,
          depth: dg.depth,
          height: 2.4,
          category: 'stadium',
        });
      });
      boxes.push({
        id: `${zone.id}_batters_eye`,
        x: zone.cx + bp.battersEye.x,
        z: zone.cz + bp.battersEye.z,
        width: bp.battersEye.width,
        depth: bp.battersEye.depth,
        height: 6.2,
        category: 'stadium',
      });
      bp.floodlightTowers.forEach((ft, idx) => {
        cylinders.push({
          id: `${zone.id}_floodlight_${idx}`,
          x: zone.cx + ft.x,
          z: zone.cz + ft.z,
          radius: 1.15,
          height: 30.0,
          category: 'stadium',
        });
      });
      bp.securityBollards.forEach((sb, idx) => {
        cylinders.push({
          id: `${zone.id}_bollard_${idx}`,
          x: zone.cx + sb.x,
          z: zone.cz + sb.z,
          radius: 0.2,
          height: 1.05,
          category: 'bollard',
        });
      });
      bp.cornerPlanters.forEach((cp, idx) => {
        boxes.push({
          id: `${zone.id}_planter_${idx}`,
          x: zone.cx + cp.x,
          z: zone.cz + cp.z,
          width: cp.width,
          depth: cp.depth,
          height: 0.9,
          category: 'prop',
        });
      });
    }
  }

  return { boxes, cylinders, stadiums };
}

export const RECREATION_COLLIDERS: RecreationColliderSet = buildRecreationColliders();

/**
 * Resolves a moving circle (pedestrian, player, NPC, or vehicle) against all solid
 * recreation-zone enclosures, props, trees, Washington Square Arch piers, and the
 * annular Bronx Stadium bowl with its open South entrance tunnel.
 */
export function resolveRecreationCollisions(
  x: number,
  z: number,
  radius: number,
  elevationY = 0,
  colliders: RecreationColliderSet = RECREATION_COLLIDERS,
): { x: number; z: number; hit: boolean; normalX: number; normalZ: number } {
  let rx = x;
  let rz = z;
  let hit = false;
  let nx = 0;
  let nz = 0;

  // Two clean solver passes guarantee corner/dugout+wall contacts never push an actor into an adjacent collider
  for (let pass = 0; pass < 2; pass++) {
    let passHit = false;

    // 1. Solid Box Colliders (park walls, fences, gate piers, playground structures, bleachers, dugouts, arch piers)
    for (let i = 0; i < colliders.boxes.length; i++) {
      const b = colliders.boxes[i];
      if (elevationY > b.height + 0.5) continue;
      const halfW = b.width * 0.5;
      const halfD = b.depth * 0.5;
      if (
        rx < b.x - halfW - radius ||
        rx > b.x + halfW + radius ||
        rz < b.z - halfD - radius ||
        rz > b.z + halfD + radius
      ) {
        continue;
      }

      const closestX = Math.max(b.x - halfW, Math.min(rx, b.x + halfW));
      const closestZ = Math.max(b.z - halfD, Math.min(rz, b.z + halfD));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        hit = true;
        passHit = true;
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          const pnx = dx / dist;
          const pnz = dz / dist;
          rx += pnx * push;
          rz += pnz * push;
          nx = pnx;
          nz = pnz;
        } else {
          const penL = rx - (b.x - halfW);
          const penR = b.x + halfW - rx;
          const penT = rz - (b.z - halfD);
          const penB = b.z + halfD - rz;
          const minPen = Math.min(penL, penR, penT, penB);
          if (minPen === penL) {
            rx = b.x - halfW - radius;
            nx = -1;
            nz = 0;
          } else if (minPen === penR) {
            rx = b.x + halfW + radius;
            nx = 1;
            nz = 0;
          } else if (minPen === penT) {
            rz = b.z - halfD - radius;
            nx = 0;
            nz = -1;
          } else {
            rz = b.z + halfD + radius;
            nx = 0;
            nz = 1;
          }
        }
      }
    }

    // 2. Solid Cylinder Colliders (trees, fountains, climbing domes, light masts, pergola posts, stadium bollards)
    for (let i = 0; i < colliders.cylinders.length; i++) {
      const c = colliders.cylinders[i];
      if (elevationY > c.height + 0.5) continue;
      const minDist = c.radius + radius;
      const dx = rx - c.x;
      const dz = rz - c.z;
      if (Math.abs(dx) >= minDist || Math.abs(dz) >= minDist) continue;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist) {
        hit = true;
        passHit = true;
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const pnx = dx / dist;
          const pnz = dz / dist;
          rx = c.x + pnx * minDist;
          rz = c.z + pnz * minDist;
          nx = pnx;
          nz = pnz;
        } else {
          rx = c.x + minDist;
          nx = 1;
          nz = 0;
        }
      }
    }

    // 3. Annular Stadium Bowls (solid 333° concrete/colonnade ring + open South entrance corridor)
    for (let i = 0; i < colliders.stadiums.length; i++) {
      const s = colliders.stadiums[i];
      if (elevationY > s.height + 0.5) continue;

      const dx = rx - s.cx;
      const dz = rz - s.cz;
      const dist = Math.hypot(dx, dz);
      const minBand = s.innerRadius - radius;
      const maxBand = s.outerRadius + radius;

      if (dist > minBand && dist < maxBand && dist > 0.001) {
        const inGateCorridor = dz > s.innerRadius * 0.72 && Math.abs(dx) < s.gateHalfWidth;
        if (inGateCorridor) {
          const maxLocalX = Math.max(0.5, s.gateHalfWidth - radius);
          if (dx > maxLocalX) {
            rx = s.cx + maxLocalX;
            hit = true;
            passHit = true;
            nx = -1;
            nz = 0;
          } else if (dx < -maxLocalX) {
            rx = s.cx - maxLocalX;
            hit = true;
            passHit = true;
            nx = 1;
            nz = 0;
          }
        } else {
          const midR = (s.innerRadius + s.outerRadius) * 0.5;
          const ux = dx / dist;
          const uz = dz / dist;
          if (dist < midR) {
            rx = s.cx + ux * minBand;
            rz = s.cz + uz * minBand;
            nx = -ux;
            nz = -uz;
          } else {
            rx = s.cx + ux * maxBand;
            rz = s.cz + uz * maxBand;
            nx = ux;
            nz = uz;
          }
          hit = true;
          passHit = true;
        }
      }
    }

    if (!passHit) break;
  }

  return { x: rx, z: rz, hit, normalX: nx, normalZ: nz };
}
