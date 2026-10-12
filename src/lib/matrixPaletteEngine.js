/**
 * Matrix palette engine — 10 aesthetic themes × 8 color harmonies.
 * Used by 生色 / 空生色 via randomPaletteHarmonyWithMeta.
 */
import { oklabDistSqFromHex } from './oklch.js';
import { getPoeticColorName } from './poeticColorNaming';

/** @typedef {{ name: string, sMin: number, sMax: number, lMin: number, lMax: number, hBias: null | 'sunset' | 'ocean' }} ThemeProfile */
/** @typedef {{ name: string, id: string }} HarmonyModel */

/** 10 种美学主题配置 */
export const THEME_PROFILES = [
  { name: '侘寂和风 (Wabi-Sabi)', sMin: 15, sMax: 38, lMin: 35, lMax: 72, hBias: null },
  { name: '莫兰迪 (Morandi Muted)', sMin: 20, sMax: 45, lMin: 50, lMax: 82, hBias: null },
  { name: '复古波普 (Retro Vintage)', sMin: 55, sMax: 85, lMin: 40, lMax: 65, hBias: null },
  { name: '鲜彩高光 (Vibrant Pop)', sMin: 70, sMax: 100, lMin: 50, lMax: 75, hBias: null },
  { name: '北欧极简 (Nordic Minimal)', sMin: 10, sMax: 30, lMin: 60, lMax: 90, hBias: null },
  { name: '日落晚霞 (Warm Sunset)', sMin: 50, sMax: 90, lMin: 45, lMax: 75, hBias: 'sunset' },
  { name: '海洋沉思 (Misty Ocean)', sMin: 30, sMax: 70, lMin: 30, lMax: 70, hBias: 'ocean' },
  { name: '莫奈花园 (Impressionist)', sMin: 40, sMax: 75, lMin: 55, lMax: 85, hBias: null },
  { name: '暗夜月影 (Deep Dark)', sMin: 25, sMax: 60, lMin: 12, lMax: 38, hBias: null },
  { name: '赛博霓虹 (Cyber Neon)', sMin: 80, sMax: 100, lMin: 45, lMax: 70, hBias: null },
];

/** 8 种色彩调和模型 */
export const HARMONY_MODELS = [
  { id: 'analogous', name: '类似色调和 (Analogous)' },
  { id: 'complementary', name: '互补撞色 (Complementary)' },
  { id: 'splitComplementary', name: '分裂补色 (Split-Comp)' },
  { id: 'triadic', name: '三原色和弦 (Triadic)' },
  { id: 'tetradic', name: '双重撞色 (Tetradic)' },
  { id: 'monochromatic', name: '单色渐变 (Monochromatic)' },
  { id: 'accentNeutral', name: '主色+中性色 (Accent & Neutral)' },
  { id: 'warmCool', name: '冷暖交融 (Warm-Cool Split)' },
];

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function wrapHue(h) {
  return ((h % 360) + 360) % 360;
}

/** 辅助区间随机数工具 */
export function randRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function hexToHsl(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return [0, 0, 50];
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let sat = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: break;
    }
  }
  return [Math.round(h * 360), Math.round(sat * 100), Math.round(l * 100)];
}

export function hslToHex(h, s, l) {
  const hh = wrapHue(h);
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n) => {
    const k = (n + hh / 30) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** OKLab ΔE² — large stripes need more than a just-noticeable difference. */
function minDistSqFor(harmonyId) {
  if (harmonyId === 'monochromatic') return 0.0032;
  if (harmonyId === 'analogous') return 0.006;
  if (harmonyId === 'accentNeutral') return 0.0055;
  return 0.0075;
}

function hueBudgetFor(harmonyId) {
  if (harmonyId === 'monochromatic') return 6;
  if (harmonyId === 'analogous') return 20;
  if (harmonyId === 'accentNeutral') return 14;
  return 40;
}

function normalizeLockedHexes(lockedColors) {
  if (!lockedColors?.length) return [];
  const out = [];
  for (const entry of lockedColors) {
    const hex = String(entry?.hex ?? entry ?? '').trim().toUpperCase();
    if (/^#[0-9A-F]{6}$/.test(hex)) out.push(hex);
  }
  return out;
}

function hueDeltaDeg(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Screen-level twins the OKLab floor can still miss (two near-blacks, two creams). */
function looksTheSameOnScreen(a, b) {
  const [h1, s1, l1] = hexToHsl(a);
  const [h2, s2, l2] = hexToHsl(b);
  if (l1 < 18 && l2 < 18) return true;
  if (l1 > 90 && l2 > 90) return true;
  if (s1 < 14 && s2 < 14 && Math.abs(l1 - l2) < 11) return true;
  return hueDeltaDeg(h1, h2) < 16 && Math.abs(s1 - s2) < 14 && Math.abs(l1 - l2) < 10;
}

function colorsTooClose(a, b, minSq) {
  if (!a || !b) return false;
  if (a.toUpperCase() === b.toUpperCase()) return true;
  if (looksTheSameOnScreen(a, b)) return true;
  return oklabDistSqFromHex(a, b) < minSq;
}

function paletteMinDistSq(hexes) {
  let min = Infinity;
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      min = Math.min(min, oklabDistSqFromHex(hexes[i], hexes[j]));
    }
  }
  return min;
}

function minDistToOccupied(hex, occupied) {
  if (!occupied.length) return Infinity;
  let min = Infinity;
  for (const other of occupied) {
    min = Math.min(min, oklabDistSqFromHex(hex, other));
  }
  return min;
}

/** Widen a tight theme L range just enough so 4–5 swatches can read as different. */
function expandLightRange(theme, count, harmonyId) {
  let lo = theme.lMin;
  let hi = theme.lMax;
  const step = harmonyId === 'monochromatic' ? 12 : 8;
  const minSpan = Math.max(harmonyId === 'monochromatic' ? 40 : 28, (count - 1) * step);
  if (hi - lo < minSpan) {
    const mid = (lo + hi) / 2;
    lo = clamp(mid - minSpan / 2, 8, 80);
    hi = clamp(lo + minSpan, 24, 94);
  }
  if (theme.lMax <= 42) hi = Math.max(hi, 58);
  if (theme.lMin >= 58) lo = Math.min(lo, 40);
  if (hi - lo < minSpan) {
    if (theme.lMax <= 42) lo = Math.max(8, hi - minSpan);
    else hi = Math.min(94, lo + minSpan);
  }
  return [lo, hi];
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function lightnessSlots(count, lMin, lMax, { shuffle = true } = {}) {
  if (count <= 1) return [randRange(lMin, lMax)];
  const step = (lMax - lMin) / (count - 1);
  const slots = Array.from({ length: count }, (_, i) => {
    const jitter = (Math.random() - 0.5) * Math.min(5, step * 0.35);
    return clamp(lMin + i * step + jitter, 8, 94);
  });
  return shuffle ? shuffleInPlace(slots) : slots;
}

function satSlots(count, sMin, sMax) {
  if (count <= 1) return [randRange(sMin, sMax)];
  const span = Math.max(8, sMax - sMin);
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const jitter = randRange(-4, 4);
    return clamp(sMin + t * span + jitter, 6, 100);
  });
}

function nudgeHexAway(hex, occupied, harmonyId, minSq) {
  const [h0, s0, l0] = hexToHsl(hex);
  const hueBudget = hueBudgetFor(harmonyId);
  const lTries = [0, 9, -9, 15, -15, 22, -22, 30, -30, 38, -38];
  const sTries = [0, 12, -12, 20, -20, 28, -28];
  const hTries = [0, 8, -8, 14, -14, 22, -22, 32, -32];

  for (const dh of hTries) {
    if (Math.abs(dh) > hueBudget) continue;
    for (const ds of sTries) {
      for (const dl of lTries) {
        if (dh === 0 && ds === 0 && dl === 0) continue;
        const next = hslToHex(h0 + dh, clamp(s0 + ds, 6, 100), clamp(l0 + dl, 8, 94));
        if (occupied.every((other) => !colorsTooClose(next, other, minSq))) return next;
      }
    }
  }
  return null;
}

function forceDistinctHex(hex, occupied, theme, harmonyId, minSq) {
  const [h0] = hexToHsl(hex);
  const hueBudget = hueBudgetFor(harmonyId);
  const hues = [0, -hueBudget, hueBudget, -Math.round(hueBudget / 2), Math.round(hueBudget / 2)];
  const sats = [
    clamp(theme.sMin + 8, 8, 100),
    clamp((theme.sMin + theme.sMax) / 2, 8, 100),
    clamp(theme.sMax - 4, 8, 100),
  ];
  for (const dh of hues) {
    for (const s of sats) {
      for (let l = 12; l <= 90; l += 7) {
        const next = hslToHex(h0 + dh, s, l);
        if (occupied.every((other) => !colorsTooClose(next, other, minSq))) return next;
      }
    }
  }
  return hex;
}

function ensureDistinctHexes(hexes, occupied, theme, harmonyId) {
  const minSq = minDistSqFor(harmonyId);
  const taken = occupied.map((h) => String(h).toUpperCase());
  const out = [];
  for (const raw of hexes) {
    let hex = String(raw).toUpperCase();
    if (taken.some((other) => colorsTooClose(hex, other, minSq))) {
      hex = nudgeHexAway(hex, taken, harmonyId, minSq) || hex;
    }
    if (taken.some((other) => colorsTooClose(hex, other, minSq))) {
      hex = forceDistinctHex(hex, taken, theme, harmonyId, minSq);
    }
    out.push(hex);
    taken.push(hex);
  }
  return out;
}

function pickTheme(forcedName) {
  if (forcedName) {
    const found = THEME_PROFILES.find((t) => t.name === forcedName || t.name.includes(forcedName));
    if (found) return found;
  }
  return THEME_PROFILES[Math.floor(Math.random() * THEME_PROFILES.length)];
}

function pickHarmony(forcedIdOrName) {
  if (forcedIdOrName) {
    const found = HARMONY_MODELS.find(
      (h) => h.id === forcedIdOrName || h.name === forcedIdOrName || h.name.includes(String(forcedIdOrName)),
    );
    if (found) return found;
  }
  return HARMONY_MODELS[Math.floor(Math.random() * HARMONY_MODELS.length)];
}

function sampleBaseHue(theme) {
  if (theme.hBias === 'sunset') {
    return Math.random() > 0.5
      ? Math.floor(Math.random() * 50) + 330
      : Math.floor(Math.random() * 45);
  }
  if (theme.hBias === 'ocean') {
    return Math.floor(Math.random() * 70) + 160;
  }
  return Math.floor(Math.random() * 360);
}

function baseHueFromLocked(lockedColors) {
  if (!lockedColors?.length) return null;
  for (const entry of lockedColors) {
    const hex = entry?.hex ?? entry;
    if (!hex) continue;
    const [h, s] = hexToHsl(hex);
    if (s > 8) return h;
  }
  const first = lockedColors[0]?.hex ?? lockedColors[0];
  if (first) return hexToHsl(first)[0];
  return null;
}

function hexAt(h, sSlots, lSlots, i) {
  return hslToHex(h, sSlots[i % sSlots.length], lSlots[i % lSlots.length]);
}

/** Build exactly `n` hex colors for a theme + harmony + base hue. */
function buildHarmonyColors(n, theme, harmonyId, baseH) {
  const count = clamp(Math.round(n), 2, 10);
  const [lo, hi] = expandLightRange(theme, count, harmonyId);
  const lights = lightnessSlots(count, lo, hi, { shuffle: harmonyId !== 'monochromatic' });
  const sats = satSlots(count, theme.sMin, theme.sMax);

  switch (harmonyId) {
    case 'analogous': {
      const spread = Math.floor(Math.random() * 16) + 18;
      const mid = (count - 1) / 2;
      return Array.from({ length: count }, (_, i) => {
        const h = baseH + (i - mid) * spread;
        return hexAt(h, sats, lights, i);
      });
    }
    case 'complementary': {
      const hubs = [baseH, baseH, baseH + 180, baseH + 180, baseH];
      while (hubs.length < count) hubs.push(hubs.length % 2 === 0 ? baseH : baseH + 180);
      return Array.from({ length: count }, (_, i) => hexAt(hubs[i], sats, lights, i));
    }
    case 'splitComplementary': {
      const hubs = [baseH, baseH + 150, baseH + 210, baseH, baseH + 150];
      while (hubs.length < count) hubs.push([baseH, baseH + 150, baseH + 210][hubs.length % 3]);
      return Array.from({ length: count }, (_, i) => hexAt(hubs[i], sats, lights, i));
    }
    case 'triadic': {
      const hubs = [baseH, baseH + 120, baseH + 240, baseH, baseH + 120];
      while (hubs.length < count) hubs.push([baseH, baseH + 120, baseH + 240][hubs.length % 3]);
      return Array.from({ length: count }, (_, i) => hexAt(hubs[i], sats, lights, i));
    }
    case 'tetradic': {
      const hubs = [baseH, baseH + 60, baseH + 180, baseH + 240, baseH];
      while (hubs.length < count) hubs.push([baseH, baseH + 60, baseH + 180, baseH + 240][hubs.length % 4]);
      return Array.from({ length: count }, (_, i) => hexAt(hubs[i], sats, lights, i));
    }
    case 'monochromatic': {
      const sat = randRange(theme.sMin, theme.sMax);
      return Array.from({ length: count }, (_, i) => {
        const s = clamp(sat + (i - (count - 1) / 2) * 5, 8, 100);
        return hslToHex(baseH, s, lights[i]);
      });
    }
    case 'accentNeutral': {
      const satAccent = Math.min(100, theme.sMax + 20);
      const neutralL = [90, 62, 38, 18, 74];
      const neutralS = [8, 14, 18, 22, 11];
      const pool = [hslToHex(baseH, satAccent, clamp(lights[0], 38, 68))];
      for (let i = 0; i < count - 1; i += 1) {
        pool.push(hslToHex(baseH, neutralS[i % neutralS.length], neutralL[i % neutralL.length]));
      }
      return pool.slice(0, count);
    }
    case 'warmCool':
    default: {
      const warmH = Math.floor(Math.random() * 60);
      const coolH = Math.floor(Math.random() * 80) + 170;
      const hubs = [warmH, warmH + 28, coolH, coolH + 18, warmH];
      while (hubs.length < count) hubs.push(hubs.length % 2 === 0 ? warmH : coolH);
      return Array.from({ length: count }, (_, i) => hexAt(hubs[i], sats, lights, i));
    }
  }
}

/**
 * Core matrix generator.
 * @param {{
 *   count?: number,
 *   themeName?: string | null,
 *   harmonyId?: string | null,
 *   lockedColors?: Array<{hex:string}|string> | null,
 * }} [options]
 * @returns {{ colors: Array<{hex:string,label:string}>, meta: object }}
 */
export function generateMatrixPalette(options = {}) {
  const count = options.count != null
    ? clamp(Math.round(options.count), 2, 10)
    : 5;

  const theme = pickTheme(options.themeName || options.styleId || null);
  const harmony = pickHarmony(options.harmonyId || null);

  let baseH = sampleBaseHue(theme);
  const lockedHexes = normalizeLockedHexes(options.lockedColors);
  const lockedHue = baseHueFromLocked(options.lockedColors);
  if (lockedHue != null) baseH = lockedHue;

  const minSq = minDistSqFor(harmony.id);
  const attempts = Math.max(6, options.maxAttempts ?? 10);
  let hexes = [];
  let bestScore = -1;

  for (let i = 0; i < attempts; i += 1) {
    const candidate = ensureDistinctHexes(
      buildHarmonyColors(count, theme, harmony.id, baseH),
      lockedHexes,
      theme,
      harmony.id,
    );
    const pairScore = paletteMinDistSq(candidate);
    const lockScore = lockedHexes.length
      ? Math.min(...candidate.map((hex) => minDistToOccupied(hex, lockedHexes)))
      : Infinity;
    const score = Math.min(pairScore, lockScore);
    if (score > bestScore) {
      hexes = candidate;
      bestScore = score;
    }
    if (score >= minSq) break;
  }

  const colors = hexes.map((hex) => ({
    hex,
    label: getPoeticColorName(hex),
  }));

  const meta = {
    styleId: theme.name,
    styleLabel: theme.name,
    theme: theme.name,
    category: 'matrix',
    mood: [theme.name, harmony.name],
    harmonyId: harmony.id,
    harmonyMode: harmony.id,
    harmonyName: harmony.name,
    saturationMode: theme.sMax >= 70 ? 'vibrant' : theme.sMax <= 38 ? 'muted' : 'balanced',
    brightnessMode: theme.lMax <= 40 ? 'lowKey' : theme.lMin >= 55 ? 'highKey' : 'balanced',
    primaryHue: Math.round(baseH),
    count,
    beautyScore: 78,
    beautyGrade: 'good',
    dominantColor: hexes[0],
    accentColor: hexes[hexes.length - 1],
    surprise: false,
    engine: 'matrix',
  };

  return { colors, meta };
}
