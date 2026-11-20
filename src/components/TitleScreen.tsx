import React, { useEffect, useState } from 'react';
import posterJeansTop from '../assets/images/title_poster_jeans_top_1795184299642.jpg';
import posterRedDress from '../assets/images/title_poster_red_dress_1795184300647.jpg';
import {
  GRAPHICS_QUALITY_ORDER,
  GRAPHICS_QUALITY_SPECS,
  type GraphicsQualityPreset,
} from '../game/graphicsQuality';

interface TitleScreenProps {
  graphicsQuality: GraphicsQualityPreset;
  onChangeGraphicsQuality: (preset: GraphicsQualityPreset) => void;
  onStart: () => void;
  onQuickMission: () => void;
}

const TITLE_POSTERS = [
  {
    id: 'red_dress',
    label: 'Red Dress',
    src: posterRedDress,
    alt: 'New York Vice protagonist in a crimson satin mini dress beside a metallic supercar at Manhattan sunset',
  },
  {
    id: 'jeans_top',
    label: 'Jeans Top',
    src: posterJeansTop,
    alt: 'New York Vice protagonist in high-waisted denim jeans and coral cropped top overlooking the Brooklyn Bridge at sunset',
  },
] as const;

export const TitleScreen: React.FC<TitleScreenProps> = ({
  graphicsQuality,
  onChangeGraphicsQuality,
  onStart,
  onQuickMission,
}) => {
  const activeSpec = GRAPHICS_QUALITY_SPECS[graphicsQuality];
  const [activePosterIdx, setActivePosterIdx] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Smoothly alternate between the Red Dress and Jeans Top animated GTA key-art posters (resets timer on manual click)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActivePosterIdx((prev) => (prev + 1) % TITLE_POSTERS.length);
    }, 7500);
    return () => window.clearTimeout(timer);
  }, [activePosterIdx]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const nx = e.clientX / Math.max(1, window.innerWidth) - 0.5;
    const ny = e.clientY / Math.max(1, window.innerHeight) - 0.5;
    setParallax({ x: -nx * 18, y: -ny * 10 });
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      className="fixed inset-0 z-20 flex flex-col justify-between overflow-hidden bg-[#16071f]"
    >
      {/* FULL-BLEED ANIMATED GTA-STYLE PROTAGONIST POSTER BACKDROP (behind New York Vice wordings) */}
      <div
        data-testid="title-hero-poster-stage"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 72% 42%, rgba(244, 63, 94, 0.45) 0%, rgba(74, 21, 75, 0.85) 48%, rgba(22, 7, 31, 1) 100%)',
        }}
      >
        {/* Subtle interactive pointer-parallax container */}
        <div
          className="absolute -inset-4 transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${parallax.x.toFixed(1)}px, ${parallax.y.toFixed(1)}px, 0)`,
          }}
        >
          {TITLE_POSTERS.map((poster, idx) => {
            const isActive = idx === activePosterIdx;
            if (failedImages[poster.id]) return null;
            return (
              <div
                key={poster.id}
                data-testid={`title-poster-${poster.id}`}
                data-active={isActive ? 'true' : 'false'}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={poster.src}
                  alt={poster.alt}
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, [poster.id]: true }))
                  }
                  className="w-full h-full object-cover object-[72%_18%] vice-poster-kenburns select-none"
                />
              </div>
            );
          })}
        </div>

        {/* Warm Vice golden-hour sunset atmosphere shimmer sweeping softly across the poster */}
        <div
          className="absolute inset-0 vice-sun-sweep mix-blend-screen"
          style={{
            background:
              'radial-gradient(ellipse 46% 65% at 68% 36%, rgba(251, 146, 60, 0.34) 0%, rgba(236, 72, 153, 0.18) 46%, rgba(22, 7, 31, 0) 78%)',
          }}
        />

        {/* Measured left-side twilight readability scrim keeping the right-side hero poster vivid */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(96deg, rgba(16, 6, 26, 0.90) 0%, rgba(26, 9, 38, 0.72) 32%, rgba(26, 9, 38, 0.20) 56%, rgba(16, 6, 26, 0.04) 100%)',
          }}
        />
      </div>

      {/* Subtle bottom horizon twilight vignette for crisp control hint legibility */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40"
        style={{
          background:
            'linear-gradient(180deg, rgba(18, 7, 28, 0) 0%, rgba(18, 7, 28, 0.84) 100%)',
        }}
      />

      {/* Top safe margin — minimalist GTA VI coastal-twilight district line */}
      <div className="relative z-10 pt-8 px-10 flex items-center justify-between pointer-events-none">
        <span className="text-[11px] tracking-[0.28em] uppercase text-[#ffd7c2]/90 font-body font-semibold">
          Manhattan · Brooklyn · Queens · Hudson Harbor · Washington Square
        </span>
      </div>

      {/* Left-Third GTA 6 Vice-Sunset Title Lockup & Actions */}
      <div className="relative z-10 px-10 max-w-2xl pointer-events-auto">
        {/* Bespoke GTA 6-Inspired Inline SVG Title Lockup (Sunset VI Backdrop + Empire Silhouette + Heavy Condensed NEW YORK + Brush Script VICE) */}
        <svg
          viewBox="0 0 600 286"
          className="w-full max-w-[540px] h-auto mb-6 overflow-visible select-none"
          role="img"
          aria-label="New York Vice"
        >
          <defs>
            {/* Iconic GTA VI Sunset Pastel Gradient: Twilight Purple -> Flamingo Pink -> Coral -> Golden Peach */}
            <linearGradient id="viceSunsetSun" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="32%" stopColor="#fb923c" />
              <stop offset="68%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            <linearGradient id="viceRomanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="38%" stopColor="#fb7185" />
              <stop offset="72%" stopColor="#e879f9" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            <linearGradient id="viceScriptGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff4d9e" />
              <stop offset="48%" stopColor="#ff8a5b" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>

            <linearGradient id="nyBlockGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="72%" stopColor="#fff1e6" />
              <stop offset="100%" stopColor="#fbcfe8" />
            </linearGradient>

            <filter id="viceGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#180824" floodOpacity="0.85" />
              <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#ec4899" floodOpacity="0.38" />
            </filter>

            <filter id="scriptGlow" x="-25%" y="-25%" width="150%" height="150%">
              <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#140720" floodOpacity="0.92" />
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#ff4d9e" floodOpacity="0.52" />
            </filter>

            <clipPath id="viClip">
              <text
                x="22"
                y="214"
                fontFamily="Anton, Impact, sans-serif"
                fontSize="232"
                letterSpacing="6"
              >
                VI
              </text>
            </clipPath>
          </defs>

          {/* Giant GTA 6-style Sunset "VI" Roman Numeral Monolith Behind Title */}
          <g filter="url(#viceGlow)">
            {/* Dark outer silhouette stroke for the VI monolith */}
            <text
              x="22"
              y="214"
              fill="url(#viceRomanGrad)"
              stroke="#1b0a2a"
              strokeWidth="12"
              paintOrder="stroke fill"
              fontFamily="Anton, Impact, sans-serif"
              fontSize="232"
              letterSpacing="6"
              opacity="0.92"
            >
              VI
            </text>

            {/* Clipped Manhattan Skyline & Coastal Palm Silhouettes inside the Sunset VI */}
            <g clipPath="url(#viClip)">
              {/* Horizontal sunset retro-heat horizon stripes */}
              <rect x="0" y="138" width="380" height="7" fill="#1e0b2e" fillOpacity="0.22" />
              <rect x="0" y="152" width="380" height="9" fill="#1e0b2e" fillOpacity="0.32" />
              <rect x="0" y="169" width="380" height="11" fill="#1e0b2e" fillOpacity="0.42" />
              <rect x="0" y="188" width="380" height="34" fill="#180826" fillOpacity="0.72" />

              {/* Empire State & Chrysler Art-Deco silhouette inside VI */}
              <path
                d="M16 218 L16 146 L38 146 L38 124 L56 124 L56 218 Z
                   M68 218 L68 130 L82 130 L82 104 L91 104 L91 84 L96 84 L96 58 L99 58 L99 84 L104 84 L104 104 L113 104 L113 130 L127 130 L127 218 Z
                   M138 218 L138 138 L158 118 L178 138 L178 218 Z
                   M196 218 L196 112 L212 96 L228 112 L228 218 Z
                   M236 218 L236 142 L268 142 L268 218 Z"
                fill="#1d092b"
                fillOpacity="0.82"
              />
              {/* Subtle coastal palm fronds framing the lower left edge */}
              <path
                d="M18 218 Q36 176 48 156 M48 156 Q28 146 12 154 M48 156 Q34 134 22 128 M48 156 Q62 134 78 136 M48 156 Q68 148 84 162"
                stroke="#160722"
                strokeWidth="5"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          </g>

          {/* Iconic Heavy Condensed GTA "NEW YORK" Stacked Lockup */}
          <g filter="url(#viceGlow)">
            <text
              x="14"
              y="118"
              fill="url(#nyBlockGrad)"
              stroke="#140720"
              strokeWidth="11"
              strokeLinejoin="round"
              paintOrder="stroke fill"
              fontFamily="Anton, Impact, sans-serif"
              fontSize="82"
              letterSpacing="5"
            >
              NEW
            </text>
            <text
              x="184"
              y="118"
              fill="url(#nyBlockGrad)"
              stroke="#140720"
              strokeWidth="11"
              strokeLinejoin="round"
              paintOrder="stroke fill"
              fontFamily="Anton, Impact, sans-serif"
              fontSize="82"
              letterSpacing="5"
            >
              YORK
            </text>
          </g>

          {/* Signature GTA Vice Neon-Sunset Brush Script "Vice" slashing across the lower half */}
          <g filter="url(#scriptGlow)" transform="rotate(-5, 220, 194)">
            <text
              x="92"
              y="206"
              fill="url(#viceScriptGrad)"
              stroke="#140720"
              strokeWidth="12"
              strokeLinejoin="round"
              paintOrder="stroke fill"
              fontFamily="Pacifico, cursive, serif"
              fontSize="94"
              letterSpacing="2"
            >
              Vice
            </text>
          </g>

          {/* Crisp Vice Sunset Accent Bar beneath logo */}
          <rect x="16" y="242" width="218" height="4" rx="2" fill="#f43f5e" />
          <rect x="242" y="242" width="96" height="4" rx="2" fill="#fbbf24" />
          <rect x="346" y="242" width="46" height="4" rx="2" fill="#38bdf8" />

          <text
            x="16"
            y="272"
            fill="#fde4d2"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontSize="13"
            fontWeight="700"
            letterSpacing="4.2"
          >
            OPEN-WORLD NEW YORK CITY
          </text>
        </svg>

        {/* Clean High-Contrast GTA-Style Menu Actions (Solid Fills, No Gradient Buttons) */}
        <div className="flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="px-8 py-3.5 bg-[#ff4d8d] hover:bg-[#ff6aa0] active:translate-y-px text-[#16071f] font-vice text-xl tracking-[0.14em] uppercase rounded-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-[0_10px_28px_rgba(244,63,94,0.42)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fef08a]"
          >
            Enter New York
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onQuickMission();
            }}
            className="px-6 py-3.5 bg-[#1b0c29]/90 hover:bg-[#2a1440] text-[#fff3ea] border border-[#ff7ab6]/55 font-vice text-lg tracking-[0.12em] uppercase rounded-sm transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7ab6]"
          >
            Start Mission 1
          </button>
        </div>

        {/* Graphics Quality Pre-Selector (Low / Medium / High) */}
        <div
          data-testid="title-graphics-selector"
          className="mt-5 max-w-[520px] bg-[#160922]/88 border border-[#ff7ab6]/30 rounded-sm p-3.5"
        >
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <span className="text-[11px] font-display uppercase tracking-[0.18em] text-[#fde047] whitespace-nowrap">
              Graphics Quality
            </span>
            <span
              data-testid="title-graphics-summary"
              className="text-[11px] font-mono-num text-[#f8d7e8]/85 whitespace-nowrap"
            >
              {activeSpec.summary}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Graphics Quality">
            {GRAPHICS_QUALITY_ORDER.map((preset) => {
              const spec = GRAPHICS_QUALITY_SPECS[preset];
              const selected = preset === graphicsQuality;
              return (
                <button
                  key={preset}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`title-quality-${preset}`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onChangeGraphicsQuality(preset);
                  }}
                  className={`py-2 px-2.5 rounded-sm text-[11px] font-display uppercase tracking-[0.06em] transition-colors cursor-pointer whitespace-nowrap text-center ${
                    selected
                      ? 'bg-[#ff4d8d] text-[#16071f] font-bold shadow-[0_4px_14px_rgba(255,77,141,0.35)]'
                      : 'bg-[#231033]/90 hover:bg-[#321749] text-[#fff1e6] border border-[#fff0d6]/15'
                  }`}
                >
                  {spec.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar: single flat control hint on left + interactive Red Dress / Jeans Top poster switcher on right */}
      <div className="relative z-10 pb-6 px-10 flex items-end justify-between gap-6">
        <p className="text-xs text-[#f8d7e8]/90 tracking-wide font-mono-num">
          WASD Move / Drive · Space Jump · Q / Click Punch · E Ride or Shop · F/V Park Sports · Shift Sprint / Nitro · O Outfit · T Weather · M Dispatch
        </p>

        <div
          className="flex items-center gap-1.5 bg-[#160922]/85 border border-[#ff7ab6]/35 rounded-sm p-1 pointer-events-auto shrink-0"
          role="tablist"
          aria-label="Title Poster Look"
        >
          {TITLE_POSTERS.map((poster, idx) => {
            const active = idx === activePosterIdx;
            return (
              <button
                key={poster.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`title-poster-tab-${poster.id}`}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setActivePosterIdx(idx);
                }}
                className={`px-3 py-1.5 rounded-sm text-[11px] font-display uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#ff4d8d] text-[#16071f] font-bold'
                    : 'text-[#f8d7e8]/85 hover:text-white hover:bg-[#2a133e]'
                }`}
              >
                {poster.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
