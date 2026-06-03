/**
 * 色空 Color Aesthetic Engine — Diversity First
 * 风格随机 → 颜色随机 → 美学约束 → 评分 → 输出（+ 历史去重）
 */
import { getPoeticColorName } from './poeticColorNaming';
import {
  wrapHueDeg,
  hexToOklch,
  lchToHexClamped,
  oklabDistSqFromHex,
} from './oklch.js';
import {
  UNIVERSE_STYLES,
  pickUniverseStyle,
  pickBalancedHueDomain,
  pickSaturationTier,
  pickLightnessMode,
  ensureSaturationTier,
  ensureLightnessMode,
  ensureHueDomain,
  samplePrimaryFromUniverse,
  pickDiscoverySpec,
  classifyHexDomain,
  paletteFingerprint,
  isTooSimilarToHistory,
  recordPaletteHistory,
  SATURATION_TIERS,
  LIGHTNESS_MODES,
  HUE_DOMAINS,
  UNIVERSE_STYLE_COUNT,
} from './colorUniverse.js';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function wrapHue(h) {
  return wrapHueDeg(h);
}

function hueDelta(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function pickWeighted(items) {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

export { UNIVERSE_STYLES as AESTHETIC_STYLES, UNIVERSE_STYLE_COUNT, HUE_DOMAINS, SATURATION_TIERS, LIGHTNESS_MODES };
export { pickUniverseStyle as pickAestheticStyle, getDomainStats, clearPaletteHistory } from './colorUniverse.js';

export const HARMONY_MODES = [
  { id: 'monochromatic', labelZh: '单色系', weight: 20 },
  { id: 'analogous', labelZh: '类似色', weight: 30 },
  { id: 'complementary', labelZh: '互补色', weight: 15 },
  { id: 'splitComplementary', labelZh: '分裂互补', weight: 20 },
  { id: 'triadic', labelZh: '三角配色', weight: 10 },
  { id: 'tetradic', labelZh: '四角配色', weight: 5 },
];

export function pickPaletteCount() {
  return pickWeighted([
    { value: 2, weight: 10 },
    { value: 3, weight: 15 },
    { value: 4, weight: 20 },
    { value: 5, weight: 20 },
    { value: 6, weight: 15 },
    { value: 7, weight: 10 },
    { value: 8, weight: 5 },
    { value: 9, weight: 3 },
    { value: 10, weight: 2 },
  ]);
}

export function pickHarmonyMode(forcedId) {
  if (forcedId) {
    const m = HARMONY_MODES.find((x) => x.id === forcedId);
    if (m) return m.id;
  }
  return pickWeighted(HARMONY_MODES.map((m) => ({ value: m.id, weight: m.weight })));
}

function harmonyHuesForCount(baseH, mode, n) {
  switch (mode) {
    case 'monochromatic':
      return Array.from({ length: n }, () => wrapHue(baseH + rand(-10, 10)));
    case 'analogous': {
      const span = rand(15, 35);
      const step = n > 1 ? span / (n - 1) : 0;
      return Array.from({ length: n }, (_, i) =>
        wrapHue(baseH - span / 2 + i * step + rand(-6, 6)),
      );
    }
    case 'complementary':
      return Array.from({ length: n }, (_, i) =>
        wrapHue((i % 2 === 0 ? baseH : baseH + 180) + rand(-20, 20)),
      );
    case 'splitComplementary': {
      const split = rand(25, 35);
      const pool = [baseH, wrapHue(baseH + 180 - split), wrapHue(baseH + 180 + split)];
      while (pool.length < n) pool.push(wrapHue(baseH + rand(-25, 25)));
      return pool.slice(0, n).map((h) => wrapHue(h + rand(-8, 8)));
    }
    case 'triadic': {
      const pool = [baseH, wrapHue(baseH + 120), wrapHue(baseH + 240)];
      while (pool.length < n) pool.push(pool[pool.length % 3]);
      return pool.slice(0, n).map((h) => wrapHue(h + rand(-10, 10)));
    }
    case 'tetradic': {
      const pool = [baseH, wrapHue(baseH + 90), wrapHue(baseH + 180), wrapHue(baseH + 270)];
      while (pool.length < n) pool.push(wrapHue(baseH + rand(0, 360)));
      return pool.slice(0, n).map((h) => wrapHue(h + rand(-12, 12)));
    }
    default:
      return harmonyHuesForCount(baseH, 'analogous', n);
  }
}

function assignLightnessSlots(n, lightMode) {
  const darkN = Math.max(1, Math.round(n * 0.2));
  const lightN = Math.max(1, Math.round(n * 0.3));
  let midN = n - darkN - lightN;
  if (midN < 0) midN = 0;
  const slots = [
    ...Array(darkN).fill('dark'),
    ...Array(midN).fill('mid'),
    ...Array(n - darkN - midN).fill('light'),
  ];
  while (slots.length < n) slots.push('mid');
  return slots.slice(0, n).sort(() => Math.random() - 0.5);
}

function lForSlot(slot, lightMode) {
  const map = {
    dark: lightMode.lDark,
    mid: lightMode.lMid,
    light: lightMode.lLight,
  };
  const [lo, hi] = map[slot] || lightMode.lMid;
  return clamp(rand(lo, hi), 0.05, 0.98);
}

function cForSlot(slot, satTier, isAccent) {
  const tier = ensureSaturationTier(satTier);
  const [lo, hi] = tier.cRange;
  if (isAccent) return clamp(rand(hi * 0.92, hi * 1.12), lo, 0.22);
  if (slot === 'dark') return clamp(rand(lo, (lo + hi) / 2), 0.004, 0.22);
  if (slot === 'light') return clamp(rand(lo * 0.85, hi * 0.75), 0.004, 0.18);
  return clamp(rand(lo, hi), 0.004, 0.22);
}

function buildPaletteSpec(primary, satTier, lightMode, harmonyId, count) {
  const n = clamp(Math.round(count), 2, 10);
  const hues = harmonyHuesForCount(primary.h, harmonyId, n);
  const lSlots = assignLightnessSlots(n, lightMode);
  const accentIdx = Math.floor(Math.random() * n);

  return hues.map((h, i) => {
    const isAccent = i === accentIdx;
    const l = i === 0 ? primary.l : lForSlot(lSlots[i], lightMode);
    const c = i === 0 ? primary.c : cForSlot(lSlots[i], satTier, isAccent);
    return {
      hex: lchToHexClamped(l, c, wrapHue(h)),
      _l: l,
      _c: c,
      _h: h,
    };
  });
}

function injectDiscoveryColor(specs, satTier) {
  if (specs.length < 2) return specs;
  const hues = specs.map((s) => s._h);
  const avgHue = hues.reduce((a, b) => a + b, 0) / hues.length;
  const disc = pickDiscoverySpec(avgHue, satTier);
  const idx = 1 + Math.floor(Math.random() * (specs.length - 1));
  const next = [...specs];
  next[idx] = {
    hex: lchToHexClamped(disc.l, disc.c, disc.h),
    _l: disc.l,
    _c: disc.c,
    _h: disc.h,
    _discovery: true,
  };
  return next;
}

function hasFluorescentClash(entries) {
  let neonGreen = false;
  let neonRed = false;
  let rgb = { r: false, g: false, b: false };
  for (const e of entries) {
    const o = hexToOklch(e.hex);
    if (o.c > 0.14) {
      if (o.h >= 115 && o.h <= 155) neonGreen = true;
      if (o.h <= 25 || o.h >= 350) neonRed = true;
      if (o.h <= 30 || o.h >= 330) rgb.r = true;
      if (o.h >= 210 && o.h <= 250) rgb.b = true;
      if (o.h >= 115 && o.h <= 155) rgb.g = true;
    }
  }
  if (neonGreen && neonRed) return true;
  if (rgb.r && rgb.g && rgb.b) return true;
  return false;
}

function paletteMetrics(entries) {
  const ls = [];
  const cs = [];
  const hues = [];
  for (const e of entries) {
    const o = hexToOklch(e.hex);
    ls.push(o.l);
    cs.push(o.c);
    if (o.c > 0.02) hues.push(o.h);
  }
  const n = entries.length;
  const avgL = ls.reduce((a, b) => a + b, 0) / n;
  const avgC = cs.reduce((a, b) => a + b, 0) / n;
  let spreadL = 0;
  let spreadC = 0;
  for (let i = 0; i < n; i++) {
    spreadL += Math.abs(ls[i] - avgL);
    spreadC += Math.abs(cs[i] - avgC);
  }
  let hueHarmony = 0;
  if (hues.length >= 2) {
    let sum = 0;
    let cnt = 0;
    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        sum += hueDelta(hues[i], hues[j]);
        cnt++;
      }
    }
    hueHarmony = cnt ? sum / cnt : 0;
  }
  let minDist = Infinity;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      minDist = Math.min(minDist, oklabDistSqFromHex(entries[i].hex, entries[j].hex));
    }
  }
  return {
    avgL,
    avgC,
    spreadL,
    spreadC,
    hueHarmony,
    minDist,
    darkCount: ls.filter((l) => l < 0.32).length,
    lightCount: ls.filter((l) => l > 0.72).length,
    lowSatCount: cs.filter((c) => c < 0.035).length,
  };
}

export function computeBeautyScore(entries, harmonyId, satTierId) {
  const m = paletteMetrics(entries);
  let hueScore = clamp(55 + m.hueHarmony * 0.4, 40, 100);
  if (harmonyId === 'analogous') hueScore = clamp(100 - Math.abs(m.hueHarmony - 28) * 2, 45, 100);
  if (harmonyId === 'complementary') hueScore = clamp(100 - Math.abs(m.hueHarmony - 85) * 1.2, 45, 100);

  let valueScore = m.spreadL > 0.1 ? clamp(65 + m.spreadL * 160, 0, 100) : clamp(m.spreadL * 350, 0, 60);
  if (m.darkCount >= 1 && m.lightCount >= 1) valueScore = clamp(valueScore + 12, 0, 100);

  let satScore = 65;
  if (m.spreadC > 0.015) satScore += 10;
  if (m.lowSatCount >= 1) satScore += 8;
  if (satTierId === 'ultra' || satTierId === 'high') {
    if (m.avgC > 0.08) satScore += 6;
  }
  if (m.avgC > 0.17 && m.lowSatCount < 1) satScore -= 15;
  satScore = clamp(satScore, 0, 100);

  const diversityScore = clamp(50 + m.spreadC * 380 + m.spreadL * 120, 40, 100);
  const discoveryBonus = entries.some((e) => e._discovery) ? 5 : 0;

  const total =
    hueScore * 0.35 +
    valueScore * 0.25 +
    satScore * 0.2 +
    diversityScore * 0.15 +
    discoveryBonus;

  return clamp(Math.round(total), 0, 100);
}

function passesQualityGates(entries) {
  const m = paletteMetrics(entries);
  if (m.minDist < 0.00015) return false;
  if (m.spreadL < 0.05) return false;
  if (hasFluorescentClash(entries)) return false;
  const allSameL = m.spreadL < 0.025;
  const allSameC = m.spreadC < 0.008;
  if (allSameL && allSameC) return false;
  return true;
}

function rootFromLocked(locked) {
  if (!locked?.length) return null;
  let hSum = 0;
  let n = 0;
  let lSum = 0;
  let cSum = 0;
  for (const e of locked) {
    const o = hexToOklch(e.hex);
    if (o.c > 0.012) {
      hSum += o.h;
      n++;
    }
    lSum += o.l;
    cSum += o.c;
  }
  if (n === 0) return { h: Math.random() * 360, l: lSum / locked.length, c: Math.max(0.03, cSum / locked.length) };
  return { h: wrapHue(hSum / n), l: lSum / locked.length, c: Math.max(0.03, cSum / locked.length) };
}

function lockedBonus(entries, locked) {
  if (!locked?.length) return 0;
  let bonus = 0;
  for (const c of entries) {
    for (const l of locked) {
      bonus += oklabDistSqFromHex(c.hex, l.hex) * 4000;
    }
  }
  return bonus;
}

function resolveStyle(forcedId) {
  if (!forcedId) return pickUniverseStyle(null);
  const byId = UNIVERSE_STYLES.find((s) => s.id === forcedId);
  if (byId) return byId;
  const byLabel = UNIVERSE_STYLES.find((s) => s.labelZh === forcedId || s.label === forcedId);
  if (byLabel) return byLabel;
  return pickUniverseStyle(null);
}

/**
 * Diversity First 生成管线
 * @returns {{ colors: Array<{ hex: string, label: string }>, meta: object }}
 */
export function generateAestheticPalette(options = {}) {
  const count = options.count != null ? clamp(Math.round(options.count), 2, 10) : pickPaletteCount();
  const minBeauty = options.minBeauty ?? 68;
  const maxAttempts = options.maxAttempts ?? 24;
  const locked = options.lockedColors?.length ? options.lockedColors : null;
  const lockedRoot = rootFromLocked(locked);
  const skipHistory = options.skipHistory === true;

  let best = null;
  let bestScore = -1;
  let bestMeta = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const relaxHistory = skipHistory || attempt >= Math.floor(maxAttempts * 0.55);
    const style = resolveStyle(options.styleId);
    const satTier = ensureSaturationTier(pickSaturationTier(options.saturationTier));
    const lightMode = ensureLightnessMode(pickLightnessMode(options.lightnessMode));
    const domain = ensureHueDomain(pickBalancedHueDomain());
    const harmonyId = pickHarmonyMode(options.harmonyId);

    const primary = lockedRoot
      ? {
          h: wrapHue(lockedRoot.h + rand(-10, 10)),
          l: clamp(lockedRoot.l + rand(-0.05, 0.05), 0.08, 0.95),
          c: clamp(lockedRoot.c * rand(0.88, 1.12), satTier.cRange[0], satTier.cRange[1]),
          domainId: classifyHexDomain(
            lchToHexClamped(lockedRoot.l, lockedRoot.c, lockedRoot.h),
          ),
        }
      : samplePrimaryFromUniverse(domain, satTier, lightMode);

    let specs = buildPaletteSpec(primary, satTier, lightMode, harmonyId, count);
    if (count >= 3 && Math.random() < 0.85) {
      specs = injectDiscoveryColor(specs, satTier);
    }

    let entries = specs.map(({ hex, _discovery }) => ({
      hex,
      label: getPoeticColorName(hex),
      _discovery,
    }));

    if (!passesQualityGates(entries)) continue;

    let beauty = computeBeautyScore(entries, harmonyId, satTier.id);
    beauty += lockedBonus(entries, locked) * 0.008;
    beauty = clamp(Math.round(beauty), 0, 100);

    const fingerprint = paletteFingerprint({
      primaryHue: primary.h,
      primaryDomain: primary.domainId,
      styleId: style.id,
      saturationTier: satTier.id,
      lightnessMode: lightMode.id,
    });

    if (!relaxHistory && isTooSimilarToHistory(fingerprint, 0.6)) continue;

    if (beauty >= minBeauty || beauty > bestScore) {
      if (beauty > bestScore) {
        bestScore = beauty;
        best = entries.map(({ hex, label }) => ({ hex, label }));
        bestMeta = {
          styleId: style.id,
          styleLabel: style.labelZh,
          category: style.category,
          harmonyId,
          saturationTier: satTier.id,
          saturationLabel: satTier.labelZh,
          lightnessMode: lightMode.id,
          lightnessLabel: lightMode.labelZh,
          primaryDomain: primary.domainId,
          primaryHue: Math.round(primary.h),
          count,
          beautyScore: beauty,
          discovery: specs.some((s) => s._discovery),
        };
      }
      if (beauty >= 82 && !skipHistory) break;
    }
  }

  if (!best) {
    const style = resolveStyle(options.styleId);
    const satTier = ensureSaturationTier(pickSaturationTier(null));
    const lightMode = ensureLightnessMode(pickLightnessMode(null));
    const domain = ensureHueDomain(pickBalancedHueDomain());
    const harmonyId = pickHarmonyMode(options.harmonyId);
    const primary = samplePrimaryFromUniverse(domain, satTier, lightMode);
    let specs = buildPaletteSpec(primary, satTier, lightMode, harmonyId, count);
    specs = injectDiscoveryColor(specs, satTier);
    best = specs.map(({ hex }) => ({ hex, label: getPoeticColorName(hex) }));
    bestMeta = {
      styleId: style.id,
      styleLabel: style.labelZh,
      harmonyId,
      saturationTier: satTier.id,
      lightnessMode: lightMode.id,
      primaryDomain: primary.domainId,
      beautyScore: computeBeautyScore(best, harmonyId, satTier.id),
      count,
      fallback: true,
    };
  }

  if (!skipHistory && bestMeta && !bestMeta.fallback) {
    recordPaletteHistory(
      paletteFingerprint({
        primaryHue: bestMeta.primaryHue,
        primaryDomain: bestMeta.primaryDomain,
        styleId: bestMeta.styleId,
        saturationTier: bestMeta.saturationTier,
        lightnessMode: bestMeta.lightnessMode,
      }),
    );
  }

  return { colors: best, meta: bestMeta };
}

export function aestheticPaletteEntries(count, options = {}) {
  return generateAestheticPalette({ ...options, count }).colors;
}
