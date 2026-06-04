import { useEffect, useState } from 'react';
import { dateFromDailyPaletteKey, formatDailyPaletteDateKey } from '../lib/dailyPalette';

/** Bumps at GMT+8 (Asia/Shanghai) midnight — 与逐日观色 / 每日一色一致 */
export function useCalendarDateKey() {
  const [dateKey, setDateKey] = useState(() => formatDailyPaletteDateKey());

  useEffect(() => {
    const tick = () => setDateKey(formatDailyPaletteDateKey());

    const msToNextGmt8Midnight = () => {
      const key = formatDailyPaletteDateKey();
      const dayStart = dateFromDailyPaletteKey(key);
      const next = dayStart.getTime() + 86_400_000;
      return Math.max(1, next - Date.now());
    };

    let intervalId;
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 86_400_000);
    }, msToNextGmt8Midnight());

    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return dateKey;
}
