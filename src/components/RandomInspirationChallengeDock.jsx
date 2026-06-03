import React from 'react';
import { Camera, X, Sparkles } from 'lucide-react';

/**
 * Persistent challenge UI: desktop sidebar, mobile mini card above bottom nav.
 */
export default function RandomInspirationChallengeDock({ challenge, onCancel, onGoExtract }) {
  if (!challenge) return null;

  const isSingle = challenge.mode === 'single';
  const colors = isSingle
    ? [{ hex: challenge.hex, label: challenge.funName }]
    : challenge.colors || [];

  return (
    <>
      <div
        className="hidden md:flex fixed right-0 top-[calc(5rem+env(safe-area-inset-top,0px))] z-[55] w-[13.5rem] flex-col gap-3 border-l border-zen-ink/10 bg-white/95 py-4 px-3 shadow-none backdrop-blur-md"
        role="complementary"
        aria-label="空生色挑战"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-extralight uppercase tracking-[0.2em] text-zen-vermilion/90 leading-tight">
            空生色
            <span className="block text-zen-ink/50 normal-case text-[9px] tracking-normal mt-0.5">拍摄挑战进行中</span>
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-full p-1 text-zen-ink/40 hover:bg-zen-ink/[0.06] hover:text-zen-ink transition-colors"
            aria-label="取消挑战"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {colors.map((c) => (
            <div
              key={`${c.hex}-${c.label || ''}`}
              className="h-10 w-10 rounded-lg border border-zen-ink/10 shadow-inner shrink-0"
              style={{ backgroundColor: c.hex }}
              title={c.hex}
            />
          ))}
        </div>
        <div className="text-[10px] font-extralight text-zen-ink/60 space-y-1 max-h-[5.5rem] overflow-y-auto">
          {isSingle ? (
            <>
              <p className="font-medium text-zen-ink">{challenge.funName}</p>
              <p className="tabular-nums">{challenge.hex}</p>
            </>
          ) : (
            colors.map((c) => (
              <p key={c.hex} className="tabular-nums truncate">
                {c.hex}
                {c.label ? ` · ${c.label}` : ''}
              </p>
            ))
          )}
        </div>
        <button
          type="button"
          onClick={onGoExtract}
          className="mt-1 inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-zen-ink text-white text-[10px] font-extralight uppercase tracking-widest border border-zen-ink/20 shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          <Camera size={15} strokeWidth={2} />
          前往析色上传
        </button>
      </div>

      <div
        className="md:hidden fixed left-3 right-3 z-[55] bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] rounded-2xl border border-zen-ink/15 bg-white/96 backdrop-blur-md shadow-lg px-3 py-2.5 flex items-center gap-3"
        role="status"
        aria-label="空生色挑战"
      >
        <Sparkles className="shrink-0 text-zen-vermilion/90" size={20} strokeWidth={2} aria-hidden />
        <div className="flex-1 min-w-0 flex gap-1 overflow-x-auto">
          {colors.map((c) => (
            <div
              key={`m-${c.hex}`}
              className="h-9 w-9 rounded-lg border border-zen-ink/10 shrink-0"
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={onGoExtract}
          className="shrink-0 px-3 py-2 rounded-full bg-zen-vermilion text-white text-[10px] font-extralight uppercase tracking-wider"
        >
          析色
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-full p-2 text-zen-ink/45 hover:bg-zen-ink/[0.06]"
          aria-label="取消挑战"
        >
          <X size={18} />
        </button>
      </div>
    </>
  );
}
