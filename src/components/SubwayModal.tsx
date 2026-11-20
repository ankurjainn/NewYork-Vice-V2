import React from 'react';
import { SUBWAY_FARE_USD, type SubwayStationHudInfo } from '../game/subwaySystem';

interface SubwayModalProps {
  currentStationId: string;
  stations: SubwayStationHudInfo[];
  cash: number;
  wantedStars: number;
  onSelectDestination: (stationId: string) => void;
  onClose: () => void;
}

const BOROUGH_ORDER: Array<'Manhattan' | 'Brooklyn' | 'Queens'> = ['Manhattan', 'Brooklyn', 'Queens'];

export const SubwayModal: React.FC<SubwayModalProps> = ({
  currentStationId,
  stations,
  cash,
  wantedStars,
  onSelectDestination,
  onClose,
}) => {
  const currentStation = stations.find((s) => s.id === currentStationId);
  const canAfford = cash >= SUBWAY_FARE_USD;
  const blockedByPolice = wantedStars >= 3;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="MTA Elevated NYC Subway Transit"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10, 8, 7, 0.72)' }}
    >
      <div className="hud-panel rounded-lg w-full max-w-3xl overflow-hidden text-[#fff7eb] border border-[#2dd4bf]/35">
        {/* Authentic NYC MTA Black & White Header Strip */}
        <div className="px-6 py-4 bg-[#111214] border-b border-white/15 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              {currentStation && (
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
                  style={{ backgroundColor: currentStation.lineColor }}
                >
                  {currentStation.lineBadge}
                </span>
              )}
              <h2 className="text-lg font-display font-bold tracking-wider uppercase text-white">
                MTA Elevated Subway · {currentStation?.name ?? 'NYC Transit'}
              </h2>
            </div>
            <p className="text-xs text-[#b8c1cc] mt-1">
              Five-Borough Elevated Express · Standard Fare{' '}
              <span className="font-mono-num text-[#2dd4bf] font-bold">${SUBWAY_FARE_USD}</span> ·{' '}
              {currentStation?.trainDocked
                ? 'Train at platform now!'
                : `Next elevated train arriving in ${currentStation?.nextTrainEtaSec ?? 8}s`}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onClose();
            }}
            className="px-3.5 py-2 rounded bg-[#27272a] hover:bg-[#3f3f46] text-xs font-display uppercase tracking-wider text-white cursor-pointer whitespace-nowrap"
          >
            Exit [ESC]
          </button>
        </div>

        {blockedByPolice && (
          <div className="px-6 py-2.5 bg-[#450a0a] border-b border-[#ef4444]/40 text-xs text-[#fecaca]">
            MTA Turnstiles locked during 3+ Star NYPD lockdown — shake police heat below 3 stars to board!
          </div>
        )}

        <div className="p-5 flex flex-col gap-4 max-h-[68vh] overflow-y-auto bg-[#161311]">
          {BOROUGH_ORDER.map((borough) => {
            const boroughStations = stations.filter((s) => s.borough === borough);
            if (boroughStations.length === 0) return null;
            return (
              <div key={borough}>
                <div className="text-[11px] font-display uppercase tracking-[0.18em] text-[#f5b942] mb-2">
                  {borough}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {boroughStations.map((st) => {
                    const isHere = st.id === currentStationId;
                    const disabled = isHere || !canAfford || blockedByPolice;
                    return (
                      <div
                        key={st.id}
                        className="p-3.5 rounded border flex items-center justify-between gap-3"
                        style={{
                          backgroundColor: isHere ? 'rgba(45, 212, 191, 0.12)' : 'rgba(26, 22, 19, 0.94)',
                          borderColor: isHere ? 'rgba(45, 212, 191, 0.55)' : 'rgba(255, 240, 214, 0.14)',
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
                            style={{ backgroundColor: st.lineColor }}
                          >
                            {st.lineBadge}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-display font-bold text-[#fff8eb] truncate">
                              {st.name}
                            </div>
                            <div className="text-[11px] text-[#cbb89d] font-mono-num mt-0.5">
                              {isHere
                                ? 'Current Platform'
                                : st.trainDocked
                                  ? 'Express docked · Ready'
                                  : `Next train ${st.nextTrainEtaSec}s`}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={disabled}
                          data-testid={`subway-dest-${st.id}`}
                          onClick={(e) => {
                            e.currentTarget.blur();
                            onSelectDestination(st.id);
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-display font-bold uppercase tracking-wider whitespace-nowrap shrink-0 transition-colors ${
                            isHere
                              ? 'bg-[#1f2937] text-[#94a3b8] cursor-default'
                              : disabled
                                ? 'bg-[#2a201a] text-[#6b5d50] cursor-not-allowed'
                                : 'bg-[#2dd4bf] hover:bg-[#5eead4] text-[#0b1715] cursor-pointer'
                          }`}
                        >
                          {isHere ? 'Here' : `Ride $${SUBWAY_FARE_USD}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
