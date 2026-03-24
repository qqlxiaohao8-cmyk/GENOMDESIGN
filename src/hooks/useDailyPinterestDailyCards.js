import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchBoardPinImageUrls, resolveDailyPinterestBoardPath } from '../lib/pinterestPidget';
import {
  readPinterestDailyCache,
  writePinterestDailyCache,
  pickPinUrlForDateKey,
  buildMoodSwatchesFromHexes,
  listRecentDailyDateKeys,
  PINTEREST_DAILY_PRIORITY_DAYS,
} from '../lib/dailyPalettePinterest';

/**
 * Loads a Pinterest board via the public widget API, then (in the browser) samples each
 * calendar day’s pin into five dominant hexes. Results persist in localStorage.
 */
export function useDailyPinterestDailyCards({ fetchImageAsDataUrl, extractFiveDominantHexesFromDataUrl }) {
  const [cacheRevision, setCacheRevision] = useState(0);
  const busyRef = useRef(false);

  const pinterestDailyCache = useMemo(() => readPinterestDailyCache(), [cacheRevision]);

  useEffect(() => {
    const parsed = resolveDailyPinterestBoardPath();
    if (!parsed) return undefined;

    const boardKey = `${parsed.user}/${parsed.board}`;
    let cancelled = false;
    const ac = new AbortController();

    const run = async () => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const pinUrls = await fetchBoardPinImageUrls(parsed.user, parsed.board, ac.signal);
        if (cancelled || pinUrls.length === 0) return;

        let cache = readPinterestDailyCache();
        if (cache.board !== boardKey) {
          cache = { board: boardKey, entries: {} };
          writePinterestDailyCache(cache);
          setCacheRevision((x) => x + 1);
        }

        const allKeys = listRecentDailyDateKeys();
        const priority = new Set(allKeys.slice(0, PINTEREST_DAILY_PRIORITY_DAYS));

        const processOne = async (dateKey) => {
          cache = readPinterestDailyCache();
          if (cache.board !== boardKey) return;
          const existing = cache.entries[dateKey];
          if (existing?.colors?.length === 5 && existing?.imageUrl) return;

          const imageUrl = pickPinUrlForDateKey(dateKey, pinUrls);
          if (!imageUrl) return;

          try {
            const dataUrl = await fetchImageAsDataUrl(imageUrl);
            const hexes = await extractFiveDominantHexesFromDataUrl(dataUrl);
            const colors = buildMoodSwatchesFromHexes(hexes);
            cache = readPinterestDailyCache();
            if (cache.board !== boardKey) return;
            cache.entries[dateKey] = { imageUrl, colors };
            writePinterestDailyCache(cache);
            setCacheRevision((x) => x + 1);
          } catch {
            /* CORS, block, or bad image — skip day */
          }
        };

        for (const dateKey of allKeys) {
          if (cancelled || ac.signal.aborted) break;
          if (priority.has(dateKey)) {
            await processOne(dateKey);
            await new Promise((r) => setTimeout(r, 120));
          }
        }

        const idle =
          typeof window.requestIdleCallback === 'function'
            ? window.requestIdleCallback.bind(window)
            : (cb) => setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 400);

        idle(() => {
          void (async () => {
            for (const dateKey of allKeys) {
              if (cancelled || ac.signal.aborted) break;
              if (priority.has(dateKey)) continue;
              await processOne(dateKey);
              await new Promise((r) => setTimeout(r, 100));
            }
          })();
        });
      } finally {
        busyRef.current = false;
      }
    };

    void run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [fetchImageAsDataUrl, extractFiveDominantHexesFromDataUrl]);

  return {
    pinterestDailyCache,
    pinterestBoardEnabled: Boolean(resolveDailyPinterestBoardPath()),
  };
}
