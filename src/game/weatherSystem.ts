import type { WeatherKind } from './types';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export type WeatherVisualParams = WeatherVisualProfile;

export interface WeatherVisualProfile {
  kind: WeatherKind;
  label: string;
  skyTop: RgbColor;
  skyMid: RgbColor;
  skyHorizon: RgbColor;
  fogColor: RgbColor;
  fogDensity: number;
  sunColor: RgbColor;
  sunIntensity: number;
  sunGlow: number;
  sunGlowStrength: number;
  cloudTint: RgbColor;
  cloudOpacity: number;
  hemiSkyColor: RgbColor;
  hemiGroundColor: RgbColor;
  hemiIntensity: number;
  exposure: number;
  rainIntensity: number; // 0 = dry, 0.42 = drizzle, 1.0 = nor'easter downpour
  rainFallSpeed: number;
  roadRoughness: number; // wet asphalt becomes sleek & reflective
  roadMetalness: number;
  wetGripMultiplier: number; // 1.0 dry -> 0.72 heavy storm
  oceanWaveScale: number;
  lightningFlash: number; // 0..1 transient flash intensity
}

export interface WeatherSystemState {
  current: WeatherKind;
  target: WeatherKind;
  blend: number; // 0..1 transition from current -> target
  cycleTimer: number;
  cycleDuration: number;
  lightningFlash: number;
  lightningCooldown: number;
  autoCycle: boolean;
}

const WEATHER_ORDER: WeatherKind[] = ['clear_sunset', 'light_drizzle', 'heavy_monsoon'];

const WEATHER_DURATIONS: Record<WeatherKind, number> = {
  clear_sunset: 95,
  light_drizzle: 65,
  heavy_monsoon: 75,
};

const WEATHER_PROFILES: Record<WeatherKind, Omit<WeatherVisualProfile, 'kind' | 'lightningFlash'>> = {
  clear_sunset: {
    label: 'Golden Hudson Sunset',
    skyTop: { r: 0.16, g: 0.27, b: 0.5 },
    skyMid: { r: 0.74, g: 0.42, b: 0.3 },
    skyHorizon: { r: 0.99, g: 0.71, b: 0.39 },
    fogColor: { r: 0.87, g: 0.61, b: 0.44 },
    fogDensity: 0.00145,
    sunColor: { r: 1.0, g: 0.83, b: 0.62 },
    sunIntensity: 2.35,
    sunGlow: 1.0,
    sunGlowStrength: 1.0,
    cloudTint: { r: 1.0, g: 0.85, b: 0.68 },
    cloudOpacity: 0.28,
    hemiSkyColor: { r: 1.0, g: 0.82, b: 0.64 },
    hemiGroundColor: { r: 0.25, g: 0.22, b: 0.24 },
    hemiIntensity: 1.05,
    exposure: 1.15,
    rainIntensity: 0,
    rainFallSpeed: 20,
    roadRoughness: 0.86,
    roadMetalness: 0.05,
    wetGripMultiplier: 1.0,
    oceanWaveScale: 1.0,
  },
  light_drizzle: {
    label: 'NYC Drizzle',
    skyTop: { r: 0.16, g: 0.23, b: 0.33 },
    skyMid: { r: 0.39, g: 0.44, b: 0.51 },
    skyHorizon: { r: 0.61, g: 0.59, b: 0.58 },
    fogColor: { r: 0.51, g: 0.54, b: 0.59 },
    fogDensity: 0.00235,
    sunColor: { r: 0.85, g: 0.84, b: 0.83 },
    sunIntensity: 1.38,
    sunGlow: 0.32,
    sunGlowStrength: 0.32,
    cloudTint: { r: 0.64, g: 0.69, b: 0.75 },
    cloudOpacity: 0.62,
    hemiSkyColor: { r: 0.69, g: 0.75, b: 0.83 },
    hemiGroundColor: { r: 0.17, g: 0.19, b: 0.23 },
    hemiIntensity: 0.92,
    exposure: 1.04,
    rainIntensity: 0.42,
    rainFallSpeed: 28,
    roadRoughness: 0.45,
    roadMetalness: 0.24,
    wetGripMultiplier: 0.87,
    oceanWaveScale: 1.35,
  },
  heavy_monsoon: {
    label: "Atlantic Nor'easter",
    skyTop: { r: 0.07, g: 0.11, b: 0.19 },
    skyMid: { r: 0.17, g: 0.22, b: 0.3 },
    skyHorizon: { r: 0.3, g: 0.35, b: 0.42 },
    fogColor: { r: 0.25, g: 0.3, b: 0.37 },
    fogDensity: 0.0033,
    sunColor: { r: 0.62, g: 0.72, b: 0.86 },
    sunIntensity: 0.74,
    sunGlow: 0.05,
    sunGlowStrength: 0.05,
    cloudTint: { r: 0.28, g: 0.33, b: 0.41 },
    cloudOpacity: 0.88,
    hemiSkyColor: { r: 0.42, g: 0.52, b: 0.66 },
    hemiGroundColor: { r: 0.11, g: 0.14, b: 0.18 },
    hemiIntensity: 0.8,
    exposure: 0.94,
    rainIntensity: 1.0,
    rainFallSpeed: 40,
    roadRoughness: 0.19,
    roadMetalness: 0.42,
    wetGripMultiplier: 0.72,
    oceanWaveScale: 1.85,
  },
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

export function getWeatherLabel(kind: WeatherKind): string {
  return WEATHER_PROFILES[kind].label;
}

export function cycleWeatherKind(current: WeatherKind): WeatherKind {
  const idx = WEATHER_ORDER.indexOf(current);
  return WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
}

export function createInitialWeatherState(initial: WeatherKind = 'clear_sunset'): WeatherSystemState {
  return {
    current: initial,
    target: initial,
    blend: 1,
    cycleTimer: 0,
    cycleDuration: WEATHER_DURATIONS[initial],
    lightningFlash: 0,
    lightningCooldown: 7.5,
    autoCycle: true,
  };
}

export function setTargetWeather(
  state: WeatherSystemState,
  target: WeatherKind,
  instant = false,
): WeatherSystemState {
  if (instant) {
    return {
      ...state,
      current: target,
      target,
      blend: 1,
      cycleTimer: 0,
      cycleDuration: WEATHER_DURATIONS[target],
      lightningFlash: target === 'heavy_monsoon' ? 0.55 : 0,
      lightningCooldown: target === 'heavy_monsoon' ? 6.0 : 12.0,
    };
  }
  if (state.target === target) return state;
  return {
    ...state,
    current: state.blend >= 0.5 ? state.target : state.current,
    target,
    blend: 0,
    cycleTimer: 0,
    cycleDuration: WEATHER_DURATIONS[target],
  };
}

export interface WeatherStepResult {
  next: WeatherSystemState;
  thunderTriggered: boolean;
}

export function stepWeatherSystem(state: WeatherSystemState, dt: number): WeatherStepResult {
  const next: WeatherSystemState = { ...state };
  let thunderTriggered = false;

  if (next.blend < 1) {
    next.blend = Math.min(1, next.blend + dt / 7.5);
    if (next.blend >= 1) {
      next.current = next.target;
    }
  } else if (next.autoCycle) {
    next.cycleTimer += dt;
    if (next.cycleTimer >= next.cycleDuration) {
      const nextKind = cycleWeatherKind(next.target);
      next.current = next.target;
      next.target = nextKind;
      next.blend = 0;
      next.cycleTimer = 0;
      next.cycleDuration = WEATHER_DURATIONS[nextKind];
    }
  }

  if (next.lightningFlash > 0) {
    next.lightningFlash = Math.max(0, next.lightningFlash - dt * 3.2);
  }

  const heavyActive =
    next.target === 'heavy_monsoon' && (next.current === 'heavy_monsoon' || next.blend > 0.55);
  if (heavyActive) {
    next.lightningCooldown -= dt;
    if (next.lightningCooldown <= 0) {
      next.lightningFlash = 1.0;
      next.lightningCooldown = 11.5 + ((Math.floor(next.cycleTimer * 7) % 5) * 2.1);
      thunderTriggered = true;
    }
  } else {
    next.lightningCooldown = Math.max(next.lightningCooldown, 5.0);
  }

  return { next, thunderTriggered };
}

export function computeWeatherVisuals(state: WeatherSystemState): WeatherVisualProfile {
  const from = WEATHER_PROFILES[state.current];
  const to = WEATHER_PROFILES[state.target];
  const t = Math.max(0, Math.min(1, state.blend));
  const smooth = t * t * (3 - 2 * t);
  const flash = state.lightningFlash;

  const skyTop = lerpRgb(from.skyTop, to.skyTop, smooth);
  const skyMid = lerpRgb(from.skyMid, to.skyMid, smooth);
  const skyHorizon = lerpRgb(from.skyHorizon, to.skyHorizon, smooth);
  const fogColor = lerpRgb(from.fogColor, to.fogColor, smooth);

  const flashBoost = flash * 0.42;
  return {
    kind: state.target,
    label: to.label,
    skyTop: {
      r: Math.min(1, skyTop.r + flashBoost),
      g: Math.min(1, skyTop.g + flashBoost * 1.05),
      b: Math.min(1, skyTop.b + flashBoost * 1.25),
    },
    skyMid: {
      r: Math.min(1, skyMid.r + flashBoost * 0.8),
      g: Math.min(1, skyMid.g + flashBoost * 0.88),
      b: Math.min(1, skyMid.b + flashBoost * 1.05),
    },
    skyHorizon: {
      r: Math.min(1, skyHorizon.r + flashBoost * 0.6),
      g: Math.min(1, skyHorizon.g + flashBoost * 0.65),
      b: Math.min(1, skyHorizon.b + flashBoost * 0.8),
    },
    fogColor: {
      r: Math.min(1, fogColor.r + flashBoost * 0.45),
      g: Math.min(1, fogColor.g + flashBoost * 0.5),
      b: Math.min(1, fogColor.b + flashBoost * 0.65),
    },
    fogDensity: lerp(from.fogDensity, to.fogDensity, smooth),
    sunColor: lerpRgb(from.sunColor, to.sunColor, smooth),
    sunIntensity: lerp(from.sunIntensity, to.sunIntensity, smooth) + flash * 1.85,
    sunGlow: lerp(from.sunGlow, to.sunGlow, smooth),
    sunGlowStrength: lerp(from.sunGlowStrength, to.sunGlowStrength, smooth),
    cloudTint: lerpRgb(from.cloudTint, to.cloudTint, smooth),
    cloudOpacity: lerp(from.cloudOpacity, to.cloudOpacity, smooth),
    hemiSkyColor: lerpRgb(from.hemiSkyColor, to.hemiSkyColor, smooth),
    hemiGroundColor: lerpRgb(from.hemiGroundColor, to.hemiGroundColor, smooth),
    hemiIntensity: lerp(from.hemiIntensity, to.hemiIntensity, smooth) + flash * 0.65,
    exposure: lerp(from.exposure, to.exposure, smooth) + flash * 0.2,
    rainIntensity: lerp(from.rainIntensity, to.rainIntensity, smooth),
    rainFallSpeed: lerp(from.rainFallSpeed, to.rainFallSpeed, smooth),
    roadRoughness: lerp(from.roadRoughness, to.roadRoughness, smooth),
    roadMetalness: lerp(from.roadMetalness, to.roadMetalness, smooth),
    wetGripMultiplier: lerp(from.wetGripMultiplier, to.wetGripMultiplier, smooth),
    oceanWaveScale: lerp(from.oceanWaveScale, to.oceanWaveScale, smooth),
    lightningFlash: flash,
  };
}
