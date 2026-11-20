import type { GraphicsQualityPreset } from './graphicsQuality';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type GameOverReason = 'wasted' | 'busted' | 'victory';

export type CameraMode = 'chase' | 'cinematic' | 'hood';

export type WeatherKind = 'clear_sunset' | 'light_drizzle' | 'heavy_monsoon';

export type VehicleType =
  | 'taxi'
  | 'auto'
  | 'bus'
  | 'sports'
  | 'hypercar'
  | 'muscle'
  | 'suv_lux'
  | 'police'
  | 'syndicate_van'
  | 'ferry'
  | 'speedboat';

export type DistrictId =
  | 'Battery Park'
  | 'Wall Street'
  | 'Washington Square'
  | 'Battery Ferry Pier'
  | 'Hudson Harbor'
  | 'Union Square'
  | 'SoHo Lofts'
  | 'Financial District'
  | 'Lower East Side'
  | 'Midtown West'
  | 'Brooklyn Bridge'
  | 'Chinatown'
  | 'Chelsea Piers'
  | 'Williamsburg'
  | 'Coney Island'
  | 'Midtown East'
  | 'Bronx Stadium'
  | 'Harlem Rucker'
  | 'Flushing Meadows';

export type BuildingStyle =
  | 'heritage'
  | 'modern'
  | 'plaza'
  | 'midrise'
  | 'slum'
  | 'bazaar'
  | 'industrial';

export type BuildingArchVariant =
  | 'artdeco_spire'
  | 'glass_supertall'
  | 'brownstone'
  | 'tenement_fireescape'
  | 'cast_iron_loft'
  | 'times_square_neon'
  | 'flatiron_wedge'
  | 'prewar_limestone'
  | 'dumbo_warehouse';

export interface BuildingCollider {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  style: BuildingStyle;
  archVariant: BuildingArchVariant;
  colorHex: number;
  accentHex: number;
  district: DistrictId;
  hasRoofBillboard?: boolean;
  billboardText?: string;
}

export type ShopCategory =
  | 'deli'
  | 'pizza'
  | 'cafe'
  | 'sneakers'
  | 'garage'
  | 'watches'
  | 'electronics'
  | 'pharmacy'
  | 'vinyl'
  | 'bakery';

export type ShopPerk = 'heal_full' | 'nitro_repair' | 'drop_wanted' | 'stamina_cash';

export interface BuildingShopDef {
  id: string;
  buildingId: string;
  shopName: string;
  subtitle: string;
  category: ShopCategory;
  district: DistrictId;
  /** World coordinates where the shopfront faces the road */
  x: number;
  z: number;
  /** Facing angle in radians (toward adjacent avenue) */
  facing: number;
  width: number;
  awningHex: number;
  signBgHex: string;
  signTextHex: string;
  shopkeeperName: string;
  shirtHex: number;
  itemLabel: string;
  price: number;
  perk: ShopPerk;
  pitchLines: string[];
}

export type StallKind =
  | 'hotdog'
  | 'halal'
  | 'pretzel'
  | 'coffee_bagel'
  | 'flowers'
  | 'pizza_slice';

export interface StreetStallDef {
  id: string;
  name: string;
  vendorName: string;
  kind: StallKind;
  x: number;
  z: number;
  facing: number;
  awningHex: number;
  healsPlayer: boolean;
  isParkVendor?: boolean;
  price?: number;
  itemLabel?: string;
  lines: string[];
}

export interface LandmarkDef {
  id: string;
  name: string;
  district: DistrictId;
  x: number;
  z: number;
  color: string;
}

export type MissionStepType =
  | 'reach'
  | 'board_vehicle'
  | 'deliver'
  | 'lose_wanted'
  | 'intercept_convoy'
  | 'survive_heat'
  | 'talk_npc'
  | 'perform_task'
  | 'collect_items'
  | 'confront_target'
  | 'park_sport_score'
  | 'shop_buy'
  | 'change_outfit';

export interface MissionCollectPoint {
  x: number;
  z: number;
  label?: string;
}

export interface MissionStepDef {
  id: string;
  type: MissionStepType;
  label: string;
  targetX?: number;
  targetZ?: number;
  radius?: number;
  requiredVehicle?: VehicleType;
  targetCount?: number;
  radioCallout?: string;
  npcName?: string;
  npcDialogue?: string;
  npcShirtHex?: number;
  taskActionLabel?: string;
  taskPropKind?: 'generator' | 'terminal' | 'crate';
  collectPoints?: MissionCollectPoint[];
  sportVenueId?: string;
  targetScore?: number;
}

export interface MissionDef {
  id: string;
  title: string;
  contact: string;
  district: DistrictId;
  difficulty: 'Street' | 'High Stakes' | 'Syndicate';
  emotionTag: string;
  isInteractive?: boolean;
  reward: number;
  timeLimitSec: number;
  briefing: string;
  startX: number;
  startZ: number;
  spawnRivals?: number;
  spawnConvoyCount?: number;
  initialWantedHeat?: number;
  recommendedWeather?: WeatherKind;
  steps: MissionStepDef[];
}

export interface ActiveMissionState {
  missionId: string;
  stepIndex: number;
  timeRemaining: number;
  stepTimer: number;
  convoyDisabled: number;
  stepProgress: number;
  collectedIndices: number[];
  completedIds: string[];
}

export interface WantedState {
  heat: number;
  stars: number;
  evadeTimer: number;
  bustedProgress: number;
}

export interface InteractionPrompt {
  key: string;
  label: string;
  kind: 'vehicle' | 'npc' | 'mission' | 'sport' | 'subway' | 'event';
  secondaryKey?: string;
  secondaryLabel?: string;
}

export interface DialogueToast {
  speaker: string;
  text: string;
  accent: 'amber' | 'teal' | 'red';
  id: number;
}

export type ParkSportKind = 'cricket' | 'streetball';

export type ParkSportMode = 'npc_match' | 'joined' | 'spectating';

export interface ActiveParkSportHud {
  venueId: string;
  venueName: string;
  sport: ParkSportKind;
  mode: ParkSportMode;
  teamAName: string;
  teamBName: string;
  scoreRuns: number;
  wickets: number;
  ballsBowled: number;
  maxBalls: number;
  /** 0..1 normalized progress of the current pitch/shot timing bar */
  timingValue: number;
  /** True while player can press Space / Click to swing or shoot */
  canSwing: boolean;
  lastOutcome: string;
  commentary: string;
  potentialPrize: number;
}

export interface EndRunSummary {
  reason: GameOverReason;
  cash: number;
  missionsCompleted: number;
  totalMissions: number;
  timePlayedSec: number;
  distanceKm: number;
  topSpeedKmh: number;
  wantedPeak: number;
}

export type EndRunSnapshot = EndRunSummary;

export interface HudSnapshot {
  gameState: GameState;
  hp: number;
  maxHp: number;
  hpRegenerating: boolean;
  damageFlash: number;
  stamina: number;
  boost: number;
  cash: number;
  wantedStars: number;
  wantedCooldownRatio: number;
  district: DistrictId;
  weatherMode: WeatherKind;
  weatherLabel: string;
  weatherRainIntensity: number;
  playerOutfitId: string;
  playerOutfitLabel: string;
  customModel: {
    id: string;
    name: string;
    facingFlip: boolean;
    isRigged: boolean;
    boneCount: number;
    animationMode: 'clips' | 'procedural_rig' | 'static_preview';
    slots: Record<'idle' | 'walk' | 'run' | 'jump' | 'punch', string | null>;
    clipNames: string[];
    extraAnimCount: number;
  } | null;
  savedCustomModels: Array<{
    id: string;
    name: string;
    facingFlip: boolean;
    extraAnimCount: number;
  }>;
  inVehicle: boolean;
  vehicleLabel: string;
  vehicleType: VehicleType | null;
  vehicleHp: number;
  vehicleMaxHp: number;
  speedKmh: number;
  isDrifting: boolean;
  isBoosting: boolean;
  cameraMode: CameraMode;
  graphicsQuality: GraphicsQualityPreset;
  muted: boolean;
  radioStationId: 'vice_nights' | 'midtown_drift' | 'hudson_electro' | 'off';
  radioStationLabel: string;
  radioStationShortLabel: string;
  radioAccentHex: string;
  radioPlaying: boolean;
  activeNpcCount: number;
  activeMission: {
    id: string;
    title: string;
    emotionTag: string;
    stepLabel: string;
    stepIndex: number;
    totalSteps: number;
    timeRemaining: number;
    distanceMeters: number;
    progressText?: string;
  } | null;
  completedMissionIds: string[];
  activeParkSport: ActiveParkSportHud | null;
  activeStreetEvent: {
    id: string;
    kind: 'purse_snatcher' | 'street_race' | 'armored_van';
    title: string;
    subtitle: string;
    phase: 'available' | 'active' | 'resolved';
    reward: number;
    timeRemaining: number;
    distanceMeters: number;
    progressText?: string;
    acceptPrompt?: string;
  } | null;
  nearbySubwayStationId: string | null;
  subwayRidingLabel: string | null;
  subwayStations: Array<{
    id: string;
    name: string;
    borough: 'Manhattan' | 'Brooklyn' | 'Queens';
    lineBadge: string;
    lineColor: string;
    nextTrainEtaSec: number;
    trainDocked: boolean;
  }>;
  prompt: InteractionPrompt | null;
  toast: DialogueToast | null;
  lowHpPulse: boolean;
  playerX: number;
  playerZ: number;
  endRun: EndRunSummary | null;
}

export type NpcArchetype =
  | 'commuter'
  | 'vendor'
  | 'informant'
  | 'shopkeeper'
  | 'police_officer'
  | 'cricketer'
  | 'baller'
  | 'mission_contact'
  | 'purse_snatcher'
  | 'rival_rusher'
  | 'rival_flanker';

export interface NpcSpec {
  id: string;
  name: string;
  archetype: NpcArchetype;
  x: number;
  z: number;
  shirtHex: number;
  pantsHex: number;
  skinHex: number;
  dialogue: string[];
  healsChai?: boolean;
}
