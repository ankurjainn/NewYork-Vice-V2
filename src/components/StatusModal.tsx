import React from 'react';
import {
  GRAPHICS_QUALITY_ORDER,
  GRAPHICS_QUALITY_SPECS,
  type GraphicsQualityPreset,
} from '../game/graphicsQuality';
import { MISSIONS } from '../game/missions';
import type { EndRunSnapshot, GameState } from '../game/types';

interface StatusModalProps {
  gameState: GameState;
  endRun: EndRunSnapshot | null;
  cash: number;
  completedCount: number;
  graphicsQuality: GraphicsQualityPreset;
  onChangeGraphicsQuality: (preset: GraphicsQualityPreset) => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onContinueFreeRoam: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  gameState,
  endRun,
  cash,
  completedCount,
  graphicsQuality,
  onChangeGraphicsQuality,
  onResume,
  onRestart,
  onReturnTitle,
  onContinueFreeRoam,
}) => {
  if (gameState === 'paused') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
        className="fixed inset-0 z-30 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(12, 8, 6, 0.72)' }}
      >
        <div className="hud-panel rounded-lg w-full max-w-md p-7 text-center">
          <h2 className="text-3xl font-display font-bold uppercase tracking-wider text-[#fff8eb]">
            Paused
          </h2>
          <p className="text-sm text-[#cbb89d] mt-1">New York streets are holding for your return.</p>

          <div className="mt-5 grid grid-cols-2 gap-3 text-left">
            <div className="p-3 rounded bg-[#231b16] border border-[#fff0d6]/12">
              <div className="text-[11px] uppercase tracking-wider text-[#cbb89d]">Cash</div>
              <div className="text-lg font-mono-num font-bold text-[#f5b942] mt-0.5">
                ${cash.toLocaleString('en-US')}
              </div>
            </div>
            <div className="p-3 rounded bg-[#231b16] border border-[#fff0d6]/12">
              <div className="text-[11px] uppercase tracking-wider text-[#cbb89d]">Contracts</div>
              <div className="text-lg font-mono-num font-bold text-[#fff8eb] mt-0.5">
                {completedCount} / {MISSIONS.length}
              </div>
            </div>
          </div>

          <div
            data-testid="pause-graphics-selector"
            className="mt-4 p-3 rounded bg-[#231b16] border border-[#fff0d6]/12 text-left"
          >
            <div className="mb-2">
              <div className="text-[11px] font-display uppercase tracking-wider text-[#f5b942] whitespace-nowrap">
                Graphics Quality
              </div>
              <div className="text-[11px] font-mono-num text-[#cbb89d] mt-0.5">
                {GRAPHICS_QUALITY_SPECS[graphicsQuality].summary}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Graphics Quality">
              {GRAPHICS_QUALITY_ORDER.map((preset) => {
                const spec = GRAPHICS_QUALITY_SPECS[preset];
                const selected = preset === graphicsQuality;
                return (
                  <button
                    key={preset}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    data-testid={`pause-quality-${preset}`}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onChangeGraphicsQuality(preset);
                    }}
                    className={`py-2 px-1.5 rounded text-xs font-display uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                      selected
                        ? 'bg-[#f59e0b] text-[#160f0b] font-bold'
                        : 'bg-[#1a1410] hover:bg-[#2f251f] text-[#e8d9c4] border border-[#fff0d6]/15'
                    }`}
                  >
                    {spec.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onResume();
              }}
              className="w-full py-3 rounded bg-[#f59e0b] hover:bg-[#fbbf24] text-[#160f0b] font-display font-bold uppercase tracking-wider text-sm cursor-pointer transition-colors"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className="w-full py-2.5 rounded bg-[#2c221c] hover:bg-[#3a2d25] text-[#fff7eb] font-display font-semibold uppercase tracking-wider text-xs cursor-pointer transition-colors"
            >
              Restart Session
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onReturnTitle();
              }}
              className="w-full py-2.5 rounded border border-[#fff0d6]/20 hover:border-[#f59e0b]/60 text-[#d8c5a8] font-display font-semibold uppercase tracking-wider text-xs cursor-pointer transition-colors"
            >
              Return to Title
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover' && endRun) {
    const isVictory = endRun.reason === 'victory';
    const isBusted = endRun.reason === 'busted';
    const heading = isVictory ? 'King of New York' : isBusted ? 'Busted' : 'Wasted';
    const subtitle = isVictory
      ? `All ${MISSIONS.length} New York street contracts completed. The Five Boroughs belong to you.`
      : isBusted
        ? 'NYPD boxed you in. Shake the heat before slowing down next time.'
        : 'You took too much damage on the avenues. Stop by a hot dog or halal cart to top up health.';

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="fixed inset-0 z-30 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(12, 8, 6, 0.78)' }}
      >
        <div className="hud-panel rounded-lg w-full max-w-md p-7 text-center">
          <h2
            className="text-4xl font-display font-bold uppercase tracking-wider"
            style={{ color: isVictory ? '#f5b942' : '#f87171' }}
          >
            {heading}
          </h2>
          <p className="text-sm text-[#d6c5ab] mt-2 leading-relaxed">{subtitle}</p>

          <div className="mt-5 grid grid-cols-3 gap-2.5 text-left">
            <div className="p-3 rounded bg-[#231b16] border border-[#fff0d6]/12">
              <div className="text-[10px] uppercase tracking-wider text-[#cbb89d]">Cash Earned</div>
              <div className="text-base font-mono-num font-bold text-[#f5b942] mt-0.5">
                ${endRun.cash.toLocaleString('en-US')}
              </div>
            </div>
            <div className="p-3 rounded bg-[#231b16] border border-[#fff0d6]/12">
              <div className="text-[10px] uppercase tracking-wider text-[#cbb89d]">Contracts</div>
              <div className="text-base font-mono-num font-bold text-[#fff8eb] mt-0.5">
                {endRun.missionsCompleted}/{endRun.totalMissions}
              </div>
            </div>
            <div className="p-3 rounded bg-[#231b16] border border-[#fff0d6]/12">
              <div className="text-[10px] uppercase tracking-wider text-[#cbb89d]">Top Speed</div>
              <div className="text-base font-mono-num font-bold text-[#fff8eb] mt-0.5">
                {endRun.topSpeedKmh} km/h
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {isVictory && (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onContinueFreeRoam();
                }}
                className="w-full py-3 rounded bg-[#f59e0b] hover:bg-[#fbbf24] text-[#160f0b] font-display font-bold uppercase tracking-wider text-sm cursor-pointer transition-colors"
              >
                Keep Exploring New York
              </button>
            )}
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className={`w-full py-3 rounded font-display font-bold uppercase tracking-wider text-sm cursor-pointer transition-colors ${
                isVictory
                  ? 'bg-[#2c221c] hover:bg-[#3a2d25] text-[#fff7eb]'
                  : 'bg-[#f59e0b] hover:bg-[#fbbf24] text-[#160f0b]'
              }`}
            >
              {isVictory ? 'Play Again' : 'Try Again'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onReturnTitle();
              }}
              className="w-full py-2.5 rounded border border-[#fff0d6]/20 hover:border-[#f59e0b]/60 text-[#d8c5a8] font-display font-semibold uppercase tracking-wider text-xs cursor-pointer transition-colors"
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
