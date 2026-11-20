/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { MissionPhoneModal } from './components/MissionPhoneModal';
import { StatusModal } from './components/StatusModal';
import { SubwayModal } from './components/SubwayModal';
import { TitleScreen } from './components/TitleScreen';
import { PLAYER_OUTFITS } from './game/characterModels';
import {
  loadSavedGraphicsQuality,
  saveGraphicsQuality,
  type GraphicsQualityPreset,
} from './game/graphicsQuality';
import { MISSIONS } from './game/missions';
import { MumbaiWorldEngine } from './game/MumbaiWorldEngine';
import type { HudSnapshot } from './game/types';

function createInitialHud(initialQuality: GraphicsQualityPreset): HudSnapshot {
  return {
    gameState: 'title',
    hp: 100,
    maxHp: 100,
    hpRegenerating: false,
    damageFlash: 0,
    stamina: 100,
    boost: 100,
    cash: 1200,
    wantedStars: 0,
    wantedCooldownRatio: 0,
    district: 'Washington Square',
    inVehicle: false,
    vehicleLabel: '',
    vehicleType: null,
    vehicleHp: 0,
    vehicleMaxHp: 0,
    speedKmh: 0,
    isDrifting: false,
    isBoosting: false,
    cameraMode: 'chase',
    graphicsQuality: initialQuality,
    weatherMode: 'clear_sunset',
    weatherLabel: 'Golden Hudson Sunset',
    weatherRainIntensity: 0,
    playerOutfitId: PLAYER_OUTFITS[0].id,
    playerOutfitLabel: PLAYER_OUTFITS[0].label,
    customModel: null,
    savedCustomModels: [],
    muted: false,
    radioStationId: 'vice_nights',
    radioStationLabel: 'Vice Nights FM',
    radioStationShortLabel: 'Vice Nights',
    radioAccentHex: '#f472b6',
    radioPlaying: false,
    activeMission: null,
    completedMissionIds: [],
    prompt: null,
    toast: null,
    activeNpcCount: 416,
    activeParkSport: null,
    activeStreetEvent: null,
    nearbySubwayStationId: null,
    subwayRidingLabel: null,
    subwayStations: [],
    lowHpPulse: false,
    playerX: 0,
    playerZ: 0,
    endRun: null,
  };
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<MumbaiWorldEngine | null>(null);

  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQualityPreset>(() =>
    loadSavedGraphicsQuality(),
  );
  const graphicsQualityRef = useRef<GraphicsQualityPreset>(graphicsQuality);
  graphicsQualityRef.current = graphicsQuality;

  const [hud, setHud] = useState<HudSnapshot>(() => createInitialHud(graphicsQuality));
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [subwayStationId, setSubwayStationId] = useState<string | null>(null);
  const missionsOpenRef = useRef(false);
  const subwayOpenRef = useRef(false);
  missionsOpenRef.current = missionsOpen;
  subwayOpenRef.current = subwayStationId !== null;

  // Mount Three.js engine after first paint so the loading screen renders smoothly before procedural city build
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    let engine: MumbaiWorldEngine | null = null;
    document.body.dataset.state = 'title';

    const onKeyM = (e: KeyboardEvent) => {
      if (!engine) return;
      if (e.code === 'KeyM' && engine.getSnapshot().gameState === 'playing') {
        setSubwayStationId(null);
        setMissionsOpen((prev) => !prev);
      } else if (e.code === 'Escape') {
        if (subwayOpenRef.current) {
          setSubwayStationId(null);
        } else if (missionsOpenRef.current) {
          setMissionsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyM);

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          engine = new MumbaiWorldEngine(
            mount,
            (snap) => {
              setHud(snap);
            },
            () => missionsOpenRef.current || subwayOpenRef.current,
            (stationId) => {
              setMissionsOpen(false);
              setSubwayStationId(stationId);
            },
            graphicsQualityRef.current,
          );
          engineRef.current = engine;
          setIsInitializing(false);

          const params = new URLSearchParams(window.location.search);
          if (params.get('autostart') === '1') {
            engine.start();
            const qx = Number(params.get('x'));
            const qz = Number(params.get('z'));
            const qh = params.get('h') !== null ? Number(params.get('h')) : Math.PI;
            if (Number.isFinite(qx) && Number.isFinite(qz)) {
              engine.teleportTo(qx, qz, Number.isFinite(qh) ? qh : Math.PI);
            }
          }
        } catch (err) {
          console.error('WebGL initialization failed:', err);
          setInitError(
            'WebGL graphics context could not be initialized. Please enable hardware acceleration or try a modern desktop browser.',
          );
          setIsInitializing(false);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('keydown', onKeyM);
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Wire minimap canvas ref whenever HUD mounts/unmounts
  useEffect(() => {
    engineRef.current?.setMinimapCanvas(hud.gameState === 'playing' ? minimapRef.current : null);
  }, [hud.gameState]);

  const handleChangeGraphicsQuality = useCallback((preset: GraphicsQualityPreset) => {
    setGraphicsQuality(preset);
    saveGraphicsQuality(preset);
    setHud((prev) => ({ ...prev, graphicsQuality: preset }));
    engineRef.current?.setGraphicsQuality(preset);
  }, []);

  const handleStart = useCallback(() => {
    setMissionsOpen(false);
    setSubwayStationId(null);
    engineRef.current?.start();
  }, []);

  const handleQuickMission = useCallback(() => {
    setMissionsOpen(false);
    setSubwayStationId(null);
    engineRef.current?.start();
    engineRef.current?.acceptMission(MISSIONS[0].id);
  }, []);

  const handlePause = useCallback(() => {
    setMissionsOpen(false);
    setSubwayStationId(null);
    engineRef.current?.pause();
  }, []);

  const handleResume = useCallback(() => {
    setMissionsOpen(false);
    setSubwayStationId(null);
    engineRef.current?.resume();
  }, []);

  const handleRestart = useCallback(() => {
    setMissionsOpen(false);
    setSubwayStationId(null);
    engineRef.current?.restart();
  }, []);

  const handleReturnTitle = useCallback(() => {
    setMissionsOpen(false);
    setSubwayStationId(null);
    engineRef.current?.returnToTitle();
  }, []);

  const handleContinueFreeRoam = useCallback(() => {
    setMissionsOpen(false);
    setSubwayStationId(null);
    engineRef.current?.continueFreeRoam();
  }, []);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#16071f]">
      {/* Dedicated isolated WebGL canvas host */}
      <div
        ref={canvasMountRef}
        data-testid="nyc-canvas-mount"
        className="fixed inset-0 w-full h-full"
      />

      {/* Smooth city initialization overlay shown during the 1-2s procedural NYC build */}
      {isInitializing && (
        <div
          data-testid="nyc-loading-overlay"
          className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6 text-center"
          style={{
            background:
              'radial-gradient(circle at 50% 35%, rgba(74, 21, 75, 0.96) 0%, rgba(22, 7, 31, 0.99) 72%)',
          }}
        >
          <div className="text-4xl font-vice tracking-[0.14em] uppercase text-[#fff1e6]">
            New York Vice
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-display uppercase tracking-[0.22em] text-[#fde047]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#ff4d8d] animate-pulse" />
            <span>Building Five Boroughs...</span>
          </div>
          <div className="mt-5 w-60 h-1.5 rounded-sm bg-[#2b123d] overflow-hidden border border-[#ff7ab6]/30">
            <div className="h-full w-2/3 bg-[#ff4d8d] animate-pulse" />
          </div>
          <p className="mt-3 text-[11px] font-mono-num text-[#f8d7e8]/75">
            Manhattan · Brooklyn · Queens · Elevated Subway · Hudson Harbor
          </p>
        </div>
      )}

      {/* Friendly WebGL-unavailable fallback */}
      {!isInitializing && initError && (
        <div
          data-testid="nyc-webgl-error"
          role="alert"
          className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-[#16071f]"
        >
          <div className="hud-panel rounded-lg max-w-md w-full p-7 text-center border border-[#ff4d8d]/45">
            <h1 className="text-2xl font-display font-bold uppercase tracking-wider text-[#fff8eb]">
              3D Graphics Unavailable
            </h1>
            <p className="mt-3 text-sm text-[#e3cfb2] leading-relaxed">{initError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-6 py-2.5 rounded bg-[#ff4d8d] hover:bg-[#ff6aa0] text-[#16071f] font-display font-bold uppercase tracking-wider text-xs cursor-pointer transition-colors"
            >
              Retry Launch
            </button>
          </div>
        </div>
      )}

      {!isInitializing && !initError && hud.gameState === 'title' && (
        <TitleScreen
          graphicsQuality={graphicsQuality}
          onChangeGraphicsQuality={handleChangeGraphicsQuality}
          onStart={handleStart}
          onQuickMission={handleQuickMission}
        />
      )}

      {!isInitializing && !initError && hud.gameState === 'playing' && (
        <GameHud
          hud={hud}
          minimapRef={minimapRef}
          onOpenMissions={() => {
            setSubwayStationId(null);
            setMissionsOpen(true);
          }}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onCycleRadio={() => engineRef.current?.cycleRadioStation()}
          onCycleCamera={() => engineRef.current?.cycleCamera()}
          onCycleWeather={() => engineRef.current?.cycleWeather()}
          onCycleOutfit={() => engineRef.current?.cyclePlayerOutfit()}
          onPause={handlePause}
          onInteract={() => engineRef.current?.interact()}
          onJoinParkSport={() => engineRef.current?.joinNearbyParkSport()}
          onSpectateParkSport={() => engineRef.current?.spectateNearbyParkSport()}
          onSwingParkSport={() => engineRef.current?.triggerParkSportSwingOrShoot()}
          onLeaveParkSport={() => engineRef.current?.leaveParkSport(false)}
        />
      )}

      {hud.gameState === 'playing' && missionsOpen && (
        <MissionPhoneModal
          activeMissionId={hud.activeMission?.id ?? null}
          completedMissionIds={hud.completedMissionIds}
          onAcceptMission={(id) => engineRef.current?.acceptMission(id)}
          onAbandonMission={() => engineRef.current?.abandonMission()}
          onClose={() => setMissionsOpen(false)}
        />
      )}

      {hud.gameState === 'playing' && subwayStationId && (
        <SubwayModal
          currentStationId={subwayStationId}
          stations={hud.subwayStations}
          cash={hud.cash}
          wantedStars={hud.wantedStars}
          onSelectDestination={(destId) => {
            if (engineRef.current?.boardSubwayTo(destId)) {
              setSubwayStationId(null);
            }
          }}
          onClose={() => setSubwayStationId(null)}
        />
      )}

      <StatusModal
        gameState={hud.gameState}
        endRun={hud.endRun}
        cash={hud.cash}
        completedCount={hud.completedMissionIds.length}
        graphicsQuality={graphicsQuality}
        onChangeGraphicsQuality={handleChangeGraphicsQuality}
        onResume={handleResume}
        onRestart={handleRestart}
        onReturnTitle={handleReturnTitle}
        onContinueFreeRoam={handleContinueFreeRoam}
      />
    </main>
  );
}
