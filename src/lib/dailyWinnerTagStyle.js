import { DAILY_WINNER_TAG } from './dailyOneColorConstants.js';
import { hexToRgb, pickReadableTextOnHex } from './colorValues.js';

const TAG_PILL_BASE =
  'rounded-full border px-2.5 py-1 text-[11px] font-extralight transition-[background-color,border-color,color,filter]';

/** 色海「每日色卡」快捷标签：边框与底色随当日观色 hex 变化 */
export function getDailyWinnerTagButtonProps(hex, active) {
  const norm = String(hex || '#888888').trim();
  const [r, g, b] = hexToRgb(norm);
  if (active) {
    return {
      className: TAG_PILL_BASE,
      style: {
        backgroundColor: norm,
        borderColor: norm,
        color: pickReadableTextOnHex(norm),
      },
    };
  }
  return {
    className: `${TAG_PILL_BASE} text-zen-ink/70 hover:brightness-[0.97]`,
    style: {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.18)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.42)`,
    },
  };
}

export function isDailyWinnerTag(tag) {
  return tag === DAILY_WINNER_TAG;
}
