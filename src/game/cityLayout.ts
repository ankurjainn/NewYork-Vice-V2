import type {
  BuildingArchVariant,
  BuildingCollider,
  BuildingShopDef,
  BuildingStyle,
  DistrictId,
  LandmarkDef,
} from './types';

export const ROAD_COORDS = [-56, 0, 56, 112, 168, 224, 280, 336, 392, 448, 504] as const;
export const ROAD_WIDTH = 14;
export const ROAD_HALF = ROAD_WIDTH / 2;

export const WEST_BOUND = -66;
export const EAST_BOUND = 548;
export const NORTH_BOUND = -108;
export const SOUTH_BOUND = 548;

export const OCEAN_WEST_BOUND = -360;
export const SEA_NORTH_BOUND = -310;
export const SEA_SOUTH_BOUND = 548;

export const PLAYER_SPAWN = {
  x: -4.5,
  z: -24,
  heading: Math.PI, // Facing north (-Z) toward Washington Square Marble Arch & Hudson Harbor
} as const;

export interface PierZone {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  dockX: number;
  dockZ: number;
  disembarkX: number;
  disembarkZ: number;
}

export type PierZoneDef = PierZone;

export const PIER_ZONES: PierZone[] = [
  {
    id: 'battery_ferry_pier',
    name: 'Battery Ferry Pier',
    minX: -128,
    maxX: -66,
    minZ: -90,
    maxZ: -74,
    dockX: -116,
    dockZ: -95,
    disembarkX: -94,
    disembarkZ: -82,
  },
  {
    id: 'hudson_pier_25',
    name: 'Hudson River Pier 25',
    minX: -122,
    maxX: -66,
    minZ: 12,
    maxZ: 24,
    dockX: -112,
    dockZ: 8,
    disembarkX: -92,
    disembarkZ: 18,
  },
  {
    id: 'chelsea_piers',
    name: 'Chelsea Piers Marina',
    minX: -130,
    maxX: -66,
    minZ: 214,
    maxZ: 228,
    dockX: -118,
    dockZ: 208,
    disembarkX: -96,
    disembarkZ: 221,
  },
  {
    id: 'coney_boardwalk_pier',
    name: 'Coney Island Boardwalk Pier',
    minX: -124,
    maxX: -66,
    minZ: 408,
    maxZ: 422,
    dockX: -114,
    dockZ: 402,
    disembarkX: -94,
    disembarkZ: 415,
  },
];

/** Offshore Liberty Island featuring the Statue of Liberty */
export const LIBERTY_ISLAND = {
  x: -205,
  z: -178,
  radius: 36,
  dockX: -162,
  dockZ: -174,
  disembarkX: -178,
  disembarkZ: -176,
} as const;

/** Compatibility alias for simulation.ts / tests */
export const ELEPHANTA_ISLAND = LIBERTY_ISLAND;

export interface SeaBuoyDef {
  id: string;
  x: number;
  z: number;
  label: string;
}

export const SEA_BUOYS: SeaBuoyDef[] = [
  { id: 'buoy_1', x: -154, z: -102, label: 'Hudson Channel #1' },
  { id: 'buoy_2', x: -188, z: -136, label: 'Liberty Channel #2' },
  { id: 'buoy_3', x: -160, z: -22, label: 'Lower Bay Marker #3' },
  { id: 'buoy_4', x: -236, z: 54, label: 'Ellis Deep Reef #4' },
  { id: 'buoy_5', x: -170, z: 146, label: 'Chelsea Harbor #5' },
  { id: 'buoy_6', x: -242, z: 234, label: 'Verrazzano Narrows #6' },
  { id: 'buoy_7', x: -182, z: 336, label: 'Coney Outer Buoy #7' },
  { id: 'buoy_8', x: -252, z: 432, label: 'Atlantic Marker #8' },
];

export interface RespawnPoint {
  id: string;
  name: string;
  district: DistrictId;
  x: number;
  z: number;
  heading: number;
}

export const RESPAWN_POINTS: RespawnPoint[] = [
  { id: 'respawn_wash_sq', name: 'Washington Square Plaza', district: 'Washington Square', x: -4.5, z: -24, heading: Math.PI },
  { id: 'respawn_battery', name: 'Battery Park Promenade', district: 'Battery Park', x: -56, z: 34, heading: 0 },
  { id: 'respawn_wallst', name: 'Wall Street Exchange', district: 'Wall Street', x: 56, z: 10, heading: Math.PI * 0.5 },
  { id: 'respawn_centralpark', name: 'Central Park South Gate', district: 'Union Square', x: 0, z: 84, heading: Math.PI * 0.5 },
  { id: 'respawn_soho', name: 'SoHo Broadway', district: 'SoHo Lofts', x: 112, z: 132, heading: 0 },
  { id: 'respawn_chinatown', name: 'Canal St & Chinatown', district: 'Chinatown', x: 168, z: 220, heading: Math.PI },
  { id: 'respawn_midtown', name: 'Times Square Midtown', district: 'Midtown West', x: 56, z: 224, heading: Math.PI * 0.5 },
  { id: 'respawn_chelsea', name: 'Chelsea Piers Overlook', district: 'Chelsea Piers', x: -56, z: 248, heading: 0 },
  { id: 'respawn_williamsburg', name: 'Williamsburg Bridge Plaza', district: 'Williamsburg', x: 112, z: 336, heading: Math.PI * 0.5 },
  { id: 'respawn_bronx', name: 'Bronx Stadium Plaza', district: 'Bronx Stadium', x: 336, z: 168, heading: Math.PI },
  { id: 'respawn_harlem', name: 'Harlem Rucker Courts', district: 'Harlem Rucker', x: 280, z: 140, heading: -Math.PI * 0.5 },
  { id: 'respawn_flushing', name: 'Flushing Meadows Park', district: 'Flushing Meadows', x: 392, z: 252, heading: Math.PI * 0.5 },
];

export function selectRespawnPoint(
  lastX: number,
  lastZ: number,
  attemptIndex: number,
): RespawnPoint {
  const ranked = [...RESPAWN_POINTS].sort((a, b) => {
    const da = Math.hypot(a.x - lastX, a.z - lastZ);
    const db = Math.hypot(b.x - lastX, b.z - lastZ);
    return db - da;
  });
  const pool = ranked.slice(0, Math.min(8, ranked.length));
  return pool[Math.abs(attemptIndex) % pool.length];
}

export interface FlyoverDef {
  id: string;
  name: string;
  axis: 'ew' | 'ns';
  centerCoord: number;
  startCoord: number;
  endCoord: number;
  rampLen: number;
  deckHeight: number;
  halfWidth: number;
}

export const FLYOVERS: FlyoverDef[] = [
  {
    id: 'fdr_viaduct',
    name: 'FDR Express Viaduct',
    axis: 'ew',
    centerCoord: 56,
    startCoord: -32,
    endCoord: 196,
    rampLen: 36,
    deckHeight: 6.4,
    halfWidth: 5.0,
  },
  {
    id: 'brooklyn_bridge_connector',
    name: 'Brooklyn Bridge Connector',
    axis: 'ns',
    centerCoord: 168,
    startCoord: -28,
    endCoord: 204,
    rampLen: 36,
    deckHeight: 6.6,
    halfWidth: 5.0,
  },
  {
    id: 'williamsburg_skyway',
    name: 'Williamsburg Skyway',
    axis: 'ew',
    centerCoord: 280,
    startCoord: -32,
    endCoord: 252,
    rampLen: 38,
    deckHeight: 6.8,
    halfWidth: 5.1,
  },
  {
    id: 'queensboro_overpass',
    name: 'Queensboro Express Overpass',
    axis: 'ns',
    centerCoord: 56,
    startCoord: 196,
    endCoord: 424,
    rampLen: 38,
    deckHeight: 6.6,
    halfWidth: 5.0,
  },
  {
    id: 'bronx_expressway',
    name: 'Bronx Cross-Expressway',
    axis: 'ew',
    centerCoord: 168,
    startCoord: 248,
    endCoord: 484,
    rampLen: 38,
    deckHeight: 6.8,
    halfWidth: 5.1,
  },
];

export type RecreationZoneKind = 'park' | 'playground' | 'courts' | 'stadium';

export interface RecreationZoneDef {
  id: string;
  name: string;
  subtitle: string;
  kind: RecreationZoneKind;
  district: DistrictId;
  bxMin: number;
  bxMax: number;
  bzMin: number;
  bzMax: number;
  cx: number;
  cz: number;
  width: number;
  depth: number;
  accentHex: number;
}

export const RECREATION_ZONES: RecreationZoneDef[] = [
  {
    id: 'washington_sq_playground',
    name: 'Washington Square Playground',
    subtitle: 'Swings, Slides & Village Plaza',
    kind: 'playground',
    district: 'Washington Square',
    bxMin: 1,
    bxMax: 1,
    bzMin: 0,
    bzMax: 0,
    cx: 28,
    cz: -28,
    width: 38,
    depth: 38,
    accentHex: 0xf59e0b,
  },
  {
    id: 'central_park_lawn',
    name: 'Central Park Great Lawn',
    subtitle: 'Pickup Cricket Pitch & Park Vendors',
    kind: 'park',
    district: 'Union Square',
    bxMin: 1,
    bxMax: 1,
    bzMin: 2,
    bzMax: 2,
    cx: 28,
    cz: 84,
    width: 40,
    depth: 40,
    accentHex: 0x22c55e,
  },
  {
    id: 'harlem_rucker_courts',
    name: 'Harlem Rucker Park Courts',
    subtitle: 'Legendary Streetball & Tennis',
    kind: 'courts',
    district: 'Harlem Rucker',
    bxMin: 5,
    bxMax: 5,
    bzMin: 3,
    bzMax: 3,
    cx: 252,
    cz: 140,
    width: 40,
    depth: 40,
    accentHex: 0x0ea5e9,
  },
  {
    id: 'bronx_stadium_arena',
    name: 'Bronx Ballpark & Arena',
    subtitle: 'NYC Championship Turf · Floodlit Bowl',
    kind: 'stadium',
    district: 'Bronx Stadium',
    bxMin: 6,
    bxMax: 7,
    bzMin: 1,
    bzMax: 2,
    cx: 336,
    cz: 56,
    width: 96,
    depth: 96,
    accentHex: 0x38bdf8,
  },
  {
    id: 'west4_cage_courts',
    name: 'West 4th St Cage Courts',
    subtitle: 'Midnight Streetball & Turf',
    kind: 'courts',
    district: 'Lower East Side',
    bxMin: 1,
    bxMax: 1,
    bzMin: 8,
    bzMax: 8,
    cx: 28,
    cz: 420,
    width: 40,
    depth: 40,
    accentHex: 0x14b8a6,
  },
  {
    id: 'flushing_meadows_park',
    name: 'Flushing Meadows Park',
    subtitle: 'Queens Pickup Cricket & Walking Paths',
    kind: 'park',
    district: 'Flushing Meadows',
    bxMin: 8,
    bxMax: 8,
    bzMin: 5,
    bzMax: 5,
    cx: 420,
    cz: 252,
    width: 40,
    depth: 40,
    accentHex: 0x16a34a,
  },
  {
    id: 'queens_family_playground',
    name: 'Astoria Family Playground',
    subtitle: 'Kids Park & Green Plaza',
    kind: 'playground',
    district: 'Flushing Meadows',
    bxMin: 7,
    bxMax: 7,
    bzMin: 7,
    bzMax: 7,
    cx: 364,
    cz: 364,
    width: 38,
    depth: 38,
    accentHex: 0xf97316,
  },
];

export interface IntersectionDef {
  id: string;
  x: number;
  z: number;
  phaseOffset: number;
}

export function buildIntersections(): IntersectionDef[] {
  const list: IntersectionDef[] = [];
  for (let ix = 0; ix < ROAD_COORDS.length; ix++) {
    for (let iz = 0; iz < ROAD_COORDS.length; iz++) {
      const rx = ROAD_COORDS[ix];
      const rz = ROAD_COORDS[iz];
      if (rx === 336 && rz === 56) continue;
      list.push({
        id: `int_${rx}_${rz}`,
        x: rx,
        z: rz,
        phaseOffset: ((ix + iz) % 2) * 9,
      });
    }
  }
  return list;
}

export const INTERSECTIONS: IntersectionDef[] = buildIntersections();

export interface StreetGantryDef {
  id: string;
  x: number;
  z: number;
  axis: 'ns' | 'ew';
  leftArrow: string;
  centerDest: string;
  rightArrow: string;
  routeBadge: string;
}

export const STREET_GANTRIES: StreetGantryDef[] = [
  {
    id: 'gantry_wash_sq',
    x: 0,
    z: -42,
    axis: 'ns',
    leftArrow: '← BATTERY PARK',
    centerDest: 'WASHINGTON SQ ARCH ↑',
    rightArrow: 'WALL STREET →',
    routeBadge: 'NYC 9A',
  },
  {
    id: 'gantry_battery',
    x: -56,
    z: 84,
    axis: 'ns',
    leftArrow: '← HUDSON PIER 25',
    centerDest: 'BATTERY FERRY ↑',
    rightArrow: 'CENTRAL PARK →',
    routeBadge: 'WEST SIDE',
  },
  {
    id: 'gantry_wall_st',
    x: 28,
    z: 0,
    axis: 'ew',
    leftArrow: '← BATTERY PARK',
    centerDest: 'WALL ST · FIDI →',
    rightArrow: 'BROOKLYN BR ↗',
    routeBadge: 'FDR',
  },
  {
    id: 'gantry_fdr_viaduct',
    x: 112,
    z: 28,
    axis: 'ns',
    leftArrow: '← CENTRAL PARK',
    centerDest: 'SOHO · FDR VIADUCT ↑',
    rightArrow: 'BROOKLYN BR →',
    routeBadge: 'I-95',
  },
  {
    id: 'gantry_soho',
    x: 84,
    z: 112,
    axis: 'ew',
    leftArrow: '← CENTRAL PARK',
    centerDest: 'SOHO LOFTS →',
    rightArrow: 'CHINATOWN ↗',
    routeBadge: 'BWAY',
  },
  {
    id: 'gantry_midtown_west',
    x: 56,
    z: 196,
    axis: 'ns',
    leftArrow: '← CHELSEA PIERS',
    centerDest: 'TIMES SQUARE ↑',
    rightArrow: 'CHINATOWN →',
    routeBadge: '7TH AVE',
  },
  {
    id: 'gantry_chinatown',
    x: 196,
    z: 224,
    axis: 'ew',
    leftArrow: '← TIMES SQUARE',
    centerDest: 'CANAL ST · CHINATOWN →',
    rightArrow: 'BKLYN BR ↑',
    routeBadge: 'CANAL',
  },
  {
    id: 'gantry_chelsea',
    x: -56,
    z: 252,
    axis: 'ns',
    leftArrow: '← CHELSEA MARINA',
    centerDest: 'HUDSON GREENWAY ↑',
    rightArrow: 'TIMES SQ →',
    routeBadge: 'RT 9A',
  },
  {
    id: 'gantry_williamsburg',
    x: 140,
    z: 336,
    axis: 'ew',
    leftArrow: '← CONEY ISLAND',
    centerDest: 'WILLIAMSBURG →',
    rightArrow: 'QUEENSBORO ↗',
    routeBadge: 'BQE',
  },
  {
    id: 'gantry_bronx_stadium',
    x: 280,
    z: 56,
    axis: 'ew',
    leftArrow: '← MIDTOWN EAST',
    centerDest: 'BRONX ARENA →',
    rightArrow: 'FLUSHING ↗',
    routeBadge: 'I-87',
  },
  {
    id: 'gantry_harlem_rucker',
    x: 252,
    z: 168,
    axis: 'ew',
    leftArrow: '← MIDTOWN',
    centerDest: 'HARLEM RUCKER PARK →',
    rightArrow: 'BRONX ↑',
    routeBadge: '155TH',
  },
  {
    id: 'gantry_flushing_park',
    x: 392,
    z: 224,
    axis: 'ns',
    leftArrow: '← HARLEM COURTS',
    centerDest: 'FLUSHING MEADOWS ↑',
    rightArrow: 'QUEENS PARK →',
    routeBadge: 'GCP',
  },
];

export interface AreaHoardingDef {
  id: string;
  x: number;
  z: number;
  rotationY: number;
  title: string;
  subtitle: string;
  bgHex: string;
  accentHex: string;
}

export const AREA_HOARDINGS: AreaHoardingDef[] = [
  {
    id: 'hoard_wash_sq',
    x: 14,
    z: -62,
    rotationY: -0.32,
    title: 'WASHINGTON SQUARE',
    subtitle: 'GREENWICH VILLAGE · ARCH PLAZA',
    bgHex: '#18181b',
    accentHex: '#f59e0b',
  },
  {
    id: 'hoard_battery',
    x: -44,
    z: 26,
    rotationY: 0.45,
    title: 'BATTERY PARK',
    subtitle: 'STATUE OF LIBERTY FERRY SLIPS',
    bgHex: '#0c2742',
    accentHex: '#38bdf8',
  },
  {
    id: 'hoard_central_park',
    x: 16,
    z: 66,
    rotationY: -0.25,
    title: 'CENTRAL PARK LAWN',
    subtitle: 'PICKUP CRICKET · HOT DOG CARTS',
    bgHex: '#14532d',
    accentHex: '#4ade80',
  },
  {
    id: 'hoard_wallst',
    x: 68,
    z: -14,
    rotationY: -0.45,
    title: 'WALL STREET',
    subtitle: 'NYC FINANCIAL EXCHANGE',
    bgHex: '#1e293b',
    accentHex: '#facc15',
  },
  {
    id: 'hoard_soho',
    x: 124,
    z: 102,
    rotationY: 0.3,
    title: 'SOHO LOFTS',
    subtitle: 'CAST-IRON GALLERIES & KICKS',
    bgHex: '#3b0764',
    accentHex: '#e879f9',
  },
  {
    id: 'hoard_midtown',
    x: 42,
    z: 210,
    rotationY: -0.35,
    title: 'TIMES SQUARE',
    subtitle: 'BROADWAY NEON · MIDTOWN WEST',
    bgHex: '#450a0a',
    accentHex: '#fb7185',
  },
  {
    id: 'hoard_chinatown',
    x: 180,
    z: 196,
    rotationY: 0.28,
    title: 'CHINATOWN',
    subtitle: 'CANAL STREET NIGHT MARKET',
    bgHex: '#7f1d1d',
    accentHex: '#fde047',
  },
  {
    id: 'hoard_chelsea',
    x: -46,
    z: 236,
    rotationY: 0.5,
    title: 'CHELSEA PIERS',
    subtitle: 'HUDSON BOAT CLUB & SPEEDBOATS',
    bgHex: '#0c4a6e',
    accentHex: '#2dd4bf',
  },
  {
    id: 'hoard_bronx',
    x: 278,
    z: 96,
    rotationY: -0.42,
    title: 'BRONX ARENA',
    subtitle: 'NYC CHAMPIONSHIP BALLPARK',
    bgHex: '#0f172a',
    accentHex: '#38bdf8',
  },
  {
    id: 'hoard_harlem',
    x: 236,
    z: 126,
    rotationY: 0.35,
    title: 'HARLEM RUCKER',
    subtitle: 'STREETBALL LEGENDS COURTS',
    bgHex: '#134e4a',
    accentHex: '#2dd4bf',
  },
  {
    id: 'hoard_flushing',
    x: 404,
    z: 236,
    rotationY: -0.3,
    title: 'FLUSHING MEADOWS',
    subtitle: 'QUEENS PICKUP CRICKET CUP',
    bgHex: '#14532d',
    accentHex: '#fde047',
  },
];

export function isPointInWater(x: number, z: number): boolean {
  const dx = x - LIBERTY_ISLAND.x;
  const dz = z - LIBERTY_ISLAND.z;
  if (dx * dx + dz * dz <= LIBERTY_ISLAND.radius * LIBERTY_ISLAND.radius) {
    return false;
  }
  for (let i = 0; i < PIER_ZONES.length; i++) {
    const p = PIER_ZONES[i];
    if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) {
      return false;
    }
  }
  return x < -66.5 || z < -109;
}

export function findNearestDisembarkPoint(
  x: number,
  z: number,
  maxDist = 24,
): { x: number; z: number; name: string } | null {
  let best: { x: number; z: number; name: string } | null = null;
  let bestD = maxDist;

  for (const p of PIER_ZONES) {
    const d = Math.hypot(x - p.dockX, z - p.dockZ);
    const dMid = Math.hypot(x - p.disembarkX, z - p.disembarkZ);
    const minD = Math.min(d, dMid);
    if (minD < bestD) {
      bestD = minD;
      best = { x: p.disembarkX, z: p.disembarkZ, name: p.name };
    }
  }

  const islDist = Math.hypot(x - LIBERTY_ISLAND.x, z - LIBERTY_ISLAND.z) - LIBERTY_ISLAND.radius;
  if (islDist < maxDist * 0.7 && islDist < bestD) {
    const ang = Math.atan2(z - LIBERTY_ISLAND.z, x - LIBERTY_ISLAND.x);
    best = {
      x: LIBERTY_ISLAND.x + Math.cos(ang) * (LIBERTY_ISLAND.radius - 4.5),
      z: LIBERTY_ISLAND.z + Math.sin(ang) * (LIBERTY_ISLAND.radius - 4.5),
      name: 'Liberty Island',
    };
  }

  return best;
}

export function sampleFlyoverElevation(x: number, z: number): {
  height: number;
  flyoverId: string | null;
} {
  let bestH = 0;
  let bestId: string | null = null;
  for (let i = 0; i < FLYOVERS.length; i++) {
    const f = FLYOVERS[i];
    const along = f.axis === 'ew' ? x : z;
    const across = Math.abs((f.axis === 'ew' ? z : x) - f.centerCoord);
    if (across > f.halfWidth) continue;
    if (along < f.startCoord || along > f.endCoord) continue;

    let h = f.deckHeight;
    if (along < f.startCoord + f.rampLen) {
      const t = (along - f.startCoord) / f.rampLen;
      h = f.deckHeight * (t * t * (3 - 2 * t));
    } else if (along > f.endCoord - f.rampLen) {
      const t = (f.endCoord - along) / f.rampLen;
      h = f.deckHeight * (t * t * (3 - 2 * t));
    }
    if (h > bestH) {
      bestH = h;
      bestId = f.id;
    }
  }
  return { height: bestH, flyoverId: bestId };
}

export function sampleWorldElevation(
  x: number,
  z: number,
  currentY = 0,
): { groundY: number; onFlyover: boolean; flyoverId: string | null } {
  const sample = sampleFlyoverElevation(x, z);
  if (sample.flyoverId && (currentY >= sample.height - 1.6 || sample.height <= 1.45)) {
    return { groundY: sample.height, onFlyover: true, flyoverId: sample.flyoverId };
  }
  return { groundY: 0, onFlyover: false, flyoverId: null };
}

export const LANDMARKS: LandmarkDef[] = [
  { id: 'wash_sq_arch', name: 'Washington Square Arch', district: 'Washington Square', x: 0, z: -90, color: '#f59e0b' },
  { id: 'battery_pier', name: 'Battery Ferry Pier', district: 'Battery Ferry Pier', x: -96, z: -82, color: '#06b6d4' },
  { id: 'statue_of_liberty', name: 'Statue of Liberty', district: 'Hudson Harbor', x: -205, z: -178, color: '#2dd4bf' },
  { id: 'hudson_pier_25', name: 'Hudson River Pier 25', district: 'Battery Park', x: -92, z: 18, color: '#38bdf8' },
  { id: 'wall_st_exchange', name: 'Wall Street Exchange', district: 'Wall Street', x: 56, z: -28, color: '#fbbf24' },
  { id: 'central_park_cricket', name: 'Central Park Great Lawn', district: 'Union Square', x: 28, z: 84, color: '#22c55e' },
  { id: 'soho_gallery', name: 'SoHo Cast-Iron Plaza', district: 'SoHo Lofts', x: 112, z: 140, color: '#e879f9' },
  { id: 'brooklyn_bridge_ramp', name: 'Brooklyn Bridge Ramp', district: 'Brooklyn Bridge', x: 168, z: 56, color: '#38bdf8' },
  { id: 'fdr_viaduct', name: 'FDR Express Viaduct', district: 'Financial District', x: 56, z: 56, color: '#60a5fa' },
  { id: 'times_square', name: 'Times Square Midtown', district: 'Midtown West', x: 56, z: 224, color: '#f43f5e' },
  { id: 'chinatown_gate', name: 'Chinatown Canal Market', district: 'Chinatown', x: 168, z: 224, color: '#ef4444' },
  { id: 'chelsea_marina', name: 'Chelsea Piers Marina', district: 'Chelsea Piers', x: -96, z: 221, color: '#14b8a6' },
  { id: 'williamsburg_bridge', name: 'Williamsburg Skyway', district: 'Williamsburg', x: 112, z: 336, color: '#fb923c' },
  { id: 'coney_pier', name: 'Coney Island Boardwalk', district: 'Coney Island', x: -94, z: 415, color: '#38bdf8' },
  { id: 'empire_spire', name: 'Empire Midtown Spire', district: 'Midtown East', x: 224, z: 56, color: '#eab308' },
  { id: 'bronx_stadium', name: 'Bronx Ballpark & Arena', district: 'Bronx Stadium', x: 336, z: 56, color: '#38bdf8' },
  { id: 'harlem_rucker', name: 'Harlem Rucker Courts', district: 'Harlem Rucker', x: 252, z: 140, color: '#0ea5e9' },
  { id: 'wash_sq_playground', name: 'Washington Sq Playground', district: 'Washington Square', x: 28, z: -28, color: '#f59e0b' },
  { id: 'west4_cage', name: 'West 4th St Cage Courts', district: 'Lower East Side', x: 28, z: 420, color: '#14b8a6' },
  { id: 'flushing_park', name: 'Flushing Meadows Cricket', district: 'Flushing Meadows', x: 420, z: 252, color: '#16a34a' },
  { id: 'queens_playground', name: 'Astoria Family Playground', district: 'Flushing Meadows', x: 364, z: 364, color: '#f97316' },
];

export function getDistrictAt(x: number, z: number, elevationY = 0): DistrictId {
  const f = sampleFlyoverElevation(x, z);
  if (f.flyoverId && elevationY > 2.2) {
    if (f.flyoverId === 'brooklyn_bridge_connector') return 'Brooklyn Bridge';
    if (f.flyoverId === 'williamsburg_skyway') return 'Williamsburg';
    if (f.flyoverId === 'bronx_expressway') return 'Bronx Stadium';
    return 'Financial District';
  }
  if (x < -128 || z < -112) return 'Hudson Harbor';
  if (x < -64) {
    if (z < -30) return 'Battery Ferry Pier';
    if (z > 350) return 'Coney Island';
    if (z > 165) return 'Chelsea Piers';
    return 'Battery Park';
  }
  if (x > 256) {
    if (z < 118) return 'Bronx Stadium';
    if (z < 210 && x < 340) return 'Harlem Rucker';
    return 'Flushing Meadows';
  }
  if (z < -18) {
    if (x > 130) return 'Midtown East';
    if (x > 30) return 'Wall Street';
    return 'Washington Square';
  }
  if (z > 348) {
    if (x < 40) return 'Lower East Side';
    return 'Williamsburg';
  }
  if (z > 170) {
    if (x > 140) return 'Chinatown';
    return 'Midtown West';
  }
  if (x < 42 && z >= 42 && z <= 130) return 'Union Square';
  if (x > 145) return 'Brooklyn Bridge';
  if (z > 88) return 'SoHo Lofts';
  return 'Financial District';
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const NYC_BILLBOARD_LABELS = [
  'TIMES SQUARE LIVE',
  'NYC PIZZA $1.50',
  'BROADWAY SHOWS',
  'STATEN FERRY',
  'SOHO KICKS LAB',
  'MANHATTAN GT',
  'KATZ DELI NYC',
  'BRONX ARENA',
  'HUDSON YARDS',
  'RUCKER HOOPS',
  'WALL ST LIVE',
  'NYC CRICKET CUP',
];

function pickArchVariant(
  district: DistrictId,
  bx: number,
  bz: number,
  slotIndex: number,
  rand: () => number,
): BuildingArchVariant {
  const r = rand();
  const mix = (bx * 7 + bz * 13 + slotIndex * 5) % 9;

  if (district === 'Midtown West') {
    if (r < 0.44) return 'times_square_neon';
    if (r < 0.7) return 'artdeco_spire';
    if (r < 0.88) return 'glass_supertall';
    return 'flatiron_wedge';
  }
  if (district === 'Wall Street' || district === 'Financial District' || district === 'Midtown East') {
    if (r < 0.36) return 'artdeco_spire';
    if (r < 0.72) return 'glass_supertall';
    if (r < 0.88) return 'flatiron_wedge';
    return 'prewar_limestone';
  }
  if (district === 'SoHo Lofts') {
    if (r < 0.46) return 'cast_iron_loft';
    if (r < 0.74) return 'brownstone';
    return 'prewar_limestone';
  }
  if (district === 'Lower East Side' || district === 'Chinatown') {
    if (r < 0.48) return 'tenement_fireescape';
    if (r < 0.76) return 'brownstone';
    return 'times_square_neon';
  }
  if (district === 'Williamsburg' || district === 'Brooklyn Bridge') {
    if (r < 0.42) return 'dumbo_warehouse';
    if (r < 0.72) return 'tenement_fireescape';
    return 'cast_iron_loft';
  }
  if (district === 'Harlem Rucker' || district === 'Washington Square') {
    if (r < 0.48) return 'brownstone';
    if (r < 0.78) return 'prewar_limestone';
    return 'tenement_fireescape';
  }

  // Diverse NYC borough mix for remaining blocks
  const allVariants: BuildingArchVariant[] = [
    'artdeco_spire',
    'glass_supertall',
    'brownstone',
    'tenement_fireescape',
    'cast_iron_loft',
    'times_square_neon',
    'flatiron_wedge',
    'prewar_limestone',
    'dumbo_warehouse',
  ];
  return allVariants[mix];
}

function variantSpec(variant: BuildingArchVariant, rand: () => number): {
  style: BuildingStyle;
  minH: number;
  maxH: number;
  colors: number[];
  accents: number[];
} {
  switch (variant) {
    case 'artdeco_spire':
      return {
        style: 'heritage',
        minH: 26,
        maxH: 46,
        colors: [0xd9ccb8, 0xc7b8a3, 0xbdb09c, 0xe2d5c1],
        accents: [0xf59e0b, 0x38bdf8, 0xfbbf24],
      };
    case 'glass_supertall':
      return {
        style: 'modern',
        minH: 30,
        maxH: 52,
        colors: [0x2a455e, 0x1e3a52, 0x36546d, 0x264860],
        accents: [0x38bdf8, 0x2dd4bf, 0x93c5fd],
      };
    case 'brownstone':
      return {
        style: 'midrise',
        minH: 10,
        maxH: 17,
        colors: [0x8b4c39, 0x7a4232, 0x9c5a44, 0x6f3e31],
        accents: [0xfef3c7, 0xd97706, 0x475569],
      };
    case 'tenement_fireescape':
      return {
        style: 'bazaar',
        minH: 12,
        maxH: 21,
        colors: [0xa6493a, 0x934232, 0xb86246, 0x8d4a3a],
        accents: [0x1e293b, 0xf59e0b, 0xef4444],
      };
    case 'cast_iron_loft':
      return {
        style: 'plaza',
        minH: 15,
        maxH: 24,
        colors: [0xe7e0d4, 0xd4cbc0, 0xc7bfb2, 0xded6c8],
        accents: [0x334155, 0xa855f7, 0x0ea5e9],
      };
    case 'times_square_neon':
      return {
        style: 'modern',
        minH: 24,
        maxH: 42,
        colors: [0x272a36, 0x1f2430, 0x313644],
        accents: [0xf43f5e, 0x38bdf8, 0xfacc15, 0xc084fc],
      };
    case 'flatiron_wedge':
      return {
        style: 'heritage',
        minH: 22,
        maxH: 36,
        colors: [0xded0b6, 0xd2c3a8, 0xe8dcc7],
        accents: [0x14b8a6, 0xf59e0b, 0x334155],
      };
    case 'prewar_limestone':
      return {
        style: 'midrise',
        minH: 16,
        maxH: 27,
        colors: [0xd6c7b0, 0xc4b59f, 0xe0d5c3],
        accents: [0x1f4b43, 0x0f766e, 0xb45309],
      };
    case 'dumbo_warehouse':
      return {
        style: 'industrial',
        minH: 11,
        maxH: 19,
        colors: [0x8c3b2f, 0x7c3429, 0x9b4536, 0x69352c],
        accents: [0x334155, 0xf97316, 0x0284c7],
      };
  }
  void rand;
}

export function buildCityBuildings(): BuildingCollider[] {
  const rand = seededRand(20260704);
  const buildings: BuildingCollider[] = [];

  for (let bx = 0; bx < ROAD_COORDS.length - 1; bx++) {
    for (let bz = 0; bz < ROAD_COORDS.length - 1; bz++) {
      const rx0 = ROAD_COORDS[bx];
      const rx1 = ROAD_COORDS[bx + 1];
      const rz0 = ROAD_COORDS[bz];
      const rz1 = ROAD_COORDS[bz + 1];
      const cx = (rx0 + rx1) * 0.5;
      const cz = (rz0 + rz1) * 0.5;

      // Reserve open plaza for Washington Square Arch & Spawn
      if (bx === 0 && bz === 0) continue;

      // Reserve all Parks, Playgrounds, Courts & Bronx Stadium
      const inRecZone = RECREATION_ZONES.some(
        (z) => bx >= z.bxMin && bx <= z.bxMax && bz >= z.bzMin && bz <= z.bzMax,
      );
      if (inRecZone) continue;

      const usable = rx1 - rx0 - ROAD_WIDTH - 4.4;
      const district = getDistrictAt(cx, cz);

      // Vary block subdivision pattern (single landmark tower vs 2-slab vs 4-lot NYC block)
      const patternRoll = rand();
      const useTwoLot = patternRoll < 0.28;
      const useSingleTower =
        !useTwoLot &&
        patternRoll < 0.42 &&
        (district === 'Wall Street' || district === 'Financial District' || district === 'Midtown West' || district === 'Midtown East');

      if (useSingleTower) {
        const variant = pickArchVariant(district, bx, bz, 0, rand);
        const spec = variantSpec(variant, rand);
        const w = usable * (0.72 + rand() * 0.16);
        const d = usable * (0.72 + rand() * 0.16);
        const height = spec.minH + rand() * (spec.maxH - spec.minH) + 6;
        buildings.push({
          id: `b_${bx}_${bz}_tower`,
          x: cx,
          z: cz,
          width: w,
          depth: d,
          height,
          style: spec.style,
          archVariant: variant,
          colorHex: spec.colors[Math.floor(rand() * spec.colors.length)],
          accentHex: spec.accents[Math.floor(rand() * spec.accents.length)],
          district,
          hasRoofBillboard: variant === 'times_square_neon' || rand() > 0.6,
          billboardText: NYC_BILLBOARD_LABELS[Math.floor(rand() * NYC_BILLBOARD_LABELS.length)],
        });
        continue;
      }

      if (useTwoLot) {
        const horizontal = (bx + bz) % 2 === 0;
        for (let i = 0; i < 2; i++) {
          const offset = (i === 0 ? -0.25 : 0.25) * usable;
          const x = horizontal ? cx + offset : cx;
          const z = horizontal ? cz : cz + offset;
          const w = horizontal ? usable * 0.44 : usable * 0.84;
          const d = horizontal ? usable * 0.84 : usable * 0.44;
          const variant = pickArchVariant(district, bx, bz, i + 1, rand);
          const spec = variantSpec(variant, rand);
          const height = spec.minH + rand() * (spec.maxH - spec.minH);
          buildings.push({
            id: `b_${bx}_${bz}_d${i}`,
            x,
            z,
            width: w,
            depth: d,
            height,
            style: spec.style,
            archVariant: variant,
            colorHex: spec.colors[Math.floor(rand() * spec.colors.length)],
            accentHex: spec.accents[Math.floor(rand() * spec.accents.length)],
            district,
            hasRoofBillboard: variant === 'times_square_neon' || (height > 18 && rand() > 0.72),
            billboardText: NYC_BILLBOARD_LABELS[Math.floor(rand() * NYC_BILLBOARD_LABELS.length)],
          });
        }
        continue;
      }

      // 4 distinct corner parcels per block (each with its own variant & height!)
      const subW = (usable - 3.0) * 0.5;
      const subD = (usable - 3.0) * 0.5;
      let slot = 0;
      for (const ox of [-1, 1]) {
        for (const oz of [-1, 1]) {
          slot++;
          if (rand() < 0.08) continue;
          const variant = pickArchVariant(district, bx, bz, slot, rand);
          const spec = variantSpec(variant, rand);
          const w = subW * (0.78 + rand() * 0.2);
          const d = subD * (0.78 + rand() * 0.2);
          const height = spec.minH + rand() * (spec.maxH - spec.minH);
          const px = cx + ox * (subW * 0.5 + 1.45);
          const pz = cz + oz * (subD * 0.5 + 1.45);
          const hasRoofBillboard =
            variant === 'times_square_neon' ||
            (height > 19 && rand() > 0.76) ||
            (bx <= 2 && bz <= 2 && rand() > 0.8);

          buildings.push({
            id: `b_${bx}_${bz}_${ox}_${oz}`,
            x: px,
            z: pz,
            width: w,
            depth: d,
            height,
            style: spec.style,
            archVariant: variant,
            colorHex: spec.colors[Math.floor(rand() * spec.colors.length)],
            accentHex: spec.accents[Math.floor(rand() * spec.accents.length)],
            district,
            hasRoofBillboard,
            billboardText: NYC_BILLBOARD_LABELS[Math.floor(rand() * NYC_BILLBOARD_LABELS.length)],
          });
        }
      }
    }
  }

  // Signature NYC landmark spires along outer east/south skyline
  const skylineAnchors: Array<{
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    variant: BuildingArchVariant;
    color: number;
    accent: number;
    billboard?: string;
  }> = [
    { x: 224, z: -28, w: 18, d: 18, h: 52, variant: 'artdeco_spire', color: 0xddd0bc, accent: 0xf59e0b, billboard: 'EMPIRE SPIRE' },
    { x: 528, z: 28, w: 18, d: 22, h: 40, variant: 'glass_supertall', color: 0x264660, accent: 0x38bdf8, billboard: 'HUDSON YARDS' },
    { x: 528, z: 140, w: 18, d: 22, h: 36, variant: 'artdeco_spire', color: 0xd2c2a8, accent: 0xfbbf24 },
    { x: 528, z: 252, w: 18, d: 24, h: 32, variant: 'prewar_limestone', color: 0xd6c7b0, accent: 0x14b8a6 },
    { x: 528, z: 364, w: 18, d: 22, h: 28, variant: 'dumbo_warehouse', color: 0x8c3b2f, accent: 0xf97316 },
    { x: 28, z: 528, w: 22, d: 18, h: 26, variant: 'brownstone', color: 0x8b4c39, accent: 0xfef3c7 },
    { x: 140, z: 528, w: 22, d: 18, h: 30, variant: 'times_square_neon', color: 0x272a36, accent: 0xf43f5e, billboard: 'BROOKLYN LIVE' },
    { x: 252, z: 528, w: 22, d: 18, h: 34, variant: 'glass_supertall', color: 0x1e3a52, accent: 0x2dd4bf },
  ];

  skylineAnchors.forEach((s, idx) => {
    buildings.push({
      id: `b_skyline_${idx}`,
      x: s.x,
      z: s.z,
      width: s.w,
      depth: s.d,
      height: s.h,
      style: s.variant === 'glass_supertall' ? 'modern' : 'heritage',
      archVariant: s.variant,
      colorHex: s.color,
      accentHex: s.accent,
      district: getDistrictAt(s.x, s.z),
      hasRoofBillboard: Boolean(s.billboard),
      billboardText: s.billboard,
    });
  });

  return buildings;
}

export const CITY_BUILDINGS: BuildingCollider[] = buildCityBuildings();

interface ShopTemplate {
  shopName: string;
  subtitle: string;
  category: BuildingShopDef['category'];
  awningHex: number;
  signBgHex: string;
  signTextHex: string;
  shopkeeperName: string;
  shirtHex: number;
  itemLabel: string;
  price: number;
  perk: BuildingShopDef['perk'];
  pitchLines: string[];
  targetX: number;
  targetZ: number;
}

const NYC_SHOP_TEMPLATES: ShopTemplate[] = [
  {
    shopName: "JOE'S $1.50 PIZZA",
    subtitle: 'NY THIN CRUST · FRESH SLICES',
    category: 'pizza',
    awningHex: 0xdc2626,
    signBgHex: '#991b1b',
    signTextHex: '#fef08a',
    shopkeeperName: 'Vinny',
    shirtHex: 0xf8fafc,
    itemLabel: 'Hot Pepperoni Slice',
    price: 8,
    perk: 'heal_full',
    pitchLines: [
      'Fold it in half, boss — real New York thin crust straight from the brick oven! Full HP!',
      'Best slice in Manhattan! Eat up and hit the avenues!',
    ],
    targetX: -20,
    targetZ: 18,
  },
  {
    shopName: "KATZ'S DELI NYC",
    subtitle: 'PASTRAMI ON RYE · EST 1888',
    category: 'deli',
    awningHex: 0xb91c1c,
    signBgHex: '#18181b',
    signTextHex: '#facc15',
    shopkeeperName: 'Manny',
    shirtHex: 0x1e293b,
    itemLabel: 'Stacked Pastrami Sandwich',
    price: 18,
    perk: 'heal_full',
    pitchLines: [
      'Hand-carved pastrami piled sky-high! That’ll heal every bruise on your body!',
      'Don’t lose your deli ticket — full HP & stamina restored!',
    ],
    targetX: 40,
    targetZ: 28,
  },
  {
    shopName: 'SOHO KICKS LAB',
    subtitle: 'LIMITED SNEAKERS & STREETWEAR',
    category: 'sneakers',
    awningHex: 0x7c3aed,
    signBgHex: '#2e1065',
    signTextHex: '#f5d0fe',
    shopkeeperName: 'Devon',
    shirtHex: 0x6d28d9,
    itemLabel: 'Fresh NYC High-Tops',
    price: 95,
    perk: 'stamina_cash',
    pitchLines: [
      'Deadstock drop flipped right out the back! Stamina maxed + resale bonus!',
      'Walk out fresh in SoHo — nobody’s catching your stride now!',
    ],
    targetX: 100,
    targetZ: 120,
  },
  {
    shopName: 'BRONX AUTO & NITRO',
    subtitle: 'TURBO · BODYWORK · RESPRAY',
    category: 'garage',
    awningHex: 0x0284c7,
    signBgHex: '#0c4a6e',
    signTextHex: '#7dd3fc',
    shopkeeperName: 'Hector',
    shirtHex: 0x0369a1,
    itemLabel: 'Full Nitro & Chassis Tune',
    price: 140,
    perk: 'nitro_repair',
    pitchLines: [
      'Fresh twin-scroll boost and clean panels — your ride is showroom ready!',
      'Nitro tank topped to 100%! Tear up the Brooklyn Bridge!',
    ],
    targetX: 148,
    targetZ: 34,
  },
  {
    shopName: 'CANAL ST TECH',
    subtitle: 'SCANNERS · BURNERS · PHONES',
    category: 'electronics',
    awningHex: 0x0f766e,
    signBgHex: '#134e4a',
    signTextHex: '#5eead4',
    shopkeeperName: 'Kenji',
    shirtHex: 0x14b8a6,
    itemLabel: 'NYPD Radio Scrambler',
    price: 160,
    perk: 'drop_wanted',
    pitchLines: [
      'Swapped your plate signal on the scanner — NYPD just dropped a star!',
      'Clean burner phone & fresh transponder — stay ghost on Canal Street!',
    ],
    targetX: 158,
    targetZ: 204,
  },
  {
    shopName: 'BLEECKER ST VINYL',
    subtitle: 'JAZZ · HIP-HOP · RARE CRATES',
    category: 'vinyl',
    awningHex: 0xd97706,
    signBgHex: '#451a03',
    signTextHex: '#fde68a',
    shopkeeperName: 'Miles',
    shirtHex: 0xb45309,
    itemLabel: 'Rare 1994 Press Flip',
    price: 75,
    perk: 'stamina_cash',
    pitchLines: [
      'Collector paid top dollar for that vinyl press! Cash & energy boost!',
      'Pure Greenwich Village groove — pocket the profit!',
    ],
    targetX: 12,
    targetZ: 148,
  },
  {
    shopName: 'WALL ST WATCH CO',
    subtitle: 'SWISS TIMEPIECES · GOLD',
    category: 'watches',
    awningHex: 0xb45309,
    signBgHex: '#1c1917',
    signTextHex: '#fbbf24',
    shopkeeperName: 'Arthur',
    shirtHex: 0x1e293b,
    itemLabel: 'Broker Tip & Watch Trade',
    price: 120,
    perk: 'stamina_cash',
    pitchLines: [
      'Arbitrage trade cleared before the closing bell! Easy Wall Street profit!',
      'Time is money in FiDi — pocket that bonus!',
    ],
    targetX: 72,
    targetZ: -12,
  },
  {
    shopName: 'MIDTOWN ESPRESSO',
    subtitle: 'COLD BREW · EVERYTHING BAGELS',
    category: 'cafe',
    awningHex: 0x166534,
    signBgHex: '#14532d',
    signTextHex: '#dcfce7',
    shopkeeperName: 'Elena',
    shirtHex: 0x15803d,
    itemLabel: 'Double Espresso & Bagel',
    price: 12,
    perk: 'heal_full',
    pitchLines: [
      'Hot lox bagel and triple-shot espresso — you’re back to 100% HP!',
      'Fuel for the city that never sleeps! Stay sharp!',
    ],
    targetX: 44,
    targetZ: 204,
  },
  {
    shopName: 'DUMBO BAGEL BAKERY',
    subtitle: 'WOOD-FIRED BAGELS & PASTRY',
    category: 'bakery',
    awningHex: 0xea580c,
    signBgHex: '#7c2d12',
    signTextHex: '#ffedd5',
    shopkeeperName: 'Rosa',
    shirtHex: 0xc2410c,
    itemLabel: 'Warm Cinnamon Roll Box',
    price: 14,
    perk: 'heal_full',
    pitchLines: [
      'Fresh out of the Brooklyn brick oven! Full HP & Stamina!',
      'Nothing cures a high-speed chase like a warm DUMBO bagel!',
    ],
    targetX: 132,
    targetZ: 318,
  },
  {
    shopName: 'VILLAGE PHARMACY',
    subtitle: '24/7 FIRST AID & TONICS',
    category: 'pharmacy',
    awningHex: 0x059669,
    signBgHex: '#064e3b',
    signTextHex: '#a7f3d0',
    shopkeeperName: 'Dr. Patel',
    shirtHex: 0xf8fafc,
    itemLabel: 'NYC Trauma First-Aid Kit',
    price: 25,
    perk: 'heal_full',
    pitchLines: [
      'Patched up and good as new — take it easy on those Midtown intersections!',
      'Full health restored! Keep your eyes on the traffic lights.',
    ],
    targetX: -12,
    targetZ: 256,
  },
  {
    shopName: 'TIMES SQ CUSTOMS',
    subtitle: 'TURBO TUNING & UNDERGLOW',
    category: 'garage',
    awningHex: 0xe11d48,
    signBgHex: '#4c0519',
    signTextHex: '#fda4af',
    shopkeeperName: 'Rico',
    shirtHex: 0x9f1239,
    itemLabel: 'Midtown Street Tune',
    price: 150,
    perk: 'nitro_repair',
    pitchLines: [
      'Bolted fresh tires and charged your nitro — go tear up 7th Avenue!',
      'Your car’s purring like a Manhattan GT now!',
    ],
    targetX: 84,
    targetZ: 252,
  },
  {
    shopName: 'HARLEM CLASSIC CUTS',
    subtitle: 'FRESH FADE · NEW LOOK',
    category: 'sneakers',
    awningHex: 0x2563eb,
    signBgHex: '#1e3a8a',
    signTextHex: '#bfdbfe',
    shopkeeperName: 'Andre',
    shirtHex: 0x1d4ed8,
    itemLabel: 'Fresh Cut & Cool-Off',
    price: 110,
    perk: 'drop_wanted',
    pitchLines: [
      'Clean fade, new shades — NYPD cruisers drove right past without recognizing you!',
      'Fresh look drops the heat every time in Harlem!',
    ],
    targetX: 230,
    targetZ: 188,
  },
  {
    shopName: 'BRONX BALLPARK DELI',
    subtitle: 'STADIUM HEROES & PRETZELS',
    category: 'deli',
    awningHex: 0x1d4ed8,
    signBgHex: '#0f172a',
    signTextHex: '#93c5fd',
    shopkeeperName: 'Sal',
    shirtHex: 0x1e40af,
    itemLabel: 'Bronx Italian Hero',
    price: 16,
    perk: 'heal_full',
    pitchLines: [
      'Game-day Italian hero loaded with peppers! Full HP & Stamina!',
      'Eat like a champion before heading into Bronx Arena!',
    ],
    targetX: 296,
    targetZ: 132,
  },
  {
    shopName: 'QUEENS SPICE & TEA',
    subtitle: 'MASALA CHAI · FLUSHING SNACKS',
    category: 'cafe',
    awningHex: 0xf59e0b,
    signBgHex: '#78350f',
    signTextHex: '#fef3c7',
    shopkeeperName: 'Priya',
    shirtHex: 0xd97706,
    itemLabel: 'Queens Masala Chai & Samosa',
    price: 10,
    perk: 'heal_full',
    pitchLines: [
      'Fuel up before the Flushing Meadows cricket match! Full HP!',
      'Best chai in Queens — hit a six for us on the park pitch!',
    ],
    targetX: 382,
    targetZ: 268,
  },
  {
    shopName: 'WILLIAMSBURG GARAGE',
    subtitle: 'BROOKLYN NITRO & BRAKES',
    category: 'garage',
    awningHex: 0xf97316,
    signBgHex: '#431407',
    signTextHex: '#fdba74',
    shopkeeperName: 'Mikey',
    shirtHex: 0xea580c,
    itemLabel: 'Brooklyn Street Repair',
    price: 135,
    perk: 'nitro_repair',
    pitchLines: [
      'Welded the frame and topped off your boost — hit the Williamsburg Skyway!',
      'All tuned up! Go smoke those Syndicate vans!',
    ],
    targetX: 168,
    targetZ: 368,
  },
  {
    shopName: 'CHELSEA MARINA CAFE',
    subtitle: 'ICED COFFEE · LOBSTER ROLL',
    category: 'cafe',
    awningHex: 0x0891b2,
    signBgHex: '#164e63',
    signTextHex: '#cffafe',
    shopkeeperName: 'Chloe',
    shirtHex: 0x0e7490,
    itemLabel: 'Hudson Sunset Lobster Roll',
    price: 22,
    perk: 'heal_full',
    pitchLines: [
      'Fresh off the Chelsea Pier! Restored to 100% HP!',
      'Take a sunset cruise out to Lady Liberty after that!',
    ],
    targetX: -24,
    targetZ: 204,
  },
];

export function buildBuildingShops(buildings: BuildingCollider[]): BuildingShopDef[] {
  const shops: BuildingShopDef[] = [];
  const usedBuildingIds = new Set<string>();

  for (let i = 0; i < NYC_SHOP_TEMPLATES.length; i++) {
    const tpl = NYC_SHOP_TEMPLATES[i];
    let bestB: BuildingCollider | null = null;
    let bestD = Infinity;
    for (const b of buildings) {
      if (usedBuildingIds.has(b.id) || b.width < 9 || b.depth < 9) continue;
      const d = Math.hypot(b.x - tpl.targetX, b.z - tpl.targetZ);
      if (d < bestD) {
        bestD = d;
        bestB = b;
      }
    }
    if (!bestB) continue;
    usedBuildingIds.add(bestB.id);

    // Find which road side the building face is closest to
    let minRoadDist = Infinity;
    let facing = 0;
    let sx = bestB.x;
    let sz = bestB.z + bestB.depth * 0.5 + 0.55;
    let width = Math.min(8.4, bestB.width * 0.72);

    const candidates: Array<{ x: number; z: number; facing: number; w: number; roadDist: number }> = [];
    for (const r of ROAD_COORDS) {
      candidates.push({
        x: bestB.x,
        z: bestB.z - bestB.depth * 0.5 - 0.55,
        facing: Math.PI,
        w: Math.min(8.4, bestB.width * 0.72),
        roadDist: Math.abs(bestB.z - bestB.depth * 0.5 - r),
      });
      candidates.push({
        x: bestB.x,
        z: bestB.z + bestB.depth * 0.5 + 0.55,
        facing: 0,
        w: Math.min(8.4, bestB.width * 0.72),
        roadDist: Math.abs(bestB.z + bestB.depth * 0.5 - r),
      });
      candidates.push({
        x: bestB.x - bestB.width * 0.5 - 0.55,
        z: bestB.z,
        facing: -Math.PI * 0.5,
        w: Math.min(8.4, bestB.depth * 0.72),
        roadDist: Math.abs(bestB.x - bestB.width * 0.5 - r),
      });
      candidates.push({
        x: bestB.x + bestB.width * 0.5 + 0.55,
        z: bestB.z,
        facing: Math.PI * 0.5,
        w: Math.min(8.4, bestB.depth * 0.72),
        roadDist: Math.abs(bestB.x + bestB.width * 0.5 - r),
      });
    }

    for (const c of candidates) {
      if (c.roadDist < minRoadDist) {
        minRoadDist = c.roadDist;
        sx = c.x;
        sz = c.z;
        facing = c.facing;
        width = c.w;
      }
    }

    shops.push({
      id: `shop_${i}`,
      buildingId: bestB.id,
      shopName: tpl.shopName,
      subtitle: tpl.subtitle,
      category: tpl.category,
      district: bestB.district,
      x: sx,
      z: sz,
      facing,
      width,
      awningHex: tpl.awningHex,
      signBgHex: tpl.signBgHex,
      signTextHex: tpl.signTextHex,
      shopkeeperName: tpl.shopkeeperName,
      shirtHex: tpl.shirtHex,
      itemLabel: tpl.itemLabel,
      price: tpl.price,
      perk: tpl.perk,
      pitchLines: tpl.pitchLines,
    });
  }

  return shops;
}

export const BUILDING_SHOPS: BuildingShopDef[] = buildBuildingShops(CITY_BUILDINGS);
