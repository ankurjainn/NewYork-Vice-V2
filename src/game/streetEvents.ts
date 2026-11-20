import { EAST_BOUND, NORTH_BOUND, ROAD_COORDS, SOUTH_BOUND, WEST_BOUND } from './cityLayout';
import type { DistrictId } from './types';

export type StreetEventKind = 'purse_snatcher' | 'street_race' | 'armored_van';

export type StreetEventPhase = 'available' | 'active' | 'resolved';

export interface ActiveStreetEvent {
  id: string;
  kind: StreetEventKind;
  title: string;
  subtitle: string;
  phase: StreetEventPhase;
  reward: number;
  timeRemaining: number;
  /** Primary target world coordinates (thief, racer/finish, or armored van) */
  targetX: number;
  targetZ: number;
  /** Finish coordinates for street_race */
  finishX?: number;
  finishZ?: number;
  /** Progress counter (e.g. hits landed on armored van) */
  progress: number;
  targetProgress: number;
  /** Initial announcement / callout */
  callout: string;
}

export interface StreetEventHudInfo {
  id: string;
  kind: StreetEventKind;
  title: string;
  subtitle: string;
  phase: StreetEventPhase;
  reward: number;
  timeRemaining: number;
  distanceMeters: number;
  progressText?: string;
  acceptPrompt?: string;
}

export interface StreetEventTickInput {
  dt: number;
  playerX: number;
  playerZ: number;
  playerInVehicle: boolean;
  /** True on the frame the player presses [E] or [H] to accept a street race */
  acceptedChallenge?: boolean;
  /** True on the frame the player shoves or knocks out the purse snatcher */
  thiefStopped?: boolean;
  /** Current position of the thief / racer / armored van */
  actorX: number;
  actorZ: number;
  /** Number of solid ram hits landed on the armored van this frame */
  vanHitsDelta?: number;
  /** True if the armored van hull reached 0 */
  vanDisabled?: boolean;
}

export interface StreetEventTickOutcome {
  next: ActiveStreetEvent | null;
  status: 'ongoing' | 'started' | 'won' | 'failed';
  reward: number;
  wantedHeatDelta: number;
  bannerSpeaker?: string;
  bannerText?: string;
  bannerAccent?: 'amber' | 'teal' | 'red';
}

export const STREET_EVENT_COOLDOWN_MIN = 18;
export const STREET_EVENT_COOLDOWN_MAX = 28;

function nearestRoadCoord(val: number): number {
  let best: number = ROAD_COORDS[0];
  let bestD = Infinity;
  for (const r of ROAD_COORDS) {
    const d = Math.abs(val - r);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best;
}

function clampCoord(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Choose and spawn an appropriate spontaneous NYC street event near the player.
 * - On foot -> favors Purse Snatcher (or Armored Van crossing a nearby avenue)
 * - In vehicle -> favors Red-Light Street Race or Armored Cash Van (and occasionally Purse Snatcher)
 */
export function createStreetEvent(params: {
  playerX: number;
  playerZ: number;
  playerHeading: number;
  playerInVehicle: boolean;
  district: DistrictId;
  seed: number;
  forcedKind?: StreetEventKind;
}): ActiveStreetEvent {
  const { playerX, playerZ, playerHeading, playerInVehicle, district, seed, forcedKind } = params;

  let kind: StreetEventKind;
  if (forcedKind) {
    kind = forcedKind;
  } else {
    const r = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
    if (playerInVehicle) {
      if (r < 0.48) kind = 'street_race';
      else if (r < 0.85) kind = 'armored_van';
      else kind = 'purse_snatcher';
    } else {
      if (r < 0.65) kind = 'purse_snatcher';
      else kind = 'armored_van';
    }
  }

  const roadX = nearestRoadCoord(playerX);
  const roadZ = nearestRoadCoord(playerZ);
  const id = `evt_${kind}_${Math.floor(seed * 1000)}`;

  if (kind === 'purse_snatcher') {
    // Spawn thief along the nearest open avenue sidewalk ~15m ahead of player
    const dirZ = Math.cos(playerHeading) >= 0 ? 1 : -1;
    const spawnX = clampCoord(roadX + (playerX >= roadX ? 8.2 : -8.2), WEST_BOUND + 6, EAST_BOUND - 12);
    const spawnZ = clampCoord(playerZ + dirZ * 16, NORTH_BOUND + 18, SOUTH_BOUND - 18);
    return {
      id,
      kind,
      title: 'Purse Snatcher!',
      subtitle: 'Chase the sprinting thief and shove [Q] to recover the stolen bag',
      phase: 'active',
      reward: 550,
      timeRemaining: 42,
      targetX: spawnX,
      targetZ: spawnZ,
      progress: 0,
      targetProgress: 1,
      callout: `Pedestrian in ${district}: "Stop that thief! He grabbed my bag — shove him [Q]!"`,
    };
  }

  if (kind === 'street_race') {
    // Spawn a street racer at the nearest intersection and set a 210m sprint finish down the avenue
    const goNs = Math.abs(Math.cos(playerHeading)) >= Math.abs(Math.sin(playerHeading));
    let startX = roadX;
    let startZ = roadZ;
    let finishX = roadX;
    let finishZ = roadZ;

    if (goNs) {
      const dir = playerZ < 240 ? 1 : -1;
      startX = roadX + (dir === 1 ? -3.4 : 3.4);
      startZ = clampCoord(playerZ + dir * 9, NORTH_BOUND + 24, SOUTH_BOUND - 24);
      finishX = roadX;
      finishZ = clampCoord(startZ + dir * 210, NORTH_BOUND + 26, SOUTH_BOUND - 26);
    } else {
      const dir = playerX < 240 ? 1 : -1;
      startX = clampCoord(playerX + dir * 9, WEST_BOUND + 18, EAST_BOUND - 18);
      startZ = roadZ + (dir === 1 ? 3.4 : -3.4);
      finishX = clampCoord(startX + dir * 210, WEST_BOUND + 18, EAST_BOUND - 18);
      finishZ = roadZ;
    }

    return {
      id,
      kind,
      title: 'Red-Light Street Challenge',
      subtitle: 'Press [E] or Honk [H] to race the rival GT down the avenue!',
      phase: 'available',
      reward: 850,
      timeRemaining: 16,
      targetX: startX,
      targetZ: startZ,
      finishX,
      finishZ,
      progress: 0,
      targetProgress: 1,
      callout: `Street Racer in ${district}: "Nice wheels! Press [E] or honk [H] — $850 to whoever hits the banner first!"`,
    };
  }

  // Armored Cash Van crossing nearby Manhattan/Brooklyn avenue
  const dirZ = playerZ < 220 ? 1 : -1;
  const vanX = roadX + (dirZ === 1 ? -3.4 : 3.4);
  const vanZ = clampCoord(playerZ + dirZ * 32, NORTH_BOUND + 24, SOUTH_BOUND - 24);
  return {
    id,
    kind: 'armored_van',
    title: 'Armored Cash Van Spotted',
    subtitle: 'Ram the Syndicate Armored Van 3 times to pop the cash vault!',
    phase: 'active',
    reward: 1100,
    timeRemaining: 55,
    targetX: vanX,
    targetZ: vanZ,
    progress: 0,
    targetProgress: 3,
    callout: `Street Scanner (${district}): "Syndicate Armored Cash Van rolling down the avenue! Ram it 3 times to crack the rear doors!"`,
  };
}

/**
 * Pure state-machine step for any active NYC Random Street Event.
 */
export function evaluateStreetEventTick(
  event: ActiveStreetEvent,
  input: StreetEventTickInput,
): StreetEventTickOutcome {
  const safeDt = Math.min(Math.max(input.dt, 0), 0.1);
  const next: ActiveStreetEvent = {
    ...event,
    timeRemaining: Math.max(0, event.timeRemaining - safeDt),
    targetX: input.actorX,
    targetZ: input.actorZ,
  };

  if (next.kind === 'purse_snatcher') {
    if (input.thiefStopped) {
      return {
        next: null,
        status: 'won',
        reward: next.reward,
        wantedHeatDelta: 0,
        bannerSpeaker: 'GRATEFUL NEW YORKER',
        bannerText: `"You caught the snatcher! Thank you — take $${next.reward} for saving my bag!"`,
        bannerAccent: 'teal',
      };
    }
    const dist = Math.hypot(input.playerX - input.actorX, input.playerZ - input.actorZ);
    if (next.timeRemaining <= 0 || dist > 115) {
      return {
        next: null,
        status: 'failed',
        reward: 0,
        wantedHeatDelta: 0,
        bannerSpeaker: 'STREET ALERT',
        bannerText: 'The purse snatcher vanished into the subway crowds.',
        bannerAccent: 'amber',
      };
    }
    return { next, status: 'ongoing', reward: 0, wantedHeatDelta: 0 };
  }

  if (next.kind === 'street_race') {
    if (next.phase === 'available') {
      if (input.acceptedChallenge && input.playerInVehicle) {
        next.phase = 'active';
        next.timeRemaining = 36;
        next.subtitle = 'GO! Beat the NYC Street Racer to the checkered finish beacon!';
        return {
          next,
          status: 'started',
          reward: 0,
          wantedHeatDelta: 0,
          bannerSpeaker: 'STREET RACE · GO!',
          bannerText: 'GREEN LIGHT! Floor it and beat the rival GT to the finish arch for $850!',
          bannerAccent: 'teal',
        };
      }
      const distToRacer = Math.hypot(input.playerX - input.actorX, input.playerZ - input.actorZ);
      if (next.timeRemaining <= 0 || distToRacer > 75) {
        return {
          next: null,
          status: 'failed',
          reward: 0,
          wantedHeatDelta: 0,
        };
      }
      return { next, status: 'ongoing', reward: 0, wantedHeatDelta: 0 };
    }

    // Active race: check player vs AI rival distance to finish line
    const fx = next.finishX ?? next.targetX;
    const fz = next.finishZ ?? next.targetZ;
    const playerDist = Math.hypot(input.playerX - fx, input.playerZ - fz);
    const rivalDist = Math.hypot(input.actorX - fx, input.actorZ - fz);

    if (playerDist <= 13) {
      return {
        next: null,
        status: 'won',
        reward: next.reward,
        wantedHeatDelta: 0,
        bannerSpeaker: 'STREET RACE VICTORY',
        bannerText: `Clean win! You smoked the challenger down the avenue — +$${next.reward}!`,
        bannerAccent: 'teal',
      };
    }
    if (rivalDist <= 11 || next.timeRemaining <= 0) {
      return {
        next: null,
        status: 'failed',
        reward: 0,
        wantedHeatDelta: 0,
        bannerSpeaker: 'STREET RACE',
        bannerText: 'The rival GT crossed the finish banner first! Catch another race soon.',
        bannerAccent: 'amber',
      };
    }
    return { next, status: 'ongoing', reward: 0, wantedHeatDelta: 0 };
  }

  // Armored Cash Van
  const hitsDelta = input.vanHitsDelta ?? 0;
  if (hitsDelta > 0) {
    next.progress = Math.min(next.targetProgress, next.progress + hitsDelta);
  }
  if (input.vanDisabled || next.progress >= next.targetProgress) {
    return {
      next: null,
      status: 'won',
      reward: next.reward,
      wantedHeatDelta: 40, // 1 fair NYPD star for cracking an armored cash van
      bannerSpeaker: 'ARMORED VAN CRACKED',
      bannerText: `Rear vault burst open! Scooped $${next.reward.toLocaleString('en-US')} in Syndicate cash!`,
      bannerAccent: 'teal',
    };
  }
  const distToVan = Math.hypot(input.playerX - input.actorX, input.playerZ - input.actorZ);
  if (next.timeRemaining <= 0 || distToVan > 170) {
    return {
      next: null,
      status: 'failed',
      reward: 0,
      wantedHeatDelta: 0,
      bannerSpeaker: 'STREET SCANNER',
      bannerText: 'The Armored Cash Van slipped onto the expressway.',
      bannerAccent: 'amber',
    };
  }
  return { next, status: 'ongoing', reward: 0, wantedHeatDelta: 0 };
}

export function buildStreetEventHud(
  event: ActiveStreetEvent,
  playerX: number,
  playerZ: number,
): StreetEventHudInfo {
  const tx = event.kind === 'street_race' && event.phase === 'active'
    ? (event.finishX ?? event.targetX)
    : event.targetX;
  const tz = event.kind === 'street_race' && event.phase === 'active'
    ? (event.finishZ ?? event.targetZ)
    : event.targetZ;

  let progressText: string | undefined;
  if (event.kind === 'armored_van') {
    progressText = `${event.progress}/${event.targetProgress} ram hits`;
  } else if (event.kind === 'street_race' && event.phase === 'available') {
    progressText = 'Press [E] or [H] to Race';
  }

  return {
    id: event.id,
    kind: event.kind,
    title: event.title,
    subtitle: event.subtitle,
    phase: event.phase,
    reward: event.reward,
    timeRemaining: Math.ceil(event.timeRemaining),
    distanceMeters: Math.round(Math.hypot(tx - playerX, tz - playerZ)),
    progressText,
    acceptPrompt:
      event.kind === 'street_race' && event.phase === 'available'
        ? 'Accept Street Race ($850)'
        : undefined,
  };
}
