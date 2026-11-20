import React, { useState } from 'react';
import { MISSIONS } from '../game/missions';

interface MissionPhoneModalProps {
  activeMissionId: string | null;
  completedMissionIds: string[];
  onAcceptMission: (id: string) => void;
  onAbandonMission: () => void;
  onClose: () => void;
}

type MissionFilter = 'all' | 'interactive' | 'classic';

export const MissionPhoneModal: React.FC<MissionPhoneModalProps> = ({
  activeMissionId,
  completedMissionIds,
  onAcceptMission,
  onAbandonMission,
  onClose,
}) => {
  const [filter, setFilter] = useState<MissionFilter>('all');

  const interactiveCount = MISSIONS.filter((m) => m.isInteractive).length;
  const classicCount = MISSIONS.length - interactiveCount;
  const visibleMissions = MISSIONS.filter((m) => {
    if (filter === 'interactive') return Boolean(m.isInteractive);
    if (filter === 'classic') return !m.isInteractive;
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New York Jobs Dispatch"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(12, 8, 6, 0.68)' }}
    >
      <div className="hud-panel rounded-lg w-full max-w-2xl overflow-hidden text-[#fff7eb]">
        <div className="px-6 py-4 border-b border-[#f5b942]/25 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-bold tracking-wider uppercase text-[#fff8eb]">
              New York Street Dispatch
            </h2>
            <p className="text-xs text-[#cbb89d] mt-0.5">
              {completedMissionIds.length} of {MISSIONS.length} contracts completed · Clear all {MISSIONS.length} to own the Five Boroughs
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onClose();
            }}
            className="px-3.5 py-2 rounded bg-[#2a201a] hover:bg-[#3a2d24] text-xs font-display uppercase tracking-wider text-[#fff7eb] cursor-pointer whitespace-nowrap"
          >
            Close [M]
          </button>
        </div>

        <div className="px-6 py-2.5 border-b border-[#fff0d6]/10 bg-[#17110e]/80 flex items-center gap-2">
          {(
            [
              { id: 'all', label: `All Jobs (${MISSIONS.length})` },
              { id: 'interactive', label: `Interactive Tasks (${interactiveCount})` },
              { id: 'classic', label: `Driving & Heists (${classicCount})` },
            ] as const
          ).map((tab) => {
            const selected = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`dispatch-filter-${tab.id}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setFilter(tab.id);
                }}
                className={`px-3 py-1.5 rounded text-xs font-display font-semibold uppercase tracking-wider cursor-pointer transition-colors ${
                  selected
                    ? 'bg-[#f59e0b] text-[#160f0b]'
                    : 'bg-[#261d18] text-[#d6c2a5] hover:bg-[#332721] hover:text-[#fff7eb]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 flex flex-col gap-3 max-h-[64vh] overflow-y-auto">
          {visibleMissions.map((m) => {
            const idx = MISSIONS.findIndex((item) => item.id === m.id);
            const isActive = activeMissionId === m.id;
            const isDone = completedMissionIds.includes(m.id);
            return (
              <div
                key={m.id}
                className="p-4 rounded border flex items-center justify-between gap-4"
                style={{
                  backgroundColor: isActive
                    ? 'rgba(245, 158, 11, 0.14)'
                    : m.isInteractive
                      ? 'rgba(17, 34, 34, 0.82)'
                      : 'rgba(28, 22, 18, 0.9)',
                  borderColor: isActive
                    ? 'rgba(245, 158, 11, 0.65)'
                    : isDone
                      ? 'rgba(34, 197, 94, 0.4)'
                      : m.isInteractive
                        ? 'rgba(45, 212, 191, 0.38)'
                        : 'rgba(255, 240, 214, 0.14)',
                }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#d6c2a5]">
                    <span className="font-mono-num text-[#f5b942]">{String(idx + 1).padStart(2, '0')}.</span>
                    <span>{m.district}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num text-[#fff7eb]">
                      ${m.reward.toLocaleString('en-US')}
                    </span>
                    {m.isInteractive && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-display text-[11px] uppercase tracking-wider text-[#2dd4bf] font-bold">
                          INTERACTIVE · {m.steps.length} TASKS
                        </span>
                      </>
                    )}
                    {m.emotionTag && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-display text-[11px] uppercase tracking-wider text-[#fb923c] font-semibold">
                          {m.emotionTag}
                        </span>
                      </>
                    )}
                    {m.recommendedWeather === 'heavy_monsoon' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-display text-[11px] uppercase tracking-wider text-[#38bdf8]">
                          NOR&apos;EASTER
                        </span>
                      </>
                    )}
                    {isDone && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#4ade80] font-semibold">Completed</span>
                      </>
                    )}
                    {isActive && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#fbbf24] font-semibold">Active</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-base font-display font-bold text-[#fff8eb] mt-0.5">
                    {m.title}
                  </h3>
                  <p className="text-xs text-[#cbb89d] mt-1 leading-relaxed">{m.briefing}</p>
                </div>

                <div className="shrink-0">
                  {isActive ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onAbandonMission();
                      }}
                      className="px-4 py-2 rounded bg-[#7f1d1d] hover:bg-[#991b1b] text-xs font-display font-bold uppercase tracking-wider text-white cursor-pointer whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onAcceptMission(m.id);
                        onClose();
                      }}
                      className="px-4 py-2 rounded bg-[#f59e0b] hover:bg-[#fbbf24] text-xs font-display font-bold uppercase tracking-wider text-[#160f0b] cursor-pointer whitespace-nowrap"
                    >
                      {isDone ? 'Replay' : 'Start Job'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
