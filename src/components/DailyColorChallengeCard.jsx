import React, { useMemo } from 'react';
import { ArrowRight, CalendarSync } from 'lucide-react';
import { dateFromDailyPaletteKey, getTodayColor } from '../lib/dailyPalette';
import { useCalendarDateKey } from '../hooks/useCalendarDateKey';
import { pickReadableTextOnHex } from '../lib/colorValues';

/**
 * 游戏页 · 每日一色挑战横向卡片（北京时间 dateKey 在午夜更新）
 * @param {{ onStart: (dailyData: { hex: string, name: string, quote: object, dateKey: string }) => void }} props
 */
export default function DailyColorChallengeCard({ onStart }) {
  const dateKey = useCalendarDateKey();
  const daily = useMemo(
    () => getTodayColor(dateFromDailyPaletteKey(dateKey)),
    [dateKey],
  );

  const textOnSwatch = pickReadableTextOnHex(daily.hex);
  const quoteLine = daily.quote?.zh
    ? `「${daily.quote.zh}」`
    : '';
  const quoteSource = daily.quote?.zhSource
    ? `—— ${daily.quote.zhSource}`
    : '';

  return (
    <button
      type="button"
      onClick={() => onStart?.(daily)}
      className="group mb-6 flex w-full overflow-hidden rounded-2xl border border-zen-ink/10 bg-white text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zen-vermilion/40"
      aria-label={`开始今日挑战：${daily.name}`}
    >
      <div
        className="relative w-[min(38%,9rem)] shrink-0 self-stretch min-h-[7.5rem]"
        style={{ backgroundColor: daily.hex }}
      >
        <span
          className="absolute bottom-2 left-2 text-[10px] font-mono font-extralight tracking-wider opacity-80"
          style={{ color: textOnSwatch }}
        >
          {daily.hex}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 px-4 py-3.5">
        <div className="type-overline flex items-center gap-1.5">
          <CalendarSync size={12} strokeWidth={2} aria-hidden />
          <span>每日一色</span>
          <span className="tabular-nums">{daily.dateKey}</span>
        </div>

        <div>
          <h2 className="type-h2">
            {daily.name}
          </h2>
          {quoteLine && (
            <p className="type-body-sm mt-1.5 line-clamp-2 text-zen-ink/65">
              {quoteLine}
              {quoteSource && (
                <span className="type-caption mt-0.5 block">{quoteSource}</span>
              )}
            </p>
          )}
        </div>

        <span className="type-caption inline-flex items-center gap-1 text-zen-vermilion group-hover:opacity-80">
          开始挑战
          <ArrowRight size={14} strokeWidth={2} aria-hidden />
        </span>
      </div>
    </button>
  );
}
