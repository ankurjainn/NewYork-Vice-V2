import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MumbaiAudioEngine, type FootstepSurface } from './audio';
import { resolveFootstepSurfaceAt } from './footstepFoley';
import {
  getGraphicsQualitySpec,
  loadSavedGraphicsQuality,
  resolveEffectivePixelRatio,
  saveGraphicsQuality,
  type GraphicsQualityPreset,
} from './graphicsQuality';
import {
  NORTH_UP_RADAR_SCALE,
  clampRadarEdgeWaypoint,
  getNorthUpPlayerArrowAngle,
  shouldRedrawMinimap,
  worldToNorthUpRadarPoint,
} from './radarMath';
import {
  NPC_CHARACTER_POOL,
  NYPD_OFFICER_SPEC,
  PLAYER_OUTFITS,
  cyclePlayerOutfitIndex,
} from './characterModels';
import {
  AREA_HOARDINGS,
  BUILDING_SHOPS,
  CITY_BUILDINGS,
  FLYOVERS,
  INTERSECTIONS,
  LANDMARKS,
  LIBERTY_ISLAND,
  PIER_ZONES,
  PLAYER_SPAWN,
  RECREATION_ZONES,
  ROAD_COORDS,
  ROAD_HALF,
  ROAD_WIDTH,
  SEA_BUOYS,
  STREET_GANTRIES,
  findNearestDisembarkPoint,
  getDistrictAt,
  sampleWorldElevation,
  selectRespawnPoint,
} from './cityLayout';
import { MISSIONS, createActiveMission, evaluateMissionTick, getMissionById } from './missions';
import {
  CustomGlbCharacterController,
  deleteStoredGlbCharacter,
  getActiveStoredGlbId,
  listStoredGlbCharacters,
  resolveGlbCharacterDisplayName,
  saveStoredGlbCharacter,
  setActiveStoredGlbId,
  type CharacterAnimSlot,
  type StoredGlbCharacterRecord,
} from './glbCharacter';
import { NYC_PEDESTRIAN_NAMES, evaluateNpcReaction, getContextualTalkLine } from './npcDialogue';
import {
  createCricketBatMesh,
  createInstancedCrowdRig,
  createLibertyIsland,
  createNycCartStall,
  createParkCricketPitchProps,
  createParkSportBallMesh,
  createVariedNycBuilding,
  createWashingtonSquareArch,
  type InstancedCrowdRig,
} from './nycArchitecture';
import {
  buildLayeredNycStreetTrees,
  getNycSidewalkTexture,
  type BirdSpecies,
} from './nycEnvironment';
import {
  PARK_SPORT_VENUES,
  buildParkSportHud,
  createInitialParkMatchState,
  exitPlayerParkMatch,
  startPlayerJoinMatch,
  startPlayerSpectateMatch,
  stepParkMatch,
  triggerPlayerSportAction,
  type ParkMatchState,
  type ParkSportVenueDef,
} from './parkSports';
import {
  ASPHALT_TEX_URL,
  createArabianSeaMesh,
  createAreaHoardingSign,
  createBuildingShopfront,
  createCharacterRig,
  createContactShadowTexture,
  createFlyoverMesh,
  createHarborFerry,
  createIntersectionCrosswalkMesh,
  createNoiseBumpTexture,
  createOverheadGantrySign,
  createRainSystem,
  createRecreationZoneMesh,
  createRoadMarkingTexture,
  createSeaBuoyMesh,
  createSeagullRig,
  createSunsetSkyDome,
  createTrafficSignalRig,
  createVehicleRig,
  createWoodenPierMesh,
  updateSharedTrafficSignalMaterials,
  type CharacterRig,
  type DynamicSkyRig,
  type RainSystemRig,
  type SeagullRig,
  type TrafficSignalRig,
  type VehicleRig,
} from './proceduralModels';
import { createWashingtonSquarePlazaMesh } from './recreationVisuals';
import {
  COLLISION_GRACE_SEC,
  VEHICLE_SPECS,
  addWantedHeat,
  computeCrashDamage,
  computeNpcDesiredVelocity,
  createInitialHumanLocomotion,
  evaluateMeleeHit,
  evaluateTrafficBehavior,
  evaluateVehicleNpcImpact,
  getNycLaneCoord,
  getTrafficSignalState,
  isPointOnRoadway,
  resolveCircleBuildingCollisions,
  resolveVehiclePairCollision,
  resolveWatercraftBounds,
  shouldPoliceDeployOfficer,
  snapPointToSidewalk,
  solveHumanGaitPose,
  steerPedestrianForSidewalk,
  stepCameraYaw,
  stepHealthRegen,
  stepHumanLocomotion,
  stepSmoothSteer,
  stepVehiclePhysics,
  stepWantedSystem,
  type HumanLocomotionState,
  type TrafficAxis,
  type VehiclePhysicsState,
  type WantedState,
} from './simulation';
import type {
  ActiveMissionState,
  BuildingShopDef,
  CameraMode,
  DialogueToast,
  EndRunSummary,
  GameOverReason,
  GameState,
  HudSnapshot,
  InteractionPrompt,
  MissionStepDef,
  NpcArchetype,
  StreetStallDef,
  VehicleType,
} from './types';
import {
  STREET_EVENT_COOLDOWN_MAX,
  STREET_EVENT_COOLDOWN_MIN,
  buildStreetEventHud,
  createStreetEvent,
  evaluateStreetEventTick,
  type ActiveStreetEvent,
  type StreetEventKind,
} from './streetEvents';
import {
  SUBWAY_DECK_Y,
  SUBWAY_EAST_X,
  SUBWAY_FARE_USD,
  SUBWAY_NORTH_Z,
  SUBWAY_SOUTH_Z,
  SUBWAY_STATIONS,
  SUBWAY_WEST_X,
  createInitialSubwayTrains,
  findNearestSubwayStation,
  getSubwayStationsHud,
  sampleSubwayLoopPose,
  stepSubwayTrain,
  type SubwayStationDef,
  type SubwayTrainState,
} from './subwaySystem';
import {
  computeWeatherVisuals,
  createInitialWeatherState,
  cycleWeatherKind,
  getWeatherLabel,
  setTargetWeather,
  stepWeatherSystem,
  type WeatherSystemState,
  type WeatherVisualParams,
} from './weatherSystem';

interface SimVehicle {
  id: string;
  type: VehicleType;
  rig: VehicleRig;
  phys: VehiclePhysicsState;
  hp: number;
  maxHp: number;
  isTraffic: boolean;
  isPolice: boolean;
  isConvoy: boolean;
  isStreetEventRacer?: boolean;
  isStreetEventVan?: boolean;
  disabled: boolean;
  axis: TrafficAxis;
  dir: 1 | -1;
  roadCoord: number;
  cruiseSpeed: number;
  turnCooldown: number;
  honkCooldown: number;
  hitFlash: number;
  prevSpeed: number;
  suspPitch: number;
  suspRoll: number;
  isBraking: boolean;
  officerDeployed: boolean;
  deployCooldown: number;
}

interface SimNpc {
  id: string;
  modelId: string;
  name: string;
  archetype: NpcArchetype;
  rig: CharacterRig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number;
  patrolHeading: number;
  patrolTimer: number;
  isStanding: boolean;
  standTimer: number;
  strafeSign: number;
  gaitPhase: number;
  hp: number;
  knockoutTimer: number; // >0 while toppling out
  windupTimer: number;
  attackCooldown: number;
  hitFlash: number;
  dialogue: string[];
  dialogueIndex: number;
  healsChai?: boolean;
  shopDef?: BuildingShopDef;
  reactionCooldown: number;
  deployedFromVehicleId?: string;
}

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface SimCrowdAgent {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number;
  baseSpeed: number;
  gaitPhase: number;
  heightScale: number;
  turnTimer: number;
  pauseTimer: number;
  isStanding: boolean;
  fleeing: boolean;
  canCrosswalk: boolean;
  hp: number;
  knockoutTimer: number;
  fallAngle: number;
  hitFlash: number;
  hurtCooldown: number;
  districtName: string;
}

interface ParkVenueRuntime {
  def: ParkSportVenueDef;
  state: ParkMatchState;
  ballMesh: THREE.Mesh;
  markerRing: THREE.Mesh | null;
  players: Array<{
    npc: SimNpc;
    role: 'bowler' | 'batter' | 'keeper' | 'fielder';
    homeX: number;
    homeZ: number;
    batMesh?: THREE.Group;
  }>;
  swingAnimTimer: number;
}

interface SimSeagull {
  rig: SeagullRig;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  altitude: number;
  angularSpeed: number;
  angle: number;
  flapSpeed: number;
  flapPhase: number;
}

const VENDOR_LOCATIONS: StreetStallDef[] = [
  // Washington Square & Greenwich Village (right near spawn!)
  {
    id: 'stall_wash_hotdog',
    name: "Tony's Sabrett Hot Dogs",
    vendorName: 'Tony (Hot Dog Cart)',
    kind: 'hotdog',
    x: -10.5,
    z: -32,
    facing: Math.PI / 2,
    awningHex: 0x1d4ed8,
    healsPlayer: true,
    lines: [
      'Classic NYC dirty-water dog with spicy brown mustard! Full health restored, boss!',
      'Manhattan GT Coupe spotted parked down near Battery Park. Fast ride if you want heat!',
      'Press [M] anytime for NYC Dispatch contracts — Washington Square pays clean dollars.',
    ],
  },
  {
    id: 'stall_wash_halal',
    name: '53rd & 6th Halal Cart',
    vendorName: 'Samir (Halal Platter Cart)',
    kind: 'halal',
    x: 10.5,
    z: -34,
    facing: -Math.PI / 2,
    awningHex: 0xea580c,
    healsPlayer: true,
    lines: [
      'Chicken & lamb over yellow rice with extra white sauce! Full energy restored!',
      'Walk south two blocks to Central Park Great Lawn — pickup cricket is live right now!',
    ],
  },
  // CENTRAL PARK GREAT LAWN PARK VENDORS (right beside the live pickup cricket pitch!)
  {
    id: 'stall_cp_hotdog',
    name: 'Central Park Hot Dogs',
    vendorName: 'Sal (Park Hot Dog Cart)',
    kind: 'hotdog',
    x: 13.5,
    z: 70,
    facing: Math.PI * 0.25,
    awningHex: 0x2563eb,
    healsPlayer: true,
    isParkVendor: true,
    lines: [
      'Park-side hot dogs & ice-cold lemonade right by Central Park Great Lawn! Full HP!',
      'Press [F] on the grass pitch behind me to bat in the Manhattan XI pickup cricket match, or [V] to spectate!',
    ],
  },
  {
    id: 'stall_cp_pretzel',
    name: 'Great Lawn Soft Pretzels',
    vendorName: 'Elena (Park Pretzel Cart)',
    kind: 'pretzel',
    x: 42.5,
    z: 98,
    facing: -Math.PI * 0.75,
    awningHex: 0xd97706,
    healsPlayer: true,
    isParkVendor: true,
    lines: [
      'Hot salted NYC soft pretzels fresh for the cricket crowd! Health back to 100%!',
      'Step up to the crease and smash a SIX over the Central Park maples for bonus cash!',
    ],
  },
  {
    id: 'stall_cp_coffee',
    name: 'Parkside Coffee & Bagels',
    vendorName: 'Marco (Park Bagel Cart)',
    kind: 'coffee_bagel',
    x: 13.5,
    z: 98,
    facing: Math.PI * 0.75,
    awningHex: 0x0f766e,
    healsPlayer: true,
    isParkVendor: true,
    lines: [
      'Everything bagel with scallion cream cheese & hot drip coffee! Full HP & stamina!',
      'Grab a front-row view of the Great Lawn pickup cricket match with [V] anytime!',
    ],
  },
  // FLUSHING MEADOWS PARK VENDORS (beside Queens pickup cricket pitch!)
  {
    id: 'stall_flushing_halal',
    name: 'Queens Cricket Halal Cart',
    vendorName: 'Tariq (Park Halal Cart)',
    kind: 'halal',
    x: 405,
    z: 238,
    facing: Math.PI * 0.25,
    awningHex: 0x16a34a,
    healsPlayer: true,
    isParkVendor: true,
    lines: [
      'Spicy lamb gyro & mango lassi right by Flushing Meadows Cricket Pitch! Full HP!',
      'Queens Strikers need a clean hitter — press [F] to join the over or [V] to spectate!',
    ],
  },
  {
    id: 'stall_flushing_hotdog',
    name: 'Flushing Park Hot Dogs',
    vendorName: 'Eddie (Park Hot Dog Cart)',
    kind: 'hotdog',
    x: 435,
    z: 266,
    facing: -Math.PI * 0.75,
    awningHex: 0x1d4ed8,
    healsPlayer: true,
    isParkVendor: true,
    lines: [
      'Two franks & a toasted pretzel for the Queens cricket tournament! HP 100%!',
      'Hit sixes over the Flushing Meadows boundary cones to pocket big prize money!',
    ],
  },
  // HARLEM RUCKER PARK VENDORS (courtside!)
  {
    id: 'stall_rucker_halal',
    name: 'Rucker Courtside Halal',
    vendorName: 'Malik (Courtside Cart)',
    kind: 'halal',
    x: 237,
    z: 126,
    facing: Math.PI * 0.25,
    awningHex: 0x0284c7,
    healsPlayer: true,
    isParkVendor: true,
    lines: [
      'Harlem Legend combo platter — full HP for the Rucker Park 3-point shootout!',
      'Step onto the asphalt and press [F] to join streetball, or [V] to watch courtside!',
    ],
  },
  {
    id: 'stall_rucker_pretzel',
    name: 'Uptown Pretzel & Ices',
    vendorName: 'Tasha (Park Cart)',
    kind: 'pretzel',
    x: 267,
    z: 154,
    facing: -Math.PI * 0.75,
    awningHex: 0xe11d48,
    healsPlayer: true,
    isParkVendor: true,
    lines: [
      'Cherry Italian ice & warm salted pretzel right outside Rucker Park! Full HP!',
      'Nothing beats golden-hour hoops in Harlem — drain 3s for cash!',
    ],
  },
  // WEST 4TH ST CAGE & PLAYGROUND PARK VENDORS
  {
    id: 'stall_west4_pizza',
    name: 'Cage Corner Dollar Slice',
    vendorName: 'Gino (Park Pizza Cart)',
    kind: 'pizza_slice',
    x: 13.5,
    z: 406,
    facing: Math.PI * 0.25,
    awningHex: 0xdc2626,
    healsPlayer: true,
    isParkVendor: true,
    lines: [
      'Two hot cheese slices right beside West 4th St Cage! Health topped off!',
      'Press [F] on the court to jump into the Village Cage shootout or [V] to spectate!',
    ],
  },
  {
    id: 'stall_washpg_pretzel',
    name: 'Village Playground Cart',
    vendorName: 'Rosa (Park Cart)',
    kind: 'pretzel',
    x: 14,
    z: -14,
    facing: Math.PI * 0.75,
    awningHex: 0xf59e0b,
    healsPlayer: true,
    isParkVendor: true,
    lines: [
      'Warm cinnamon pretzels & hot cider right by Washington Square Playground! Full HP!',
      'Walk north under the marble Arch or head south to Central Park cricket!',
    ],
  },
  {
    id: 'stall_astoria_coffee',
    name: 'Astoria Park Bagel Cart',
    vendorName: 'Niko (Park Cart)',
    kind: 'coffee_bagel',
    x: 350,
    z: 350,
    facing: Math.PI * 0.25,
    awningHex: 0x0d9488,
    healsPlayer: true,
    isParkVendor: true,
    lines: [
      'Fresh Greek pastries & iced coffee at Astoria Playground! Full HP!',
      'Flushing Meadows pickup cricket is just two avenues northeast!',
    ],
  },
  // CITYWIDE NYC STREET CARTS & INFORMANTS
  {
    id: 'stall_wallst_informant',
    name: 'Wall St Street Informant',
    vendorName: 'Louie (Street Fixer)',
    kind: 'coffee_bagel',
    x: 45,
    z: 24,
    facing: -Math.PI / 2,
    awningHex: 0x0f766e,
    healsPlayer: false,
    lines: [
      'Syndicate Armored Vans are running hot near Wall Street. Ram them hard to stop them!',
      'Take a $350 insider tip — keep your eyes on the NYC GPS minimap!',
      'NYC Pedicab Trikes turn tighter than any sedan through SoHo traffic.',
    ],
  },
  {
    id: 'stall_battery_hotdog',
    name: 'Battery Park Hot Dogs',
    vendorName: 'Frankie (Battery Cart)',
    kind: 'hotdog',
    x: -44.5,
    z: 14,
    facing: Math.PI / 2,
    awningHex: 0x1d4ed8,
    healsPlayer: true,
    lines: [
      'Mustard & sauerkraut frank right by Battery Park! Health restored to 100%!',
      'Watch out for NYPD patrol SUVs — break line-of-sight to drop Wanted stars.',
    ],
  },
  {
    id: 'stall_hudson_coffee',
    name: 'Hudson Promenade Bagels',
    vendorName: 'Maya (Waterfront Cart)',
    kind: 'coffee_bagel',
    x: -64.5,
    z: -34,
    facing: Math.PI / 2,
    awningHex: 0x059669,
    healsPlayer: true,
    lines: [
      'Toasted sesame bagel & hot espresso overlooking Hudson Harbor! Full HP!',
      'Walk onto Battery Ferry Pier or Pier 25 to board the Staten Island Orange Ferry!',
    ],
  },
  {
    id: 'stall_pier25_pretzel',
    name: 'Pier 25 Boardwalk Pretzels',
    vendorName: 'Danny (Pier Cart)',
    kind: 'pretzel',
    x: -88,
    z: 14.5,
    facing: 0,
    awningHex: 0xe11d48,
    healsPlayer: true,
    lines: [
      'Fresh Hudson Pier 25 pretzels! Coast Guard boats are moored right at the pier tip!',
      'Sail northwest past the harbor buoys to reach Liberty Island & the Statue of Liberty!',
    ],
  },
  {
    id: 'stall_arch_informant',
    name: 'Village Arch Tipster',
    vendorName: 'Victor (Arch Informant)',
    kind: 'coffee_bagel',
    x: 10.5,
    z: -74,
    facing: -Math.PI / 2,
    awningHex: 0x2563eb,
    healsPlayer: false,
    lines: [
      'Washington Square Arch glows at golden hour. Hold [Shift] in a car for Nitro Boost!',
      'Tap [Space] while cornering at speed for a clean Manhattan handbrake drift.',
    ],
  },
  {
    id: 'stall_soho_flowers',
    name: 'SoHo Corner Florist',
    vendorName: 'Claire (Flower Stand)',
    kind: 'flowers',
    x: 102,
    z: 42,
    facing: Math.PI / 2,
    awningHex: 0xec4899,
    healsPlayer: true,
    lines: [
      'Fresh tulips & bodega coffee in SoHo! Health topped up to full!',
      'Hit the Brooklyn Bridge Express Viaduct to fly over the east avenues!',
    ],
  },
  {
    id: 'stall_bkbridge_pizza',
    name: 'Brooklyn Bridge Slice Cart',
    vendorName: 'Nino (Pizza Cart)',
    kind: 'pizza_slice',
    x: 158,
    z: 22,
    facing: Math.PI / 2,
    awningHex: 0xdc2626,
    healsPlayer: true,
    lines: [
      'Crispy Brooklyn-style pepperoni slice right off the hot stone! Full HP!',
      'Head east past the brownstones for Bronx Ballpark & Arena!',
    ],
  },
  {
    id: 'stall_times_halal',
    name: 'Times Square Halal Guys',
    vendorName: 'Omar (Midtown Cart)',
    kind: 'halal',
    x: 45,
    z: 215,
    facing: Math.PI / 2,
    awningHex: 0xf59e0b,
    healsPlayer: true,
    lines: [
      'Famous Times Square gyro platter with hot red sauce! Health 100%!',
      'Look up at the Broadway LED billboards glowing above Midtown!',
    ],
  },
  {
    id: 'stall_battery_pier_capt',
    name: 'Capt. Reilly (Ferry Slip)',
    vendorName: 'Captain Reilly (Harbor Master)',
    kind: 'coffee_bagel',
    x: -72,
    z: -82,
    facing: Math.PI / 2,
    awningHex: 0x0284c7,
    healsPlayer: true,
    lines: [
      'Ahoy! Hot harbor chowder & coffee — our Staten Island Ferry & Coast Guard Boat are moored at the pier tip!',
      'Press [E] near either vessel to take the helm and cruise out to the Statue of Liberty!',
    ],
  },
  {
    id: 'stall_chinatown_noodle',
    name: 'Canal St Dumpling Cart',
    vendorName: 'Mei (Chinatown Cart)',
    kind: 'halal',
    x: 177,
    z: 215,
    facing: -Math.PI / 2,
    awningHex: 0xb91c1c,
    healsPlayer: true,
    lines: [
      'Steaming pork dumplings & scallion pancakes on Canal Street! Full HP!',
      'Chinatown tenements and glowing signs stretch all the way to Williamsburg!',
    ],
  },
  {
    id: 'stall_chelsea_pretzel',
    name: 'Chelsea Piers Espresso',
    vendorName: 'Chloe (Chelsea Cart)',
    kind: 'coffee_bagel',
    x: -64.5,
    z: 246,
    facing: Math.PI / 2,
    awningHex: 0x0d9488,
    healsPlayer: true,
    lines: [
      'Hudson River breeze + double oat latte at Chelsea Piers — full HP!',
      'Chelsea Piers Marina has a fast Coast Guard boat moored just north!',
    ],
  },
  {
    id: 'stall_williamsburg_coffee',
    name: 'Williamsburg Roasters Cart',
    vendorName: 'Leo (Brooklyn Cart)',
    kind: 'coffee_bagel',
    x: 158,
    z: 326,
    facing: Math.PI / 2,
    awningHex: 0x9333ea,
    healsPlayer: true,
    lines: [
      'Welcome to Williamsburg! Single-origin cold brew & warm brioche — full HP!',
      'Grab the Manhattan GT parked nearby and rocket up the Williamsburg Skyway!',
    ],
  },
];

// Scratch objects outside tick loop (zero GC!)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _dummy = new THREE.Object3D();

export class MumbaiWorldEngine {
  private container: HTMLElement;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private onHudUpdate: (snap: HudSnapshot) => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private skyDome!: DynamicSkyRig;
  private rainSystem!: RainSystemRig;
  private roadMatNS!: THREE.MeshStandardMaterial;
  private roadMatEW!: THREE.MeshStandardMaterial;
  private seaMesh!: THREE.Mesh;
  private seaWaveUpdate: ((simTime: number, waveScale?: number) => void) | null = null;
  private isSoftwareGl = false;
  private weatherState: WeatherSystemState = createInitialWeatherState('clear_sunset');
  private weatherVisuals: WeatherVisualParams = computeWeatherVisuals(this.weatherState);
  private lastWeatherGearBucket = '';

  private audio = new MumbaiAudioEngine();
  private shadowTex!: THREE.Texture;

  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private simTime = 0;
  private hudThrottleAcc = 0;
  private hitstopTimer = 0;
  private cameraTrauma = 0;
  private respawnAttempt = 0;
  private lastHonkTime = -99;
  private lastShoveTime = -99;
  private npcChatterCooldown = 3.0;

  // Game state
  private gameState: GameState = 'title';
  private timePlayedSec = 0;
  private distanceMetersTotal = 0;
  private topSpeedKmh = 0;
  private wantedPeak = 0;
  private endRun: EndRunSummary | null = null;

  // Player on-foot state
  private playerRig!: CharacterRig;
  private customGlbPlayer!: CustomGlbCharacterController;
  private savedGlbRecords: StoredGlbCharacterRecord[] = [];
  private activeCustomGlbId: string | null = null;
  private playerBatMesh: THREE.Group | null = null;
  private playerOutfitIndex = 0;
  private playerX: number = PLAYER_SPAWN.x;
  private playerY = 0;
  private playerZ: number = PLAYER_SPAWN.z;
  private playerVx = 0;
  private playerVz = 0;
  private playerVy = 0;
  private playerHeading: number = PLAYER_SPAWN.heading;
  private playerGait = 0;
  private playerFootstepAcc = 0;
  private playerGrounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private squashX = 1;
  private squashY = 1;
  private playerHp = 100;
  private readonly playerMaxHp = 100;
  private damageGraceTimer = 0;
  private timeSinceDamage = 99;
  private hpRegenerating = false;
  private damageFlash = 0;
  private regenParticleAcc = 0;
  private playerStamina = 100;
  private vehicleBoost = 100;
  private cash = 1200;
  private attackCooldown = 0;
  private shoveAnimTimer = 0;
  private punchDuration = 0.3;
  private punchComboHand: 1 | -1 = 1;
  private playerLoco: HumanLocomotionState = createInitialHumanLocomotion(PLAYER_SPAWN.heading);

  // Vehicle driving state
  private activeVehicle: SimVehicle | null = null;
  private vehicles: SimVehicle[] = [];
  private npcs: SimNpc[] = [];
  // Sidewalk-Dense NYC Crowd System (380 instanced pedestrians in 7 draw calls with full melee/car hit physics!)
  private crowdRig: InstancedCrowdRig | null = null;
  private crowdAgents: SimCrowdAgent[] = [];
  // Live interactive Park Sports venues (Cricket in Central Park & Flushing, Streetball in Harlem & West 4th!)
  private parkVenues: ParkVenueRuntime[] = [];
  private activeParkVenueId: string | null = null;
  private signals: Array<{ rig: TrafficSignalRig; phaseOffset: number }> = [];
  private buildingMeshes: THREE.Object3D[] = [];
  private seagulls: SimSeagull[] = [];
  private harborFerry: THREE.Group | null = null;
  private harborFerryZ = 110;
  private lighthouseBeam: THREE.Object3D | null = null;
  private seaBuoys: Array<{ mesh: THREE.Group; baseX: number; baseZ: number; phase: number }> = [];
  private rooftopFans: THREE.Object3D[] = [];
  private buntingLines: Array<{ group: THREE.Group; phase: number; baseZ: number }> = [];

  // Mission & Wanted
  private wanted: WantedState = { heat: 0, stars: 0, evadeTimer: 0, bustedProgress: 0 };
  private wantedCooldownRatio = 0;
  private activeMission: ActiveMissionState | null = null;
  private completedMissionIds: string[] = [];
  private convoyDisabledCount = 0;
  private missionBeaconGroup!: THREE.Group;
  private missionBeaconRing!: THREE.Mesh;
  private missionBeaconBeam!: THREE.Mesh;
  private missionBeaconDiamond!: THREE.Mesh;
  private missionStepPropGroup: THREE.Group | null = null;
  private missionCollectMeshes: Array<{ index: number; mesh: THREE.Group; x: number; z: number; label: string }> = [];
  private missionContactNpcId: string | null = null;
  private syncedMissionStepKey = '';
  private pendingMissionEvents = {
    talked: false,
    taskDone: false,
    confronted: false,
    boughtShop: false,
    changedOutfit: false,
    parkRunsDelta: 0,
  };

  // Toast / Dialogue
  private toast: DialogueToast | null = null;
  private toastTimer = 0;
  private toastSeq = 1;

  // Camera, fixed North-up circular radar cache & smoothed steering
  private cameraMode: CameraMode = 'chase';
  private cameraYaw: number = PLAYER_SPAWN.heading;
  private minimapStaticCanvas: HTMLCanvasElement | null = null;
  private minimapRimGrad: CanvasGradient | null = null;
  private minimapThrottleAcc = 0;
  private minimapDirty = true;
  private minimapDrawCount = 0;
  private smoothSteer = 0;
  private camPos = new THREE.Vector3(-4, 7, -12);
  private camLook = new THREE.Vector3(0, 2, -60);
  private titleOrbitAngle = 0;

  // Input hub
  private keys = new Set<string>();
  private justPressed = new Set<string>();
  private pointerLocked = false;
  private mouseYawOffset = 0;

  // Pooled particle ring buffer (140 particles, zero GC)
  private readonly maxParticles = 140;
  private particles: ParticleSlot[] = [];
  private particleMesh!: THREE.InstancedMesh;
  private particleCursor = 0;

  // Bound listeners for clean disposal
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleBlur: () => void;
  private handleVisibility: () => void;
  private handleResize: () => void;
  private handleMouseMove: (e: MouseEvent) => void;
  private handleCanvasClick: () => void;
  private handleContextLost: (e: Event) => void;

  // Elevated NYC Subway (2 live articulated 4-car MTA trains + 6 Manhattan/Brooklyn/Queens stations)
  private subwayTrains: SubwayTrainState[] = createInitialSubwayTrains();
  private subwayTrainCars: Array<{ trainId: string; cars: THREE.Group[] }> = [];
  private subwayRide: {
    fromStation: SubwayStationDef;
    toStation: SubwayStationDef;
    progress: number;
    duration: number;
    startMs: number;
  } | null = null;
  private onOpenSubway: (stationId: string) => void;

  // Smarter Random Street Events (Purse Snatcher, Red-Light Street Race, Armored Cash Van)
  private activeStreetEvent: ActiveStreetEvent | null = null;
  private streetEventCooldown = 14;
  private streetEventSeed = 1;
  private streetEventNpcId: string | null = null;
  private streetEventVehicleId: string | null = null;
  private streetEventFinishGroup: THREE.Group | null = null;
  private pendingStreetEvent = {
    acceptedRace: false,
    thiefStopped: false,
    vanHitsDelta: 0,
    vanDisabled: false,
  };

  private shouldIgnoreEscape: () => boolean;
  private graphicsQuality: GraphicsQualityPreset;

  constructor(
    container: HTMLElement,
    onHudUpdate: (snap: HudSnapshot) => void,
    shouldIgnoreEscape: () => boolean = () => false,
    onOpenSubway: (stationId: string) => void = () => {},
    initialQuality: GraphicsQualityPreset = loadSavedGraphicsQuality(),
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.shouldIgnoreEscape = shouldIgnoreEscape;
    this.onOpenSubway = onOpenSubway;
    this.graphicsQuality = initialQuality;

    this.handleKeyDown = (e) => this.onKeyDown(e);
    this.handleKeyUp = (e) => this.onKeyUp(e);
    this.handleBlur = () => this.clearInputs();
    this.handleVisibility = () => {
      if (document.hidden) this.clearInputs();
    };
    this.handleResize = () => this.resize();
    this.handleMouseMove = (e) => {
      if (this.pointerLocked && this.gameState === 'playing') {
        this.mouseYawOffset -= e.movementX * 0.0024;
      }
    };
    this.handleCanvasClick = () => {
      if (this.gameState !== 'playing') return;
      if (this.activeParkVenueId) {
        this.triggerParkSportSwingOrShoot();
      } else if (!this.activeVehicle && !this.subwayRide) {
        this.triggerHonkOrAction();
      }
    };
    this.handleContextLost = (e) => {
      e.preventDefault();
    };

    this.initRendererAndScene();
    this.buildMumbaiWorld();
    this.buildElevatedSubway();
    this.initParticles();
    this.initPlayerAndEntities();
    this.buildParkSportsVenues();
    this.buildInstancedCrowd();
    this.bindEvents();
    this.resize();
    this.updateTitleCamera(0);
    this.skyDome.mesh.position.set(this.camera.position.x, 0, this.camera.position.z);
    this.renderer.render(this.scene, this.camera);
    this.pushHudSnapshot(true);

    // Expose safe runtime handle for automated verification
    (window as unknown as { __nyViceEngine?: MumbaiWorldEngine }).__nyViceEngine = this;

    this.lastTimeMs = performance.now();
    this.scheduleNextFrame();
  }

  public setMinimapCanvas(canvas: HTMLCanvasElement | null): void {
    this.minimapCanvas = canvas;
    this.minimapRimGrad = null;
    this.minimapDirty = true;
    if (canvas && this.gameState === 'playing') {
      this.drawMinimap();
      this.minimapDirty = false;
      this.minimapThrottleAcc = 0;
    }
  }

  public getGraphicsQuality(): GraphicsQualityPreset {
    return this.graphicsQuality;
  }

  public setGraphicsQuality(preset: GraphicsQualityPreset): void {
    if (this.graphicsQuality === preset) return;
    this.graphicsQuality = preset;
    saveGraphicsQuality(preset);
    this.applyGraphicsQuality();
    this.pushHudSnapshot(true);
  }

  private applyGraphicsQuality(): void {
    if (!this.renderer || !this.camera || !this.skyDome || !this.sunLight) return;
    const spec = getGraphicsQualitySpec(this.graphicsQuality);
    const effectiveDpr = resolveEffectivePixelRatio(
      this.graphicsQuality,
      window.devicePixelRatio || 1,
      this.isSoftwareGl,
    );
    this.renderer.setPixelRatio(effectiveDpr);

    if (this.camera.far !== spec.cameraFar) {
      this.camera.far = spec.cameraFar;
      this.camera.updateProjectionMatrix();
    }
    this.skyDome.mesh.scale.setScalar(spec.skyDomeScale);

    const shadowsOn = !this.isSoftwareGl && spec.playerShadowEnabled;
    if (this.renderer.shadowMap.enabled !== shadowsOn) {
      this.renderer.shadowMap.enabled = shadowsOn;
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (
      this.sunLight.shadow.mapSize.width !== spec.shadowMapSize ||
      this.sunLight.shadow.mapSize.height !== spec.shadowMapSize
    ) {
      this.sunLight.shadow.mapSize.set(spec.shadowMapSize, spec.shadowMapSize);
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.sunLight.castShadow = shadowsOn && !this.activeVehicle && !this.subwayRide;

    if (this.scene?.fog instanceof THREE.FogExp2 && this.weatherVisuals) {
      this.scene.fog.density = this.weatherVisuals.fogDensity * spec.fogDensityScale;
    }
  }

  private detectSoftwareWebGL(): boolean {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initRendererAndScene(): void {
    this.isSoftwareGl = this.detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xe6b484);
    this.scene.fog = new THREE.FogExp2(0xe6b484, 0.0022);

    // Mandatory studio environment reflections (RoomEnvironment) on all devices
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.3, 500);

    // Warm/cool dynamic Mumbai coastal lighting (updated each frame by weatherSystem)
    this.hemiLight = new THREE.HemisphereLight(0x8ec4eb, 0x6b4d37, 0.92);
    this.hemiLight.position.set(0, 80, 0);
    this.scene.add(this.hemiLight);

    // Main-player-only directional shadow (tight 20m frustum @ 512x512 = crisp player shadow, ~99% less shadow-pass GPU cost)
    this.sunLight = new THREE.DirectionalLight(0xffcf88, 2.05);
    this.sunLight.position.set(-24, 21, -17);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 512;
    this.sunLight.shadow.mapSize.height = 512;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 70;
    const d = 10;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Subtle cool coastal rim fill from the sea
    const rim = new THREE.DirectionalLight(0x74a9d8, 0.45);
    rim.position.set(90, 42, 95);
    this.scene.add(rim);

    // Dynamic Mumbai sky dome (sunset / drizzle / monsoon storm clouds + lightning)
    this.skyDome = createSunsetSkyDome();
    this.scene.add(this.skyDome.mesh);

    // Zero-GC 3D instanced monsoon rain streaks
    this.rainSystem = createRainSystem(600);
    this.scene.add(this.rainSystem.mesh);

    this.shadowTex = createContactShadowTexture();
    this.applyGraphicsQuality();
  }

  private buildMumbaiWorld(): void {
    const loader = new THREE.TextureLoader();
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const bumpTex = createNoiseBumpTexture();
    bumpTex.repeat.set(16, 16);

    const asphaltTex = loader.load(ASPHALT_TEX_URL);
    asphaltTex.colorSpace = THREE.SRGBColorSpace;
    asphaltTex.wrapS = THREE.RepeatWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;
    asphaltTex.repeat.set(22, 22);
    asphaltTex.anisotropy = maxAniso;

    // 1. New York City concrete & granite sidewalk base (west edge flush at x = -66.5, north edge at z = -109.5)
    const sidewalkTex = getNycSidewalkTexture(maxAniso);
    const groundMat = new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      color: 0xd8d3ca,
      roughness: 0.9,
      metalness: 0.03,
      bumpMap: bumpTex,
      bumpScale: 0.04,
    });
    const cityLand = new THREE.Mesh(new THREE.PlaneGeometry(920, 960), groundMat);
    cityLand.rotation.x = -Math.PI / 2;
    cityLand.position.set(393.5, -0.02, 370.5);
    cityLand.receiveShadow = true;
    this.scene.add(cityLand);

    // 2. Realistic Animated Hudson Harbor & New York Bay with 3D wave swells, sunset glint & coastal foam
    const sea = createArabianSeaMesh(maxAniso);
    this.seaMesh = sea.mesh;
    this.seaWaveUpdate = sea.update;
    this.scene.add(this.seaMesh);

    // Wooden Hudson Waterfront Piers (Battery Ferry Pier, Pier 25, Chelsea Piers, Coney Island Boardwalk)
    for (const pier of PIER_ZONES) {
      this.scene.add(createWoodenPierMesh(pier));
    }

    // Offshore Liberty Island & Statue of Liberty with rotating golden torch beacon & ferry dock
    const island = createLibertyIsland();
    island.group.position.set(LIBERTY_ISLAND.x, 0, LIBERTY_ISLAND.z);
    this.scene.add(island.group);
    this.lighthouseBeam = island.torchBeacon;

    // Offshore Hudson Harbor navigation channel buoys
    SEA_BUOYS.forEach((b, idx) => {
      const buoyMesh = createSeaBuoyMesh(idx % 2 === 0 ? 0xef4444 : 0x22c55e);
      buoyMesh.position.set(b.x, -0.82, b.z);
      this.scene.add(buoyMesh);
      this.seaBuoys.push({ mesh: buoyMesh, baseX: b.x, baseZ: b.z, phase: idx * 1.4 });
    });

    // Decorative Staten Island Orange Ferry cruising offshore in Hudson Harbor
    this.harborFerry = createHarborFerry();
    this.harborFerry.position.set(-142, -0.45, this.harborFerryZ);
    this.scene.add(this.harborFerry);

    // Hudson River & Battery Park concrete seawall split around all 4 west piers
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x87837d, roughness: 0.86, metalness: 0.05 });
    const seawallSegments: Array<[number, number]> = [
      [-109, -90],
      [-74, 12],
      [24, 214],
      [228, 408],
      [422, 560],
    ];
    for (const [z0, z1] of seawallSegments) {
      const len = z1 - z0;
      const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, len), wallMat);
      wall.position.set(-67.2, 0.1, (z0 + z1) * 0.5);
      wall.receiveShadow = true;
      this.scene.add(wall);
    }

    // Northern seawall along Upper Bay
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(630, 1.8, 2.6), wallMat);
    northWall.position.set(248, 0.1, -109.5);
    this.scene.add(northWall);

    // 3. 11x11 NYC Asphalt Avenue & Street Grid with aspect-matched UVs & live wet rain sheen
    const roadTexNS = asphaltTex;
    roadTexNS.repeat.set(2, 84);
    const roadMatNS = new THREE.MeshStandardMaterial({
      color: 0xd0cec9,
      map: roadTexNS,
      roughness: 0.88,
      metalness: 0.04,
      bumpMap: bumpTex,
      bumpScale: 0.04,
    });
    this.roadMatNS = roadMatNS;

    const roadTexEW = loader.load(ASPHALT_TEX_URL);
    roadTexEW.colorSpace = THREE.SRGBColorSpace;
    roadTexEW.wrapS = THREE.RepeatWrapping;
    roadTexEW.wrapT = THREE.RepeatWrapping;
    roadTexEW.repeat.set(78, 2);
    roadTexEW.anisotropy = maxAniso;
    const roadMatEW = new THREE.MeshStandardMaterial({
      color: 0xd0cec9,
      map: roadTexEW,
      roughness: 0.88,
      metalness: 0.04,
      bumpMap: bumpTex,
      bumpScale: 0.04,
    });
    this.roadMatEW = roadMatEW;

    const markingTex = createRoadMarkingTexture();
    markingTex.anisotropy = maxAniso;

    for (const rx of ROAD_COORDS) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, 668), roadMatNS);
      road.rotation.x = -Math.PI / 2;
      road.position.set(rx, 0.02, 226);
      road.receiveShadow = true;
      this.scene.add(road);

      const mTex = markingTex.clone();
      mTex.repeat.set(1, 44);
      mTex.needsUpdate = true;
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_WIDTH, 668),
        new THREE.MeshBasicMaterial({ map: mTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      );
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(rx, 0.04, 226);
      this.scene.add(mark);
    }

    for (const rz of ROAD_COORDS) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(628, ROAD_WIDTH), roadMatEW);
      road.rotation.x = -Math.PI / 2;
      road.position.set(248, 0.025, rz);
      road.receiveShadow = true;
      this.scene.add(road);

      const mTex = markingTex.clone();
      mTex.repeat.set(1, 40);
      mTex.needsUpdate = true;
      const mark = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_WIDTH, 628),
        new THREE.MeshBasicMaterial({ map: mTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      );
      mark.rotation.x = -Math.PI / 2;
      mark.rotation.z = Math.PI / 2;
      mark.position.set(248, 0.045, rz);
      this.scene.add(mark);
    }

    // 3b. Six Driveable Elevated NYC Viaducts & Bridge Ramps (FDR, Brooklyn Bridge, Williamsburg, Bronx, Flushing)
    for (const flyover of FLYOVERS) {
      const flyoverMesh = createFlyoverMesh(flyover, roadMatEW);
      this.scene.add(flyoverMesh);
    }

    // 3c. NYC DOT Green Overhead Highway Gantries & Five Boroughs District Welcome Signs
    for (const gantry of STREET_GANTRIES) {
      this.scene.add(createOverheadGantrySign(gantry, maxAniso));
    }
    for (const hoarding of AREA_HOARDINGS) {
      this.scene.add(createAreaHoardingSign(hoarding, maxAniso));
    }

    // 3d. NYC Parks, Playgrounds, Sports Courts & Bronx Championship Ballpark & Arena (7 civic recreation zones!)
    for (const zone of RECREATION_ZONES) {
      this.scene.add(createRecreationZoneMesh(zone));
    }

    // Intersection Zebra Crosswalks, White STOP-Lines & Dual-Facing NYC Traffic Signals across all 121 intersections
    INTERSECTIONS.forEach((inter, idx) => {
      const pad = createIntersectionCrosswalkMesh();
      pad.position.set(inter.x, 0.054, inter.z);
      this.scene.add(pad);

      const sig = createTrafficSignalRig(idx % 4);
      sig.root.position.set(inter.x + ROAD_HALF + 1.25, 0, inter.z - ROAD_HALF - 1.25);
      this.scene.add(sig.root);
      this.signals.push({ rig: sig, phaseOffset: inter.phaseOffset });
    });

    // 4. Washington Square Marble Triumphal Arch (hero tall NYC landmark framed dead-ahead from spawn!)
    const washArch = createWashingtonSquareArch();
    washArch.position.set(0, 0, -90);
    this.scene.add(washArch);

    // Washington Square multi-layered Belgian-block civic plaza, medallion ring & granite tree pits
    this.scene.add(createWashingtonSquarePlazaMesh());

    // 5. Varied Multi-Part 3D New York City Architecture (9 distinct archetypes: Art Deco spires, Glass Supertalls,
    //    Brownstones with stoops, Brick Tenements with iron fire escapes & wooden water towers, SoHo Cast-Iron Lofts,
    //    Times Square Neon LED Towers, Flatiron Wedges, Pre-War Copper Mansards, DUMBO Sawtooth Warehouses!)
    for (const b of CITY_BUILDINGS) {
      const built = createVariedNycBuilding(b, false);
      this.scene.add(built.group);
      this.buildingMeshes.push(built.colliderMesh);
      if (built.rooftopFan) {
        this.rooftopFans.push(built.rooftopFan);
      }
    }

    // 6. Instanced NYC Deciduous Street Trees (Emerald & Autumn-Gold Manhattan Elms & Maples)
    this.buildInstancedNycTrees();

    // 7. Waterfront Pilings, NYC Streetlamps, Harbor Seagulls & Chinatown/SoHo Overhead Lanterns
    this.buildMarineDriveProps();
    this.buildCoastalSeagulls();
    this.buildOverheadBunting();

    // 8. 24 NYC Street & Park Vendor Carts (Hot Dogs, Halal Platters, Soft Pretzels, Coffee & Bagels, Pizza)
    for (const v of VENDOR_LOCATIONS) {
      this.scene.add(createNycCartStall(v));
    }

    // 8b. 16 Flagship Ground-Floor Named NYC Building Shops (Joe's Pizza, Katz's Deli, SoHo Kicks Lab, etc.)
    for (const shop of BUILDING_SHOPS) {
      this.scene.add(createBuildingShopfront(shop, maxAniso));
    }

    // 9. Mission Waypoint Beacon (golden column + spinning ring + floating 3D crystal)
    this.missionBeaconGroup = new THREE.Group();
    this.missionBeaconRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.24, 10, 32),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 }),
    );
    this.missionBeaconRing.rotation.x = Math.PI / 2;
    this.missionBeaconRing.position.y = 0.35;
    this.missionBeaconGroup.add(this.missionBeaconRing);

    this.missionBeaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 2.2, 34, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.missionBeaconBeam.position.y = 17;
    this.missionBeaconGroup.add(this.missionBeaconBeam);

    this.missionBeaconDiamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.05, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.4,
        roughness: 0.2,
        metalness: 0.6,
      }),
    );
    this.missionBeaconDiamond.position.y = 4.2;
    this.missionBeaconGroup.add(this.missionBeaconDiamond);

    this.missionBeaconGroup.visible = false;
    this.scene.add(this.missionBeaconGroup);

    // Pre-warm shaders once on GPU (skip on software WebGL)
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildInstancedNycTrees(): void {
    const spots: Array<[number, number, number]> = [];
    // Hudson River Park & Battery Park promenade elms/maples (leaving pier mouths clear)
    for (let z = -96; z <= 398; z += 18) {
      if (
        (z >= -94 && z <= -70) ||
        (z >= 8 && z <= 28) ||
        (z >= 210 && z <= 232)
      ) {
        continue;
      }
      spots.push([-64.8, z, 0.94 + ((Math.abs(z) % 5) * 0.06)]);
    }
    // Washington Square Arch framing elms & maples
    for (const x of [-18, -11.5, 11.5, 18]) {
      spots.push([x, -76, 1.06]);
      spots.push([x, -101, 1.12]);
    }
    // Fifth Ave, Broadway, SoHo, Midtown & Williamsburg sidewalk street trees
    for (const z of [-40, -16, 14, 40, 72, 140, 196, 252, 308]) {
      spots.push([-9.6, z, 0.96]);
      spots.push([9.6, z, 1.02]);
    }
    // Crosstown avenues & Bronx Ballpark approach boulevard trees
    for (const x of [140, 196, 252, 308]) {
      spots.push([x, 214, 0.98]);
      spots.push([x, 234, 0.95]);
    }
    for (const x of [-36, 28, 84, 296]) {
      spots.push([x, 326, 1.04]);
    }
    // Framing boulevard trees outside Bronx Ballpark South Plaza (clear of main gate!)
    for (const [bx, bz, sc] of [
      [310, 108, 1.08],
      [320, 108, 1.0],
      [352, 108, 1.02],
      [362, 108, 1.1],
    ] as Array<[number, number, number]>) {
      spots.push([bx, bz, sc]);
    }

    buildLayeredNycStreetTrees(this.scene, spots);
  }

  private buildCoastalSeagulls(): void {
    const configs: Array<{
      cx: number;
      cz: number;
      rx: number;
      rz: number;
      alt: number;
      spd: number;
      species: BirdSpecies;
    }> = [
      // Washington Square & Lower Manhattan soaring gulls + swooping pigeons
      { cx: -6, cz: -42, rx: 22, rz: 18, alt: 13.5, spd: 0.42, species: 'seagull' },
      { cx: 4, cz: -34, rx: 16, rz: 14, alt: 11.5, spd: -0.52, species: 'pigeon' },
      { cx: -2, cz: -28, rx: 14, rz: 16, alt: 12.2, spd: 0.56, species: 'pigeon' },
      { cx: -14, cz: -52, rx: 26, rz: 20, alt: 17.5, spd: -0.36, species: 'seagull' },
      { cx: 12, cz: -46, rx: 24, rz: 22, alt: 19.0, spd: 0.34, species: 'seagull' },
      { cx: -32, cz: -62, rx: 32, rz: 24, alt: 21.0, spd: 0.32, species: 'seagull' },
      { cx: -48, cz: -18, rx: 24, rz: 36, alt: 22.0, spd: -0.29, species: 'seagull' },
      // Central Park Great Lawn flock (pigeons + gliding Red-Tailed Hawks!)
      { cx: 28, cz: 84, rx: 18, rz: 16, alt: 11.8, spd: 0.54, species: 'pigeon' },
      { cx: 30, cz: 88, rx: 15, rz: 14, alt: 13.2, spd: -0.49, species: 'pigeon' },
      { cx: 26, cz: 80, rx: 22, rz: 18, alt: 16.5, spd: 0.34, species: 'hawk' },
      { cx: 32, cz: 84, rx: 26, rz: 22, alt: 21.5, spd: -0.26, species: 'hawk' },
      // Hudson Harbor & Waterfront Seagulls
      { cx: -52, cz: 34, rx: 22, rz: 30, alt: 18.0, spd: 0.37, species: 'seagull' },
      { cx: -38, cz: -84, rx: 26, rz: 18, alt: 17.0, spd: -0.35, species: 'seagull' },
      { cx: -6, cz: 16, rx: 36, rz: 26, alt: 24.0, spd: 0.27, species: 'seagull' },
      { cx: -68, cz: 224, rx: 30, rz: 28, alt: 20.0, spd: 0.32, species: 'seagull' },
      { cx: -76, cz: 330, rx: 32, rz: 26, alt: 19.0, spd: -0.31, species: 'seagull' },
      { cx: -92, cz: 80, rx: 28, rz: 34, alt: 16.5, spd: 0.35, species: 'seagull' },
      // Midtown, Brooklyn & Flushing Meadows skyline flocks
      { cx: 140, cz: 56, rx: 24, rz: 22, alt: 22.0, spd: 0.31, species: 'pigeon' },
      { cx: 224, cz: 24, rx: 28, rz: 26, alt: 25.0, spd: 0.27, species: 'seagull' },
      { cx: 310, cz: 248, rx: 34, rz: 26, alt: 28.0, spd: -0.25, species: 'hawk' },
      { cx: 420, cz: 252, rx: 22, rz: 18, alt: 15.0, spd: 0.44, species: 'pigeon' },
      // Circling majestically above Bronx Ballpark & Arena!
      { cx: 336, cz: 56, rx: 34, rz: 34, alt: 29.0, spd: 0.26, species: 'hawk' },
      { cx: 336, cz: 56, rx: 26, rz: 26, alt: 24.5, spd: -0.34, species: 'seagull' },
      { cx: 336, cz: 62, rx: 22, rz: 20, alt: 22.0, spd: 0.41, species: 'seagull' },
    ];
    configs.forEach((c, idx) => {
      const rig = createSeagullRig(c.species);
      this.scene.add(rig.root);
      const baseFlap = c.species === 'pigeon' ? 8.2 : c.species === 'hawk' ? 3.8 : 5.4;
      this.seagulls.push({
        rig,
        centerX: c.cx,
        centerZ: c.cz,
        radiusX: c.rx,
        radiusZ: c.rz,
        altitude: c.alt,
        angularSpeed: c.spd,
        angle: idx * 0.72,
        flapSpeed: baseFlap + (idx % 3) * 0.8,
        flapPhase: idx * 1.15,
      });
    });
  }

  private buildOverheadBunting(): void {
    // Festive fluttering marigold/saffron/teal bunting & Dharavi alley cloth lines
    const spans: Array<{ x: number; y: number; z: number; len: number; rotY: number }> = [
      { x: 0, y: 7.4, z: 18, len: 14.5, rotY: 0 },
      { x: 0, y: 7.6, z: -18, len: 14.5, rotY: 0 },
      { x: 28, y: 7.2, z: -28, len: 12.0, rotY: Math.PI / 2 },
      { x: 140, y: 6.4, z: -28, len: 15.0, rotY: 0.12 },
      { x: 140, y: 6.8, z: 24, len: 15.0, rotY: -0.08 },
      { x: 140, y: 6.5, z: 76, len: 15.0, rotY: 0.1 },
      { x: 168, y: 7.2, z: 18, len: 14.5, rotY: 0 },
      { x: 168, y: 7.4, z: 66, len: 14.5, rotY: 0 },
      { x: 194, y: 6.3, z: 28, len: 14.0, rotY: Math.PI / 2 },
      { x: 194, y: 6.6, z: 82, len: 14.0, rotY: Math.PI / 2 },
      // Dadar Phool Market, Bandra West, Juhu Beach & BKC festive garlands
      { x: 224, y: 7.4, z: 18, len: 14.5, rotY: 0 },
      { x: 224, y: 7.3, z: -26, len: 14.5, rotY: 0 },
      { x: 168, y: 7.4, z: 252, len: 14.5, rotY: 0 },
      { x: -56, y: 7.3, z: 308, len: 14.5, rotY: 0 },
      { x: 280, y: 7.6, z: 252, len: 14.5, rotY: 0 },
      { x: 336, y: 7.5, z: 196, len: 14.5, rotY: 0 },
    ];
    const flagColors = [0xf59e0b, 0xef4444, 0x0ea5e9, 0x22c55e, 0xfde047, 0xec4899];
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x3b3530, roughness: 0.9 });
    const flagMats = flagColors.map(
      (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.72, side: THREE.DoubleSide }),
    );
    const flagGeo = new THREE.PlaneGeometry(0.68, 0.85);

    spans.forEach((s, idx) => {
      const group = new THREE.Group();
      group.position.set(s.x, s.y, s.z);
      group.rotation.y = s.rotY;

      const rope = new THREE.Mesh(new THREE.BoxGeometry(s.len, 0.05, 0.05), ropeMat);
      group.add(rope);

      const count = 9;
      for (let f = 0; f < count; f++) {
        const t = (f + 0.5) / count - 0.5;
        const droop = (0.25 - t * t) * 1.4;
        const flag = new THREE.Mesh(flagGeo, flagMats[(idx + f) % flagMats.length]);
        flag.position.set(t * (s.len - 1.2), -0.45 - droop, 0);
        group.add(flag);
      }
      this.scene.add(group);
      this.buntingLines.push({ group, phase: idx * 0.9, baseZ: s.z });
    });
  }

  private buildMarineDriveProps(): void {
    // Tetrapods scattered along the Arabian Sea coastline outside Marine Drive, Worli & Juhu seawalls
    const tetraGeo = new THREE.OctahedronGeometry(1.05, 0);
    const tetraMat = new THREE.MeshStandardMaterial({ color: 0x867e76, roughness: 0.92 });
    const tetraSpots: number[] = [];
    for (let i = 0; i < 114; i++) {
      const z = -104 + i * 4.2;
      if (Math.abs(z) < 14 || Math.abs(z - 224) < 14 || Math.abs(z - 336) < 14) continue;
      tetraSpots.push(z);
    }
    const tetras = new THREE.InstancedMesh(tetraGeo, tetraMat, tetraSpots.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < tetraSpots.length; i++) {
      const z = tetraSpots[i];
      const x = -70.2 - (i % 3) * 1.6;
      dummy.position.set(x, -0.35 + (i % 2) * 0.25, z);
      dummy.rotation.set(i * 0.7, i * 1.3, i * 0.5);
      dummy.scale.setScalar(0.85 + (i % 4) * 0.14);
      dummy.updateMatrix();
      tetras.setMatrixAt(i, dummy.matrix);
    }
    tetras.instanceMatrix.needsUpdate = true;
    tetras.computeBoundingSphere();
    this.scene.add(tetras);

    // Queen's Necklace streetlamps along Marine Drive, Worli Sea Face, Juhu Beach & Colaba Causeway
    const lampSpots: Array<[number, number]> = [];
    for (let z = -96; z <= 364; z += 18) {
      if (Math.abs(z) >= 12 && Math.abs(z - 224) >= 12 && Math.abs(z - 336) >= 12) {
        lampSpots.push([-63.5, z]);
      }
      lampSpots.push([-47.5, z]);
      lampSpots.push([8.2, z]);
    }
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 6.4, 6);
    poleGeo.translate(0, 3.2, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.45, metalness: 0.72 });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);

    const bulbGeo = new THREE.SphereGeometry(0.28, 8, 8);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffdf8d });
    const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampSpots.length);

    lampSpots.forEach(([lx, lz], i) => {
      dummy.position.set(lx, 0, lz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);

      dummy.position.set(lx, 6.5, lz);
      dummy.updateMatrix();
      bulbs.setMatrixAt(i, dummy.matrix);
    });
    poles.instanceMatrix.needsUpdate = true;
    bulbs.instanceMatrix.needsUpdate = true;
    poles.computeBoundingSphere();
    bulbs.computeBoundingSphere();
    this.scene.add(poles, bulbs);
  }

  private initParticles(): void {
    const geo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.particleMesh.frustumCulled = false;

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 0.2,
        color: new THREE.Color(0xffffff),
      });
      _mat4.makeScale(0, 0, 0);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, this.particles[i].color);
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);
  }

  private spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    hex: number,
    speed: number,
    size = 1.0,
    life = 0.55,
  ): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % this.maxParticles;
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.35 + Math.random() * 0.65) * speed;
      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 0.5;
      slot.y = y + Math.random() * 0.4;
      slot.z = z + (Math.random() - 0.5) * 0.5;
      slot.vx = Math.cos(ang) * spd;
      slot.vy = 1.4 + Math.random() * speed * 0.65;
      slot.vz = Math.sin(ang) * spd;
      slot.life = life * (0.7 + Math.random() * 0.4);
      slot.maxLife = slot.life;
      slot.size = size * (0.7 + Math.random() * 0.6);
      slot.color.setHex(hex);
      this.particleMesh.setColorAt(
        (this.particleCursor - 1 + this.maxParticles) % this.maxParticles,
        slot.color,
      );
    }
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
  }

  private updateParticles(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleMesh.setMatrixAt(i, _mat4);
        continue;
      }
      p.vy -= 5.8 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.1, p.y + p.vy * dt);
      p.z += p.vz * dt;
      const s = p.size * (p.life / p.maxLife);
      _pos.set(p.x, p.y, p.z);
      _scale.set(s, s, s);
      _quat.identity();
      _mat4.compose(_pos, _quat, _scale);
      this.particleMesh.setMatrixAt(i, _mat4);
    }
    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private initPlayerAndEntities(): void {
    // Player Protagonist ("Kabir") with GTA 6 / Vice-inspired swappable wardrobe
    const outfit = PLAYER_OUTFITS[this.playerOutfitIndex];
    this.playerRig = createCharacterRig(
      {
        shirtHex: outfit.shirtHex,
        pantsHex: outfit.pantsHex,
        skinHex: outfit.skinHex,
        accentHex: outfit.accentHex,
        isPlayer: true,
        appearance: outfit,
      },
      this.shadowTex,
    );
    this.playerRig.root.position.set(this.playerX, 0, this.playerZ);
    this.playerRig.root.rotation.y = this.playerHeading;
    this.scene.add(this.playerRig.root);

    this.customGlbPlayer = new CustomGlbCharacterController(this.shadowTex);
    this.customGlbPlayer.root.visible = false;
    this.customGlbPlayer.root.position.set(this.playerX, 0, this.playerZ);
    this.customGlbPlayer.root.rotation.y = this.playerHeading;
    this.scene.add(this.customGlbPlayer.root);

    void this.restoreSavedGlbModels();

    this.spawnInitialVehicles();
    this.spawnInitialNpcs();
  }

  private isPlayerOnFootVisible(): boolean {
    return !this.activeVehicle && !this.subwayRide;
  }

  private syncPlayerAvatarVisibilityAndPose(): void {
    const visible = this.isPlayerOnFootVisible();
    const useCustom = Boolean(this.customGlbPlayer?.isLoaded());
    this.playerRig.root.visible = visible && !useCustom;
    this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.root.rotation.y = this.playerHeading;
    if (this.customGlbPlayer) {
      this.customGlbPlayer.root.visible = visible && useCustom;
      this.customGlbPlayer.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.customGlbPlayer.root.rotation.y = this.playerHeading;
    }
  }

  private async restoreSavedGlbModels(): Promise<void> {
    const rawList = await listStoredGlbCharacters();
    if (this.disposed) return;
    // Utilize the 2 already-uploaded .GLB files and map their display labels cleanly to 'Red Dress' & 'Jeans Top'
    const twoModels = rawList.slice(0, 2);
    const assigned = new Set<string>();
    const list: StoredGlbCharacterRecord[] = twoModels.map((rec, idx) => {
      let label = resolveGlbCharacterDisplayName(idx, rec.name, rec.fileName);
      if (assigned.has(label)) {
        label = label === 'Red Dress' ? 'Jeans Top' : 'Red Dress';
      }
      assigned.add(label);
      return { ...rec, name: label };
    });
    this.savedGlbRecords = list;

    const activeId = getActiveStoredGlbId();
    const targetRec = (activeId ? list.find((r) => r.id === activeId) : null) ?? list[0] ?? null;
    if (targetRec) {
      try {
        await this.customGlbPlayer.loadFromBuffer(
          targetRec.id,
          targetRec.name,
          targetRec.buffer,
          targetRec.facingFlip,
          targetRec.extraAnims,
        );
        if (this.disposed) return;
        this.activeCustomGlbId = targetRec.id;
        setActiveStoredGlbId(targetRec.id);
        this.syncPlayerAvatarVisibilityAndPose();
      } catch {
        setActiveStoredGlbId(null);
      }
    }
    this.pushHudSnapshot(true);
  }

  public async importCustomGlbFile(file: File): Promise<void> {
    const buffer = await file.arrayBuffer();
    const cleanName = file.name.replace(/\.(glb|gltf)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Custom 3D Model';
    const id = `glb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const summary = await this.customGlbPlayer.loadFromBuffer(id, cleanName, buffer, false, []);
    const record: StoredGlbCharacterRecord = {
      id,
      name: cleanName,
      fileName: file.name,
      buffer,
      facingFlip: false,
      extraAnims: [],
      createdAt: Date.now(),
    };
    this.savedGlbRecords = [...this.savedGlbRecords, record];
    this.activeCustomGlbId = id;
    await saveStoredGlbCharacter(record);
    setActiveStoredGlbId(id);
    this.syncPlayerAvatarVisibilityAndPose();
    this.audio.playChime([523.25, 659.25, 783.99]);
    if (!this.activeVehicle) {
      this.spawnParticles(this.playerX, this.playerY + 1.15, this.playerZ, 18, 0xf43f5e, 4.2, 0.55, 0.36);
    }
    const modeNote =
      summary.animationMode === 'clips'
        ? `${summary.clipNames.length} skeletal clip(s) active.`
        : summary.animationMode === 'procedural_rig'
          ? 'Humanoid rig detected — procedural gait active.'
          : 'Static preview active — export rigged .GLB in Meshy for full limb motion.';
    this.showToast(`3D Model Loaded · ${cleanName}`, modeNote, 'teal', 4.4);
    this.pushHudSnapshot(true);
  }

  /** Load a bundled static .GLB protagonist from /public/models/ without requiring user file upload */
  public async loadBuiltInGlbFromUrl(
    id: string,
    name: string,
    url: string,
    facingFlip = false,
  ): Promise<void> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch built-in character model (${res.status}): ${url}`);
    }
    const buffer = await res.arrayBuffer();
    await this.customGlbPlayer.loadFromBuffer(id, name, buffer, facingFlip, []);
    this.activeCustomGlbId = id;
    this.syncPlayerAvatarVisibilityAndPose();
    this.pushHudSnapshot(true);
  }

  public async importCustomGlbAnimationFile(file: File, slotHint?: CharacterAnimSlot): Promise<void> {
    if (!this.activeCustomGlbId || !this.customGlbPlayer.isLoaded()) {
      throw new Error('Import your main character .GLB first before adding extra animation clips.');
    }
    const buffer = await file.arrayBuffer();
    await this.customGlbPlayer.addAnimationsFromBuffer(buffer, file.name, slotHint);

    const idx = this.savedGlbRecords.findIndex((r) => r.id === this.activeCustomGlbId);
    if (idx >= 0) {
      const updated: StoredGlbCharacterRecord = {
        ...this.savedGlbRecords[idx],
        extraAnims: [
          ...this.savedGlbRecords[idx].extraAnims,
          {
            id: `anim_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            fileName: file.name,
            slotHint,
            buffer,
          },
        ],
      };
      this.savedGlbRecords = [
        ...this.savedGlbRecords.slice(0, idx),
        updated,
        ...this.savedGlbRecords.slice(idx + 1),
      ];
      await saveStoredGlbCharacter(updated);
    }
    this.audio.playChime([659.25, 880]);
    this.showToast(
      'Animation Added',
      `Bound ${file.name}${slotHint ? ` to ${slotHint.toUpperCase()}` : ''} on your 3D protagonist.`,
      'teal',
      3.4,
    );
    this.pushHudSnapshot(true);
  }

  public async selectCustomGlbModel(id: string | null): Promise<void> {
    if (!id) {
      this.customGlbPlayer.clearCurrentModel();
      this.activeCustomGlbId = null;
      setActiveStoredGlbId(null);
      this.syncPlayerAvatarVisibilityAndPose();
      this.showToast('Built-in Camila', 'Switched back to built-in 6-outfit wardrobe.', 'amber', 2.8);
      this.pushHudSnapshot(true);
      return;
    }
    const recIdx = this.savedGlbRecords.findIndex((r) => r.id === id);
    if (recIdx < 0) return;
    const rec = this.savedGlbRecords[recIdx];
    const displayName = rec.name || resolveGlbCharacterDisplayName(recIdx, rec.name, rec.fileName);
    await this.customGlbPlayer.loadFromBuffer(rec.id, displayName, rec.buffer, rec.facingFlip, rec.extraAnims);
    this.activeCustomGlbId = rec.id;
    setActiveStoredGlbId(rec.id);
    this.syncPlayerAvatarVisibilityAndPose();
    this.audio.playChime([523.25, 659.25]);
    this.showToast(`Wardrobe · ${displayName}`, `Switched look to ${displayName}. Press [O] to swap.`, 'teal', 2.8);
    this.pushHudSnapshot(true);
  }

  public async toggleCustomGlbFacingFlip(): Promise<void> {
    if (!this.activeCustomGlbId || !this.customGlbPlayer.isLoaded()) return;
    const idx = this.savedGlbRecords.findIndex((r) => r.id === this.activeCustomGlbId);
    if (idx < 0) return;
    const nextFlip = !this.savedGlbRecords[idx].facingFlip;
    this.customGlbPlayer.setFacingFlip(nextFlip);
    const updated = { ...this.savedGlbRecords[idx], facingFlip: nextFlip };
    this.savedGlbRecords = [
      ...this.savedGlbRecords.slice(0, idx),
      updated,
      ...this.savedGlbRecords.slice(idx + 1),
    ];
    await saveStoredGlbCharacter(updated);
    this.pushHudSnapshot(true);
  }

  public async deleteCustomGlbModel(id: string): Promise<void> {
    this.savedGlbRecords = this.savedGlbRecords.filter((r) => r.id !== id);
    await deleteStoredGlbCharacter(id);
    if (this.activeCustomGlbId === id) {
      this.customGlbPlayer.clearCurrentModel();
      this.activeCustomGlbId = null;
      setActiveStoredGlbId(null);
      this.syncPlayerAvatarVisibilityAndPose();
    }
    this.pushHudSnapshot(true);
  }

  private addVehicle(
    id: string,
    type: VehicleType,
    x: number,
    z: number,
    heading: number,
    opts: {
      isTraffic: boolean;
      isPolice?: boolean;
      isConvoy?: boolean;
      axis?: TrafficAxis;
      dir?: 1 | -1;
      roadCoord?: number;
      liveryIndex?: number;
    },
  ): SimVehicle {
    const spec = VEHICLE_SPECS[type];
    const initY = spec.isWatercraft ? -0.55 : 0;
    const driverModel = NPC_CHARACTER_POOL[this.vehicles.length % NPC_CHARACTER_POOL.length];
    const hasDriver = opts.isTraffic || Boolean(opts.isPolice) || Boolean(opts.isConvoy);
    const rig = createVehicleRig(type, this.shadowTex, {
      shirtHex: opts.isPolice
        ? 0xc29e6c
        : type === 'taxi' || type === 'auto'
          ? 0xf1f5f9
          : type === 'bus'
            ? 0x94a3b8
            : driverModel.shirtHex,
      skinHex: driverModel.skinHex,
      isPolice: Boolean(opts.isPolice),
      visible: hasDriver,
      liveryIndex: opts.liveryIndex ?? this.vehicles.length,
    });
    rig.root.position.set(x, initY, z);
    rig.root.rotation.y = heading;
    this.scene.add(rig.root);

    const v: SimVehicle = {
      id,
      type,
      rig,
      phys: {
        x,
        y: initY,
        z,
        vx: 0,
        vz: 0,
        heading,
        steerAngle: 0,
        speed: 0,
        isDrifting: false,
        isBoosting: false,
        hitWall: false,
        impactSpeed: 0,
      },
      hp: spec.maxHp,
      maxHp: spec.maxHp,
      isTraffic: opts.isTraffic,
      isPolice: !!opts.isPolice,
      isConvoy: !!opts.isConvoy,
      disabled: false,
      axis: opts.axis ?? 'ns',
      dir: opts.dir ?? 1,
      roadCoord: opts.roadCoord ?? 0,
      cruiseSpeed:
        type === 'bus'
          ? 9.5
          : type === 'auto'
            ? 11.5
            : type === 'hypercar'
              ? 19.0
              : type === 'sports' || type === 'muscle'
                ? 16.5
                : type === 'suv_lux'
                  ? 14.5
                  : 13,
      turnCooldown: 1,
      honkCooldown: 0,
      hitFlash: 0,
      prevSpeed: 0,
      suspPitch: 0,
      suspRoll: 0,
      isBraking: false,
      officerDeployed: false,
      deployCooldown: 0,
    };
    this.vehicles.push(v);
    return v;
  }

  private spawnInitialVehicles(): void {
    // 1. Hero Parked Vehicles & Supercar Showcase right near player spawn!
    // Iconic NYC Yellow Cab parked beside player (3m away!)
    this.addVehicle('hero_taxi', 'taxi', -3.2, -27.2, Math.PI, { isTraffic: false });
    // Rosso Corsa V12 Valkyrie Hypercar with twin white racing stripes right across the avenue!
    this.addVehicle('hero_hypercar', 'hypercar', 3.4, -27.8, Math.PI, { isTraffic: false, liveryIndex: 0 });
    // Miami Vice Cyan Manhattan GT Supercar with neon cyber decals ahead on right curb!
    this.addVehicle('hero_vice_gt', 'sports', 3.4, -36.5, Math.PI, { isTraffic: false, liveryIndex: 1 });
    // Verde Mantis Lime Bronx V8 Hellcat Coupe with carbon hood ahead on left curb!
    this.addVehicle('hero_hellcat', 'muscle', -3.2, -36.5, Math.PI, { isTraffic: false, liveryIndex: 2 });
    // Midnight Amethyst Exotic SUV parked nearby on West Broadway
    this.addVehicle('hero_exotic_suv', 'suv_lux', -52.5, -18.0, Math.PI, { isTraffic: false, liveryIndex: 4 });
    // NYC Pedicab parked slightly south behind spawn
    this.addVehicle('hero_auto', 'auto', -3.2, -13.5, Math.PI, { isTraffic: false });
    // Papaya Sunset Manhattan GT parked at Battery Overlook (and Mission 3 target!)
    this.addVehicle('hero_gt', 'sports', -56, 74, Math.PI, { isTraffic: false, liveryIndex: 3 });
    // Parked Pedicab near Wall St for Mission 2
    this.addVehicle('mill_auto', 'auto', 52.5, 42, Math.PI, { isTraffic: false });
    // Parked MTA City Bus near Union Square (and Mission 7 target!)
    this.addVehicle('hero_bus', 'bus', 4.0, 20.0, Math.PI, { isTraffic: false });
    // Parked Pedicab in Lower East Side (and Mission 9 target!)
    this.addVehicle('dharavi_auto', 'auto', 164.0, 56.0, -Math.PI / 2, { isTraffic: false });
    // Pearl White Motorsport Hypercar near West Side Express ramp (Mission 10 launch!)
    this.addVehicle('flyover_gt', 'hypercar', -24.0, 115.2, Math.PI / 2, { isTraffic: false, liveryIndex: 5 });

    // Parked exotic supercars, muscle coupes & luxury SUVs across Midtown, SoHo, Chelsea, Harlem, Bronx & Queens
    this.addVehicle('dadar_muscle', 'muscle', 220.0, 20.0, Math.PI, { isTraffic: false, liveryIndex: 6 });
    this.addVehicle('bandra_gt', 'hypercar', 164.0, 250.0, Math.PI, { isTraffic: false, liveryIndex: 7 });
    this.addVehicle('juhu_gt', 'sports', -52.0, 304.0, Math.PI, { isTraffic: false, liveryIndex: 8 });
    this.addVehicle('bkc_gt', 'hypercar', 332.0, 248.0, Math.PI, { isTraffic: false, liveryIndex: 9 });
    this.addVehicle('wankhede_gt', 'muscle', -4.0, 396.0, Math.PI, { isTraffic: false, liveryIndex: 0 });
    this.addVehicle('powai_suv', 'suv_lux', 444.0, 252.0, Math.PI, { isTraffic: false, liveryIndex: 1 });

    // Boardable & Pilotable Hudson Harbor Vessels moored alongside all 4 NYC waterfront piers!
    this.addVehicle('battery_ferry', 'ferry', -120, -96, -Math.PI / 2, { isTraffic: false });
    this.addVehicle('battery_speedboat', 'speedboat', -120, -68, -Math.PI / 2, { isTraffic: false });
    this.addVehicle('pier25_speedboat', 'speedboat', -116, 8, -Math.PI / 2, { isTraffic: false });
    this.addVehicle('pier25_ferry', 'ferry', -116, 30, -Math.PI / 2, { isTraffic: false });
    this.addVehicle('chelsea_speedboat', 'speedboat', -122, 208, -Math.PI / 2, { isTraffic: false });
    this.addVehicle('chelsea_ferry', 'ferry', -122, 234, -Math.PI / 2, { isTraffic: false });
    this.addVehicle('coney_speedboat', 'speedboat', -118, 402, -Math.PI / 2, { isTraffic: false });
    this.addVehicle('coney_ferry', 'ferry', -118, 428, -Math.PI / 2, { isTraffic: false });

    // 2. Living NYC Traffic Fleet (62 active AI vehicles: rich mix of colorful supercars, hypercars, muscle coupes, exotic SUVs & NYC cabs!)
    const fleet: Array<{ type: VehicleType; axis: TrafficAxis; roadCoord: number; dir: 1 | -1; along: number }> = [
      { type: 'hypercar', axis: 'ns', roadCoord: -56, dir: -1, along: 45 },
      { type: 'sports', axis: 'ns', roadCoord: -56, dir: -1, along: -12 },
      { type: 'bus', axis: 'ns', roadCoord: -56, dir: 1, along: -42 },
      { type: 'muscle', axis: 'ns', roadCoord: -56, dir: 1, along: 18 },
      { type: 'suv_lux', axis: 'ns', roadCoord: -56, dir: -1, along: 132 },
      { type: 'hypercar', axis: 'ns', roadCoord: -56, dir: 1, along: 248 },
      { type: 'taxi', axis: 'ns', roadCoord: -56, dir: -1, along: 318 },
      { type: 'bus', axis: 'ns', roadCoord: -56, dir: 1, along: 422 },

      { type: 'sports', axis: 'ns', roadCoord: 0, dir: -1, along: 34 },
      { type: 'hypercar', axis: 'ns', roadCoord: 0, dir: 1, along: -52 },
      { type: 'suv_lux', axis: 'ns', roadCoord: 0, dir: 1, along: 14 },
      { type: 'muscle', axis: 'ns', roadCoord: 0, dir: -1, along: 144 },
      { type: 'taxi', axis: 'ns', roadCoord: 0, dir: 1, along: 256 },
      { type: 'sports', axis: 'ns', roadCoord: 0, dir: -1, along: 322 },
      { type: 'hypercar', axis: 'ns', roadCoord: 0, dir: -1, along: 442 },

      { type: 'muscle', axis: 'ns', roadCoord: 56, dir: -1, along: 38 },
      { type: 'hypercar', axis: 'ns', roadCoord: 56, dir: 1, along: -24 },
      { type: 'sports', axis: 'ns', roadCoord: 56, dir: -1, along: -68 },
      { type: 'bus', axis: 'ns', roadCoord: 56, dir: 1, along: 126 },
      { type: 'suv_lux', axis: 'ns', roadCoord: 56, dir: -1, along: 416 },

      { type: 'sports', axis: 'ns', roadCoord: 112, dir: 1, along: 24 },
      { type: 'hypercar', axis: 'ns', roadCoord: 112, dir: -1, along: 142 },
      { type: 'muscle', axis: 'ns', roadCoord: 168, dir: -1, along: 44 },
      { type: 'taxi', axis: 'ns', roadCoord: 168, dir: 1, along: -22 },
      { type: 'suv_lux', axis: 'ns', roadCoord: 168, dir: 1, along: 138 },
      { type: 'sports', axis: 'ns', roadCoord: 168, dir: -1, along: 264 },
      { type: 'bus', axis: 'ns', roadCoord: 168, dir: 1, along: 412 },

      { type: 'taxi', axis: 'ns', roadCoord: 224, dir: -1, along: 42 },
      { type: 'suv_lux', axis: 'ns', roadCoord: 224, dir: 1, along: -36 },
      { type: 'hypercar', axis: 'ns', roadCoord: 224, dir: 1, along: 186 },
      { type: 'sports', axis: 'ns', roadCoord: 280, dir: -1, along: 88 },
      { type: 'muscle', axis: 'ns', roadCoord: 280, dir: 1, along: 214 },
      { type: 'hypercar', axis: 'ns', roadCoord: 280, dir: -1, along: 318 },
      { type: 'taxi', axis: 'ns', roadCoord: 336, dir: 1, along: 210 },
      { type: 'bus', axis: 'ns', roadCoord: 336, dir: -1, along: 176 },
      { type: 'sports', axis: 'ns', roadCoord: 336, dir: 1, along: 286 },
      { type: 'muscle', axis: 'ns', roadCoord: 392, dir: -1, along: 136 },
      { type: 'suv_lux', axis: 'ns', roadCoord: 392, dir: 1, along: 342 },
      { type: 'bus', axis: 'ns', roadCoord: 448, dir: -1, along: 224 },
      { type: 'hypercar', axis: 'ns', roadCoord: 448, dir: 1, along: 410 },
      { type: 'taxi', axis: 'ns', roadCoord: 504, dir: -1, along: 184 },
      { type: 'sports', axis: 'ns', roadCoord: 504, dir: 1, along: 382 },

      { type: 'sports', axis: 'ew', roadCoord: -56, dir: 1, along: -32 },
      { type: 'hypercar', axis: 'ew', roadCoord: -56, dir: -1, along: 84 },
      { type: 'muscle', axis: 'ew', roadCoord: -56, dir: 1, along: 240 },
      { type: 'taxi', axis: 'ew', roadCoord: 0, dir: 1, along: -28 },
      { type: 'hypercar', axis: 'ew', roadCoord: 0, dir: -1, along: 92 },
      { type: 'suv_lux', axis: 'ew', roadCoord: 0, dir: -1, along: 246 },
      { type: 'muscle', axis: 'ew', roadCoord: 56, dir: 1, along: -18 },
      { type: 'sports', axis: 'ew', roadCoord: 56, dir: -1, along: 136 },
      { type: 'taxi', axis: 'ew', roadCoord: 56, dir: 1, along: 210 },
      { type: 'hypercar', axis: 'ew', roadCoord: 168, dir: 1, along: 22 },
      { type: 'auto', axis: 'ew', roadCoord: 168, dir: -1, along: 130 },
      { type: 'bus', axis: 'ew', roadCoord: 224, dir: 1, along: 82 },
      { type: 'sports', axis: 'ew', roadCoord: 280, dir: -1, along: 196 },
      { type: 'taxi', axis: 'ew', roadCoord: 336, dir: 1, along: 24 },
      { type: 'muscle', axis: 'ew', roadCoord: 336, dir: -1, along: 164 },
      { type: 'hypercar', axis: 'ew', roadCoord: 336, dir: 1, along: 298 },
      { type: 'suv_lux', axis: 'ew', roadCoord: 392, dir: 1, along: 120 },
      { type: 'taxi', axis: 'ew', roadCoord: 448, dir: -1, along: 260 },
      { type: 'auto', axis: 'ew', roadCoord: 448, dir: 1, along: 410 },
      { type: 'sports', axis: 'ew', roadCoord: 504, dir: -1, along: 210 },
    ];

    fleet.forEach((f, idx) => {
      const lane = getNycLaneCoord(f.axis, f.dir, f.roadCoord);
      const x = f.axis === 'ns' ? lane : f.along;
      const z = f.axis === 'ns' ? f.along : lane;
      const heading =
        f.axis === 'ns' ? (f.dir === 1 ? 0 : Math.PI) : f.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      this.addVehicle(`traffic_${idx}`, f.type, x, z, heading, {
        isTraffic: true,
        axis: f.axis,
        dir: f.dir,
        roadCoord: f.roadCoord,
        liveryIndex: (idx * 3 + 1) % 10,
      });
    });

    // 3. Seven Mumbai Police Patrol SUVs across Marine Drive, Colaba, Lower Parel, Dadar, BKC, Wankhede & Powai!
    this.addVehicle('police_0', 'police', -56 + 3.4, -78, 0, {
      isTraffic: true,
      isPolice: true,
      axis: 'ns',
      dir: 1,
      roadCoord: -56,
    });
    this.addVehicle('police_1', 'police', 28, 56 - 3.4, -Math.PI / 2, {
      isTraffic: true,
      isPolice: true,
      axis: 'ew',
      dir: -1,
      roadCoord: 56,
    });
    this.addVehicle('police_2', 'police', 112 + 3.4, 146, Math.PI, {
      isTraffic: true,
      isPolice: true,
      axis: 'ns',
      dir: -1,
      roadCoord: 112,
    });
    this.addVehicle('police_3', 'police', 224 + 3.4, 240, Math.PI, {
      isTraffic: true,
      isPolice: true,
      axis: 'ns',
      dir: -1,
      roadCoord: 224,
    });
    this.addVehicle('police_4', 'police', 336 + 3.4, 286, Math.PI, {
      isTraffic: true,
      isPolice: true,
      axis: 'ns',
      dir: -1,
      roadCoord: 336,
    });
    this.addVehicle('police_5', 'police', 0 + 3.4, 398, Math.PI, {
      isTraffic: true,
      isPolice: true,
      axis: 'ns',
      dir: -1,
      roadCoord: 0,
    });
    this.addVehicle('police_6', 'police', 448 + 3.4, 290, Math.PI, {
      isTraffic: true,
      isPolice: true,
      axis: 'ns',
      dir: -1,
      roadCoord: 448,
    });
  }

  private spawnInitialNpcs(): void {
    // 1. Stationary interactive street & park vendors across all 24 NYC carts
    VENDOR_LOCATIONS.forEach((v, idx) => {
      const baseModel = NPC_CHARACTER_POOL[idx % NPC_CHARACTER_POOL.length];
      const rig = createCharacterRig(
        {
          shirtHex: v.healsPlayer ? 0xf8fafc : 0x2563eb,
          pantsHex: 0x27272a,
          accentHex: v.awningHex,
          appearance: {
            ...baseModel,
            id: `vendor_${idx}`,
            shirtHex: v.healsPlayer ? 0xf8fafc : 0x2563eb,
            pantsHex: 0x27272a,
            accentHex: v.awningHex,
            silhouette: v.healsPlayer ? 'artisan_apron' : 'kurta_pajama',
            umbrellaHex: undefined,
            raincoatHex: v.awningHex,
          },
        },
        this.shadowTex,
      );
      const nx = v.x + Math.sin(v.facing) * 1.4;
      const nz = v.z + Math.cos(v.facing) * 1.4;
      rig.root.position.set(nx, 0, nz);
      rig.root.rotation.y = v.facing;
      this.scene.add(rig.root);

      this.npcs.push({
        id: `vendor_${idx}`,
        modelId: baseModel.id,
        name: v.vendorName,
        archetype: v.healsPlayer ? 'vendor' : 'informant',
        rig,
        x: nx,
        y: 0,
        z: nz,
        vx: 0,
        vy: 0,
        vz: 0,
        heading: v.facing,
        patrolHeading: v.facing,
        patrolTimer: 4,
        isStanding: true,
        standTimer: 99,
        strafeSign: 1,
        gaitPhase: 0,
        hp: 100,
        knockoutTimer: 0,
        windupTimer: 0,
        attackCooldown: 0,
        hitFlash: 0,
        dialogue: v.lines,
        dialogueIndex: 0,
        healsChai: v.healsPlayer,
        reactionCooldown: 0,
      });
    });

    // 1b. 16 Interactive Building Shopkeepers selling NYC goods & perks outside named storefronts
    BUILDING_SHOPS.forEach((shop, idx) => {
      const baseModel = NPC_CHARACTER_POOL[(idx + 3) % NPC_CHARACTER_POOL.length];
      const rig = createCharacterRig(
        {
          shirtHex: shop.shirtHex,
          pantsHex: 0x1f2937,
          accentHex: shop.awningHex,
          appearance: {
            ...baseModel,
            id: `shopkeeper_${idx}`,
            shirtHex: shop.shirtHex,
            pantsHex: 0x1f2937,
            accentHex: shop.awningHex,
            silhouette: idx % 2 === 0 ? 'artisan_apron' : 'vice_open_shirt',
            shortSleeves: true,
            umbrellaHex: undefined,
            raincoatHex: shop.awningHex,
          },
        },
        this.shadowTex,
      );
      const nx = shop.x + Math.sin(shop.facing) * 1.65;
      const nz = shop.z + Math.cos(shop.facing) * 1.65;
      rig.root.position.set(nx, 0, nz);
      rig.root.rotation.y = shop.facing;
      this.scene.add(rig.root);

      this.npcs.push({
        id: `shopkeeper_${idx}`,
        modelId: baseModel.id,
        name: `${shop.shopkeeperName} (${shop.shopName})`,
        archetype: 'shopkeeper',
        rig,
        x: nx,
        y: 0,
        z: nz,
        vx: 0,
        vy: 0,
        vz: 0,
        heading: shop.facing,
        patrolHeading: shop.facing,
        patrolTimer: 4,
        isStanding: true,
        standTimer: 99,
        strafeSign: 1,
        gaitPhase: 0,
        hp: 100,
        knockoutTimer: 0,
        windupTimer: 0,
        attackCooldown: 0,
        hitFlash: 0,
        dialogue: shop.pitchLines,
        dialogueIndex: 0,
        shopDef: shop,
        reactionCooldown: 0,
      });
    });

    // 2. 48 Detailed Articulated NYC Commuters (drawn from the 10-model pool — paired with 290 Instanced Crowd NYC pedestrians!)
    const sidewalkSpots: Array<[number, number]> = [
      [-9.2, -38],
      [9.2, -40],
      [-9.2, -16],
      [9.2, -14],
      [-9.2, 16],
      [9.2, 20],
      [-47.2, -32],
      [-64.2, -26],
      [-64.2, -4],
      [-64.2, 24],
      [-64.2, 52],
      [-47.2, 34],
      [47.2, -32],
      [64.2, -24],
      [47.2, 18],
      [64.2, 36],
      [-22, -64.2],
      [22, -64.2],
      [-24, 9.2],
      [24, -9.2],
      [-8, -76],
      [8, -78],
      [103, -24],
      [121, 18],
      [159, -18],
      [159, 28],
      [177, 46],
      [159, 86],
      [121, 86],
      [-47, 134],
      [-9, 140],
      [9, 152],
      [47, 146],
      [103, 156],
      [215, -16],
      [233, 20],
      [215, 76],
      [271, 34],
      [271, 140],
      [-64, 198],
      [-64, 256],
      [-47, 244],
      [9, 248],
      [103, 250],
      [159, 244],
      [215, 246],
      [289, 248],
      [327, 248],
    ];

    sidewalkSpots.forEach(([rawX, rawZ], i) => {
      const snapped = snapPointToSidewalk(rawX, rawZ, i % 2 === 0 ? 1 : -1, (i % 5) / 4);
      const sx = snapped.x;
      const sz = snapped.z;
      const model = NPC_CHARACTER_POOL[i % NPC_CHARACTER_POOL.length];
      const rig = createCharacterRig(
        {
          shirtHex: model.shirtHex,
          pantsHex: model.pantsHex,
          skinHex: model.skinHex,
          accentHex: model.accentHex,
          appearance: model,
        },
        this.shadowTex,
      );
      rig.root.position.set(sx, 0, sz);
      this.scene.add(rig.root);

      const h = snapped.heading;
      const localName = NYC_PEDESTRIAN_NAMES[i % NYC_PEDESTRIAN_NAMES.length];
      const district = getDistrictAt(sx, sz, 0);
      const startsStanding = i % 3 === 0;
      this.npcs.push({
        id: `commuter_${i}`,
        modelId: model.id,
        name: `${localName} · ${model.label}`,
        archetype: 'commuter',
        rig,
        x: sx,
        y: 0,
        z: sz,
        vx: 0,
        vy: 0,
        vz: 0,
        heading: h,
        patrolHeading: h,
        patrolTimer: 3.5 + (i % 5),
        isStanding: startsStanding,
        standTimer: startsStanding ? 3.5 + (i % 5) : 6.5 + (i % 7),
        strafeSign: i % 2 === 0 ? 1 : -1,
        gaitPhase: i * 0.7,
        hp: 45,
        knockoutTimer: 0,
        windupTimer: 0,
        attackCooldown: 0,
        hitFlash: 0,
        dialogue: [getContextualTalkLine(district, 0, i)],
        dialogueIndex: 0,
        reactionCooldown: 0,
      });
    });

    // 3. Sixteen Uniformed NYPD Beat Officers patrolling Manhattan, Parks, Brooklyn, Bronx Arena & Queens!
    const policeBeatSpots: Array<[number, number, number]> = [
      [8.4, -22, Math.PI],
      [-9.2, -48, 0],
      [-47.5, -18, 0],
      [9.0, 44, Math.PI],
      [56.0, -42, Math.PI / 2],
      [-47.5, 112, 0],
      [112.0, 48, 0],
      [168.0, 12, Math.PI],
      [224.0, 130, 0],
      [280.0, 240, Math.PI],
      [-10.0, 392, 0],
      [336.0, 180, 0],
      [412.0, 244, Math.PI / 2],
      [448.0, 404, Math.PI],
      [47.5, 220, 0],
      [28.0, 62, 0],
    ];
    policeBeatSpots.forEach(([px, pz, pHeading], idx) => {
      this.spawnPoliceOfficer(px, pz, pHeading, `beat_cop_${idx}`, 0, 0);
    });
  }

  private buildParkSportsVenues(): void {
    this.parkVenues = [];
    for (const venue of PARK_SPORT_VENUES) {
      let markerRing: THREE.Mesh | null = null;
      if (venue.sport === 'cricket') {
        const pitch = createParkCricketPitchProps(venue.cx, venue.cz);
        this.scene.add(pitch.group);
        markerRing = pitch.markerRing;
      } else {
        // Subtle glowing gold/teal join circle on the streetball 3pt line
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(1.75, 2.15, 24),
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.72,
            side: THREE.DoubleSide,
          }),
        );
        ring.rotation.x = -Math.PI * 0.5;
        ring.position.set(venue.creaseX, 0.14, venue.creaseZ);
        this.scene.add(ring);
        markerRing = ring;
      }

      const ballMesh = createParkSportBallMesh(venue.sport);
      ballMesh.position.set(venue.bowlerX, 1.2, venue.bowlerZ);
      this.scene.add(ballMesh);

      const state = createInitialParkMatchState(venue);
      const players: ParkVenueRuntime['players'] = [];

      venue.npcOffsets.forEach((slot, idx) => {
        const baseModel = NPC_CHARACTER_POOL[(idx + 2) % NPC_CHARACTER_POOL.length];
        const isTeamA = slot.role === 'batter' || (venue.sport === 'streetball' && idx % 2 === 1);
        const shirtHex =
          venue.sport === 'cricket'
            ? isTeamA
              ? 0xf8fafc
              : 0x16a34a
            : isTeamA
              ? 0xf97316
              : 0x1d4ed8;
        const pantsHex = venue.sport === 'cricket' ? 0xf1f5f9 : 0x18181b;
        const rig = createCharacterRig(
          {
            shirtHex,
            pantsHex,
            skinHex: baseModel.skinHex,
            accentHex: isTeamA ? 0xfacc15 : 0x38bdf8,
            appearance: {
              ...baseModel,
              id: `${venue.id}_player_${idx}`,
              shirtHex,
              pantsHex,
              accentHex: isTeamA ? 0xfacc15 : 0x38bdf8,
              silhouette: venue.sport === 'cricket' ? 'vice_open_shirt' : 'hoodie_joggers',
              shortSleeves: true,
              umbrellaHex: undefined,
            },
          },
          this.shadowTex,
        );

        let batMesh: THREE.Group | undefined;
        if (venue.sport === 'cricket' && slot.role === 'batter') {
          batMesh = createCricketBatMesh();
          batMesh.position.set(0, -0.35, 0.15);
          batMesh.rotation.x = 0.45;
          rig.rightArm.add(batMesh);
        }

        const px = venue.cx + slot.dx;
        const pz = venue.cz + slot.dz;
        const facing = Math.atan2(venue.cx - px, venue.cz - pz);
        rig.root.position.set(px, 0.06, pz);
        rig.root.rotation.y = facing;
        this.scene.add(rig.root);

        const npc: SimNpc = {
          id: `${venue.id}_npc_${idx}`,
          modelId: baseModel.id,
          name: `${NYC_PEDESTRIAN_NAMES[(idx + 5) % NYC_PEDESTRIAN_NAMES.length]} (${venue.sport === 'cricket' ? 'Park Cricket' : 'Streetball'})`,
          archetype: venue.sport === 'cricket' ? 'cricketer' : 'baller',
          rig,
          x: px,
          y: 0.06,
          z: pz,
          vx: 0,
          vy: 0,
          vz: 0,
          heading: facing,
          patrolHeading: facing,
          patrolTimer: 99,
          isStanding: true,
          standTimer: 99,
          strafeSign: 1,
          gaitPhase: idx * 0.9,
          hp: 90,
          knockoutTimer: 0,
          windupTimer: 0,
          attackCooldown: 0,
          hitFlash: 0,
          dialogue: [
            venue.sport === 'cricket'
              ? `Live pickup cricket at ${venue.name}! Press [F] to take strike or [V] to spectate!`
              : `Next run is up at ${venue.name}! Press [F] to step in or [V] to watch courtside!`,
          ],
          dialogueIndex: 0,
          reactionCooldown: 0,
        };
        this.npcs.push(npc);
        players.push({ npc, role: slot.role, homeX: px, homeZ: pz, batMesh });
      });

      this.parkVenues.push({
        def: venue,
        state,
        ballMesh,
        markerRing,
        players,
        swingAnimTimer: 0,
      });
    }
  }

  private buildInstancedCrowd(): void {
    // Bustling NYC Sidewalks: 380 instanced pedestrians snapped cleanly onto sidewalks & plazas (keeping asphalt clear for driving!)
    const count = 380;
    const palette = NPC_CHARACTER_POOL.map((m) => ({
      shirtHex: m.shirtHex,
      pantsHex: m.pantsHex,
      skinHex: m.skinHex,
      hairHex: m.hairHex,
    }));
    this.crowdRig = createInstancedCrowdRig(count, palette);
    this.scene.add(this.crowdRig.group);
    this.crowdAgents = [];

    let seed = 42019;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const hotspots: Array<[number, number, number]> = [
      [0, -28, 36],      // Washington Square & Spawn sidewalks (immediately lively!)
      [28, 84, 24],      // Central Park Great Lawn & cricket spectators
      [56, 224, 34],     // Times Square neon sidewalks
      [56, -24, 28],     // Wall Street commuters
      [112, 140, 28],    // SoHo shoppers
      [168, 224, 28],    // Chinatown Canal St sidewalks
      [-56, 18, 26],     // Battery Park promenade
      [252, 140, 22],    // Harlem Rucker Park crowd
      [420, 252, 22],    // Flushing Meadows cricket park
      [336, 56, 26],     // Bronx Ballpark & Arena fans
    ];

    for (let i = 0; i < count; i++) {
      let rawX = 0;
      let rawZ = 0;
      const sideSign = rand() > 0.5 ? 1 : -1;
      const depthSlot = rand();

      if (i < 150) {
        const hs = hotspots[i % hotspots.length];
        const ang = rand() * Math.PI * 2;
        const rad = 8.5 + rand() * hs[2];
        rawX = hs[0] + Math.cos(ang) * rad;
        rawZ = hs[1] + Math.sin(ang) * rad;
      } else {
        // Dedicated concrete sidewalks along all 11x11 NYC avenues & cross streets
        const axisNS = i % 2 === 0;
        const rc = ROAD_COORDS[i % ROAD_COORDS.length];
        const side = sideSign * (8.45 + depthSlot * 2.15);
        const along = -88 + rand() * 610;
        rawX = axisNS ? rc + side : along;
        rawZ = axisNS ? along : rc + side;
      }

      const snapped = snapPointToSidewalk(rawX, rawZ, sideSign, depthSlot);
      const heightScale = 0.92 + rand() * 0.16;
      const isStanding = i % 5 === 0;
      // Only ~7% of pedestrians occasionally cross at intersection crosswalks; >92% stay strictly on sidewalks!
      const canCrosswalk = i % 14 === 0;

      const agent: SimCrowdAgent = {
        x: snapped.x,
        y: 0,
        z: snapped.z,
        vx: 0,
        vy: 0,
        vz: 0,
        heading: snapped.heading,
        baseSpeed: 1.4 + rand() * 0.9,
        gaitPhase: rand() * Math.PI * 2,
        heightScale,
        turnTimer: 3.5 + rand() * 5,
        pauseTimer: 3 + rand() * 6,
        isStanding,
        fleeing: false,
        canCrosswalk,
        hp: 45,
        knockoutTimer: 0,
        fallAngle: 0,
        hitFlash: 0,
        hurtCooldown: 0,
        districtName: getDistrictAt(snapped.x, snapped.z, 0),
      };
      this.crowdAgents.push(agent);
      this.crowdRig.updateAgentPose(i, agent.x, 0, agent.z, agent.heading, agent.gaitPhase, 0, agent.heightScale, false, 0, 0);
    }
    this.crowdRig.commitMatrices();
  }

  private spawnPoliceOfficer(
    x: number,
    z: number,
    heading: number,
    id: string,
    initY = 0,
    initVy = 0,
    deployedFromVehicleId?: string,
  ): SimNpc {
    const officerNames = [
      'Sgt. Kowalski',
      'Officer Rivera',
      'Officer O’Connor',
      'Det. Morales',
      'Officer Brooks',
      'Lt. Russo',
    ];
    const rig = createCharacterRig(
      {
        shirtHex: NYPD_OFFICER_SPEC.shirtHex,
        pantsHex: NYPD_OFFICER_SPEC.pantsHex,
        skinHex: NYPD_OFFICER_SPEC.skinHex,
        accentHex: NYPD_OFFICER_SPEC.accentHex,
        appearance: NYPD_OFFICER_SPEC,
      },
      this.shadowTex,
    );
    rig.root.position.set(x, initY, z);
    rig.root.rotation.y = heading;
    this.scene.add(rig.root);

    const npc: SimNpc = {
      id,
      modelId: NYPD_OFFICER_SPEC.id,
      name: `${officerNames[this.npcs.length % officerNames.length]} · NYPD`,
      archetype: 'police_officer',
      rig,
      x,
      y: initY,
      z,
      vx: Math.sin(heading) * (initVy > 0 ? 4.5 : 0),
      vy: initVy,
      vz: Math.cos(heading) * (initVy > 0 ? 4.5 : 0),
      heading,
      patrolHeading: heading,
      patrolTimer: 3.5 + (this.npcs.length % 4),
      isStanding: false,
      standTimer: 99,
      strafeSign: this.npcs.length % 2 === 0 ? 1 : -1,
      gaitPhase: this.npcs.length * 0.5,
      hp: 85,
      knockoutTimer: 0,
      windupTimer: 0,
      attackCooldown: 0.4,
      hitFlash: 0,
      dialogue: [
        'Keep it moving, citizen. Obey the Midtown traffic signals!',
        'Red light means STOP behind the crosswalk — NYPD Traffic is watching.',
        'Stay out of trouble or patrol cruisers will box you in!',
      ],
      dialogueIndex: 0,
      reactionCooldown: 0,
      deployedFromVehicleId,
    };
    this.npcs.push(npc);
    return npc;
  }

  private spawnMissionRivals(count: number, aroundX: number, aroundZ: number): void {
    this.removeMissionRivals();
    const archetypes: NpcArchetype[] = ['rival_rusher', 'rival_flanker'];
    const colors = [0xdc2626, 0x991b1b, 0x7f1d1d];
    for (let i = 0; i < count; i++) {
      const arch = archetypes[i % archetypes.length];
      const ang = (i / Math.max(1, count)) * Math.PI * 2;
      const rx = aroundX + Math.cos(ang) * 11;
      const rz = aroundZ + Math.sin(ang) * 11;
      const resolved = resolveCircleBuildingCollisions(rx, rz, 0.7);
      const rig = createCharacterRig(
        {
          shirtHex: colors[i % colors.length],
          pantsHex: 0x18181b,
          accentHex: 0xfef08a,
          isHostile: true,
        },
        this.shadowTex,
      );
      rig.root.position.set(resolved.x, 0, resolved.z);
      this.scene.add(rig.root);
      this.npcs.push({
        id: `rival_${i}_${Date.now()}`,
        modelId: 'syndicate_enforcer',
        name: 'Syndicate Enforcer',
        archetype: arch,
        rig,
        x: resolved.x,
        y: 0,
        z: resolved.z,
        vx: 0,
        vy: 0,
        vz: 0,
        heading: 0,
        patrolHeading: 0,
        patrolTimer: 0,
        isStanding: false,
        standTimer: 99,
        strafeSign: i % 2 === 0 ? 1 : -1,
        gaitPhase: 0,
        hp: 65,
        knockoutTimer: 0,
        windupTimer: 0,
        attackCooldown: 0.6,
        hitFlash: 0,
        dialogue: ['Five Families turf!'],
        dialogueIndex: 0,
        reactionCooldown: 0,
      });
    }
  }

  private removeMissionRivals(): void {
    this.npcs = this.npcs.filter((n) => {
      if (n.archetype.startsWith('rival_')) {
        this.scene.remove(n.rig.root);
        return false;
      }
      return true;
    });
  }

  private spawnMissionConvoy(count: number): void {
    this.removeMissionConvoy();
    this.convoyDisabledCount = 0;
    const lanes: Array<{ axis: TrafficAxis; roadCoord: number; dir: 1 | -1; along: number }> = [
      { axis: 'ns', roadCoord: 56, dir: -1, along: 22 },
      { axis: 'ew', roadCoord: 0, dir: -1, along: 34 },
    ];
    for (let i = 0; i < count; i++) {
      const l = lanes[i % lanes.length];
      const lane = getNycLaneCoord(l.axis, l.dir, l.roadCoord);
      const x = l.axis === 'ns' ? lane : l.along;
      const z = l.axis === 'ns' ? l.along : lane;
      const heading =
        l.axis === 'ns' ? (l.dir === 1 ? 0 : Math.PI) : l.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      this.addVehicle(`convoy_${i}`, 'syndicate_van', x, z, heading, {
        isTraffic: true,
        isConvoy: true,
        axis: l.axis,
        dir: l.dir,
        roadCoord: l.roadCoord,
      });
    }
  }

  private removeMissionConvoy(): void {
    this.vehicles = this.vehicles.filter((v) => {
      if (v.isConvoy && v !== this.activeVehicle) {
        this.scene.remove(v.rig.root);
        return false;
      }
      return true;
    });
  }

  private clearInteractiveMissionActors(): void {
    if (this.missionStepPropGroup) {
      this.scene.remove(this.missionStepPropGroup);
      this.missionStepPropGroup = null;
    }
    for (const item of this.missionCollectMeshes) {
      this.scene.remove(item.mesh);
    }
    this.missionCollectMeshes = [];
    if (this.missionContactNpcId) {
      const targetId = this.missionContactNpcId;
      this.npcs = this.npcs.filter((n) => {
        if (n.id === targetId) {
          this.scene.remove(n.rig.root);
          return false;
        }
        return true;
      });
      this.missionContactNpcId = null;
    }
    this.syncedMissionStepKey = '';
    this.pendingMissionEvents = {
      talked: false,
      taskDone: false,
      confronted: false,
      boughtShop: false,
      changedOutfit: false,
      parkRunsDelta: 0,
    };
  }

  private buildInteractiveMissionProp(kind: 'generator' | 'terminal' | 'crate'): THREE.Group {
    const g = new THREE.Group();
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.65 });
    const accentGlow = new THREE.MeshStandardMaterial({
      color: kind === 'generator' ? 0xfef08a : 0xe0f2fe,
      emissive: kind === 'generator' ? 0xf59e0b : 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });

    if (kind === 'generator') {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 1.35, 1.05),
        new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.52, metalness: 0.35 }),
      );
      body.position.y = 0.68;
      g.add(body);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.16, 1.15), darkMetal);
      lid.position.y = 1.42;
      g.add(lid);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.52, 0.08), accentGlow);
      panel.position.set(0, 0.85, 0.54);
      g.add(panel);
      const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 8), darkMetal);
      coil.position.set(0.45, 1.72, 0);
      g.add(coil);
    } else if (kind === 'terminal') {
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.55, 0.55), darkMetal);
      pedestal.position.y = 0.78;
      g.add(pedestal);
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.56, 0.08), accentGlow);
      screen.position.set(0, 1.22, 0.29);
      screen.rotation.x = -0.18;
      g.add(screen);
      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.1, 6), darkMetal);
      antenna.position.set(0.28, 2.05, -0.12);
      g.add(antenna);
      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xfecaca, emissive: 0xef4444, emissiveIntensity: 2.0 }),
      );
      tip.position.set(0.28, 2.62, -0.12);
      g.add(tip);
    } else {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.85, 1.1),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.72 }),
      );
      crate.position.y = 0.42;
      g.add(crate);
      const band = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.14, 1.16), accentGlow);
      band.position.y = 0.48;
      g.add(band);
    }

    // Ground highlight ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.25, 1.65, 24),
      new THREE.MeshBasicMaterial({
        color: kind === 'generator' ? 0xfbbf24 : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);
    return g;
  }

  private syncInteractiveMissionStep(step: MissionStepDef | null, stepKey: string): void {
    if (this.syncedMissionStepKey === stepKey) return;
    this.clearInteractiveMissionActors();
    this.syncedMissionStepKey = stepKey;
    if (!step) return;

    if ((step.type === 'talk_npc' || step.type === 'confront_target') && step.targetX !== undefined && step.targetZ !== undefined) {
      const npcId = `mission_actor_${step.id}`;
      const shirtHex = step.npcShirtHex ?? (step.type === 'confront_target' ? 0xb91c1c : 0x0f766e);
      const rig = createCharacterRig(
        {
          shirtHex,
          pantsHex: 0x1e293b,
          skinHex: 0xc68652,
          accentHex: step.type === 'confront_target' ? 0xef4444 : 0xfbbf24,
        },
        this.shadowTex,
      );
      // Floating glowing overhead mission indicator diamond above the character!
      const halo = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({
          color: step.type === 'confront_target' ? 0xfca5a5 : 0xfef08a,
          emissive: step.type === 'confront_target' ? 0xef4444 : 0xf59e0b,
          emissiveIntensity: 1.7,
        }),
      );
      halo.position.y = 2.45;
      rig.root.add(halo);

      const elev = sampleWorldElevation(step.targetX, step.targetZ, 0).groundY;
      rig.root.position.set(step.targetX, elev, step.targetZ);
      rig.applyWeatherGear(this.weatherState.target, this.weatherVisuals.rainIntensity);
      this.scene.add(rig.root);

      this.npcs.push({
        id: npcId,
        modelId: 'mission_contact',
        name: step.npcName ?? 'NYC Contact',
        archetype: 'mission_contact',
        rig,
        x: step.targetX,
        y: elev,
        z: step.targetZ,
        vx: 0,
        vy: 0,
        vz: 0,
        heading: Math.atan2(this.playerX - step.targetX, this.playerZ - step.targetZ),
        patrolHeading: 0,
        patrolTimer: 99,
        isStanding: true,
        standTimer: 999,
        strafeSign: 1,
        gaitPhase: 0,
        hp: 100,
        attackCooldown: 0,
        windupTimer: 0,
        hitFlash: 0,
        knockoutTimer: 0,
        dialogue: [step.npcDialogue ?? step.label],
        dialogueIndex: 0,
        healsChai: false,
        reactionCooldown: 999,
      });
      this.missionContactNpcId = npcId;
    } else if (step.type === 'perform_task' && step.targetX !== undefined && step.targetZ !== undefined) {
      const prop = this.buildInteractiveMissionProp(step.taskPropKind ?? 'terminal');
      const elev = sampleWorldElevation(step.targetX, step.targetZ, 0).groundY;
      prop.position.set(step.targetX, elev, step.targetZ);
      this.scene.add(prop);
      this.missionStepPropGroup = prop;
    } else if (step.type === 'collect_items' && step.collectPoints) {
      const collected = this.activeMission?.collectedIndices ?? [];
      step.collectPoints.forEach((pt, idx) => {
        if (collected.includes(idx)) return;
        const itemGroup = new THREE.Group();
        const caseMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, 0.52, 0.52),
          new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            emissive: 0xd97706,
            emissiveIntensity: 0.75,
            roughness: 0.25,
            metalness: 0.55,
          }),
        );
        caseMesh.position.y = 1.05;
        itemGroup.add(caseMesh);
        const beam = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.45, 7.5, 10, 1, true),
          new THREE.MeshBasicMaterial({
            color: 0xfef08a,
            transparent: true,
            opacity: 0.26,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        beam.position.y = 3.8;
        itemGroup.add(beam);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.85, 1.2, 20),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.08;
        itemGroup.add(ring);
        const elev = sampleWorldElevation(pt.x, pt.z, 0).groundY;
        itemGroup.position.set(pt.x, elev, pt.z);
        this.scene.add(itemGroup);
        this.missionCollectMeshes.push({
          index: idx,
          mesh: itemGroup,
          x: pt.x,
          z: pt.z,
          label: pt.label ?? `Item #${idx + 1}`,
        });
      });
    }
  }

  // ============== PUBLIC GAME LIFECYCLE API ==============

  public start(): void {
    this.audio.unlock();
    this.clearInputs();
    this.gameState = 'playing';
    this.endRun = null;
    document.body.dataset.state = 'playing';
    this.mouseYawOffset = 0;
    this.cameraYaw = this.playerHeading;
    this.minimapDirty = true;
    this.smoothSteer = 0;

    // Frame camera behind player facing Gateway Arch immediately
    const bx = this.playerX - Math.sin(this.playerHeading) * 6.5;
    const bz = this.playerZ - Math.cos(this.playerHeading) * 6.5;
    this.camPos.set(bx, 3.6, bz);
    this.camLook.set(
      this.playerX + Math.sin(this.playerHeading) * 14,
      2.2,
      this.playerZ + Math.cos(this.playerHeading) * 14,
    );

    if (!this.activeMission && this.completedMissionIds.length === 0) {
      this.showToast(
        'Welcome to New York Vice',
        'Press [E] to jump into a parked Supercar or NYC Cab right ahead, or press [M] for NYC jobs!',
        'amber',
        6.5,
      );
    }
    this.pushHudSnapshot(true);
  }

  public pause(): void {
    if (this.gameState !== 'playing') return;
    this.gameState = 'paused';
    document.body.dataset.state = 'paused';
    this.clearInputs();
    this.audio.silenceLoops();
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.pushHudSnapshot(true);
  }

  public resume(): void {
    if (this.gameState !== 'paused') return;
    this.audio.unlock();
    this.clearInputs();
    this.gameState = 'playing';
    document.body.dataset.state = 'playing';
    this.pushHudSnapshot(true);
  }

  public returnToTitle(): void {
    this.resetWorldState(false);
    this.gameState = 'title';
    document.body.dataset.state = 'title';
    this.audio.silenceLoops();
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.pushHudSnapshot(true);
  }

  public restart(): void {
    const respawnLabel = this.resetWorldState(true);
    this.start();
    if (respawnLabel) {
      this.showToast(
        `Respawned · ${respawnLabel}`,
        'Fresh New York neighborhood! An NYC Yellow Cab is parked right beside you — press [E] to drive.',
        'teal',
        5.0,
      );
      this.pushHudSnapshot(true);
    }
  }

  public continueFreeRoam(): void {
    if (this.gameState !== 'gameover') return;
    const wasDefeat = this.endRun?.reason === 'wasted' || this.endRun?.reason === 'busted';
    this.endRun = null;
    this.playerHp = this.playerMaxHp;
    this.wanted = { heat: 0, stars: 0, evadeTimer: 0, bustedProgress: 0 };
    if (wasDefeat) {
      this.leaveParkSport(true);
      this.exitVehicle(true);
      const rp = selectRespawnPoint(this.playerX, this.playerZ, this.respawnAttempt++);
      this.playerX = rp.x;
      this.playerY = 0;
      this.playerZ = rp.z;
      this.playerVx = 0;
      this.playerVz = 0;
      this.playerVy = 0;
      this.playerHeading = rp.heading;
      this.cameraYaw = rp.heading;
      this.minimapDirty = true;
      this.syncPlayerAvatarVisibilityAndPose();

      const getaway = this.vehicles.find((v) => v.id === 'hero_taxi');
      if (getaway) {
        getaway.hp = getaway.maxHp;
        getaway.disabled = false;
        getaway.phys.x = rp.x + 2.8;
        getaway.phys.z = rp.z - 2.2;
        getaway.phys.y = 0;
        getaway.phys.vx = 0;
        getaway.phys.vz = 0;
        getaway.phys.speed = 0;
        getaway.phys.heading = rp.heading;
        getaway.rig.root.position.set(getaway.phys.x, 0, getaway.phys.z);
        getaway.rig.root.rotation.y = getaway.phys.heading;
      }

      const bx = this.playerX - Math.sin(this.playerHeading) * 6.5;
      const bz = this.playerZ - Math.cos(this.playerHeading) * 6.5;
      this.camPos.set(bx, 3.6, bz);
      this.camLook.set(
        this.playerX + Math.sin(this.playerHeading) * 14,
        2.2,
        this.playerZ + Math.cos(this.playerHeading) * 14,
      );
      this.showToast(
        `Respawned · ${rp.name}`,
        'Back on the NYC streets in a new borough — Yellow Cab parked right beside you!',
        'teal',
        4.8,
      );
    }
    this.gameState = 'playing';
    document.body.dataset.state = 'playing';
    this.pushHudSnapshot(true);
  }

  private resetWorldState(useRandomRespawn = false): string | null {
    this.clearInputs();
    this.leaveParkSport(true);
    this.exitVehicle(true);
    this.removeMissionRivals();
    this.removeMissionConvoy();

    const respawnPoint = useRandomRespawn
      ? selectRespawnPoint(this.playerX, this.playerZ, this.respawnAttempt++)
      : null;

    this.playerX = respawnPoint ? respawnPoint.x : PLAYER_SPAWN.x;
    this.playerY = 0;
    this.playerZ = respawnPoint ? respawnPoint.z : PLAYER_SPAWN.z;
    this.playerVx = 0;
    this.playerVz = 0;
    this.playerVy = 0;
    this.playerHeading = respawnPoint ? respawnPoint.heading : PLAYER_SPAWN.heading;
    this.playerLoco = createInitialHumanLocomotion(this.playerHeading);
    this.cameraYaw = this.playerHeading;
    this.minimapDirty = true;
    this.smoothSteer = 0;
    this.shoveAnimTimer = 0;
    this.playerHp = this.playerMaxHp;
    this.damageGraceTimer = 0;
    this.timeSinceDamage = 99;
    this.hpRegenerating = false;
    this.damageFlash = 0;
    this.regenParticleAcc = 0;
    this.playerStamina = 100;
    this.vehicleBoost = 100;
    this.cash = 1200;
    this.timePlayedSec = 0;
    this.distanceMetersTotal = 0;
    this.topSpeedKmh = 0;
    this.wantedPeak = 0;
    this.wanted = { heat: 0, stars: 0, evadeTimer: 0, bustedProgress: 0 };
    this.wantedCooldownRatio = 0;
    this.activeMission = null;
    this.completedMissionIds = [];
    this.convoyDisabledCount = 0;
    this.endRun = null;
    this.missionBeaconGroup.visible = false;
    this.clearInteractiveMissionActors();

    this.syncPlayerAvatarVisibilityAndPose();

    for (const v of this.vehicles) {
      v.hp = v.maxHp;
      v.disabled = false;
      v.suspPitch = 0;
      v.suspRoll = 0;
      v.prevSpeed = 0;
      if (v.id === 'hero_taxi') {
        v.phys.x = respawnPoint ? respawnPoint.x + 2.8 : -3.2;
        v.phys.z = respawnPoint ? respawnPoint.z - 2.2 : -27.2;
        v.phys.heading = respawnPoint ? respawnPoint.heading : Math.PI;
        v.phys.vx = 0;
        v.phys.vz = 0;
        v.phys.speed = 0;
      } else if (v.id === 'hero_auto') {
        v.phys.x = 3.4;
        v.phys.z = -28.0;
        v.phys.heading = Math.PI;
        v.phys.vx = 0;
        v.phys.vz = 0;
        v.phys.speed = 0;
      } else if (v.id === 'hero_gt') {
        v.phys.x = -56;
        v.phys.z = 74;
        v.phys.heading = Math.PI;
        v.phys.vx = 0;
        v.phys.vz = 0;
        v.phys.speed = 0;
      } else if (v.id === 'hero_bus') {
        v.phys.x = 4.0;
        v.phys.z = 20.0;
        v.phys.heading = Math.PI;
        v.phys.vx = 0;
        v.phys.vz = 0;
        v.phys.speed = 0;
      } else if (v.id === 'battery_ferry') {
        v.phys.x = -120;
        v.phys.z = -96;
        v.phys.heading = -Math.PI / 2;
        v.phys.vx = 0;
        v.phys.vz = 0;
        v.phys.speed = 0;
      } else if (v.id === 'battery_speedboat') {
        v.phys.x = -120;
        v.phys.z = -68;
        v.phys.heading = -Math.PI / 2;
        v.phys.vx = 0;
        v.phys.vz = 0;
        v.phys.speed = 0;
      }
      const restY = VEHICLE_SPECS[v.type].isWatercraft ? -0.55 : 0;
      v.phys.y = restY;
      v.rig.root.position.set(v.phys.x, restY, v.phys.z);
      v.rig.root.rotation.y = v.phys.heading;
    }
    if (!useRandomRespawn) {
      this.weatherState = createInitialWeatherState('clear_sunset');
      this.weatherVisuals = computeWeatherVisuals(this.weatherState);
    }
    return respawnPoint ? respawnPoint.name : null;
  }

  public acceptMission(missionId: string): void {
    const def = getMissionById(missionId);
    if (!def) return;
    const st = createActiveMission(missionId, this.completedMissionIds);
    if (!st) return;

    this.leaveParkSport(true);
    this.clearStreetEvent();
    this.activeMission = st;
    this.removeMissionRivals();
    this.removeMissionConvoy();
    this.clearInteractiveMissionActors();
    this.syncInteractiveMissionStep(def.steps[0] ?? null, `${def.id}:0`);

    if (def.initialWantedHeat) {
      this.wanted = addWantedHeat({ heat: 0, stars: 0, evadeTimer: 0, bustedProgress: 0 }, def.initialWantedHeat);
      this.wantedPeak = Math.max(this.wantedPeak, this.wanted.stars);
    }
    if (def.spawnRivals) {
      this.spawnMissionRivals(def.spawnRivals, def.startX, def.startZ);
    }
    if (def.spawnConvoyCount) {
      this.spawnMissionConvoy(def.spawnConvoyCount);
    }
    if (def.recommendedWeather) {
      this.weatherState = setTargetWeather(
        this.weatherState,
        def.recommendedWeather,
        def.recommendedWeather === 'heavy_monsoon',
      );
      this.weatherVisuals = computeWeatherVisuals(this.weatherState);
      if (def.recommendedWeather === 'heavy_monsoon') {
        this.audio.playThunder();
      }
    }

    this.audio.playChime([440, 554.37, 659.25]);
    this.showToast(
      `Mission · ${def.title}`,
      def.steps[0].radioCallout ?? def.steps[0].label,
      def.recommendedWeather === 'heavy_monsoon' ? 'red' : 'amber',
      5.5,
    );
    this.pushHudSnapshot(true);
  }

  public abandonMission(): void {
    if (!this.activeMission) return;
    this.activeMission = null;
    this.removeMissionRivals();
    this.removeMissionConvoy();
    this.clearInteractiveMissionActors();
    this.missionBeaconGroup.visible = false;
    this.showToast('NYC Dispatch', 'Mission cancelled. Free roam active.', 'teal', 3.0);
    this.pushHudSnapshot(true);
  }

  public toggleMute(): void {
    this.audio.unlock();
    this.audio.setMuted(!this.audio.isMuted());
    this.pushHudSnapshot(true);
  }

  public cycleRadioStation(): void {
    this.audio.unlock();
    const meta = this.audio.cycleRadioStation();
    this.showToast(
      `Radio · ${meta.label}`,
      meta.id === 'off'
        ? 'Radio muted. Ambient NYC street soundscape active.'
        : `${meta.vibe} · Plays automatically while driving or running. Press [R] to switch.`,
      meta.id === 'off' ? 'teal' : 'amber',
      3.0,
    );
    this.pushHudSnapshot(true);
  }

  public cycleCamera(): void {
    const order: CameraMode[] = ['chase', 'cinematic', 'hood'];
    const idx = order.indexOf(this.cameraMode);
    this.cameraMode = order[(idx + 1) % order.length];
    this.pushHudSnapshot(true);
  }

  public cycleWeather(): void {
    const next = cycleWeatherKind(this.weatherState.target);
    this.weatherState = setTargetWeather(this.weatherState, next, true);
    this.weatherVisuals = computeWeatherVisuals(this.weatherState);
    if (next === 'heavy_monsoon') {
      this.audio.playThunder();
    } else {
      this.audio.playChime([440, 587.33]);
    }
    const label = getWeatherLabel(next);
    const desc =
      next === 'heavy_monsoon'
        ? 'Atlantic Nor’easter! Slick Manhattan asphalt, rising Hudson swells & lightning.'
        : next === 'light_drizzle'
          ? 'Light NYC drizzle drifting over Midtown & Battery Park.'
          : 'Golden Hudson sunset gleaming off the Empire Spire & Washington Square.';
    this.showToast(`Weather · ${label}`, desc, next === 'heavy_monsoon' ? 'red' : 'teal', 3.4);
    this.lastWeatherGearBucket = '';
    this.pushHudSnapshot(true);
  }

  public cyclePlayerOutfit(): void {
    this.audio.unlock();
    // If multiple custom .GLB outfits are saved and active, [O] cycles through them!
    if (this.activeCustomGlbId && this.savedGlbRecords.length >= 2) {
      const curIdx = this.savedGlbRecords.findIndex((r) => r.id === this.activeCustomGlbId);
      const nextRec = this.savedGlbRecords[(curIdx + 1) % this.savedGlbRecords.length];
      this.pendingMissionEvents.changedOutfit = true;
      void this.selectCustomGlbModel(nextRec.id);
      return;
    }

    this.playerOutfitIndex = cyclePlayerOutfitIndex(this.playerOutfitIndex);
    const outfit = PLAYER_OUTFITS[this.playerOutfitIndex];

    const prevPos = this.playerRig.root.position.clone();
    const prevRotY = this.playerRig.root.rotation.y;
    this.scene.remove(this.playerRig.root);

    this.playerRig = createCharacterRig(
      {
        shirtHex: outfit.shirtHex,
        pantsHex: outfit.pantsHex,
        skinHex: outfit.skinHex,
        accentHex: outfit.accentHex,
        isPlayer: true,
        appearance: outfit,
      },
      this.shadowTex,
    );
    this.playerRig.root.position.copy(prevPos);
    this.playerRig.root.rotation.y = prevRotY;
    this.playerRig.applyWeatherGear(this.weatherState.target, this.weatherVisuals.rainIntensity);
    this.scene.add(this.playerRig.root);
    this.playerBatMesh = null;
    this.syncPlayerAvatarVisibilityAndPose();

    this.audio.playChime([523.25, 659.25]);
    if (!this.activeVehicle) {
      this.spawnParticles(this.playerX, this.playerY + 1.15, this.playerZ, 14, outfit.accentHex, 3.8, 0.5, 0.32);
    }
    this.pendingMissionEvents.changedOutfit = true;
    this.showToast(
      `Wardrobe · ${outfit.label}`,
      `Camila changed into ${outfit.label} (${this.playerOutfitIndex + 1}/${PLAYER_OUTFITS.length}). Press [O] for next look.`,
      'amber',
      3.0,
    );
    this.pushHudSnapshot(true);
  }

  public teleportTo(x: number, z: number, heading = Math.PI): void {
    if (this.activeVehicle) {
      this.exitVehicle(true);
    }
    if (this.activeParkVenueId) {
      this.leaveParkSport(true);
    }
    this.playerX = x;
    this.playerZ = z;
    this.playerY = sampleWorldElevation(x, z, 0).groundY;
    this.playerVx = 0;
    this.playerVz = 0;
    this.playerVy = 0;
    this.playerHeading = heading;
    this.playerLoco = createInitialHumanLocomotion(heading);
    this.cameraYaw = heading;
    this.minimapDirty = true;
    this.mouseYawOffset = 0;
    this.syncPlayerAvatarVisibilityAndPose();
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    this.camPos.set(this.playerX - fx * 6.5, this.playerY + 3.4, this.playerZ - fz * 6.5);
    this.camLook.set(this.playerX + fx * 8, this.playerY + 1.6, this.playerZ + fz * 8);
    this.pushHudSnapshot(true);
  }

  private findNearbyParkVenue(): ParkVenueRuntime | null {
    let best: ParkVenueRuntime | null = null;
    let bestDist = Infinity;
    for (const v of this.parkVenues) {
      const d = Math.hypot(this.playerX - v.def.cx, this.playerZ - v.def.cz);
      if (d <= v.def.interactRadius && d < bestDist) {
        bestDist = d;
        best = v;
      }
    }
    return best;
  }

  public joinNearbyParkSport(): boolean {
    if (this.gameState !== 'playing' || this.activeVehicle) return false;
    const venue = this.activeParkVenueId
      ? this.parkVenues.find((v) => v.def.id === this.activeParkVenueId) ?? null
      : this.findNearbyParkVenue();
    if (!venue) return false;

    this.audio.unlock();
    this.activeParkVenueId = venue.def.id;
    venue.state = startPlayerJoinMatch(venue.def, venue.state);

    // Position Marcus right at the batting crease / 3-point arc facing bowler / hoop
    this.playerX = venue.def.creaseX;
    this.playerZ = venue.def.creaseZ;
    this.playerY = 0.18;
    this.playerVx = 0;
    this.playerVz = 0;
    this.playerHeading = Math.atan2(venue.def.bowlerX - venue.def.creaseX, venue.def.bowlerZ - venue.def.creaseZ);
    this.syncPlayerAvatarVisibilityAndPose();

    // Hide NPC batter while Marcus steps up to the crease
    for (const p of venue.players) {
      if (p.role === 'batter') p.npc.rig.root.visible = false;
    }

    // Equip prominent wooden cricket bat in Marcus's right hand for cricket venues
    if (venue.def.sport === 'cricket') {
      if (!this.playerBatMesh) {
        this.playerBatMesh = createCricketBatMesh();
        this.playerBatMesh.scale.set(1.28, 1.28, 1.28);
        this.playerBatMesh.position.set(0.14, -0.36, 0.26);
        this.playerBatMesh.rotation.set(0.62, 0.12, -0.38);
        this.playerRig.rightArm.add(this.playerBatMesh);
      }
      this.playerBatMesh.visible = true;
    } else if (this.playerBatMesh) {
      this.playerBatMesh.visible = false;
    }

    this.audio.playChime([523.25, 659.25, 783.99]);
    this.showToast(
      venue.def.name,
      venue.def.sport === 'cricket'
        ? 'You are at the crease! Press [SPACE] or Click when the timing bar enters the GOLD zone!'
        : 'Step to the arc! Press [SPACE] or Click in the GOLD zone to drain buckets!',
      'teal',
      4.2,
    );
    this.pushHudSnapshot(true);
    return true;
  }

  public spectateNearbyParkSport(): boolean {
    if (this.gameState !== 'playing' || this.activeVehicle) return false;
    if (this.activeParkVenueId) {
      const current = this.parkVenues.find((v) => v.def.id === this.activeParkVenueId);
      if (current?.state.mode === 'spectating') {
        this.leaveParkSport(false);
        return true;
      }
    }
    const venue = this.findNearbyParkVenue();
    if (!venue) return false;

    this.audio.unlock();
    this.activeParkVenueId = venue.def.id;
    venue.state = startPlayerSpectateMatch(venue.def, venue.state);
    this.audio.playChime([493.88, 659.25]);
    this.showToast(
      `Spectating · ${venue.def.name}`,
      'Broadcast camera live! Press [F] anytime to jump in and play, or [Esc]/[V] to walk away.',
      'amber',
      3.8,
    );
    this.pushHudSnapshot(true);
    return true;
  }

  public triggerParkSportSwingOrShoot(): void {
    if (!this.activeParkVenueId) return;
    const venue = this.parkVenues.find((v) => v.def.id === this.activeParkVenueId);
    if (!venue || venue.state.mode !== 'joined') return;

    const res = triggerPlayerSportAction(venue.def, venue.state);
    venue.state = res.next;
    if (res.hitEvent) {
      venue.swingAnimTimer = 0.42;
      this.shoveAnimTimer = 0.32;
      this.squashX = 1.16;
      this.squashY = 0.86;
      if (res.hitEvent.runs > 0) {
        this.pendingMissionEvents.parkRunsDelta += res.hitEvent.runs;
      }
      if (res.hitEvent.runs >= 4) {
        this.audio.playChime([523.25, 659.25, 783.99, 1046.5]);
        this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.25);
        this.spawnParticles(venue.def.creaseX, 1.3, venue.def.creaseZ, 18, 0xfbbf24, 6.2, 0.85, 0.6);
      } else if (res.hitEvent.runs > 0) {
        this.audio.playChime([523.25, 659.25]);
        this.spawnParticles(venue.def.creaseX, 1.1, venue.def.creaseZ, 10, 0x38bdf8, 4.2, 0.65, 0.45);
      } else if (res.hitEvent.wicket) {
        this.audio.playCrash(0.45);
        this.spawnParticles(venue.def.creaseX, 0.8, venue.def.creaseZ + 0.5, 12, 0xef4444, 4.0, 0.6, 0.4);
      } else {
        this.audio.playJump();
      }
      this.pushHudSnapshot(true);
    }
  }

  public leaveParkSport(silent = false): void {
    if (!this.activeParkVenueId) return;
    const venue = this.parkVenues.find((v) => v.def.id === this.activeParkVenueId);
    if (venue) {
      venue.state = exitPlayerParkMatch(venue.def, venue.state);
      for (const p of venue.players) {
        p.npc.rig.root.visible = true;
      }
      // Step Marcus cleanly to the sideline
      this.playerX = venue.def.cx + 12;
      this.playerZ = venue.def.cz + 6;
      this.syncPlayerAvatarVisibilityAndPose();
    }
    if (this.playerBatMesh) {
      this.playerBatMesh.visible = false;
    }
    this.activeParkVenueId = null;
    if (!silent) {
      this.showToast('Park Sports', 'Stepped off the field — explore New York or grab a hot dog nearby!', 'amber', 2.6);
      this.pushHudSnapshot(true);
    }
  }

  public triggerHonkOrAction(): void {
    if (this.gameState !== 'playing' || this.subwayRide) return;
    this.audio.unlock();
    if (this.activeVehicle) {
      this.audio.playHorn(this.activeVehicle.type);
      this.lastHonkTime = this.simTime;
      // Honking near a waiting Red-Light Street Racer accepts the sprint challenge!
      if (this.activeStreetEvent?.kind === 'street_race' && this.activeStreetEvent.phase === 'available') {
        const dRacer = Math.hypot(
          this.playerX - this.activeStreetEvent.targetX,
          this.playerZ - this.activeStreetEvent.targetZ,
        );
        if (dRacer < 34) {
          this.pendingStreetEvent.acceptedRace = true;
        }
      }
      // Nearby pedestrians jump out of the way when honked at!
      for (const npc of this.npcs) {
        if (npc.archetype !== 'commuter') continue;
        const dx = npc.x - this.playerX;
        const dz = npc.z - this.playerZ;
        if (dx * dx + dz * dz < 144) {
          npc.patrolHeading = Math.atan2(dx, dz);
          npc.patrolTimer = 2.0;
        }
      }
      return;
    }

    // On-foot melee punch / street shove combo against BOTH interactive NPCs and instanced crowd pedestrians!
    if (this.attackCooldown > 0) return;
    this.attackCooldown = 0.36;
    this.punchDuration = 0.3;
    this.shoveAnimTimer = this.punchDuration;
    this.punchComboHand = this.punchComboHand === 1 ? -1 : 1;
    this.lastShoveTime = this.simTime;
    this.audio.playJump();

    const fx = Math.sin(this.playerHeading);
    const fz = Math.cos(this.playerHeading);
    const curRunSpeed = Math.hypot(this.playerLoco.vx, this.playerLoco.vz);
    this.playerLoco.vx += fx * 3.8;
    this.playerLoco.vz += fz * 3.8;
    this.playerVx = this.playerLoco.vx;
    this.playerVz = this.playerLoco.vz;

    const isHeavyStrike = curRunSpeed > 5.8;
    const baseMeleeDmg = isHeavyStrike ? 48 : 34;
    let landedAnyHit = false;
    let hurtCivilian = false;
    let hurtSpeaker = '';

    // 1. Check all detailed articulated NPCs (commuters, rivals, beat cops, purse snatcher, mission targets)
    for (const npc of this.npcs) {
      if (npc.knockoutTimer > 0 || npc.archetype === 'cricketer' || npc.archetype === 'baller') continue;
      const dx = npc.x - this.playerX;
      const dz = npc.z - this.playerZ;
      const dist = Math.hypot(dx, dz);

      // Purse Snatcher spontaneous street event takedown [Q / Click]!
      if (npc.id === this.streetEventNpcId && this.activeStreetEvent?.kind === 'purse_snatcher' && dist < 4.8) {
        npc.hitFlash = 0.24;
        npc.knockoutTimer = 4.5;
        npc.vx = (dx / (dist || 1)) * 8.5;
        npc.vy = 2.6;
        npc.vz = (dz / (dist || 1)) * 8.5;
        this.hitstopTimer = 0.045;
        this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.36);
        this.audio.playChime([523.25, 659.25, 783.99]);
        this.spawnParticles(npc.x, 1.2, npc.z, 22, 0xfbbf24, 6.2, 0.9, 0.58);
        this.pendingStreetEvent.thiefStopped = true;
        this.pushHudSnapshot(true);
        return;
      }

      // Special mission hustler confrontation [Q / Click]!
      if (npc.id === this.missionContactNpcId && this.activeMission && dist < 4.6) {
        const def = getMissionById(this.activeMission.missionId);
        const step = def?.steps[this.activeMission.stepIndex];
        if (step?.type === 'confront_target') {
          npc.hitFlash = 0.22;
          npc.vx = (dx / (dist || 1)) * 7.2;
          npc.vy = 2.0;
          npc.vz = (dz / (dist || 1)) * 7.2;
          this.hitstopTimer = 0.04;
          this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.3);
          this.audio.playChime([523.25, 659.25, 783.99]);
          this.spawnParticles(npc.x, 1.2, npc.z, 18, 0xfbbf24, 6.2, 0.85, 0.55);
          this.showToast(step.npcName ?? npc.name, step.npcDialogue ?? 'Handed over the stolen goods!', 'amber', 4.4);
          this.pendingMissionEvents.confronted = true;
          this.pushHudSnapshot(true);
          continue;
        }
      }

      if (npc.archetype === 'mission_contact') continue;

      const hit = evaluateMeleeHit({
        playerX: this.playerX,
        playerZ: this.playerZ,
        playerHeading: this.playerHeading,
        targetX: npc.x,
        targetZ: npc.z,
        reach: 3.6,
      });
      if (!hit.hit) continue;

      landedAnyHit = true;
      npc.hp -= baseMeleeDmg;
      npc.hitFlash = 0.22;
      npc.vx = hit.dirX * (isHeavyStrike ? 10.8 : 8.4);
      npc.vy = isHeavyStrike ? 2.8 : 1.7;
      npc.vz = hit.dirZ * (isHeavyStrike ? 10.8 : 8.4);
      npc.heading = Math.atan2(-hit.dirX, -hit.dirZ);
      this.spawnParticles(npc.x, 1.25, npc.z, 14, 0xf43f5e, 5.8, 0.72, 0.46);

      if (npc.hp <= 0) {
        npc.knockoutTimer = npc.archetype.startsWith('rival_') ? 0.65 : 3.4;
        if (npc.archetype.startsWith('rival_')) {
          this.cash += 250;
          this.showToast('Rival Down', 'Syndicate enforcer knocked out (+$250)', 'amber', 2.4);
        } else {
          hurtCivilian = true;
          hurtSpeaker = npc.name;
          this.addHeat(28);
        }
      } else if (!npc.archetype.startsWith('rival_')) {
        hurtCivilian = true;
        hurtSpeaker = npc.name;
        this.addHeat(14);
      }
    }

    // 2. Check ALL 380 instanced crowd pedestrians so EVERY pedestrian on the street can be punched & knocked down!
    for (let i = 0; i < this.crowdAgents.length; i++) {
      const a = this.crowdAgents[i];
      if (a.knockoutTimer > 0) continue;
      const hit = evaluateMeleeHit({
        playerX: this.playerX,
        playerZ: this.playerZ,
        playerHeading: this.playerHeading,
        targetX: a.x,
        targetZ: a.z,
        reach: 3.6,
      });
      if (!hit.hit) continue;

      landedAnyHit = true;
      hurtCivilian = true;
      if (!hurtSpeaker) {
        hurtSpeaker = NYC_PEDESTRIAN_NAMES[i % NYC_PEDESTRIAN_NAMES.length];
      }
      a.hp -= baseMeleeDmg;
      a.hitFlash = 0.26;
      a.isStanding = false;
      a.fleeing = true;
      a.vx = hit.dirX * (isHeavyStrike ? 10.4 : 8.0);
      a.vy = isHeavyStrike ? 2.9 : 1.8;
      a.vz = hit.dirZ * (isHeavyStrike ? 10.4 : 8.0);
      a.heading = Math.atan2(-hit.dirX, -hit.dirZ);
      a.hurtCooldown = 0.4;
      this.spawnParticles(a.x, 1.25, a.z, 14, 0xf43f5e, 5.6, 0.72, 0.45);

      if (a.hp <= 0 || isHeavyStrike) {
        a.knockoutTimer = 3.6;
        a.hp = 0;
        this.addHeat(24);
      } else {
        this.addHeat(12);
      }
    }

    if (landedAnyHit) {
      this.hitstopTimer = 0.045;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.34);
      this.audio.playCrash(0.55);
      if (hurtCivilian) {
        const hurtLines = [
          'Hey! Watch it — you just clocked me!',
          'Whoa! Somebody call NYPD!',
          'Agh! Back off, lunatic!',
          'Ow! What is wrong with you?!',
        ];
        this.showToast(
          hurtSpeaker || 'NYC Pedestrian',
          hurtLines[Math.floor(this.simTime * 7) % hurtLines.length],
          'red',
          2.6,
        );
      }
      this.pushHudSnapshot(true);
    }
  }

  public interact(): void {
    if (this.gameState !== 'playing' || this.subwayRide) return;
    this.audio.unlock();

    if (this.activeVehicle) {
      if (this.activeStreetEvent?.kind === 'street_race' && this.activeStreetEvent.phase === 'available') {
        const dRacer = Math.hypot(
          this.playerX - this.activeStreetEvent.targetX,
          this.playerZ - this.activeStreetEvent.targetZ,
        );
        if (dRacer < 34) {
          this.pendingStreetEvent.acceptedRace = true;
          return;
        }
      }
      this.exitVehicle(false);
      return;
    }

    // 0. Highest priority: Active Interactive Mission Contact [E] or Hands-On Mission Prop Task [E]
    if (this.activeMission) {
      const def = getMissionById(this.activeMission.missionId);
      const step = def?.steps[this.activeMission.stepIndex];
      if (step && step.targetX !== undefined && step.targetZ !== undefined) {
        const distToTarget = Math.hypot(this.playerX - step.targetX, this.playerZ - step.targetZ);
        if (step.type === 'talk_npc' && distToTarget <= (step.radius ?? 5.5) + 1.0) {
          const contact = this.npcs.find((n) => n.id === this.missionContactNpcId);
          if (contact) {
            contact.heading = Math.atan2(this.playerX - contact.x, this.playerZ - contact.z);
          }
          this.audio.playChime([523.25, 659.25, 783.99]);
          this.spawnParticles(step.targetX, 1.4, step.targetZ, 16, 0xfbbf24, 4.5, 0.85, 0.55);
          this.showToast(step.npcName ?? def.contact, step.npcDialogue ?? step.label, 'teal', 5.2);
          this.pendingMissionEvents.talked = true;
          this.pushHudSnapshot(true);
          return;
        }
        if (step.type === 'perform_task' && distToTarget <= (step.radius ?? 5.4) + 1.0) {
          this.shoveAnimTimer = 0.34;
          this.squashX = 1.14;
          this.squashY = 0.88;
          this.audio.playChime([440, 587.33, 880]);
          this.spawnParticles(step.targetX, 1.35, step.targetZ, 22, 0x38bdf8, 6.2, 0.9, 0.58);
          this.showToast(
            step.taskActionLabel ?? 'Task Complete',
            step.radioCallout ?? 'Street objective completed!',
            'teal',
            4.5,
          );
          this.pendingMissionEvents.taskDone = true;
          this.pushHudSnapshot(true);
          return;
        }
      }
    }

    // 0.5. Elevated MTA Subway Station Boarding [E]
    const nearStation = findNearestSubwayStation(this.playerX, this.playerZ, 7.8);
    if (nearStation) {
      this.audio.playChime([587.33, 440]);
      this.onOpenSubway(nearStation.id);
      return;
    }

    // 1. Check nearest vehicle within 5.5m
    const nearestVeh = this.findNearestVehicle(5.5);
    if (nearestVeh) {
      this.enterVehicle(nearestVeh);
      return;
    }

    // 2. Check nearest interactive NPC / shopkeeper within 5.0m
    const nearestNpc = this.findNearestNpc(5.0);
    if (nearestNpc) {
      nearestNpc.heading = Math.atan2(this.playerX - nearestNpc.x, this.playerZ - nearestNpc.z);
      nearestNpc.reactionCooldown = 10;

      // Ground-floor named NYC Building Shop purchase interaction
      if (nearestNpc.archetype === 'shopkeeper' && nearestNpc.shopDef) {
        const shop = nearestNpc.shopDef;
        if (this.cash < shop.price) {
          this.showToast(
            shop.shopName,
            `Need $${shop.price.toLocaleString('en-US')} for ${shop.itemLabel}. Complete a dispatch job or win a park match!`,
            'red',
            3.8,
          );
          this.pushHudSnapshot(true);
          return;
        }
        this.cash -= shop.price;
        const pitch = shop.pitchLines[nearestNpc.dialogueIndex % shop.pitchLines.length];
        nearestNpc.dialogueIndex++;

        if (shop.perk === 'heal_full') {
          this.playerHp = this.playerMaxHp;
          this.playerStamina = 100;
          this.spawnParticles(this.playerX, 1.2, this.playerZ, 12, 0x22c55e, 3.8, 0.75, 0.6);
        } else if (shop.perk === 'nitro_repair') {
          this.vehicleBoost = 100;
          for (const veh of this.vehicles) {
            if (!veh.isTraffic && Math.hypot(veh.phys.x - this.playerX, veh.phys.z - this.playerZ) < 42) {
              veh.hp = veh.maxHp;
              veh.disabled = false;
            }
          }
          this.spawnParticles(this.playerX, 1.2, this.playerZ, 12, 0x38bdf8, 4.0, 0.75, 0.55);
        } else if (shop.perk === 'drop_wanted') {
          if (this.wanted.stars > 0) {
            const nextStars = Math.max(0, this.wanted.stars - 1);
            this.wanted = {
              heat: nextStars * 45,
              stars: nextStars,
              evadeTimer: 0,
              bustedProgress: 0,
            };
            this.spawnParticles(this.playerX, 1.2, this.playerZ, 12, 0xa855f7, 3.6, 0.75, 0.55);
          } else {
            this.cash += Math.round(shop.price * 0.5);
          }
        } else if (shop.perk === 'stamina_cash') {
          this.playerStamina = 100;
          this.cash += shop.price + 220;
          this.spawnParticles(this.playerX, 1.2, this.playerZ, 14, 0xfbbf24, 4.2, 0.8, 0.6);
        }
        this.pendingMissionEvents.boughtShop = true;
        this.audio.playChime([523.25, 659.25, 783.99]);
        this.showToast(`${shop.shopName} · ${shop.shopkeeperName}`, pitch, 'teal', 4.8);
        this.pushHudSnapshot(true);
        return;
      }

      const district = getDistrictAt(nearestNpc.x, nearestNpc.z, 0);
      const line =
        nearestNpc.archetype === 'commuter'
          ? getContextualTalkLine(district, this.wanted.stars, nearestNpc.dialogueIndex + Math.floor(this.simTime))
          : nearestNpc.dialogue[nearestNpc.dialogueIndex % nearestNpc.dialogue.length];
      nearestNpc.dialogueIndex++;
      if (nearestNpc.healsChai && this.playerHp < this.playerMaxHp) {
        this.playerHp = this.playerMaxHp;
        this.audio.playChime([523.25, 659.25]);
        this.spawnParticles(this.playerX, 1.2, this.playerZ, 10, 0x22c55e, 3.5, 0.7, 0.6);
      } else if (nearestNpc.archetype === 'informant') {
        this.cash += 350;
        this.audio.playChime([587.33, 783.99]);
      } else {
        this.audio.playChime([493.88]);
      }
      const speaker = nearestNpc.archetype === 'commuter' ? `${nearestNpc.name} · ${district}` : nearestNpc.name;
      this.showToast(speaker, line, nearestNpc.healsChai ? 'teal' : 'amber', 4.5);
      this.pushHudSnapshot(true);
      return;
    }

    // 3. Fallback: if near a Park Sports venue, join pickup match directly
    if (this.findNearbyParkVenue()) {
      this.joinNearbyParkSport();
    }
  }

  private enterVehicle(v: SimVehicle): void {
    if (this.activeParkVenueId) {
      this.leaveParkSport(true);
    }
    this.activeVehicle = v;
    v.isTraffic = false;
    v.disabled = false;
    this.cameraYaw = v.phys.heading;
    this.smoothSteer = 0;
    // Expressive suspension bounce + brief chassis pulse on boarding + reveal Marcus seated at the wheel!
    const outfit = PLAYER_OUTFITS[this.playerOutfitIndex];
    v.rig.setDriverAppearance(outfit.shirtHex, outfit.skinHex, false);
    v.rig.driverGroup.visible = true;
    v.suspRoll = 0.095;
    v.suspPitch = -0.05;
    v.hitFlash = 0.08;
    this.syncPlayerAvatarVisibilityAndPose();
    this.audio.playHorn(v.type);
    this.spawnParticles(v.phys.x, (v.phys.y ?? 0) + 0.6, v.phys.z, 8, 0xf59e0b, 3.2, 0.6, 0.35);

    const spec = VEHICLE_SPECS[v.type];
    if (v.isPolice) {
      this.addHeat(65);
      this.showToast('NYPD Alert', 'NYPD Interceptor commandeered! Heat rising!', 'red', 3.5);
    } else if (spec.isWatercraft) {
      this.showToast(
        spec.label,
        'WASD Sail · Shift Full Throttle · H Foghorn · Pull beside any Hudson Pier or Liberty Island & press [E] to Dock',
        'teal',
        4.2,
      );
    } else if (v.type === 'sports') {
      this.addHeat(45);
      this.showToast('Manhattan GT Coupe', 'Hold [Shift] for Nitro Boost, [Space] to Drift!', 'amber', 3.5);
    } else {
      this.showToast(spec.label, 'WASD Drive · Space Drift · Shift Nitro · H Horn · E Exit', 'teal', 3.0);
    }
    this.pushHudSnapshot(true);
  }

  private exitVehicle(silent: boolean): void {
    if (!this.activeVehicle) return;
    const v = this.activeVehicle;
    const spec = VEHICLE_SPECS[v.type];
    let targetX: number = PLAYER_SPAWN.x;
    let targetY = 0;
    let targetZ: number = PLAYER_SPAWN.z;

    if (spec.isWatercraft) {
      if (!silent) {
        const dock = findNearestDisembarkPoint(v.phys.x, v.phys.z, 26);
        if (!dock) {
          this.showToast(
            'Open Hudson Harbor',
            'Sail closer to Battery Ferry Pier, Pier 25, Chelsea Piers, or Liberty Island to disembark!',
            'amber',
            3.5,
          );
          this.pushHudSnapshot(true);
          return;
        }
        targetX = dock.x;
        targetZ = dock.z;
        targetY = 0.14;
      } else {
        const dock = findNearestDisembarkPoint(v.phys.x, v.phys.z, 60);
        targetX = dock ? dock.x : PLAYER_SPAWN.x;
        targetZ = dock ? dock.z : PLAYER_SPAWN.z;
        targetY = 0.14;
      }
    } else {
      const vy = v.phys.y ?? 0;
      const sideX = Math.cos(v.phys.heading) * (spec.width * 0.65 + 0.8);
      const sideZ = -Math.sin(v.phys.heading) * (spec.width * 0.65 + 0.8);
      const resolved = resolveCircleBuildingCollisions(v.phys.x + sideX, v.phys.z + sideZ, 0.55, CITY_BUILDINGS, vy);
      const elev = sampleWorldElevation(resolved.x, resolved.z, vy);
      targetX = resolved.x;
      targetZ = resolved.z;
      targetY = elev.groundY;
    }

    this.playerX = targetX;
    this.playerZ = targetZ;
    this.playerY = targetY;
    this.playerVx = spec.isWatercraft ? 0 : v.phys.vx * 0.25;
    this.playerVz = spec.isWatercraft ? 0 : v.phys.vz * 0.25;
    this.playerHeading = v.phys.heading;
    this.playerLoco = createInitialHumanLocomotion(this.playerHeading);
    this.playerLoco.vx = this.playerVx;
    this.playerLoco.vz = this.playerVz;
    this.cameraYaw = this.playerHeading;
    this.smoothSteer = 0;
    v.suspRoll = -0.075;
    v.rig.driverGroup.visible = false;
    this.squashX = 1.0;
    this.squashY = 1.0;
    this.activeVehicle = null;
    this.syncPlayerAvatarVisibilityAndPose();
    if (!silent) {
      const ground = this.getPlayerFootstepSurfaceInfo();
      this.audio.playFootstep({
        intensity: 0.72,
        speedMps: 4.5,
        surface: ground.surface,
        wetness: ground.wetness,
        foot: 'left',
      });
      this.pushHudSnapshot(true);
    }
  }

  private applyPlayerDamage(amount: number, graceSec = COLLISION_GRACE_SEC): boolean {
    if (amount <= 0 || this.damageGraceTimer > 0) return false;
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.damageGraceTimer = graceSec;
    this.timeSinceDamage = 0;
    this.hpRegenerating = false;
    this.damageFlash = 1.0;
    return true;
  }

  private addHeat(delta: number): void {
    const prev = this.wanted.stars;
    this.wanted = addWantedHeat(this.wanted, delta);
    this.wantedPeak = Math.max(this.wantedPeak, this.wanted.stars);
    if (this.wanted.stars > prev) {
      this.audio.playChime([622.25, 466.16]);
    }
  }

  private showToast(
    speaker: string,
    text: string,
    accent: 'amber' | 'teal' | 'red' = 'amber',
    duration = 4.0,
  ): void {
    this.toast = { speaker, text, accent, id: this.toastSeq++ };
    this.toastTimer = duration;
  }

  private findNearestVehicle(maxDist: number): SimVehicle | null {
    let best: SimVehicle | null = null;
    let bestScore = Infinity;
    for (const v of this.vehicles) {
      if (v.disabled) continue;
      const spec = VEHICLE_SPECS[v.type];
      const reach = spec.isWatercraft ? maxDist + 6.5 : maxDist;
      const dx = v.phys.x - this.playerX;
      const dz = v.phys.z - this.playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist <= reach && dist < bestScore) {
        bestScore = dist;
        best = v;
      }
    }
    return best;
  }

  private findNearestNpc(maxDist: number): SimNpc | null {
    let best: SimNpc | null = null;
    let bestD = maxDist * maxDist;
    for (const n of this.npcs) {
      if (n.knockoutTimer > 0 || n.archetype.startsWith('rival_')) continue;
      const dx = n.x - this.playerX;
      const dz = n.z - this.playerZ;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestD) {
        bestD = dSq;
        best = n;
      }
    }
    return best;
  }

  private triggerGameOver(reason: GameOverReason): void {
    this.gameState = 'gameover';
    document.body.dataset.state = 'gameover';
    this.clearInputs();
    this.audio.silenceLoops();
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    if (reason === 'victory') {
      this.audio.playChime([523.25, 659.25, 783.99, 1046.5]);
    } else {
      this.audio.playDefeatSting();
    }
    this.endRun = {
      reason,
      cash: this.cash,
      missionsCompleted: this.completedMissionIds.length,
      totalMissions: MISSIONS.length,
      timePlayedSec: Math.round(this.timePlayedSec),
      distanceKm: Number((this.distanceMetersTotal / 1000).toFixed(2)),
      topSpeedKmh: Math.round(this.topSpeedKmh),
      wantedPeak: this.wantedPeak,
    };
    this.pushHudSnapshot(true);
  }

  // ============== INPUT HANDLING ==============

  private clearInputs(): void {
    this.keys.clear();
    this.justPressed.clear();
  }

  private onKeyDown(e: KeyboardEvent): void {
    const code = e.code;
    if (
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight' ||
      code === 'Space'
    ) {
      e.preventDefault();
    }

    if (!this.keys.has(code)) {
      this.justPressed.add(code);
    }
    this.keys.add(code);

    if (this.gameState === 'title') {
      if (code === 'Enter' || code === 'Space') {
        this.start();
      }
      return;
    }

    if (code === 'KeyP' || code === 'Escape') {
      if (code === 'Escape' && this.activeParkVenueId) {
        this.leaveParkSport(false);
        return;
      }
      if (code === 'Escape' && this.shouldIgnoreEscape()) {
        return;
      }
      if (this.gameState === 'playing') this.pause();
      else if (this.gameState === 'paused') this.resume();
      return;
    }

    if (this.gameState !== 'playing') return;
    // Ensure Web Audio unlocks on the very first gameplay keypress so footsteps always play immediately
    this.audio.unlock();

    // Park sports interactive controls (Space swings/shoots, F joins from spectate, V toggles spectate, E leaves)
    if (this.activeParkVenueId) {
      const venue = this.parkVenues.find((v) => v.def.id === this.activeParkVenueId);
      if (code === 'Space' && venue?.state.mode === 'joined') {
        this.triggerParkSportSwingOrShoot();
        return;
      }
      if (code === 'KeyF' && venue?.state.mode === 'spectating') {
        this.joinNearbyParkSport();
        return;
      }
      if (code === 'KeyV' || code === 'KeyE') {
        this.leaveParkSport(false);
        return;
      }
    }

    if (code === 'KeyF') {
      if (!this.activeVehicle && this.findNearbyParkVenue()) {
        this.joinNearbyParkSport();
      } else {
        this.interact();
      }
    } else if (code === 'KeyV') {
      this.spectateNearbyParkSport();
    } else if (code === 'KeyE') {
      this.interact();
    } else if (code === 'KeyH' || code === 'KeyQ') {
      this.triggerHonkOrAction();
    } else if (code === 'KeyC') {
      this.cycleCamera();
    } else if (code === 'KeyT') {
      this.cycleWeather();
    } else if (code === 'KeyO') {
      this.cyclePlayerOutfit();
    } else if (code === 'KeyR') {
      this.cycleRadioStation();
    } else if (code === 'KeyN') {
      this.toggleMute();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
    // Variable jump cut when releasing Space early while ascending on foot
    if (e.code === 'Space' && !this.activeVehicle && !this.activeParkVenueId && this.playerVy > 2.0) {
      this.playerVy *= 0.5;
    }
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('click', this.handleCanvasClick);
  }

  private resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(
      resolveEffectivePixelRatio(this.graphicsQuality, window.devicePixelRatio || 1, this.isSoftwareGl),
    );
    this.renderer.setSize(w, h);
  }

  // ============== MAIN SIMULATION & RENDER LOOP ==============

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick(): void {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = Math.max(0.001, (now - this.lastTimeMs) / 1000);
    this.lastTimeMs = now;
    const dt = Math.min(rawDt, 0.05);

    if (this.gameState === 'title') {
      this.simTime += dt;
      this.updateTrafficLights();
      this.updateElevatedSubway(dt);
      this.updateTrafficAndPolice(dt);
      this.updateNpcs(dt);
      this.updateParkSports(dt);
      this.updateInstancedCrowd(dt);
      this.updateTitleCamera(dt);
      this.animateEnvironment(dt);
    } else if (this.gameState === 'playing') {
      this.timePlayedSec += dt;

      // Hitstop freezes simulation physics briefly while camera shake & hit flash tick in real dt
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      } else {
        this.simTime += dt;
        this.updateTrafficLights();
        this.updateElevatedSubway(dt);
        if (this.subwayRide) {
          this.stepSubwayRide(dt);
        } else if (this.activeVehicle) {
          this.updatePlayerVehicle(dt);
        } else if (this.activeParkVenueId) {
          // Player is actively batting/shooting or spectating live park sports
          this.shoveAnimTimer = Math.max(0, this.shoveAnimTimer - dt);
          const swingPose = this.shoveAnimTimer > 0 ? Math.sin((this.shoveAnimTimer / 0.32) * Math.PI) : 0;
          this.playerRig.pelvisGroup.position.set(0, 0.92, 0);
          this.playerRig.pelvisGroup.rotation.set(0, 0, 0);
          this.playerRig.spineGroup.rotation.set(0.08, -0.45 * swingPose, 0);
          this.playerRig.rightArm.rotation.set(-0.65 - swingPose * 1.45, 0, 0.08);
          this.playerRig.rightElbow.rotation.x = -0.42;
          this.playerRig.leftArm.rotation.set(-0.55 - swingPose * 1.1, 0, -0.08);
          this.playerRig.leftElbow.rotation.x = -0.48;
          this.playerRig.bodyGroup.rotation.set(0, 0, 0);
          this.playerRig.leftLeg.rotation.set(-0.14, 0, -0.03);
          this.playerRig.leftKnee.rotation.x = 0.22;
          this.playerRig.rightLeg.rotation.set(0.12, 0, 0.03);
          this.playerRig.rightKnee.rotation.x = 0.18;
          this.syncPlayerAvatarVisibilityAndPose();
          if (this.customGlbPlayer?.isLoaded()) {
            const parkPose = solveHumanGaitPose({
              loco: this.playerLoco,
              simTime: this.simTime,
              punchTimer: this.shoveAnimTimer,
              punchDuration: this.punchDuration,
              punchHand: 1,
              steerInput: 0,
              feminineStyle: true,
            });
            this.customGlbPlayer.update({
              dt,
              speed: 0,
              grounded: true,
              vy: 0,
              punchTimer: this.shoveAnimTimer,
              punchDuration: this.punchDuration,
              pose: parkPose,
              simTime: this.simTime,
            });
          }
          this.audio.updateContinuous(dt, false, null, 0, false, false, this.wanted.stars > 0, this.getNearestPoliceDistance());
        } else {
          this.updatePlayerOnFoot(dt);
        }
        this.updateTrafficAndPolice(dt);
        this.updateVehicleCollisions(dt);
        this.updateNpcs(dt);
        this.updateParkSports(dt);
        this.updateInstancedCrowd(dt);
        this.updateWantedAndMissions(dt);
        this.updateStreetEvents(dt);
      }

      this.updateParticles(dt);
      this.animateEnvironment(dt);
      this.updateGameplayCamera(dt);

      // Update dynamic district-aware ambient city, harbor & nor'easter rain soundscape
      this.audio.updateAmbient(
        dt,
        getDistrictAt(this.playerX, this.playerZ, this.playerY),
        true,
        this.weatherVisuals.rainIntensity,
      );

      // Update dynamic GTA-style background radio music (activates when driving or running on foot)
      const onFootSpeed = Math.hypot(this.playerVx, this.playerVz);
      const activeSpeedMps = this.activeVehicle ? Math.abs(this.activeVehicle.phys.speed) : onFootSpeed;
      const isSprintingOnFoot =
        !this.activeVehicle &&
        !this.activeParkVenueId &&
        !this.subwayRide &&
        (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) &&
        onFootSpeed > 2.2;
      this.audio.updateMusic(dt, {
        inVehicle: Boolean(this.activeVehicle),
        speedMps: activeSpeedMps,
        isSprinting: isSprintingOnFoot,
        active: !this.subwayRide,
      });

      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) {
          this.toast = null;
        }
      }

      // Keep tight player-only directional sun shadow centered on Main Player (skip when Low quality or driving)
      if (!this.isSoftwareGl) {
        const allowPlayerShadow = getGraphicsQualitySpec(this.graphicsQuality).playerShadowEnabled;
        const shouldCastPlayerShadow = allowPlayerShadow && !this.activeVehicle && !this.subwayRide;
        this.sunLight.castShadow = shouldCastPlayerShadow;
        if (shouldCastPlayerShadow) {
          this.sunLight.position.set(this.playerX - 24, this.playerY + 21, this.playerZ - 17);
          this.sunLight.target.position.set(this.playerX, this.playerY, this.playerZ);
          this.sunLight.target.updateMatrixWorld();
        }
      }

      this.hudThrottleAcc += dt;
      if (this.hudThrottleAcc >= 0.08) {
        this.hudThrottleAcc = 0;
        this.pushHudSnapshot(false);
      }

      // Throttle circular North-up GPS radar redraw to ~3 FPS (0.34s wall-clock) for smooth frame pacing
      this.minimapThrottleAcc += Math.min(rawDt, 0.5);
      if (shouldRedrawMinimap(this.minimapThrottleAcc, this.minimapDirty)) {
        this.minimapThrottleAcc = 0;
        this.minimapDirty = false;
        this.drawMinimap();
      }
    } else {
      this.audio.updateAmbient(dt, 'Washington Square', false, 0);
      this.audio.updateMusic(dt, { inVehicle: false, speedMps: 0, isSprinting: false, active: false });
    }

    this.justPressed.clear();
    this.skyDome.mesh.position.set(this.camera.position.x, 0, this.camera.position.z);
    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  }

  private animateEnvironment(dt: number): void {
    // 0. Dynamic Mumbai weather cycle (Golden Sunset -> Light Drizzle -> Heavy Mumbai Monsoon)
    const weatherStep = stepWeatherSystem(this.weatherState, dt);
    this.weatherState = weatherStep.next;
    const v = computeWeatherVisuals(this.weatherState);
    this.weatherVisuals = v;
    if (weatherStep.thunderTriggered && this.gameState === 'playing') {
      this.audio.playThunder();
    }

    this.skyDome.updateWeather(v);
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setRGB(v.fogColor.r, v.fogColor.g, v.fogColor.b);
    }
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setRGB(v.fogColor.r, v.fogColor.g, v.fogColor.b);
      this.scene.fog.density = v.fogDensity * getGraphicsQualitySpec(this.graphicsQuality).fogDensityScale;
    }
    this.sunLight.color.setRGB(v.sunColor.r, v.sunColor.g, v.sunColor.b);
    this.sunLight.intensity = v.sunIntensity;
    this.hemiLight.color.setRGB(v.hemiSkyColor.r, v.hemiSkyColor.g, v.hemiSkyColor.b);
    this.hemiLight.groundColor.setRGB(v.hemiGroundColor.r, v.hemiGroundColor.g, v.hemiGroundColor.b);
    this.hemiLight.intensity = v.hemiIntensity;
    this.renderer.toneMappingExposure = v.exposure;
    this.roadMatNS.roughness = v.roadRoughness;
    this.roadMatNS.metalness = v.roadMetalness;
    this.roadMatEW.roughness = v.roadRoughness;
    this.roadMatEW.metalness = v.roadMetalness;

    this.rainSystem.update(dt, this.playerX, this.playerY, this.playerZ, v.rainIntensity, v.rainFallSpeed);

    // Sync Mumbai weather-responsive clothing (umbrellas, rain ponchos, wet-fabric sheen) across player & all 10 NPC models
    const gearBucket = `${this.weatherState.target}_${Math.round(v.rainIntensity * 4)}`;
    if (gearBucket !== this.lastWeatherGearBucket) {
      this.lastWeatherGearBucket = gearBucket;
      this.playerRig.applyWeatherGear(this.weatherState.target, v.rainIntensity);
      for (let i = 0; i < this.npcs.length; i++) {
        this.npcs[i].rig.applyWeatherGear(this.weatherState.target, v.rainIntensity);
      }
    }

    // Realistic animated 3D Arabian Sea wave swells (amplified during monsoon!)
    if (this.seaWaveUpdate) {
      this.seaWaveUpdate(this.simTime, v.oceanWaveScale);
    }
    if (this.lighthouseBeam) {
      this.lighthouseBeam.rotation.y += dt * 0.95;
    }
    for (let i = 0; i < this.seaBuoys.length; i++) {
      const b = this.seaBuoys[i];
      b.mesh.position.y = -0.82 + Math.sin(this.simTime * 2.1 + b.phase) * 0.16 * v.oceanWaveScale;
      b.mesh.rotation.z = Math.sin(this.simTime * 1.6 + b.phase) * 0.12 * v.oceanWaveScale;
      b.mesh.rotation.x = Math.cos(this.simTime * 1.3 + b.phase) * 0.09 * v.oceanWaveScale;
    }
    if (this.harborFerry) {
      this.harborFerryZ -= dt * 4.4;
      if (this.harborFerryZ < -145) this.harborFerryZ = 355;
      this.harborFerry.position.set(
        -142 + Math.sin(this.simTime * 0.35) * 4.5,
        -0.45 + Math.sin(this.simTime * 1.8) * 0.14 * v.oceanWaveScale,
        this.harborFerryZ,
      );
      this.harborFerry.rotation.x = Math.sin(this.simTime * 1.45) * 0.032 * v.oceanWaveScale;
      this.harborFerry.rotation.z = Math.cos(this.simTime * 1.15) * 0.04 * v.oceanWaveScale;
    }

    // Spinning high-rise rooftop HVAC / exhaust turbines
    for (let i = 0; i < this.rooftopFans.length; i++) {
      this.rooftopFans[i].rotation.y += dt * (4.2 + (i % 3) * 1.1);
    }

    // Swaying overhead streetlights & festive Chinatown/Little Italy bunting lines
    const windBoost = 1 + v.rainIntensity * 0.9;
    for (let i = 0; i < this.buntingLines.length; i++) {
      const bl = this.buntingLines[i];
      bl.group.rotation.x = Math.sin(this.simTime * 2.1 * windBoost + bl.phase) * 0.11 * windBoost;
    }

    // Soaring multi-species NYC birds (seagulls, pigeons & hawks) with articulated wingtips & thermal glides
    for (let i = 0; i < this.seagulls.length; i++) {
      const g = this.seagulls[i];
      g.angle += g.angularSpeed * dt;
      const gx = g.centerX + Math.cos(g.angle) * g.radiusX;
      const gz = g.centerZ + Math.sin(g.angle) * g.radiusZ;
      const bob = Math.sin(this.simTime * 1.15 + g.flapPhase) * 1.25;
      const gy = g.altitude + bob;
      const vx = -Math.sin(g.angle) * g.radiusX * g.angularSpeed;
      const vz = Math.cos(g.angle) * g.radiusZ * g.angularSpeed;
      g.rig.root.position.set(gx, gy, gz);
      g.rig.root.rotation.y = Math.atan2(vx, vz);
      // Dynamic aerodynamic pitch & smooth banking into circular turns
      g.rig.root.rotation.x = -Math.cos(this.simTime * 1.15 + g.flapPhase) * 0.1;
      g.rig.root.rotation.z = Math.sign(g.angularSpeed) * 0.24;

      // Alternate between active flapping and serene thermal gliding (hawks glide longer!)
      const glideWave = Math.sin(this.simTime * 0.45 + g.flapPhase * 1.7);
      const glideThreshold = g.rig.species === 'hawk' ? -0.15 : g.rig.species === 'pigeon' ? 0.55 : 0.22;
      const flapAmp = glideWave > glideThreshold ? 0.08 : g.rig.species === 'pigeon' ? 0.58 : 0.48;

      const phase = this.simTime * g.flapSpeed + g.flapPhase;
      const innerFlap = Math.sin(phase) * flapAmp + (flapAmp < 0.12 ? 0.08 : 0);
      const tipFlap = Math.sin(phase - 0.65) * (flapAmp * 0.78);

      g.rig.leftWing.rotation.z = innerFlap;
      g.rig.rightWing.rotation.z = -innerFlap;
      if (g.rig.leftWingTip && g.rig.rightWingTip) {
        g.rig.leftWingTip.rotation.z = tipFlap;
        g.rig.rightWingTip.rotation.z = -tipFlap;
      }
      if (g.rig.tail) {
        g.rig.tail.rotation.x = Math.sin(phase * 0.5) * 0.08;
      }
    }

    // Mission beacon ring pulse + floating rotating 3D golden crystal + collectible rotation
    if (this.missionBeaconGroup.visible) {
      this.missionBeaconRing.rotation.z += dt * 1.8;
      const pulse = 1 + Math.sin(this.simTime * 4) * 0.08;
      this.missionBeaconRing.scale.set(pulse, pulse, 1);
      this.missionBeaconDiamond.rotation.y += dt * 2.4;
      this.missionBeaconDiamond.rotation.x = Math.sin(this.simTime * 2.2) * 0.2;
      this.missionBeaconDiamond.position.y = 4.2 + Math.sin(this.simTime * 3.2) * 0.65;
    }
    for (let i = 0; i < this.missionCollectMeshes.length; i++) {
      const cm = this.missionCollectMeshes[i];
      if (cm.mesh.visible && cm.mesh.children[0]) {
        cm.mesh.children[0].rotation.y += dt * 2.3;
        cm.mesh.children[0].position.y = 1.05 + Math.sin(this.simTime * 3.4 + i) * 0.18;
      }
    }
  }

  private updateTrafficLights(): void {
    updateSharedTrafficSignalMaterials(this.simTime);
  }

  private updatePlayerOnFoot(dt: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.shoveAnimTimer = Math.max(0, this.shoveAnimTimer - dt);

    let inputF = 0;
    let inputR = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inputF += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inputF -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inputR += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inputR -= 1;

    // Calm, controlled camera yaw
    this.cameraYaw = stepCameraYaw({
      currentYaw: this.cameraYaw,
      targetYaw: this.playerHeading,
      dt,
      mode: 'foot',
      inputF,
      inputR,
      vehicleSpeed: 0,
    });

    const moveYaw = this.cameraYaw + this.mouseYawOffset;
    const fwdX = Math.sin(moveYaw);
    const fwdZ = Math.cos(moveYaw);
    const rightX = -fwdZ;
    const rightZ = fwdX;

    const wishX = fwdX * inputF + rightX * inputR;
    const wishZ = fwdZ * inputF + rightZ * inputR;
    const moveMag = Math.hypot(wishX, wishZ);

    const wantsSprint =
      (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && moveMag > 0.1 && this.playerStamina > 4;
    if (wantsSprint) {
      this.playerStamina = Math.max(0, this.playerStamina - 22 * dt);
    } else {
      this.playerStamina = Math.min(100, this.playerStamina + 18 * dt);
    }

    // Jump with coyote time (0.1s) + input buffer (0.12s)
    if (this.justPressed.has('Space')) {
      this.jumpBufferTimer = 0.12;
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }
    if (this.playerGrounded) {
      this.coyoteTimer = 0.1;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.playerVy = 7.4;
      this.playerGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.audio.playJump();
      this.spawnParticles(this.playerX, 0.12, this.playerZ, 5, 0xd4b996, 2.2, 0.55, 0.35);
    }

    // Vertical gravity & ground elevation sampling first so landing impact feeds knee-absorption physics
    const prevX = this.playerX;
    const prevZ = this.playerZ;
    const elev = sampleWorldElevation(this.playerX, this.playerZ, this.playerY);
    this.playerVy -= 22 * dt;
    this.playerY += this.playerVy * dt;
    let justLandedSpeed = 0;
    if (this.playerY <= elev.groundY) {
      if (!this.playerGrounded && this.playerVy < -2.4) {
        justLandedSpeed = -this.playerVy;
        const ground = this.getPlayerFootstepSurfaceInfo();
        this.audio.playFootstep({
          intensity: Math.min(1.2, 0.62 + justLandedSpeed * 0.068),
          speedMps: Math.max(this.playerLoco.speed, justLandedSpeed),
          surface: ground.surface,
          wetness: ground.wetness,
          isLanding: true,
        });
        this.spawnParticles(this.playerX, this.playerY + 0.08, this.playerZ, 4, 0xd4b996, 1.8, 0.4, 0.3);
      }
      this.playerY = elev.groundY;
      this.playerVy = 0;
      this.playerGrounded = true;
    } else if (this.playerGrounded && this.playerY > elev.groundY + 0.15) {
      this.playerGrounded = false;
    }

    // Momentum-driven realistic human locomotion physics (accel/brake lean, turn banking, landing crouch, heel-strike SFX)
    this.playerLoco.vy = this.playerVy;
    this.playerLoco = stepHumanLocomotion(this.playerLoco, {
      wishX,
      wishZ,
      wantsSprint,
      grounded: this.playerGrounded,
      justLandedSpeed,
      dt,
    });
    this.playerVx = this.playerLoco.vx;
    this.playerVz = this.playerLoco.vz;
    this.playerHeading = this.playerLoco.heading;

    const col = resolveCircleBuildingCollisions(
      this.playerX + this.playerVx * dt,
      this.playerZ + this.playerVz * dt,
      0.52,
      CITY_BUILDINGS,
      this.playerY,
    );
    this.playerX = col.x;
    this.playerZ = col.z;
    if (col.hit) {
      // Gently scrub velocity into walls without elastic bouncing
      const intoWall = this.playerLoco.vx * col.normalX + this.playerLoco.vz * col.normalZ;
      if (intoWall < 0) {
        this.playerLoco.vx -= col.normalX * intoWall;
        this.playerLoco.vz -= col.normalZ * intoWall;
        this.playerVx = this.playerLoco.vx;
        this.playerVz = this.playerLoco.vz;
      }
    }

    const stepDist = Math.hypot(this.playerX - prevX, this.playerZ - prevZ);
    this.distanceMetersTotal += stepDist;
    this.playerGait = this.playerLoco.gaitPhase;

    // Exact heel-strike & hard-stop scuff SFX synced to speed, gait phase, footwear & ground surface!
    const currentOutfit = PLAYER_OUTFITS[this.playerOutfitIndex];
    const isWearingHeels = !this.customGlbPlayer?.isLoaded() && currentOutfit?.silhouette === 'bodycon_dress';
    if (this.playerGrounded && this.playerLoco.steppedFoot) {
      const ground = this.getPlayerFootstepSurfaceInfo();
      this.audio.playFootstep({
        intensity: this.playerLoco.stepIntensity,
        speedMps: this.playerLoco.speed,
        surface: ground.surface,
        wetness: ground.wetness,
        foot: this.playerLoco.steppedFoot,
        isHeels: isWearingHeels,
      });
    } else if (this.playerGrounded && this.playerLoco.brakingScuff) {
      const ground = this.getPlayerFootstepSurfaceInfo();
      this.audio.playFootstep({
        intensity: 0.78,
        speedMps: this.playerLoco.speed,
        surface: ground.surface,
        wetness: ground.wetness,
        isScuff: true,
      });
    }

    // Solve full biomechanical multi-joint human pose (hips, knees, ankles, pelvis, spine, shoulders, elbows, head, flowing hair)
    const pose = solveHumanGaitPose({
      loco: this.playerLoco,
      simTime: this.simTime,
      punchTimer: this.shoveAnimTimer,
      punchDuration: this.punchDuration,
      punchHand: this.punchComboHand,
      steerInput: inputR,
      feminineStyle: Boolean(currentOutfit?.isFemale),
    });

    const rig = this.playerRig;
    const basePelvisY = currentOutfit?.isFemale ? 0.91 : 0.92;
    rig.pelvisGroup.position.set(pose.hipsOffsetX, basePelvisY + pose.hipsOffsetY, 0);
    rig.pelvisGroup.rotation.set(0, pose.pelvisYaw, pose.pelvisRollZ);

    rig.spineGroup.rotation.set(pose.spinePitchX, pose.spineYaw, pose.spineRollZ);

    rig.headGroup.rotation.set(pose.headPitch, pose.headYaw, 0);
    if (rig.hairFlowGroup) {
      rig.hairFlowGroup.rotation.set(pose.hairFlowX, 0, pose.hairFlowZ);
    }

    rig.leftLeg.rotation.set(pose.leftHipX, 0, pose.leftHipZ);
    rig.leftKnee.rotation.x = pose.leftKneeX;
    rig.leftAnkle.rotation.x = pose.leftAnkleX;

    rig.rightLeg.rotation.set(pose.rightHipX, 0, pose.rightHipZ);
    rig.rightKnee.rotation.x = pose.rightKneeX;
    rig.rightAnkle.rotation.x = pose.rightAnkleX;

    rig.leftArm.rotation.set(pose.leftShoulderX, pose.leftShoulderY, pose.leftShoulderZ);
    rig.leftElbow.rotation.x = pose.leftElbowX;

    rig.rightArm.rotation.set(pose.rightShoulderX, pose.rightShoulderY, pose.rightShoulderZ);
    rig.rightElbow.rotation.x = pose.rightElbowX;

    // Keep natural adult human stature (no cartoonish rubber-doll squash/stretch scaling!)
    rig.bodyGroup.position.y = 0;
    rig.bodyGroup.rotation.set(0, 0, 0);
    this.syncPlayerAvatarVisibilityAndPose();
    if (this.customGlbPlayer?.isLoaded()) {
      this.customGlbPlayer.update({
        dt,
        speed: this.playerLoco.speed,
        grounded: this.playerGrounded,
        vy: this.playerVy,
        punchTimer: this.shoveAnimTimer,
        punchDuration: this.punchDuration,
        pose,
        simTime: this.simTime,
      });
    }

    this.audio.updateContinuous(
      dt,
      false,
      null,
      0,
      false,
      false,
      this.wanted.stars > 0,
      this.getNearestPoliceDistance(),
    );
  }

  private getPlayerFootstepSurfaceInfo(): { surface: FootstepSurface; wetness: number } {
    return resolveFootstepSurfaceAt(this.playerX, this.playerZ, this.weatherVisuals.rainIntensity);
  }

  private updatePlayerVehicle(dt: number): void {
    const v = this.activeVehicle!;
    const spec = VEHICLE_SPECS[v.type];

    let throttle = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) throttle -= 1;

    let rawSteer = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) rawSteer += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) rawSteer -= 1;
    this.smoothSteer = stepSmoothSteer(this.smoothSteer, rawSteer, dt);

    const handbrake = this.keys.has('Space');
    const wantsBoost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    if (wantsBoost && throttle > 0.1 && this.vehicleBoost > 2) {
      this.vehicleBoost = Math.max(0, this.vehicleBoost - 28 * dt);
    } else {
      this.vehicleBoost = Math.min(100, this.vehicleBoost + 12 * dt);
    }

    const prevX = v.phys.x;
    const prevZ = v.phys.z;
    v.isBraking = (throttle < -0.1 && v.phys.speed > 0.5) || handbrake;

    v.phys = stepVehiclePhysics(
      v.phys,
      spec,
      {
        throttle,
        steer: this.smoothSteer,
        handbrake,
        boost: wantsBoost,
        boostAvailable: this.vehicleBoost > 2,
        wetGripMultiplier: this.weatherVisuals.wetGripMultiplier,
      },
      dt,
    );

    // Calm damped follow camera yaw (smooth forward tracking, no 180-deg whip when reversing)
    this.cameraYaw = stepCameraYaw({
      currentYaw: this.cameraYaw,
      targetYaw: v.phys.heading,
      dt,
      mode: 'drive',
      inputF: throttle,
      inputR: rawSteer,
      vehicleSpeed: v.phys.speed,
    });

    const stepDist = Math.hypot(v.phys.x - prevX, v.phys.z - prevZ);
    this.distanceMetersTotal += stepDist;

    const kmh = Math.abs(v.phys.speed) * 3.6;
    if (kmh > this.topSpeedKmh) this.topSpeedKmh = kmh;

    const vy = v.phys.y ?? 0;

    if (v.phys.hitWall && v.phys.impactSpeed > 7 && this.damageGraceTimer <= 0) {
      const crash = computeCrashDamage(v.phys.impactSpeed, true);
      v.hp = Math.max(0, v.hp - crash.vehicleDamage);
      this.applyPlayerDamage(crash.playerDamage, COLLISION_GRACE_SEC);
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.5);
      this.hitstopTimer = 0.035;
      this.audio.playCrash(Math.min(1, v.phys.impactSpeed / 22));
      this.spawnParticles(v.phys.x, vy + 0.7, v.phys.z, 14, 0xfbbf24, 6.5, 0.75, 0.48);
    }

    // Sea-spray stern wake for ships, or drift tire smoke & nitro flames for land vehicles
    if (spec.isWatercraft) {
      if (Math.abs(v.phys.speed) > 2.5 && Math.random() < 0.78) {
        const bx = v.phys.x - Math.sin(v.phys.heading) * (spec.length * 0.48);
        const bz = v.phys.z - Math.cos(v.phys.heading) * (spec.length * 0.48);
        this.spawnParticles(bx, 0.12, bz, v.phys.isBoosting ? 4 : 2, 0xe0f2fe, 2.8, 1.05, 0.55);
      }
    } else {
      if (v.phys.isDrifting && Math.abs(v.phys.speed) > 6 && Math.random() < 0.6) {
        const bx = v.phys.x - Math.sin(v.phys.heading) * (spec.length * 0.45);
        const bz = v.phys.z - Math.cos(v.phys.heading) * (spec.length * 0.45);
        this.spawnParticles(bx, vy + 0.25, bz, 2, 0xd6d3d1, 1.8, 1.1, 0.45);
      }
      if (v.phys.isBoosting && Math.random() < 0.7) {
        const bx = v.phys.x - Math.sin(v.phys.heading) * (spec.length * 0.52);
        const bz = v.phys.z - Math.cos(v.phys.heading) * (spec.length * 0.52);
        this.spawnParticles(bx, vy + 0.35, bz, 2, 0x38bdf8, 3.2, 0.85, 0.28);
      }
    }

    // Update vehicle mesh & wheels
    this.syncVehicleMesh(v, dt);

    // Sync player coordinates to vehicle (including flyover elevation!)
    this.playerX = v.phys.x;
    this.playerY = vy;
    this.playerZ = v.phys.z;
    this.playerHeading = v.phys.heading;
    this.playerVx = v.phys.vx;
    this.playerVz = v.phys.vz;

    if (v.hp <= 0) {
      this.spawnParticles(v.phys.x, vy + 1.0, v.phys.z, 26, 0xf97316, 8.5, 1.2, 0.75);
      this.audio.playCrash(1);
      v.disabled = true;
      this.exitVehicle(true);
      this.damageGraceTimer = 0;
      this.applyPlayerDamage(12, 1.5);
      this.showToast('Vehicle Wrecked', 'Bail out! Grab another ride off the street — HP will refill soon!', 'red', 3.8);
    }

    this.audio.updateContinuous(
      dt,
      true,
      v.type,
      v.phys.speed,
      v.phys.isDrifting,
      v.phys.isBoosting,
      this.wanted.stars > 0,
      this.getNearestPoliceDistance(),
    );
  }

  private syncVehicleMesh(v: SimVehicle, dt: number): void {
    const spec = VEHICLE_SPECS[v.type];
    const isBoat = Boolean(spec.isWatercraft);
    const waveBob = isBoat ? Math.sin(this.simTime * 2.1 + v.phys.x * 0.12 + v.phys.z * 0.08) * 0.13 : 0;
    v.rig.root.position.set(v.phys.x, (v.phys.y ?? 0) + waveBob, v.phys.z);
    v.rig.root.rotation.y = v.phys.heading;

    // Suspension pitch / bow lift + body roll / wave heel + engine idle rumble
    const accel = (v.phys.speed - v.prevSpeed) / Math.max(0.008, dt);
    v.prevSpeed = v.phys.speed;
    const suspScale = v.type === 'bus' ? 1.25 : v.type === 'auto' ? 1.45 : v.type === 'sports' ? 0.68 : 1.0;
    const wavePitch = isBoat ? Math.sin(this.simTime * 1.55 + v.phys.z * 0.08) * 0.032 - Math.min(0.06, Math.abs(v.phys.speed) * 0.003) : 0;
    const waveRoll = isBoat ? Math.cos(this.simTime * 1.25 + v.phys.x * 0.1) * 0.042 : 0;
    const targetPitch = isBoat
      ? wavePitch
      : Math.max(-0.075, Math.min(0.085, -accel * 0.0028 * suspScale));
    const speedFactor = Math.min(1, Math.abs(v.phys.speed) / 14);
    const targetRoll = isBoat
      ? waveRoll - v.phys.steerAngle * speedFactor * 0.14
      : Math.max(
          -0.12,
          Math.min(0.12, v.phys.steerAngle * speedFactor * 0.22 * suspScale * (v.phys.isDrifting ? 1.4 : 1)),
        );
    const sk = 1 - Math.exp(-9 * dt);
    v.suspPitch += (targetPitch - v.suspPitch) * sk;
    v.suspRoll += (targetRoll - v.suspRoll) * sk;

    const idleHum = !v.disabled && !isBoat && (v === this.activeVehicle || v.isTraffic)
      ? Math.sin(this.simTime * 28 + v.phys.x) * 0.007
      : 0;
    v.rig.chassisGroup.rotation.x = v.suspPitch;
    v.rig.chassisGroup.rotation.z = v.suspRoll;
    v.rig.chassisGroup.position.y = idleHum;

    // Dynamic brake light glow (bright red when braking or stopped in traffic)
    const brakingNow = v.isBraking || (v.isTraffic && Math.abs(v.phys.speed) < 0.8);
    const brakeIntensity = brakingNow ? 2.8 : 0.65;
    for (let i = 0; i < v.rig.brakeLights.length; i++) {
      (v.rig.brakeLights[i].material as THREE.MeshStandardMaterial).emissiveIntensity = brakeIntensity;
    }

    const wheelSpin = v.phys.speed * dt * 2.4;
    for (let i = 0; i < v.rig.wheels.length; i++) {
      const w = v.rig.wheels[i];
      w.rotation.x += wheelSpin;
      // Front wheels turn
      if ((v.type === 'auto' && i === 0) || (v.type !== 'auto' && i < 2)) {
        w.rotation.y = v.phys.steerAngle * 0.65;
      }
    }

    // Police lightbar flashing when Wanted >= 1
    if (v.isPolice && v.rig.lightbarRed && v.rig.lightbarBlue) {
      const active = this.wanted.stars > 0;
      const blink = Math.floor(this.simTime * 8) % 2 === 0;
      (v.rig.lightbarRed.material as THREE.MeshStandardMaterial).emissiveIntensity =
        active && blink ? 3.2 : 0.25;
      (v.rig.lightbarBlue.material as THREE.MeshStandardMaterial).emissiveIntensity =
        active && !blink ? 3.2 : 0.25;
    }

    // Hit flash feedback
    if (v.hitFlash > 0) {
      v.hitFlash = Math.max(0, v.hitFlash - dt);
      const em = v.hitFlash > 0 ? 0.55 : 0;
      for (const m of v.rig.bodyMeshes) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat.emissive) {
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = em;
        }
      }
    }
  }

  private updateTrafficAndPolice(dt: number): void {
    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      if (v === this.activeVehicle) continue;
      if (v.disabled) {
        this.syncVehicleMesh(v, dt);
        continue;
      }

      // Active Mumbai Police pursuit when Wanted Stars >= 1
      if (v.isPolice && this.wanted.stars > 0 && this.gameState === 'playing') {
        this.stepPolicePursuit(v, dt);
        this.syncVehicleMesh(v, dt);
        continue;
      }

      if (!v.isTraffic) {
        // Parked vehicle (or moored watercraft) drifts gently to halt
        v.phys.vx *= Math.exp(-5 * dt);
        v.phys.vz *= Math.exp(-5 * dt);
        v.phys.speed *= Math.exp(-5 * dt);
        const spec = VEHICLE_SPECS[v.type];
        const col = spec.isWatercraft
          ? resolveWatercraftBounds(v.phys.x + v.phys.vx * dt, v.phys.z + v.phys.vz * dt, spec.width * 0.55)
          : resolveCircleBuildingCollisions(
              v.phys.x + v.phys.vx * dt,
              v.phys.z + v.phys.vz * dt,
              spec.width * 0.6,
              CITY_BUILDINGS,
              v.phys.y ?? 0,
            );
        v.phys.x = col.x;
        v.phys.z = col.z;
        this.syncVehicleMesh(v, dt);
        continue;
      }

      // Compute nearest obstacle/vehicle straight ahead in same lane
      const fx = Math.sin(v.phys.heading);
      const fz = Math.cos(v.phys.heading);
      let nearestAhead = 50;

      for (let j = 0; j < this.vehicles.length; j++) {
        if (i === j) continue;
        const other = this.vehicles[j];
        const dx = other.phys.x - v.phys.x;
        const dz = other.phys.z - v.phys.z;
        const fwd = dx * fx + dz * fz;
        const lat = Math.abs(dx * fz - dz * fx);
        if (fwd > 0 && fwd < nearestAhead && lat < 2.6) {
          nearestAhead = fwd;
        }
      }
      // Also brake for player on foot standing on the road
      if (!this.activeVehicle && this.gameState === 'playing') {
        const dx = this.playerX - v.phys.x;
        const dz = this.playerZ - v.phys.z;
        const fwd = dx * fx + dz * fz;
        const lat = Math.abs(dx * fz - dz * fx);
        if (fwd > 0 && fwd < nearestAhead && lat < 2.0) {
          nearestAhead = fwd;
        }
      }

      const decision = evaluateTrafficBehavior({
        x: v.phys.x,
        z: v.phys.z,
        axis: v.axis,
        dir: v.dir,
        roadCoord: v.roadCoord,
        simTime: this.simTime,
        nearestAheadDist: nearestAhead,
        cruiseSpeed: v.cruiseSpeed,
      });

      v.honkCooldown = Math.max(0, v.honkCooldown - dt);
      if (decision.shouldHonk && v.honkCooldown <= 0 && this.gameState === 'playing') {
        const dPlayer = Math.hypot(v.phys.x - this.playerX, v.phys.z - this.playerZ);
        if (dPlayer < 26) {
          this.audio.playHorn(v.type);
        }
        v.honkCooldown = 3.2 + Math.random() * 2;
      }

      v.isBraking = decision.stoppingForRed || decision.targetSpeed < v.phys.speed - 0.6;
      const brakeRate = decision.stoppingForRed || decision.targetSpeed < 0.2 ? 9.5 : 4.5;
      const k = 1 - Math.exp(-brakeRate * dt);
      v.phys.speed += (decision.targetSpeed - v.phys.speed) * k;
      if (decision.targetSpeed === 0 && Math.abs(v.phys.speed) < 0.25) {
        v.phys.speed = 0;
      }

      // Turn randomly at intersections (and always route around Bronx Ballpark & Arena at 336, 56!)
      v.turnCooldown = Math.max(0, v.turnCooldown - dt);
      if (v.turnCooldown <= 0) {
        for (const inter of INTERSECTIONS) {
          if (Math.hypot(v.phys.x - inter.x, v.phys.z - inter.z) < 4.4) {
            const headsIntoStadium =
              (inter.x === 336 && inter.z === 112 && v.axis === 'ns' && v.dir === -1) ||
              (inter.x === 336 && inter.z === 0 && v.axis === 'ns' && v.dir === 1) ||
              (inter.x === 280 && inter.z === 56 && v.axis === 'ew' && v.dir === 1) ||
              (inter.x === 392 && inter.z === 56 && v.axis === 'ew' && v.dir === -1);
            if (headsIntoStadium || Math.random() < 0.36) {
              const nextAxis: TrafficAxis = v.axis === 'ns' ? 'ew' : 'ns';
              const nextRoad = nextAxis === 'ns' ? inter.x : inter.z;
              let nextDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
              // Never turn into the closed Bronx Stadium center road segment (336, 56)
              if (nextAxis === 'ns' && nextRoad === 336 && inter.z === 112) nextDir = 1;
              if (nextAxis === 'ns' && nextRoad === 336 && inter.z === 0) nextDir = -1;
              if (nextAxis === 'ew' && nextRoad === 56 && inter.x === 280) nextDir = -1;
              if (nextAxis === 'ew' && nextRoad === 56 && inter.x === 392) nextDir = 1;
              v.axis = nextAxis;
              v.roadCoord = nextRoad;
              v.dir = nextDir;
              v.turnCooldown = 2.8;
            } else {
              v.turnCooldown = 1.6;
            }
            break;
          }
        }
      }

      const targetHeading =
        v.axis === 'ns' ? (v.dir === 1 ? 0 : Math.PI) : v.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      let hDiff = targetHeading - v.phys.heading;
      while (hDiff > Math.PI) hDiff -= Math.PI * 2;
      while (hDiff < -Math.PI) hDiff += Math.PI * 2;
      v.phys.heading += hDiff * (1 - Math.exp(-7 * dt));

      const laneTarget = getNycLaneCoord(v.axis, v.dir, v.roadCoord);
      v.phys.vx = Math.sin(v.phys.heading) * v.phys.speed;
      v.phys.vz = Math.cos(v.phys.heading) * v.phys.speed;
      v.phys.x += v.phys.vx * dt;
      v.phys.z += v.phys.vz * dt;

      // Gentle lane centering across doubled 11x11 map bounds
      if (v.axis === 'ns') {
        v.phys.x += (laneTarget - v.phys.x) * (1 - Math.exp(-4 * dt));
        if (v.phys.z > 542) v.dir = -1;
        if (v.phys.z < -96) v.dir = 1;
      } else {
        v.phys.z += (laneTarget - v.phys.z) * (1 - Math.exp(-4 * dt));
        if (v.phys.x > 544) v.dir = -1;
        if (v.phys.x < -58) v.dir = 1;
      }

      this.syncVehicleMesh(v, dt);
    }
  }

  private stepPolicePursuit(v: SimVehicle, dt: number): void {
    const spec = VEHICLE_SPECS.police;
    const dx = this.playerX - v.phys.x;
    const dz = this.playerZ - v.phys.z;
    const dist = Math.hypot(dx, dz) || 1;
    v.deployCooldown = Math.max(0, v.deployCooldown - dt);

    // If this patrol SUV already deployed its officer on foot, keep cruiser stopped with hazard brake lights
    if (v.officerDeployed) {
      v.phys.speed *= Math.exp(-8 * dt);
      v.phys.vx *= Math.exp(-8 * dt);
      v.phys.vz *= Math.exp(-8 * dt);
      v.isBraking = true;
      return;
    }

    // Only gently reposition very distant patrol cruisers during 4-star+ dragnet (no cheap close-range teleporting!)
    if (dist > 260 && this.wanted.stars >= 4) {
      const spawnZ = Math.max(-88, Math.min(516, this.playerZ + (this.playerZ > 80 ? -125 : 125)));
      let nearestRoad: number = ROAD_COORDS[0];
      let bestRd = Infinity;
      for (const rc of ROAD_COORDS) {
        const d = Math.abs(rc - this.playerX);
        if (d < bestRd) {
          bestRd = d;
          nearestRoad = rc;
        }
      }
      v.phys.x = nearestRoad;
      v.phys.z = spawnZ;
    }

    // Policeman leaps out of pursuing Police SUV only when player is slowed down / cornered nearby
    const playerOnWater = Boolean(this.activeVehicle && VEHICLE_SPECS[this.activeVehicle.type].isWatercraft);
    const playerSpd = Math.hypot(this.playerVx, this.playerVz);
    if (
      !playerOnWater &&
      shouldPoliceDeployOfficer({
        wantedStars: this.wanted.stars,
        distToPlayer: dist,
        playerSpeedMps: playerSpd,
        playerInVehicle: Boolean(this.activeVehicle),
        alreadyDeployed: v.officerDeployed,
        deployCooldown: v.deployCooldown,
      })
    ) {
      v.officerDeployed = true;
      v.deployCooldown = 26;
      v.isBraking = true;
      v.phys.speed *= 0.25;
      v.phys.vx *= 0.25;
      v.phys.vz *= 0.25;
      v.suspRoll = 0.09;
      v.rig.driverGroup.visible = false;

      // Compute clean side-door leap position facing the player
      const leapHeading = Math.atan2(dx, dz);
      const sideX = Math.cos(v.phys.heading) * 1.45;
      const sideZ = -Math.sin(v.phys.heading) * 1.45;
      const spawnPos = resolveCircleBuildingCollisions(v.phys.x + sideX, v.phys.z + sideZ, 0.55);
      this.spawnPoliceOfficer(
        spawnPos.x,
        spawnPos.z,
        leapHeading,
        `deployed_cop_${v.id}_${Date.now()}`,
        0.95,
        4.6,
        v.id,
      );
      this.spawnParticles(spawnPos.x, 0.7, spawnPos.z, 10, 0x38bdf8, 3.8, 0.7, 0.4);
      this.audio.playChime([587.33, 783.99]);
      this.showToast('NYPD', 'NYPD Officer stepped out of the cruiser on foot — floor it or cut around the block!', 'amber', 3.2);
      return;
    }

    const desiredHeading = Math.atan2(dx, dz);
    let diff = desiredHeading - v.phys.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    // Calmer pursuit speed & spacing so skilled cornering cleanly pulls away!
    const steer = Math.max(-1, Math.min(1, diff * 1.45));
    const throttle = dist > 11.5 ? 0.92 : dist > 7.2 ? 0.32 : 0;
    v.isBraking = dist <= 13.5;
    v.phys = stepVehiclePhysics(
      v.phys,
      { ...spec, maxSpeed: 16.5 + this.wanted.stars * 1.65, accel: 17.5 },
      { throttle, steer, handbrake: false, boost: false, boostAvailable: false },
      dt,
    );
  }

  private updateVehicleCollisions(dt: number): void {
    for (let i = 0; i < this.vehicles.length; i++) {
      const a = this.vehicles[i];
      const specA = VEHICLE_SPECS[a.type];
      const radA = (specA.width + specA.length) * 0.26;
      const yA = a.phys.y ?? 0;

      // Vehicle hitting player on foot (same elevation only, with grace cooldown)
      if (!this.activeVehicle && !a.disabled && Math.abs(yA - this.playerY) < 2.2) {
        const dx = this.playerX - a.phys.x;
        const dz = this.playerZ - a.phys.z;
        const dist = Math.hypot(dx, dz);
        if (dist < radA + 0.52) {
          const nx = dx / (dist || 1);
          const nz = dz / (dist || 1);
          this.playerX = a.phys.x + nx * (radA + 0.62);
          this.playerZ = a.phys.z + nz * (radA + 0.62);
          const relSpd = Math.hypot(a.phys.vx, a.phys.vz);
          if (relSpd > 5.0) {
            const crash = computeCrashDamage(relSpd, false);
            if (this.applyPlayerDamage(crash.playerDamage, COLLISION_GRACE_SEC)) {
              this.playerVx = nx * Math.min(10, relSpd * 0.72);
              this.playerVz = nz * Math.min(10, relSpd * 0.72);
              this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.42);
              this.audio.playCrash(0.6);
            }
          }
        }
      }

      // Realistic 2D OBB Inelastic Vehicle-to-Vehicle collisions (solid metal crunch, zero wild drifting!)
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const b = this.vehicles[j];
        const yB = b.phys.y ?? 0;
        if (Math.abs(yA - yB) > 2.5) continue;

        const specB = VEHICLE_SPECS[b.type];
        const col = resolveVehiclePairCollision(a.phys, specA, b.phys, specB);
        if (!col.hit) continue;

        const impact = col.impactSpeed;
        // Apply tactile suspension nose-dive / roll crunch to both vehicles
        a.suspPitch = Math.max(-0.18, Math.min(0.18, a.suspPitch + col.pitchImpulseA));
        a.suspRoll = Math.max(-0.18, Math.min(0.18, a.suspRoll + col.rollImpulseA));
        b.suspPitch = Math.max(-0.18, Math.min(0.18, b.suspPitch + col.pitchImpulseB));
        b.suspRoll = Math.max(-0.18, Math.min(0.18, b.suspRoll + col.rollImpulseB));

        // Brake struck AI traffic cars realistically so they react to fender-benders cleanly
        if (impact > 2.6) {
          if (a.isTraffic && a !== this.activeVehicle) {
            a.phys.speed *= 0.25;
            a.isBraking = true;
          }
          if (b.isTraffic && b !== this.activeVehicle) {
            b.phys.speed *= 0.25;
            b.isBraking = true;
          }
        }

        const playerInvolved = a === this.activeVehicle || b === this.activeVehicle;
        if (playerInvolved && impact > 2.2) {
          const other = a === this.activeVehicle ? b : a;
          const mine = a === this.activeVehicle ? a : b;
          const cy = (yA + yB) * 0.5 + 0.75;

          // Subtle scrape sparks & crunch feedback even on moderate bumper taps
          if (impact <= 5.0) {
            this.cameraTrauma = Math.min(1, this.cameraTrauma + Math.min(0.18, impact * 0.035));
            this.audio.playCrash(Math.min(0.38, impact / 14));
            this.spawnParticles(col.contactX, cy, col.contactZ, 6, 0xfde68a, 3.4, 0.45, 0.25);
          } else {
            other.hitFlash = 0.12;

            // Convoy vans always take ram damage on solid hits
            if (other.isConvoy && !other.disabled) {
              other.hp -= impact * 4.8;
              if (other.hp <= 0) {
                other.disabled = true;
                other.isTraffic = false;
                this.convoyDisabledCount++;
                this.cash += 1500;
                this.spawnParticles(other.phys.x, yB + 1.4, other.phys.z, 26, 0xf97316, 8, 1.3, 0.75);
                this.audio.playChime([523.25, 659.25, 783.99]);
                this.showToast(
                  'Convoy Disabled',
                  `Syndicate Van neutralized (${this.convoyDisabledCount}/2)! +$1,500`,
                  'amber',
                  3.5,
                );
              }
            }

            // Spontaneous Armored Cash Van Street Event ramming!
            if (other.isStreetEventVan && !other.disabled && this.activeStreetEvent?.kind === 'armored_van') {
              other.hp -= impact * 5.2;
              this.pendingStreetEvent.vanHitsDelta += 1;
              this.spawnParticles(other.phys.x, yB + 1.4, other.phys.z, 18, 0x22c55e, 7, 1.1, 0.65);
              this.audio.playChime([440, 554.37]);
              if (other.hp <= 0) {
                other.disabled = true;
                other.isTraffic = false;
                this.pendingStreetEvent.vanDisabled = true;
              }
            }

            // Fair, capped crash damage with grace cooldown + tactile sparks & smoke at exact bumper contact
            if (this.damageGraceTimer <= 0) {
              const crash = computeCrashDamage(impact, true);
              this.applyPlayerDamage(crash.playerDamage, COLLISION_GRACE_SEC);
              mine.hp = Math.max(0, mine.hp - crash.vehicleDamage);
              this.hitstopTimer = 0.032;
              this.cameraTrauma = Math.min(1, this.cameraTrauma + Math.min(0.62, impact / 22));
              this.audio.playCrash(Math.min(1, impact / 19));
              this.spawnParticles(col.contactX, cy, col.contactZ, 14, 0xfbbf24, 6.2, 0.75, 0.42);
              this.spawnParticles(col.contactX, cy + 0.2, col.contactZ, 6, 0x94a3b8, 2.2, 0.7, 0.5);

              // Calmer police response: light fender-benders don't trigger immediate pursuits
              if (other.isPolice) {
                this.addHeat(28);
              } else if (impact > 13.0) {
                this.addHeat(10);
              }
            }
          }
        }
      }
    }
    void dt;
  }

  private updateNpcs(dt: number): void {
    const playerSpd = Math.hypot(this.playerVx, this.playerVz);
    let activeRivalAttackers = 0;

    if (this.gameState === 'playing') {
      this.npcChatterCooldown = Math.max(0, this.npcChatterCooldown - dt);
    }
    const honkedRecently = this.simTime - this.lastHonkTime < 1.35;
    const shovedRecently = this.simTime - this.lastShoveTime < 1.25;
    let bestReaction: {
      npc: SimNpc;
      result: ReturnType<typeof evaluateNpcReaction>;
    } | null = null;

    for (let i = this.npcs.length - 1; i >= 0; i--) {
      const npc = this.npcs[i];
      if (npc.archetype === 'cricketer' || npc.archetype === 'baller') continue;
      if (npc.reactionCooldown > 0) {
        npc.reactionCooldown = Math.max(0, npc.reactionCooldown - dt);
      }

      // KO topple + parabolic airborne knockback transition before cleanup/respawn
      if (npc.knockoutTimer > 0) {
        npc.knockoutTimer -= dt;
        npc.rig.bodyGroup.rotation.x = Math.min(Math.PI * 0.48, npc.rig.bodyGroup.rotation.x + dt * 6.5);
        npc.rig.bodyGroup.position.y = Math.min(0.24, npc.rig.bodyGroup.rotation.x * 0.16);
        npc.rig.leftKnee.rotation.x = 0.35;
        npc.rig.rightKnee.rotation.x = 0.55;
        npc.rig.leftElbow.rotation.x = -0.65;
        npc.rig.rightElbow.rotation.x = -0.5;
        const koCol = resolveCircleBuildingCollisions(npc.x + npc.vx * dt, npc.z + npc.vz * dt, 0.48);
        npc.x = koCol.x;
        npc.z = koCol.z;
        npc.vx *= Math.exp(-4.2 * dt);
        npc.vz *= Math.exp(-4.2 * dt);
        if (npc.y > 0 || npc.vy > 0) {
          npc.y += npc.vy * dt;
          npc.vy -= 18 * dt;
          if (npc.y <= 0) {
            npc.y = 0;
            npc.vy = 0;
          }
        }
        npc.rig.root.position.set(npc.x, npc.y, npc.z);
        if (npc.hitFlash > 0) {
          npc.hitFlash = Math.max(0, npc.hitFlash - dt);
          const em = npc.hitFlash > 0 ? 0.75 : 0;
          for (const m of npc.rig.hitMeshes) {
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat.emissive) {
              mat.emissive.setHex(0xff5a5f);
              mat.emissiveIntensity = em;
            }
          }
        }
        if (npc.knockoutTimer <= 0) {
          if (npc.archetype.startsWith('rival_')) {
            this.scene.remove(npc.rig.root);
            this.npcs.splice(i, 1);
          } else {
            // Commuter gets back up groggily
            npc.hp = 45;
            npc.rig.bodyGroup.rotation.x = 0;
            npc.rig.bodyGroup.position.y = 0;
          }
        }
        continue;
      }

      if (npc.archetype === 'commuter') {
        npc.standTimer -= dt;
        if (npc.standTimer <= 0) {
          npc.isStanding = !npc.isStanding;
          npc.standTimer = npc.isStanding ? 3.2 + Math.random() * 4.8 : 6.0 + Math.random() * 7.5;
          if (!npc.isStanding) {
            npc.patrolHeading += (Math.random() - 0.5) * 0.85;
          }
        }
        npc.patrolTimer -= dt;
        if (npc.patrolTimer <= 0) {
          npc.patrolHeading += (Math.random() - 0.5) * 0.9;
          npc.patrolTimer = 3.2 + Math.random() * 4.0;
        }
        // Keep commuters walking along NYC sidewalks rather than wandering into the middle of avenues!
        const sw = steerPedestrianForSidewalk({
          x: npc.x,
          z: npc.z,
          heading: npc.patrolHeading,
          allowCrossing: i % 15 === 0,
        });
        npc.patrolHeading = sw.heading;
      } else if (npc.archetype === 'police_officer') {
        npc.patrolTimer -= dt;
        if (npc.patrolTimer <= 0) {
          npc.patrolHeading += (Math.random() - 0.5) * 0.9;
          npc.patrolTimer = 4.0 + Math.random() * 4.0;
        }
        if (this.wanted.stars === 0) {
          const sw = steerPedestrianForSidewalk({
            x: npc.x,
            z: npc.z,
            heading: npc.patrolHeading,
            allowCrossing: false,
          });
          npc.patrolHeading = sw.heading;
        }
        // Return cruiser-deployed officer to patrol car once heat clears
        if (npc.deployedFromVehicleId && this.wanted.stars === 0) {
          const parentVeh = this.vehicles.find((v) => v.id === npc.deployedFromVehicleId);
          if (parentVeh && !parentVeh.disabled) {
            parentVeh.officerDeployed = false;
            parentVeh.rig.driverGroup.visible = true;
          }
          this.scene.remove(npc.rig.root);
          this.npcs.splice(i, 1);
          continue;
        }
      }

      const motion = computeNpcDesiredVelocity({
        archetype: npc.archetype,
        x: npc.x,
        z: npc.z,
        playerX: this.playerX,
        playerZ: this.playerZ,
        playerVx: this.playerVx,
        playerVz: this.playerVz,
        playerSpeed: playerSpd,
        patrolHeading: npc.patrolHeading,
        strafeSign: npc.strafeSign,
        windupTimer: npc.windupTimer,
        wantedStars: this.wanted.stars,
      });

      if (npc.archetype === 'commuter' && npc.isStanding && !motion.fleeing) {
        motion.desiredVx = 0;
        motion.desiredVz = 0;
      }

      const k = 1 - Math.exp(-7 * dt);
      npc.vx += (motion.desiredVx - npc.vx) * k;
      npc.vz += (motion.desiredVz - npc.vz) * k;

      // Parabolic leap-out / knockback arc gravity
      if (npc.y > 0 || npc.vy > 0) {
        npc.y += npc.vy * dt;
        npc.vy -= 18 * dt;
        if (npc.y <= 0) {
          npc.y = 0;
          npc.vy = 0;
        }
      }

      const prevX = npc.x;
      const prevZ = npc.z;
      const col = resolveCircleBuildingCollisions(npc.x + npc.vx * dt, npc.z + npc.vz * dt, 0.48);
      npc.x = col.x;
      npc.z = col.z;
      if (col.hit && (npc.archetype === 'commuter' || npc.archetype === 'police_officer')) {
        npc.patrolHeading += Math.PI * 0.65;
      }

      const moved = Math.hypot(npc.x - prevX, npc.z - prevZ);
      if (moved > 0.005) {
        npc.heading = Math.atan2(npc.x - prevX, npc.z - prevZ);
      }

      npc.gaitPhase += moved * 2.4;
      const moveRatio = Math.min(1, moved * 14);
      const swing = Math.sin(npc.gaitPhase) * 0.62 * moveRatio;
      const cosG = Math.cos(npc.gaitPhase);
      npc.rig.leftLeg.rotation.x = npc.y > 0.12 ? -0.55 : -swing;
      npc.rig.rightLeg.rotation.x = npc.y > 0.12 ? 0.45 : swing;
      npc.rig.leftKnee.rotation.x = npc.y > 0.12 ? 0.85 : 0.06 + Math.max(0, cosG) * 0.68 * moveRatio;
      npc.rig.rightKnee.rotation.x = npc.y > 0.12 ? 0.65 : 0.06 + Math.max(0, -cosG) * 0.68 * moveRatio;
      npc.rig.leftElbow.rotation.x = -0.22 - moveRatio * 0.35;
      npc.rig.rightElbow.rotation.x = -0.22 - moveRatio * 0.35;

      if (npc.archetype === 'vendor' || npc.archetype === 'informant' || npc.archetype === 'shopkeeper') {
        // Friendly street vendor / shopkeeper waving & gesturing behind counter
        const wave = Math.sin(this.simTime * 3.4 + i) * 0.35;
        npc.rig.rightArm.rotation.x = -1.65 + wave * 0.4;
        npc.rig.rightArm.rotation.z = -0.35 + wave;
        npc.rig.leftArm.rotation.x = Math.sin(this.simTime * 1.8 + i) * 0.14;
        npc.rig.leftArm.rotation.z = 0;
        npc.rig.bodyGroup.position.y = Math.sin(this.simTime * 2.4 + i) * 0.025;
        npc.rig.headGroup.rotation.y = Math.sin(this.simTime * 1.3 + i) * 0.35;
      } else if (npc.archetype === 'police_officer' && this.wanted.stars > 0) {
        // Pursuing Mumbai Police officer raises baton while sprinting to catch player
        npc.rig.leftArm.rotation.x = -swing * 1.1;
        npc.rig.leftArm.rotation.z = 0;
        npc.rig.rightArm.rotation.x = -1.45 + Math.sin(this.simTime * 10 + i) * 0.45;
        npc.rig.rightArm.rotation.z = -0.15;
        npc.rig.bodyGroup.position.y = Math.abs(Math.sin(npc.gaitPhase)) * 0.075;
        npc.rig.bodyGroup.rotation.x = 0.16;
        npc.rig.headGroup.rotation.y = 0;

        // Close-range baton catch/tackle when officer reaches wanted player
        npc.attackCooldown = Math.max(0, npc.attackCooldown - dt);
        const distP = Math.hypot(this.playerX - npc.x, this.playerZ - npc.z);
        if (distP < 2.25 && npc.attackCooldown <= 0 && this.gameState === 'playing') {
          npc.attackCooldown = 1.65;
          if (!this.activeVehicle) {
            this.applyPlayerDamage(8, 0.65);
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.35);
            this.audio.playCrash(0.45);
            this.spawnParticles(this.playerX, this.playerY + 1.1, this.playerZ, 8, 0x3b82f6, 3.8, 0.55, 0.35);
          }
        }
      } else if (motion.fleeing) {
        // Startled commuter raises arms while dashing out of traffic
        npc.rig.leftArm.rotation.x = -2.35 + swing * 0.4;
        npc.rig.rightArm.rotation.x = -2.35 - swing * 0.4;
        npc.rig.rightArm.rotation.z = 0;
        npc.rig.bodyGroup.position.y = Math.abs(Math.sin(npc.gaitPhase)) * 0.07;
        npc.rig.bodyGroup.rotation.x = 0.16;
      } else {
        if (npc.rig.isCarryingUmbrella) {
          // Hold open rain umbrella upright overhead with left arm
          npc.rig.leftArm.rotation.x = -0.95 + Math.sin(this.simTime * 2.0 + i) * 0.04;
          npc.rig.leftArm.rotation.z = -0.08;
        } else {
          // Contralateral arm swing (left arm swings back when left leg swings forward!)
          npc.rig.leftArm.rotation.x = moved > 0.008 ? swing * 0.78 : Math.sin(this.simTime * 1.5 + i) * 0.05;
          npc.rig.leftArm.rotation.z = -0.07;
        }
        npc.rig.rightArm.rotation.x = moved > 0.008 ? -swing * 0.78 : Math.sin(this.simTime * 1.6 + i + 1) * 0.06;
        npc.rig.rightArm.rotation.z = 0.07;
        npc.rig.bodyGroup.position.y =
          moved > 0.01 ? (Math.abs(cosG) - 0.5) * 0.04 : Math.sin(this.simTime * 2.2 + i) * 0.014;
        npc.rig.bodyGroup.rotation.x = npc.archetype.startsWith('rival_') ? 0.14 : moved > 0.01 ? 0.045 : 0;
        npc.rig.headGroup.rotation.y =
          moved > 0.01
            ? Math.sin(this.simTime * 1.1 + i * 1.7) * 0.22
            : Math.sin(this.simTime * 0.85 + i * 2.1) * 0.42;
      }

      npc.rig.root.position.set(npc.x, npc.y, npc.z);
      npc.rig.root.rotation.y = npc.heading;

      // Contextual localized Mumbai pedestrian dialogue evaluation (throttled cleanly)
      if (
        this.gameState === 'playing' &&
        npc.archetype === 'commuter' &&
        this.npcChatterCooldown <= 0 &&
        npc.reactionCooldown <= 0
      ) {
        const distToPlayer = Math.hypot(npc.x - this.playerX, npc.z - this.playerZ);
        if (distToPlayer <= 15.5) {
          const reaction = evaluateNpcReaction({
            npcName: npc.name,
            district: getDistrictAt(npc.x, npc.z, 0),
            distanceMeters: distToPlayer,
            playerInVehicle: Boolean(this.activeVehicle),
            playerVehicleType: this.activeVehicle ? this.activeVehicle.type : null,
            playerSpeedMps: playerSpd,
            playerHonkedRecently: honkedRecently,
            playerShovedRecently: shovedRecently,
            wantedStars: this.wanted.stars,
            seed: i * 13 + Math.floor(this.simTime * 2) + this.toastSeq,
          });
          if (reaction && (!bestReaction || !bestReaction.result || reaction.priority > bestReaction.result.priority)) {
            bestReaction = { npc, result: reaction };
          }
        }
      }

      // Hit flash recovery
      if (npc.hitFlash > 0) {
        npc.hitFlash = Math.max(0, npc.hitFlash - dt);
        const em = npc.hitFlash > 0 ? 0.7 : 0;
        for (const m of npc.rig.hitMeshes) {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            mat.emissive.setHex(0xffffff);
            mat.emissiveIntensity = em;
          }
        }
      }

      // Check player driving vehicle hitting NPC (true OBB vehicle footprint check — never misses bumper hits!)
      if (this.activeVehicle && this.gameState === 'playing') {
        const vehSpec = VEHICLE_SPECS[this.activeVehicle.type];
        const impact = evaluateVehicleNpcImpact({
          vehicle: this.activeVehicle.phys,
          spec: vehSpec,
          npcX: npc.x,
          npcZ: npc.z,
        });
        if (impact.hit) {
          npc.hp -= impact.damage;
          npc.hitFlash = 0.28;
          npc.vx = impact.launchVx;
          npc.vy = impact.launchVy;
          npc.vz = impact.launchVz;
          npc.knockoutTimer = npc.archetype.startsWith('rival_') ? 0.75 : impact.knockoutDuration;
          this.hitstopTimer = 0.038;
          this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.36);
          this.audio.playCrash(Math.min(0.85, 0.35 + impact.impactSpeed * 0.03));
          this.spawnParticles(npc.x, 1.05, npc.z, 16, 0xef4444, 6.2, 0.78, 0.48);
          if (npc.archetype.startsWith('rival_')) {
            this.cash += 250;
            this.showToast('Rival Flattened', 'Syndicate enforcer taken out (+$250)', 'amber', 2.4);
          } else {
            this.addHeat(35);
            this.showToast(npc.name, 'Agh! Watch where you’re driving!', 'red', 2.4);
          }
          continue;
        }
      }

      // Rival telegraphed melee/lunge attack (token cap: max 2 concurrent attackers)
      if (npc.archetype.startsWith('rival_') && this.gameState === 'playing') {
        npc.attackCooldown = Math.max(0, npc.attackCooldown - dt);
        const distP = Math.hypot(this.playerX - npc.x, this.playerZ - npc.z);
        if (motion.telegraphAttack && npc.attackCooldown <= 0 && activeRivalAttackers < 2) {
          activeRivalAttackers++;
          if (npc.windupTimer <= 0) {
            npc.windupTimer = 0.45; // 450ms visible windup telegraph
          } else {
            npc.windupTimer -= dt;
            if (npc.windupTimer <= 0) {
              // Execute active hit
              if (distP < 3.6) {
                const dmg = this.activeVehicle ? 5 : 14;
                if (this.applyPlayerDamage(dmg, 0.55)) {
                  this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.45);
                  this.audio.playCrash(0.6);
                  this.spawnParticles(this.playerX, this.playerY + 1.1, this.playerZ, 10, 0xef4444, 4.5, 0.65, 0.4);
                }
              }
              npc.attackCooldown = 1.45;
            }
          }
          if (npc.rig.telegraphRing) {
            npc.rig.telegraphRing.visible = npc.windupTimer > 0;
            const s = 1 + (0.45 - Math.max(0, npc.windupTimer)) * 1.4;
            npc.rig.telegraphRing.scale.set(s, s, 1);
          }
        } else if (npc.rig.telegraphRing) {
          npc.rig.telegraphRing.visible = false;
          npc.windupTimer = 0;
        }
      }
    }

    // Fire the highest-priority localized Mumbai pedestrian reaction if toast slot is free (or urgent reaction)
    if (bestReaction && bestReaction.result) {
      const r = bestReaction.result;
      const canDisplay = !this.toast || (r.priority >= 3 && this.toastTimer < 2.2);
      if (canDisplay) {
        this.showToast(r.speaker, r.text, r.accent, 3.4);
        bestReaction.npc.heading = Math.atan2(
          this.playerX - bestReaction.npc.x,
          this.playerZ - bestReaction.npc.z,
        );
        bestReaction.npc.reactionCooldown = 14.0;
        this.npcChatterCooldown = r.priority >= 3 ? 3.8 : 5.5;
        this.pushHudSnapshot(true);
      }
    }
  }

  private updateParkSports(dt: number): void {
    for (const venue of this.parkVenues) {
      const res = stepParkMatch(venue.def, venue.state, dt);
      venue.state = res.next;
      venue.swingAnimTimer = Math.max(0, venue.swingAnimTimer - dt);

      if (res.hitEvent && venue.state.mode !== 'joined') {
        venue.swingAnimTimer = 0.42;
      }

      if (res.completedReward > 0) {
        this.cash += res.completedReward;
        this.audio.playChime([523.25, 659.25, 783.99, 1046.5]);
        this.spawnParticles(venue.def.creaseX, 1.4, venue.def.creaseZ, 22, 0xfbbf24, 6.5, 0.9, 0.7);
        this.showToast(
          `${venue.def.name} · Payout!`,
          `Pickup match complete! Earned +$${res.completedReward.toLocaleString('en-US')}!`,
          'amber',
          4.6,
        );
        if (this.activeParkVenueId === venue.def.id) {
          this.leaveParkSport(true);
        }
        this.pushHudSnapshot(true);
      }

      // Sync 3D cricket ball / basketball trajectory
      venue.ballMesh.position.set(venue.state.ballX, venue.state.ballY, venue.state.ballZ);
      venue.ballMesh.rotation.x += dt * 9;
      venue.ballMesh.rotation.z += dt * 6;

      // Pulse ground ring marker gently
      if (venue.markerRing) {
        const pulse = 1 + Math.sin(this.simTime * 3.0) * 0.05;
        venue.markerRing.scale.set(pulse, pulse, 1);
      }

      // Animate all NPC cricketers / streetballers live on pitch/court
      const t = this.simTime;
      for (let i = 0; i < venue.players.length; i++) {
        const p = venue.players[i];
        const rig = p.npc.rig;
        if (!rig.root.visible) continue;

        if (p.role === 'bowler') {
          // Run-up stride during ready/delivery phase
          const runUp = venue.state.phase === 'delivery' ? Math.min(1, venue.state.timingValue * 2.4) : 0;
          const pz = p.homeZ + (venue.def.sport === 'cricket' ? runUp * 2.2 - 1.2 : Math.sin(t * 2.5) * 0.6);
          p.npc.x = p.homeX;
          p.npc.z = pz;
          rig.root.position.set(p.homeX, 0, pz);
          rig.root.rotation.y = Math.atan2(venue.def.creaseX - p.homeX, venue.def.creaseZ - pz);
          const bowlArm = venue.state.phase === 'delivery' ? -Math.PI * 1.4 * Math.min(1, venue.state.timingValue * 3) : -0.4;
          rig.rightArm.rotation.x = bowlArm;
          rig.leftArm.rotation.x = -bowlArm * 0.45;
          const stride = Math.sin(t * 9 + i) * (venue.state.phase === 'delivery' ? 0.7 : 0.12);
          rig.leftLeg.rotation.x = stride;
          rig.rightLeg.rotation.x = -stride;
        } else if (p.role === 'batter') {
          rig.root.position.set(p.homeX, 0, p.homeZ);
          rig.root.rotation.y = Math.atan2(venue.def.bowlerX - p.homeX, venue.def.bowlerZ - p.homeZ);
          const swing = venue.swingAnimTimer > 0 ? Math.sin((venue.swingAnimTimer / 0.42) * Math.PI) : 0;
          rig.rightArm.rotation.x = -0.55 - swing * 1.5;
          rig.leftArm.rotation.x = -0.5 - swing * 1.2;
          rig.bodyGroup.rotation.y = -0.45 * swing;
          rig.leftLeg.rotation.x = -0.14;
          rig.rightLeg.rotation.x = 0.16;
        } else {
          // Keeper & outfielders shuffle & track the live ball!
          const bx = venue.state.ballX;
          const bz = venue.state.ballZ;
          const chase = venue.state.phase === 'ball_in_flight' ? 0.16 : 0;
          const tx = p.homeX + (bx - p.homeX) * chase;
          const tz = p.homeZ + (bz - p.homeZ) * chase;
          p.npc.x += (tx - p.npc.x) * Math.min(1, dt * 4);
          p.npc.z += (tz - p.npc.z) * Math.min(1, dt * 4);
          rig.root.position.set(p.npc.x, 0, p.npc.z);
          rig.root.rotation.y = Math.atan2(bx - p.npc.x, bz - p.npc.z);
          const readyBob = Math.abs(Math.sin(t * 4.2 + i * 1.4)) * 0.05;
          rig.bodyGroup.position.y = readyBob;
          rig.leftArm.rotation.x = -0.45 + Math.sin(t * 3 + i) * 0.15;
          rig.rightArm.rotation.x = -0.45 - Math.sin(t * 3 + i) * 0.15;
          rig.leftLeg.rotation.x = Math.sin(t * 5 + i) * (chase > 0 ? 0.55 : 0.14);
          rig.rightLeg.rotation.x = -rig.leftLeg.rotation.x;
        }
      }
    }
  }

  private updateInstancedCrowd(dt: number): void {
    const rig = this.crowdRig;
    if (!rig || this.crowdAgents.length === 0) return;

    const playerSpd = Math.hypot(this.playerVx, this.playerVz);
    const honked = this.simTime - this.lastHonkTime < 1.3;
    const isPlaying = this.gameState === 'playing';
    const activeVeh = this.activeVehicle;
    const activeVehSpec = activeVeh ? VEHICLE_SPECS[activeVeh.type] : null;
    let vehicleStruckCrowd = false;

    for (let i = 0; i < this.crowdAgents.length; i++) {
      const a = this.crowdAgents[i];
      if (a.hitFlash > 0) a.hitFlash = Math.max(0, a.hitFlash - dt);
      if (a.hurtCooldown > 0) a.hurtCooldown = Math.max(0, a.hurtCooldown - dt);

      // 1. Knocked-down / hurt crowd pedestrian physics (airborne launch, pavement slide, topple & recovery!)
      if (a.knockoutTimer > 0) {
        a.knockoutTimer -= dt;
        a.fallAngle = Math.min(Math.PI * 0.48, a.fallAngle + dt * 7.2);
        const koCol = resolveCircleBuildingCollisions(a.x + a.vx * dt, a.z + a.vz * dt, 0.44);
        a.x = koCol.x;
        a.z = koCol.z;
        a.vx *= Math.exp(-4.2 * dt);
        a.vz *= Math.exp(-4.2 * dt);
        if (a.y > 0 || a.vy > 0) {
          a.y += a.vy * dt;
          a.vy -= 18 * dt;
          if (a.y <= 0) {
            a.y = 0;
            a.vy = 0;
          }
        }
        if (a.knockoutTimer <= 0) {
          a.hp = 45;
          a.fallAngle = 0;
          a.vx = 0;
          a.vz = 0;
          a.y = 0;
          a.vy = 0;
          a.fleeing = true;
          a.isStanding = false;
        }
        rig.updateAgentPose(i, a.x, a.y, a.z, a.heading, a.gaitPhase, 0, a.heightScale, false, a.fallAngle, a.hitFlash);
        continue;
      }

      // Smoothly recover fall angle if still straightening up
      if (a.fallAngle > 0) {
        a.fallAngle = Math.max(0, a.fallAngle - dt * 5.0);
      }

      // Knockback slide even from non-fatal punch staggers
      if (Math.hypot(a.vx, a.vz) > 0.25 || a.y > 0) {
        const stagCol = resolveCircleBuildingCollisions(a.x + a.vx * dt, a.z + a.vz * dt, 0.44);
        a.x = stagCol.x;
        a.z = stagCol.z;
        a.vx *= Math.exp(-6.5 * dt);
        a.vz *= Math.exp(-6.5 * dt);
        if (a.y > 0 || a.vy > 0) {
          a.y += a.vy * dt;
          a.vy -= 18 * dt;
          if (a.y <= 0) {
            a.y = 0;
            a.vy = 0;
          }
        }
      }

      // 2. Check player driving vehicle hitting instanced crowd pedestrian (OBB footprint check!)
      if (isPlaying && activeVeh && activeVehSpec && a.hurtCooldown <= 0) {
        const impact = evaluateVehicleNpcImpact({
          vehicle: activeVeh.phys,
          spec: activeVehSpec,
          npcX: a.x,
          npcZ: a.z,
        });
        if (impact.hit) {
          a.hp = 0;
          a.hitFlash = 0.3;
          a.hurtCooldown = 0.65;
          a.knockoutTimer = impact.knockoutDuration;
          a.vx = impact.launchVx;
          a.vy = impact.launchVy;
          a.vz = impact.launchVz;
          a.fallAngle = 0.25;
          a.isStanding = false;
          vehicleStruckCrowd = true;
          this.spawnParticles(a.x, 1.05, a.z, 15, 0xef4444, 6.0, 0.76, 0.46);
          this.addHeat(28);
          rig.updateAgentPose(i, a.x, a.y, a.z, a.heading, a.gaitPhase, 0, a.heightScale, false, a.fallAngle, a.hitFlash);
          continue;
        }
      }

      a.pauseTimer -= dt;
      if (a.pauseTimer <= 0) {
        a.isStanding = !a.isStanding;
        a.pauseTimer = a.isStanding ? 2.4 + (i % 4) * 0.9 : 5.5 + (i % 5) * 1.4;
        if (!a.isStanding) {
          a.heading += ((i % 3) - 1) * 0.35;
        }
      }
      a.turnTimer -= dt;
      if (a.turnTimer <= 0) {
        a.heading += (((i * 19 + Math.floor(this.simTime)) % 7) - 3) * 0.16;
        a.turnTimer = 3.6 + (i % 4) * 0.95;
      }

      // 3. Keep pedestrians bustling on NYC sidewalks and out of the middle of roads!
      const sw = steerPedestrianForSidewalk({
        x: a.x,
        z: a.z,
        heading: a.heading,
        allowCrossing: a.canCrosswalk,
      });
      a.heading = sw.heading;
      if (sw.onRoad && !a.canCrosswalk) {
        // Gently nudge road-straying walkers back onto the concrete curb
        a.x += sw.pushX * 2.2 * dt;
        a.z += sw.pushZ * 2.2 * dt;
        a.isStanding = false;
      }

      // React to nearby speeding player vehicle or horn + stream distant crowd agents cleanly onto nearby SIDEWALKS!
      let speed = a.isStanding ? 0 : a.baseSpeed;
      a.fleeing = false;
      if (isPlaying) {
        const dx = a.x - this.playerX;
        const dz = a.z - this.playerZ;
        const dSq = dx * dx + dz * dz;
        if (i >= 210 && dSq > 125 * 125) {
          // Stream distant dynamic crowd agents strictly onto nearby sidewalks (never onto asphalt!)
          const ang = (i * 2.39996 + this.simTime * 0.2) % (Math.PI * 2);
          const rad = 20 + ((i * 17) % 62);
          const rx = Math.max(-62, Math.min(535, this.playerX + Math.cos(ang) * rad));
          const rz = Math.max(-98, Math.min(535, this.playerZ + Math.sin(ang) * rad));
          const snapped = snapPointToSidewalk(rx, rz, i % 2 === 0 ? 1 : -1, (i % 7) / 6);
          a.x = snapped.x;
          a.z = snapped.z;
          a.heading = snapped.heading;
          a.isStanding = i % 6 === 0;
          a.hp = 45;
          a.knockoutTimer = 0;
          a.fallAngle = 0;
        } else if (dSq < 110 && (playerSpd > 8.0 || honked)) {
          a.fleeing = true;
          a.isStanding = false;
          a.heading = Math.atan2(dx, dz);
          speed = 4.4;
        }
      }

      if (speed > 0.05) {
        const nx = a.x + Math.sin(a.heading) * speed * dt;
        const nz = a.z + Math.cos(a.heading) * speed * dt;
        const col = resolveCircleBuildingCollisions(nx, nz, 0.42);
        a.x = col.x;
        a.z = col.z;
        if (col.hit) {
          a.heading += Math.PI * 0.65;
        }
        a.gaitPhase += speed * dt * 2.4;
      }

      rig.updateAgentPose(
        i,
        a.x,
        a.y,
        a.z,
        a.heading,
        a.gaitPhase,
        Math.min(1, speed / 3.2),
        a.heightScale,
        a.fleeing,
        a.fallAngle,
        a.hitFlash,
      );
    }

    if (vehicleStruckCrowd) {
      this.hitstopTimer = 0.036;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.34);
      this.audio.playCrash(0.58);
      this.showToast('NYC Pedestrian', 'Whoa! You hit someone — NYPD alerted!', 'red', 2.4);
      this.pushHudSnapshot(true);
    }

    rig.commitMatrices();
  }

  private getNearestPoliceDistance(): number {
    let minD = 999;
    for (const v of this.vehicles) {
      if (!v.isPolice || v.disabled) continue;
      const d = Math.hypot(v.phys.x - this.playerX, v.phys.z - this.playerZ);
      if (d < minD) minD = d;
    }
    for (const n of this.npcs) {
      if (n.archetype !== 'police_officer' || n.knockoutTimer > 0) continue;
      const d = Math.hypot(n.x - this.playerX, n.z - this.playerZ);
      if (d < minD) minD = d;
    }
    return minD;
  }

  private updateWantedAndMissions(dt: number): void {
    // 0. Health damage cooldown, visual flash decay, auto-regeneration & active vehicle hull recovery
    this.damageGraceTimer = Math.max(0, this.damageGraceTimer - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.6);
    this.timeSinceDamage += dt;

    if (this.playerHp > 0 && this.playerHp < this.playerMaxHp) {
      const regen = stepHealthRegen(this.playerHp, this.playerMaxHp, this.timeSinceDamage, dt);
      this.playerHp = regen.hp;
      this.hpRegenerating = regen.regenerating;
      if (regen.regenerating) {
        this.regenParticleAcc += dt;
        if (this.regenParticleAcc >= 0.28) {
          this.regenParticleAcc = 0;
          this.spawnParticles(this.playerX, this.playerY + 1.0, this.playerZ, 2, 0x4ade80, 1.6, 0.45, 0.45);
        }
      }
    } else {
      this.hpRegenerating = false;
    }

    // Gentle active vehicle hull recovery after 5.5s without crashes
    if (this.activeVehicle && !this.activeVehicle.disabled && this.timeSinceDamage >= 5.5) {
      this.activeVehicle.hp = Math.min(this.activeVehicle.maxHp, this.activeVehicle.hp + 6.0 * dt);
    }

    // 1. Check player HP defeat
    if (this.playerHp <= 0) {
      this.triggerGameOver('wasted');
      return;
    }

    // 2. Wanted stars & busted check
    const policeDist = this.getNearestPoliceDistance();
    const playerSpeed = Math.hypot(this.playerVx, this.playerVz);
    const wantedRes = stepWantedSystem(this.wanted, dt, policeDist, playerSpeed);
    const prevStars = this.wanted.stars;
    this.wanted = wantedRes.next;
    this.wantedCooldownRatio = wantedRes.cooldownRatio;
    if (this.wanted.stars < prevStars && this.wanted.stars === 0) {
      this.showToast('Heat Cleared', 'You lost NYPD!', 'teal', 3.2);
      this.audio.playChime([523.25, 659.25]);
    }
    if (wantedRes.busted) {
      this.triggerGameOver('busted');
      return;
    }

    // 3. Active Mission Evaluation (including interactive character/task/collect/sport steps!)
    if (this.activeMission) {
      const def = getMissionById(this.activeMission.missionId);
      const events = this.pendingMissionEvents;
      const outcome = evaluateMissionTick(this.activeMission, {
        dt,
        playerX: this.playerX,
        playerZ: this.playerZ,
        vehicleType: this.activeVehicle ? this.activeVehicle.type : null,
        wantedStars: this.wanted.stars,
        convoyDisabledCount: this.convoyDisabledCount,
        talkedToMissionNpc: events.talked,
        performedTask: events.taskDone,
        confrontedTarget: events.confronted,
        boughtFromShop: events.boughtShop,
        changedOutfit: events.changedOutfit,
        parkRunsEarnedDelta: events.parkRunsDelta,
        activeParkVenueId: this.activeParkVenueId,
      });
      // Reset single-frame event flags after consuming
      this.pendingMissionEvents.talked = false;
      this.pendingMissionEvents.taskDone = false;
      this.pendingMissionEvents.confronted = false;
      this.pendingMissionEvents.boughtShop = false;
      this.pendingMissionEvents.changedOutfit = false;
      this.pendingMissionEvents.parkRunsDelta = 0;

      if (outcome.itemCollectedIndex !== undefined) {
        const picked = this.missionCollectMeshes.find((m) => m.index === outcome.itemCollectedIndex);
        if (picked && picked.mesh.visible) {
          picked.mesh.visible = false;
          this.audio.playChime([587.33, 880]);
          this.spawnParticles(picked.x, 1.1, picked.z, 18, 0xfbbf24, 5.5, 0.85, 0.55);
          const countNow = outcome.nextState?.collectedIndices.length ?? 0;
          const totalNow = def?.steps[this.activeMission.stepIndex]?.collectPoints?.length ?? 3;
          if (outcome.status === 'active') {
            this.showToast('Item Collected', `${picked.label} secured (${countNow}/${totalNow})!`, 'teal', 3.0);
          }
        }
      }

      if (outcome.status === 'failed_timeout') {
        this.activeMission = null;
        this.missionBeaconGroup.visible = false;
        this.removeMissionRivals();
        this.removeMissionConvoy();
        this.clearInteractiveMissionActors();
        this.audio.playDefeatSting();
        this.showToast('Mission Failed', outcome.bannerText ?? 'Time ran out.', 'red', 4.5);
        this.pushHudSnapshot(true);
      } else if (outcome.status === 'completed') {
        this.cash += outcome.reward;
        this.completedMissionIds = outcome.nextState?.completedIds ?? this.completedMissionIds;
        this.activeMission = null;
        this.missionBeaconGroup.visible = false;
        this.removeMissionRivals();
        this.removeMissionConvoy();
        this.clearInteractiveMissionActors();
        this.spawnParticles(this.playerX, 1.5, this.playerZ, 24, 0xfbbf24, 7.0, 1.0, 0.8);
        this.audio.playChime([523.25, 659.25, 783.99, 1046.5]);
        this.showToast('Mission Passed!', outcome.bannerText ?? 'Reward earned!', 'amber', 5.0);
        this.pushHudSnapshot(true);

        if (this.completedMissionIds.length >= MISSIONS.length) {
          this.triggerGameOver('victory');
          return;
        }
      } else if (outcome.status === 'step_advanced' && outcome.nextState) {
        this.activeMission = outcome.nextState;
        const nextStep = def?.steps[this.activeMission.stepIndex] ?? null;
        this.syncInteractiveMissionStep(nextStep, `${def?.id ?? ''}:${this.activeMission.stepIndex}`);
        this.audio.playChime([587.33, 783.99]);
        this.spawnParticles(this.playerX, 1.2, this.playerZ, 16, 0xfbbf24, 5.5, 0.85, 0.55);
        this.showToast(def?.title ?? 'Objective Updated', outcome.bannerText ?? '', 'amber', 4.5);
        this.pushHudSnapshot(true);
      } else if (outcome.nextState) {
        this.activeMission = outcome.nextState;
      }

      // Position golden world beacon on current target (nearest uncollected item for collect_items!)
      if (this.activeMission && def) {
        const step = def.steps[this.activeMission.stepIndex];
        this.syncInteractiveMissionStep(step ?? null, `${def.id}:${this.activeMission.stepIndex}`);
        if (step?.type === 'collect_items') {
          let bestItem: { x: number; z: number } | null = null;
          let bestD = Infinity;
          for (const cm of this.missionCollectMeshes) {
            if (!cm.mesh.visible) continue;
            const d = Math.hypot(cm.x - this.playerX, cm.z - this.playerZ);
            if (d < bestD) {
              bestD = d;
              bestItem = cm;
            }
          }
          if (bestItem) {
            this.missionBeaconGroup.visible = true;
            this.missionBeaconGroup.position.set(bestItem.x, 0, bestItem.z);
          } else {
            this.missionBeaconGroup.visible = false;
          }
        } else if (step && step.targetX !== undefined && step.targetZ !== undefined) {
          this.missionBeaconGroup.visible = true;
          const isFlyoverStep = step.label.toLowerCase().includes('flyover');
          const elev = isFlyoverStep
            ? sampleWorldElevation(step.targetX, step.targetZ, 6.4).groundY
            : 0;
          this.missionBeaconGroup.position.set(step.targetX, elev, step.targetZ);
        } else if (step?.type === 'intercept_convoy') {
          const activeVan = this.vehicles.find((v) => v.isConvoy && !v.disabled);
          if (activeVan) {
            this.missionBeaconGroup.visible = true;
            this.missionBeaconGroup.position.set(activeVan.phys.x, activeVan.phys.y ?? 0, activeVan.phys.z);
          } else {
            this.missionBeaconGroup.visible = false;
          }
        } else {
          this.missionBeaconGroup.visible = false;
        }
      }
    } else {
      this.missionBeaconGroup.visible = false;
      if (this.syncedMissionStepKey) this.clearInteractiveMissionActors();
    }
  }

  // ============== WORKING ELEVATED NYC SUBWAY SYSTEM ==============

  private createSubwaySignTexture(badge: string, color: string, title: string, borough: string): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 512, 128);
    // Crisp NYC MTA white horizontal header rule
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(16, 18, 480, 4);
    // Iconic circular MTA subway line bullet
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(62, 74, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, 62, 76);
    // Station name & borough
    ctx.textAlign = 'left';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(title.toUpperCase(), 114, 62);
    ctx.fillStyle = '#2dd4bf';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`MTA ELEVATED · ${borough.toUpperCase()} · $3`, 114, 98);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildElevatedSubway(): void {
    const group = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.65 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.55 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.88 });
    const thirdRailMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.5 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x4b3621, roughness: 0.92, metalness: 0.04 });

    const deckY = SUBWAY_DECK_Y;
    const lenNS = SUBWAY_SOUTH_Z - SUBWAY_NORTH_Z; // 336
    const lenEW = SUBWAY_EAST_X - SUBWAY_WEST_X; // 392
    const midZ = (SUBWAY_NORTH_Z + SUBWAY_SOUTH_Z) * 0.5;
    const midX = (SUBWAY_WEST_X + SUBWAY_EAST_X) * 0.5;

    const addTrackSpan = (x: number, z: number, length: number, isEW: boolean) => {
      const spanGroup = new THREE.Group();
      // Main dual-track steel girder deck (width 7.2m for twin elevated tracks)
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(isEW ? length + 7.2 : 7.2, 0.72, isEW ? 7.2 : length + 7.2),
        steelMat,
      );
      deck.position.set(x, deckY - 0.36, z);
      deck.castShadow = false;
      deck.receiveShadow = true;
      spanGroup.add(deck);

      // Side steel safety parapet girders
      for (const side of [-3.55, 3.55]) {
        const girder = new THREE.Mesh(
          new THREE.BoxGeometry(isEW ? length + 6.8 : 0.32, 1.05, isEW ? 0.32 : length + 6.8),
          darkSteelMat,
        );
        girder.position.set(isEW ? x : x + side, deckY + 0.15, isEW ? z + side : z);
        spanGroup.add(girder);
      }

      // 4 steel running rails (2 parallel tracks at ±1.9m) + 2 amber third rails
      for (const trackOff of [-1.9, 1.9]) {
        for (const rOff of [-0.62, 0.62]) {
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(isEW ? length : 0.12, 0.14, isEW ? 0.12 : length),
            railMat,
          );
          rail.position.set(isEW ? x : x + trackOff + rOff, deckY + 0.12, isEW ? z + trackOff + rOff : z);
          spanGroup.add(rail);
        }
        const third = new THREE.Mesh(
          new THREE.BoxGeometry(isEW ? length : 0.16, 0.18, isEW ? 0.16 : length),
          thirdRailMat,
        );
        third.position.set(isEW ? x : x + trackOff * 0.42, deckY + 0.16, isEW ? z + trackOff * 0.42 : z);
        spanGroup.add(third);
      }

      // Steel H-support portal pillars every 28m (skipping 56m road intersections cleanly!)
      const pillarCount = Math.floor(length / 28);
      for (let i = 0; i <= pillarCount; i++) {
        const offset = -length * 0.5 + i * 28;
        const coord = (isEW ? x : z) + offset;
        // Skip intersections (multiples of 56) so cross-traffic glides cleanly underneath
        if (Math.abs(coord % 56) < 10) continue;
        // Twin curb-side steel columns straddling the avenue + horizontal cross-beam
        for (const side of [-6.8, 6.8]) {
          const col = new THREE.Mesh(new THREE.BoxGeometry(0.68, deckY, 0.68), darkSteelMat);
          col.position.set(isEW ? coord : x + side, deckY * 0.5, isEW ? z + side : coord);
          col.castShadow = false;
          spanGroup.add(col);
        }
        const crossBeam = new THREE.Mesh(
          new THREE.BoxGeometry(isEW ? 0.85 : 14.4, 0.9, isEW ? 14.4 : 0.85),
          steelMat,
        );
        crossBeam.position.set(isEW ? coord : x, deckY - 0.85, isEW ? z : coord);
        spanGroup.add(crossBeam);
      }

      group.add(spanGroup);
    };

    // Build all 4 sides of the NYC Elevated Subway Viaduct Loop
    addTrackSpan(SUBWAY_WEST_X, midZ, lenNS, false);
    addTrackSpan(SUBWAY_EAST_X, midZ, lenNS, false);
    addTrackSpan(midX, SUBWAY_SOUTH_Z, lenEW, true);
    addTrackSpan(midX, SUBWAY_NORTH_Z, lenEW, true);

    // Instanced wooden rail ties along the entire elevated loop
    const tieStep = 4.0;
    const totalTies = Math.floor((lenNS * 2 + lenEW * 2) / tieStep);
    const tieInst = new THREE.InstancedMesh(new THREE.BoxGeometry(6.4, 0.12, 0.34), tieMat, totalTies);
    const dm = new THREE.Object3D();
    let tIdx = 0;
    const placeTies = (x0: number, z0: number, len: number, isEW: boolean) => {
      for (let u = 2; u < len - 2 && tIdx < totalTies; u += tieStep) {
        dm.position.set(isEW ? x0 + u : x0, deckY + 0.04, isEW ? z0 : z0 + u);
        dm.rotation.set(0, isEW ? Math.PI * 0.5 : 0, 0);
        dm.updateMatrix();
        tieInst.setMatrixAt(tIdx++, dm.matrix);
      }
    };
    placeTies(SUBWAY_WEST_X, SUBWAY_NORTH_Z, lenNS, false);
    placeTies(SUBWAY_EAST_X, SUBWAY_NORTH_Z, lenNS, false);
    placeTies(SUBWAY_WEST_X, SUBWAY_SOUTH_Z, lenEW, true);
    placeTies(SUBWAY_WEST_X, SUBWAY_NORTH_Z, lenEW, true);
    tieInst.count = tIdx;
    tieInst.instanceMatrix.needsUpdate = true;
    group.add(tieInst);

    // Build 6 Iconic Elevated MTA Stations (elevated platform + canopy + street-level kiosk & glowing green globes!)
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.82 });
    const safetyStripMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.55 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.5, metalness: 0.4 });
    const lightStripMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
    const greenGlobeMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const tealRingMat = new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });

    for (const st of SUBWAY_STATIONS) {
      const stGroup = new THREE.Group();
      const isEW = st.axis === 'ew';
      const platLen = 28;
      // Side elevated boarding platforms flanking the viaduct
      for (const side of [-5.2, 5.2]) {
        const plat = new THREE.Mesh(
          new THREE.BoxGeometry(isEW ? platLen : 3.2, 0.55, isEW ? 3.2 : platLen),
          platformMat,
        );
        plat.position.set(isEW ? st.trackX : st.trackX + side, deckY + 0.25, isEW ? st.trackZ + side : st.trackZ);
        stGroup.add(plat);

        // Tactile yellow safety edge
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(isEW ? platLen : 0.35, 0.58, isEW ? 0.35 : platLen),
          safetyStripMat,
        );
        const innerSide = side > 0 ? side - 1.45 : side + 1.45;
        edge.position.set(isEW ? st.trackX : st.trackX + innerSide, deckY + 0.26, isEW ? st.trackZ + innerSide : st.trackZ);
        stGroup.add(edge);

        // Ribbed NYC MTA Green Canopy Roof + Overhead fluorescent strip
        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(isEW ? platLen * 0.92 : 3.4, 0.28, isEW ? 3.4 : platLen * 0.92),
          canopyMat,
        );
        canopy.position.set(isEW ? st.trackX : st.trackX + side, deckY + 3.65, isEW ? st.trackZ + side : st.trackZ);
        stGroup.add(canopy);

        const lamp = new THREE.Mesh(
          new THREE.BoxGeometry(isEW ? platLen * 0.75 : 0.25, 0.12, isEW ? 0.25 : platLen * 0.75),
          lightStripMat,
        );
        lamp.position.set(isEW ? st.trackX : st.trackX + side, deckY + 3.46, isEW ? st.trackZ + side : st.trackZ);
        stGroup.add(lamp);
      }

      // Street-level Open NYC Cast-Iron Subway Entrance Arch + Twin Green Globes + Double-Sided MTA Sign
      const kiosk = new THREE.Group();
      kiosk.position.set(st.entranceX, 0, st.entranceZ);
      kiosk.rotation.y = st.entranceHeading;

      const ironMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.45, metalness: 0.65 });
      const glassHoodMat = new THREE.MeshStandardMaterial({
        color: 0x0f766e,
        roughness: 0.25,
        metalness: 0.35,
        transparent: true,
        opacity: 0.78,
      });

      // Open cast-iron green NYC subway entrance arch (4 corner posts + decorative header beams + glass canopy)
      for (const px of [-1.75, 1.75]) {
        for (const pz of [-1.0, 1.0]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.1, 8), ironMat);
          post.position.set(px, 1.55, pz);
          kiosk.add(post);
        }
        // Low wrought-iron side railings
        const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 2.0), ironMat);
        sideRail.position.set(px, 0.55, 0);
        kiosk.add(sideRail);
      }
      // Subtle translucent peaked glass-and-iron rain canopy over the entrance
      const hoodRoof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.14, 2.3), glassHoodMat);
      hoodRoof.position.set(0, 3.18, 0);
      kiosk.add(hoodRoof);
      const hoodTrim = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.2, 2.42), ironMat);
      hoodTrim.position.set(0, 3.04, 0);
      kiosk.add(hoodTrim);

      // Subtle dark tiled subway threshold mat under the arch
      const threshold = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.08, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 }),
      );
      threshold.position.set(0, 0.04, 0);
      kiosk.add(threshold);

      // Sleek open-tread steel elevated stairway rising cleanly from kiosk rear to elevated platform
      const stairAngle = -0.78;
      for (const sx of [-0.95, 0.95]) {
        const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 11.4), darkSteelMat);
        stringer.position.set(sx, 5.2, 3.6);
        stringer.rotation.x = stairAngle;
        kiosk.add(stringer);
        const handrail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 11.4), ironMat);
        handrail.position.set(sx, 6.05, 3.6);
        handrail.rotation.x = stairAngle;
        kiosk.add(handrail);
      }
      const stairDeck = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.16, 11.2), platformMat);
      stairDeck.position.set(0, 5.1, 3.6);
      stairDeck.rotation.x = stairAngle;
      kiosk.add(stairDeck);

      // Twin iconic glowing green glass NYC Subway Entrance Globes on slender cast-iron lampposts
      for (const gx of [-1.75, 1.75]) {
        const globeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.65, 8), darkSteelMat);
        globeStem.position.set(gx, 3.35, 1.0);
        kiosk.add(globeStem);
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), greenGlobeMat);
        globe.position.set(gx, 3.82, 1.0);
        kiosk.add(globe);
      }

      // Crisp double-sided MTA Station Marquee visible from both street AND sidewalk approaches!
      const signTex = this.createSubwaySignTexture(st.lineBadge, st.lineColor, st.name, st.borough);
      const signFaceMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signSideMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.5 });
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.02, 0.2), [
        signSideMat,
        signSideMat,
        signSideMat,
        signSideMat,
        signFaceMat,
        signFaceMat,
      ]);
      signBoard.position.set(0, 3.65, 0);
      kiosk.add(signBoard);
      // Perpendicular sidewalk-facing MTA blade sign so players walking down the avenue read it head-on!
      const sideBlade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 3.4), [
        signFaceMat,
        signFaceMat,
        signSideMat,
        signSideMat,
        signSideMat,
        signSideMat,
      ]);
      sideBlade.position.set(-1.92, 2.55, 0);
      kiosk.add(sideBlade);

      // Glowing teal street-level boarding zone ring centered cleanly on the entrance
      const padRing = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.65, 28), tealRingMat);
      padRing.rotation.x = -Math.PI * 0.5;
      padRing.position.set(0, 0.07, 0.4);
      kiosk.add(padRing);

      stGroup.add(kiosk);
      group.add(stGroup);
    }

    // Build 2 Articulated 4-Car Stainless-Steel MTA Elevated Subway Trains!
    const steelCarMat = new THREE.MeshStandardMaterial({ color: 0xdbe3ec, roughness: 0.28, metalness: 0.78 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.6 });
    const windowGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const bogieMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });

    this.subwayTrainCars = [];
    for (const train of this.subwayTrains) {
      const stripeMat = new THREE.MeshStandardMaterial({ color: train.stripeHex, roughness: 0.35, metalness: 0.25 });
      const cars: THREE.Group[] = [];
      for (let cIdx = 0; cIdx < 4; cIdx++) {
        const car = new THREE.Group();
        // Main stainless-steel MTA subway car shell
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.65, 2.9, 11.2), steelCarMat);
        body.position.y = 1.95;
        body.castShadow = false;
        car.add(body);

        // Rounded steel roof + dual HVAC units
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.32, 11.0), roofMat);
        roof.position.y = 3.52;
        car.add(roof);
        for (const hz of [-2.8, 2.8]) {
          const ac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.28, 1.9), darkSteelMat);
          ac.position.set(0, 3.74, hz);
          car.add(ac);
        }

        // Bold MTA color stripe along both flanks
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.71, 0.42, 11.24), stripeMat);
        stripe.position.y = 1.45;
        car.add(stripe);

        // Warm illuminated passenger windows along both sides
        for (const wz of [-3.9, -1.95, 0, 1.95, 3.9]) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.82, 1.32), windowGlowMat);
          win.position.set(0, 2.38, wz);
          car.add(win);
        }

        // Front windshield + LED headlights / rear red tail lights
        const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.95, 11.28), darkSteelMat);
        frontGlass.position.y = 2.38;
        car.add(frontGlass);

        if (cIdx === 0) {
          for (const lx of [-0.75, 0.75]) {
            const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.24, 0.14), headlightMat);
            hl.position.set(lx, 1.28, 5.65);
            car.add(hl);
          }
          // Glowing LED route sign on cab nose
          const led = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.34, 0.12), stripeMat);
          led.position.set(0, 3.12, 5.64);
          car.add(led);
        }
        if (cIdx === 3) {
          for (const lx of [-0.75, 0.75]) {
            const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.14), taillightMat);
            tl.position.set(lx, 1.28, -5.65);
            car.add(tl);
          }
        }

        // Steel wheel bogies under the car
        for (const bz of [-3.6, 3.6]) {
          const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.56, 2.2), bogieMat);
          bogie.position.set(0, 0.36, bz);
          car.add(bogie);
        }

        this.scene.add(car);
        cars.push(car);
      }
      this.subwayTrainCars.push({ trainId: train.id, cars });
    }

    this.scene.add(group);
    this.updateElevatedSubway(0.016);
  }

  private updateElevatedSubway(dt: number): void {
    const carSpacing = 12.1;
    for (let tIdx = 0; tIdx < this.subwayTrains.length; tIdx++) {
      const tr = this.subwayTrains[tIdx];
      const stepped = stepSubwayTrain(tr, dt);
      this.subwayTrains[tIdx] = stepped.next;

      // Play subtle MTA station arrival chime if player is standing right under this station
      if (stepped.arrivedStation) {
        const dPlayer = Math.hypot(
          this.playerX - stepped.arrivedStation.trackX,
          this.playerZ - stepped.arrivedStation.trackZ,
        );
        if (dPlayer < 36 && this.gameState === 'playing') {
          this.audio.playChime([587.33, 440]);
        }
      }

      const visual = this.subwayTrainCars[tIdx];
      if (!visual) continue;
      const trackOffset = stepped.next.direction === 1 ? -1.9 : 1.9;
      for (let c = 0; c < visual.cars.length; c++) {
        const carDist = stepped.next.loopDist - stepped.next.direction * c * carSpacing;
        const pose = sampleSubwayLoopPose(carDist, stepped.next.direction, trackOffset);
        const carMesh = visual.cars[c];
        carMesh.position.set(pose.x, pose.y, pose.z);
        carMesh.rotation.y = pose.heading;
      }
    }
  }

  public boardSubwayTo(destStationId: string): boolean {
    if (this.gameState !== 'playing' || this.subwayRide) return false;
    const dest = SUBWAY_STATIONS.find((s) => s.id === destStationId);
    if (!dest) return false;
    if (this.wanted.stars >= 3) {
      this.showToast('MTA Transit Lockout', 'Shake 3+ star NYPD heat before boarding the subway!', 'red', 3.5);
      return false;
    }
    if (this.cash < SUBWAY_FARE_USD) {
      this.showToast('MTA Turnstile', `Need $${SUBWAY_FARE_USD} fare to ride the Elevated Subway.`, 'red', 3.2);
      return false;
    }

    const from =
      findNearestSubwayStation(this.playerX, this.playerZ, 20) ??
      SUBWAY_STATIONS.reduce((best, cur) =>
        Math.hypot(cur.entranceX - this.playerX, cur.entranceZ - this.playerZ) <
        Math.hypot(best.entranceX - this.playerX, best.entranceZ - this.playerZ)
          ? cur
          : best,
      );
    if (from.id === dest.id) return false;

    this.audio.unlock();
    if (this.activeVehicle) this.exitVehicle(true);
    this.leaveParkSport(true);
    this.cash -= SUBWAY_FARE_USD;
    this.subwayRide = {
      fromStation: from,
      toStation: dest,
      progress: 0,
      duration: 1.55,
      startMs: performance.now(),
    };
    this.syncPlayerAvatarVisibilityAndPose();
    this.audio.playChime([587.33, 440, 659.25]);
    this.showToast(
      `MTA (${dest.lineBadge}) Express · ${dest.borough}`,
      `"Stand clear of the closing doors!" Riding elevated express to ${dest.name}...`,
      'teal',
      3.8,
    );
    this.pushHudSnapshot(true);
    return true;
  }

  private stepSubwayRide(dt: number): void {
    if (!this.subwayRide) return;
    const wallElapsed = (performance.now() - this.subwayRide.startMs) / 1000;
    this.subwayRide.progress = Math.max(this.subwayRide.progress + dt, wallElapsed);
    if (this.subwayRide.progress >= this.subwayRide.duration) {
      const dest = this.subwayRide.toStation;
      this.subwayRide = null;
      const sx = dest.entranceX + Math.sin(dest.entranceHeading) * 2.4;
      const sz = dest.entranceZ + Math.cos(dest.entranceHeading) * 2.4;
      const resolved = resolveCircleBuildingCollisions(sx, sz, 0.55);
      this.playerX = resolved.x;
      this.playerZ = resolved.z;
      this.playerY = 0;
      this.playerVx = 0;
      this.playerVz = 0;
      this.playerHeading = dest.entranceHeading;
      this.cameraYaw = dest.entranceHeading;
      this.syncPlayerAvatarVisibilityAndPose();
      const fx = Math.sin(this.cameraYaw);
      const fz = Math.cos(this.cameraYaw);
      this.camPos.set(this.playerX - fx * 6.5, 3.15, this.playerZ - fz * 6.5);
      this.camLook.set(this.playerX + fx * 7, 1.65, this.playerZ + fz * 7);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      this.audio.playChime([659.25, 783.99]);
      this.spawnParticles(this.playerX, 1.1, this.playerZ, 12, 0x2dd4bf, 4.0, 0.7, 0.45);
      this.showToast(
        `Arrived · ${dest.name}`,
        `Welcome to ${dest.borough}! ($${SUBWAY_FARE_USD} MTA fare paid)`,
        'teal',
        3.6,
      );
      this.pushHudSnapshot(true);
    }
  }

  // ============== SMARTER RANDOM STREET EVENTS ==============

  private clearStreetEvent(): void {
    if (this.streetEventNpcId) {
      const idx = this.npcs.findIndex((n) => n.id === this.streetEventNpcId);
      if (idx >= 0) {
        this.scene.remove(this.npcs[idx].rig.root);
        this.npcs.splice(idx, 1);
      }
      this.streetEventNpcId = null;
    }
    if (this.streetEventVehicleId) {
      const idx = this.vehicles.findIndex((v) => v.id === this.streetEventVehicleId);
      if (idx >= 0 && this.vehicles[idx] !== this.activeVehicle) {
        this.scene.remove(this.vehicles[idx].rig.root);
        this.vehicles.splice(idx, 1);
      }
      this.streetEventVehicleId = null;
    }
    if (this.streetEventFinishGroup) {
      this.scene.remove(this.streetEventFinishGroup);
      this.streetEventFinishGroup = null;
    }
    this.activeStreetEvent = null;
    this.pendingStreetEvent = {
      acceptedRace: false,
      thiefStopped: false,
      vanHitsDelta: 0,
      vanDisabled: false,
    };
  }

  private buildStreetRaceFinishArch(x: number, z: number, heading: number): THREE.Group {
    const g = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const checkerDark = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const checkerLight = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    for (const sx of [-6.8, 6.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 7.6, 10), postMat);
      post.position.set(sx, 3.8, 0);
      g.add(post);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(14.2, 1.35, 0.45), bannerMat);
    bar.position.set(0, 7.2, 0);
    g.add(bar);
    // Checkered squares across the finish arch
    for (let i = 0; i < 12; i++) {
      const sq = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 0.55, 0.52),
        i % 2 === 0 ? checkerLight : checkerDark,
      );
      sq.position.set(-5.8 + i * 1.05, 7.2, 0);
      g.add(sq);
    }
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.5, 6.2, 28),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.08;
    g.add(ring);

    g.position.set(x, 0, z);
    g.rotation.y = heading;
    return g;
  }

  public triggerStreetEvent(forcedKind?: StreetEventKind): void {
    if (this.gameState !== 'playing' || this.activeMission || this.activeParkVenueId || this.subwayRide) return;
    this.clearStreetEvent();

    this.streetEventSeed += 1.37;
    const district = getDistrictAt(this.playerX, this.playerZ, this.playerY);
    const ev = createStreetEvent({
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerHeading: this.playerHeading,
      playerInVehicle: Boolean(this.activeVehicle),
      district,
      seed: this.streetEventSeed,
      forcedKind,
    });

    this.activeStreetEvent = ev;

    if (ev.kind === 'purse_snatcher') {
      const resolved = resolveCircleBuildingCollisions(ev.targetX, ev.targetZ, 0.6);
      ev.targetX = resolved.x;
      ev.targetZ = resolved.z;
      const baseModel = NPC_CHARACTER_POOL[0];
      const rig = createCharacterRig(
        {
          shirtHex: 0x991b1b,
          pantsHex: 0x111827,
          accentHex: 0xfef08a,
          appearance: {
            ...baseModel,
            id: 'purse_snatcher',
            shirtHex: 0x991b1b,
            pantsHex: 0x111827,
            accentHex: 0xfef08a,
            hairHex: 0x0f172a,
            skinHex: 0xd49a6a,
            umbrellaHex: undefined,
            raincoatHex: 0x7f1d1d,
          },
        },
        this.shadowTex,
      );
      // Bright floating red exclamation marker overhead so player spots the thief instantly!
      const badge = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.42, 0),
        new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      );
      badge.position.y = 2.55;
      rig.root.add(badge);
      rig.root.position.set(ev.targetX, 0, ev.targetZ);
      this.scene.add(rig.root);

      const npcId = `snatcher_${Math.floor(this.simTime * 100)}`;
      this.npcs.push({
        id: npcId,
        modelId: 'purse_snatcher',
        name: 'Purse Snatcher',
        archetype: 'purse_snatcher',
        rig,
        x: ev.targetX,
        y: 0,
        z: ev.targetZ,
        vx: 0,
        vy: 0,
        vz: 0,
        heading: this.playerHeading,
        patrolHeading: this.playerHeading,
        patrolTimer: 12,
        isStanding: false,
        standTimer: 0,
        strafeSign: 1,
        gaitPhase: 0,
        hp: 60,
        knockoutTimer: 0,
        windupTimer: 0,
        attackCooldown: 0,
        hitFlash: 0,
        dialogue: ['Outta my way!'],
        dialogueIndex: 0,
        reactionCooldown: 99,
      });
      this.streetEventNpcId = npcId;
    } else if (ev.kind === 'street_race') {
      const fx = ev.finishX ?? ev.targetX;
      const fz = ev.finishZ ?? ev.targetZ;
      const raceHeading = Math.atan2(fx - ev.targetX, fz - ev.targetZ);
      const rig = createVehicleRig('sports', this.shadowTex, {
        shirtHex: 0x0ea5e9,
        skinHex: 0xd49a6a,
        visible: true,
      });
      // Add glowing cyan street-racer marker above roof
      const marker = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.52, 0),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      );
      marker.position.y = 2.65;
      rig.root.add(marker);
      rig.driverGroup.visible = true;
      rig.root.position.set(ev.targetX, 0, ev.targetZ);
      rig.root.rotation.y = raceHeading;
      this.scene.add(rig.root);

      const vehId = `street_racer_${Math.floor(this.simTime * 100)}`;
      this.vehicles.push({
        id: vehId,
        type: 'sports',
        rig,
        phys: {
          x: ev.targetX,
          y: 0,
          z: ev.targetZ,
          vx: 0,
          vz: 0,
          heading: raceHeading,
          steerAngle: 0,
          speed: 0,
          isDrifting: false,
          isBoosting: false,
          hitWall: false,
          impactSpeed: 0,
        },
        hp: 150,
        maxHp: 150,
        isTraffic: false,
        isPolice: false,
        isConvoy: false,
        isStreetEventRacer: true,
        disabled: false,
        axis: Math.abs(Math.cos(raceHeading)) > 0.5 ? 'ns' : 'ew',
        dir: 1,
        roadCoord: Math.abs(Math.cos(raceHeading)) > 0.5 ? ev.targetX : ev.targetZ,
        cruiseSpeed: 23.5,
        turnCooldown: 0,
        honkCooldown: 0,
        hitFlash: 0,
        prevSpeed: 0,
        suspPitch: 0,
        suspRoll: 0,
        isBraking: false,
        officerDeployed: false,
        deployCooldown: 0,
      });
      this.streetEventVehicleId = vehId;

      const finishArch = this.buildStreetRaceFinishArch(fx, fz, raceHeading);
      this.scene.add(finishArch);
      this.streetEventFinishGroup = finishArch;
    } else if (ev.kind === 'armored_van') {
      const rig = createVehicleRig('syndicate_van', this.shadowTex, {
        shirtHex: 0x1e293b,
        skinHex: 0xc68652,
        visible: true,
      });
      // Flashing emerald/gold beacon above the Armored Cash Van
      const beacon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.58, 0),
        new THREE.MeshBasicMaterial({ color: 0x22c55e }),
      );
      beacon.position.y = 3.2;
      rig.root.add(beacon);
      rig.driverGroup.visible = true;
      const dir: 1 | -1 = ev.targetZ < 220 ? 1 : -1;
      const heading = dir === 1 ? 0 : Math.PI;
      rig.root.position.set(ev.targetX, 0, ev.targetZ);
      rig.root.rotation.y = heading;
      this.scene.add(rig.root);

      const vehId = `armored_event_van_${Math.floor(this.simTime * 100)}`;
      this.vehicles.push({
        id: vehId,
        type: 'syndicate_van',
        rig,
        phys: {
          x: ev.targetX,
          y: 0,
          z: ev.targetZ,
          vx: 0,
          vz: dir * 11,
          heading,
          steerAngle: 0,
          speed: 11,
          isDrifting: false,
          isBoosting: false,
          hitWall: false,
          impactSpeed: 0,
        },
        hp: 110,
        maxHp: 110,
        isTraffic: true,
        isPolice: false,
        isConvoy: false,
        isStreetEventVan: true,
        disabled: false,
        axis: 'ns',
        dir,
        roadCoord: Math.round(ev.targetX / 56) * 56,
        cruiseSpeed: 12.2,
        turnCooldown: 0,
        honkCooldown: 0,
        hitFlash: 0,
        prevSpeed: 11,
        suspPitch: 0,
        suspRoll: 0,
        isBraking: false,
        officerDeployed: false,
        deployCooldown: 0,
      });
      this.streetEventVehicleId = vehId;
    }

    this.audio.playChime([523.25, 659.25]);
    this.showToast(ev.title, ev.callout, ev.kind === 'purse_snatcher' ? 'red' : 'amber', 5.0);
    this.pushHudSnapshot(true);
  }

  private updateStreetEvents(dt: number): void {
    if (this.activeMission || this.activeParkVenueId || this.subwayRide) return;

    if (!this.activeStreetEvent) {
      this.streetEventCooldown -= dt;
      const playerOnWater =
        Boolean(this.activeVehicle && VEHICLE_SPECS[this.activeVehicle.type].isWatercraft) ||
        this.playerX < -18 ||
        this.playerY < -0.2;
      if (this.streetEventCooldown <= 0 && !playerOnWater) {
        this.triggerStreetEvent();
        this.streetEventCooldown =
          STREET_EVENT_COOLDOWN_MIN +
          Math.random() * (STREET_EVENT_COOLDOWN_MAX - STREET_EVENT_COOLDOWN_MIN);
      }
      return;
    }

    const ev = this.activeStreetEvent;
    let actorX = ev.targetX;
    let actorZ = ev.targetZ;

    if (ev.kind === 'purse_snatcher' && this.streetEventNpcId) {
      const thief = this.npcs.find((n) => n.id === this.streetEventNpcId);
      if (thief) {
        actorX = thief.x;
        actorZ = thief.z;
        // Also count bumping into the thief with a car or close sprint tackle!
        if (this.activeVehicle && Math.hypot(this.playerX - thief.x, this.playerZ - thief.z) < 3.6) {
          this.pendingStreetEvent.thiefStopped = true;
        }
      }
    } else if (ev.kind === 'street_race' && this.streetEventVehicleId) {
      const racer = this.vehicles.find((v) => v.id === this.streetEventVehicleId);
      if (racer) {
        if (ev.phase === 'active' && ev.finishX !== undefined && ev.finishZ !== undefined) {
          // Drive rival GT smoothly down the avenue toward the finish arch
          const dx = ev.finishX - racer.phys.x;
          const dz = ev.finishZ - racer.phys.z;
          const dist = Math.hypot(dx, dz) || 1;
          const targetHeading = Math.atan2(dx, dz);
          racer.phys.heading = targetHeading;
          racer.phys.speed = Math.min(22.5, racer.phys.speed + 11.5 * dt);
          racer.phys.vx = (dx / dist) * racer.phys.speed;
          racer.phys.vz = (dz / dist) * racer.phys.speed;
          racer.phys.x += racer.phys.vx * dt;
          racer.phys.z += racer.phys.vz * dt;
          racer.rig.root.position.set(racer.phys.x, 0, racer.phys.z);
          racer.rig.root.rotation.y = racer.phys.heading;
          racer.rig.wheels.forEach((w) => {
            w.rotation.x += racer.phys.speed * dt * 2.2;
          });
        }
        actorX = racer.phys.x;
        actorZ = racer.phys.z;
      }
    } else if (ev.kind === 'armored_van' && this.streetEventVehicleId) {
      const van = this.vehicles.find((v) => v.id === this.streetEventVehicleId);
      if (van) {
        actorX = van.phys.x;
        actorZ = van.phys.z;
      }
    }

    const res = evaluateStreetEventTick(ev, {
      dt,
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerInVehicle: Boolean(this.activeVehicle),
      acceptedChallenge: this.pendingStreetEvent.acceptedRace,
      thiefStopped: this.pendingStreetEvent.thiefStopped,
      actorX,
      actorZ,
      vanHitsDelta: this.pendingStreetEvent.vanHitsDelta,
      vanDisabled: this.pendingStreetEvent.vanDisabled,
    });

    this.pendingStreetEvent = {
      acceptedRace: false,
      thiefStopped: false,
      vanHitsDelta: 0,
      vanDisabled: false,
    };

    if (res.status === 'started') {
      this.activeStreetEvent = res.next;
      this.audio.playChime([523.25, 659.25, 1046.5]);
      if (res.bannerText) {
        this.showToast(res.bannerSpeaker ?? ev.title, res.bannerText, res.bannerAccent ?? 'teal', 4.0);
      }
      this.pushHudSnapshot(true);
    } else if (res.status === 'won') {
      this.cash += res.reward;
      if (res.wantedHeatDelta > 0) this.addHeat(res.wantedHeatDelta);
      this.audio.playChime([523.25, 659.25, 783.99, 1046.5]);
      this.spawnParticles(actorX, 1.4, actorZ, 26, 0x22c55e, 7.5, 1.1, 0.65);
      if (res.bannerText) {
        this.showToast(res.bannerSpeaker ?? ev.title, res.bannerText, res.bannerAccent ?? 'teal', 5.0);
      }
      this.clearStreetEvent();
      this.streetEventCooldown = STREET_EVENT_COOLDOWN_MAX;
      this.pushHudSnapshot(true);
    } else if (res.status === 'failed') {
      if (res.bannerText) {
        this.showToast(res.bannerSpeaker ?? ev.title, res.bannerText, res.bannerAccent ?? 'amber', 3.6);
      }
      this.clearStreetEvent();
      this.streetEventCooldown = STREET_EVENT_COOLDOWN_MIN;
      this.pushHudSnapshot(true);
    } else {
      this.activeStreetEvent = res.next;
    }
  }

  private updateTitleCamera(dt: number): void {
    // Sweeping golden-hour flyover of Marine Drive, Colaba Causeway, and Gateway of Mumbai Arch
    this.titleOrbitAngle += dt * 0.09;
    const cx = -22 + Math.sin(this.titleOrbitAngle) * 28;
    const cz = -16 + Math.cos(this.titleOrbitAngle * 0.7) * 18;
    const cy = 22 + Math.sin(this.titleOrbitAngle * 1.3) * 3.0;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(0, 7.5, -76);
    this.camera.fov = 56;
    this.camera.updateProjectionMatrix();
  }

  private updateGameplayCamera(dt: number): void {
    const kPos = 1 - Math.exp((this.activeVehicle ? -5.6 : -4.8) * dt);
    const kLook = 1 - Math.exp((this.activeVehicle ? -9.0 : -7.8) * dt);
    let desiredFov = 60;

    const activeSportVenue = this.activeParkVenueId
      ? this.parkVenues.find((pv) => pv.def.id === this.activeParkVenueId) ?? null
      : null;

    if (this.subwayRide) {
      // Smooth elevated subway rail-side aerial glide between stations
      const r = this.subwayRide;
      const t = Math.min(1, r.progress / r.duration);
      const ease = t * t * (3 - 2 * t);
      const gx = r.fromStation.trackX + (r.toStation.trackX - r.fromStation.trackX) * ease;
      const gz = r.fromStation.trackZ + (r.toStation.trackZ - r.fromStation.trackZ) * ease;
      const dirX = r.toStation.trackX - r.fromStation.trackX;
      const dirZ = r.toStation.trackZ - r.fromStation.trackZ;
      const len = Math.hypot(dirX, dirZ) || 1;
      const nx = dirX / len;
      const nz = dirZ / len;
      _vec3A.set(gx - nx * 18 - nz * 12, SUBWAY_DECK_Y + 9.5, gz - nz * 18 + nx * 12);
      _vec3B.set(gx + nx * 16, SUBWAY_DECK_Y + 1.8, gz + nz * 16);
      this.camPos.lerp(_vec3A, 0.42);
      this.camLook.lerp(_vec3B, 0.48);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      this.camera.fov += (64 - this.camera.fov) * 0.25;
      this.camera.updateProjectionMatrix();
      return;
    } else if (activeSportVenue) {
      const vd = activeSportVenue.def;
      const st = activeSportVenue.state;
      if (st.mode === 'spectating') {
        _vec3A.set(vd.spectateCamX, vd.spectateCamY, vd.spectateCamZ);
        _vec3B.set(
          (vd.cx + st.ballX) * 0.5,
          1.4 + Math.min(2.2, st.ballY * 0.35),
          (vd.cz + st.ballZ) * 0.5,
        );
        desiredFov = 54;
      } else {
        // Dynamic batting / shooting over-the-shoulder angle looking down pitch / hoop
        _vec3A.set(vd.creaseX + 2.8, 3.05, vd.creaseZ + 6.4);
        _vec3B.set(
          (vd.bowlerX + st.ballX) * 0.5,
          1.55 + Math.min(1.6, st.ballY * 0.2),
          (vd.bowlerZ + st.ballZ) * 0.5,
        );
        desiredFov = 56;
      }
    } else if (this.activeVehicle) {
      const v = this.activeVehicle;
      const spec = VEHICLE_SPECS[v.type];
      const vy = v.phys.y ?? 0;
      const spdAbs = Math.abs(v.phys.speed);
      const yaw = this.cameraYaw + this.mouseYawOffset;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);

      if (this.cameraMode === 'hood') {
        const hFx = Math.sin(v.phys.heading);
        const hFz = Math.cos(v.phys.heading);
        _vec3A.set(v.phys.x + hFx * 0.6, vy + spec.height + 0.55, v.phys.z + hFz * 0.6);
        _vec3B.set(v.phys.x + hFx * 18, vy + spec.height * 0.9, v.phys.z + hFz * 18);
        desiredFov = 68 + Math.min(12, spdAbs * 0.35);
      } else if (this.cameraMode === 'cinematic') {
        const dist = (v.type === 'ferry' ? 14.5 : 10.5) + spec.length * 0.45;
        _vec3A.set(v.phys.x - fx * dist + fz * 2.8, vy + spec.height + 3.4, v.phys.z - fz * dist - fx * 2.8);
        _vec3B.set(v.phys.x + fx * 12, vy + 1.8, v.phys.z + fz * 12);
        desiredFov = 58 + Math.min(14, spdAbs * 0.38);
      } else {
        const dist = (v.type === 'ferry' ? 11.5 : 6.2) + spec.length * 0.55 + Math.min(2.2, spdAbs * 0.06);
        const heightOff = v.type === 'ferry' ? 4.2 : spec.isWatercraft ? 3.2 : 2.6;
        _vec3A.set(v.phys.x - fx * dist, vy + spec.height + heightOff, v.phys.z - fz * dist);
        _vec3B.set(v.phys.x + fx * 10, vy + 1.7, v.phys.z + fz * 10);
        desiredFov = 60 + Math.min(14, spdAbs * 0.36) + (v.phys.isBoosting ? 5 : 0);
      }
      // Slowly re-center manual mouse yaw when driving forward
      if (spdAbs > 3) {
        this.mouseYawOffset *= Math.exp(-2.2 * dt);
      }
    } else {
      const yaw = this.cameraYaw + this.mouseYawOffset;
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const dist = this.cameraMode === 'cinematic' ? 7.8 : 5.8;
      _vec3A.set(this.playerX - fx * dist, this.playerY + 3.15, this.playerZ - fz * dist);
      _vec3B.set(this.playerX + fx * 7, this.playerY + 1.65, this.playerZ + fz * 7);
    }

    // Wall pull-in raycast against buildings so camera never clips inside facades
    const anchorX = this.playerX;
    const anchorY = this.playerY + 1.8;
    const anchorZ = this.playerZ;
    const dirX = _vec3A.x - anchorX;
    const dirY = _vec3A.y - anchorY;
    const dirZ = _vec3A.z - anchorZ;
    const desiredDist = Math.hypot(dirX, dirY, dirZ);
    if (desiredDist > 1.2 && this.cameraMode !== 'hood') {
      _raycaster.set(
        _pos.set(anchorX, anchorY, anchorZ),
        _scale.set(dirX / desiredDist, dirY / desiredDist, dirZ / desiredDist),
      );
      _raycaster.far = desiredDist;
      const hits = _raycaster.intersectObjects(this.buildingMeshes, false);
      if (hits.length > 0) {
        const safeDist = Math.max(1.8, hits[0].distance - 0.65);
        _vec3A.set(
          anchorX + (dirX / desiredDist) * safeDist,
          anchorY + (dirY / desiredDist) * safeDist,
          anchorZ + (dirZ / desiredDist) * safeDist,
        );
      }
    }

    this.camPos.lerp(_vec3A, kPos);
    this.camLook.lerp(_vec3B, kLook);

    // Trauma-squared screen shake
    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.9);
    const shake = this.cameraTrauma * this.cameraTrauma;
    const sx = (Math.random() - 0.5) * shake * 0.8;
    const sy = (Math.random() - 0.5) * shake * 0.6;

    this.camera.position.set(this.camPos.x + sx, Math.max(1.1, this.camPos.y + sy), this.camPos.z);
    this.camera.lookAt(this.camLook);
    this.camera.fov += (desiredFov - this.camera.fov) * (1 - Math.exp(-6 * dt));
    this.camera.updateProjectionMatrix();
  }

  // ============== LIVE CIRCULAR NORTH-UP GPS MINIMAP (PRE-CACHED BASEMAP) ==============

  private static readonly MINIMAP_CACHE_MIN_X = -280;
  private static readonly MINIMAP_CACHE_MAX_X = 680;
  private static readonly MINIMAP_CACHE_MIN_Z = -280;
  private static readonly MINIMAP_CACHE_MAX_Z = 680;

  private ensureMinimapStaticCache(): HTMLCanvasElement | null {
    if (this.minimapStaticCanvas) return this.minimapStaticCanvas;
    if (typeof document === 'undefined') return null;

    const scale = NORTH_UP_RADAR_SCALE;
    const minX = MumbaiWorldEngine.MINIMAP_CACHE_MIN_X;
    const maxX = MumbaiWorldEngine.MINIMAP_CACHE_MAX_X;
    const minZ = MumbaiWorldEngine.MINIMAP_CACHE_MIN_Z;
    const maxZ = MumbaiWorldEngine.MINIMAP_CACHE_MAX_Z;

    const cache = document.createElement('canvas');
    cache.width = Math.ceil((maxX - minX) * scale);
    cache.height = Math.ceil((maxZ - minZ) * scale);
    const ctx = cache.getContext('2d');
    if (!ctx) return null;

    const toX = (wx: number) => (wx - minX) * scale;
    const toY = (wz: number) => (wz - minZ) * scale;

    // Base urban slate fill
    ctx.fillStyle = '#191512';
    ctx.fillRect(0, 0, cache.width, cache.height);

    // Hudson River & Upper Bay west of x = -66.5 and north of z = -109
    ctx.fillStyle = '#154663';
    ctx.fillRect(0, 0, toX(-66.5), cache.height);
    ctx.fillRect(0, 0, cache.width, toY(-109));

    // 11x11 NYC Road grid
    ctx.fillStyle = '#3f3933';
    for (const rx of ROAD_COORDS) {
      ctx.fillRect(toX(rx - ROAD_HALF), toY(-108), ROAD_WIDTH * scale, 668 * scale);
    }
    for (const rz of ROAD_COORDS) {
      ctx.fillRect(toX(-66), toY(rz - ROAD_HALF), 628 * scale, ROAD_WIDTH * scale);
    }

    // Parks, Playgrounds, Sports Courts & Bronx Stadium footprints
    for (const zone of RECREATION_ZONES) {
      const zx = toX(zone.cx - zone.width * 0.5);
      const zy = toY(zone.cz - zone.depth * 0.5);
      const zw = zone.width * scale;
      const zd = zone.depth * scale;
      ctx.fillStyle =
        zone.kind === 'stadium'
          ? '#1e40af'
          : zone.kind === 'courts'
            ? '#0f766e'
            : zone.kind === 'playground'
              ? '#b45309'
              : '#166534';
      ctx.fillRect(zx, zy, zw, zd);
      if (zone.kind === 'stadium') {
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(toX(zone.cx), toY(zone.cz), Math.min(zw, zd) * 0.34, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // City blocks (baked ONCE instead of 400+ fillRects every draw!)
    for (const b of CITY_BUILDINGS) {
      ctx.fillStyle = b.style === 'slum' ? '#3b2f28' : '#2d2621';
      ctx.fillRect(
        toX(b.x - b.width * 0.5),
        toY(b.z - b.depth * 0.5),
        b.width * scale,
        b.depth * scale,
      );
    }

    // Named NYC Storefronts
    ctx.fillStyle = '#34d399';
    for (const shop of BUILDING_SHOPS) {
      ctx.fillRect(toX(shop.x) - 1.3, toY(shop.z) - 1.3, 2.6, 2.6);
    }

    // Elevated Concrete Expressways / Flyovers
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 1.2;
    ctx.fillStyle = '#686259';
    for (const f of FLYOVERS) {
      if (f.axis === 'ew') {
        const fx = toX(f.startCoord);
        const fy = toY(f.centerCoord - f.halfWidth);
        const fw = (f.endCoord - f.startCoord) * scale;
        const fh = f.halfWidth * 2 * scale;
        ctx.fillRect(fx, fy, fw, fh);
        ctx.strokeRect(fx, fy, fw, fh);
      } else {
        const fx = toX(f.centerCoord - f.halfWidth);
        const fy = toY(f.startCoord);
        const fw = f.halfWidth * 2 * scale;
        const fh = (f.endCoord - f.startCoord) * scale;
        ctx.fillRect(fx, fy, fw, fh);
        ctx.strokeRect(fx, fy, fw, fh);
      }
    }

    // Wooden Hudson Piers
    ctx.fillStyle = '#8f6642';
    ctx.strokeStyle = '#d4a66a';
    ctx.lineWidth = 1;
    for (const pier of PIER_ZONES) {
      const px = toX(pier.minX);
      const py = toY(pier.minZ);
      const pw = (pier.maxX - pier.minX) * scale;
      const ph = (pier.maxZ - pier.minZ) * scale;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeRect(px, py, pw, ph);
    }

    // Offshore Liberty Island & Statue of Liberty
    const islX = toX(LIBERTY_ISLAND.x);
    const islY = toY(LIBERTY_ISLAND.z);
    const islR = LIBERTY_ISLAND.radius * scale;
    ctx.fillStyle = '#d4b68c';
    ctx.beginPath();
    ctx.arc(islX, islY, islR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f6e38';
    ctx.beginPath();
    ctx.arc(islX, islY, islR * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // Live Interactive Park Sports pins
    for (const pv of PARK_SPORT_VENUES) {
      ctx.fillStyle = pv.sport === 'cricket' ? '#22c55e' : '#f97316';
      ctx.strokeStyle = '#fff8eb';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(toX(pv.cx), toY(pv.cz), 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Offshore channel buoys
    ctx.fillStyle = '#f59e0b';
    for (const b of SEA_BUOYS) {
      ctx.beginPath();
      ctx.arc(toX(b.x), toY(b.z), 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Landmark pins
    for (const lm of LANDMARKS) {
      ctx.fillStyle = lm.color;
      ctx.beginPath();
      ctx.arc(toX(lm.x), toY(lm.z), 3.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Elevated NYC Subway Rail Loop & MTA Stations
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.72)';
    ctx.lineWidth = 2.0;
    ctx.strokeRect(
      toX(SUBWAY_WEST_X),
      toY(SUBWAY_NORTH_Z),
      (SUBWAY_EAST_X - SUBWAY_WEST_X) * scale,
      (SUBWAY_SOUTH_Z - SUBWAY_NORTH_Z) * scale,
    );
    for (const st of SUBWAY_STATIONS) {
      ctx.fillStyle = st.lineColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(toX(st.trackX), toY(st.trackZ), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    this.minimapStaticCanvas = cache;
    return cache;
  }

  private drawMinimap(): void {
    const canvas = this.minimapCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const discR = Math.min(cx, cy) - 2;
    const scale = NORTH_UP_RADAR_SCALE;
    const cull = discR + 12;

    this.minimapDrawCount += 1;
    canvas.dataset.mode = 'north-up';
    canvas.dataset.heading = this.playerHeading.toFixed(3);
    canvas.dataset.rotation = '0.000';
    canvas.dataset.drawCount = String(this.minimapDrawCount);

    ctx.clearRect(0, 0, w, h);

    // Clip entire map into a crisp circular radar disc (fixed North-up, zero map rotation!)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, discR, 0, Math.PI * 2);
    ctx.clip();

    // Base water/slate backdrop for extreme map edges
    ctx.fillStyle = '#154663';
    ctx.fillRect(0, 0, w, h);

    // Blit pre-rendered static NYC basemap in ONE fast drawImage call!
    const staticMap = this.ensureMinimapStaticCache();
    if (staticMap) {
      const playerCacheX = (this.playerX - MumbaiWorldEngine.MINIMAP_CACHE_MIN_X) * scale;
      const playerCacheY = (this.playerZ - MumbaiWorldEngine.MINIMAP_CACHE_MIN_Z) * scale;
      ctx.drawImage(staticMap, Math.round(cx - playerCacheX), Math.round(cy - playerCacheY));
    }

    // Dynamic traffic, exotic supercar, police & watercraft blips
    for (const v of this.vehicles) {
      if (v === this.activeVehicle || v.disabled) continue;
      const dx = (v.phys.x - this.playerX) * scale;
      const dy = (v.phys.z - this.playerZ) * scale;
      if (dx < -cull || dx > cull || dy < -cull || dy > cull) continue;
      const vx = cx + dx;
      const vy = cy + dy;
      if (VEHICLE_SPECS[v.type].isWatercraft) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(vx, vy, v.type === 'ferry' ? 3.8 : 3.0, 0, Math.PI * 2);
        ctx.fill();
      } else if (v.isPolice) {
        ctx.fillStyle = Math.floor(this.simTime * 6) % 2 === 0 ? '#ef4444' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(vx, vy, 3.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (v.isConvoy) {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(vx - 3.5, vy - 3.5, 7, 7);
      } else {
        ctx.fillStyle =
          v.type === 'hypercar'
            ? '#f43f8e'
            : v.type === 'sports'
              ? '#fb923c'
              : v.type === 'muscle'
                ? '#84cc16'
                : v.type === 'suv_lux'
                  ? '#c084fc'
                  : 'rgba(244, 212, 130, 0.58)';
        ctx.fillRect(vx - 1.8, vy - 1.8, 3.6, 3.6);
      }
    }

    // Rival & NYPD foot-patrol blips
    for (const n of this.npcs) {
      if (n.knockoutTimer > 0) continue;
      if (n.archetype !== 'police_officer' && !n.archetype.startsWith('rival_')) continue;
      const dx = (n.x - this.playerX) * scale;
      const dy = (n.z - this.playerZ) * scale;
      if (dx < -cull || dx > cull || dy < -cull || dy > cull) continue;
      ctx.fillStyle =
        n.archetype === 'police_officer'
          ? this.wanted.stars > 0 && Math.floor(this.simTime * 7) % 2 === 0
            ? '#ef4444'
            : '#38bdf8'
          : '#ef4444';
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Live subway train blips
    ctx.fillStyle = '#e2e8f0';
    for (const tr of this.subwayTrains) {
      const pose = sampleSubwayLoopPose(tr.loopDist, tr.direction, tr.direction === 1 ? -1.9 : 1.9);
      const dx = (pose.x - this.playerX) * scale;
      const dy = (pose.z - this.playerZ) * scale;
      if (dx < -cull || dx > cull || dy < -cull || dy > cull) continue;
      ctx.fillRect(cx + dx - 2.4, cy + dy - 2.4, 4.8, 4.8);
    }

    // Edge-clamped Mission Collectibles, Street Events & Active Mission Waypoint (North-up)
    const edgeR = discR - 10;

    for (const cm of this.missionCollectMeshes) {
      if (!cm.mesh.visible) continue;
      const pt = worldToNorthUpRadarPoint(cm.x, cm.z, this.playerX, this.playerZ, scale, cx, cy);
      const clamped = clampRadarEdgeWaypoint(pt.x, pt.y, cx, cy, edgeR);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(clamped.x, clamped.y, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.activeStreetEvent) {
      const ev = this.activeStreetEvent;
      const pt = worldToNorthUpRadarPoint(ev.targetX, ev.targetZ, this.playerX, this.playerZ, scale, cx, cy);
      const clamped = clampRadarEdgeWaypoint(pt.x, pt.y, cx, cy, edgeR);
      ctx.strokeStyle = ev.kind === 'purse_snatcher' ? '#ef4444' : ev.kind === 'street_race' ? '#38bdf8' : '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(clamped.x, clamped.y, 5.0, 0, Math.PI * 2);
      ctx.stroke();
      if (ev.kind === 'street_race' && ev.phase === 'active' && ev.finishX !== undefined && ev.finishZ !== undefined) {
        const fpt = worldToNorthUpRadarPoint(ev.finishX, ev.finishZ, this.playerX, this.playerZ, scale, cx, cy);
        const fclamped = clampRadarEdgeWaypoint(fpt.x, fpt.y, cx, cy, edgeR);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(fclamped.x - 3.5, fclamped.y - 3.5, 7, 7);
      }
    }

    if (this.missionBeaconGroup.visible) {
      const pt = worldToNorthUpRadarPoint(
        this.missionBeaconGroup.position.x,
        this.missionBeaconGroup.position.z,
        this.playerX,
        this.playerZ,
        scale,
        cx,
        cy,
      );
      const wp = clampRadarEdgeWaypoint(pt.x, pt.y, cx, cy, edgeR);
      if (wp.clamped) {
        ctx.save();
        ctx.translate(wp.x, wp.y);
        ctx.rotate(wp.angle + Math.PI * 0.5);
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#18110c';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -6.5);
        ctx.lineTo(4.6, 3.8);
        ctx.lineTo(0, 1.4);
        ctx.lineTo(-4.6, 3.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 5.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(wp.x, wp.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rotating Player Chevron + subtle forward sight cone inside fixed North-up circular disc
    const playerArrowAngle = getNorthUpPlayerArrowAngle(this.playerHeading);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(playerArrowAngle);

    ctx.fillStyle = 'rgba(255, 244, 214, 0.16)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, discR * 0.56, -Math.PI * 0.5 - 0.38, -Math.PI * 0.5 + 0.38);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fff8eb';
    ctx.strokeStyle = '#120d0a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -7.2);
    ctx.lineTo(5.2, 5.2);
    ctx.lineTo(0, 2.3);
    ctx.lineTo(-5.2, 5.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Cached inner vignette rim inside circular disc
    if (!this.minimapRimGrad) {
      const rimGrad = ctx.createRadialGradient(cx, cy, discR - 14, cx, cy, discR);
      rimGrad.addColorStop(0, 'rgba(10, 8, 6, 0)');
      rimGrad.addColorStop(1, 'rgba(10, 8, 6, 0.45)');
      this.minimapRimGrad = rimGrad;
    }
    ctx.fillStyle = this.minimapRimGrad;
    ctx.fillRect(0, 0, w, h);

    // End circular disc clip
    ctx.restore();

    // Crisp outer GPS bezel ring + fixed cardinal E/S/W ticks
    ctx.strokeStyle = 'rgba(245, 185, 66, 0.48)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, discR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 240, 214, 0.34)';
    ctx.lineWidth = 1.4;
    // East, South, West fixed ticks
    ctx.beginPath();
    ctx.moveTo(cx + discR - 4, cy);
    ctx.lineTo(cx + discR, cy);
    ctx.moveTo(cx, cy + discR - 4);
    ctx.lineTo(cx, cy + discR);
    ctx.moveTo(cx - discR + 4, cy);
    ctx.lineTo(cx - discR, cy);
    ctx.stroke();

    // Fixed North (N) compass badge locked at 12 o'clock
    const northY = cy - discR + 7.5;
    ctx.fillStyle = '#140f0c';
    ctx.strokeStyle = '#f5b942';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, northY, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff8eb';
    ctx.font = '800 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, northY + 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  // ============== HUD SNAPSHOT BUILDER ==============

  private computePrompt(): InteractionPrompt | null {
    if (this.gameState !== 'playing' || this.subwayRide) return null;

    // While driving: offer street-race accept prompt when pulled up beside a challenger
    if (this.activeVehicle) {
      if (this.activeStreetEvent?.kind === 'street_race' && this.activeStreetEvent.phase === 'available') {
        const d = Math.hypot(
          this.playerX - this.activeStreetEvent.targetX,
          this.playerZ - this.activeStreetEvent.targetZ,
        );
        if (d < 34) {
          return {
            key: 'E',
            label: `Accept Street Race ($${this.activeStreetEvent.reward}) · or Honk [H]`,
            kind: 'event',
          };
        }
      }
      return null;
    }

    if (this.activeParkVenueId) return null;

    // 0. Active Interactive Mission Prompt (highest priority so player never misses a character/task!)
    if (this.activeMission) {
      const def = getMissionById(this.activeMission.missionId);
      const step = def?.steps[this.activeMission.stepIndex];
      if (step && step.targetX !== undefined && step.targetZ !== undefined) {
        const d = Math.hypot(this.playerX - step.targetX, this.playerZ - step.targetZ);
        if (step.type === 'talk_npc' && d <= (step.radius ?? 5.5) + 1.0) {
          return {
            key: 'E',
            label: `Talk to ${step.npcName ?? def.contact} · Mission`,
            kind: 'mission',
          };
        }
        if (step.type === 'perform_task' && d <= (step.radius ?? 5.4) + 1.0) {
          return {
            key: 'E',
            label: `${step.taskActionLabel ?? 'Complete Street Task'} · Mission`,
            kind: 'mission',
          };
        }
        if (step.type === 'confront_target' && d <= (step.radius ?? 5.0) + 1.2) {
          return {
            key: 'Q',
            label: `Confront & Shove ${step.npcName ?? 'Target'} · Mission`,
            kind: 'mission',
          };
        }
      }
    }

    // 0.4. Purse Snatcher shove prompt when close on foot
    if (this.activeStreetEvent?.kind === 'purse_snatcher') {
      const d = Math.hypot(
        this.playerX - this.activeStreetEvent.targetX,
        this.playerZ - this.activeStreetEvent.targetZ,
      );
      if (d <= 5.5) {
        return {
          key: 'Q',
          label: `Shove Purse Snatcher (+$${this.activeStreetEvent.reward})`,
          kind: 'event',
        };
      }
    }

    // 0.5. Elevated MTA Subway Station Boarding prompt
    const nearStation = findNearestSubwayStation(this.playerX, this.playerZ, 7.8);
    if (nearStation) {
      return {
        key: 'E',
        label: `Board NYC Subway (${nearStation.lineBadge}) · ${nearStation.name} ($${SUBWAY_FARE_USD})`,
        kind: 'subway',
      };
    }

    const veh = this.findNearestVehicle(5.5);
    if (veh) {
      const spec = VEHICLE_SPECS[veh.type];
      return {
        key: 'E',
        label: spec.isWatercraft ? `Board ${spec.label}` : `Drive ${spec.label}`,
        kind: 'vehicle',
      };
    }

    const npc = this.findNearestNpc(4.6);
    if (npc && npc.archetype !== 'cricketer' && npc.archetype !== 'baller' && npc.archetype !== 'purse_snatcher') {
      if (npc.shopDef) {
        return {
          key: 'E',
          label: `Buy ${npc.shopDef.itemLabel} ($${npc.shopDef.price}) · ${npc.shopDef.shopName}`,
          kind: 'npc',
        };
      }
      return {
        key: 'E',
        label: npc.healsChai ? `Grab Street Food · ${npc.name}` : `Talk · ${npc.name}`,
        kind: 'npc',
      };
    }

    const parkVenue = this.findNearbyParkVenue();
    if (parkVenue) {
      return {
        key: 'F',
        label: parkVenue.def.sport === 'cricket' ? `Join Pickup Cricket · ${parkVenue.def.name}` : `Join Streetball · ${parkVenue.def.name}`,
        kind: 'sport',
        secondaryKey: 'V',
        secondaryLabel: 'Spectate Match',
      };
    }

    return null;
  }

  public getSnapshot(): HudSnapshot {
    let activeMissionHud: HudSnapshot['activeMission'] = null;
    if (this.activeMission) {
      const def = getMissionById(this.activeMission.missionId);
      const step = def?.steps[this.activeMission.stepIndex];
      if (def && step) {
        let label = step.label;
        let progressText: string | undefined;
        if (step.type === 'intercept_convoy') {
          label = `Ram & disable Syndicate Vans (${this.convoyDisabledCount}/${step.targetCount ?? 2})`;
          progressText = `${this.convoyDisabledCount}/${step.targetCount ?? 2}`;
        } else if (step.type === 'collect_items') {
          const got = this.activeMission.collectedIndices.length;
          const total = step.targetCount ?? step.collectPoints?.length ?? 3;
          progressText = `${got}/${total} collected`;
        } else if (step.type === 'park_sport_score') {
          const target = step.targetScore ?? 6;
          progressText = `${this.activeMission.stepProgress}/${target} runs`;
        }
        let distM = 0;
        if (this.missionBeaconGroup.visible) {
          distM = Math.round(
            Math.hypot(
              this.missionBeaconGroup.position.x - this.playerX,
              this.missionBeaconGroup.position.z - this.playerZ,
            ),
          );
        }
        activeMissionHud = {
          id: def.id,
          title: def.title,
          emotionTag: def.emotionTag,
          stepLabel: label,
          stepIndex: this.activeMission.stepIndex,
          totalSteps: def.steps.length,
          timeRemaining: Math.ceil(this.activeMission.timeRemaining),
          distanceMeters: distM,
          progressText,
        };
      }
    }

    const activeVenue = this.activeParkVenueId
      ? this.parkVenues.find((pv) => pv.def.id === this.activeParkVenueId) ?? null
      : null;

    const v = this.activeVehicle;
    return {
      gameState: this.gameState,
      hp: Math.round(this.playerHp),
      maxHp: this.playerMaxHp,
      hpRegenerating: this.hpRegenerating,
      damageFlash: Number(this.damageFlash.toFixed(2)),
      stamina: Math.round(this.playerStamina),
      boost: Math.round(this.vehicleBoost),
      cash: Math.round(this.cash),
      wantedStars: this.wanted.stars,
      wantedCooldownRatio: this.wantedCooldownRatio,
      district: getDistrictAt(this.playerX, this.playerZ, this.playerY),
      weatherMode: this.weatherState.target,
      weatherLabel: getWeatherLabel(this.weatherState.target),
      weatherRainIntensity: Number(this.weatherVisuals.rainIntensity.toFixed(2)),
      playerOutfitId: PLAYER_OUTFITS[this.playerOutfitIndex].id,
      playerOutfitLabel: this.customGlbPlayer?.isLoaded()
        ? this.customGlbPlayer.getSummary()?.name ?? PLAYER_OUTFITS[this.playerOutfitIndex].label
        : PLAYER_OUTFITS[this.playerOutfitIndex].label,
      customModel: this.customGlbPlayer?.getSummary() ?? null,
      savedCustomModels: this.savedGlbRecords.map((r) => ({
        id: r.id,
        name: r.name,
        facingFlip: r.facingFlip,
        extraAnimCount: r.extraAnims.length,
      })),
      inVehicle: Boolean(v),
      vehicleLabel: v ? VEHICLE_SPECS[v.type].label : '',
      vehicleType: v ? v.type : null,
      vehicleHp: v ? Math.round(v.hp) : 0,
      vehicleMaxHp: v ? v.maxHp : 0,
      speedKmh: v ? Math.round(Math.abs(v.phys.speed) * 3.6) : 0,
      isDrifting: Boolean(v?.phys.isDrifting),
      isBoosting: Boolean(v?.phys.isBoosting),
      cameraMode: this.cameraMode,
      graphicsQuality: this.graphicsQuality,
      muted: this.audio.isMuted(),
      radioStationId: this.audio.getRadioState().meta.id,
      radioStationLabel: this.audio.getRadioState().meta.label,
      radioStationShortLabel: this.audio.getRadioState().meta.shortLabel,
      radioAccentHex: this.audio.getRadioState().meta.accentHex,
      radioPlaying: this.audio.getRadioState().playing,
      activeMission: activeMissionHud,
      completedMissionIds: [...this.completedMissionIds],
      prompt: this.computePrompt(),
      toast: this.toast,
      activeNpcCount: this.npcs.length + this.crowdAgents.length,
      activeParkSport: activeVenue ? buildParkSportHud(activeVenue.def, activeVenue.state) : null,
      activeStreetEvent: this.activeStreetEvent
        ? buildStreetEventHud(this.activeStreetEvent, this.playerX, this.playerZ)
        : null,
      nearbySubwayStationId: findNearestSubwayStation(this.playerX, this.playerZ, 7.8)?.id ?? null,
      subwayRidingLabel: this.subwayRide
        ? `${this.subwayRide.fromStation.name} → ${this.subwayRide.toStation.name} (${this.subwayRide.toStation.borough})`
        : null,
      subwayStations: getSubwayStationsHud(this.subwayTrains),
      lowHpPulse: this.playerHp <= 28 && this.gameState === 'playing',
      playerX: Math.round(this.playerX),
      playerZ: Math.round(this.playerZ),
      endRun: this.endRun,
    };
  }

  private pushHudSnapshot(immediate: boolean): void {
    void immediate;
    this.onHudUpdate(this.getSnapshot());
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('click', this.handleCanvasClick);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.minimapStaticCanvas = null;
    this.minimapRimGrad = null;
    this.customGlbPlayer?.dispose();
    this.audio.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
