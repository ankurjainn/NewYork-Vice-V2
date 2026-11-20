import {
  CITY_BUILDINGS,
  EAST_BOUND,
  ELEPHANTA_ISLAND,
  FLYOVERS,
  NORTH_BOUND,
  OCEAN_WEST_BOUND,
  ROAD_COORDS,
  ROAD_HALF,
  SEA_NORTH_BOUND,
  SEA_SOUTH_BOUND,
  SOUTH_BOUND,
  WEST_BOUND,
  isPointInWater,
  sampleWorldElevation,
} from './cityLayout';
import type { BuildingCollider, NpcArchetype, VehicleType, WantedState } from './types';
import { resolveRecreationCollisions } from './recreationCollisions';
export type { WantedState };
export const EVADE_CLEAR_SECONDS = 8;

export interface VehicleSpec {
  type: VehicleType;
  label: string;
  width: number;
  length: number;
  height: number;
  maxSpeed: number;
  reverseSpeed: number;
  accel: number;
  brake: number;
  turnRate: number;
  grip: number;
  driftGrip: number;
  mass: number;
  maxHp: number;
  isWatercraft?: boolean;
}

export const VEHICLE_SPECS: Record<VehicleType, VehicleSpec> = {
  taxi: {
    type: 'taxi',
    label: 'NYC Yellow Cab',
    width: 1.9,
    length: 4.3,
    height: 1.55,
    maxSpeed: 28,
    reverseSpeed: 10,
    accel: 19,
    brake: 28,
    turnRate: 2.35,
    grip: 7.5,
    driftGrip: 2.1,
    mass: 1.3,
    maxHp: 120,
  },
  auto: {
    type: 'auto',
    label: 'NYC Pedicab Trike',
    width: 1.45,
    length: 2.9,
    height: 1.82,
    maxSpeed: 22,
    reverseSpeed: 8,
    accel: 17,
    brake: 26,
    turnRate: 3.1,
    grip: 8.5,
    driftGrip: 2.6,
    mass: 0.75,
    maxHp: 90,
  },
  bus: {
    type: 'bus',
    label: 'MTA City Bus',
    width: 2.55,
    length: 8.2,
    height: 3.1,
    maxSpeed: 21,
    reverseSpeed: 7,
    accel: 11,
    brake: 21,
    turnRate: 1.65,
    grip: 6.2,
    driftGrip: 2.8,
    mass: 4.2,
    maxHp: 260,
  },
  sports: {
    type: 'sports',
    label: 'Manhattan GT Supercar',
    width: 2.02,
    length: 4.55,
    height: 1.32,
    maxSpeed: 38,
    reverseSpeed: 12,
    accel: 27,
    brake: 35,
    turnRate: 2.6,
    grip: 8.6,
    driftGrip: 1.9,
    mass: 1.25,
    maxHp: 135,
  },
  hypercar: {
    type: 'hypercar',
    label: 'Valkyrie V12 Hypercar',
    width: 2.08,
    length: 4.66,
    height: 1.18,
    maxSpeed: 44,
    reverseSpeed: 13,
    accel: 32,
    brake: 40,
    turnRate: 2.78,
    grip: 9.4,
    driftGrip: 1.85,
    mass: 1.2,
    maxHp: 140,
  },
  muscle: {
    type: 'muscle',
    label: 'Bronx V8 Hellcat Coupe',
    width: 2.04,
    length: 4.68,
    height: 1.38,
    maxSpeed: 39,
    reverseSpeed: 12,
    accel: 29,
    brake: 34,
    turnRate: 2.52,
    grip: 8.0,
    driftGrip: 1.55,
    mass: 1.48,
    maxHp: 155,
  },
  suv_lux: {
    type: 'suv_lux',
    label: 'Park Ave Exotic SUV',
    width: 2.08,
    length: 4.78,
    height: 1.72,
    maxSpeed: 34,
    reverseSpeed: 11,
    accel: 24,
    brake: 31,
    turnRate: 2.42,
    grip: 8.4,
    driftGrip: 2.2,
    mass: 2.05,
    maxHp: 185,
  },
  police: {
    type: 'police',
    label: 'NYPD Interceptor SUV',
    width: 2.05,
    length: 4.65,
    height: 1.85,
    maxSpeed: 33,
    reverseSpeed: 11,
    accel: 23,
    brake: 30,
    turnRate: 2.5,
    grip: 8.2,
    driftGrip: 2.2,
    mass: 1.8,
    maxHp: 170,
  },
  syndicate_van: {
    type: 'syndicate_van',
    label: 'Syndicate Armored Van',
    width: 2.2,
    length: 5.3,
    height: 2.25,
    maxSpeed: 25,
    reverseSpeed: 9,
    accel: 15,
    brake: 24,
    turnRate: 1.9,
    grip: 7.0,
    driftGrip: 2.5,
    mass: 2.7,
    maxHp: 160,
  },
  ferry: {
    type: 'ferry',
    label: 'Staten Island Ferry',
    width: 4.6,
    length: 12.2,
    height: 3.8,
    maxSpeed: 23,
    reverseSpeed: 8,
    accel: 12,
    brake: 14,
    turnRate: 1.45,
    grip: 3.4,
    driftGrip: 1.6,
    mass: 6.5,
    maxHp: 340,
    isWatercraft: true,
  },
  speedboat: {
    type: 'speedboat',
    label: 'Hudson Coast Guard Boat',
    width: 2.6,
    length: 6.4,
    height: 1.8,
    maxSpeed: 35,
    reverseSpeed: 10,
    accel: 22,
    brake: 22,
    turnRate: 2.25,
    grip: 4.4,
    driftGrip: 1.8,
    mass: 1.9,
    maxHp: 185,
    isWatercraft: true,
  },
};

export interface VehiclePhysicsState {
  x: number;
  y?: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  speed: number;
  steerAngle: number;
  isDrifting: boolean;
  isBoosting: boolean;
  hitWall: boolean;
  impactSpeed: number;
}

export interface VehicleInput {
  throttle: number;
  steer: number;
  handbrake: boolean;
  boost: boolean;
  boostAvailable: boolean;
  wetGripMultiplier?: number;
}

export function resolveCircleBuildingCollisions(
  x: number,
  z: number,
  radius: number,
  buildings: BuildingCollider[] = CITY_BUILDINGS,
  elevationY = 0,
): { x: number; z: number; hit: boolean; normalX: number; normalZ: number } {
  let rx = x;
  let rz = z;
  let hit = false;
  let nx = 0;
  let nz = 0;

  if (rx < WEST_BOUND + radius) {
    rx = WEST_BOUND + radius;
    hit = true;
    nx = 1;
  } else if (rx > EAST_BOUND - radius) {
    rx = EAST_BOUND - radius;
    hit = true;
    nx = -1;
  }
  if (rz < NORTH_BOUND + radius) {
    rz = NORTH_BOUND + radius;
    hit = true;
    nz = 1;
  } else if (rz > SOUTH_BOUND - radius) {
    rz = SOUTH_BOUND - radius;
    hit = true;
    nz = -1;
  }

  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (elevationY > b.height + 0.5) continue;
    const halfW = b.width * 0.5;
    const halfD = b.depth * 0.5;
    const closestX = Math.max(b.x - halfW, Math.min(rx, b.x + halfW));
    const closestZ = Math.max(b.z - halfD, Math.min(rz, b.z + halfD));
    const dx = rx - closestX;
    const dz = rz - closestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq < radius * radius) {
      hit = true;
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
        } else if (minPen === penR) {
          rx = b.x + halfW + radius;
          nx = 1;
        } else if (minPen === penT) {
          rz = b.z - halfD - radius;
          nz = -1;
        } else {
          rz = b.z + halfD + radius;
          nz = 1;
        }
      }
    }
  }

  if (buildings === CITY_BUILDINGS) {
    const rec = resolveRecreationCollisions(rx, rz, radius, elevationY);
    if (rec.hit) {
      rx = rec.x;
      rz = rec.z;
      hit = true;
      nx = rec.normalX;
      nz = rec.normalZ;
    }
  }

  return { x: rx, z: rz, hit, normalX: nx, normalZ: nz };
}

export function resolveWatercraftBounds(
  x: number,
  z: number,
  radius: number,
): { x: number; z: number; hit: boolean; normalX: number; normalZ: number } {
  let rx = x;
  let rz = z;
  let hit = false;
  let nx = 0;
  let nz = 0;

  if (rx < OCEAN_WEST_BOUND + radius) {
    rx = OCEAN_WEST_BOUND + radius;
    hit = true;
    nx = 1;
  } else if (rx > EAST_BOUND - radius) {
    rx = EAST_BOUND - radius;
    hit = true;
    nx = -1;
  }
  if (rz < SEA_NORTH_BOUND + radius) {
    rz = SEA_NORTH_BOUND + radius;
    hit = true;
    nz = 1;
  } else if (rz > SEA_SOUTH_BOUND - radius) {
    rz = SEA_SOUTH_BOUND - radius;
    hit = true;
    nz = -1;
  }

  const islDx = rx - ELEPHANTA_ISLAND.x;
  const islDz = rz - ELEPHANTA_ISLAND.z;
  const islDist = Math.hypot(islDx, islDz);
  const minIslDist = ELEPHANTA_ISLAND.radius + radius;
  if (islDist < minIslDist && islDist > 0.001) {
    nx = islDx / islDist;
    nz = islDz / islDist;
    rx = ELEPHANTA_ISLAND.x + nx * minIslDist;
    rz = ELEPHANTA_ISLAND.z + nz * minIslDist;
    hit = true;
  }

  const seaWallX = -67.5 - radius;
  const northWallZ = -110 - radius;
  if (rx > seaWallX && rz > northWallZ) {
    const penWest = rx - seaWallX;
    const penNorth = rz - northWallZ;
    if (penWest <= penNorth) {
      rx = seaWallX;
      nx = -1;
      nz = 0;
    } else {
      rz = northWallZ;
      nx = 0;
      nz = -1;
    }
    hit = true;
  }

  return { x: rx, z: rz, hit, normalX: nx, normalZ: nz };
}

export function stepVehiclePhysics(
  state: VehiclePhysicsState,
  spec: VehicleSpec,
  input: VehicleInput,
  dt: number,
  buildings: BuildingCollider[] = CITY_BUILDINGS,
): VehiclePhysicsState {
  const safeDt = Math.min(Math.max(dt, 0), 0.05);
  const boosting = input.boost && input.boostAvailable && input.throttle > 0.1;
  const maxFwd = boosting ? spec.maxSpeed * 1.32 : spec.maxSpeed;
  const accelRate = boosting ? spec.accel * 1.48 : spec.accel;

  const fx = Math.sin(state.heading);
  const fz = Math.cos(state.heading);
  const rx = fz;
  const rz = -fx;

  let fwdSpeed = state.vx * fx + state.vz * fz;
  let latSpeed = state.vx * rx + state.vz * rz;

  if (input.throttle > 0.05) {
    fwdSpeed += input.throttle * accelRate * safeDt;
  } else if (input.throttle < -0.05) {
    if (fwdSpeed > 0.8) {
      fwdSpeed -= spec.brake * safeDt;
    } else {
      fwdSpeed += input.throttle * (accelRate * 0.7) * safeDt;
    }
  } else {
    const drag = Math.exp(-2.2 * safeDt);
    fwdSpeed *= drag;
  }

  if (input.handbrake) {
    fwdSpeed *= Math.exp(-3.4 * safeDt);
  }

  fwdSpeed = Math.max(-spec.reverseSpeed, Math.min(maxFwd, fwdSpeed));

  const speedFactor = Math.min(1, Math.abs(fwdSpeed) / 4.2);
  const reverseSign = fwdSpeed >= -0.2 ? 1 : -1;
  const turnPenalty = 1 - Math.min(0.35, Math.abs(fwdSpeed) / (spec.maxSpeed * 2.2));
  const driftBoostTurn = input.handbrake ? 1.28 : 1.0;
  const yawDelta =
    input.steer * spec.turnRate * speedFactor * turnPenalty * driftBoostTurn * reverseSign * safeDt;
  const nextHeading = state.heading + yawDelta;

  const nfx = Math.sin(nextHeading);
  const nfz = Math.cos(nextHeading);
  const nrx = nfz;
  const nrz = -nfx;

  const wetMult = input.wetGripMultiplier ?? 1.0;
  const activeGrip = (input.handbrake ? spec.driftGrip : spec.grip) * wetMult;
  latSpeed *= Math.exp(-activeGrip * safeDt);

  let vx = nfx * fwdSpeed + nrx * latSpeed;
  let vz = nfz * fwdSpeed + nrz * latSpeed;

  let nextX = state.x + vx * safeDt;
  let nextZ = state.z + vz * safeDt;
  const curY = state.y ?? 0;

  const radius = Math.max(spec.width, spec.length) * 0.36;
  let col: { x: number; z: number; hit: boolean; normalX: number; normalZ: number };
  let nextY = curY;

  if (spec.isWatercraft) {
    col = resolveWatercraftBounds(nextX, nextZ, radius);
    nextY = -0.35;
  } else {
    const elev = sampleWorldElevation(nextX, nextZ, curY);
    if (elev.onFlyover && elev.flyoverId) {
      const f = FLYOVERS.find((fl) => fl.id === elev.flyoverId);
      if (f) {
        const guardrail = f.halfWidth - spec.width * 0.55;
        if (f.axis === 'ew') {
          nextZ = Math.max(f.centerCoord - guardrail, Math.min(f.centerCoord + guardrail, nextZ));
        } else {
          nextX = Math.max(f.centerCoord - guardrail, Math.min(f.centerCoord + guardrail, nextX));
        }
      }
    }
    col = resolveCircleBuildingCollisions(nextX, nextZ, radius, buildings, elev.groundY);
    nextY = elev.groundY;
  }

  let impactSpeed = 0;
  if (col.hit) {
    const intoNormal = -(vx * col.normalX + vz * col.normalZ);
    if (intoNormal > 0) {
      impactSpeed = intoNormal;
      // Inelastic wall contact (no rubbery bounce-back; realistic scrape & forward slowdown)
      vx += col.normalX * intoNormal * 1.06;
      vz += col.normalZ * intoNormal * 1.06;
      const wallFric = Math.max(0.55, 0.84 - intoNormal * 0.015);
      vx *= wallFric;
      vz *= wallFric;
      // Strongly scrub sideways skid after wall hit so the car stays planted
      const postFwd = vx * nfx + vz * nfz;
      const postLat = (vx * nrx + vz * nrz) * 0.3;
      const clampedLat = Math.max(-3.4, Math.min(3.4, postLat));
      vx = nfx * postFwd + nrx * clampedLat;
      vz = nfz * postFwd + nrz * clampedLat;
    }
  }

  const finalSpeed = vx * nfx + vz * nfz;
  const isDrifting =
    !spec.isWatercraft &&
    (Math.abs(latSpeed) > 3.2 || (input.handbrake && Math.abs(finalSpeed) > 6.5));

  return {
    x: col.x,
    y: nextY,
    z: col.z,
    vx,
    vz,
    heading: nextHeading,
    speed: finalSpeed,
    steerAngle: input.steer * 0.55,
    isDrifting,
    isBoosting: boosting,
    hitWall: col.hit,
    impactSpeed,
  };
}

export interface VehiclePairCollisionResult {
  hit: boolean;
  impactSpeed: number;
  normalX: number;
  normalZ: number;
  contactX: number;
  contactZ: number;
  pitchImpulseA: number;
  rollImpulseA: number;
  pitchImpulseB: number;
  rollImpulseB: number;
}

/**
 * Realistic 2D Oriented Bounding Box (SAT) inelastic vehicle-to-vehicle collision resolver.
 * Uses true car dimensions & headings, mass-weighted separation, low-restitution metal-crunch
 * momentum exchange, and aggressive tire lateral-grip scrubbing so cars feel heavy and grounded
 * instead of drifting/skating wildly away after impact.
 */
export function resolveVehiclePairCollision(
  a: VehiclePhysicsState,
  specA: VehicleSpec,
  b: VehiclePhysicsState,
  specB: VehicleSpec,
): VehiclePairCollisionResult {
  const noHit: VehiclePairCollisionResult = {
    hit: false,
    impactSpeed: 0,
    normalX: 0,
    normalZ: 0,
    contactX: 0,
    contactZ: 0,
    pitchImpulseA: 0,
    rollImpulseA: 0,
    pitchImpulseB: 0,
    rollImpulseB: 0,
  };

  // Fast broadphase circle reject
  const maxR = (specA.length + specB.length) * 0.56;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (dx * dx + dz * dz > maxR * maxR) return noHit;

  const faX = Math.sin(a.heading);
  const faZ = Math.cos(a.heading);
  const raX = faZ;
  const raZ = -faX;
  const haW = specA.width * 0.47;
  const haL = specA.length * 0.48;

  const fbX = Math.sin(b.heading);
  const fbZ = Math.cos(b.heading);
  const rbX = fbZ;
  const rbZ = -fbX;
  const hbW = specB.width * 0.47;
  const hbL = specB.length * 0.48;

  const axes: Array<[number, number]> = [
    [faX, faZ],
    [raX, raZ],
    [fbX, fbZ],
    [rbX, rbZ],
  ];

  let minOverlap = Infinity;
  let bestNx = 1;
  let bestNz = 0;

  for (let i = 0; i < 4; i++) {
    const [ax, az] = axes[i];
    const projA = Math.abs(faX * ax + faZ * az) * haL + Math.abs(raX * ax + raZ * az) * haW;
    const projB = Math.abs(fbX * ax + fbZ * az) * hbL + Math.abs(rbX * ax + rbZ * az) * hbW;
    const centerProj = dx * ax + dz * az;
    const overlap = projA + projB - Math.abs(centerProj);
    if (overlap <= 0) return noHit;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      const sign = centerProj >= 0 ? 1 : -1;
      bestNx = ax * sign;
      bestNz = az * sign;
    }
  }

  // Mass-weighted positional separation (heavier buses/trucks stay solidly planted!)
  const invMassA = 1 / Math.max(0.4, specA.mass);
  const invMassB = 1 / Math.max(0.4, specB.mass);
  const invMassSum = invMassA + invMassB;
  const sep = minOverlap + 0.025;
  a.x -= bestNx * sep * (invMassA / invMassSum);
  a.z -= bestNz * sep * (invMassA / invMassSum);
  b.x += bestNx * sep * (invMassB / invMassSum);
  b.z += bestNz * sep * (invMassB / invMassSum);

  // Relative velocity along contact normal (bestN points from A -> B)
  const rvx = b.vx - a.vx;
  const rvz = b.vz - a.vz;
  const relNormal = rvx * bestNx + rvz * bestNz;

  const contactX = a.x + bestNx * Math.min(haL, Math.hypot(dx, dz) * 0.5);
  const contactZ = a.z + bestNz * Math.min(haL, Math.hypot(dx, dz) * 0.5);

  if (relNormal >= -0.15) {
    // Low-speed grazing/resting push — just scrub mutual slide cleanly
    a.vx *= 0.9;
    a.vz *= 0.9;
    b.vx *= 0.9;
    b.vz *= 0.9;
    a.speed = a.vx * faX + a.vz * faZ;
    b.speed = b.vx * fbX + b.vz * fbZ;
    return {
      hit: true,
      impactSpeed: Math.max(0, -relNormal),
      normalX: bestNx,
      normalZ: bestNz,
      contactX,
      contactZ,
      pitchImpulseA: 0,
      rollImpulseA: 0,
      pitchImpulseB: 0,
      rollImpulseB: 0,
    };
  }

  const impactSpeed = -relNormal;
  // Inelastic metal-crunch restitution (0.14 = solid thud, NOT bouncy air-hockey!)
  const restitution = 0.14;
  const impulseMag = ((1 + restitution) * impactSpeed) / invMassSum;

  // Correctly signed momentum exchange: A is pushed along -N, B is pushed along +N
  a.vx -= bestNx * impulseMag * invMassA;
  a.vz -= bestNz * impulseMag * invMassA;
  b.vx += bestNx * impulseMag * invMassB;
  b.vz += bestNz * impulseMag * invMassB;

  // Tangential friction during metal-on-metal scrape
  const tx = -bestNz;
  const tz = bestNx;
  const relTan = rvx * tx + rvz * tz;
  const tanImpulse = Math.max(-impulseMag * 0.32, Math.min(impulseMag * 0.32, -relTan / invMassSum));
  a.vx -= tx * tanImpulse * invMassA;
  a.vz -= tz * tanImpulse * invMassA;
  b.vx += tx * tanImpulse * invMassB;
  b.vz += tz * tanImpulse * invMassB;

  // Grounded tire-grip lateral scrub & crumple energy damping so neither car skates sideways!
  const stabilizeCar = (car: VehiclePhysicsState, fx: number, fz: number, rx: number, rz: number, massShare: number) => {
    const crumpleDamp = 1 - Math.min(0.42, impactSpeed * 0.022 * massShare);
    let fwd = (car.vx * fx + car.vz * fz) * crumpleDamp;
    let lat = (car.vx * rx + car.vz * rz) * 0.24;
    lat = Math.max(-3.2, Math.min(3.2, lat));
    // Prevent unrealistically fast reverse slingshots from head-on hits
    if (Math.abs(fwd) > 22) fwd = Math.sign(fwd) * 22;
    car.vx = fx * fwd + rx * lat;
    car.vz = fz * fwd + rz * lat;
    car.speed = fwd;
  };

  stabilizeCar(a, faX, faZ, raX, raZ, invMassA / invMassSum);
  stabilizeCar(b, fbX, fbZ, rbX, rbZ, invMassB / invMassSum);

  // Subtle realistic chassis suspension crunch (pitch nose-dive + lateral roll recoil)
  const crunchStrength = Math.min(0.14, impactSpeed * 0.0085);
  const aForwardHit = bestNx * faX + bestNz * faZ;
  const aSideHit = bestNx * raX + bestNz * raZ;
  const bForwardHit = -(bestNx * fbX + bestNz * fbZ);
  const bSideHit = -(bestNx * rbX + bestNz * rbZ);

  // Small realistic glancing yaw nudge only on off-center side hits (strictly bounded)
  const yawNudgeA = Math.max(-0.08, Math.min(0.08, aSideHit * aForwardHit * impactSpeed * 0.004 * (invMassA / invMassSum)));
  const yawNudgeB = Math.max(-0.08, Math.min(0.08, bSideHit * bForwardHit * impactSpeed * 0.004 * (invMassB / invMassSum)));
  a.heading += yawNudgeA;
  b.heading += yawNudgeB;

  return {
    hit: true,
    impactSpeed,
    normalX: bestNx,
    normalZ: bestNz,
    contactX,
    contactZ,
    pitchImpulseA: -aForwardHit * crunchStrength * (invMassA / invMassSum) * 1.4,
    rollImpulseA: aSideHit * crunchStrength * (invMassA / invMassSum) * 1.4,
    pitchImpulseB: -bForwardHit * crunchStrength * (invMassB / invMassSum) * 1.4,
    rollImpulseB: bSideHit * crunchStrength * (invMassB / invMassSum) * 1.4,
  };
}

export function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export const COLLISION_GRACE_SEC = 1.15;
export const HP_REGEN_DELAY_SEC = 4.2;
export const HP_REGEN_PER_SEC = 9.5;
export const MAX_SINGLE_CRASH_PLAYER_DAMAGE = 20;

export function computeCrashDamage(
  impactSpeed: number,
  inVehicle: boolean,
): { playerDamage: number; vehicleDamage: number } {
  const threshold = inVehicle ? 5.2 : 4.2;
  if (impactSpeed <= threshold) {
    return { playerDamage: 0, vehicleDamage: 0 };
  }
  const over = impactSpeed - threshold;
  const rawPlayer = inVehicle ? 4 + over * 0.85 : 7 + over * 1.2;
  const playerDamage = Math.min(MAX_SINGLE_CRASH_PLAYER_DAMAGE, Math.round(rawPlayer));
  const vehicleDamage = inVehicle ? Math.min(34, Math.round(7 + over * 1.35)) : 0;
  return { playerDamage, vehicleDamage };
}

export function stepHealthRegen(
  hp: number,
  maxHp: number,
  timeSinceDamage: number,
  dt: number,
): { hp: number; regenerating: boolean } {
  if (hp <= 0 || hp >= maxHp) {
    return { hp: Math.max(0, Math.min(maxHp, hp)), regenerating: false };
  }
  if (timeSinceDamage < HP_REGEN_DELAY_SEC) {
    return { hp, regenerating: false };
  }
  const nextHp = Math.min(maxHp, hp + HP_REGEN_PER_SEC * Math.max(0, dt));
  return { hp: nextHp, regenerating: nextHp > hp };
}

export function stepSmoothSteer(current: number, rawTarget: number, dt: number): number {
  const safeDt = Math.min(Math.max(dt, 0), 0.05);
  const rate = rawTarget === 0 ? 10.5 : 7.5;
  const k = 1 - Math.exp(-rate * safeDt);
  const next = current + (rawTarget - current) * k;
  return Math.abs(next) < 0.002 && rawTarget === 0 ? 0 : next;
}

export function stepCameraYaw(params: {
  currentYaw: number;
  targetYaw: number;
  dt: number;
  mode: 'foot' | 'drive';
  inputF: number;
  inputR: number;
  vehicleSpeed: number;
}): number {
  const safeDt = Math.min(Math.max(params.dt, 0), 0.05);
  const { currentYaw, targetYaw, mode, inputF, inputR, vehicleSpeed } = params;

  if (mode === 'foot') {
    if (inputF < 0) {
      return currentYaw;
    }
    const baseRate = inputF > 0 ? 1.55 : inputR !== 0 ? 0.85 : 0;
    if (baseRate <= 0) return currentYaw;
    const diff = normalizeAngle(targetYaw - currentYaw);
    const maxStep = 1.15 * safeDt;
    const step = diff * (1 - Math.exp(-baseRate * safeDt));
    return currentYaw + Math.max(-maxStep, Math.min(maxStep, step));
  }

  if (vehicleSpeed < -0.6) {
    return currentYaw;
  }
  const speedWeight = Math.min(1, Math.abs(vehicleSpeed) / 9);
  const rate = 2.0 + speedWeight * 2.2;
  const diff = normalizeAngle(targetYaw - currentYaw);
  const maxStep = 2.4 * safeDt;
  const step = diff * (1 - Math.exp(-rate * safeDt));
  return currentYaw + Math.max(-maxStep, Math.min(maxStep, step));
}

export function addWantedHeat(state: WantedState, deltaHeat: number): WantedState {
  const heat = Math.max(0, Math.min(250, state.heat + deltaHeat));
  const stars = computeStarsFromHeat(heat);
  return {
    heat,
    stars,
    evadeTimer: 0,
    bustedProgress: state.bustedProgress,
  };
}

export function computeStarsFromHeat(heat: number): number {
  if (heat >= 210) return 5;
  if (heat >= 160) return 4;
  if (heat >= 110) return 3;
  if (heat >= 60) return 2;
  if (heat >= 22) return 1;
  return 0;
}

export function stepWantedSystem(
  state: WantedState,
  dt: number,
  nearestPoliceDist: number,
  playerSpeed: number,
): { next: WantedState; busted: boolean; cooldownRatio: number } {
  const safeDt = Math.min(Math.max(dt, 0), 0.05);
  const next: WantedState = { ...state };
  if (next.stars === 0) {
    next.evadeTimer = 0;
    next.bustedProgress = 0;
    next.heat = Math.max(0, next.heat - 8 * safeDt);
    return { next, busted: false, cooldownRatio: 0 };
  }

  if (nearestPoliceDist < 6.0 && playerSpeed < 2.2) {
    next.bustedProgress += safeDt / 4.4;
    if (next.bustedProgress >= 1) {
      return { next, busted: true, cooldownRatio: 0 };
    }
  } else {
    next.bustedProgress = Math.max(0, next.bustedProgress - safeDt * 0.9);
  }

  const evadeRequired = 6.5 + next.stars * 1.5;
  if (nearestPoliceDist > 32) {
    next.evadeTimer += safeDt;
    if (next.evadeTimer >= evadeRequired) {
      next.stars = Math.max(0, next.stars - 1);
      next.heat = next.stars === 0 ? 0 : next.stars * 45;
      next.evadeTimer = 0;
    }
  } else {
    next.evadeTimer = Math.max(0, next.evadeTimer - safeDt * 0.65);
  }

  return {
    next,
    busted: false,
    cooldownRatio: Math.min(1, next.evadeTimer / evadeRequired),
  };
}

export interface TrafficAgentState {
  x: number;
  z: number;
  axis: 'ns' | 'ew';
  dir: 1 | -1;
  roadCoord: number;
  speed: number;
  targetSpeed: number;
}

export interface TrafficLightPhase {
  ns: 'green' | 'amber' | 'red';
  ew: 'green' | 'amber' | 'red';
}

export const TRAFFIC_CYCLE_SEC = 18;
export const TRAFFIC_GREEN_SEC = 7.0;
export const TRAFFIC_AMBER_SEC = 2.0;

export function getTrafficSignalState(simTime: number, phaseOffset = 0): TrafficLightPhase {
  const halfCycle = TRAFFIC_CYCLE_SEC * 0.5;
  const t = (((simTime + phaseOffset) % TRAFFIC_CYCLE_SEC) + TRAFFIC_CYCLE_SEC) % TRAFFIC_CYCLE_SEC;
  if (t < TRAFFIC_GREEN_SEC) {
    return { ns: 'green', ew: 'red' };
  }
  if (t < halfCycle) {
    return { ns: 'amber', ew: 'red' };
  }
  if (t < halfCycle + TRAFFIC_GREEN_SEC) {
    return { ns: 'red', ew: 'green' };
  }
  return { ns: 'red', ew: 'amber' };
}

export function getIntersectionPhaseOffset(roadX: number, roadZ: number): number {
  const ix = Math.round((roadX + 56) / 56);
  const iz = Math.round((roadZ + 56) / 56);
  return ((ix + iz) % 2) * (TRAFFIC_CYCLE_SEC * 0.5);
}

export function shouldStopForTrafficLight(
  axis: 'ns' | 'ew',
  dir: 1 | -1,
  x: number,
  z: number,
  roadCoord: number,
  simTime: number,
): boolean {
  const pos = axis === 'ns' ? z : x;
  for (let i = 0; i < ROAD_COORDS.length; i++) {
    const cross = ROAD_COORDS[i];
    const distAhead = (cross - pos) * dir;
    if (distAhead >= 6.8 && distAhead <= 16.5) {
      const ix = axis === 'ns' ? roadCoord : cross;
      const iz = axis === 'ns' ? cross : roadCoord;
      const signal = getTrafficSignalState(simTime, getIntersectionPhaseOffset(ix, iz));
      const myLight = axis === 'ns' ? signal.ns : signal.ew;
      return myLight === 'red' || myLight === 'amber';
    }
  }
  return false;
}

export type TrafficAxis = 'ns' | 'ew';

export interface TrafficBehaviorDecision {
  targetSpeed: number;
  stoppingForRed: boolean;
  shouldHonk: boolean;
}

export function evaluateTrafficBehavior(params: {
  x: number;
  z: number;
  axis: TrafficAxis;
  dir: 1 | -1;
  roadCoord: number;
  simTime: number;
  nearestAheadDist: number;
  cruiseSpeed: number;
}): TrafficBehaviorDecision {
  const { x, z, axis, dir, roadCoord, simTime, nearestAheadDist, cruiseSpeed } = params;
  const redLight = shouldStopForTrafficLight(axis, dir, x, z, roadCoord, simTime);
  if (redLight) {
    return { targetSpeed: 0, stoppingForRed: true, shouldHonk: false };
  }
  if (nearestAheadDist < 7.5) {
    return {
      targetSpeed: 0,
      stoppingForRed: false,
      shouldHonk: nearestAheadDist < 6.2,
    };
  }
  if (nearestAheadDist < 15.5) {
    const ratio = (nearestAheadDist - 7.5) / 8.0;
    return {
      targetSpeed: cruiseSpeed * Math.max(0.18, ratio),
      stoppingForRed: false,
      shouldHonk: false,
    };
  }
  return {
    targetSpeed: cruiseSpeed,
    stoppingForRed: false,
    shouldHonk: false,
  };
}

/**
 * Right-hand driving lane offset (USA / New York City standard).
 * Going +Z (South): keep right -> West (-X).
 * Going -Z (North): keep right -> East (+X).
 * Going +X (East): keep right -> South (+Z).
 * Going -X (West): keep right -> North (-Z).
 */
export function getNycLaneCoord(axis: 'ns' | 'ew', dir: 1 | -1, roadCoord: number): number {
  const offset = 3.1;
  if (axis === 'ns') {
    return dir === 1 ? roadCoord - offset : roadCoord + offset;
  }
  return dir === 1 ? roadCoord + offset : roadCoord - offset;
}

/** Alias preserved for any external reference */
export const getIndianLaneCoord = getNycLaneCoord;

export function stepTrafficAgent(
  agent: TrafficAgentState,
  dt: number,
  blockedAhead: boolean,
  turnSeed: number,
  simTime = 0,
): { next: TrafficAgentState; heading: number; stoppedAtRedLight: boolean } {
  const safeDt = Math.min(Math.max(dt, 0), 0.05);
  const next: TrafficAgentState = { ...agent };

  const redLightAhead = shouldStopForTrafficLight(
    next.axis,
    next.dir,
    next.x,
    next.z,
    next.roadCoord,
    simTime,
  );

  const desired = blockedAhead || redLightAhead ? 0 : next.targetSpeed;
  const accel = blockedAhead || redLightAhead ? 16 : 6.5;
  if (next.speed < desired) {
    next.speed = Math.min(desired, next.speed + accel * safeDt);
  } else {
    next.speed = Math.max(desired, next.speed - accel * safeDt);
  }

  if (next.axis === 'ns') {
    next.z += next.dir * next.speed * safeDt;
    const laneX = getNycLaneCoord('ns', next.dir, next.roadCoord);
    next.x += (laneX - next.x) * Math.min(1, safeDt * 6);

    if (next.z > SOUTH_BOUND - 10) next.dir = -1;
    if (next.z < NORTH_BOUND + 26) next.dir = 1;

    for (let i = 0; i < ROAD_COORDS.length; i++) {
      const rz = ROAD_COORDS[i];
      if (Math.abs(next.z - rz) < 0.7 && turnSeed > 0.72) {
        next.axis = 'ew';
        next.roadCoord = rz;
        next.dir = turnSeed > 0.86 ? 1 : -1;
        break;
      }
    }
  } else {
    next.x += next.dir * next.speed * safeDt;
    const laneZ = getNycLaneCoord('ew', next.dir, next.roadCoord);
    next.z += (laneZ - next.z) * Math.min(1, safeDt * 6);

    if (next.x > EAST_BOUND - 10) next.dir = -1;
    if (next.x < WEST_BOUND + 12) next.dir = 1;

    for (let i = 0; i < ROAD_COORDS.length; i++) {
      const rx = ROAD_COORDS[i];
      if (Math.abs(next.x - rx) < 0.7 && turnSeed > 0.72) {
        next.axis = 'ns';
        next.roadCoord = rx;
        next.dir = turnSeed > 0.86 ? 1 : -1;
        break;
      }
    }
  }

  const heading =
    next.axis === 'ns'
      ? next.dir === 1
        ? 0
        : Math.PI
      : next.dir === 1
        ? Math.PI * 0.5
        : -Math.PI * 0.5;

  return { next, heading, stoppedAtRedLight: redLightAhead };
}

export function shouldPoliceDeployOfficer(params: {
  wantedStars: number;
  distToPlayer: number;
  playerSpeedMps: number;
  playerInVehicle: boolean;
  alreadyDeployed: boolean;
  deployCooldown: number;
}): boolean {
  if (params.wantedStars <= 0 || params.alreadyDeployed || params.deployCooldown > 0) {
    return false;
  }
  const maxDist = params.playerInVehicle ? 11.5 : 16.5;
  const maxSpeed = params.playerInVehicle ? 3.5 : 8.5;
  return params.distToPlayer <= maxDist && params.playerSpeedMps <= maxSpeed;
}

export interface NpcMotionDecision {
  desiredVx: number;
  desiredVz: number;
  fleeing: boolean;
  telegraphAttack: boolean;
}

export function computeNpcDesiredVelocity(params: {
  archetype: NpcArchetype;
  x: number;
  z: number;
  playerX: number;
  playerZ: number;
  playerVx: number;
  playerVz: number;
  playerSpeed: number;
  patrolHeading: number;
  strafeSign: number;
  windupTimer: number;
  wantedStars?: number;
}): NpcMotionDecision {
  const {
    archetype,
    x,
    z,
    playerX,
    playerZ,
    playerVx,
    playerVz,
    playerSpeed,
    patrolHeading,
    strafeSign,
    windupTimer,
    wantedStars = 0,
  } = params;

  const dx = playerX - x;
  const dz = playerZ - z;
  const dist = Math.hypot(dx, dz) || 0.001;

  if (
    archetype === 'vendor' ||
    archetype === 'informant' ||
    archetype === 'shopkeeper' ||
    archetype === 'cricketer' ||
    archetype === 'baller' ||
    archetype === 'mission_contact'
  ) {
    return { desiredVx: 0, desiredVz: 0, fleeing: false, telegraphAttack: false };
  }

  if (archetype === 'purse_snatcher') {
    // Sprints rapidly away from the player along the avenue, catchable with Shift sprint
    const runSpeed = 5.5;
    const awayX = -dx / dist;
    const awayZ = -dz / dist;
    const zig = Math.sin(patrolHeading * 2.5) * 0.22;
    const vx = awayX - awayZ * zig;
    const vz = awayZ + awayX * zig;
    const mag = Math.hypot(vx, vz) || 1;
    return {
      desiredVx: (vx / mag) * runSpeed,
      desiredVz: (vz / mag) * runSpeed,
      fleeing: true,
      telegraphAttack: false,
    };
  }

  if (archetype === 'police_officer') {
    if (wantedStars > 0 && dist < 48) {
      const chaseSpeed = 4.5 + Math.min(1.4, wantedStars * 0.28);
      const leadT = Math.min(0.32, dist / 20);
      const tx = playerX + playerVx * leadT - x;
      const tz = playerZ + playerVz * leadT - z;
      const td = Math.hypot(tx, tz) || 0.001;
      return {
        desiredVx: (tx / td) * chaseSpeed,
        desiredVz: (tz / td) * chaseSpeed,
        fleeing: false,
        telegraphAttack: dist < 2.2,
      };
    }
    return {
      desiredVx: Math.sin(patrolHeading) * 1.85,
      desiredVz: Math.cos(patrolHeading) * 1.85,
      fleeing: false,
      telegraphAttack: false,
    };
  }

  if (archetype === 'commuter') {
    if (dist < 11 && playerSpeed > 5.5) {
      const fleeSpeed = 4.6;
      return {
        desiredVx: (-dx / dist) * fleeSpeed,
        desiredVz: (-dz / dist) * fleeSpeed,
        fleeing: true,
        telegraphAttack: false,
      };
    }
    return {
      desiredVx: Math.sin(patrolHeading) * 1.65,
      desiredVz: Math.cos(patrolHeading) * 1.65,
      fleeing: false,
      telegraphAttack: false,
    };
  }

  if (windupTimer > 0) {
    return { desiredVx: 0, desiredVz: 0, fleeing: false, telegraphAttack: true };
  }

  if (archetype === 'rival_rusher') {
    if (dist < 2.8) {
      return { desiredVx: 0, desiredVz: 0, fleeing: false, telegraphAttack: true };
    }
    const leadT = Math.min(0.5, dist / 14);
    const tx = playerX + playerVx * leadT - x;
    const tz = playerZ + playerVz * leadT - z;
    const td = Math.hypot(tx, tz) || 0.001;
    const speed = 5.4;
    return {
      desiredVx: (tx / td) * speed,
      desiredVz: (tz / td) * speed,
      fleeing: false,
      telegraphAttack: false,
    };
  }

  if (dist < 3.4) {
    return { desiredVx: 0, desiredVz: 0, fleeing: false, telegraphAttack: true };
  }
  const nx = dx / dist;
  const nz = dz / dist;
  const px = -nz * strafeSign;
  const pz = nx * strafeSign;
  const speed = 4.7;
  const mixF = dist > 9 ? 0.85 : 0.4;
  const mixS = dist > 9 ? 0.35 : 0.85;
  const mvx = nx * mixF + px * mixS;
  const mvz = nz * mixF + pz * mixS;
  const m = Math.hypot(mvx, mvz) || 1;
  return {
    desiredVx: (mvx / m) * speed,
    desiredVz: (mvz / m) * speed,
    fleeing: false,
    telegraphAttack: false,
  };
}

export { isPointInWater };

// ============================================================================
// SIDEWALK-FIRST PEDESTRIAN PLACEMENT & STEERING (KEEP ROADS CLEAR, SIDEWALKS LIVELY)
// ============================================================================

/**
 * Returns true if (x, z) sits inside an avenue or cross-street asphalt roadway.
 * ROAD_HALF is 7.0m; curb sits at ±7.0m and concrete sidewalks span ±7.4m .. ±12.2m.
 */
export function isPointOnRoadway(x: number, z: number, curbInset = 0.15): boolean {
  const half = ROAD_HALF - curbInset;
  for (let i = 0; i < ROAD_COORDS.length; i++) {
    const rc = ROAD_COORDS[i];
    if (Math.abs(x - rc) < half || Math.abs(z - rc) < half) {
      return true;
    }
  }
  return false;
}

/**
 * Finds the nearest road coordinate and signed distance along one axis.
 */
function findNearestRoadOffset(coord: number): { roadCoord: number; signedDelta: number; absDelta: number } {
  let bestRc: number = ROAD_COORDS[0];
  let bestSigned = coord - bestRc;
  let bestAbs = Math.abs(bestSigned);
  for (let i = 1; i < ROAD_COORDS.length; i++) {
    const rc = ROAD_COORDS[i];
    const d = coord - rc;
    const ad = Math.abs(d);
    if (ad < bestAbs) {
      bestAbs = ad;
      bestSigned = d;
      bestRc = rc;
    }
  }
  return { roadCoord: bestRc, signedDelta: bestSigned, absDelta: bestAbs };
}

/**
 * Snaps any spawn or streamed NPC coordinate off the roadway asphalt onto the nearest
 * concrete NYC sidewalk strip (8.3m..10.6m from road center) while staying clear of buildings.
 */
export function snapPointToSidewalk(
  x: number,
  z: number,
  sideHint = 1,
  depthSlot = 0.4,
  buildings: BuildingCollider[] = CITY_BUILDINGS,
): { x: number; z: number; heading: number } {
  const rx = findNearestRoadOffset(x);
  const rz = findNearestRoadOffset(z);
  const sidewalkDist = ROAD_HALF + 1.35 + Math.max(0, Math.min(1, depthSlot)) * 2.15; // 8.35m..10.5m

  let sx = x;
  let sz = z;
  const onXRoad = rx.absDelta < ROAD_HALF + 0.65;
  const onZRoad = rz.absDelta < ROAD_HALF + 0.65;

  if (onXRoad && onZRoad) {
    // Inside an intersection box — push diagonally onto the nearest sidewalk corner
    const signX = rx.signedDelta !== 0 ? Math.sign(rx.signedDelta) : sideHint >= 0 ? 1 : -1;
    const signZ = rz.signedDelta !== 0 ? Math.sign(rz.signedDelta) : sideHint >= 0 ? 1 : -1;
    sx = rx.roadCoord + signX * sidewalkDist;
    sz = rz.roadCoord + signZ * sidewalkDist;
  } else if (onXRoad) {
    const signX = rx.signedDelta !== 0 ? Math.sign(rx.signedDelta) : sideHint >= 0 ? 1 : -1;
    sx = rx.roadCoord + signX * sidewalkDist;
  } else if (onZRoad) {
    const signZ = rz.signedDelta !== 0 ? Math.sign(rz.signedDelta) : sideHint >= 0 ? 1 : -1;
    sz = rz.roadCoord + signZ * sidewalkDist;
  }

  // Clamp within walkable city bounds
  sx = Math.max(WEST_BOUND + 1.2, Math.min(EAST_BOUND - 6, sx));
  sz = Math.max(NORTH_BOUND + 6, Math.min(SOUTH_BOUND - 6, sz));

  const resolved = resolveCircleBuildingCollisions(sx, sz, 0.55, buildings);
  // If building collision pushed back onto asphalt, step slightly along the avenue sidewalk
  const finalX = resolved.x;
  const finalZ = resolved.z;

  // Prefer walking parallel to the nearest avenue/cross-street sidewalk
  const postRx = findNearestRoadOffset(finalX);
  const postRz = findNearestRoadOffset(finalZ);
  let heading: number;
  if (postRx.absDelta <= postRz.absDelta) {
    heading = sideHint >= 0 ? 0 : Math.PI;
  } else {
    heading = sideHint >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
  }

  return { x: finalX, z: finalZ, heading };
}

/**
 * Keeps wandering pedestrians off the road asphalt and walking along sidewalks.
 * Only a tiny designated crosswalk subset (allowCrossing=true) may briefly cross at intersections.
 */
export function steerPedestrianForSidewalk(params: {
  x: number;
  z: number;
  heading: number;
  allowCrossing?: boolean;
}): { heading: number; onRoad: boolean; pushX: number; pushZ: number } {
  const { x, z, heading, allowCrossing = false } = params;
  const rx = findNearestRoadOffset(x);
  const rz = findNearestRoadOffset(z);
  const roadEdge = ROAD_HALF + 0.35;
  const onXRoad = rx.absDelta < roadEdge;
  const onZRoad = rz.absDelta < roadEdge;
  const onRoad = onXRoad || onZRoad;

  if (!onRoad) {
    // If on a sidewalk band right beside a road, check whether next step would step off the curb
    const lookX = x + Math.sin(heading) * 1.4;
    const lookZ = z + Math.cos(heading) * 1.4;
    const stepOnX = findNearestRoadOffset(lookX).absDelta < ROAD_HALF + 0.2;
    const stepOnZ = findNearestRoadOffset(lookZ).absDelta < ROAD_HALF + 0.2;

    if ((stepOnX || stepOnZ) && !allowCrossing) {
      // Align cleanly along the sidewalk instead of stepping into live traffic!
      if (stepOnX && !stepOnZ) {
        const alongNS = Math.cos(heading) >= 0 ? 0 : Math.PI;
        return { heading: alongNS, onRoad: false, pushX: 0, pushZ: 0 };
      }
      if (stepOnZ && !stepOnX) {
        const alongEW = Math.sin(heading) >= 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
        return { heading: alongEW, onRoad: false, pushX: 0, pushZ: 0 };
      }
      // Corner intersection: turn around or take perpendicular sidewalk
      return { heading: normalizeAngle(heading + Math.PI * 0.5), onRoad: false, pushX: 0, pushZ: 0 };
    }
    return { heading, onRoad: false, pushX: 0, pushZ: 0 };
  }

  // If explicitly allowed to cross at an intersection zebra strip, let them finish crossing briskly
  if (allowCrossing && ((onXRoad && rz.absDelta < 12.5) || (onZRoad && rx.absDelta < 12.5))) {
    return { heading, onRoad: true, pushX: 0, pushZ: 0 };
  }

  // Otherwise guide & gently nudge pedestrian back onto the nearest sidewalk curb
  let pushX = 0;
  let pushZ = 0;
  if (onXRoad && (!onZRoad || rx.absDelta >= rz.absDelta)) {
    const signX = rx.signedDelta >= 0 ? 1 : -1;
    pushX = signX;
  } else {
    const signZ = rz.signedDelta >= 0 ? 1 : -1;
    pushZ = signZ;
  }
  const escapeHeading = Math.atan2(pushX, pushZ);
  return { heading: escapeHeading, onRoad: true, pushX, pushZ };
}

// ============================================================================
// UNIFIED MELEE & VEHICLE-VS-NPC HIT DETECTION (ALL INTERACTIVE + CROWD NPCS)
// ============================================================================

export interface MeleeHitResult {
  hit: boolean;
  dist: number;
  dirX: number;
  dirZ: number;
}

/**
 * Evaluates whether an on-foot hand strike / shove connects with a target NPC.
 * Uses a generous close-brawl aura (2.15m 360°) plus a wide forward strike arc (reach 3.55m)
 * so hand attacks feel crisp and never mysteriously whiff at close range.
 */
export function evaluateMeleeHit(params: {
  playerX: number;
  playerZ: number;
  playerHeading: number;
  targetX: number;
  targetZ: number;
  reach?: number;
}): MeleeHitResult {
  const { playerX, playerZ, playerHeading, targetX, targetZ, reach = 3.55 } = params;
  const dx = targetX - playerX;
  const dz = targetZ - playerZ;
  const dist = Math.hypot(dx, dz);
  const fx = Math.sin(playerHeading);
  const fz = Math.cos(playerHeading);

  if (dist > reach) {
    return { hit: false, dist, dirX: fx, dirZ: fz };
  }

  const dirX = dist > 0.001 ? dx / dist : fx;
  const dirZ = dist > 0.001 ? dz / dist : fz;

  // Immediate contact / close-quarters brawl hit regardless of tiny facing mismatch
  if (dist <= 2.15) {
    return { hit: true, dist, dirX, dirZ };
  }

  // Wide ~160° forward strike cone (cos(80°) ≈ 0.17)
  const forwardDot = dirX * fx + dirZ * fz;
  return { hit: forwardDot >= 0.15, dist, dirX, dirZ };
}

export interface VehicleNpcImpactResult {
  hit: boolean;
  impactSpeed: number;
  damage: number;
  launchVx: number;
  launchVy: number;
  launchVz: number;
  knockoutDuration: number;
}

/**
 * True Oriented Bounding Box (OBB) vehicle-vs-pedestrian impact check.
 * Works accurately across every vehicle footprint from Pedicab Trike (2.9m) to MTA Bus (8.2m),
 * so bumper and fender hits ALWAYS register cleanly when hitting any NPC.
 */
export function evaluateVehicleNpcImpact(params: {
  vehicle: VehiclePhysicsState;
  spec: VehicleSpec;
  npcX: number;
  npcZ: number;
}): VehicleNpcImpactResult {
  const { vehicle, spec, npcX, npcZ } = params;
  const noHit: VehicleNpcImpactResult = {
    hit: false,
    impactSpeed: 0,
    damage: 0,
    launchVx: 0,
    launchVy: 0,
    launchVz: 0,
    knockoutDuration: 0,
  };

  const speedAbs = Math.hypot(vehicle.vx, vehicle.vz);
  if (speedAbs < 2.0) return noHit;

  const dx = npcX - vehicle.x;
  const dz = npcZ - vehicle.z;
  const maxR = spec.length * 0.5 + spec.width * 0.5 + 1.0;
  if (dx * dx + dz * dz > maxR * maxR) return noHit;

  const fx = Math.sin(vehicle.heading);
  const fz = Math.cos(vehicle.heading);
  const rx = fz;
  const rz = -fx;

  const localFwd = dx * fx + dz * fz;
  const localRight = dx * rx + dz * rz;

  const halfLen = spec.length * 0.5 + 0.65;
  const halfWid = spec.width * 0.5 + 0.62;

  if (Math.abs(localFwd) > halfLen || Math.abs(localRight) > halfWid) {
    return noHit;
  }

  // Compute physically plausible launch vector: combination of vehicle momentum + lateral deflection
  const dist = Math.hypot(dx, dz) || 1;
  const awayX = dx / dist;
  const awayZ = dz / dist;
  const velDirX = vehicle.vx / speedAbs;
  const velDirZ = vehicle.vz / speedAbs;

  const sideSign = localRight >= 0 ? 1 : -1;
  const pushX = velDirX * 0.68 + awayX * 0.22 + rx * sideSign * 0.34;
  const pushZ = velDirZ * 0.68 + awayZ * 0.22 + rz * sideSign * 0.34;
  const pushMag = Math.hypot(pushX, pushZ) || 1;

  const launchSpeed = Math.min(18.5, Math.max(6.5, speedAbs * 0.85 + 3.2));
  const launchVy = Math.min(6.4, 2.2 + speedAbs * 0.22);
  const damage = Math.round(32 + speedAbs * 5.2);
  const knockoutDuration = Math.min(4.6, 2.2 + speedAbs * 0.14);

  return {
    hit: true,
    impactSpeed: speedAbs,
    damage,
    launchVx: (pushX / pushMag) * launchSpeed,
    launchVy,
    launchVz: (pushZ / pushMag) * launchSpeed,
    knockoutDuration,
  };
}

// ============================================================================
// REALISTIC HUMAN LOCOMOTION PHYSICS & BIOMECHANICAL MULTI-JOINT GAIT SOLVER
// ============================================================================

export interface HumanLocomotionState {
  vx: number;
  vz: number;
  vy: number;
  heading: number;
  yawRate: number;
  speed: number;
  gaitPhase: number;
  leanPitch: number; // + forward lean while accelerating/sprinting, - lean back on sudden stop
  bankRoll: number; // lateral lean into turns
  landingCrouch: number; // 0..1 knee-absorption crouch after landing from jump
  crouchVel: number;
  grounded: boolean;
  sprintBlend: number; // 0 = walk, 1 = full sprint
  moveBlend: number; // 0 = idle, 1 = moving
  steppedFoot: 'left' | 'right' | null; // exact heel-strike trigger on the frame foot plants
  stepIntensity: number; // 0..1 impact weight for footstep SFX
  brakingScuff: boolean; // true on sudden hard stop/pivot from fast run
  scuffCooldown: number;
}

export interface HumanLocomotionInput {
  wishX: number; // normalized desired world X direction (or 0)
  wishZ: number; // normalized desired world Z direction (or 0)
  wantsSprint: boolean;
  grounded: boolean;
  justLandedSpeed: number; // downward impact speed (>0 on landing frame)
  dt: number;
}

export function createInitialHumanLocomotion(heading = 0): HumanLocomotionState {
  return {
    vx: 0,
    vz: 0,
    vy: 0,
    heading,
    yawRate: 0,
    speed: 0,
    gaitPhase: 0,
    leanPitch: 0,
    bankRoll: 0,
    landingCrouch: 0,
    crouchVel: 0,
    grounded: true,
    sprintBlend: 0,
    moveBlend: 0,
    steppedFoot: null,
    stepIntensity: 0,
    brakingScuff: false,
    scuffCooldown: 0,
  };
}

/**
 * Momentum-driven human ground/air locomotion physics with realistic acceleration curves,
 * turn-rate inertia banking, braking pitch-back, spring-damped landing knee absorption,
 * and exact gait-phase heel-strike detection for synced footstep SFX.
 */
export function stepHumanLocomotion(
  prev: HumanLocomotionState,
  input: HumanLocomotionInput,
): HumanLocomotionState {
  const dt = Math.min(Math.max(input.dt, 0.001), 0.05);
  const next: HumanLocomotionState = {
    ...prev,
    grounded: input.grounded,
    steppedFoot: null,
    stepIntensity: 0,
    brakingScuff: false,
    scuffCooldown: Math.max(0, (prev.scuffCooldown ?? 0) - dt),
  };

  const wishMag = Math.hypot(input.wishX, input.wishZ);
  const hasInput = wishMag > 0.05;
  const dirX = hasInput ? input.wishX / wishMag : 0;
  const dirZ = hasInput ? input.wishZ / wishMag : 0;

  const targetSpeed = hasInput ? (input.wantsSprint ? 9.6 : 5.2) : 0;
  const targetVx = dirX * targetSpeed;
  const targetVz = dirZ * targetSpeed;

  const prevSpeed = Math.hypot(next.vx, next.vz);
  const fwdX = Math.sin(next.heading);
  const fwdZ = Math.cos(next.heading);

  // Detect sharp counter-direction braking for authentic human weight-shift lean
  const alignDot = hasInput && prevSpeed > 0.5 ? (next.vx * dirX + next.vz * dirZ) / prevSpeed : 1;
  const isHardBraking = (!hasInput && prevSpeed > 2.2) || (hasInput && alignDot < -0.22 && prevSpeed > 2.4);

  // Organic human inertia: weighty first push-off, natural deceleration plant, limited air control
  const baseAccelRate = input.grounded
    ? hasInput
      ? isHardBraking
        ? 13.5
        : input.wantsSprint
          ? 7.2
          : 8.4
      : 9.2
    : 2.5;

  const kVel = 1 - Math.exp(-baseAccelRate * dt);
  const oldVx = next.vx;
  const oldVz = next.vz;
  next.vx += (targetVx - next.vx) * kVel;
  next.vz += (targetVz - next.vz) * kVel;

  const accelX = (next.vx - oldVx) / dt;
  const accelZ = (next.vz - oldVz) / dt;
  const forwardAccel = accelX * fwdX + accelZ * fwdZ;

  next.speed = Math.hypot(next.vx, next.vz);
  if (!hasInput && next.speed < 0.05) {
    next.vx = 0;
    next.vz = 0;
    next.speed = 0;
  }

  // Smooth human turning rate with authentic mass (slower carving arcs while sprinting)
  let yawRate = 0;
  if (hasInput) {
    const targetHeading = Math.atan2(dirX, dirZ);
    const diff = normalizeAngle(targetHeading - next.heading);
    const turnRate = input.grounded ? (input.wantsSprint ? 7.6 : 9.8) : 3.2;
    const step = diff * (1 - Math.exp(-turnRate * dt));
    next.heading = normalizeAngle(next.heading + step);
    yawRate = step / dt;
  }
  next.yawRate += (yawRate - next.yawRate) * (1 - Math.exp(-11 * dt));

  // Detect sharp sudden stop / reverse pivot from high speed for realistic sole-drag scuff SFX
  if (input.grounded && isHardBraking && prevSpeed > 5.8 && next.scuffCooldown <= 0) {
    next.brakingScuff = true;
    next.scuffCooldown = 0.45;
  }

  // Stride phase synced strictly to ground distance covered with authentic human BPM:
  // Walk (~5.2 m/s) -> ~2.05 steps/sec (natural rhythmic stride); Sprint (~9.6 m/s) -> ~3.25 steps/sec
  const prevPhase = next.gaitPhase;
  if (input.grounded && next.speed > 0.14) {
    const strideFreqScale = 1.26 - next.sprintBlend * 0.2;
    next.gaitPhase += next.speed * dt * strideFreqScale;

    // Detect exact Left Heel Strike (phase mod 2π crosses 0.48π) and Right Heel Strike (crosses 1.48π)
    const twoPi = Math.PI * 2;
    const p0 = ((prevPhase % twoPi) + twoPi) % twoPi;
    const p1 = p0 + (next.gaitPhase - prevPhase);
    const leftStrike = Math.PI * 0.48;
    const rightStrike = Math.PI * 1.48;

    const crossed = (mark: number) => (p0 < mark && p1 >= mark) || (p0 < mark + twoPi && p1 >= mark + twoPi);
    if (crossed(leftStrike)) {
      next.steppedFoot = 'left';
      next.stepIntensity = Math.min(1.12, 0.42 + (next.speed / 9.6) * 0.68);
    } else if (crossed(rightStrike)) {
      next.steppedFoot = 'right';
      next.stepIntensity = Math.min(1.12, 0.42 + (next.speed / 9.6) * 0.68);
    }
  } else if (input.grounded && next.speed <= 0.14) {
    // Smoothly settle phase toward neutral double-support so feet never freeze awkwardly mid-stride
    const twoPi = Math.PI * 2;
    const wrapped = ((next.gaitPhase % twoPi) + twoPi) % twoPi;
    const nearestNeutral = wrapped < Math.PI ? 0 : twoPi;
    next.gaitPhase += (nearestNeutral - wrapped) * (1 - Math.exp(-6.5 * dt));
  }

  // Smooth walk/sprint/idle blend factors
  const targetMoveBlend = Math.min(1, next.speed / 1.55);
  const targetSprintBlend = Math.max(0, Math.min(1, (next.speed - 4.8) / 4.2));
  next.moveBlend += (targetMoveBlend - next.moveBlend) * (1 - Math.exp(-9.0 * dt));
  next.sprintBlend += (targetSprintBlend - next.sprintBlend) * (1 - Math.exp(-6.8 * dt));

  // Body pitch lean (forward during accel/sprint, subtle upright weight-back on hard stop)
  const targetPitch = input.grounded
    ? Math.max(
        -0.13,
        Math.min(
          0.25,
          next.moveBlend * (0.045 + next.sprintBlend * 0.145) +
            Math.max(-0.12, Math.min(0.11, forwardAccel * 0.0085)) -
            (isHardBraking ? 0.085 : 0),
        ),
      )
    : -0.05;
  next.leanPitch += (targetPitch - next.leanPitch) * (1 - Math.exp(-8.0 * dt));

  // Turn banking (leaning naturally inward when carving turns at speed)
  const targetBank = input.grounded
    ? Math.max(-0.22, Math.min(0.22, -next.yawRate * Math.min(1, next.speed / 7.2) * 0.058))
    : 0;
  next.bankRoll += (targetBank - next.bankRoll) * (1 - Math.exp(-8.8 * dt));

  // Spring-damped landing knee-absorption crouch (authentic biomechanical impact cushion)
  if (input.justLandedSpeed > 2.2) {
    const impact = Math.min(1, (input.justLandedSpeed - 2.0) / 8.5);
    next.crouchVel += impact * 7.4;
  }
  const springK = 78;
  const dampC = 14.0;
  const crouchForce = -springK * next.landingCrouch - dampC * next.crouchVel;
  next.crouchVel += crouchForce * dt;
  next.landingCrouch = Math.max(0, Math.min(0.95, next.landingCrouch + next.crouchVel * dt));
  if (next.landingCrouch < 0.002 && Math.abs(next.crouchVel) < 0.01) {
    next.landingCrouch = 0;
    next.crouchVel = 0;
  }

  return next;
}

export interface HumanGaitPose {
  hipsOffsetX: number;
  hipsOffsetY: number;
  pelvisRollZ: number;
  pelvisYaw: number;
  spinePitchX: number;
  spineYaw: number;
  spineRollZ: number;
  headYaw: number;
  headPitch: number;
  leftHipX: number;
  rightHipX: number;
  leftHipZ: number;
  rightHipZ: number;
  leftKneeX: number;
  rightKneeX: number;
  leftAnkleX: number;
  rightAnkleX: number;
  leftShoulderX: number;
  rightShoulderX: number;
  leftShoulderY: number;
  rightShoulderY: number;
  leftShoulderZ: number;
  rightShoulderZ: number;
  leftElbowX: number;
  rightElbowX: number;
  hairFlowX: number;
  hairFlowZ: number;
}

/**
 * Solves organic, anatomically accurate multi-joint human biomechanics for relaxed idle,
 * walk, jog, sprint, airborne jump, landing crouch absorption, and alternating melee punches.
 *
 * Exact Three.js right-handed sign conventions (character faces +Z; left limbs at -X, right at +X):
 * - Hip X < 0 lifts thigh FORWARD (+Z); Hip X > 0 extends thigh BACKWARD (-Z)
 * - Knee X > 0 bends shin BACKWARD (anatomical knee flexion)
 * - Ankle X < 0 lifts toes UP (dorsiflexion on heel-strike); Ankle X > 0 points toes DOWN (toe-off)
 * - Shoulder X < 0 swings upper arm FORWARD (+Z); Shoulder X > 0 swings BACKWARD (-Z)
 * - Shoulder Z: leftArm (-X) < 0 moves OUTWARD; rightArm (+X) > 0 moves OUTWARD
 * - Elbow X < 0 bends forearm FORWARD/UP (anatomical elbow flexion)
 * - Pelvis/Spine Y: > 0 rotates left (-X) side FORWARD; < 0 rotates right (+X) side FORWARD
 */
export function solveHumanGaitPose(params: {
  loco: HumanLocomotionState;
  simTime: number;
  punchTimer: number;
  punchDuration: number;
  punchHand: 1 | -1; // 1 = right cross/hook, -1 = left jab
  steerInput?: number;
  feminineStyle?: boolean;
}): HumanGaitPose {
  const { loco, simTime, punchTimer, punchDuration, punchHand, steerInput = 0, feminineStyle = false } = params;
  const m = loco.moveBlend;
  const s = loco.sprintBlend;
  const idle = 1 - m;
  const phase = loco.gaitPhase;

  // Multi-harmonic idle breathing & relaxed NYC street weight-shift (contrapposto)
  const breath = Math.sin(simTime * 2.15) * 0.009 * (0.35 + idle * 0.65);
  const idleShift = Math.sin(simTime * 0.68) * idle;
  const crouchDrop = loco.landingCrouch * 0.16;

  // --- 1. ASYMMETRIC HUMAN LEG BIOMECHANICS (60/40 stance-swing harmonic, heel-strike -> push-off) ---
  const computeLeg = (p: number, isLeft: boolean) => {
    const sinP = Math.sin(p);
    const cosP = Math.cos(p);
    // Harmonic shaping gives brisk forward knee-drive swing and steady grounded push-back stance
    const shapedStride = sinP + 0.16 * Math.sin(2 * p - 0.55);

    const hipAmp = 0.52 + s * 0.44;
    // Slight natural relaxed idle asymmetry (one foot subtly forward, never frozen soldier stance)
    const idleHip = idle * (isLeft ? -0.045 + idleShift * 0.025 : 0.04 - idleShift * 0.025);
    const hipX = -shapedStride * hipAmp * m + idleHip - loco.landingCrouch * 0.58;

    // Subtle natural foot clearance (closer catwalk foot-tracking line for feminine stride!)
    const hipZ = feminineStyle
      ? (isLeft ? 0.014 : -0.014) * m + (isLeft ? -0.012 : 0.012) * idle
      : (isLeft ? -0.022 : 0.022) * (0.65 + idle * 0.45);

    // Real knee flexion curve:
    // - Mid-swing (cosP > 0): deep flexion to whip shin forward & clear pavement
    // - Heel strike (sinP ≈ +1, cosP ≈ 0): nearly straight (slight 0.10-0.18 impact cushion)
    // - Late stance / push-off (sinP < 0, cosP < 0): rolling knee bend into toe-off
    const swingKnee = Math.pow(Math.max(0, cosP), 1.15) * (0.76 + s * 0.66) * m;
    const impactCushion = Math.max(0, sinP) * (0.12 + s * 0.14) * m;
    const toeOffBend = Math.max(0, -sinP) * (0.24 + s * 0.42) * m;
    const idleKnee = idle * (0.055 + (isLeft ? Math.max(0, idleShift) * 0.05 : Math.max(0, -idleShift) * 0.05));
    const kneeX = Math.min(1.58, idleKnee + swingKnee + impactCushion + toeOffBend + loco.landingCrouch * 1.08);

    // Anatomically accurate ankle:
    // - Heel strike (sinP > 0): dorsiflexion (ankleX < 0, toes UP so heel lands first!)
    // - Toe-off (sinP < 0): plantarflexion (ankleX > 0, toes push DOWN off pavement!)
    // - Mid-swing (cosP > 0): slight dorsiflexion so sneaker toe doesn't scrape the ground
    const heelStrikeLift = -Math.max(0, sinP) * (0.24 + s * 0.08) * m;
    const toeOffPush = Math.max(0, -sinP) * (0.34 + s * 0.24) * m;
    const swingClear = -Math.max(0, cosP) * 0.1 * m;
    const ankleX = heelStrikeLift + toeOffPush + swingClear - loco.landingCrouch * 0.34;

    return { hipX, hipZ, kneeX, ankleX };
  };

  let leftLeg = computeLeg(phase, true);
  let rightLeg = computeLeg(phase + Math.PI, false);

  // Mid-air athletic stride-jump pose
  if (!loco.grounded) {
    const rising = loco.vy > 0.4;
    leftLeg = {
      hipX: rising ? -0.66 : -0.38,
      hipZ: -0.04,
      kneeX: rising ? 1.05 : 0.56,
      ankleX: 0.22,
    };
    rightLeg = {
      hipX: rising ? -0.18 : -0.56,
      hipZ: 0.04,
      kneeX: rising ? 0.48 : 0.86,
      ankleX: 0.18,
    };
  }

  // --- 2. CONTRALATERAL ARM BIOMECHANICS (Right arm drives forward with Left leg!) ---
  const sinPhase = Math.sin(phase);
  const cosPhase = Math.cos(phase);
  // Subtle lag (~0.18 rad) in arm swing relative to hips gives natural organic follow-through
  const armWave = Math.sin(phase - 0.18);
  const armAmp = 0.44 + s * 0.52;

  // When leftLeg steps forward (sinPhase > 0 -> leftHipX < 0):
  // - leftArm swings BACKWARD (leftShoulderX > 0)
  // - rightArm swings FORWARD (rightShoulderX < 0)
  let leftShoulderX = armWave * armAmp * m + Math.sin(simTime * 1.45) * 0.022 * idle;
  let rightShoulderX = -armWave * armAmp * m - Math.sin(simTime * 1.45) * 0.022 * idle;

  // Natural outward carry (leftShoulderZ < 0 moves -X arm away from torso; rightShoulderZ > 0 moves +X arm away!)
  let leftShoulderZ = -(0.072 + s * 0.045 + idle * 0.015);
  let rightShoulderZ = 0.072 + s * 0.045 + idle * 0.015;

  // Subtle inward forearm cross-drive during brisk running/sprinting (authentic runner form)
  let leftShoulderY = (0.06 + s * 0.18) * m;
  let rightShoulderY = -(0.06 + s * 0.18) * m;

  // Elbows bend naturally: relaxed -0.18 idle, pumping deeper on forward upswing and bent ~85° while sprinting
  const baseElbow = -(0.18 + m * 0.28 + s * 0.86);
  let leftElbowX = Math.max(-1.68, baseElbow - Math.max(0, -leftShoulderX) * (0.44 + s * 0.26));
  let rightElbowX = Math.max(-1.68, baseElbow - Math.max(0, -rightShoulderX) * (0.44 + s * 0.26));

  if (!loco.grounded) {
    leftShoulderX = -0.74;
    rightShoulderX = -0.46;
    leftShoulderZ = -0.24;
    rightShoulderZ = 0.24;
    leftShoulderY = 0.12;
    rightShoulderY = -0.12;
    leftElbowX = -0.92;
    rightElbowX = -0.82;
  }

  // --- 3. PELVIS & SPINE COUNTER-ROTATION + GROUNDED WEIGHT SHIFT ---
  // Vertical bipedal bob: HIGHEST at mid-stance (|cos(phase)| = 1), LOWEST at heel-strike double-support (|sin(phase)| = 1)!
  const strideDip = loco.grounded ? (Math.abs(cosPhase) - 0.62) * (0.044 + s * 0.052) * m : 0;
  const hipsOffsetY = breath + strideDip - crouchDrop;

  // Natural lateral weight transfer over the planted stance foot (confident feminine catwalk hip sway!)
  const hipSwayMult = feminineStyle ? 1.55 : 1.0;
  const stanceShift = loco.grounded
    ? cosPhase * (0.028 * hipSwayMult - s * 0.01) * m + idleShift * (feminineStyle ? 0.032 : 0.022)
    : 0;
  const hipsOffsetX = stanceShift;

  // Trendelenburg hip drop on the unloaded swing side + subtle contrapposto idle hip pose
  const pelvisRollZ = loco.grounded
    ? cosPhase * (0.044 * hipSwayMult + s * 0.022) * m + idleShift * (feminineStyle ? 0.056 : 0.036)
    : 0;

  // Pelvic yaw follows the advancing leg: leftLeg (-X) forward (sinPhase > 0) -> pelvisYaw > 0
  const pelvisYaw = loco.grounded ? sinPhase * ((feminineStyle ? 0.135 : 0.095) + s * 0.085) * m : 0;

  // Thoracic spine counter-rotates strongly to drive contralateral shoulders: rightArm (+X) forward -> spineYaw < 0
  let spineYaw = loco.grounded ? -sinPhase * ((feminineStyle ? 0.165 : 0.145) + s * 0.13) * m : 0;
  let spinePitchX = loco.leanPitch + loco.landingCrouch * 0.28 + Math.sin(simTime * 2.15) * 0.012 * idle;
  // Upper spine counter-balances pelvis tilt & banks smoothly into turns
  const spineRollZ = loco.bankRoll - pelvisRollZ * (feminineStyle ? 0.82 : 0.72);

  // --- 4. MELEE PUNCH COMBO OVERRIDE (Torso Torque -> Explosive Jab/Cross -> Guard Recovery) ---
  if (punchTimer > 0 && punchDuration > 0) {
    const t = 1 - Math.max(0, Math.min(1, punchTimer / punchDuration)); // 0 -> 1
    const strike = t < 0.34 ? Math.sin((t / 0.34) * (Math.PI * 0.5)) : Math.cos(((t - 0.34) / 0.66) * (Math.PI * 0.5));
    const windup = t < 0.18 ? Math.sin((t / 0.18) * Math.PI) * 0.36 : 0;

    // Right cross (+X arm forward -> negative spineYaw); Left jab (-X arm forward -> positive spineYaw)
    spineYaw = -punchHand * (strike * 0.56 - windup * 0.34);
    spinePitchX += strike * 0.16;

    if (punchHand === 1) {
      // Right cross / hook drive (+X arm)
      rightShoulderX = -1.48 * strike + 0.36 * windup;
      rightShoulderZ = -0.14 * strike + 0.08 * (1 - strike); // punches straight toward centerline
      rightShoulderY = -0.22 * strike;
      rightElbowX = -0.16 - (1 - strike) * 1.18;
      // Left hand tucked up in boxing guard (-X arm pulled inward with positive Z)
      leftShoulderX = -0.78 * strike;
      leftShoulderZ = 0.22 * strike - 0.07 * (1 - strike);
      leftShoulderY = 0.28 * strike;
      leftElbowX = -1.48;
    } else {
      // Left jab drive (-X arm)
      leftShoulderX = -1.46 * strike + 0.32 * windup;
      leftShoulderZ = 0.14 * strike - 0.08 * (1 - strike);
      leftShoulderY = 0.22 * strike;
      leftElbowX = -0.14 - (1 - strike) * 1.15;
      // Right hand tucked in boxing guard (+X arm pulled inward with negative Z)
      rightShoulderX = -0.76 * strike;
      rightShoulderZ = -0.22 * strike + 0.07 * (1 - strike);
      rightShoulderY = -0.28 * strike;
      rightElbowX = -1.48;
    }
  }

  // Head counter-stabilizes pelvis+spine rotation and naturally looks slightly into turns (anticipation!)
  const turnAnticipation = Math.max(-0.24, Math.min(0.24, loco.yawRate * 0.055 - steerInput * 0.1));
  const headYaw =
    m < 0.12
      ? Math.sin(simTime * 0.58) * 0.19 + Math.sin(simTime * 1.32) * 0.05
      : Math.max(-0.34, Math.min(0.34, -(pelvisYaw + spineYaw) * 0.78 + turnAnticipation));
  const headPitch = -spinePitchX * 0.48 + breath * 1.1;

  // Dynamic flowing hair bounce & trail (streams back when sprinting, bounces gently on each step & turn!)
  const hairBounce = loco.grounded ? Math.sin(phase * 2 - 0.55) * (0.075 + s * 0.09) * m : -loco.vy * 0.045;
  const hairFlowX = Math.max(-0.22, Math.min(0.68, 0.04 + m * 0.1 + s * 0.3 + hairBounce + Math.sin(simTime * 1.8) * 0.025 * idle));
  const hairFlowZ = Math.max(-0.34, Math.min(0.34, -loco.yawRate * 0.075 - sinPhase * (0.075 + s * 0.05) * m - idleShift * 0.045));

  return {
    hipsOffsetX,
    hipsOffsetY,
    pelvisRollZ,
    pelvisYaw,
    spinePitchX,
    spineYaw,
    spineRollZ,
    headYaw,
    headPitch,
    leftHipX: leftLeg.hipX,
    rightHipX: rightLeg.hipX,
    leftHipZ: leftLeg.hipZ,
    rightHipZ: rightLeg.hipZ,
    leftKneeX: leftLeg.kneeX,
    rightKneeX: rightLeg.kneeX,
    leftAnkleX: leftLeg.ankleX,
    rightAnkleX: rightLeg.ankleX,
    leftShoulderX,
    rightShoulderX,
    leftShoulderY,
    rightShoulderY,
    leftShoulderZ,
    rightShoulderZ,
    leftElbowX,
    rightElbowX,
    hairFlowX,
    hairFlowZ,
  };
}

