import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DISTRICT_AMBIENT_PROFILES, getAmbientProfile } from './ambientAudio';
import { computeFootstepAcousticProfile, resolveFootstepSurfaceAt } from './footstepFoley';
import {
  GRAPHICS_QUALITY_ORDER,
  GRAPHICS_QUALITY_SPECS,
  SKY_DOME_BASE_RADIUS,
  getGraphicsQualitySpec,
  parseGraphicsQualityPreset,
  resolveEffectivePixelRatio,
} from './graphicsQuality';
import {
  MUSIC_GAIN_RUNNING,
  MUSIC_GAIN_VEHICLE,
  MUSIC_IDLE_HOLD_SECONDS,
  MUSIC_OFFLINE_SAMPLE_RATE,
  MUSIC_STATIONS,
  computeDynamicMusicMix,
  cycleMusicStation,
} from './gameMusic';
import {
  MINIMAP_UPDATE_INTERVAL_SEC,
  NORTH_UP_RADAR_SCALE,
  clampRadarEdgeWaypoint,
  computeDynamicRadarScale,
  getNorthCompassPosition,
  getNorthUpPlayerArrowAngle,
  getPlayerArrowRelativeAngle,
  getRadarRotationRad,
  shouldRedrawMinimap,
  stepSmoothedRadarHeading,
  worldToNorthUpRadarPoint,
  worldToRadarPoint,
} from './radarMath';
import { SUPERCAR_LIVERIES, getSupercarLivery } from './supercarLiveries';
import {
  PLAYER_GLB_TARGET_HEIGHT,
  classifyAnimationClipName,
  computeModelNormalization,
  matchHumanoidBoneRole,
  resolveGlbCharacterDisplayName,
  stripHorizontalRootMotion,
} from './glbCharacter';
import {
  BODY_BUILD_METRICS,
  NPC_CHARACTER_POOL,
  NYPD_OFFICER_SPEC,
  PLAYER_OUTFITS,
  cyclePlayerOutfitIndex,
  getWeatherClothingState,
} from './characterModels';
import {
  AREA_HOARDINGS,
  BUILDING_SHOPS,
  CITY_BUILDINGS,
  EAST_BOUND,
  FLYOVERS,
  LIBERTY_ISLAND,
  NORTH_BOUND,
  PIER_ZONES,
  PLAYER_SPAWN,
  RECREATION_ZONES,
  RESPAWN_POINTS,
  ROAD_COORDS,
  SOUTH_BOUND,
  STREET_GANTRIES,
  WEST_BOUND,
  findNearestDisembarkPoint,
  getDistrictAt,
  isPointInWater,
  sampleWorldElevation,
  selectRespawnPoint,
} from './cityLayout';
import { MISSIONS, createActiveMission, evaluateMissionTick } from './missions';
import { evaluateNpcReaction, getContextualTalkLine } from './npcDialogue';
import {
  PARK_SPORT_VENUES,
  buildParkSportHud,
  createInitialParkMatchState,
  evaluateTimingAction,
  exitPlayerParkMatch,
  startPlayerJoinMatch,
  startPlayerSpectateMatch,
  stepParkMatch,
  triggerPlayerSportAction,
} from './parkSports';
import {
  EVADE_CLEAR_SECONDS,
  HP_REGEN_DELAY_SEC,
  VEHICLE_SPECS,
  addWantedHeat,
  computeCrashDamage,
  computeNpcDesiredVelocity,
  createInitialHumanLocomotion,
  evaluateMeleeHit,
  evaluateTrafficBehavior,
  evaluateVehicleNpcImpact,
  getIntersectionPhaseOffset,
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
  type VehiclePhysicsState,
} from './simulation';
import {
  createStreetEvent,
  evaluateStreetEventTick,
} from './streetEvents';
import {
  SUBWAY_EAST_X,
  SUBWAY_LOOP_LENGTH,
  SUBWAY_NORTH_Z,
  SUBWAY_SOUTH_Z,
  SUBWAY_STATIONS,
  SUBWAY_WEST_X,
  computeStationNextTrainEta,
  createInitialSubwayTrains,
  findNearestSubwayStation,
  sampleSubwayLoopPose,
  stepSubwayTrain,
} from './subwaySystem';
import type { BuildingArchVariant } from './types';
import {
  computeWeatherVisuals,
  createInitialWeatherState,
  cycleWeatherKind,
  setTargetWeather,
  stepWeatherSystem,
} from './weatherSystem';

test('player spawn is clear of buildings and sits in Washington Square corridor', () => {
  const col = resolveCircleBuildingCollisions(PLAYER_SPAWN.x, PLAYER_SPAWN.z, 0.7);
  assert.equal(col.hit, false, 'Player spawn must not intersect any building');
  assert.equal(getDistrictAt(0, -90), 'Washington Square');
  assert.equal(getDistrictAt(-72, 10), 'Battery Park');
  assert.equal(getDistrictAt(56, -28), 'Wall Street');
  assert.equal(getDistrictAt(56, 224), 'Midtown West');
});

test('building and Hudson seawall collision resolves cleanly without tunneling', () => {
  const b = CITY_BUILDINGS[0];
  const inside = resolveCircleBuildingCollisions(b.x, b.z, 1.0);
  assert.equal(inside.hit, true);

  // Pushing past Hudson seawall (away from piers) clamps cleanly to seawall boundary
  const seawall = resolveCircleBuildingCollisions(WEST_BOUND - 10, 60, 1.0);
  assert.equal(seawall.hit, true);
  assert.ok(seawall.x >= WEST_BOUND + 0.99);
});

test('varied NYC architecture uses all 9 distinct building archetypes with zero recreation-zone overlap', () => {
  const expectedVariants: BuildingArchVariant[] = [
    'artdeco_spire',
    'glass_supertall',
    'brownstone',
    'tenement_fireescape',
    'cast_iron_loft',
    'times_square_neon',
    'flatiron_wedge',
    'prewar_limestone',
    'dumbo_warehouse',
  ];
  const seenVariants = new Set(CITY_BUILDINGS.map((b) => b.archVariant));
  for (const v of expectedVariants) {
    assert.ok(seenVariants.has(v), `Expected NYC building archetype ${v} to appear in skyline`);
  }

  assert.equal(RECREATION_ZONES.length, 7);
  const kinds = new Set(RECREATION_ZONES.map((z) => z.kind));
  assert.ok(kinds.has('park') && kinds.has('playground') && kinds.has('courts') && kinds.has('stadium'));

  for (const zone of RECREATION_ZONES) {
    for (const b of CITY_BUILDINGS) {
      const overlapX = Math.abs(b.x - zone.cx) < (b.width + zone.width) * 0.5;
      const overlapZ = Math.abs(b.z - zone.cz) < (b.depth + zone.depth) * 0.5;
      assert.equal(
        overlapX && overlapZ,
        false,
        `Building ${b.id} must not overlap recreation zone ${zone.name}`,
      );
    }
  }
});

test('NYC right-hand driving lanes and traffic signals operate accurately', () => {
  // Going +Z (South) keeps right -> West (-X)
  assert.ok(getNycLaneCoord('ns', 1, 0) < 0);
  // Going -Z (North) keeps right -> East (+X)
  assert.ok(getNycLaneCoord('ns', -1, 0) > 0);
  // Going +X (East) keeps right -> South (+Z)
  assert.ok(getNycLaneCoord('ew', 1, 0) > 0);
  // Going -X (West) keeps right -> North (-Z)
  assert.ok(getNycLaneCoord('ew', -1, 0) < 0);

  const s1 = getTrafficSignalState(2, 0);
  assert.equal(s1.ns, 'green');
  assert.equal(s1.ew, 'red');

  const s2 = getTrafficSignalState(8, 0);
  assert.equal(s2.ns, 'amber');
  assert.equal(s2.ew, 'red');

  const s3 = getTrafficSignalState(12, 0);
  assert.equal(s3.ns, 'red');
  assert.equal(s3.ew, 'green');

  // Traffic stops behind stop-line on red and accelerates on green
  const phase00 = getIntersectionPhaseOffset(0, 0);
  let redTime = 0;
  let greenTime = 0;
  for (let t = 0; t < 24; t += 0.5) {
    const st = getTrafficSignalState(t, phase00);
    if (st.ns === 'red') redTime = t;
    if (st.ns === 'green') greenTime = t;
  }

  const redStop = evaluateTrafficBehavior({
    x: getNycLaneCoord('ns', 1, 0),
    z: -10.5,
    axis: 'ns',
    dir: 1,
    roadCoord: 0,
    simTime: redTime,
    nearestAheadDist: 50,
    cruiseSpeed: 13,
  });
  assert.equal(redStop.stoppingForRed, true);
  assert.equal(redStop.targetSpeed, 0);

  const greenGo = evaluateTrafficBehavior({
    x: getNycLaneCoord('ns', 1, 0),
    z: -10.5,
    axis: 'ns',
    dir: 1,
    roadCoord: 0,
    simTime: greenTime,
    nearestAheadDist: 50,
    cruiseSpeed: 13,
  });
  assert.equal(greenGo.stoppingForRed, false);
  assert.equal(greenGo.targetSpeed, 13);

  const blocked = evaluateTrafficBehavior({
    x: getNycLaneCoord('ns', 1, 0),
    z: -30,
    axis: 'ns',
    dir: 1,
    roadCoord: 0,
    simTime: greenTime,
    nearestAheadDist: 4.5,
    cruiseSpeed: 13,
  });
  assert.equal(blocked.targetSpeed, 0);
  assert.equal(blocked.shouldHonk, true);
});

test('vehicle physics differentiates NYC Pedicab vs Manhattan GT Coupe speed and boost', () => {
  const start: VehiclePhysicsState = {
    x: 0,
    y: 0,
    z: -24,
    vx: 0,
    vz: 0,
    heading: 0,
    steerAngle: 0,
    speed: 0,
    isDrifting: false,
    isBoosting: false,
    hitWall: false,
    impactSpeed: 0,
  };

  let gt = { ...start };
  let pedicab = { ...start };
  for (let i = 0; i < 36; i++) {
    gt = stepVehiclePhysics(
      gt,
      VEHICLE_SPECS.sports,
      { throttle: 1, steer: 0, handbrake: false, boost: true, boostAvailable: true },
      0.05,
    );
    pedicab = stepVehiclePhysics(
      pedicab,
      VEHICLE_SPECS.auto,
      { throttle: 1, steer: 0, handbrake: false, boost: false, boostAvailable: false },
      0.05,
    );
  }
  assert.ok(gt.speed > VEHICLE_SPECS.sports.maxSpeed, 'Boosted Manhattan GT exceeds base maxSpeed');
  assert.ok(gt.speed > pedicab.speed * 1.45, 'Manhattan GT is substantially faster than NYC Pedicab');
});

test('interactive Park Sports venues support live NPC play, joining, sweet-spot timing, cash payouts, and spectating', () => {
  assert.equal(PARK_SPORT_VENUES.length, 4);
  const cricketVenue = PARK_SPORT_VENUES.find((v) => v.id === 'central_park_cricket')!;
  const hoopsVenue = PARK_SPORT_VENUES.find((v) => v.id === 'rucker_streetball')!;
  assert.ok(cricketVenue && hoopsVenue);

  // Sweet-spot timing awards SIX in cricket and 3-POINTER in streetball
  const six = evaluateTimingAction('cricket', 0.78, 1);
  assert.equal(six.runs, 6);
  assert.equal(six.wicket, false);

  const threePt = evaluateTimingAction('streetball', 0.78, 1);
  assert.equal(threePt.runs, 3);

  // Live NPC match runs continuously without player input
  let state = createInitialParkMatchState(cricketVenue);
  assert.equal(state.mode, 'npc_match');
  let sawNpcHit = false;
  for (let i = 0; i < 60; i++) {
    const step = stepParkMatch(cricketVenue, state, 0.1);
    state = step.next;
    if (step.hitEvent) sawNpcHit = true;
  }
  assert.equal(sawNpcHit, true, 'NPC pickup cricket match bowls and bats continuously');

  // Spectate mode switches cleanly and exits back to npc_match
  state = startPlayerSpectateMatch(cricketVenue, state);
  assert.equal(state.mode, 'spectating');
  state = exitPlayerParkMatch(cricketVenue, state);
  assert.equal(state.mode, 'npc_match');

  // Join mode lets player bat through a full 6-ball over and earn USD payout
  state = startPlayerJoinMatch(cricketVenue, state);
  assert.equal(state.mode, 'joined');
  assert.equal(state.scoreRuns, 0);

  let totalPayout = 0;
  for (let stepIdx = 0; stepIdx < 400; stepIdx++) {
    const res = stepParkMatch(cricketVenue, state, 0.1);
    state = res.next;
    if (res.completedReward > 0) {
      totalPayout = res.completedReward;
      break;
    }
    if (state.mode === 'joined' && state.phase === 'delivery' && !state.swingAttempted && state.timingValue >= 0.75) {
      const swung = triggerPlayerSportAction(cricketVenue, state);
      state = swung.next;
      assert.ok(swung.hitEvent && swung.hitEvent.runs >= 4);
    }
  }
  assert.ok(totalPayout >= cricketVenue.basePrize + 24 * cricketVenue.perPointBonus, `Expected strong USD cricket payout, got ${totalPayout}`);
  assert.equal(state.mode, 'npc_match', 'Over completes and returns cleanly to live NPC pickup mode');

  const hud = buildParkSportHud(cricketVenue, state);
  assert.equal(hud.venueId, cricketVenue.id);
});

test('all 22 NYC contracts have unique IDs, positive USD rewards, and state machine completes with payout', () => {
  assert.equal(MISSIONS.length, 22);
  const ids = new Set<string>();
  MISSIONS.forEach((m) => {
    assert.ok(!ids.has(m.id), `Duplicate mission id: ${m.id}`);
    ids.add(m.id);
    assert.ok(m.reward > 0);
    assert.ok(m.steps.length >= 2);
  });

  // Complete Mission 1 (Fifth Ave Yellow Cab Rush)
  const m1 = MISSIONS[0];
  let st = createActiveMission(m1.id, []);
  assert.ok(st);

  let res = evaluateMissionTick(st, {
    dt: 0.1,
    playerX: 0,
    playerZ: -20,
    vehicleType: 'taxi',
    wantedStars: 0,
    convoyDisabledCount: 0,
  });
  assert.equal(res.status, 'step_advanced');
  assert.equal(res.nextState?.stepIndex, 1);

  res = evaluateMissionTick(res.nextState!, {
    dt: 0.1,
    playerX: m1.steps[1].targetX!,
    playerZ: m1.steps[1].targetZ!,
    vehicleType: 'taxi',
    wantedStars: 0,
    convoyDisabledCount: 0,
  });
  assert.equal(res.status, 'step_advanced');
  assert.equal(res.nextState?.stepIndex, 2);

  res = evaluateMissionTick(res.nextState!, {
    dt: 0.1,
    playerX: m1.steps[2].targetX!,
    playerZ: m1.steps[2].targetZ!,
    vehicleType: 'taxi',
    wantedStars: 0,
    convoyDisabledCount: 0,
  });
  assert.equal(res.status, 'completed');
  assert.equal(res.reward, m1.reward);
  assert.ok(res.nextState?.completedIds.includes(m1.id));
});

test('11x11 NYC mega-map includes 121 intersections, 5 clean viaducts (none under subway tracks), 4 Hudson piers, Liberty Island & signage', () => {
  assert.equal(ROAD_COORDS.length, 11);
  assert.equal(ROAD_COORDS.length * ROAD_COORDS.length, 121);
  const mapArea = (EAST_BOUND - WEST_BOUND) * (SOUTH_BOUND - NORTH_BOUND);
  assert.ok(mapArea >= 380000, `Expected 11x11 NYC map area >= 380,000 m², got ${mapArea}`);
  assert.equal(FLYOVERS.length, 5);
  // Ensure no flyover runs coaxially underneath any elevated subway corridor leg (x=0, x=392, z=0, z=336)
  for (const f of FLYOVERS) {
    if (f.axis === 'ns') {
      assert.notEqual(f.centerCoord, SUBWAY_WEST_X, `NS flyover ${f.id} must not sit under West subway line`);
      assert.notEqual(f.centerCoord, SUBWAY_EAST_X, `NS flyover ${f.id} must not sit under East subway line`);
    } else {
      assert.notEqual(f.centerCoord, SUBWAY_NORTH_Z, `EW flyover ${f.id} must not sit under North subway line`);
      assert.notEqual(f.centerCoord, SUBWAY_SOUTH_Z, `EW flyover ${f.id} must not sit under South subway line`);
    }
  }
  assert.equal(PIER_ZONES.length, 4);
  assert.ok(STREET_GANTRIES.length >= 8);
  assert.ok(AREA_HOARDINGS.length >= 8);

  // Climbing FDR Express Viaduct elevates cleanly while ground street stays y = 0
  const onDeck = sampleWorldElevation(56, 56, 6.2);
  assert.equal(onDeck.onFlyover, true);
  assert.equal(onDeck.groundY, 6.4);
  const underDeck = sampleWorldElevation(56, 56, 0);
  assert.equal(underDeck.onFlyover, false);
  assert.equal(underDeck.groundY, 0);

  // Hudson piers & Liberty Island are walkable while open Hudson Harbor is water
  assert.equal(isPointInWater(-96, -82), false, 'Battery Ferry Pier deck is walkable');
  assert.equal(isPointInWater(LIBERTY_ISLAND.x, LIBERTY_ISLAND.z), false, 'Liberty Island is walkable');
  assert.equal(isPointInWater(-160, -140), true, 'Open Hudson Harbor is water');

  // Watercraft stays outside landmass
  const boatHit = resolveWatercraftBounds(0, -80, 2.5);
  assert.equal(boatHit.hit, true);

  // Disembark works near piers and Liberty Island, blocked mid-harbor
  assert.ok(findNearestDisembarkPoint(-116, -95, 24), 'Can disembark at Battery Ferry Pier');
  assert.ok(
    findNearestDisembarkPoint(LIBERTY_ISLAND.dockX, LIBERTY_ISLAND.dockZ, 24),
    'Can disembark at Liberty Island dock',
  );
  assert.equal(findNearestDisembarkPoint(-260, 120, 24), null, 'Mid-harbor disembark blocked safely');
});

test('NYC wanted system, crash damage & health regeneration behave fairly', () => {
  let w = { heat: 0, stars: 0, evadeTimer: 0, bustedProgress: 0 };
  w = addWantedHeat(w, 90);
  assert.equal(w.stars, 2);

  let current = w;
  // 2 stars require 6.5 + 2*1.5 = 9.5s away (>32m) to drop 1 star
  for (let i = 0; i < (EVADE_CLEAR_SECONDS + 2) * 20; i++) {
    const res = stepWantedSystem(current, 0.05, 40, 12);
    current = res.next;
    assert.equal(res.busted, false);
  }
  assert.equal(current.stars, 1);

  // Continuing at 36m (>32m safe distance) clears final star cleanly
  for (let i = 0; i < 10 * 20; i++) {
    const res = stepWantedSystem(current, 0.05, 36, 10);
    current = res.next;
  }
  assert.equal(current.stars, 0, 'Calmer wanted system allows clean escape at 36m distance');

  let cornered = w;
  let gotBusted = false;
  for (let i = 0; i < 100; i++) {
    const res = stepWantedSystem(cornered, 0.05, 4, 0);
    cornered = res.next;
    if (res.busted) gotBusted = true;
  }
  assert.equal(gotBusted, true);

  const crash = computeCrashDamage(25, true);
  assert.ok(crash.playerDamage > 0 && crash.playerDamage <= 20);
  assert.ok(crash.vehicleDamage > 0 && crash.vehicleDamage <= 34);

  const waiting = stepHealthRegen(70, 100, HP_REGEN_DELAY_SEC - 1.0, 0.5);
  assert.equal(waiting.hp, 70);
  assert.equal(waiting.regenerating, false);

  const healing = stepHealthRegen(70, 100, HP_REGEN_DELAY_SEC + 0.5, 1.0);
  assert.ok(healing.hp > 75 && healing.hp <= 100);
  assert.equal(healing.regenerating, true);
});

test('camera yaw stays calm on keyboard arrows and never whips in reverse', () => {
  const startYaw = Math.PI;
  let yaw = startYaw;
  for (let i = 0; i < 10; i++) {
    yaw = stepCameraYaw({
      currentYaw: yaw,
      targetYaw: startYaw - Math.PI / 2,
      dt: 0.05,
      mode: 'foot',
      inputF: 0,
      inputR: 1,
      vehicleSpeed: 0,
    });
  }
  const deltaRight = Math.abs(yaw - startYaw);
  assert.ok(deltaRight > 0.2 && deltaRight < 0.6, `Expected calm gentle right pan, got ${deltaRight}`);

  const backYaw = stepCameraYaw({
    currentYaw: startYaw,
    targetYaw: 0,
    dt: 0.2,
    mode: 'foot',
    inputF: -1,
    inputR: 0,
    vehicleSpeed: 0,
  });
  assert.equal(backYaw, startYaw);

  const s1 = stepSmoothSteer(0, 1, 0.05);
  assert.ok(s1 > 0.1 && s1 < 0.5);
});

test('NYC ambient audio, contextual dialogue, weather, shops, 10 pedestrian models & NYPD officers work cleanly', () => {
  // All 19 NYC districts have ambient audio profiles
  assert.equal(Object.keys(DISTRICT_AMBIENT_PROFILES).length, 19);
  assert.ok(getAmbientProfile('Midtown West').traffic > 0.9);
  assert.ok(getAmbientProfile('Hudson Harbor').sea >= 0.95);
  assert.ok(getAmbientProfile('Williamsburg').construction >= 0.7);

  // Contextual NYC dialogue
  const nearMiss = evaluateNpcReaction({
    npcName: 'Marco',
    district: 'Midtown West',
    distanceMeters: 6.0,
    playerInVehicle: true,
    playerVehicleType: 'sports',
    playerSpeedMps: 15,
    playerHonkedRecently: false,
    playerShovedRecently: false,
    wantedStars: 0,
    seed: 1,
  });
  assert.equal(nearMiss?.reason, 'near_miss');
  assert.ok(getContextualTalkLine('Washington Square', 0, 0).length > 10);

  // Multi-location NYC respawn points are clear of buildings and vary cleanly
  assert.ok(RESPAWN_POINTS.length >= 10);
  for (const rp of RESPAWN_POINTS) {
    assert.equal(resolveCircleBuildingCollisions(rp.x, rp.z, 0.7).hit, false, `Respawn ${rp.id} clear`);
  }
  const rp1 = selectRespawnPoint(PLAYER_SPAWN.x, PLAYER_SPAWN.z, 0);
  const rp2 = selectRespawnPoint(PLAYER_SPAWN.x, PLAYER_SPAWN.z, 1);
  assert.notEqual(rp1.id, rp2.id);

  // Dynamic NYC weather system
  let wst = createInitialWeatherState('clear_sunset');
  assert.equal(cycleWeatherKind('clear_sunset'), 'light_drizzle');
  assert.equal(cycleWeatherKind('light_drizzle'), 'heavy_monsoon');
  assert.equal(cycleWeatherKind('heavy_monsoon'), 'clear_sunset');
  wst = setTargetWeather(wst, 'heavy_monsoon', false);
  for (let i = 0; i < 120; i++) wst = stepWeatherSystem(wst, 0.1).next;
  const storm = computeWeatherVisuals(wst);
  assert.ok(storm.rainIntensity > 0.9);
  assert.ok(storm.roadRoughness < 0.35);
  assert.ok(storm.cloudOpacity > 0.75);

  // All 16 NYC building shops have valid items and building-free shopkeeper spots
  assert.equal(BUILDING_SHOPS.length, 16);
  for (const shop of BUILDING_SHOPS) {
    const kx = shop.x + Math.sin(shop.facing) * 1.65;
    const kz = shop.z + Math.cos(shop.facing) * 1.65;
    assert.equal(
      resolveCircleBuildingCollisions(kx, kz, 0.45).hit,
      false,
      `Shopkeeper at ${shop.shopName} must be clear of buildings`,
    );
  }

  // 10 NYC character models + 2 protagonist looks ('Red Dress', 'Jeans Top') + NYPD officer
  assert.equal(NPC_CHARACTER_POOL.length, 10);
  for (const model of NPC_CHARACTER_POOL) {
    assert.ok(BODY_BUILD_METRICS[model.build]);
  }
  assert.equal(PLAYER_OUTFITS.length, 2);
  assert.deepEqual(
    PLAYER_OUTFITS.map((o) => o.label),
    ['Red Dress', 'Jeans Top'],
  );
  assert.equal(resolveGlbCharacterDisplayName(0, 'Meshy_AI_Character_01', 'model_a.glb'), 'Red Dress');
  assert.equal(resolveGlbCharacterDisplayName(1, 'Meshy_AI_Character_02', 'model_b.glb'), 'Jeans Top');
  assert.equal(resolveGlbCharacterDisplayName(0, 'Girl Denim Jeans', 'denim_look.glb'), 'Jeans Top');
  assert.equal(resolveGlbCharacterDisplayName(1, 'Crimson Red Dress', 'red_mini.glb'), 'Red Dress');
  let oIdx = 0;
  for (let i = 0; i < PLAYER_OUTFITS.length; i++) oIdx = cyclePlayerOutfitIndex(oIdx);
  assert.equal(oIdx, 0);

  const umbrellaNpc = NPC_CHARACTER_POOL.find((m) => m.umbrellaHex)!;
  assert.equal(getWeatherClothingState('light_drizzle', 0.4, umbrellaNpc).showUmbrella, true);

  assert.equal(NYPD_OFFICER_SPEC.silhouette, 'police_uniform');
  const chasingCop = computeNpcDesiredVelocity({
    archetype: 'police_officer',
    x: 0,
    z: 0,
    playerX: 12,
    playerZ: 0,
    playerVx: 0,
    playerVz: 0,
    playerSpeed: 2,
    patrolHeading: 0,
    strafeSign: 1,
    windupTimer: 0,
    wantedStars: 2,
  });
  assert.ok(chasingCop.desiredVx > 5.0);
  assert.equal(
    shouldPoliceDeployOfficer({
      wantedStars: 2,
      distToPlayer: 12,
      playerSpeedMps: 3,
      playerInVehicle: false,
      alreadyDeployed: false,
      deployCooldown: 0,
    }),
    true,
  );
  // Officers do not leap out of cruisers while player is actively driving away
  assert.equal(
    shouldPoliceDeployOfficer({
      wantedStars: 2,
      distToPlayer: 10,
      playerSpeedMps: 7.5,
      playerInVehicle: true,
      alreadyDeployed: false,
      deployCooldown: 0,
    }),
    false,
  );
});

test('realistic OBB vehicle collisions separate cleanly, apply correct recoil signs, respect mass, and scrub wild lateral drift', () => {
  const makeCar = (x: number, z: number, vx: number, vz: number, heading = 0): VehiclePhysicsState => ({
    x,
    y: 0,
    z,
    vx,
    vz,
    heading,
    steerAngle: 0,
    speed: vx * Math.sin(heading) + vz * Math.cos(heading),
    isDrifting: false,
    isBoosting: false,
    hitWall: false,
    impactSpeed: 0,
  });

  // 1. Head-on collision along +Z: car A going +14 m/s hits stationary car B ahead
  const carA = makeCar(0, 0, 0, 14, 0);
  const carB = makeCar(0, 4.0, 0, 0, 0);
  const headOn = resolveVehiclePairCollision(carA, VEHICLE_SPECS.taxi, carB, VEHICLE_SPECS.taxi);
  assert.equal(headOn.hit, true);
  assert.ok(carA.z < 0, 'Car A must separate backward (-Z)');
  assert.ok(carB.z > 4.0, 'Car B must separate forward (+Z)');
  assert.ok(carA.vz < 10, 'Car A loses forward momentum on rear-end crunch');
  assert.ok(carB.vz > 4, 'Car B gets pushed forward (+Z), never pulled backward');
  assert.ok(headOn.pitchImpulseA < 0, 'Rear-end crunch triggers nose-dive suspension impulse');

  // 2. Oblique side-swipe scrubs sideways drift tightly (no skating across the map)
  const swA = makeCar(0, 0, 5, 18, 0);
  const swB = makeCar(1.75, 1.0, -4, 10, 0);
  const sideswipe = resolveVehiclePairCollision(swA, VEHICLE_SPECS.sports, swB, VEHICLE_SPECS.taxi);
  assert.equal(sideswipe.hit, true);
  assert.ok(Math.abs(swA.vx) <= 3.3, `Lateral velocity must stay tightly damped, got ${swA.vx}`);
  assert.ok(Math.abs(swB.vx) <= 3.3, `Struck car lateral drift damped, got ${swB.vx}`);
  assert.ok(Math.abs(swA.heading) < 0.25, 'Glancing yaw deflection remains controlled');

  // 3. Heavy MTA Bus vs light NYC Pedicab mass dominance
  const pedicab = makeCar(0, 0, 0, 12, 0);
  const mtaBus = makeCar(0, 4.5, 0, 0, 0);
  const busVsPedicab = resolveVehiclePairCollision(pedicab, VEHICLE_SPECS.auto, mtaBus, VEHICLE_SPECS.bus);
  assert.equal(busVsPedicab.hit, true);
  assert.ok(Math.abs(mtaBus.vz) < 3.0, 'Heavy MTA bus barely budges when hit by pedicab');
  assert.ok(pedicab.vz < 2.0, 'Light pedicab stops/bounces slightly off heavy bus');

  // 4. Side-by-side vehicles in adjacent lanes do NOT falsely collide (true OBB vs old wide circle)
  const laneA = makeCar(-1.7, 0, 0, 12, 0);
  const laneB = makeCar(1.7, 0, 0, 12, 0);
  const adjacent = resolveVehiclePairCollision(laneA, VEHICLE_SPECS.taxi, laneB, VEHICLE_SPECS.sports);
  assert.equal(adjacent.hit, false, 'Vehicles in adjacent lanes must not trigger phantom collisions');
});

test('interactive task-based NYC missions have clear coordinates and progress through NPC talks, outfits, tasks, scavenging, confrontations, shops & park sports', () => {
  const interactiveMissions = MISSIONS.filter((m) => m.isInteractive);
  assert.equal(interactiveMissions.length, 4, 'Expected 4 interactive task-based NYC missions');

  // Verify every interactive target coordinate and collectible point is clear of buildings
  for (const m of interactiveMissions) {
    for (const step of m.steps) {
      if (step.targetX !== undefined && step.targetZ !== undefined) {
        const col = resolveCircleBuildingCollisions(step.targetX, step.targetZ, 0.7);
        assert.equal(
          col.hit,
          false,
          `Mission ${m.id} step "${step.label}" (${step.targetX}, ${step.targetZ}) must not sit inside a building`,
        );
      }
      if (step.collectPoints) {
        for (const pt of step.collectPoints) {
          const col = resolveCircleBuildingCollisions(pt.x, pt.z, 0.7);
          assert.equal(
            col.hit,
            false,
            `Mission ${m.id} collectible "${pt.label}" (${pt.x}, ${pt.z}) must not sit inside a building`,
          );
        }
      }
    }
  }

  // Walk through m19_soho_undercover_handshake (talk_npc -> change_outfit -> perform_task -> talk_npc)
  const m19 = MISSIONS.find((m) => m.id === 'm19_soho_undercover_handshake')!;
  let st = createActiveMission(m19.id, [])!;
  let tick = evaluateMissionTick(st, {
    dt: 0.1,
    playerX: m19.steps[0].targetX!,
    playerZ: m19.steps[0].targetZ!,
    vehicleType: null,
    wantedStars: 0,
    convoyDisabledCount: 0,
    talkedToMissionNpc: true,
  });
  assert.equal(tick.status, 'step_advanced');
  st = tick.nextState!;

  tick = evaluateMissionTick(st, {
    dt: 0.1,
    playerX: 0,
    playerZ: 0,
    vehicleType: null,
    wantedStars: 0,
    convoyDisabledCount: 0,
    changedOutfit: true,
  });
  assert.equal(tick.status, 'step_advanced');
  st = tick.nextState!;

  tick = evaluateMissionTick(st, {
    dt: 0.1,
    playerX: m19.steps[2].targetX!,
    playerZ: m19.steps[2].targetZ!,
    vehicleType: null,
    wantedStars: 0,
    convoyDisabledCount: 0,
    performedTask: true,
  });
  assert.equal(tick.status, 'step_advanced');
  st = tick.nextState!;

  tick = evaluateMissionTick(st, {
    dt: 0.1,
    playerX: m19.steps[3].targetX!,
    playerZ: m19.steps[3].targetZ!,
    vehicleType: null,
    wantedStars: 0,
    convoyDisabledCount: 0,
    talkedToMissionNpc: true,
  });
  assert.equal(tick.status, 'completed');
  assert.equal(tick.reward, m19.reward);

  // Walk through m20_manhattan_blackout_fix (talk_npc -> collect_items x3 -> perform_task -> shop_buy)
  const m20 = MISSIONS.find((m) => m.id === 'm20_manhattan_blackout_fix')!;
  let st20 = createActiveMission(m20.id, [])!;
  st20 = evaluateMissionTick(st20, {
    dt: 0.1,
    playerX: m20.steps[0].targetX!,
    playerZ: m20.steps[0].targetZ!,
    vehicleType: null,
    wantedStars: 0,
    convoyDisabledCount: 0,
    talkedToMissionNpc: true,
  }).nextState!;

  const pts = m20.steps[1].collectPoints!;
  for (let i = 0; i < pts.length; i++) {
    const t = evaluateMissionTick(st20, {
      dt: 0.1,
      playerX: pts[i].x,
      playerZ: pts[i].z,
      vehicleType: null,
      wantedStars: 0,
      convoyDisabledCount: 0,
    });
    assert.equal(t.itemCollectedIndex, i);
    st20 = t.nextState!;
    if (i < pts.length - 1) assert.equal(t.status, 'active');
    else assert.equal(t.status, 'step_advanced');
  }

  st20 = evaluateMissionTick(st20, {
    dt: 0.1,
    playerX: m20.steps[2].targetX!,
    playerZ: m20.steps[2].targetZ!,
    vehicleType: null,
    wantedStars: 0,
    convoyDisabledCount: 0,
    performedTask: true,
  }).nextState!;

  const done20 = evaluateMissionTick(st20, {
    dt: 0.1,
    playerX: 0,
    playerZ: 0,
    vehicleType: null,
    wantedStars: 0,
    convoyDisabledCount: 0,
    boughtFromShop: true,
  });
  assert.equal(done20.status, 'completed');

  // Walk through m21_central_park_hustle (talk_npc -> confront_target -> park_sport_score)
  const m21 = MISSIONS.find((m) => m.id === 'm21_central_park_hustle')!;
  let st21 = createActiveMission(m21.id, [])!;
  st21 = evaluateMissionTick(st21, {
    dt: 0.1,
    playerX: m21.steps[0].targetX!,
    playerZ: m21.steps[0].targetZ!,
    vehicleType: null,
    wantedStars: 0,
    convoyDisabledCount: 0,
    talkedToMissionNpc: true,
  }).nextState!;

  st21 = evaluateMissionTick(st21, {
    dt: 0.1,
    playerX: m21.steps[1].targetX!,
    playerZ: m21.steps[1].targetZ!,
    vehicleType: null,
    wantedStars: 0,
    convoyDisabledCount: 0,
    confrontedTarget: true,
  }).nextState!;

  const done21 = evaluateMissionTick(st21, {
    dt: 0.1,
    playerX: 0,
    playerZ: 0,
    vehicleType: null,
    wantedStars: 0,
    convoyDisabledCount: 0,
    parkRunsEarnedDelta: 6,
    activeParkVenueId: 'central_park_cricket',
  });
  assert.equal(done21.status, 'completed');
});

test('Elevated NYC Subway connects Manhattan, Brooklyn, and Queens with clear station entrances, live trains, dwell stops & ETAs', () => {
  assert.equal(SUBWAY_STATIONS.length, 6);
  const boroughs = new Set(SUBWAY_STATIONS.map((s) => s.borough));
  assert.ok(boroughs.has('Manhattan') && boroughs.has('Brooklyn') && boroughs.has('Queens'));

  // Every elevated station street kiosk entrance must sit completely clear of buildings
  for (const st of SUBWAY_STATIONS) {
    const col = resolveCircleBuildingCollisions(st.entranceX, st.entranceZ, 0.7);
    assert.equal(
      col.hit,
      false,
      `Subway station ${st.name} entrance (${st.entranceX}, ${st.entranceZ}) must not collide with buildings`,
    );
  }

  // Loop spline wraps seamlessly and stays elevated above road flyovers
  const p0 = sampleSubwayLoopPose(0, 1);
  const pWrap = sampleSubwayLoopPose(SUBWAY_LOOP_LENGTH, 1);
  assert.ok(Math.hypot(p0.x - pWrap.x, p0.z - pWrap.z) < 0.01);
  assert.ok(p0.y > 10.5, 'Elevated subway track clears 6.8m highway flyovers');

  // Train approaches Washington Sq station, docks cleanly with dwell timer, and resumes
  let trains = createInitialSubwayTrains();
  let dockedAtWashSq = false;
  for (let i = 0; i < 60; i++) {
    const res = stepSubwayTrain(trains[0], 0.1);
    trains[0] = res.next;
    if (res.arrivedStation?.id === 'st_wash_sq') dockedAtWashSq = true;
  }
  assert.equal(dockedAtWashSq, true, 'Express train must smoothly brake and dock at Washington Sq station');
  const etaNow = computeStationNextTrainEta(SUBWAY_STATIONS[0], trains);
  assert.ok(etaNow.etaSec >= 0);

  // Nearest station lookup finds Washington Sq near entrance
  const washSq = SUBWAY_STATIONS[0];
  assert.equal(findNearestSubwayStation(washSq.entranceX + 1.5, washSq.entranceZ, 8)?.id, 'st_wash_sq');
});

test('Smarter Random Street Events support Purse Snatcher, Red-Light Street Race, and Armored Cash Van flows', () => {
  // 1. Purse Snatcher chase & shove reward
  let snatcher = createStreetEvent({
    playerX: 0,
    playerZ: 0,
    playerHeading: 0,
    playerInVehicle: false,
    district: 'Washington Square',
    seed: 1,
    forcedKind: 'purse_snatcher',
  });
  assert.equal(snatcher.kind, 'purse_snatcher');
  const caught = evaluateStreetEventTick(snatcher, {
    dt: 0.1,
    playerX: snatcher.targetX,
    playerZ: snatcher.targetZ,
    playerInVehicle: false,
    thiefStopped: true,
    actorX: snatcher.targetX,
    actorZ: snatcher.targetZ,
  });
  assert.equal(caught.status, 'won');
  assert.equal(caught.reward, 550);

  // 2. Red-Light Street Race: accept while in vehicle, then cross finish arch ahead of rival
  let race = createStreetEvent({
    playerX: 0,
    playerZ: 40,
    playerHeading: 0,
    playerInVehicle: true,
    district: 'Midtown West',
    seed: 2,
    forcedKind: 'street_race',
  });
  assert.equal(race.phase, 'available');
  const started = evaluateStreetEventTick(race, {
    dt: 0.1,
    playerX: race.targetX,
    playerZ: race.targetZ,
    playerInVehicle: true,
    acceptedChallenge: true,
    actorX: race.targetX,
    actorZ: race.targetZ,
  });
  assert.equal(started.status, 'started');
  assert.equal(started.next?.phase, 'active');

  const wonRace = evaluateStreetEventTick(started.next!, {
    dt: 0.1,
    playerX: started.next!.finishX!,
    playerZ: started.next!.finishZ!,
    playerInVehicle: true,
    actorX: race.targetX,
    actorZ: race.targetZ,
  });
  assert.equal(wonRace.status, 'won');
  assert.equal(wonRace.reward, 850);

  // 3. Armored Cash Van: 3 solid ram hits crack the vault for $1,100 + 1 fair NYPD star
  let van = createStreetEvent({
    playerX: 56,
    playerZ: 80,
    playerHeading: 0,
    playerInVehicle: true,
    district: 'SoHo Lofts',
    seed: 3,
    forcedKind: 'armored_van',
  });
  const hit1 = evaluateStreetEventTick(van, {
    dt: 0.1,
    playerX: van.targetX,
    playerZ: van.targetZ,
    playerInVehicle: true,
    actorX: van.targetX,
    actorZ: van.targetZ,
    vanHitsDelta: 2,
  });
  assert.equal(hit1.status, 'ongoing');
  assert.equal(hit1.next?.progress, 2);

  const hit3 = evaluateStreetEventTick(hit1.next!, {
    dt: 0.1,
    playerX: van.targetX,
    playerZ: van.targetZ,
    playerInVehicle: true,
    actorX: van.targetX,
    actorZ: van.targetZ,
    vanHitsDelta: 1,
  });
  assert.equal(hit3.status, 'won');
  assert.equal(hit3.reward, 1100);
  assert.equal(hit3.wantedHeatDelta, 40);
});

test('Sidewalk pedestrian placement keeps crowds off roadways and steers drifters back to sidewalks', () => {
  // Center of Fifth Ave (x = 0) is on roadway; 9.5m off-center is sidewalk
  assert.equal(isPointOnRoadway(0, 20), true);
  assert.equal(isPointOnRoadway(9.6, 20), false);

  // Snapping a mid-road coordinate places the pedestrian cleanly off asphalt and clear of buildings
  const snapped = snapPointToSidewalk(1.2, 24, 1, 0.4, CITY_BUILDINGS);
  assert.equal(isPointOnRoadway(snapped.x, snapped.z), false, 'Snapped NPC must stand off roadway asphalt');
  assert.equal(
    resolveCircleBuildingCollisions(snapped.x, snapped.z, 0.45).hit,
    false,
    'Snapped NPC must not intersect any building',
  );

  // Pedestrian drifting onto roadway is steered back toward the nearest sidewalk curb
  const steer = steerPedestrianForSidewalk({ x: 3.5, z: 22, heading: -Math.PI / 2, allowCrossing: false });
  assert.equal(steer.onRoad, true);
  assert.ok(Math.sin(steer.heading) > 0.5, 'Roadway pedestrian should steer back toward +X sidewalk');
});

test('Hand melee and OBB vehicle bumper impacts reliably hit NPCs and return knockback & damage', () => {
  // 1. Hand punch within forward arc hits cleanly
  const forwardPunch = evaluateMeleeHit({
    playerX: 0,
    playerZ: 0,
    playerHeading: 0,
    targetX: 0.4,
    targetZ: 2.3,
  });
  assert.equal(forwardPunch.hit, true);
  assert.ok(forwardPunch.dirZ > 0.9, 'Forward punch knocks target forward along +Z');

  // Close-range brawl hit even slightly to the side/behind
  const closeBrawl = evaluateMeleeHit({
    playerX: 0,
    playerZ: 0,
    playerHeading: 0,
    targetX: -1.4,
    targetZ: -0.6,
  });
  assert.equal(closeBrawl.hit, true);

  // Out of reach target misses cleanly
  const farMiss = evaluateMeleeHit({
    playerX: 0,
    playerZ: 0,
    playerHeading: 0,
    targetX: 0,
    targetZ: 6.5,
  });
  assert.equal(farMiss.hit, false);

  // 2. Front bumper hit on Yellow Cab (4.5m long) & MTA Bus (8.2m long)
  const cab: VehiclePhysicsState = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vz: 10,
    heading: 0,
    steerAngle: 0,
    speed: 10,
    isDrifting: false,
    isBoosting: false,
    hitWall: false,
    impactSpeed: 0,
  };
  const cabHit = evaluateVehicleNpcImpact({ vehicle: cab, spec: VEHICLE_SPECS.taxi, npcX: 0.3, npcZ: 2.35 });
  assert.equal(cabHit.hit, true, 'Front bumper of Yellow Cab must hit pedestrian at z=2.35');
  assert.ok(cabHit.damage >= 35 && cabHit.knockoutDuration >= 3.0);

  // Bus bumper hits at z=4.1 (would have missed under old 2.2m center-circle check!)
  const busHit = evaluateVehicleNpcImpact({ vehicle: cab, spec: VEHICLE_SPECS.bus, npcX: 0.2, npcZ: 4.1 });
  assert.equal(busHit.hit, true, 'Front bumper of 8.2m MTA Bus must hit pedestrian at z=4.1');

  // Stationary / crawling car (< 2.0 m/s) does not launch NPCs
  const slowCab = { ...cab, vz: 1.0, speed: 1.0 };
  assert.equal(evaluateVehicleNpcImpact({ vehicle: slowCab, spec: VEHICLE_SPECS.taxi, npcX: 0, npcZ: 1.8 }).hit, false);
});

test('Realistic human locomotion drives contralateral arm-leg gait, counter-rotating spine, landing crouch, and alternating footstep triggers', () => {
  let loco = createInitialHumanLocomotion(0);
  const footEvents: Array<'left' | 'right'> = [];

  // Walk forward for 1.6s -> should emit alternating left/right heel-strike footstep events
  for (let i = 0; i < 64; i++) {
    loco = stepHumanLocomotion(loco, {
      wishX: 0,
      wishZ: 1,
      wantsSprint: false,
      grounded: true,
      justLandedSpeed: 0,
      dt: 0.025,
    });
    if (loco.steppedFoot) footEvents.push(loco.steppedFoot);
  }
  assert.ok(loco.speed > 4.5, 'Human walks smoothly up to target pace');
  assert.ok(footEvents.includes('left') && footEvents.includes('right'), 'Both left and right heel-strikes trigger footstep SFX');

  // Check biomechanical contralateral gait at left-leg forward phase (phase = π/2)
  const strideLoco = { ...loco, gaitPhase: Math.PI * 0.5, moveBlend: 1, sprintBlend: 0.5 };
  const pose = solveHumanGaitPose({
    loco: strideLoco,
    simTime: 1.0,
    punchTimer: 0,
    punchDuration: 0.34,
    punchHand: 1,
  });
  assert.ok(pose.leftHipX < -0.3, 'Left leg advances forward (negative X rotation)');
  assert.ok(pose.rightHipX > 0.3, 'Right leg trails behind (positive X rotation)');
  assert.ok(pose.rightShoulderX < 0 && pose.leftShoulderX > 0, 'Arms swing contralaterally (right arm forward with left leg)');
  assert.ok(pose.pelvisYaw > 0 && pose.spineYaw < 0, 'Pelvis and thoracic spine counter-rotate organically');
  assert.ok(pose.leftShoulderZ < 0 && pose.rightShoulderZ > 0, 'Arms hang naturally outward clear of torso');
  assert.ok(pose.leftAnkleX < 0 && pose.rightAnkleX > 0, 'Front foot dorsiflexes (heel-strike) while rear foot plantarflexes (toe-off)');
  assert.ok(pose.leftElbowX < -0.2 && pose.rightElbowX < -0.2, 'Elbows stay naturally bent during stride');

  // Jump landing triggers spring-damped knee-absorption crouch
  const landed = stepHumanLocomotion(loco, {
    wishX: 0,
    wishZ: 0,
    wantsSprint: false,
    grounded: true,
    justLandedSpeed: 8.0,
    dt: 0.03,
  });
  assert.ok(landed.landingCrouch > 0.05, 'Landing from jump compresses knees smoothly');

  // Punch combo extends striking arm and tucks opposite guard hand
  const punchPose = solveHumanGaitPose({
    loco: strideLoco,
    simTime: 1.0,
    punchTimer: 0.22,
    punchDuration: 0.34,
    punchHand: 1,
  });
  assert.ok(punchPose.rightShoulderX < -1.1, 'Right cross punch drives shoulder forward');
  assert.ok(punchPose.leftElbowX < -1.2, 'Left hand tucks into boxing guard during right cross');
});

test('Custom GLB character pipeline classifies Meshy/Mixamo clips, normalizes bounds to 1.70m grounded, matches humanoid bones, and strips root XZ drift', () => {
  // 1. Animation clip classification for Meshy.ai & Mixamo naming conventions
  assert.equal(classifyAnimationClipName('Animation_Walking_withSkin'), 'walk');
  assert.equal(classifyAnimationClipName('Female_Catwalk_Walk'), 'walk');
  assert.equal(classifyAnimationClipName('Animation_Running_withSkin'), 'run');
  assert.equal(classifyAnimationClipName('Fast_Sprint_Loop'), 'run');
  assert.equal(classifyAnimationClipName('Breathing_Idle'), 'idle');
  assert.equal(classifyAnimationClipName('Standing_Jump_Up'), 'jump');
  assert.equal(classifyAnimationClipName('Boxing_Hook_Punch'), 'punch');

  // 2. Bounding box normalization (e.g., centimeter-scale Mixamo/Blender mesh -> exact 1.70m planted on y=0)
  const norm = computeModelNormalization(
    { minX: -40, maxX: 60, minY: -5, maxY: 165, minZ: -20, maxZ: 20 },
    1.7,
  );
  assert.ok(Math.abs(norm.scale - 0.01) < 1e-6, 'Scales 170cm mesh cleanly to 1.70m');
  assert.ok(Math.abs(norm.offsetY - 0.05) < 1e-6, 'Shifts feet cleanly to y=0');
  assert.ok(Math.abs(norm.offsetX - -0.1) < 1e-6, 'Centers X around origin');
  assert.equal(PLAYER_GLB_TARGET_HEIGHT, 2.0, 'Default GLB protagonist target height is 2.00m (+18% vs 1.70m)');
  const defaultNorm = computeModelNormalization({ minX: -0.4, maxX: 0.4, minY: 0, maxY: 1.0, minZ: -0.3, maxZ: 0.3 });
  assert.ok(Math.abs(defaultNorm.scale - 2.0) < 1e-6, 'Default normalization uses 2.00m protagonist height');

  // 3. Humanoid bone matcher across Mixamo, Meshy, and Blender naming styles
  assert.equal(matchHumanoidBoneRole('mixamorigHips'), 'hips');
  assert.equal(matchHumanoidBoneRole('mixamorig:LeftUpLeg'), 'leftUpperLeg');
  assert.equal(matchHumanoidBoneRole('RightForeArm'), 'rightLowerArm');
  assert.equal(matchHumanoidBoneRole('thigh_L'), 'leftUpperLeg');
  assert.equal(matchHumanoidBoneRole('Spine02'), 'chest');
  assert.equal(matchHumanoidBoneRole('Head'), 'head');

  // 4. Root-motion XZ stripping preserves vertical hip bounce Y while cancelling forward walk drift
  const hipsPosTrack = new THREE.VectorKeyframeTrack('mixamorigHips.position', [0, 0.5, 1.0], [
    0.1, 0.92, 0.0,
    0.15, 0.98, 1.4,
    0.2, 0.91, 2.8,
  ]);
  const clip = new THREE.AnimationClip('Walk', 1.0, [hipsPosTrack]);
  const cleaned = stripHorizontalRootMotion(clip);
  const vals = cleaned.tracks[0].values;
  assert.ok(Math.abs(vals[0] - 0.1) < 1e-5 && Math.abs(vals[3] - 0.1) < 1e-5 && Math.abs(vals[6] - 0.1) < 1e-5, 'X locked');
  assert.ok(Math.abs(vals[2] - 0.0) < 1e-5 && Math.abs(vals[5] - 0.0) < 1e-5 && Math.abs(vals[8] - 0.0) < 1e-5, 'Z locked');
  assert.ok(Math.abs(vals[4] - 0.98) < 1e-5, 'Vertical hip Y bounce preserved');
});

test('Dynamic Foley footsteps resolve NYC surfaces, differentiate walk vs run acoustics, and trigger realistic human cadence & brake scuff', () => {
  // 1. Surface resolution across NYC zones
  const park = RECREATION_ZONES.find((z) => z.kind === 'park')!;
  const playground = RECREATION_ZONES.find((z) => z.kind === 'playground')!;
  const pier = PIER_ZONES[0];

  assert.equal(resolveFootstepSurfaceAt(park.cx, park.cz, 0).surface, 'grass');
  assert.equal(resolveFootstepSurfaceAt(playground.cx, playground.cz, 0).surface, 'gravel');
  assert.equal(resolveFootstepSurfaceAt((pier.minX + pier.maxX) * 0.5, (pier.minZ + pier.maxZ) * 0.5, 0).surface, 'wood');
  assert.equal(resolveFootstepSurfaceAt(ROAD_COORDS[5], 0, 0).surface, 'asphalt');
  assert.equal(resolveFootstepSurfaceAt(ROAD_COORDS[5] + 10, ROAD_COORDS[5] + 10, 0.8).wetness, 0.8);

  // 2. Walk vs Run acoustic profile differentiation on concrete vs grass
  const walkConcrete = computeFootstepAcousticProfile({ speedMps: 4.8, surface: 'concrete', foot: 'left' });
  const runConcrete = computeFootstepAcousticProfile({ speedMps: 9.2, surface: 'concrete', foot: 'right' });
  const walkGrass = computeFootstepAcousticProfile({ speedMps: 4.8, surface: 'grass', foot: 'left' });
  const wetRun = computeFootstepAcousticProfile({ speedMps: 8.8, surface: 'asphalt', wetness: 0.9, foot: 'right' });

  assert.equal(walkConcrete.gait, 'walk');
  assert.equal(runConcrete.gait, 'run');
  assert.ok(runConcrete.heelToToeDelaySec < walkConcrete.heelToToeDelaySec, 'Sprint compresses heel-to-toe roll time');
  assert.ok(runConcrete.gain > walkConcrete.gain && runConcrete.brightness > walkConcrete.brightness, 'Running impacts are louder and brighter');
  assert.ok(walkConcrete.pan < 0 && runConcrete.pan > 0, 'Left/right footsteps pan subtly in stereo');
  assert.ok(walkGrass.tapGain < walkConcrete.tapGain * 0.25, 'Grass suppresses sharp heel-tap click');
  assert.ok(walkGrass.textureDurationSec > walkConcrete.textureDurationSec * 2, 'Grass has longer leafy rustle duration');
  assert.ok(wetRun.splashGain > 0.5, 'Rain wetness layers puddle splash energy');

  // 3. Natural human walk (~2 steps/s) vs sprint (~3.2 steps/s) cadence + braking scuff trigger
  let walkLoco = createInitialHumanLocomotion(0);
  let walkSteps = 0;
  for (let i = 0; i < 200; i++) {
    walkLoco = stepHumanLocomotion(walkLoco, { wishX: 0, wishZ: 1, wantsSprint: false, grounded: true, justLandedSpeed: 0, dt: 0.02 });
    if (walkLoco.steppedFoot) walkSteps += 1;
  }
  let runLoco = createInitialHumanLocomotion(0);
  let runSteps = 0;
  for (let i = 0; i < 200; i++) {
    runLoco = stepHumanLocomotion(runLoco, { wishX: 0, wishZ: 1, wantsSprint: true, grounded: true, justLandedSpeed: 0, dt: 0.02 });
    if (runLoco.steppedFoot) runSteps += 1;
  }
  assert.ok(walkSteps >= 6 && walkSteps <= 10, `Walk cadence over 4s should be natural ~8 steps, got ${walkSteps}`);
  assert.ok(runSteps > walkSteps + 2, `Sprint cadence (${runSteps}) must be noticeably faster than walk (${walkSteps})`);

  // Sudden stop from sprint triggers braking scuff SFX
  let scuffed = false;
  for (let i = 0; i < 15; i++) {
    runLoco = stepHumanLocomotion(runLoco, { wishX: 0, wishZ: 0, wantsSprint: false, grounded: true, justLandedSpeed: 0, dt: 0.02 });
    if (runLoco.brakingScuff) scuffed = true;
  }
  assert.equal(scuffed, true, 'Sudden hard stop from sprint triggers sole-drag brake scuff');
});

test('Parks, playgrounds, cage courts, Washington Square Arch & Bronx Stadium enforce solid collisions while keeping gates, park sports & vendors clear', () => {
  const bronx = RECREATION_ZONES.find((z) => z.id === 'bronx_stadium_arena')!;
  const centralPark = RECREATION_ZONES.find((z) => z.id === 'central_park_lawn')!;
  const washPg = RECREATION_ZONES.find((z) => z.id === 'washington_sq_playground')!;
  const rucker = RECREATION_ZONES.find((z) => z.id === 'harlem_rucker_courts')!;

  // 1. Bronx Stadium: outer colonnade & inner outfield bowl solidly block players & cars (cannot walk through stands!)
  const outsideNorth = resolveCircleBuildingCollisions(bronx.cx, bronx.cz - 41.0, 0.55);
  assert.equal(outsideNorth.hit, true, 'Cannot walk through Bronx Stadium exterior north facade');
  assert.ok(outsideNorth.z <= bronx.cz - 42.9, `Pushed cleanly outside exterior colonnade, got z=${outsideNorth.z}`);

  const outsideEastCar = resolveCircleBuildingCollisions(bronx.cx + 40.5, bronx.cz, 1.65);
  assert.equal(outsideEastCar.hit, true, 'Cars cannot drive through Bronx Stadium east exterior wall');
  assert.ok(outsideEastCar.x >= bronx.cx + 44.0, 'Car pushed completely outside stadium perimeter');

  const insideBowl = resolveCircleBuildingCollisions(bronx.cx + 26.0, bronx.cz - 16.0, 0.55);
  assert.equal(insideBowl.hit, true, 'Inside turf player cannot clip through lower seating bowl');
  assert.ok(Math.hypot(insideBowl.x - bronx.cx, insideBowl.z - bronx.cz) <= 28.6, 'Pushed cleanly back inside outfield padded wall');

  // Dugouts, South gate pylons, ticket booths & center-field Batter's Eye are solid
  assert.equal(resolveCircleBuildingCollisions(bronx.cx + 26.8, bronx.cz, 0.5).hit, true, 'East dugout front is solid');
  assert.equal(resolveCircleBuildingCollisions(bronx.cx - 8.4, bronx.cz + 41.6, 0.5).hit, true, 'South pylon is solid');
  assert.equal(resolveCircleBuildingCollisions(bronx.cx, bronx.cz - 28.4, 0.5).hit, true, 'Batters Eye wall is solid');

  // South Main Gate lets pedestrians walk straight onto the championship field, while bollards block vehicles!
  assert.equal(resolveCircleBuildingCollisions(bronx.cx + 1.2, bronx.cz + 44.8, 0.48).hit, false, 'Pedestrian walks cleanly between South plaza bollards');
  assert.equal(resolveCircleBuildingCollisions(bronx.cx, bronx.cz + 36.0, 0.48).hit, false, 'South Main Gate entrance tunnel is open for walking onto pitch');
  assert.equal(resolveCircleBuildingCollisions(bronx.cx, bronx.cz + 10.0, 0.48).hit, false, 'Center stadium turf is wide open');
  assert.equal(resolveCircleBuildingCollisions(bronx.cx + 1.2, bronx.cz + 44.8, 1.55).hit, true, 'Cars are blocked by South plaza security bollards');

  // 2. Central Park: 4-sided stone & iron perimeter walls + NE fountain are solid; all 4 cardinal gates are open
  assert.equal(resolveCircleBuildingCollisions(centralPark.cx + 11.5, centralPark.cz - 19.5, 0.5).hit, true, 'North park stone wall blocks entry');
  assert.equal(resolveCircleBuildingCollisions(centralPark.cx - 19.5, centralPark.cz + 11.5, 0.5).hit, true, 'West park stone wall blocks entry');
  assert.equal(resolveCircleBuildingCollisions(centralPark.cx + 14.4, centralPark.cz - 14.2, 0.5).hit, true, 'NE stone fountain is solid');
  assert.equal(resolveCircleBuildingCollisions(centralPark.cx, centralPark.cz - 19.5, 0.5).hit, false, 'Central Park North Gate is open');
  assert.equal(resolveCircleBuildingCollisions(centralPark.cx, centralPark.cz + 19.5, 0.5).hit, false, 'Central Park South Gate is open');
  assert.equal(resolveCircleBuildingCollisions(centralPark.cx - 19.5, centralPark.cz, 0.5).hit, false, 'Central Park West Gate is open');
  assert.equal(resolveCircleBuildingCollisions(centralPark.cx + 19.5, centralPark.cz, 0.5).hit, false, 'Central Park East Gate is open');

  // 3. Washington Square Playground & Marble Arch: solid brick fence, fort, climbing dome & arch piers; open drive-through arch & gates
  assert.equal(resolveCircleBuildingCollisions(washPg.cx + 10.5, washPg.cz + 17.35, 0.5).hit, true, 'Playground south fence is solid');
  assert.equal(resolveCircleBuildingCollisions(washPg.cx - 7.5, washPg.cz - 5.6, 0.5).hit, true, 'Playground adventure fort is solid');
  assert.equal(resolveCircleBuildingCollisions(washPg.cx, washPg.cz + 4.6, 0.5).hit, true, 'Geodesic climbing dome is solid');
  assert.equal(resolveCircleBuildingCollisions(washPg.cx, washPg.cz + 17.35, 0.5).hit, false, 'Playground south pedestrian gate is open');
  assert.equal(resolveCircleBuildingCollisions(-8.6, -90, 0.5).hit, true, 'Washington Square Arch West marble pier is solid');
  assert.equal(resolveCircleBuildingCollisions(8.6, -90, 0.5).hit, true, 'Washington Square Arch East marble pier is solid');
  assert.equal(resolveCircleBuildingCollisions(0, -90, 1.6).hit, false, 'Washington Square Arch center roadway stays wide open for cars');

  // 4. Harlem Rucker Cage Courts: 4-sided chain-link fence, bleachers, hoop stanchion & tennis net are solid; gates open
  assert.equal(resolveCircleBuildingCollisions(rucker.cx + 11.5, rucker.cz - 19.45, 0.5).hit, true, 'Rucker chain-link cage wall is solid');
  assert.equal(resolveCircleBuildingCollisions(rucker.cx + 16.5, rucker.cz, 0.5).hit, true, 'Rucker spectator bleachers are solid');
  assert.equal(resolveCircleBuildingCollisions(rucker.cx - 11.75, rucker.cz - 8.5, 0.5).hit, true, 'Basketball hoop stanchion is solid');
  assert.equal(resolveCircleBuildingCollisions(rucker.cx, rucker.cz + 11.2, 0.5).hit, true, 'Tennis net is solid');
  assert.equal(resolveCircleBuildingCollisions(rucker.cx, rucker.cz - 19.45, 0.5).hit, false, 'Rucker North Cage Gate is open');

  // 5. All 4 Park Sports venues (crease, bowler, every fielder, and exit sideline) stay 100% clear of colliders!
  for (const venue of PARK_SPORT_VENUES) {
    assert.equal(resolveCircleBuildingCollisions(venue.creaseX, venue.creaseZ, 0.5).hit, false, `${venue.id} crease clear`);
    assert.equal(resolveCircleBuildingCollisions(venue.bowlerX, venue.bowlerZ, 0.5).hit, false, `${venue.id} bowler clear`);
    assert.equal(resolveCircleBuildingCollisions(venue.cx + 12, venue.cz + 6, 0.5).hit, false, `${venue.id} leave spot clear`);
    for (const off of venue.npcOffsets) {
      assert.equal(
        resolveCircleBuildingCollisions(venue.cx + off.dx, venue.cz + off.dz, 0.45).hit,
        false,
        `${venue.id} NPC offset (${off.dx},${off.dz}) clear`,
      );
    }
  }

  // 6. All park vendor cart coordinates stay 100% clear of walls, trees & props!
  const parkVendorCoords: Array<[string, number, number]> = [
    ['stall_cp_hotdog', 13.5, 70],
    ['stall_cp_pretzel', 42.5, 98],
    ['stall_cp_coffee', 13.5, 98],
    ['stall_flushing_halal', 405, 238],
    ['stall_flushing_hotdog', 435, 266],
    ['stall_rucker_halal', 237, 126],
    ['stall_rucker_pretzel', 267, 154],
    ['stall_west4_pizza', 13.5, 406],
    ['stall_washpg_pretzel', 14, -14],
    ['stall_astoria_coffee', 350, 350],
    ['stall_arch_informant', 10.5, -74],
  ];
  for (const [id, vx, vz] of parkVendorCoords) {
    assert.equal(
      resolveCircleBuildingCollisions(vx, vz, 0.6).hit,
      false,
      `Park vendor ${id} at (${vx},${vz}) must remain clear of colliders`,
    );
  }
});

test('floating heading-up GPS radar maps ahead->UP, right->RIGHT, left->LEFT and orbits North compass cleanly', () => {
  const cx = 81;
  const cy = 81;
  const scale = 0.5;
  const ringR = 72;

  // 1. Facing North (h = PI): North (-Z) is UP, East (+X) is RIGHT, West (-X) is LEFT
  const northFwd = worldToRadarPoint(0, -20, 0, 0, Math.PI, scale, cx, cy);
  assert.ok(Math.abs(northFwd.x - cx) < 1e-6 && northFwd.y < cy - 9, 'Facing North: ahead (-Z) maps straight UP');
  const northRight = worldToRadarPoint(20, 0, 0, 0, Math.PI, scale, cx, cy);
  assert.ok(northRight.x > cx + 9 && Math.abs(northRight.y - cy) < 1e-6, 'Facing North: East (+X) maps RIGHT');
  const nBadgeNorth = getNorthCompassPosition(Math.PI, cx, cy, ringR);
  assert.ok(Math.abs(nBadgeNorth.x - cx) < 1e-6 && Math.abs(nBadgeNorth.y - (cy - ringR)) < 1e-6, 'N badge at TOP when facing North');

  // 2. Facing East (h = +PI/2): East (+X) is UP, South (+Z) is RIGHT, North (-Z) is LEFT!
  const eastFwd = worldToRadarPoint(20, 0, 0, 0, Math.PI / 2, scale, cx, cy);
  assert.ok(Math.abs(eastFwd.x - cx) < 1e-6 && eastFwd.y < cy - 9, 'Facing East: ahead (+X) maps straight UP');
  const eastRight = worldToRadarPoint(0, 20, 0, 0, Math.PI / 2, scale, cx, cy);
  assert.ok(eastRight.x > cx + 9 && Math.abs(eastRight.y - cy) < 1e-6, 'Facing East: South (+Z) maps RIGHT');
  const eastLeft = worldToRadarPoint(0, -20, 0, 0, Math.PI / 2, scale, cx, cy);
  assert.ok(eastLeft.x < cx - 9 && Math.abs(eastLeft.y - cy) < 1e-6, 'Facing East: North (-Z) maps LEFT');
  const nBadgeEast = getNorthCompassPosition(Math.PI / 2, cx, cy, ringR);
  assert.ok(Math.abs(nBadgeEast.x - (cx - ringR)) < 1e-6 && Math.abs(nBadgeEast.y - cy) < 1e-6, 'N badge orbits to LEFT when facing East');

  // 3. Facing South (h = 0): South (+Z) is UP, West (-X) is RIGHT, N badge orbits to BOTTOM
  const southFwd = worldToRadarPoint(0, 20, 0, 0, 0, scale, cx, cy);
  assert.ok(Math.abs(southFwd.x - cx) < 1e-6 && southFwd.y < cy - 9, 'Facing South: ahead (+Z) maps straight UP');
  const nBadgeSouth = getNorthCompassPosition(0, cx, cy, ringR);
  assert.ok(Math.abs(nBadgeSouth.x - cx) < 1e-6 && Math.abs(nBadgeSouth.y - (cy + ringR)) < 1e-6, 'N badge orbits to BOTTOM when facing South');

  // 4. Facing West (h = -PI/2): West (-X) is UP, North (-Z) is RIGHT, N badge orbits to RIGHT
  const westFwd = worldToRadarPoint(-20, 0, 0, 0, -Math.PI / 2, scale, cx, cy);
  assert.ok(Math.abs(westFwd.x - cx) < 1e-6 && westFwd.y < cy - 9, 'Facing West: ahead (-X) maps straight UP');
  const nBadgeWest = getNorthCompassPosition(-Math.PI / 2, cx, cy, ringR);
  assert.ok(Math.abs(nBadgeWest.x - (cx + ringR)) < 1e-6 && Math.abs(nBadgeWest.y - cy) < 1e-6, 'N badge orbits to RIGHT when facing West');

  // 5. Canvas rotation matches worldToRadarPoint projection & player chevron stays straight UP when aligned
  assert.ok(Math.abs(getRadarRotationRad(Math.PI)) < 1e-6);
  assert.ok(Math.abs(getRadarRotationRad(Math.PI / 2) - -Math.PI / 2) < 1e-6);
  assert.equal(getPlayerArrowRelativeAngle(1.2, 1.2), 0);
  // Looking North (PI) while body faces East (+PI/2) -> chevron tilts RIGHT (+PI/2)
  assert.ok(Math.abs(getPlayerArrowRelativeAngle(Math.PI, Math.PI / 2) - Math.PI / 2) < 1e-6);

  // 6. Shortest-arc heading smoothing wraps seamlessly across +PI / -PI boundary
  const wrapped = stepSmoothedRadarHeading(3.1, -3.1, 0.05, 10);
  assert.ok(Math.abs(wrapped) > 3.0, `Expected shortest-arc wrap near PI, got ${wrapped}`);

  // 7. Off-radar waypoints clamp cleanly onto circular bezel & driving fast zooms radar out
  const clamped = clampRadarEdgeWaypoint(cx + 300, cy, cx, cy, 68);
  assert.equal(clamped.clamped, true);
  assert.ok(Math.abs(clamped.x - (cx + 68)) < 1e-6 && Math.abs(clamped.y - cy) < 1e-6);
  assert.ok(computeDynamicRadarScale(0, false) > computeDynamicRadarScale(110, true));

  // 8. Minimap update cadence throttles to ~2-3 FPS for low CPU overhead while allowing immediate dirty redraws
  assert.ok(MINIMAP_UPDATE_INTERVAL_SEC >= 0.3 && MINIMAP_UPDATE_INTERVAL_SEC <= 0.5);
  assert.equal(shouldRedrawMinimap(0.05, false), false);
  assert.equal(shouldRedrawMinimap(0.05, true), true);
  assert.equal(shouldRedrawMinimap(MINIMAP_UPDATE_INTERVAL_SEC, false), true);

  // 9. Fixed North-up circular radar keeps North (-Z) UP, East (+X) RIGHT, and rotates player chevron accurately
  const nuNorth = worldToNorthUpRadarPoint(0, -20, 0, 0, NORTH_UP_RADAR_SCALE, cx, cy);
  const nuEast = worldToNorthUpRadarPoint(20, 0, 0, 0, NORTH_UP_RADAR_SCALE, cx, cy);
  assert.ok(Math.abs(nuNorth.x - cx) < 1e-6 && nuNorth.y < cy - 5, 'North-up: -Z is always UP');
  assert.ok(nuEast.x > cx + 5 && Math.abs(nuEast.y - cy) < 1e-6, 'North-up: +X is always RIGHT');
  assert.ok(Math.abs(getNorthUpPlayerArrowAngle(Math.PI)) < 1e-6, 'Facing North -> arrow points UP (0)');
  assert.ok(Math.abs(getNorthUpPlayerArrowAngle(Math.PI / 2) - Math.PI / 2) < 1e-6, 'Facing East -> arrow points RIGHT (+PI/2)');
  assert.ok(Math.abs(Math.abs(getNorthUpPlayerArrowAngle(0)) - Math.PI) < 1e-6, 'Facing South -> arrow points DOWN (PI)');
  assert.ok(Math.abs(getNorthUpPlayerArrowAngle(-Math.PI / 2) - -Math.PI / 2) < 1e-6, 'Facing West -> arrow points LEFT (-PI/2)');
});

test('exotic supercar, hypercar, muscle coupe & luxury SUV fleet specs and 10 liveries are valid', () => {
  assert.ok(VEHICLE_SPECS.hypercar.maxSpeed > VEHICLE_SPECS.sports.maxSpeed);
  assert.ok(VEHICLE_SPECS.muscle.maxSpeed > VEHICLE_SPECS.taxi.maxSpeed);
  assert.ok(VEHICLE_SPECS.suv_lux.maxSpeed > VEHICLE_SPECS.taxi.maxSpeed);
  assert.equal(SUPERCAR_LIVERIES.length, 10);
  const ids = new Set(SUPERCAR_LIVERIES.map((l) => l.id));
  assert.equal(ids.size, 10, 'All 10 supercar liveries have unique IDs');
  assert.equal(getSupercarLivery(10).id, SUPERCAR_LIVERIES[0].id);
  assert.equal(getSupercarLivery(-1).id, SUPERCAR_LIVERIES[9].id);
});

test('dynamic Vice-Wave radio music activates at comfortable low volume in vehicles and while running', () => {
  // 1. Station cycling loops cleanly through all 3 GTA-style stations + Radio Off
  assert.equal(MUSIC_STATIONS.length, 4);
  let st = MUSIC_STATIONS[0].id;
  const seen = [st];
  for (let i = 0; i < MUSIC_STATIONS.length; i++) {
    st = cycleMusicStation(st);
    seen.push(st);
  }
  assert.deepEqual(seen, ['vice_nights', 'midtown_drift', 'hudson_electro', 'off', 'vice_nights']);

  // 2. Sitting / driving in a car activates music at comfortably low background gain
  const inCar = computeDynamicMusicMix({
    stationId: 'vice_nights',
    inVehicle: true,
    speedMps: 0,
    isSprinting: false,
    muted: false,
    active: true,
    idleHoldSec: 10,
  });
  assert.equal(inCar.playing, true);
  assert.equal(inCar.gain, MUSIC_GAIN_VEHICLE);
  assert.ok(inCar.gain > 0.12 && inCar.gain <= 0.24, 'Vehicle music stays comfortably low under SFX');

  // 3. Running / sprinting on foot activates music at slightly softer background gain
  const running = computeDynamicMusicMix({
    stationId: 'hudson_electro',
    inVehicle: false,
    speedMps: 6.2,
    isSprinting: true,
    muted: false,
    active: true,
    idleHoldSec: 10,
  });
  assert.equal(running.playing, true);
  assert.equal(running.gain, MUSIC_GAIN_RUNNING);
  assert.ok(running.gain > 0.1 && running.gain < inCar.gain);

  // 4. Walking slowly / idling on foot fades down cleanly to 0 after hold tail
  const fadedOut = computeDynamicMusicMix({
    stationId: 'vice_nights',
    inVehicle: false,
    speedMps: 1.5,
    isSprinting: false,
    muted: false,
    active: true,
    idleHoldSec: MUSIC_IDLE_HOLD_SECONDS + 0.5,
  });
  assert.equal(fadedOut.playing, false);
  assert.equal(fadedOut.gain, 0);

  // 5. Manual station switch preview lets player immediately hear the tuned station on foot
  const previewing = computeDynamicMusicMix({
    stationId: 'midtown_drift',
    inVehicle: false,
    speedMps: 0,
    isSprinting: false,
    muted: false,
    active: true,
    idleHoldSec: 10,
    previewHoldSec: 3.0,
  });
  assert.equal(previewing.playing, true);
  assert.ok(previewing.gain > 0.1);

  // 6. Muted, paused/inactive, or Radio Off always produce exact 0 gain
  assert.equal(
    computeDynamicMusicMix({
      stationId: 'vice_nights',
      inVehicle: true,
      speedMps: 15,
      isSprinting: false,
      muted: true,
      active: true,
      idleHoldSec: 0,
    }).gain,
    0,
  );
  assert.equal(
    computeDynamicMusicMix({
      stationId: 'off',
      inVehicle: true,
      speedMps: 15,
      isSprinting: false,
      muted: false,
      active: true,
      idleHoldSec: 0,
    }).gain,
    0,
  );
  assert.equal(
    computeDynamicMusicMix({
      stationId: 'vice_nights',
      inVehicle: true,
      speedMps: 15,
      isSprinting: false,
      muted: false,
      active: false,
      idleHoldSec: 0,
    }).gain,
    0,
  );
  // Pre-rendered offline music sample rate stays lightweight (22.05kHz stereo loop buffer)
  assert.equal(MUSIC_OFFLINE_SAMPLE_RATE, 22050);
});

test('graphics quality presets maintain safe sky dome radius, monotonic camera far, and DPR caps', () => {
  assert.deepEqual(GRAPHICS_QUALITY_ORDER, ['low', 'medium', 'high']);

  const low = getGraphicsQualitySpec('low');
  const med = getGraphicsQualitySpec('medium');
  const high = getGraphicsQualitySpec('high');

  assert.ok(low.cameraFar < med.cameraFar && med.cameraFar < high.cameraFar);
  assert.equal(low.playerShadowEnabled, false);
  assert.equal(med.playerShadowEnabled, true);
  assert.equal(high.playerShadowEnabled, true);
  assert.ok(high.shadowMapSize >= med.shadowMapSize);

  for (const preset of GRAPHICS_QUALITY_ORDER) {
    const spec = GRAPHICS_QUALITY_SPECS[preset];
    const scaledSkyRadius = SKY_DOME_BASE_RADIUS * spec.skyDomeScale;
    assert.ok(
      scaledSkyRadius < spec.cameraFar,
      `Preset "${preset}" sky dome (${scaledSkyRadius}m) must stay inside cameraFar (${spec.cameraFar}m)`,
    );
  }

  // Pixel ratio resolution clamps Retina DPR and forces 1x on software WebGL
  assert.equal(resolveEffectivePixelRatio('low', 2, false), 1);
  assert.equal(resolveEffectivePixelRatio('medium', 2, false), 1.5);
  assert.equal(resolveEffectivePixelRatio('high', 2, false), 2);
  assert.equal(resolveEffectivePixelRatio('high', 3, false), 2);
  assert.equal(resolveEffectivePixelRatio('high', 2, true), 1);

  // Invalid stored strings fall back cleanly to balanced medium
  assert.equal(parseGraphicsQualityPreset('low'), 'low');
  assert.equal(parseGraphicsQualityPreset('high'), 'high');
  assert.equal(parseGraphicsQualityPreset('ultra'), 'medium');
  assert.equal(parseGraphicsQualityPreset(null), 'medium');
});
