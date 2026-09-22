import { DAILY_WINNER_TAG } from './dailyOneColorConstants.js';

/** 色海「每日色卡」快捷标签：字色随当日观色 */
export function getDailyWinnerTagButtonProps(hex, active) {
  const norm = String(hex || '#888888').trim();
  if (active) {
    return {
      className: 'font-zenTypewriter',
      style: {
        color: norm,
        boxShadow: `0 1px 0 ${norm}`,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      },
    };
  }
  return {
    className: 'font-zenTypewriter text-zen-stone',
    style: {
      color: norm,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
  };
}

export function isDailyWinnerTag(tag) {
  return tag === DAILY_WINNER_TAG;
}
