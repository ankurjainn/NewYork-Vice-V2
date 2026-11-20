export type GraphicsQualityPreset = 'low' | 'medium' | 'high';

export interface GraphicsQualitySpec {
  id: GraphicsQualityPreset;
  label: string;
  shortLabel: string;
  summary: string;
  maxPixelRatio: number;
  cameraFar: number;
  /** Scale applied to the 440m base sunset sky dome so it always fits safely inside cameraFar */
  skyDomeScale: number;
  playerShadowEnabled: boolean;
  shadowMapSize: 512 | 1024;
  fogDensityScale: number;
}

export const SKY_DOME_BASE_RADIUS = 440;
export const GRAPHICS_QUALITY_STORAGE_KEY = 'ny_vice_graphics_quality_v1';

export const GRAPHICS_QUALITY_ORDER: GraphicsQualityPreset[] = ['low', 'medium', 'high'];

export const GRAPHICS_QUALITY_SPECS: Record<GraphicsQualityPreset, GraphicsQualitySpec> = {
  low: {
    id: 'low',
    label: 'Low · Max FPS',
    shortLabel: 'Low',
    summary: '360m view · 1x scale · No shadows',
    maxPixelRatio: 1,
    cameraFar: 360,
    skyDomeScale: 0.72,
    playerShadowEnabled: false,
    shadowMapSize: 512,
    fogDensityScale: 1.28,
  },
  medium: {
    id: 'medium',
    label: 'Medium · Balanced',
    shortLabel: 'Medium',
    summary: '500m view · 1.5x scale · Player shadow',
    maxPixelRatio: 1.5,
    cameraFar: 500,
    skyDomeScale: 1.0,
    playerShadowEnabled: true,
    shadowMapSize: 512,
    fogDensityScale: 1.0,
  },
  high: {
    id: 'high',
    label: 'High · Crisp',
    shortLabel: 'High',
    summary: '680m view · 2x scale · HD player shadow',
    maxPixelRatio: 2,
    cameraFar: 680,
    skyDomeScale: 1.38,
    playerShadowEnabled: true,
    shadowMapSize: 1024,
    fogDensityScale: 0.82,
  },
};

export function parseGraphicsQualityPreset(raw: string | null | undefined): GraphicsQualityPreset {
  if (raw === 'low' || raw === 'medium' || raw === 'high') {
    return raw;
  }
  return 'medium';
}

export function getGraphicsQualitySpec(preset: GraphicsQualityPreset): GraphicsQualitySpec {
  return GRAPHICS_QUALITY_SPECS[preset] ?? GRAPHICS_QUALITY_SPECS.medium;
}

export function resolveEffectivePixelRatio(
  preset: GraphicsQualityPreset,
  devicePixelRatio: number,
  isSoftwareGl: boolean,
): number {
  if (isSoftwareGl) return 1;
  const spec = getGraphicsQualitySpec(preset);
  const safeDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(safeDpr, spec.maxPixelRatio);
}

export function loadSavedGraphicsQuality(): GraphicsQualityPreset {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return 'medium';
    return parseGraphicsQualityPreset(window.localStorage.getItem(GRAPHICS_QUALITY_STORAGE_KEY));
  } catch {
    return 'medium';
  }
}

export function saveGraphicsQuality(preset: GraphicsQualityPreset): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(GRAPHICS_QUALITY_STORAGE_KEY, preset);
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}
