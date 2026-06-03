import { useEffect, useState } from 'react';
import { formatDailyPaletteDateKey } from '../lib/dailyPalette';

/** Bumps when the local calendar date changes (next midnight + visibility sync). */
export function useCalendarDateKey() {
  const [dateKey, setDateKey] = useState(() => formatDailyPaletteDateKey());

  useEffect(() => {
    const tick = () => setDateKey(formatDailyPaletteDateKey());

    const msToNextLocalMidnight = () => {
      const n = new Date();
      const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 0, 0);
      return Math.max(1, next.getTime() - n.getTime());
    };

    let intervalId;
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 86_400_000);
    }, msToNextLocalMidnight());

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
