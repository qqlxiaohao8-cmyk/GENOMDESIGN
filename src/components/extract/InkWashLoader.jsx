import React from 'react';

/**
 * 析色 loading animation — ink drop diffusing on rice paper.
 * Pure SVG + CSS. Three translucent ink blots pulse/drift with hue shifts
 * to evoke pigment dispersing while the palette is being extracted.
 */
export default function InkWashLoader({ label = '正在析色…', hint = '墨色在纸上慢慢化开' }) {
  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center gap-6 overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#fbf7ef_0%,#eee4d0_70%,#d8ccb4_100%)] px-8 text-center"
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes ink-bloom-a {
          0%   { transform: translate(-50%, -50%) scale(0.35); opacity: 0.18; filter: blur(1px); }
          40%  { transform: translate(-48%, -52%) scale(1.02);  opacity: 0.62; filter: blur(3px); }
          70%  { transform: translate(-52%, -48%) scale(1.18);  opacity: 0.45; filter: blur(5px); }
          100% { transform: translate(-50%, -50%) scale(1.30);  opacity: 0.00; filter: blur(7px); }
        }
        @keyframes ink-bloom-b {
          0%   { transform: translate(-50%, -50%) scale(0.28); opacity: 0.10; filter: blur(1px); }
          45%  { transform: translate(-55%, -47%) scale(0.94); opacity: 0.55; filter: blur(3px); }
          75%  { transform: translate(-45%, -53%) scale(1.10); opacity: 0.32; filter: blur(6px); }
          100% { transform: translate(-50%, -50%) scale(1.22); opacity: 0.00; filter: blur(8px); }
        }
        @keyframes ink-drop {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.92; }
          50%      { transform: translate(-50%, -50%) scale(0.78); opacity: 0.70; }
        }
        @keyframes ink-ring {
          0%   { transform: translate(-50%, -50%) scale(0.1); opacity: 0.55; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0.00; }
        }
        @keyframes ink-stroke {
          0%   { stroke-dashoffset: 260; opacity: 0.0; }
          20%  { opacity: 0.85; }
          100% { stroke-dashoffset: 0;   opacity: 0.0; }
        }
        @keyframes ink-caption {
          0%, 100% { opacity: 0.55; letter-spacing: 0.38em; }
          50%      { opacity: 0.95; letter-spacing: 0.48em; }
        }
        .ink-paper-grain::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            radial-gradient(rgba(60,44,24,0.05) 1px, transparent 1px),
            radial-gradient(rgba(60,44,24,0.04) 1px, transparent 1px);
          background-size: 3px 3px, 7px 7px;
          background-position: 0 0, 1px 2px;
          mix-blend-mode: multiply;
          pointer-events: none;
        }
      `}</style>

      <div className="ink-paper-grain pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative h-56 w-56 sm:h-64 sm:w-64">
        {/* slow, large ink bloom */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 block h-44 w-44 rounded-full sm:h-52 sm:w-52"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(24,18,12,0.78) 0%, rgba(24,18,12,0.5) 28%, rgba(24,18,12,0.18) 55%, rgba(24,18,12,0) 78%)',
            animation: 'ink-bloom-a 3.6s ease-in-out infinite',
          }}
        />
        {/* secondary bloom, offset */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 block h-36 w-36 rounded-full sm:h-40 sm:w-40"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(70,32,38,0.70) 0%, rgba(70,32,38,0.42) 30%, rgba(70,32,38,0.10) 60%, rgba(70,32,38,0) 80%)',
            animation: 'ink-bloom-b 4.2s ease-in-out 0.6s infinite',
          }}
        />
        {/* faint ring echo */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 block h-20 w-20 rounded-full border border-zen-ink/40 sm:h-24 sm:w-24"
          style={{ animation: 'ink-ring 2.4s ease-out infinite' }}
        />
        {/* brush stroke sweeping across */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden
        >
          <path
            d="M 18 118 C 60 72, 110 70, 150 96 S 190 152, 182 168"
            stroke="rgba(20,14,8,0.78)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray="260"
            style={{ animation: 'ink-stroke 3.1s ease-in-out infinite' }}
          />
          <path
            d="M 32 154 C 72 130, 116 128, 164 144"
            stroke="rgba(20,14,8,0.45)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="220"
            style={{ animation: 'ink-stroke 3.7s ease-in-out 0.7s infinite' }}
          />
        </svg>
        {/* dense ink seed */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 block h-6 w-6 rounded-full bg-zen-ink shadow-[0_0_18px_rgba(0,0,0,0.35)] sm:h-7 sm:w-7"
          style={{ animation: 'ink-drop 2.2s ease-in-out infinite' }}
        />
      </div>

      <div className="relative z-[1] flex flex-col items-center gap-2">
        <p
          className="font-zenSerif text-lg font-medium text-zen-ink sm:text-xl"
          style={{ animation: 'ink-caption 2.4s ease-in-out infinite' }}
          lang="zh-Hans"
        >
          {label}
        </p>
        {hint ? (
          <p className="font-zenSerif text-[11px] font-extralight tracking-[0.32em] text-zen-ink/55 sm:text-xs" lang="zh-Hans">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
