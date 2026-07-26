import { oklabDistSqFromHex } from './oklch';

/** OKLab 距离阈值：与 hunt 匹配量级接近（√0.04 ≈ 0.2） */
export const SIMILAR_COLOR_DIST_SQ_MAX = 0.04;

function normalizeHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toUpperCase()}`;
}

/**
 * @param {string[]} hexes
 * @param {string} targetHex
 * @returns {{ ok: boolean, bestDistSq: number, closestHex: string | null, exact: boolean }}
 */
export function evaluatePaletteColorMatch(hexes, targetHex) {
  const target = normalizeHex(targetHex);
  const list = (hexes || []).map(normalizeHex).filter(Boolean);
  if (!target || !list.length) {
    return { ok: false, bestDistSq: Infinity, closestHex: null, exact: false };
  }

  let bestDistSq = Infinity;
  let closestHex = null;
  let exact = false;

  for (const h of list) {
    if (h === target) {
      return { ok: true, bestDistSq: 0, closestHex: h, exact: true };
    }
    const d = oklabDistSqFromHex(h, target);
    if (d < bestDistSq) {
      bestDistSq = d;
      closestHex = h;
    }
  }

  return {
    ok: bestDistSq <= SIMILAR_COLOR_DIST_SQ_MAX,
    bestDistSq,
    closestHex,
    exact,
  };
}

/**
 * Filter + sort feed items by perceptual closeness to a target hex.
 * Exact matches first, then ascending distance.
 */
export function filterFeedBySimilarColor(items, targetHex, getHexes) {
  const target = normalizeHex(targetHex);
  if (!target) return items || [];

  const scored = [];
  for (const item of items || []) {
    const hexes = typeof getHexes === 'function' ? getHexes(item) : [];
    const match = evaluatePaletteColorMatch(hexes, target);
    if (!match.ok) continue;
    scored.push({ item, match });
  }

  scored.sort((a, b) => {
    if (a.match.exact !== b.match.exact) return a.match.exact ? -1 : 1;
    return a.match.bestDistSq - b.match.bestDistSq;
  });

  return scored.map((row) => row.item);
}
