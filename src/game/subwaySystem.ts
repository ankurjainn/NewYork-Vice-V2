import type { DistrictId } from './types';

export type BoroughName = 'Manhattan' | 'Brooklyn' | 'Queens';

export interface SubwayStationDef {
  id: string;
  name: string;
  borough: BoroughName;
  district: DistrictId;
  lineBadge: string;
  lineColor: string;
  /** Distance along the closed rectangular loop [0 .. SUBWAY_LOOP_LENGTH) */
  loopDist: number;
  /** Track center position at deckY = SUBWAY_DECK_Y */
  trackX: number;
  trackZ: number;
  /** Track orientation at station ('ns' or 'ew') */
  axis: 'ns' | 'ew';
  /** Street-level kiosk/stairs entrance (building-free sidewalk curb) */
  entranceX: number;
  entranceZ: number;
  /** Direction the kiosk faces toward the avenue */
  entranceHeading: number;
}

export interface SubwayTrainState {
  id: string;
  label: string;
  lineBadge: string;
  stripeHex: number;
  /** Direction around loop: +1 clockwise, -1 counter-clockwise */
  direction: 1 | -1;
  /** Front car distance along loop [0 .. SUBWAY_LOOP_LENGTH) */
  loopDist: number;
  /** Current speed in m/s */
  speed: number;
  /** Remaining dwell seconds while doors are open at a station */
  dwellTimer: number;
  /** Station ID currently docked at, if any */
  dockedStationId: string | null;
  /** Last station ID departed (prevents immediate re-stop) */
  lastStationId: string | null;
}

export interface SubwayTrackPose {
  x: number;
  y: number;
  z: number;
  heading: number;
}

export interface SubwayStationHudInfo {
  id: string;
  name: string;
  borough: BoroughName;
  lineBadge: string;
  lineColor: string;
  nextTrainEtaSec: number;
  trainDocked: boolean;
}

/** Elevated NYC Subway viaduct loop coordinates (runs above roads & 6.8m road flyovers) */
export const SUBWAY_WEST_X = 0;
export const SUBWAY_EAST_X = 392;
export const SUBWAY_NORTH_Z = 0;
export const SUBWAY_SOUTH_Z = 336;
export const SUBWAY_DECK_Y = 10.6;
export const SUBWAY_FARE_USD = 3;
export const SUBWAY_TRAIN_MAX_SPEED = 24; // ~86 km/h express elevated train
export const SUBWAY_DWELL_SEC = 3.6;

const LEG_WEST = SUBWAY_SOUTH_Z - SUBWAY_NORTH_Z; // 336m (x=0, z: 0 -> 336)
const LEG_SOUTH = SUBWAY_EAST_X - SUBWAY_WEST_X; // 392m (z=336, x: 0 -> 392)
const LEG_EAST = SUBWAY_SOUTH_Z - SUBWAY_NORTH_Z; // 336m (x=392, z: 336 -> 0)
const LEG_NORTH = SUBWAY_EAST_X - SUBWAY_WEST_X; // 392m (z=0, x: 392 -> 0)

export const SUBWAY_LOOP_LENGTH = LEG_WEST + LEG_SOUTH + LEG_EAST + LEG_NORTH; // 1456m

export function wrapLoopDist(d: number): number {
  const m = d % SUBWAY_LOOP_LENGTH;
  return m < 0 ? m + SUBWAY_LOOP_LENGTH : m;
}

/**
 * Sample world position and forward heading (in +1 clockwise loop direction)
 * for any distance along the elevated NYC subway loop, with smooth rounded corner interpolation.
 */
export function sampleSubwayLoopPose(
  rawDist: number,
  direction: 1 | -1 = 1,
  lateralTrackOffset = 0,
): SubwayTrackPose {
  const d = wrapLoopDist(rawDist);
  const cornerR = 10;

  let x = SUBWAY_WEST_X;
  let z = SUBWAY_NORTH_Z;
  let heading = 0;

  if (d < LEG_WEST) {
    // West leg: x = 0, z goes 0 -> 336 (+Z, heading = 0)
    x = SUBWAY_WEST_X;
    z = SUBWAY_NORTH_Z + d;
    heading = 0;
    if (d > LEG_WEST - cornerR) {
      const t = (d - (LEG_WEST - cornerR)) / cornerR;
      const a = t * (Math.PI * 0.5);
      x = SUBWAY_WEST_X + cornerR * (1 - Math.cos(a));
      z = SUBWAY_SOUTH_Z - cornerR + cornerR * Math.sin(a);
      heading = a;
    } else if (d < cornerR) {
      const t = d / cornerR;
      const a = (1 - t) * (Math.PI * 0.5);
      x = SUBWAY_WEST_X + cornerR * (1 - Math.cos(a));
      z = SUBWAY_NORTH_Z + cornerR - cornerR * Math.sin(a);
      heading = -a;
    }
  } else if (d < LEG_WEST + LEG_SOUTH) {
    // South leg (Brooklyn): z = 336, x goes 0 -> 392 (+X, heading = PI/2)
    const u = d - LEG_WEST;
    x = SUBWAY_WEST_X + u;
    z = SUBWAY_SOUTH_Z;
    heading = Math.PI * 0.5;
    if (u > LEG_SOUTH - cornerR) {
      const t = (u - (LEG_SOUTH - cornerR)) / cornerR;
      const a = t * (Math.PI * 0.5);
      x = SUBWAY_EAST_X - cornerR + cornerR * Math.sin(a);
      z = SUBWAY_SOUTH_Z - cornerR * (1 - Math.cos(a));
      heading = Math.PI * 0.5 + a;
    } else if (u < cornerR) {
      const t = u / cornerR;
      const a = t * (Math.PI * 0.5);
      x = SUBWAY_WEST_X + cornerR * (1 - Math.cos(Math.PI * 0.5 - (1 - t) * Math.PI * 0.5));
      z = SUBWAY_SOUTH_Z - cornerR + cornerR * Math.sin(Math.PI * 0.5 - (1 - t) * Math.PI * 0.5);
      heading = Math.PI * 0.5 - (1 - t) * (Math.PI * 0.5) * 0.25;
      void a;
    }
  } else if (d < LEG_WEST + LEG_SOUTH + LEG_EAST) {
    // East leg (Queens): x = 392, z goes 336 -> 0 (-Z, heading = PI)
    const u = d - (LEG_WEST + LEG_SOUTH);
    x = SUBWAY_EAST_X;
    z = SUBWAY_SOUTH_Z - u;
    heading = Math.PI;
    if (u > LEG_EAST - cornerR) {
      const t = (u - (LEG_EAST - cornerR)) / cornerR;
      const a = t * (Math.PI * 0.5);
      x = SUBWAY_EAST_X - cornerR * (1 - Math.cos(a));
      z = SUBWAY_NORTH_Z + cornerR - cornerR * Math.sin(a);
      heading = Math.PI + a;
    }
  } else {
    // North leg (Lower Manhattan): z = 0, x goes 392 -> 0 (-X, heading = -PI/2)
    const u = d - (LEG_WEST + LEG_SOUTH + LEG_EAST);
    x = SUBWAY_EAST_X - u;
    z = SUBWAY_NORTH_Z;
    heading = -Math.PI * 0.5;
    if (u > LEG_NORTH - cornerR) {
      const t = (u - (LEG_NORTH - cornerR)) / cornerR;
      const a = t * (Math.PI * 0.5);
      x = SUBWAY_WEST_X + cornerR - cornerR * Math.sin(a);
      z = SUBWAY_NORTH_Z + cornerR * (1 - Math.cos(a));
      heading = -Math.PI * 0.5 + a;
    }
  }

  // Apply parallel double-track lateral offset (left/right of clockwise track centerline)
  if (lateralTrackOffset !== 0) {
    const rx = Math.cos(heading);
    const rz = -Math.sin(heading);
    x += rx * lateralTrackOffset;
    z += rz * lateralTrackOffset;
  }

  const finalHeading = direction === 1 ? heading : heading + Math.PI;
  return { x, y: SUBWAY_DECK_Y + 0.55, z, heading: finalHeading };
}

/**
 * 6 iconic elevated MTA stations connecting Manhattan, Brooklyn, and Queens.
 * Every street-level entrance sits cleanly on open avenue sidewalk curbs (building-free).
 */
export const SUBWAY_STATIONS: SubwayStationDef[] = [
  {
    id: 'st_wash_sq',
    name: 'Washington Sq – W 4th St',
    borough: 'Manhattan',
    district: 'Washington Square',
    lineBadge: 'A',
    lineColor: '#2563eb',
    loopDist: 28,
    trackX: 0,
    trackZ: 28,
    axis: 'ns',
    entranceX: -8.6,
    entranceZ: 28,
    entranceHeading: Math.PI * 0.5,
  },
  {
    id: 'st_times_sq',
    name: 'Times Sq – 42nd St',
    borough: 'Manhattan',
    district: 'Midtown West',
    lineBadge: '7',
    lineColor: '#9333ea',
    loopDist: 224,
    trackX: 0,
    trackZ: 224,
    axis: 'ns',
    entranceX: -8.6,
    entranceZ: 224,
    entranceHeading: Math.PI * 0.5,
  },
  {
    id: 'st_williamsburg',
    name: 'Williamsburg – Bedford Ave',
    borough: 'Brooklyn',
    district: 'Williamsburg',
    lineBadge: 'L',
    lineColor: '#64748b',
    loopDist: LEG_WEST + 112,
    trackX: 112,
    trackZ: 336,
    axis: 'ew',
    entranceX: 112,
    entranceZ: 327.4,
    entranceHeading: 0,
  },
  {
    id: 'st_bk_heights',
    name: 'Brooklyn Heights – Jay St',
    borough: 'Brooklyn',
    district: 'Brooklyn Bridge',
    lineBadge: 'F',
    lineColor: '#ea580c',
    loopDist: LEG_WEST + 280,
    trackX: 280,
    trackZ: 336,
    axis: 'ew',
    entranceX: 280,
    entranceZ: 327.4,
    entranceHeading: 0,
  },
  {
    id: 'st_flushing',
    name: 'Flushing – Main St',
    borough: 'Queens',
    district: 'Flushing Meadows',
    lineBadge: '7',
    lineColor: '#9333ea',
    loopDist: LEG_WEST + LEG_SOUTH + (SUBWAY_SOUTH_Z - 224),
    trackX: 392,
    trackZ: 224,
    axis: 'ns',
    entranceX: 383.4,
    entranceZ: 224,
    entranceHeading: -Math.PI * 0.5,
  },
  {
    id: 'st_midtown_east',
    name: 'Grand Central – 42nd St',
    borough: 'Manhattan',
    district: 'Wall Street',
    lineBadge: '4',
    lineColor: '#16a34a',
    loopDist: LEG_WEST + LEG_SOUTH + LEG_EAST + (SUBWAY_EAST_X - 168),
    trackX: 168,
    trackZ: 0,
    axis: 'ew',
    entranceX: 168,
    entranceZ: -8.6,
    entranceHeading: Math.PI,
  },
];

export function createInitialSubwayTrains(): SubwayTrainState[] {
  return [
    {
      id: 'mta_express_7',
      label: '7 Express · Queens – Manhattan',
      lineBadge: '7',
      stripeHex: 0x9333ea,
      direction: 1,
      loopDist: 8, // Approaches Washington Sq right after game start!
      speed: 14,
      dwellTimer: 0,
      dockedStationId: null,
      lastStationId: null,
    },
    {
      id: 'mta_local_a',
      label: 'A Train · Brooklyn – Manhattan',
      lineBadge: 'A',
      stripeHex: 0x2563eb,
      direction: -1,
      loopDist: LEG_WEST + 180,
      speed: 16,
      dwellTimer: 0,
      dockedStationId: null,
      lastStationId: null,
    },
  ];
}

function forwardLoopDistance(from: number, to: number, dir: 1 | -1): number {
  const f = wrapLoopDist(from);
  const t = wrapLoopDist(to);
  if (dir === 1) {
    return t >= f ? t - f : SUBWAY_LOOP_LENGTH - f + t;
  }
  return f >= t ? f - t : f + (SUBWAY_LOOP_LENGTH - t);
}

/**
 * Step a single MTA elevated subway train with smooth braking into stations,
 * dwell stop with door pause, and crisp acceleration away from platforms.
 */
export function stepSubwayTrain(
  train: SubwayTrainState,
  dt: number,
  stations: SubwayStationDef[] = SUBWAY_STATIONS,
): { next: SubwayTrainState; arrivedStation: SubwayStationDef | null } {
  const safeDt = Math.min(Math.max(dt, 0), 0.1);
  const next: SubwayTrainState = { ...train };
  let arrivedStation: SubwayStationDef | null = null;

  if (next.dwellTimer > 0) {
    next.dwellTimer = Math.max(0, next.dwellTimer - safeDt);
    next.speed = 0;
    if (next.dwellTimer === 0) {
      next.lastStationId = next.dockedStationId;
      next.dockedStationId = null;
    }
    return { next, arrivedStation: null };
  }

  // Find nearest upcoming station in our direction of travel
  let nearestSt: SubwayStationDef | null = null;
  let nearestDist = Infinity;
  for (const st of stations) {
    if (st.id === next.lastStationId) continue;
    const d = forwardLoopDistance(next.loopDist, st.loopDist, next.direction);
    if (d < nearestDist) {
      nearestDist = d;
      nearestSt = st;
    }
  }

  // Clear lastStationId once we're safely 25m past it
  if (next.lastStationId) {
    const lastSt = stations.find((s) => s.id === next.lastStationId);
    if (lastSt) {
      const away = Math.min(
        forwardLoopDistance(lastSt.loopDist, next.loopDist, 1),
        forwardLoopDistance(next.loopDist, lastSt.loopDist, 1),
      );
      if (away > 25) {
        next.lastStationId = null;
      }
    }
  }

  // Target speed: gently brake when within 46m of an upcoming station
  let targetSpeed = SUBWAY_TRAIN_MAX_SPEED;
  if (nearestSt && nearestDist < 46) {
    targetSpeed = Math.max(2.6, (nearestDist / 46) * SUBWAY_TRAIN_MAX_SPEED);
  }

  if (next.speed < targetSpeed) {
    next.speed = Math.min(targetSpeed, next.speed + 8.5 * safeDt);
  } else {
    next.speed = Math.max(targetSpeed, next.speed - 11.5 * safeDt);
  }

  const move = next.speed * safeDt;
  if (nearestSt && move >= nearestDist - 0.8 && nearestDist < 12) {
    // Dock cleanly at station platform
    next.loopDist = nearestSt.loopDist;
    next.speed = 0;
    next.dwellTimer = SUBWAY_DWELL_SEC;
    next.dockedStationId = nearestSt.id;
    arrivedStation = nearestSt;
  } else {
    next.loopDist = wrapLoopDist(next.loopDist + next.direction * move);
  }

  return { next, arrivedStation };
}

/** Compute ETA in seconds for the next arriving train at a given station */
export function computeStationNextTrainEta(
  station: SubwayStationDef,
  trains: SubwayTrainState[],
): { etaSec: number; docked: boolean } {
  let bestEta = Infinity;
  for (const t of trains) {
    if (t.dockedStationId === station.id) {
      return { etaSec: 0, docked: true };
    }
    const dist = forwardLoopDistance(t.loopDist, station.loopDist, t.direction);
    const avgSpeed = Math.max(12, SUBWAY_TRAIN_MAX_SPEED * 0.78);
    const eta = Math.round(dist / avgSpeed);
    if (eta < bestEta) bestEta = eta;
  }
  return { etaSec: Number.isFinite(bestEta) ? bestEta : 15, docked: false };
}

export function findNearestSubwayStation(
  x: number,
  z: number,
  maxDist = 8.5,
): SubwayStationDef | null {
  let best: SubwayStationDef | null = null;
  let bestD = maxDist;
  for (const st of SUBWAY_STATIONS) {
    const d = Math.hypot(x - st.entranceX, z - st.entranceZ);
    if (d <= bestD) {
      bestD = d;
      best = st;
    }
  }
  return best;
}

export function getSubwayStationsHud(trains: SubwayTrainState[]): SubwayStationHudInfo[] {
  return SUBWAY_STATIONS.map((st) => {
    const { etaSec, docked } = computeStationNextTrainEta(st, trains);
    return {
      id: st.id,
      name: st.name,
      borough: st.borough,
      lineBadge: st.lineBadge,
      lineColor: st.lineColor,
      nextTrainEtaSec: etaSec,
      trainDocked: docked,
    };
  });
}
