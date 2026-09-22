import React, { useMemo } from 'react';
import { dateFromDailyPaletteKey, getTodayColor } from '../lib/dailyPalette';
import { useCalendarDateKey } from '../hooks/useCalendarDateKey';
import { pickReadableTextOnHex } from '../lib/colorValues';

/**
 * 游戏页 · 每日一色：先看今日之色，再选挑战或投票。
 */
export default function DailyColorChallengeCard({ onStart, onOpenPool }) {
  const dateKey = useCalendarDateKey();
  const daily = useMemo(
    () => getTodayColor(dateFromDailyPaletteKey(dateKey)),
    [dateKey],
  );

  const textOnSwatch = pickReadableTextOnHex(daily.hex);
  const quoteLine = daily.quote?.zh ? daily.quote.zh : '';
  const catalogDate = String(daily.dateKey || '').replace(/-/g, '.');

  return (
    <article className="zen-specimen mb-12 flex w-full items-start gap-5 py-1 sm:gap-8">
      <button
        type="button"
        onClick={() => onStart?.(daily)}
        className="zen-wash relative h-[8.75rem] w-[7rem] shrink-0 sm:h-[10.5rem] sm:w-[8.25rem]"
        aria-label={`开始今日挑战：${daily.name}`}
      >
        <span
          className="absolute bottom-3 left-1/2 -translate-x-1/2 font-zenTypewriter text-[10px] tracking-wide opacity-80"
          style={{ color: textOnSwatch }}
        >
          {daily.hex}
        </span>
      </button>

      <div className="min-w-0 flex-1 pt-1">
        <p className="font-zenTypewriter text-[10px] text-zen-stone">1 · {catalogDate}</p>
        <h2 className="type-h2 mt-2">{daily.name}</h2>
        {quoteLine ? (
          <p className="type-body-sm mt-2 max-w-[16rem] text-zen-ink/70">
            {quoteLine}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <button
            type="button"
            onClick={() => onStart?.(daily)}
            className="zen-action zen-hit px-0"
          >
            开始挑战
          </button>
          {onOpenPool ? (
            <button
              type="button"
              onClick={() => onOpenPool()}
              className="zen-quiet zen-hit px-0"
            >
              今日投票
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
