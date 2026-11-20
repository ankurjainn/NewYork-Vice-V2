import type { ActiveParkSportHud, DistrictId, ParkSportKind, ParkSportMode } from './types';

export interface ParkSportVenueDef {
  id: string;
  name: string;
  district: DistrictId;
  sport: ParkSportKind;
  cx: number;
  cz: number;
  interactRadius: number;
  teamAName: string;
  teamBName: string;
  maxBalls: number;
  basePrize: number;
  perPointBonus: number;
  /** Batting / shooting crease coordinate */
  creaseX: number;
  creaseZ: number;
  /** Bowler / hoop target coordinate */
  bowlerX: number;
  bowlerZ: number;
  /** Broadcast spectate camera position */
  spectateCamX: number;
  spectateCamY: number;
  spectateCamZ: number;
  /** Relative fielder / defender slots around the pitch/court */
  npcOffsets: Array<{ dx: number; dz: number; role: 'bowler' | 'batter' | 'keeper' | 'fielder' }>;
}

export const PARK_SPORT_VENUES: ParkSportVenueDef[] = [
  {
    id: 'central_park_cricket',
    name: 'Central Park Great Lawn Cricket',
    district: 'Union Square',
    sport: 'cricket',
    cx: 28,
    cz: 84,
    interactRadius: 19,
    teamAName: 'MANHATTAN XI',
    teamBName: 'BROOKLYN KINGS',
    maxBalls: 6,
    basePrize: 300,
    perPointBonus: 85,
    creaseX: 28,
    creaseZ: 90,
    bowlerX: 28,
    bowlerZ: 76,
    spectateCamX: 43,
    spectateCamY: 7.5,
    spectateCamZ: 93,
    npcOffsets: [
      { dx: 0, dz: -8, role: 'bowler' },
      { dx: 0, dz: 6, role: 'batter' },
      { dx: 0, dz: 9.2, role: 'keeper' },
      { dx: -9.5, dz: -1.5, role: 'fielder' },
      { dx: 9.5, dz: 1.5, role: 'fielder' },
      { dx: -6.5, dz: -10, role: 'fielder' },
    ],
  },
  {
    id: 'flushing_cricket',
    name: 'Flushing Meadows Park Cricket',
    district: 'Flushing Meadows',
    sport: 'cricket',
    cx: 420,
    cz: 252,
    interactRadius: 21,
    teamAName: 'QUEENS STRIKERS',
    teamBName: 'BRONX BOMBERS',
    maxBalls: 6,
    basePrize: 350,
    perPointBonus: 95,
    creaseX: 420,
    creaseZ: 258,
    bowlerX: 420,
    bowlerZ: 244,
    spectateCamX: 436,
    spectateCamY: 8.0,
    spectateCamZ: 260,
    npcOffsets: [
      { dx: 0, dz: -8, role: 'bowler' },
      { dx: 0, dz: 6, role: 'batter' },
      { dx: 0, dz: 9.2, role: 'keeper' },
      { dx: -10, dz: -2, role: 'fielder' },
      { dx: 10, dz: 2, role: 'fielder' },
      { dx: 7, dz: -10.5, role: 'fielder' },
    ],
  },
  {
    id: 'rucker_streetball',
    name: 'Harlem Rucker Park Streetball',
    district: 'Harlem Rucker',
    sport: 'streetball',
    cx: 252,
    cz: 140,
    interactRadius: 19,
    teamAName: 'HARLEM LEGENDS',
    teamBName: 'UPTOWN CREW',
    maxBalls: 5,
    basePrize: 280,
    perPointBonus: 110,
    creaseX: 252,
    creaseZ: 145,
    bowlerX: 252,
    bowlerZ: 131,
    spectateCamX: 267,
    spectateCamY: 6.8,
    spectateCamZ: 148,
    npcOffsets: [
      { dx: 0, dz: -7, role: 'bowler' },
      { dx: 0, dz: 5, role: 'batter' },
      { dx: -6.5, dz: -2, role: 'fielder' },
      { dx: 6.5, dz: -2, role: 'fielder' },
      { dx: 4.5, dz: 5.5, role: 'fielder' },
    ],
  },
  {
    id: 'west4_streetball',
    name: 'West 4th St Cage Streetball',
    district: 'Lower East Side',
    sport: 'streetball',
    cx: 28,
    cz: 420,
    interactRadius: 19,
    teamAName: 'VILLAGE CAGE',
    teamBName: 'SOHO RUNNERS',
    maxBalls: 5,
    basePrize: 280,
    perPointBonus: 110,
    creaseX: 28,
    creaseZ: 425,
    bowlerX: 28,
    bowlerZ: 411,
    spectateCamX: 43,
    spectateCamY: 6.8,
    spectateCamZ: 427,
    npcOffsets: [
      { dx: 0, dz: -7, role: 'bowler' },
      { dx: 0, dz: 5, role: 'batter' },
      { dx: -6.5, dz: -2, role: 'fielder' },
      { dx: 6.5, dz: -2, role: 'fielder' },
      { dx: -4.5, dz: 5.5, role: 'fielder' },
    ],
  },
];

export type MatchPhase = 'ready' | 'delivery' | 'ball_in_flight' | 'between_balls';

export interface ParkMatchState {
  venueId: string;
  mode: ParkSportMode;
  phase: MatchPhase;
  phaseTimer: number;
  deliverySpeed: number;
  /** 0..1 delivery/shot meter progress; ideal sweet spot is ~0.78 */
  timingValue: number;
  swingAttempted: boolean;
  scoreRuns: number;
  wickets: number;
  ballsBowled: number;
  lastOutcome: string;
  commentary: string;
  /** Current 3D ball trajectory for engine rendering */
  ballX: number;
  ballY: number;
  ballZ: number;
  ballVx: number;
  ballVy: number;
  ballVz: number;
  /** Seed counter for varied deliveries */
  deliveryIndex: number;
}

export interface SwingOutcome {
  runs: number;
  wicket: boolean;
  label: string;
  commentary: string;
  launchSpeed: number;
  launchAngleY: number;
  launchYaw: number;
}

export function createInitialParkMatchState(venue: ParkSportVenueDef): ParkMatchState {
  return {
    venueId: venue.id,
    mode: 'npc_match',
    phase: 'ready',
    phaseTimer: 1.2,
    deliverySpeed: 0.72,
    timingValue: 0,
    swingAttempted: false,
    scoreRuns: venue.sport === 'cricket' ? 24 : 12,
    wickets: venue.sport === 'cricket' ? 1 : 0,
    ballsBowled: 0,
    lastOutcome: venue.sport === 'cricket' ? 'LIVE PICKUP OVER' : 'LIVE 3v3 RUN',
    commentary:
      venue.sport === 'cricket'
        ? `${venue.teamAName} batting at ${venue.name}. Press [F] to bat or [V] to watch!`
        : `Uptown pickup hoops at ${venue.name}. Press [F] to shoot or [V] to watch!`,
    ballX: venue.bowlerX,
    ballY: 1.2,
    ballZ: venue.bowlerZ,
    ballVx: 0,
    ballVy: 0,
    ballVz: 0,
    deliveryIndex: 0,
  };
}

export function startPlayerJoinMatch(venue: ParkSportVenueDef, current: ParkMatchState): ParkMatchState {
  return {
    ...current,
    mode: 'joined',
    phase: 'ready',
    phaseTimer: 0.9,
    timingValue: 0,
    swingAttempted: false,
    scoreRuns: 0,
    wickets: 0,
    ballsBowled: 0,
    lastOutcome: venue.sport === 'cricket' ? 'YOUR OVER · 6 BALLS' : '5-SHOT SHOOTOUT',
    commentary:
      venue.sport === 'cricket'
        ? 'Bowler steaming in! Press [SPACE] or Click when the timing bar hits the gold zone!'
        : 'Lock in from downtown! Press [SPACE] or Click in the gold zone to drain a 3-pointer!',
    ballX: venue.bowlerX,
    ballY: 1.2,
    ballZ: venue.bowlerZ,
    ballVx: 0,
    ballVy: 0,
    ballVz: 0,
  };
}

export function startPlayerSpectateMatch(venue: ParkSportVenueDef, current: ParkMatchState): ParkMatchState {
  return {
    ...current,
    mode: 'spectating',
    commentary:
      venue.sport === 'cricket'
        ? `Spectating ${venue.teamAName} vs ${venue.teamBName} live on the grass!`
        : `Courtside at ${venue.name}! Watch the crowd go wild.`,
  };
}

export function exitPlayerParkMatch(venue: ParkSportVenueDef, current: ParkMatchState): ParkMatchState {
  return {
    ...current,
    mode: 'npc_match',
    phase: 'ready',
    phaseTimer: 1.2,
    timingValue: 0,
    swingAttempted: false,
    scoreRuns: venue.sport === 'cricket' ? 28 : 16,
    wickets: venue.sport === 'cricket' ? 1 : 0,
    ballsBowled: 0,
    lastOutcome: venue.sport === 'cricket' ? 'LIVE PICKUP OVER' : 'LIVE 3v3 RUN',
  };
}

/**
 * Pure timing evaluator for cricket batting & streetball shooting.
 * Sweet spot is centered at timingValue = 0.78.
 */
export function evaluateTimingAction(
  sport: ParkSportKind,
  timingValue: number,
  deliveryIndex: number,
): SwingOutcome {
  const err = Math.abs(timingValue - 0.78);
  const spreadYaw = ((deliveryIndex % 5) - 2) * 0.24;

  if (sport === 'cricket') {
    if (err <= 0.065) {
      return {
        runs: 6,
        wicket: false,
        label: 'MASSIVE SIX! +6',
        commentary: 'CRACK! Sent sailing over the park trees into the Manhattan skyline! SIX!',
        launchSpeed: 24,
        launchAngleY: 12.5,
        launchYaw: Math.PI + spreadYaw * 0.6,
      };
    }
    if (err <= 0.135) {
      return {
        runs: 4,
        wicket: false,
        label: 'BOUNDARY FOUR! +4',
        commentary: 'Glorious cover drive racing across the outfield grass for FOUR!',
        launchSpeed: 19,
        launchAngleY: 5.2,
        launchYaw: Math.PI + spreadYaw,
      };
    }
    if (err <= 0.21) {
      return {
        runs: 2,
        wicket: false,
        label: 'QUICK TWO! +2',
        commentary: 'Punched into the gap — sharp running between the wickets for TWO!',
        launchSpeed: 13.5,
        launchAngleY: 4.0,
        launchYaw: Math.PI + spreadYaw * 1.4,
      };
    }
    if (err <= 0.29) {
      return {
        runs: 1,
        wicket: false,
        label: 'SINGLE +1',
        commentary: 'Nudged off the pads for a quick single to keep the strike rotating.',
        launchSpeed: 9.5,
        launchAngleY: 3.0,
        launchYaw: Math.PI + spreadYaw * 1.6,
      };
    }
    if (timingValue < 0.36 || timingValue > 0.96) {
      return {
        runs: 0,
        wicket: true,
        label: 'CLEAN BOWLED! WICKET',
        commentary: 'Timber! Missed the delivery completely — bails fly off the stumps!',
        launchSpeed: 3.5,
        launchAngleY: 2.5,
        launchYaw: 0,
      };
    }
    return {
      runs: 0,
      wicket: false,
      label: 'DOT BALL',
      commentary: 'Tight NYC park bowling — defended cleanly right back down the pitch.',
      launchSpeed: 5.5,
      launchAngleY: 2.2,
      launchYaw: Math.PI,
    };
  }

  // Streetball shooting evaluation
  if (err <= 0.085) {
    return {
      runs: 3,
      wicket: false,
      label: 'DOWNTOWN SWISH! +3',
      commentary: 'NOTHING BUT NET! The Rucker crowd erupts for a deep 3-pointer!',
      launchSpeed: 12.5,
      launchAngleY: 11.2,
      launchYaw: Math.PI,
    };
  }
  if (err <= 0.19) {
    return {
      runs: 2,
      wicket: false,
      label: 'BANK SHOT! +2',
      commentary: 'Off the glass and in! Pure NYC playground touch for TWO!',
      launchSpeed: 11.5,
      launchAngleY: 10.2,
      launchYaw: Math.PI,
    };
  }
  return {
    runs: 0,
    wicket: false,
    label: 'OFF THE RIM',
    commentary: 'Clangs off the back iron — reset your feet for the next rock!',
    launchSpeed: 11.0,
    launchAngleY: 9.5,
    launchYaw: Math.PI + 0.18,
  };
}

export interface ParkMatchStepResult {
  next: ParkMatchState;
  completedReward: number;
  hitEvent: SwingOutcome | null;
  ballReleased: boolean;
}

/**
 * Triggers a player swing (cricket) or jump shot (streetball) if currently in delivery window.
 */
export function triggerPlayerSportAction(
  venue: ParkSportVenueDef,
  state: ParkMatchState,
): ParkMatchStepResult {
  if (state.mode !== 'joined' || state.phase !== 'delivery' || state.swingAttempted) {
    return { next: state, completedReward: 0, hitEvent: null, ballReleased: false };
  }

  const outcome = evaluateTimingAction(venue.sport, state.timingValue, state.deliveryIndex);
  const nextRuns = state.scoreRuns + outcome.runs;
  const nextWickets = state.wickets + (outcome.wicket ? 1 : 0);
  const nextBalls = state.ballsBowled + 1;

  const vx = Math.sin(outcome.launchYaw) * outcome.launchSpeed;
  const vz = Math.cos(outcome.launchYaw) * outcome.launchSpeed;

  const next: ParkMatchState = {
    ...state,
    phase: 'ball_in_flight',
    phaseTimer: 1.55,
    swingAttempted: true,
    scoreRuns: nextRuns,
    wickets: nextWickets,
    ballsBowled: nextBalls,
    lastOutcome: outcome.label,
    commentary: outcome.commentary,
    ballX: venue.creaseX,
    ballY: venue.sport === 'cricket' ? 0.95 : 2.0,
    ballZ: venue.creaseZ,
    ballVx: vx,
    ballVy: outcome.launchAngleY,
    ballVz: vz,
  };

  return {
    next,
    completedReward: 0,
    hitEvent: outcome,
    ballReleased: false,
  };
}

/**
 * Pure per-frame simulation tick for a live park sports match (both NPC pickup play and player joined/spectating).
 */
export function stepParkMatch(
  venue: ParkSportVenueDef,
  state: ParkMatchState,
  dt: number,
): ParkMatchStepResult {
  const next: ParkMatchState = { ...state };
  let completedReward = 0;
  let hitEvent: SwingOutcome | null = null;
  let ballReleased = false;

  if (next.phase === 'ready') {
    next.phaseTimer -= dt;
    next.ballX = venue.sport === 'cricket' ? venue.bowlerX : venue.creaseX;
    next.ballY = venue.sport === 'cricket' ? 1.35 : 1.5;
    next.ballZ = venue.sport === 'cricket' ? venue.bowlerZ : venue.creaseZ;
    next.timingValue = 0;
    if (next.phaseTimer <= 0) {
      next.phase = 'delivery';
      next.swingAttempted = false;
      next.deliveryIndex++;
      // Slightly vary delivery pace so each ball feels engaging
      next.deliverySpeed = venue.sport === 'cricket'
        ? 0.64 + (next.deliveryIndex % 3) * 0.14
        : 0.78 + (next.deliveryIndex % 2) * 0.12;
      next.timingValue = 0;
      ballReleased = true;
    }
  } else if (next.phase === 'delivery') {
    next.timingValue += dt * next.deliverySpeed;

    if (venue.sport === 'cricket') {
      // Ball travels from bowler toward batting crease with a realistic bounce at ~0.58 progress
      const t = Math.min(1, next.timingValue);
      next.ballX = venue.bowlerX + (venue.creaseX - venue.bowlerX) * t;
      next.ballZ = venue.bowlerZ + (venue.creaseZ - venue.bowlerZ) * t;
      next.ballY = t < 0.58 ? 1.55 - (t / 0.58) * 1.4 : 0.15 + Math.sin(((t - 0.58) / 0.42) * Math.PI) * 0.95;
    } else {
      // Streetball shooter dribbling / rising for release
      next.ballX = venue.creaseX;
      next.ballZ = venue.creaseZ;
      next.ballY = 1.15 + Math.abs(Math.sin(next.timingValue * Math.PI * 3)) * 0.75;
    }

    // In NPC or Spectating mode, the NPC batter/shooter automatically swings near the sweet spot
    if (next.mode !== 'joined' && next.timingValue >= 0.72) {
      const npcTiming = 0.68 + ((next.deliveryIndex * 37) % 24) * 0.01;
      const outcome = evaluateTimingAction(venue.sport, npcTiming, next.deliveryIndex);
      hitEvent = outcome;
      next.scoreRuns += outcome.runs;
      if (outcome.wicket) next.wickets = (next.wickets + 1) % 10;
      next.ballsBowled = (next.ballsBowled + 1) % venue.maxBalls;
      next.lastOutcome = outcome.label;
      next.commentary = `${venue.teamAName}: ${outcome.commentary}`;
      next.phase = 'ball_in_flight';
      next.phaseTimer = 1.65;
      next.ballX = venue.creaseX;
      next.ballY = venue.sport === 'cricket' ? 0.95 : 2.1;
      next.ballZ = venue.creaseZ;
      next.ballVx = Math.sin(outcome.launchYaw) * outcome.launchSpeed;
      next.ballVy = outcome.launchAngleY;
      next.ballVz = Math.cos(outcome.launchYaw) * outcome.launchSpeed;
    } else if (next.mode === 'joined' && next.timingValue >= 1.02) {
      // Player failed to swing / shoot in time
      const missOutcome: SwingOutcome =
        venue.sport === 'cricket'
          ? {
              runs: 0,
              wicket: true,
              label: 'MISSED! BOWLED',
              commentary: 'Too late on the swing — the ball zips right through to the stumps!',
              launchSpeed: 2.5,
              launchAngleY: 1.5,
              launchYaw: 0,
            }
          : {
              runs: 0,
              wicket: false,
              label: 'SHOT CLOCK VIOLATION',
              commentary: 'Held the rock too long — release in the gold zone next shot!',
              launchSpeed: 3.0,
              launchAngleY: 4.0,
              launchYaw: Math.PI,
            };
      hitEvent = missOutcome;
      next.wickets += missOutcome.wicket ? 1 : 0;
      next.ballsBowled += 1;
      next.lastOutcome = missOutcome.label;
      next.commentary = missOutcome.commentary;
      next.phase = 'ball_in_flight';
      next.phaseTimer = 1.25;
      next.ballVx = 0;
      next.ballVy = 2.0;
      next.ballVz = 2.0;
    }
  } else if (next.phase === 'ball_in_flight') {
    next.phaseTimer -= dt;
    next.ballX += next.ballVx * dt;
    next.ballZ += next.ballVz * dt;
    next.ballVy -= 15.5 * dt;
    next.ballY += next.ballVy * dt;
    if (next.ballY < 0.16) {
      next.ballY = 0.16;
      next.ballVy = Math.abs(next.ballVy) * 0.45;
      next.ballVx *= 0.82;
      next.ballVz *= 0.82;
    }
    if (next.phaseTimer <= 0) {
      // Check if player finished their over / shootout
      if (next.mode === 'joined' && next.ballsBowled >= venue.maxBalls) {
        completedReward = venue.basePrize + next.scoreRuns * venue.perPointBonus;
        next.mode = 'npc_match';
        next.phase = 'ready';
        next.phaseTimer = 1.6;
        next.lastOutcome = `OVER COMPLETE · ${next.scoreRuns} PTS (+$${completedReward})`;
        next.commentary = `Crowd loves it! You earned $${completedReward.toLocaleString('en-US')} at ${venue.name}!`;
      } else {
        next.phase = 'between_balls';
        next.phaseTimer = next.mode === 'joined' ? 0.85 : 1.5;
      }
    }
  } else {
    next.phaseTimer -= dt;
    if (next.phaseTimer <= 0) {
      next.phase = 'ready';
      next.phaseTimer = next.mode === 'joined' ? 0.65 : 1.0;
    }
  }

  return { next, completedReward, hitEvent, ballReleased };
}

export function buildParkSportHud(
  venue: ParkSportVenueDef,
  state: ParkMatchState,
): ActiveParkSportHud {
  return {
    venueId: venue.id,
    venueName: venue.name,
    sport: venue.sport,
    mode: state.mode,
    teamAName: venue.teamAName,
    teamBName: venue.teamBName,
    scoreRuns: state.scoreRuns,
    wickets: state.wickets,
    ballsBowled: state.ballsBowled,
    maxBalls: venue.maxBalls,
    timingValue: Number(Math.max(0, Math.min(1, state.timingValue)).toFixed(3)),
    canSwing: state.mode === 'joined' && state.phase === 'delivery' && !state.swingAttempted,
    lastOutcome: state.lastOutcome,
    commentary: state.commentary,
    potentialPrize: venue.basePrize + state.scoreRuns * venue.perPointBonus,
  };
}
