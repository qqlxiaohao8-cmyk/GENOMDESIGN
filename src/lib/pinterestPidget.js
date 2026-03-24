/**
 * Public Pinterest board widget JSON (no auth). Used to list pin image URLs for GENOM Daily.
 * @see https://widgets.pinterest.com — embed data; same-origin fetch may require a dev/prod proxy.
 */

/**
 * @param {string} boardPath `username/board-slug` as in the board URL
 * @returns {{ user: string, board: string } | null}
 */
export function parsePinterestBoardPath(boardPath) {
  if (!boardPath || typeof boardPath !== 'string') return null;
  let s = boardPath.trim();
  if (!s || s.toLowerCase() === 'off') return null;
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length < 2) return null;
      return { user: parts[0], board: parts.slice(1).join('/') };
    }
  } catch {
    return null;
  }
  const parts = s.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return { user: parts[0], board: parts.slice(1).join('/') };
}

function pidgetUrl(user, board) {
  const u = encodeURIComponent(user);
  const b = encodeURIComponent(board);
  return `https://widgets.pinterest.com/v3/pidgets/boards/${u}/${b}/pins/`;
}

function devProxyPidgetUrl(user, board) {
  const u = encodeURIComponent(user);
  const b = encodeURIComponent(board);
  return `/__genom/pinterest-widgets/v3/pidgets/boards/${u}/${b}/pins/`;
}

/**
 * @param {unknown} json
 * @returns {string[]}
 */
export function extractPinImageUrlsFromPidget(json) {
  const pins = json?.data?.pins;
  if (!Array.isArray(pins)) return [];
  const out = [];
  for (const p of pins) {
    const imgs = p?.images;
    if (!imgs || typeof imgs !== 'object') continue;
    const img =
      imgs['736x'] ||
      imgs['564x'] ||
      imgs['474x'] ||
      imgs['236x'] ||
      Object.values(imgs).find((x) => x && typeof x.url === 'string');
    const url = img?.url;
    if (typeof url === 'string' && /^https:\/\/i\.pinimg\.com\//i.test(url)) {
      out.push(url.split('?')[0]);
    }
  }
  return [...new Set(out)];
}

/**
 * @param {string} user
 * @param {string} board
 * @param {AbortSignal} [signal]
 * @returns {Promise<string[]>}
 */
export async function fetchBoardPinImageUrls(user, board, signal) {
  const direct = pidgetUrl(user, board);
  const proxied = devProxyPidgetUrl(user, board);
  const tryUrls = import.meta.env.DEV ? [proxied, direct] : [direct, proxied];

  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { signal, credentials: 'omit' });
      if (!res.ok) continue;
      const json = await res.json();
      const list = extractPinImageUrlsFromPidget(json);
      if (list.length > 0) return list;
    } catch {
      /* try next */
    }
  }
  return [];
}

export function resolveDailyPinterestBoardPath() {
  const raw = import.meta.env.VITE_DAILY_PINTEREST_BOARD?.trim();
  if (raw && raw.toLowerCase() === 'off') return null;
  const fallback = parsePinterestBoardPath('pinterest/official-news');
  if (raw) return parsePinterestBoardPath(raw) || fallback;
  return fallback;
}
