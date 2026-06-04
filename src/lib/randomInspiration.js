import { getPoeticColorName } from './poeticColorNaming';
import { generateAestheticPalette, AESTHETIC_STYLES, pickPaletteCount, clearPaletteHistory, getDomainStats } from './colorAestheticEngine.js';
import {
  wrapHueDeg,
  hexToRgb255,
  rgb255ToOklch,
  lchToHexClamped,
  oklabDistSqFromHex,
} from './oklch.js';

/** 国风名：按 RGB 空间与色谱样本最近邻，使名称与色相、明暗大体一致。 */
export function pickFunNameForHex(hex) {
  return getPoeticColorName(hex);
}

export function normalizeHex(hex) {
  const s = String(hex || '')
    .trim()
    .replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '#000000';
  return `#${s.toUpperCase()}`;
}

/**
 * 空生色 · 色轮和声类型（几何明确；与下方 mood 独立）。
 */
export const KONGSHENG_HARMONY_TYPES = [
  {
    id: 'monochromatic',
    label: 'Monochromatic',
    labelZh: '单色阶',
    title: 'Single hue with lightness/chroma steps.',
  },
  {
    id: 'analogous',
    label: 'Analogous',
    labelZh: '近似色',
    title: 'Adjacent hues on the wheel — serene, cohesive feel.',
  },
  {
    id: 'complementary',
    label: 'Complementary',
    labelZh: '互补色',
    title: 'Opposite hues — strong contrast; energy without neon clipping.',
  },
  {
    id: 'splitComplementary',
    label: 'Split Complementary',
    labelZh: '分裂互补',
    title: 'One base hue + two hues near its complement; rich but softer contrast.',
  },
  {
    id: 'triadic',
    label: 'Triadic',
    labelZh: '三色组',
    title: 'Three hues ~120° apart — rich and balanced.',
  },
  {
    id: 'tetradic',
    label: 'Tetradic',
    labelZh: '矩形四色',
    title: 'Two complementary pairs (rectangle); fifth bridges the set.',
  },
];

/** @type {Record<string, (typeof KONGSHENG_HARMONY_TYPES)[number]>} */
const HARMONY_BY_ID = Object.fromEntries(KONGSHENG_HARMONY_TYPES.map((h) => [h.id, h]));

const HARMONY_IDS_FOR_MIX = KONGSHENG_HARMONY_TYPES.map((h) => h.id);

/**
 * Visual moods (OKLCH L/C). Excludes geometry named "monochromatic" — use harmony Monochromatic instead.
 * API: randomPaletteHarmony(count, { styleId }).
 */
export const PALETTE_GENERATION_STYLES = [
  {
    id: 'pastel',
    label: 'Pastel',
    lRange: [0.74, 0.9],
    cRange: [0.032, 0.092],
    cCap: 0.12,
    lDeltaMul: 0.62,
    lJitter: 0.022,
    lClamp: [0.58, 0.94],
  },
  {
    id: 'vibrant',
    label: 'Vibrant',
    lRange: [0.46, 0.66],
    cRange: [0.085, 0.175],
    cCap: 0.21,
    lDeltaMul: 1,
    lJitter: 0.016,
    lClamp: [0.34, 0.78],
  },
  {
    id: 'muted',
    label: 'Muted',
    lRange: [0.44, 0.6],
    cRange: [0.022, 0.068],
    cCap: 0.08,
    lDeltaMul: 0.88,
    lJitter: 0.017,
    lClamp: [0.32, 0.72],
  },
  {
    id: 'deep',
    label: 'Deep',
    lRange: [0.26, 0.46],
    cRange: [0.055, 0.135],
    cCap: 0.175,
    lDeltaMul: 1.08,
    lJitter: 0.018,
    lClamp: [0.12, 0.52],
  },
  {
    id: 'balanced',
    label: 'Balanced',
    lRange: [0.48, 0.68],
    cRange: [0.048, 0.12],
    cCap: 0.155,
    lDeltaMul: 1,
    lJitter: 0.018,
    lClamp: [0.24, 0.86],
  },
];

/** Mood presets used for random / chip selection (no duplicate mono geometry). */
export const KONGSHENG_MOOD_STYLES = PALETTE_GENERATION_STYLES;

/** @type {Record<string, (typeof PALETTE_GENERATION_STYLES)[number]>} */
const STYLE_BY_ID = Object.fromEntries(PALETTE_GENERATION_STYLES.map((s) => [s.id, s]));

function pickRandomMoodStyle() {
  return PALETTE_GENERATION_STYLES[Math.floor(Math.random() * PALETTE_GENERATION_STYLES.length)];
}

function pickRandomHarmonyId() {
  return HARMONY_IDS_FOR_MIX[Math.floor(Math.random() * HARMONY_IDS_FOR_MIX.length)];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Random OKLCH envelope each attempt (空生色 mix): blends presets + extra span for versatile L/C.
 * Sets `id` to nearest named mood for scoring only; includes explicit quality knobs.
 */
function sampleEphemeralMoodStyle() {
  const presets = PALETTE_GENERATION_STYLES;
  const i = Math.floor(Math.random() * presets.length);
  let j = Math.floor(Math.random() * presets.length);
  if (j === i) j = (j + 1) % presets.length;
  const A = presets[i];
  const B = presets[j];
  const t = Math.random();

  let lLo = lerp(A.lRange[0], B.lRange[0], t);
  let lHi = lerp(A.lRange[1], B.lRange[1], t);
  if (lLo > lHi) [lLo, lHi] = [lHi, lLo];

  let cLo = lerp(A.cRange[0], B.cRange[0], t);
  let cHi = lerp(A.cRange[1], B.cRange[1], t);
  if (cLo > cHi) [cLo, cHi] = [cHi, cLo];

  if (Math.random() < 0.38) {
    lLo = clamp(lLo - Math.random() * 0.14, 0.05, 0.62);
    lHi = clamp(lHi + Math.random() * 0.12, Math.min(lLo + 0.18, 0.48), 0.97);
  }
  if (Math.random() < 0.32) {
    cLo = clamp(cLo - 0.028 * Math.random(), 0.006, 0.075);
    cHi = clamp(cHi + 0.045 * Math.random(), cLo + 0.018, 0.23);
  }

  const cCap = clamp(
    Math.max(cHi + 0.012, lerp(A.cCap, B.cCap, t) + (Math.random() - 0.5) * 0.048),
    cHi,
    0.25
  );
  const lDeltaMul = clamp(
    lerp(A.lDeltaMul ?? 1, B.lDeltaMul ?? 1, t) * (0.72 + Math.random() * 0.58),
    0.48,
    1.48
  );
  const lJitter = clamp(
    lerp(A.lJitter ?? 0.018, B.lJitter ?? 0.018, t) * (0.65 + Math.random() * 0.85),
    0.01,
    0.042
  );
  let lcA = A.lClamp || [0.24, 0.86];
  let lcB = B.lClamp || [0.24, 0.86];
  let lClampLo = clamp(lerp(lcA[0], lcB[0], t) - Math.random() * 0.1, 0.03, 0.42);
  let lClampHi = clamp(lerp(lcA[1], lcB[1], t) + Math.random() * 0.12, 0.56, 0.995);
  if (lClampLo > lClampHi) [lClampLo, lClampHi] = [lClampHi, lClampLo];

  const lDeltaScale = 0.78 + Math.random() * 0.52;
  const midL = (lLo + lHi) / 2;
  const midC = (cLo + cHi) / 2;

  let bestId = 'balanced';
  let bestDist = Infinity;
  for (const s of presets) {
    const ml = (s.lRange[0] + s.lRange[1]) / 2;
    const mc = (s.cRange[0] + s.cRange[1]) / 2;
    const d = (midL - ml) ** 2 * 2.2 + (midC - mc) ** 2 * 4.5;
    if (d < bestDist) {
      bestDist = d;
      bestId = s.id;
    }
  }

  const neutralCapable = cCap < 0.11 || midC < 0.058;
  const minAvgC = neutralCapable ? 0.01 : 0.022;
  const maxCAllow = Math.min(0.248, cCap + 0.042);
  const targetMidC = midC;

  return {
    id: bestId,
    ephemeral: true,
    lRange: [lLo, lHi],
    cRange: [cLo, cHi],
    cCap,
    lDeltaMul,
    lJitter,
    lClamp: [lClampLo, lClampHi],
    lDeltaScale,
    maxCAllow,
    minAvgC,
    neutralCapable,
    targetMidC,
  };
}

export function sampleHexForStyle(styleId) {
  const style = STYLE_BY_ID[styleId] || STYLE_BY_ID.balanced;
  const h = Math.random() * 360;
  const L = style.lRange[0] + Math.random() * (style.lRange[1] - style.lRange[0]);
  const C = style.cRange[0] + Math.random() * (style.cRange[1] - style.cRange[0]);
  return lchToHexClamped(L, Math.min(C, style.cCap), h);
}

export function randomHexColor() {
  return sampleHexForStyle(pickRandomMoodStyle().id);
}

function wrapHue(deg) {
  return wrapHueDeg(deg);
}

function hexToRgb(hex) {
  return hexToRgb255(normalizeHex(hex));
}

function rgbToOklch(r, g, b) {
  return rgb255ToOklch(r, g, b);
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function randomDesignRoot() {
  return { h0: wrapHue(Math.random() * 360) };
}

function jitterHueBy15(deg) {
  return wrapHue(deg + (Math.random() - 0.5) * 30);
}

/**
 * @param {{ id: string, ephemeral?: boolean, targetMidC?: number }} style
 */
function labSeparationOk(entries, monoHue, style, harmonyId) {
  const styleId = style.id;
  const n = entries.length;
  let minD = monoHue ? 0.00034 : 0.00068;
  if (styleId === 'muted') minD *= 0.8;
  if (styleId === 'vibrant') minD *= 1.08;
  if (styleId === 'pastel') minD *= 0.9;
  if (harmonyId === 'analogous') minD *= 0.88;
  if (harmonyId === 'complementary' || harmonyId === 'splitComplementary' || harmonyId === 'tetradic') minD *= 1.02;
  if (harmonyId === 'triadic') minD *= 0.98;
  if (style.ephemeral && typeof style.targetMidC === 'number') {
    minD *= clamp(0.58 + style.targetMidC * 4.2, 0.48, 1.05);
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (oklabDistSqFromHex(entries[i].hex, entries[j].hex) < minD) return false;
    }
  }
  return true;
}

function hueDelta(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * @param {typeof STYLE_BY_ID.balanced} style
 */
function entriesFromHuesOklch(huesWrapped, mode, compHue, style) {
  const n = huesWrapped.length;
  const shuff = [...huesWrapped.map((h, i) => ({ h, i }))].sort(() => Math.random() - 0.5);
  const mult = (style.lDeltaMul ?? 1) * (style.lDeltaScale ?? 1);
  const baseLDeltas =
    n === 5 ? [-0.085, -0.045, 0, 0.045, 0.075] : n === 4 ? [-0.07, -0.02, 0.035, 0.07] : [-0.055, 0, 0.055];
  const lDeltas = baseLDeltas.map((d) => d * mult);
  const cScales =
    n === 5 ? [0.78, 0.88, 1.06, 0.84, 0.93] : n === 4 ? [0.82, 0.92, 1.04, 0.88] : [0.86, 1.0, 1.05];
  const L0 = style.lRange[0] + Math.random() * (style.lRange[1] - style.lRange[0]);
  const C0 = style.cRange[0] + Math.random() * (style.cRange[1] - style.cRange[0]);
  const cCap = style.cCap;
  const lj = style.lJitter ?? 0.018;
  const [lLo, lHi] = style.lClamp || [0.2, 0.92];

  return shuff.map((item, j) => {
    const { h, i } = item;
    let L = L0 + lDeltas[j] + (Math.random() - 0.5) * lj * 2;
    let C = C0 * cScales[j] * (0.94 + Math.random() * 0.1);
    if (mode === 'complementSplit' && compHue != null) {
      const dh = hueDelta(h, compHue);
      if (dh < 42) {
        C *= 0.68;
        L = clamp(L + 0.016 + Math.random() * 0.018, lLo, lHi);
      }
    }
    C = clamp(C, 0.015, cCap);
    L = clamp(L, lLo, lHi);
    const hx = lchToHexClamped(L, C, wrapHue(h));
    return { hex: hx, label: pickFunNameForHex(hx), _ord: i };
  });
}

function sortByOriginalOrder(entries) {
  return [...entries].sort((a, b) => a._ord - b._ord).map(({ hex, label }) => ({ hex, label }));
}

function pickNFromFive(hues5, n) {
  if (hues5.length <= n) return hues5;
  const idx =
    n === 3 ? [0, 2, 4] : n === 4 ? [0, 1, 3, 4] : [0, 1, 2, 3, 4];
  return idx.map((i) => hues5[i]);
}

/** @param {typeof STYLE_BY_ID.balanced} style */
function monochromaticEntriesOklch(h0, n, style) {
  const span = 1.25;
  const h = wrapHue(h0 + (Math.random() - 0.5) * span);
  const mid = (style.lRange[0] + style.lRange[1]) / 2;
  const band = (style.lRange[1] - style.lRange[0]) * 0.42;
  const L0 = mid + (Math.random() - 0.5) * band;
  const C0 = style.cRange[0] + Math.random() * (style.cRange[1] - style.cRange[0]);
  const step = 0.066;
  const [lLo, lHi] = style.lClamp || [0.22, 0.88];
  const ks = n === 3 ? [-1.1, 0, 1.1] : n === 4 ? [-1.35, -0.45, 0.45, 1.2] : [-1.5, -0.75, 0, 0.65, 1.35];
  return ks.slice(0, n).map((k, idx) => {
    const L = clamp(L0 + k * step + (Math.random() - 0.5) * 0.016, lLo, lHi);
    const monoCCap = style.ephemeral ? Math.min(style.cCap, 0.2) : Math.min(style.cCap, 0.12);
    const C = clamp(C0 * (0.92 + idx * 0.035) * (0.96 + Math.random() * 0.08), 0.015, monoCCap);
    const hx = lchToHexClamped(L, C, h);
    return { hex: hx, label: pickFunNameForHex(hx) };
  });
}

function applyChromaDampenToEntries(entries, factor) {
  if (factor >= 0.995) return entries;
  return entries.map((e) => {
    const { r, g, b } = hexToRgb(e.hex);
    const o = rgbToOklch(r, g, b);
    const hx = lchToHexClamped(o.l, o.c * factor, o.h);
    return { hex: hx, label: pickFunNameForHex(hx), _ord: e._ord };
  });
}

function meanHueSeparationDegrees(entries) {
  const hues = [];
  for (const e of entries) {
    const { r, g, b } = hexToRgb(e.hex);
    const o = rgbToOklch(r, g, b);
    if (o.c > 0.032) hues.push(o.h);
  }
  if (hues.length < 2) return 0;
  let sum = 0;
  let cnt = 0;
  for (let i = 0; i < hues.length; i++) {
    for (let j = i + 1; j < hues.length; j++) {
      sum += hueDelta(hues[i], hues[j]);
      cnt += 1;
    }
  }
  return cnt ? sum / cnt : 0;
}

function paletteMetrics(entries) {
  let pairDist = 0;
  let maxC = 0;
  let sumL = 0;
  let sumC = 0;
  const ls = [];
  const n = entries.length;
  for (let i = 0; i < n; i++) {
    const { r, g, b } = hexToRgb(entries[i].hex);
    const o = rgbToOklch(r, g, b);
    sumL += o.l;
    sumC += o.c;
    ls.push(o.l);
    maxC = Math.max(maxC, o.c);
    for (let j = i + 1; j < n; j++) {
      pairDist += oklabDistSqFromHex(entries[i].hex, entries[j].hex);
    }
  }
  const avgL = sumL / n;
  const avgC = sumC / n;
  let spreadL = 0;
  for (const x of ls) spreadL += Math.abs(x - avgL);
  const hueSpread = meanHueSeparationDegrees(entries);
  return { pairDist, maxC, avgL, avgC, spreadL, hueSpread };
}

/**
 * Reject muddy, neon, or collapsed palettes (perceptual OKLCH).
 * @param {{ id: string, ephemeral?: boolean, maxCAllow?: number, minAvgC?: number, neutralCapable?: boolean, cCap?: number }} style
 */
function palettePassesQuality(entries, harmonyId, style) {
  const styleId = style.id;
  const m = paletteMetrics(entries);
  const maxCAllow = style.maxCAllow ?? (styleId === 'vibrant' ? 0.22 : 0.185);
  if (m.maxC > maxCAllow) return false;

  const minAvgC = style.minAvgC ?? 0.026;
  if (m.avgC < minAvgC) {
    const neutralOk =
      style.neutralCapable === true && (m.spreadL > 0.11 || m.maxC > 0.042 || m.pairDist > 0.045);
    if (!neutralOk) return false;
  }

  const avgCSoft =
    style.ephemeral && typeof style.cCap === 'number'
      ? clamp(style.cCap * 1.02, 0.17, 0.22)
      : styleId === 'vibrant'
        ? 0.22
        : 0.19;
  if (m.avgC > avgCSoft && styleId !== 'vibrant' && !(style.ephemeral && style.cCap > 0.17)) return false;

  const n = entries.length;
  let minPair = Infinity;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      minPair = Math.min(minPair, oklabDistSqFromHex(entries[i].hex, entries[j].hex));
    }
  }
  const minPairFloor = style.ephemeral && style.neutralCapable ? 0.00014 : 0.00022;
  if (minPair < minPairFloor) return false;

  if (harmonyId !== 'analogous' && harmonyId !== 'monochromatic' && m.spreadL < 0.022) return false;
  if (harmonyId === 'monochromatic' && m.spreadL < 0.035) return false;

  return true;
}

/**
 * Classical harmony geometry → five (or fewer) hues, then OKLCH L/C from mood style.
 * @param {typeof STYLE_BY_ID.balanced} style
 */
function buildHarmonyPalette(n, harmonyId, root, style) {
  const h0 = root.h0;
  const comp = wrapHue(h0 + 180);
  let damp = 0.965 + Math.random() * 0.03;

  switch (harmonyId) {
    case 'monochromatic': {
      const monoRoot = jitterHueBy15(h0);
      return monochromaticEntriesOklch(monoRoot, n, style);
    }
    case 'analogous': {
      const alpha = 42 + Math.random() * 10;
      const ks = n === 5 ? [-2, -1, 0, 1, 2] : n === 4 ? [-1.5, -0.5, 0.5, 1.5] : [-1, 0, 1];
      const hues = ks.map((k) => jitterHueBy15(h0 + k * alpha));
      const raw = entriesFromHuesOklch(hues, 'balanced', null, style);
      return sortByOriginalOrder(applyChromaDampenToEntries(raw, damp));
    }
    case 'complementary': {
      const j = 16 + Math.random() * 10;
      const hues5 = [
        jitterHueBy15(h0 - j * 0.35),
        jitterHueBy15(h0 + j * 0.45),
        jitterHueBy15(h0 + 180 - j * 0.4),
        jitterHueBy15(h0 + 180 + j * 0.4),
        jitterHueBy15(h0 + 90),
      ];
      const hues = pickNFromFive(hues5, n);
      const raw = entriesFromHuesOklch(hues, 'complementSplit', comp, style);
      return sortByOriginalOrder(applyChromaDampenToEntries(raw, damp * 0.965));
    }
    case 'splitComplementary': {
      const split = 30;
      const hues5 = [
        jitterHueBy15(h0),
        jitterHueBy15(h0),
        jitterHueBy15(h0 + 180 - split),
        jitterHueBy15(h0 + 180 + split),
        jitterHueBy15(h0 + 210),
      ];
      const hues = pickNFromFive(hues5, n);
      const raw = entriesFromHuesOklch(hues, 'complementSplit', comp, style);
      return sortByOriginalOrder(applyChromaDampenToEntries(raw, damp * 0.968));
    }
    case 'triadic': {
      const h1 = jitterHueBy15(h0);
      const h2 = jitterHueBy15(h0 + 120);
      const h3 = jitterHueBy15(h0 + 240);
      let hues;
      if (n <= 3) hues = [h1, h2, h3].slice(0, n);
      else if (n === 4) hues = [h1, h1, h2, h3];
      else hues = [h1, h1, h2, h2, h3];
      const raw = entriesFromHuesOklch(hues, 'balanced', null, style);
      return sortByOriginalOrder(applyChromaDampenToEntries(raw, damp));
    }
    case 'tetradic': {
      const delta = 90;
      const h1 = jitterHueBy15(h0);
      const h2 = jitterHueBy15(h0 + delta);
      const h3 = jitterHueBy15(h0 + 180);
      const h4 = jitterHueBy15(h0 + 180 + delta);
      const h5 = jitterHueBy15(h0 + 45);
      const hues5 = [h1, h2, h3, h4, h5];
      const hues = pickNFromFive(hues5, n);
      const raw = entriesFromHuesOklch(hues, 'complementSplit', comp, style);
      return sortByOriginalOrder(applyChromaDampenToEntries(raw, damp * 0.955));
    }
    default: {
      const alpha = 20 + Math.random() * 8;
      const ks = n === 5 ? [-2, -1, 0, 1, 2] : [-1, 0, 1];
      const hues = ks.map((k) => jitterHueBy15(h0 + k * alpha));
      const raw = entriesFromHuesOklch(hues, 'balanced', null, style);
      return sortByOriginalOrder(applyChromaDampenToEntries(raw, damp));
    }
  }
}

function paletteDesignScore(entries, styleId, harmonyId) {
  const { pairDist, maxC, avgL, avgC, spreadL, hueSpread } = paletteMetrics(entries);
  const penaltyNeon = (maxC > (styleId === 'vibrant' ? 0.2 : 0.15) ? (maxC - 0.15) * 8500 : 0);

  let base;
  switch (styleId) {
    case 'vibrant':
      base =
        pairDist * 92000 + maxC * 3800 + hueSpread * 26 + spreadL * 82 - Math.abs(avgL - 0.55) * 95 - penaltyNeon * 0.4;
      break;
    case 'pastel':
      base =
        pairDist * 108000 -
        Math.abs(avgL - 0.8) * 260 +
        spreadL * 98 +
        hueSpread * 17 -
        (maxC > 0.11 ? (maxC - 0.11) * 8200 : 0);
      break;
    case 'muted':
      base =
        pairDist * 128000 -
        Math.abs(avgC - 0.045) * 2100 +
        hueSpread * 15 +
        spreadL * 88 -
        maxC * 720;
      break;
    case 'deep':
      base = pairDist * 115000 - Math.abs(avgL - 0.36) * 230 + spreadL * 102 + hueSpread * 22 - penaltyNeon;
      break;
    default:
      base =
        pairDist * 126000 -
        maxC * 1850 -
        Math.abs(avgL - 0.6) * 115 +
        spreadL * 92 +
        hueSpread * 21 -
        penaltyNeon;
  }

  switch (harmonyId) {
    case 'analogous':
      return base + hueSpread * -0.35 + spreadL * 4;
    case 'complementary':
      return base + hueSpread * 8 - Math.abs(maxC - 0.11) * 400;
    case 'splitComplementary':
      return base + hueSpread * 9 - Math.abs(maxC - 0.11) * 320;
    case 'triadic':
      return base + hueSpread * 10 + Math.min(0, spreadL - 0.06) * 120;
    case 'tetradic':
      return base + hueSpread * 6 - penaltyNeon * 0.5;
    case 'monochromatic':
      return base + spreadL * 35 - hueSpread * 2;
    default:
      return base;
  }
}

/**
 * Derive a design root hue from locked color(s) so new swatches harmonize with them.
 */
function rootFromLockedColors(lockedEntries) {
  if (!lockedEntries || lockedEntries.length === 0) return null;
  let hSum = 0;
  let hCount = 0;
  for (const e of lockedEntries) {
    const { r, g, b } = hexToRgb(e.hex);
    const o = rgbToOklch(r, g, b);
    if (o.c > 0.015) {
      hSum += o.h;
      hCount++;
    }
  }
  if (hCount === 0) return { h0: Math.random() * 360 };
  return { h0: wrapHue(hSum / hCount) };
}

/**
 * Score how well candidate palette entries harmonize with locked entries.
 */
function lockedHarmonyBonus(candidateEntries, lockedEntries) {
  if (!lockedEntries || lockedEntries.length === 0) return 0;
  let bonus = 0;
  for (const c of candidateEntries) {
    for (const l of lockedEntries) {
      const dist = oklabDistSqFromHex(c.hex, l.hex);
      if (dist < 0.0003) bonus -= 500;
      else bonus += dist * 8000;
    }
  }
  return bonus;
}

/** 旧 mood id → 风格中文名（多样性引擎按 labelZh 匹配） */
const LEGACY_MOOD_TO_AESTHETIC = {
  pastel: '梦幻',
  vibrant: '热带水果',
  muted: '莫兰迪',
  deep: '暗色学院',
  balanced: '极简',
};

/**
 * @param {number} [count] 2..10；省略则由引擎按权重随机
 * @param {{ styleId?: string | null, harmonyId?: string | null, lockedColors?: Array<{hex:string}> | null }} [options]
 */
/** 同步兜底色盘，避免引擎重试阻塞 UI 时无内容 */
export function quickFallbackPalette(count = 5) {
  const seeds = ['#C93756', '#4F8A5B', '#2B7BA8', '#E8C48E', '#6B4FA8', '#FF4C00', '#8B5E3C', '#66A9C9'];
  const n = Math.max(2, Math.min(10, Math.round(count) || 5));
  return seeds.slice(0, n).map((hex) => ({ hex, label: pickFunNameForHex(hex) }));
}

export function randomPaletteHarmony(count, options = {}) {
  return randomPaletteHarmonyWithMeta(count, options).colors;
}

/**
 * Like randomPaletteHarmony but also returns engine `meta` for tag generation.
 * @returns {{ colors: Array<{hex:string,label:string}>, meta: object|null }}
 */
export function randomPaletteHarmonyWithMeta(count, options = {}) {
  const n =
    count != null && Number.isFinite(count)
      ? Math.max(2, Math.min(10, Math.round(count)))
      : undefined;

  const aestheticStyleId =
    options.styleId && LEGACY_MOOD_TO_AESTHETIC[options.styleId]
      ? LEGACY_MOOD_TO_AESTHETIC[options.styleId]
      : options.styleId || null;

  try {
    const result = generateAestheticPalette({
      count: n,
      styleId: aestheticStyleId,
      harmonyId: options.harmonyId || null,
      lockedColors: options.lockedColors || null,
      minBeauty: options.minBeauty ?? 70,
      maxAttempts: options.maxAttempts ?? 28,
      skipHistory: options.skipHistory ?? false,
    });
    if (Array.isArray(result.colors) && result.colors.length >= 2) {
      return { colors: result.colors, meta: result.meta ?? null };
    }
  } catch (e) {
    console.warn('randomPaletteHarmonyWithMeta failed, using fallback', e);
  }
  return { colors: quickFallbackPalette(n ?? 5), meta: null };
}

export {
  generateAestheticPalette,
  AESTHETIC_STYLES,
  pickPaletteCount,
  clearPaletteHistory,
  getDomainStats,
} from './colorAestheticEngine.js';

export { generatePaletteSchema } from './colorEngine.js';

export function randomSingleInspiration() {
  const hex = sampleHexForStyle(pickRandomMoodStyle().id);
  return { hex, funName: pickFunNameForHex(hex) };
}
