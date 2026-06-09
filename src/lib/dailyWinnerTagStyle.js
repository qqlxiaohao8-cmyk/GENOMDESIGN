import { DAILY_WINNER_TAG } from './dailyOneColorConstants.js';
import { hexToRgb, pickReadableTextOnHex } from './colorValues.js';

/** 与 .zen-tag 同尺寸；叠在 zen-tag 上时只覆盖颜色 */
const TAG_COLOR_ONLY =
  'transition-[background-color,border-color,color]';

/** 色海「每日色卡」快捷标签：边框与底色随当日观色 hex 变化 */
export function getDailyWinnerTagButtonProps(hex, active) {
  const norm = String(hex || '#888888').trim();
  const [r, g, b] = hexToRgb(norm);
  if (active) {
    return {
      className: TAG_COLOR_ONLY,
      style: {
        backgroundColor: norm,
        borderColor: norm,
        color: pickReadableTextOnHex(norm),
      },
    };
  }
  return {
    className: `${TAG_COLOR_ONLY} text-zen-ink/70`,
    style: {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.18)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.42)`,
    },
  };
}

export function isDailyWinnerTag(tag) {
  return tag === DAILY_WINNER_TAG;
}
