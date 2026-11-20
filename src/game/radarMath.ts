/**
 * Pure geometric utilities for the GTA-style heading-up floating rotating GPS radar.
 *
 * World coordinate convention (Three.js):
 * - Heading `h` has forward unit vector `(fx = sin(h), fz = cos(h))`.
 *   - `h = Math.PI` faces North (`-Z`)
 *   - `h = +Math.PI / 2` faces East (`+X`)
 *   - `h = 0` faces South (`+Z`)
 *   - `h = -Math.PI / 2` faces West (`-X`)
 * - Screen right unit vector when facing heading `h` is `(rx = -cos(h), rz = sin(h))`.
 */

export interface RadarPoint {
  x: number;
  y: number;
  rightDist: number;
  forwardDist: number;
}

export interface ClampedRadarWaypoint {
  x: number;
  y: number;
  angle: number;
  clamped: boolean;
}

/** Redraw rotating circular GPS radar at ~3 FPS (0.34s interval) for smooth frame pacing & zero CPU drag. */
export const MINIMAP_UPDATE_INTERVAL_SEC = 0.34;

export function shouldRedrawMinimap(elapsedSec: number, dirty: boolean): boolean {
  return dirty || elapsedSec >= MINIMAP_UPDATE_INTERVAL_SEC;
}

/**
 * Shortest signed angular difference `(target - current)` wrapped to `[-PI, PI]`.
 */
export function wrapSignedAngle(rad: number): number {
  let a = rad;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Smoothly steps the radar's heading angle toward `targetRad` along the shortest arc.
 */
export function stepSmoothedRadarHeading(
  currentRad: number,
  targetRad: number,
  dt: number,
  responsiveness = 9.5,
): number {
  const diff = wrapSignedAngle(targetRad - currentRad);
  const alpha = 1 - Math.exp(-Math.max(0.1, responsiveness) * Math.max(0, dt));
  return wrapSignedAngle(currentRad + diff * alpha);
}

/**
 * Canvas 2D rotation angle (radians, clockwise) applied around the radar center
 * so that world points along `headingRad` project straight UP (`-Y` on canvas)
 * and world points to the player's right project straight RIGHT (`+X` on canvas).
 */
export function getRadarRotationRad(headingRad: number): number {
  return wrapSignedAngle(headingRad - Math.PI);
}

/**
 * Projects a world `(wx, wz)` position into heading-up radar canvas coordinates.
 * Ahead of the player (`forwardDist > 0`) maps to `y < cy` (UP).
 * To the player's right (`rightDist > 0`) maps to `x > cx` (RIGHT).
 */
export function worldToRadarPoint(
  wx: number,
  wz: number,
  playerX: number,
  playerZ: number,
  headingRad: number,
  scale: number,
  cx: number,
  cy: number,
): RadarPoint {
  const dx = wx - playerX;
  const dz = wz - playerZ;
  const fx = Math.sin(headingRad);
  const fz = Math.cos(headingRad);
  const rx = -fz;
  const rz = fx;
  const forwardDist = dx * fx + dz * fz;
  const rightDist = dx * rx + dz * rz;
  return {
    x: cx + rightDist * scale,
    y: cy - forwardDist * scale,
    rightDist,
    forwardDist,
  };
}

/**
 * Computes the orbiting position of the cardinal North (`N`) compass badge
 * along a circular bezel of radius `ringRadius` centered at `(cx, cy)`.
 */
export function getNorthCompassPosition(
  headingRad: number,
  cx: number,
  cy: number,
  ringRadius: number,
): { x: number; y: number } {
  // World North unit vector is (0, -1); rotated by getRadarRotationRad(h) = h - PI:
  // x' = -sin(h), y' = cos(h)
  return {
    x: cx - Math.sin(headingRad) * ringRadius,
    y: cy + Math.cos(headingRad) * ringRadius,
  };
}

/**
 * Computes the screen-space rotation (radians, clockwise from UP) of the player
 * arrow inside a camera-oriented radar. Returns `0` when player faces camera forward.
 */
export function getPlayerArrowRelativeAngle(radarHeadingRad: number, playerHeadingRad: number): number {
  return wrapSignedAngle(radarHeadingRad - playerHeadingRad);
}

/**
 * Clamps a radar-space point `(rx, ry)` onto a circular perimeter of radius `edgeRadius`
 * around `(cx, cy)` when outside the radar disc, returning direction angle for an edge pointer.
 */
export function clampRadarEdgeWaypoint(
  rx: number,
  ry: number,
  cx: number,
  cy: number,
  edgeRadius: number,
): ClampedRadarWaypoint {
  const dx = rx - cx;
  const dy = ry - cy;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  if (dist <= edgeRadius || dist < 1e-6) {
    return { x: rx, y: ry, angle, clamped: false };
  }
  return {
    x: cx + (dx / dist) * edgeRadius,
    y: cy + (dy / dist) * edgeRadius,
    angle,
    clamped: true,
  };
}

/**
 * Fixed scale (px per world meter) for the North-up circular minimap & static basemap cache.
 */
export const NORTH_UP_RADAR_SCALE = 0.45;

/**
 * Projects a world `(wx, wz)` position onto a fixed North-up circular radar centered at `(cx, cy)`.
 * World North (`-Z`) is always UP (`-Y`), and World East (`+X`) is always RIGHT (`+X`).
 */
export function worldToNorthUpRadarPoint(
  wx: number,
  wz: number,
  playerX: number,
  playerZ: number,
  scale: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  return {
    x: cx + (wx - playerX) * scale,
    y: cy + (wz - playerZ) * scale,
  };
}

/**
 * Computes the screen-space clockwise rotation (radians from UP `-Y`) of the player chevron
 * inside a fixed North-up circular radar.
 * - Facing North (`h = PI`) -> `0` (UP)
 * - Facing East (`h = +PI/2`) -> `+PI/2` (RIGHT)
 * - Facing South (`h = 0`) -> `PI` (DOWN)
 * - Facing West (`h = -PI/2`) -> `-PI/2` (LEFT)
 */
export function getNorthUpPlayerArrowAngle(playerHeadingRad: number): number {
  return wrapSignedAngle(Math.PI - playerHeadingRad);
}

/**
 * Speed-adaptive radar zoom: closer street detail on foot, smoothly zooming out
 * at high vehicle speed so upcoming turns and intersections stay visible ahead.
 */
export function computeDynamicRadarScale(speedKmh: number, inVehicle: boolean): number {
  if (!inVehicle) {
    return 0.48;
  }
  const t = Math.max(0, Math.min(1, (Math.abs(speedKmh) - 18) / 115));
  return 0.44 - t * 0.11; // 0.44 cruising -> 0.33 highway sprint
}
