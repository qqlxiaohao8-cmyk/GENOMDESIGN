import { hexToRgb } from './colorValues';

function linSrgbChannel(byte) {
  const c = (byte || 0) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function hexToOklab(hex) {
  const [r, g, b] = hexToRgb(hex);
  const R = linSrgbChannel(r);
  const G = linSrgbChannel(g);
  const B = linSrgbChannel(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabDist(h1, h2) {
  const A = hexToOklab(h1);
  const B = hexToOklab(h2);
  const dL = A.L - B.L;
  const da = A.a - B.a;
  const db = A.b - B.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** OKLab 欧氏距离上限：越小越严；约 0.18–0.22 覆盖「明显同色系、略有偏差」的逐日观色投稿。 */
export const HUNT_OKLAB_MATCH_MAX = 0.2;

/**
 * @param {string[]} extractedHexes
 * @param {string} targetHex
 * @returns {{ ok: boolean, bestDelta: number, closestHex: string | null }}
 */
export function evaluateHuntPaletteMatch(extractedHexes, targetHex) {
  const list = (extractedHexes || []).filter(Boolean);
  if (!list.length || !targetHex) {
    return { ok: false, bestDelta: Infinity, closestHex: null };
  }
  let bestDelta = Infinity;
  let closestHex = null;
  for (const h of list) {
    const d = oklabDist(h, targetHex);
    if (d < bestDelta) {
      bestDelta = d;
      closestHex = h;
    }
  }
  return {
    ok: bestDelta <= HUNT_OKLAB_MATCH_MAX,
    bestDelta,
    closestHex,
  };
}

export function normalizeHuntHex(h) {
  const s = String(h || '')
    .trim()
    .replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '#000000';
  return `#${s.toUpperCase()}`;
}
