import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';

/**
 * 游戏页 · Color Walk 入口卡片（与每日一色同尺寸）
 * @param {{ onOpen?: () => void }} props
 */
export default function ColorWalkChallengeCard({ onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.()}
      className="group mb-4 flex w-full overflow-hidden rounded-2xl border border-zen-ink/10 bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zen-vermilion/40"
      aria-label="打开 Color Walk"
    >
      <div className="relative w-[min(38%,9rem)] shrink-0 self-stretch min-h-[7.5rem] bg-black">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(140deg, #D58A6A 0%, #8DA3D9 45%, #CFA0D4 72%, #B8D79A 100%)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/30" aria-hidden />
        <span className="absolute bottom-2 left-2 text-[10px] font-mono font-extralight tracking-wider text-white/75">
          随机定色
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 px-4 py-3.5">
        <div className="type-overline flex items-center gap-1.5">
          <Compass size={12} strokeWidth={2} aria-hidden />
          <span>Color Walk</span>
        </div>

        <div>
          <h2 className="type-h2">Color Walk</h2>
          <p className="type-body-sm mt-1.5 line-clamp-2 text-zen-ink/65">
            随机色彩转盘停在一个颜色，再用照片走一段色彩旅程
          </p>
        </div>

        <span className="type-caption inline-flex items-center gap-1 text-zen-vermilion group-hover:opacity-80">
          开始
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </span>
      </div>
    </button>
  );
}
