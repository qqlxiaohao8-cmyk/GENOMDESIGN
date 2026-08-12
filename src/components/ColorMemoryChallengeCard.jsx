import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

/**
 * 游戏页 · 色彩记忆入口卡片（尺寸与每日一色挑战卡片一致）
 * @param {{ onOpen?: () => void }} props
 */
export default function ColorMemoryChallengeCard({ onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.()}
      className="group mb-4 flex w-full overflow-hidden rounded-2xl border border-zen-ink/10 bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zen-vermilion/40"
      aria-label="打开色彩记忆挑战"
    >
      <div className="relative w-[min(38%,9rem)] shrink-0 self-stretch min-h-[7.5rem] bg-black">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: 'linear-gradient(160deg, #E85D75 0%, #4A90D9 38%, #7B68EE 68%, #2ECC71 100%)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/35" aria-hidden />
        <span className="absolute bottom-2 left-2 text-[10px] font-mono font-extralight tracking-wider text-white/75">
          5 轮
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 px-4 py-3.5">
        <div className="type-overline flex items-center gap-1.5">
          <Sparkles size={12} strokeWidth={2} aria-hidden />
          <span>色彩感知</span>
        </div>

        <div>
          <h2 className="type-h2">色彩记忆</h2>
        </div>

        <span className="type-caption inline-flex items-center gap-1 text-zen-vermilion group-hover:opacity-80">
          开始游戏
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </span>
      </div>
    </button>
  );
}
