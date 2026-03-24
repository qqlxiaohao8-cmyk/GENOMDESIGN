import { enrichSwatch } from './colorValues';
import { formatDailyPaletteDateKey, DAILY_PALETTE_HISTORY_DAYS } from './dailyPalette';

const STORAGE_KEY = 'genom-daily-pinterest-v2';
const PHOTO_SUFFIX =
  '\n\nFive swatches were sampled from a Pinterest mood-board image for this calendar day.';

/** How many recent days we extract on first visit (rest fills in idle time). */
export const PINTEREST_DAILY_PRIORITY_DAYS = 56;

export function hashDateKeyToIndex(dateKey, modulo) {
  if (!modulo) return 0;
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % modulo;
}

export function pickPinUrlForDateKey(dateKey, pinUrls) {
  if (!pinUrls?.length) return null;
  const i = hashDateKeyToIndex(dateKey, pinUrls.length);
  return pinUrls[i];
}

export function readPinterestDailyCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { board: '', entries: {} };
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object') return { board: '', entries: {} };
    return {
      board: typeof p.board === 'string' ? p.board : '',
      entries: p.entries && typeof p.entries === 'object' ? p.entries : {},
    };
  } catch {
    return { board: '', entries: {} };
  }
}

export function writePinterestDailyCache(cache) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* quota / private mode */
  }
}

export function buildMoodSwatchesFromHexes(hexes) {
  const list = Array.isArray(hexes) ? hexes.slice(0, 5) : [];
  return list.map((hex, i) => ({
    ...enrichSwatch(hex),
    name: `Mood ${i + 1}`,
  }));
}

/**
 * @param {object} item — buildDailyPaletteFeedItem shape
 * @param {{ imageUrl: string, colors: object[] }} extract
 */
export function mergeDailyPaletteFeedItemWithPinterest(item, extract) {
  if (!item?.isDailyPalette || !extract?.imageUrl || !extract?.colors?.length) return item;
  const colors = extract.colors;
  const hexes = colors.map((c) => c.hex);
  const overview = `${item.prompt || ''}${PHOTO_SUFFIX}`.trim();
  return {
    ...item,
    imageUrl: extract.imageUrl,
    palette: hexes,
    prompt: overview,
    extractionSnapshot: {
      ...item.extractionSnapshot,
      colorCard: true,
      colorCardData: {
        overview,
        colors,
      },
      prompt: overview,
    },
  };
}

export function listRecentDailyDateKeys(dayCount = DAILY_PALETTE_HISTORY_DAYS) {
  const n = Math.max(1, Math.min(dayCount, DAILY_PALETTE_HISTORY_DAYS));
  const keys = [];
  const end = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    keys.push(formatDailyPaletteDateKey(d));
  }
  return keys;
}
