import type { WeatherKind } from './types';

export type BodyBuild = 'slim' | 'curvy' | 'athletic' | 'average' | 'broad';

export type HairStyleId =
  | 'pompadour'
  | 'short_fade'
  | 'slick_back'
  | 'wavy_bob'
  | 'long_glam_waves'
  | 'braided_bun'
  | 'long_bun'
  | 'curly_crop'
  | 'parted_classic';

export type OutfitSilhouette =
  | 'bodycon_dress'
  | 'jeans_top'
  | 'bikini_set'
  | 'vice_open_shirt'
  | 'street_bomber'
  | 'biker_jacket'
  | 'linen_resort'
  | 'office_blazer'
  | 'saree_drape'
  | 'kurta_pajama'
  | 'trench_dress'
  | 'dabbawala_vest'
  | 'artisan_apron'
  | 'hoodie_joggers'
  | 'monsoon_parka'
  | 'police_uniform';

export interface BodyBuildMetrics {
  heightScale: number;
  shoulderScale: number;
  bellyScale: number;
  hipScale: number;
  limbRadiusScale: number;
}

export const BODY_BUILD_METRICS: Record<BodyBuild, BodyBuildMetrics> = {
  slim: { heightScale: 0.96, shoulderScale: 0.9, bellyScale: 0.88, hipScale: 1.04, limbRadiusScale: 0.92 },
  curvy: { heightScale: 0.97, shoulderScale: 0.88, bellyScale: 0.78, hipScale: 1.14, limbRadiusScale: 0.89 },
  athletic: { heightScale: 1.04, shoulderScale: 1.09, bellyScale: 0.93, hipScale: 0.97, limbRadiusScale: 1.02 },
  average: { heightScale: 1.0, shoulderScale: 1.0, bellyScale: 1.04, hipScale: 1.0, limbRadiusScale: 1.0 },
  broad: { heightScale: 1.06, shoulderScale: 1.15, bellyScale: 1.12, hipScale: 1.05, limbRadiusScale: 1.09 },
};

export interface CharacterAppearanceSpec {
  id: string;
  label: string;
  build: BodyBuild;
  silhouette: OutfitSilhouette;
  hairStyle: HairStyleId;
  hairHex: number;
  skinHex: number;
  shirtHex: number;
  innerShirtHex?: number;
  pantsHex: number;
  shoeHex: number;
  accentHex: number;
  hasGoldChain?: boolean;
  hasSunglasses?: boolean;
  hasFacialHair?: boolean;
  hasGandhiCap?: boolean;
  hasGajra?: boolean;
  hasPoliceCap?: boolean;
  hasBaton?: boolean;
  shortSleeves?: boolean;
  isFemale?: boolean;
  umbrellaHex?: number;
  raincoatHex?: number;
}

export interface PlayerOutfitSpec extends CharacterAppearanceSpec {
  description: string;
}

/**
 * Pool of 10 unique curved NYC pedestrian models with distinct silhouettes,
 * hairstyles, clothing, and rain-weather gear (umbrellas / rain ponchos).
 */
export const NPC_CHARACTER_POOL: CharacterAppearanceSpec[] = [
  {
    id: 'wallst_banker',
    label: 'Wall Street Banker',
    build: 'average',
    silhouette: 'office_blazer',
    hairStyle: 'slick_back',
    hairHex: 0x261d17,
    skinHex: 0xe6bc98,
    shirtHex: 0x1e293b,
    innerShirtHex: 0xf8fafc,
    pantsHex: 0x0f172a,
    shoeHex: 0x1c1411,
    accentHex: 0xdc2626,
    umbrellaHex: 0x1e293b,
  },
  {
    id: 'soho_designer',
    label: 'SoHo Stylist',
    build: 'slim',
    silhouette: 'trench_dress',
    hairStyle: 'wavy_bob',
    hairHex: 0x3b2416,
    skinHex: 0xd8a37e,
    shirtHex: 0xbe185d,
    innerShirtHex: 0xfef3c7,
    pantsHex: 0x18181b,
    shoeHex: 0x1f1916,
    accentHex: 0xfbbf24,
    hasSunglasses: true,
    umbrellaHex: 0xf43f5e,
  },
  {
    id: 'brooklyn_skater',
    label: 'Williamsburg Skater',
    build: 'athletic',
    silhouette: 'street_bomber',
    hairStyle: 'short_fade',
    hairHex: 0x241913,
    skinHex: 0xc2865e,
    shirtHex: 0x2563eb,
    innerShirtHex: 0xfef3c7,
    pantsHex: 0x1f2937,
    shoeHex: 0xf8fafc,
    accentHex: 0xf97316,
    raincoatHex: 0xfacc15,
  },
  {
    id: 'harlem_musician',
    label: 'Harlem Jazz Artist',
    build: 'athletic',
    silhouette: 'biker_jacket',
    hairStyle: 'curly_crop',
    hairHex: 0x14100d,
    skinHex: 0x7a4b32,
    shirtHex: 0x7c2d12,
    innerShirtHex: 0xfde68a,
    pantsHex: 0x292524,
    shoeHex: 0xfef3c7,
    accentHex: 0xf59e0b,
    hasSunglasses: true,
    hasFacialHair: true,
    umbrellaHex: 0xd97706,
  },
  {
    id: 'midtown_barista',
    label: 'Midtown Barista',
    build: 'slim',
    silhouette: 'artisan_apron',
    hairStyle: 'long_bun',
    hairHex: 0x4a2c18,
    skinHex: 0xebb995,
    shirtHex: 0x166534,
    innerShirtHex: 0xfef3c7,
    pantsHex: 0x334155,
    shoeHex: 0x292524,
    accentHex: 0x22c55e,
    raincoatHex: 0x14b8a6,
  },
  {
    id: 'central_park_jogger',
    label: 'Central Park Runner',
    build: 'athletic',
    silhouette: 'hoodie_joggers',
    hairStyle: 'braided_bun',
    hairHex: 0x1b1512,
    skinHex: 0xa66f4c,
    shirtHex: 0x0ea5e9,
    innerShirtHex: 0xf8fafc,
    pantsHex: 0x0f172a,
    shoeHex: 0xec4899,
    accentHex: 0x38bdf8,
    shortSleeves: true,
    raincoatHex: 0x0284c7,
  },
  {
    id: 'queens_commuter',
    label: 'Queens Subway Commuter',
    build: 'average',
    silhouette: 'trench_dress',
    hairStyle: 'parted_classic',
    hairHex: 0x1c1714,
    skinHex: 0xc98f66,
    shirtHex: 0xb48a5a,
    innerShirtHex: 0x1e293b,
    pantsHex: 0x374151,
    shoeHex: 0x261d17,
    accentHex: 0xf59e0b,
    umbrellaHex: 0x0284c7,
  },
  {
    id: 'times_sq_tourist',
    label: 'Times Square Visitor',
    build: 'broad',
    silhouette: 'vice_open_shirt',
    hairStyle: 'parted_classic',
    hairHex: 0x6b4423,
    skinHex: 0xf0c7a5,
    shirtHex: 0xef4444,
    innerShirtHex: 0xfef08a,
    pantsHex: 0x78716c,
    shoeHex: 0xf8fafc,
    accentHex: 0xfacc15,
    hasSunglasses: true,
    shortSleeves: true,
    raincoatHex: 0x38bdf8,
  },
  {
    id: 'les_artist',
    label: 'LES Gallery Artist',
    build: 'slim',
    silhouette: 'biker_jacket',
    hairStyle: 'pompadour',
    hairHex: 0x2b1d15,
    skinHex: 0xdfad87,
    shirtHex: 0x18181b,
    innerShirtHex: 0xa855f7,
    pantsHex: 0x27272a,
    shoeHex: 0x111111,
    accentHex: 0xc084fc,
    hasSunglasses: true,
    umbrellaHex: 0x9333ea,
  },
  {
    id: 'bronx_builder',
    label: 'Bronx Ironworker',
    build: 'broad',
    silhouette: 'dabbawala_vest',
    hairStyle: 'short_fade',
    hairHex: 0x1c1714,
    skinHex: 0x9c6443,
    shirtHex: 0xea580c,
    innerShirtHex: 0xfef08a,
    pantsHex: 0x1e3a5f,
    shoeHex: 0x451a03,
    accentHex: 0xfacc15,
    hasFacialHair: true,
    raincoatHex: 0xeab308,
  },
];

/**
 * Dedicated NYPD Beat Officer model (navy uniform, peaked cap, silver/gold shield, nightstick).
 */
export const NYPD_OFFICER_SPEC: CharacterAppearanceSpec = {
  id: 'nypd_officer',
  label: 'NYPD Officer',
  build: 'broad',
  silhouette: 'police_uniform',
  hairStyle: 'short_fade',
  hairHex: 0x0f172a,
  skinHex: 0xd4a37f,
  shirtHex: 0x172554,
  innerShirtHex: 0xe2e8f0,
  pantsHex: 0x0f172a,
  shoeHex: 0x0a0a0a,
  accentHex: 0x38bdf8,
  hasPoliceCap: true,
  raincoatHex: 0xfacc15,
};

export const MUMBAI_POLICE_OFFICER_SPEC = NYPD_OFFICER_SPEC;

/**
 * 2 signature GTA-6-inspired New York Vice outfits for protagonist Camila (press [O] to toggle!):
 * Red Dress (crimson satin mini dress) & Jeans Top (fitted denim jeans & coral-white cropped top).
 */
export const PLAYER_OUTFITS: PlayerOutfitSpec[] = [
  {
    id: 'crimson_vice_dress',
    label: 'Red Dress',
    description: 'Curve-hugging crimson red satin mini dress, gold hoops & stiletto heels',
    isFemale: true,
    build: 'curvy',
    silhouette: 'bodycon_dress',
    hairStyle: 'long_glam_waves',
    hairHex: 0x21120b,
    skinHex: 0xb8744a,
    shirtHex: 0xb9122b,
    innerShirtHex: 0xf5c542,
    pantsHex: 0xb9122b,
    shoeHex: 0x991124,
    accentHex: 0xf5c542,
    hasGoldChain: true,
    hasSunglasses: false,
    umbrellaHex: 0xb9122b,
  },
  {
    id: 'nyc_jeans_top',
    label: 'Jeans Top',
    description: 'High-waisted fitted blue denim jeans, coral-white cropped top & gold hoops',
    isFemale: true,
    build: 'curvy',
    silhouette: 'jeans_top',
    hairStyle: 'long_glam_waves',
    hairHex: 0x21120b,
    skinHex: 0xb8744a,
    shirtHex: 0xff6b57,
    innerShirtHex: 0xfff7ed,
    pantsHex: 0x2c5c94,
    shoeHex: 0x1c1411,
    accentHex: 0xf5c542,
    hasGoldChain: true,
    hasSunglasses: true,
    umbrellaHex: 0x2c5c94,
  },
];

export interface WeatherClothingState {
  showUmbrella: boolean;
  showRaincoat: boolean;
  showSunglasses: boolean;
  fabricRoughness: number;
  fabricMetalness: number;
}

export function getWeatherClothingState(
  weather: WeatherKind,
  rainIntensity: number,
  spec: CharacterAppearanceSpec,
): WeatherClothingState {
  const isRaining = weather === 'heavy_monsoon' || (weather === 'light_drizzle' && rainIntensity >= 0.25);
  const showUmbrella = Boolean(isRaining && spec.umbrellaHex);
  const showRaincoat = Boolean(weather === 'heavy_monsoon' && spec.raincoatHex && !showUmbrella);
  const showSunglasses = Boolean(spec.hasSunglasses && weather === 'clear_sunset');
  return {
    showUmbrella,
    showRaincoat,
    showSunglasses,
    fabricRoughness: isRaining ? 0.42 : 0.76,
    fabricMetalness: isRaining ? 0.14 : 0.04,
  };
}

export function selectNpcCharacterModel(index: number): CharacterAppearanceSpec {
  const safeIdx = ((index % NPC_CHARACTER_POOL.length) + NPC_CHARACTER_POOL.length) % NPC_CHARACTER_POOL.length;
  return NPC_CHARACTER_POOL[safeIdx];
}

export function cyclePlayerOutfitIndex(currentIndex: number): number {
  return (currentIndex + 1) % PLAYER_OUTFITS.length;
}
