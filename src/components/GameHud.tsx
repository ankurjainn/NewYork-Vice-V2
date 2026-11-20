import React, { useEffect, useRef, useState } from 'react';
import { MISSIONS } from '../game/missions';
import type { HudSnapshot } from '../game/types';

interface GameHudProps {
  hud: HudSnapshot;
  minimapRef: React.RefObject<HTMLCanvasElement | null>;
  onOpenMissions: () => void;
  onToggleMute: () => void;
  onCycleRadio: () => void;
  onCycleCamera: () => void;
  onCycleWeather: () => void;
  onCycleOutfit: () => void;
  onPause: () => void;
  onInteract: () => void;
  onJoinParkSport: () => void;
  onSpectateParkSport: () => void;
  onSwingParkSport: () => void;
  onLeaveParkSport: () => void;
}

const StarIcon: React.FC<{ filled: boolean; escaping: boolean }> = ({ filled, escaping }) => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      d="M12 2.4l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 16.96 6.3 19.96l1.09-6.35-4.62-4.5 6.38-.93L12 2.4z"
      fill={filled ? (escaping ? '#f59e0b' : '#ef4444') : 'rgba(20, 15, 13, 0.72)'}
      stroke={filled ? '#1a0e0a' : 'rgba(255, 240, 214, 0.35)'}
      strokeWidth="1.8"
    />
  </svg>
);

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  minimapRef,
  onOpenMissions,
  onToggleMute,
  onCycleRadio,
  onCycleCamera,
  onCycleWeather,
  onCycleOutfit,
  onPause,
  onInteract,
  onJoinParkSport,
  onSpectateParkSport,
  onSwingParkSport,
  onLeaveParkSport,
}) => {
  // Delayed trailing ghost health bar for clear damage read
  const [ghostHp, setGhostHp] = useState(hud.hp);
  const ghostTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (hud.hp < ghostHp) {
      if (ghostTimerRef.current) window.clearTimeout(ghostTimerRef.current);
      ghostTimerRef.current = window.setTimeout(() => {
        setGhostHp(hud.hp);
      }, 360);
    } else {
      setGhostHp(hud.hp);
    }
    return () => {
      if (ghostTimerRef.current) window.clearTimeout(ghostTimerRef.current);
    };
  }, [hud.hp, ghostHp]);

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const ghostPct = Math.max(hpPct, Math.min(100, (ghostHp / Math.max(1, hud.maxHp)) * 100));
  const energyPct = hud.inVehicle ? hud.boost : hud.stamina;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Peripheral critical low HP vignette & crash damage flash */}
      {(hud.lowHpPulse || hud.damageFlash > 0.05) && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-100"
          style={{
            boxShadow:
              hud.damageFlash > 0.05
                ? `inset 0 0 135px rgba(239, 68, 68, ${Math.min(0.72, 0.25 + hud.damageFlash * 0.55)})`
                : 'inset 0 0 110px rgba(220, 38, 38, 0.58)',
          }}
        />
      )}

      {/* TOP-LEFT: Active Mission Objective + Dispatch Button */}
      <div className="fixed top-4 left-4 flex flex-col gap-2 max-w-[440px]">
        <div className="hud-panel rounded px-3.5 py-2.5 flex items-center justify-between gap-4 pointer-events-auto">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] uppercase tracking-[0.14em] text-[#f5b942] font-display leading-tight mb-1">
              <span className="truncate">
                {hud.activeMission ? `Mission · ${hud.activeMission.title}` : `New York · ${hud.district}`}
              </span>
              {hud.activeMission?.emotionTag && (
                <span className="text-[10px] text-[#38bdf8] tracking-[0.12em] shrink-0">
                  [{hud.activeMission.emotionTag}]
                </span>
              )}
            </div>
            <div className="text-sm font-medium text-[#fff7eb] leading-snug">
              {hud.activeMission
                ? hud.activeMission.stepLabel
                : `${hud.completedMissionIds.length}/${MISSIONS.length} contracts cleared · Press [M] for NYC Dispatch`}
            </div>
            {hud.activeMission && (
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#e3cfb2] font-mono-num">
                {hud.activeMission.progressText && (
                  <span data-testid="hud-mission-progress" className="text-[#2dd4bf] font-bold">
                    {hud.activeMission.progressText}
                  </span>
                )}
                {hud.activeMission.distanceMeters > 0 && (
                  <span>{hud.activeMission.distanceMeters}m away</span>
                )}
                {hud.activeMission.timeRemaining > 0 && (
                  <span className={hud.activeMission.timeRemaining <= 15 ? 'text-[#f87171] font-bold' : ''}>
                    {hud.activeMission.timeRemaining}s left
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenMissions();
            }}
            aria-label="Open New York Dispatch"
            className="px-3 py-2 rounded bg-[#f59e0b] hover:bg-[#fbbf24] text-[#160f0b] font-display font-bold text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0 transition-colors"
          >
            Jobs [M]
          </button>
        </div>

        {/* Spontaneous Open-World Street Event Card */}
        {hud.activeStreetEvent && !hud.activeMission && !hud.subwayRidingLabel && (
          <div
            data-testid="street-event-hud"
            className="hud-panel rounded px-3.5 py-2.5 border pointer-events-none"
            style={{
              borderColor:
                hud.activeStreetEvent.kind === 'purse_snatcher'
                  ? 'rgba(239, 68, 68, 0.65)'
                  : hud.activeStreetEvent.kind === 'street_race'
                    ? 'rgba(56, 189, 248, 0.65)'
                    : 'rgba(34, 197, 94, 0.65)',
            }}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-display uppercase tracking-[0.14em] leading-tight">
              <span
                style={{
                  color:
                    hud.activeStreetEvent.kind === 'purse_snatcher'
                      ? '#f87171'
                      : hud.activeStreetEvent.kind === 'street_race'
                        ? '#38bdf8'
                        : '#4ade80',
                }}
              >
                Street Event · {hud.activeStreetEvent.title}
              </span>
              <span className="font-mono-num text-[#fbbf24] font-bold shrink-0">
                +${hud.activeStreetEvent.reward.toLocaleString('en-US')}
              </span>
            </div>
            <div className="text-xs text-[#fff7eb] mt-1 leading-snug">
              {hud.activeStreetEvent.subtitle}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-mono-num text-[#e3cfb2]">
              {hud.activeStreetEvent.progressText && (
                <span className="text-[#2dd4bf] font-bold">{hud.activeStreetEvent.progressText}</span>
              )}
              <span>{hud.activeStreetEvent.distanceMeters}m away</span>
              <span className={hud.activeStreetEvent.timeRemaining <= 10 ? 'text-[#f87171] font-bold' : ''}>
                {hud.activeStreetEvent.timeRemaining}s left
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ELEVATED SUBWAY EXPRESS RIDE BANNER */}
      {hud.subwayRidingLabel && (
        <div
          data-testid="subway-ride-banner"
          className="fixed top-20 left-1/2 -translate-x-1/2 pointer-events-none"
        >
          <div className="hud-panel rounded px-5 py-2.5 border border-[#2dd4bf]/65 text-center">
            <div className="text-[10px] font-display uppercase tracking-[0.2em] text-[#2dd4bf]">
              MTA Elevated NYC Subway Express
            </div>
            <div className="text-sm font-display font-bold text-[#fff8eb] mt-0.5 whitespace-nowrap">
              {hud.subwayRidingLabel}
            </div>
          </div>
        </div>
      )}

      {/* TOP-RIGHT: Wanted Stars, Cash (USD), and Utility Icon Controls */}
      <div className="fixed top-4 right-4 flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Cash Readout */}
          <div className="hud-panel rounded px-3.5 py-1.5 flex items-baseline gap-1.5">
            <span className="text-[11px] uppercase tracking-widest text-[#f5b942] font-display">USD</span>
            <span
              data-testid="hud-cash"
              className="text-xl font-bold font-mono-num text-[#fff7eb] leading-none"
            >
              ${hud.cash.toLocaleString('en-US')}
            </span>
          </div>

          {/* Utility Square SVG Buttons */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={hud.muted ? 'Unmute Audio' : 'Mute Audio'}
            title="Toggle Audio [N]"
            className="w-9 h-9 hud-panel-subtle hover:border-[#f59e0b] rounded flex items-center justify-center text-[#fff7eb] cursor-pointer transition-colors"
          >
            {hud.muted ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 010 7.07" />
                <path d="M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleRadio();
            }}
            data-testid="hud-radio-btn"
            aria-label={`Radio: ${hud.radioStationLabel}. Press to switch radio station`}
            title={`Radio: ${hud.radioStationLabel} [R]`}
            className={`h-9 px-2.5 hud-panel-subtle hover:border-[#f472b6] rounded flex items-center gap-1.5 cursor-pointer transition-colors ${
              hud.radioPlaying && !hud.muted
                ? 'border-[#f472b6]/70 text-[#fff7eb]'
                : hud.radioStationId === 'off'
                  ? 'text-[#9e8c78]'
                  : 'text-[#fff7eb]'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 shrink-0"
              style={{ color: hud.radioStationId === 'off' ? '#94a3b8' : hud.radioAccentHex }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <span
              data-testid="hud-radio-label"
              className="text-[11px] font-display uppercase tracking-wider whitespace-nowrap"
            >
              {hud.radioStationShortLabel}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleWeather();
            }}
            data-testid="hud-weather-btn"
            aria-label={`Weather: ${hud.weatherLabel}. Press to cycle weather`}
            title={`Weather: ${hud.weatherLabel} [T]`}
            className="h-9 px-2.5 hud-panel-subtle hover:border-[#f59e0b] rounded flex items-center gap-1.5 text-[#fff7eb] cursor-pointer transition-colors"
          >
            {hud.weatherMode === 'clear_sunset' ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#fbbf24] shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : hud.weatherMode === 'light_drizzle' ? (
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#7dd3fc] shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 13a4 4 0 00-7.75-1.35A3.5 3.5 0 006.5 18H16a3 3 0 000-6z" />
                <path d="M8 21l1-2M13 21l1-2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#38bdf8] shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.5 16H7a4 4 0 01-.5-7.97A5.5 5.5 0 0117 6.5a4.5 4.5 0 01.5 9.5z" />
                <path d="M8 19l-1 3M12 19l-1 3M16 19l-1 3" />
              </svg>
            )}
            <span
              data-testid="hud-weather-label"
              className="text-[11px] font-display uppercase tracking-wider whitespace-nowrap"
            >
              {hud.weatherLabel}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleOutfit();
            }}
            data-testid="hud-outfit-btn"
            aria-label={`Outfit: ${hud.playerOutfitLabel}. Press to switch outfit`}
            title={`Wardrobe: ${hud.playerOutfitLabel} [O]`}
            className="h-9 px-2.5 hud-panel-subtle hover:border-[#f59e0b] rounded flex items-center gap-1.5 text-[#fff7eb] cursor-pointer transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#f43f5e] shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
            </svg>
            <span
              data-testid="hud-outfit-label"
              className="text-[11px] font-display uppercase tracking-wider whitespace-nowrap"
            >
              {hud.playerOutfitLabel}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleCamera();
            }}
            aria-label="Switch Camera View"
            title={`Camera: ${hud.cameraMode} [C]`}
            className="w-9 h-9 hud-panel-subtle hover:border-[#f59e0b] rounded flex items-center justify-center text-[#fff7eb] cursor-pointer transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause Game"
            title="Pause [P]"
            className="w-9 h-9 hud-panel-subtle hover:border-[#f59e0b] rounded flex items-center justify-center text-[#fff7eb] cursor-pointer transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>
        </div>

        {/* Wanted Heat Stars & Escape Progress */}
        <div
          className="flex flex-col items-end gap-1.5 px-2.5 py-1.5 rounded bg-[#140f0d]/85 border border-[#fff0d6]/15"
          aria-label={`Wanted level ${hud.wantedStars} of 5`}
        >
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <StarIcon
                key={n}
                filled={n <= hud.wantedStars}
                escaping={hud.wantedCooldownRatio > 0.12}
              />
            ))}
          </div>
          {hud.wantedStars > 0 && hud.wantedCooldownRatio > 0.02 && (
            <div data-testid="hud-escape-bar" className="w-full min-w-[132px]">
              <div className="flex items-center justify-between text-[10px] font-display uppercase tracking-wider text-[#2dd4bf] mb-0.5">
                <span>Escaping NYPD</span>
                <span className="font-mono-num">{Math.round(hud.wantedCooldownRatio * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#2a201b] rounded-sm overflow-hidden">
                <div
                  className="h-full bg-[#2dd4bf] transition-all duration-100"
                  style={{ width: `${Math.max(4, Math.min(100, Math.round(hud.wantedCooldownRatio * 100)))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIVE PARK SPORTS OVERLAY (Pickup Cricket / Streetball Scoreboard + Timing Bar) */}
      {hud.activeParkSport && (
        <div
          data-testid="park-sport-hud"
          className="fixed top-20 left-1/2 -translate-x-1/2 w-[92vw] max-w-md pointer-events-auto"
        >
          <div className="hud-panel rounded-md px-4 py-3 border border-[#f59e0b]/60">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-display uppercase tracking-[0.18em] text-[#4ade80]">
                  {hud.activeParkSport.mode === 'joined' ? 'PLAYING LIVE' : 'SPECTATING LIVE'} ·{' '}
                  {hud.activeParkSport.sport === 'cricket' ? 'PICKUP CRICKET' : 'NYC STREETBALL'}
                </div>
                <div className="text-sm font-display font-bold text-[#fff8eb] truncate">
                  {hud.activeParkSport.venueName}
                </div>
              </div>
              <div className="text-right font-mono-num shrink-0">
                <div className="text-xl font-bold text-[#fbbf24] leading-none">
                  {hud.activeParkSport.sport === 'cricket'
                    ? `${hud.activeParkSport.scoreRuns}/${hud.activeParkSport.wickets}`
                    : `${hud.activeParkSport.scoreRuns} PTS`}
                </div>
                <div className="text-[10px] text-[#cbb89d] mt-0.5">
                  {hud.activeParkSport.sport === 'cricket' ? 'BALL' : 'SHOT'}{' '}
                  {hud.activeParkSport.ballsBowled}/{hud.activeParkSport.maxBalls} · PRIZE $
                  {hud.activeParkSport.potentialPrize}
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-display uppercase tracking-wider text-[#e5d2b5]">
              <span>
                {hud.activeParkSport.teamAName} vs {hud.activeParkSport.teamBName}
              </span>
              <span className="text-[#fbbf24] font-bold">{hud.activeParkSport.lastOutcome}</span>
            </div>

            {hud.activeParkSport.mode === 'joined' && (
              <div className="mt-2.5">
                <div className="relative h-3.5 rounded bg-[#231b16] border border-[#fff0d6]/20 overflow-hidden">
                  {/* Gold sweet-spot zone centered at 78% */}
                  <div
                    className="absolute inset-y-0 bg-[#f59e0b]/45 border-x border-[#fbbf24]"
                    style={{ left: '68%', width: '20%' }}
                  />
                  {/* Perfect center line at 78% */}
                  <div className="absolute inset-y-0 w-0.5 bg-[#fef08a]" style={{ left: '78%' }} />
                  {/* Moving delivery/shot timing needle */}
                  <div
                    className="absolute inset-y-0 w-2 bg-[#4ade80] shadow"
                    style={{ left: `calc(${Math.round(hud.activeParkSport.timingValue * 100)}% - 4px)` }}
                  />
                </div>
              </div>
            )}

            <p className="mt-2 text-xs text-[#e3cfb2] leading-snug">{hud.activeParkSport.commentary}</p>

            <div className="mt-2.5 flex items-center justify-between gap-2">
              {hud.activeParkSport.mode === 'joined' ? (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSwingParkSport();
                  }}
                  className="flex-1 py-1.5 px-3 rounded bg-[#f59e0b] hover:bg-[#fbbf24] text-[#160f0b] font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  {hud.activeParkSport.sport === 'cricket' ? 'Swing Bat [SPACE]' : 'Shoot Ball [SPACE]'}
                </button>
              ) : (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onJoinParkSport();
                  }}
                  className="flex-1 py-1.5 px-3 rounded bg-[#22c55e] hover:bg-[#4ade80] text-[#0b1610] font-display font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Join Match [F]
                </button>
              )}

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onLeaveParkSport();
                }}
                className="py-1.5 px-3 rounded bg-[#2a201a] hover:bg-[#3a2d25] border border-[#fff0d6]/20 text-[#fff7eb] font-display font-semibold text-xs uppercase tracking-wider cursor-pointer transition-colors"
              >
                Leave [ESC]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM-LEFT: Floating GTA-Style Heading-Up Rotating GPS Radar + Health & Stamina/Boost Bars */}
      <div className="fixed bottom-4 left-4 flex flex-col items-center gap-1.5">
        {hud.radioPlaying && !hud.muted && (
          <div
            data-testid="hud-radio-now-playing"
            className="px-2.5 py-0.5 rounded bg-[#140f0c]/92 border text-[10px] font-display uppercase tracking-[0.12em] whitespace-nowrap flex items-center gap-1.5 shadow"
            style={{ borderColor: `${hud.radioAccentHex}99`, color: hud.radioAccentHex }}
          >
            <span className="inline-flex items-end gap-[2px] h-2.5" aria-hidden="true">
              <span className="w-[2px] h-1.5 animate-pulse" style={{ backgroundColor: hud.radioAccentHex }} />
              <span className="w-[2px] h-2.5 animate-pulse" style={{ backgroundColor: hud.radioAccentHex }} />
              <span className="w-[2px] h-1 animate-pulse" style={{ backgroundColor: hud.radioAccentHex }} />
            </span>
            <span>{hud.radioStationShortLabel}</span>
          </div>
        )}

        {/* Floating Circular Heading-Up GPS Radar */}
        <div
          data-testid="nyc-radar-frame"
          data-music-playing={hud.radioPlaying && !hud.muted ? 'true' : 'false'}
          className="relative w-[170px] h-[170px] rounded-full p-1 bg-[#140f0c]/88 border border-[#f5b942]/45 shadow-[0_10px_28px_rgba(0,0,0,0.58)] flex items-center justify-center"
        >
          <canvas
            ref={minimapRef}
            width={162}
            height={162}
            data-testid="nyc-minimap"
            className="block w-[162px] h-[162px] rounded-full"
          />
        </div>

        <div className="hud-panel rounded px-2.5 py-2 w-[170px]">
          {/* Health Bar with trailing ghost damage bar & auto-regen state */}
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-display uppercase tracking-wider w-7 ${
                hud.hpRegenerating ? 'text-[#4ade80] font-bold' : 'text-[#e5d2b5]'
              }`}
            >
              {hud.hpRegenerating ? '+HP' : 'HP'}
            </span>
            <div className="relative flex-1 h-2 bg-[#2b221e] rounded-sm overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#f87171]/70 transition-all duration-300"
                style={{ width: `${ghostPct}%` }}
              />
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-100 ${
                  hud.hpRegenerating ? 'animate-pulse' : ''
                }`}
                style={{
                  width: `${hpPct}%`,
                  backgroundColor: hud.hpRegenerating
                    ? '#4ade80'
                    : hpPct <= 30
                      ? '#ef4444'
                      : '#22c55e',
                }}
              />
            </div>
            <span
              data-testid="hud-hp"
              className={`text-[11px] font-mono-num w-7 text-right ${
                hud.hpRegenerating ? 'text-[#4ade80] font-bold' : 'text-[#fff7eb]'
              }`}
            >
              {hud.hp}
            </span>
          </div>

          {/* Stamina (on foot) / Nitro Boost (driving) */}
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[10px] font-display uppercase tracking-wider text-[#f5b942] w-7">
              {hud.inVehicle ? 'NOS' : 'STM'}
            </span>
            <div className="relative flex-1 h-2 bg-[#2b221e] rounded-sm overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 transition-all duration-100"
                style={{
                  width: `${energyPct}%`,
                  backgroundColor: hud.inVehicle ? '#38bdf8' : '#f59e0b',
                }}
              />
            </div>
            <span className="text-[11px] font-mono-num text-[#fff7eb] w-7 text-right">{energyPct}</span>
          </div>
        </div>
      </div>

      {/* BOTTOM-RIGHT: Contextual Speedometer (Driving) OR District & Interaction Prompt (On-Foot) */}
      <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2">
        {hud.prompt && (
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                if (hud.prompt?.kind === 'sport') onJoinParkSport();
                else onInteract();
              }}
              className="hud-panel hover:border-[#fbbf24] rounded px-4 py-2.5 flex items-center gap-2.5 cursor-pointer transition-colors"
            >
              <span className="w-6 h-6 rounded bg-[#f59e0b] text-[#160f0b] font-display font-bold text-xs flex items-center justify-center">
                {hud.prompt.key}
              </span>
              <span className="text-sm font-semibold text-[#fff7eb] whitespace-nowrap">
                {hud.prompt.label}
              </span>
            </button>

            {hud.prompt.secondaryKey && hud.prompt.secondaryLabel && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSpectateParkSport();
                }}
                className="hud-panel-subtle hover:border-[#4ade80] rounded px-3.5 py-2.5 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span className="w-6 h-6 rounded bg-[#22c55e] text-[#0c1a12] font-display font-bold text-xs flex items-center justify-center">
                  {hud.prompt.secondaryKey}
                </span>
                <span className="text-sm font-semibold text-[#fff7eb] whitespace-nowrap">
                  {hud.prompt.secondaryLabel}
                </span>
              </button>
            )}
          </div>
        )}

        {hud.inVehicle ? (() => {
          const isBoat = hud.vehicleType === 'ferry' || hud.vehicleType === 'speedboat';
          return (
            <div className="hud-panel rounded px-4 py-3 min-w-[215px]">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-[#f5b942] font-display">
                    {hud.vehicleLabel}
                  </div>
                  <div className="text-[11px] text-[#cbb89d] mt-0.5">
                    {hud.isBoosting
                      ? isBoat
                        ? 'FULL THROTTLE'
                        : 'NITRO ACTIVE'
                      : hud.isDrifting && !isBoat
                        ? 'DRIFTING'
                        : hud.district}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    data-testid="hud-speed"
                    className="text-4xl font-display font-bold font-mono-num text-[#fff8eb] leading-none"
                  >
                    {hud.speedKmh}
                  </span>
                  <span className="ml-1 text-[11px] font-display uppercase text-[#cbb89d]">KM/H</span>
                </div>
              </div>

              {/* Vehicle / Vessel Hull Bar */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] font-display uppercase tracking-wider text-[#cbb89d]">Hull</span>
                <div className="flex-1 h-1.5 bg-[#2b221e] rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-[#f59e0b]"
                    style={{
                      width: `${Math.max(0, Math.min(100, (hud.vehicleHp / Math.max(1, hud.vehicleMaxHp)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono-num text-[#cbb89d]">
                  {isBoat ? '[E] Dock · [H] Foghorn' : '[E] Exit · [H] Horn'}
                </span>
              </div>
            </div>
          );
        })() : (
          <div className="hud-panel-subtle rounded px-3.5 py-2 text-right">
            <div className="text-xs font-display uppercase tracking-widest text-[#f5b942]">
              {hud.district}
            </div>
            <div className="text-[11px] text-[#d6c5ab] font-mono-num mt-0.5">
              Space Jump · Shift Run · Q Punch · R Radio · F/V Sports
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM-CENTER: Street Dialogue / Mission Step Banner */}
      {hud.toast && (
        <div
          key={hud.toast.id}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-lg w-[90vw] pointer-events-none"
        >
          <div
            className="hud-panel rounded px-4 py-2.5 text-center"
            style={{
              borderColor:
                hud.toast.accent === 'red'
                  ? 'rgba(239, 68, 68, 0.7)'
                  : hud.toast.accent === 'teal'
                    ? 'rgba(45, 212, 191, 0.55)'
                    : 'rgba(245, 179, 66, 0.6)',
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.16em] font-display text-[#f5b942]">
              {hud.toast.speaker}
            </div>
            <div className="text-sm text-[#fff8eb] mt-0.5 leading-snug">{hud.toast.text}</div>
          </div>
        </div>
      )}
    </div>
  );
};
