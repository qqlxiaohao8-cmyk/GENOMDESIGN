/**
 * 色空 Color Engine — Theme-first 9-step pipeline
 * 美观性 > 多样性 > 风格探索 > 色彩覆盖率 > 随机性
 */
import { getPoeticColorName } from './poeticColorNaming';
import {
  wrapHueDeg,
  hexToOklch,
  lchToHexClamped,
  oklabDistSqFromHex,
} from './oklch.js';
import {
  HUE_DOMAINS,
  SATURATION_TIERS,
  LIGHTNESS_MODES,
  UNIVERSE_STYLES,
  pickBalancedHueDomain,
  pickSaturationTier,
  pickLightnessMode,
  ensureSaturationTier,
  ensureLightnessMode,
  ensureHueDomain,
  samplePrimaryFromUniverse,
  classifyHexDomain,
  paletteFingerprint,
  isTooSimilarToHistory,
  recordPaletteHistory,
  paletteSimilarity,
  readPaletteHistory,
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

function newPaletteId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `pal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Weights ───────────────────────────────────────────────────────────────────

export const COUNT_WEIGHTS = [
  { value: 2, weight: 10 },
  { value: 3, weight: 15 },
  { value: 4, weight: 20 },
  { value: 5, weight: 20 },
  { value: 6, weight: 15 },
  { value: 7, weight: 10 },
  { value: 8, weight: 5 },
  { value: 9, weight: 3 },
  { value: 10, weight: 2 },
];

export const HARMONY_WEIGHTS_V2 = [
  { id: 'analogous', weight: 25 },
  { id: 'complementary', weight: 15 },
  { id: 'splitComplementary', weight: 20 },
  { id: 'triadic', weight: 15 },
  { id: 'tetradic', weight: 10 },
  { id: 'monochromatic', weight: 10 },
  { id: 'customTheme', weight: 5 },
];

export const SATURATION_MODES = [
  { id: 'muted', weight: 20, tierIds: ['low'] },
  { id: 'soft', weight: 20, tierIds: ['midLow'] },
  { id: 'balanced', weight: 20, tierIds: ['mid'] },
  { id: 'vibrant', weight: 20, tierIds: ['high', 'ultra'] },
  { id: 'mixed', weight: 20, tierIds: ['low', 'midLow', 'mid', 'midHigh', 'high'] },
];

export const BRIGHTNESS_MODES = [
  { id: 'highKey', lightModeId: 'highKey' },
  { id: 'lowKey', lightModeId: 'lowKey' },
  { id: 'balanced', lightModeId: 'balanced' },
];

export const SURPRISE_PROBABILITY = 0.30;

export const COLOR_FAMILIES = [
  'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'blue',
  'indigo', 'purple', 'pink', 'brown', 'gray', 'black', 'white', 'metallic',
];

const FAMILY_HISTORY_KEY = 'genom-color-family-history-v1';
const FAMILY_STATS_WINDOW = 100;

// ── Theme catalog (Step 1: Theme First) ─────────────────────────────────────

function themeEntry(
  category,
  slug,
  label,
  labelZh,
  primaryDomains,
  moodTags,
  opts = {},
) {
  return {
    id: `${category}-${slug}`,
    category,
    theme: slug,
    label,
    labelZh,
    primaryDomains,
    satBias: opts.satBias || 'mid',
    lightBias: opts.lightBias || 'balanced',
    moodTags,
    surpriseHueDelta: opts.surpriseHueDelta ?? 90,
    naturalHarmony: opts.naturalHarmony || 'analogous',
  };
}

function buildThemeCatalog() {
  const t = themeEntry;
  return [
    t('nature', 'forest', 'Forest', '森林', ['green', 'teal', 'brown'], ['calm', 'natural', 'grounded']),
    t('nature', 'ocean', 'Ocean', '海洋', ['cyan', 'blue', 'teal'], ['fresh', 'deep', 'flowing'], { surpriseHueDelta: 55 }),
    t('nature', 'coral-reef', 'Coral Reef', '珊瑚礁', ['pink', 'orange', 'cyan'], ['vivid', 'tropical', 'alive'], { naturalHarmony: 'triadic' }),
    t('nature', 'desert', 'Desert', '沙漠', ['orange', 'yellow', 'brown'], ['warm', 'dry', 'vast']),
    t('nature', 'volcano', 'Volcano', '火山', ['red', 'orange', 'black'], ['intense', 'raw', 'powerful'], { naturalHarmony: 'complementary' }),
    t('nature', 'aurora', 'Aurora', '极光', ['green', 'cyan', 'purple'], ['ethereal', 'magical', 'night'], { naturalHarmony: 'splitComplementary' }),
    t('nature', 'moss', 'Moss', '苔藓', ['green', 'lime', 'brown'], ['quiet', 'organic', 'humid']),
    t('nature', 'rain', 'Rain', '雨天', ['blue', 'gray', 'cyan'], ['melancholy', 'soft', 'cool'], { satBias: 'soft' }),
    t('nature', 'glacier', 'Glacier', '冰川', ['cyan', 'blue', 'white'], ['crisp', 'pure', 'cold'], { lightBias: 'highKey' }),

    t('art', 'impressionism', 'Impressionism', '印象派', ['blue', 'green', 'yellow'], ['soft', 'light', 'atmospheric'], { satBias: 'soft' }),
    t('art', 'bauhaus', 'Bauhaus', '包豪斯', ['red', 'blue', 'yellow'], ['bold', 'geometric', 'modern'], { naturalHarmony: 'triadic' }),
    t('art', 'memphis', 'Memphis', '孟菲斯', ['pink', 'cyan', 'yellow'], ['playful', 'retro', 'graphic'], { satBias: 'vibrant', naturalHarmony: 'tetradic' }),
    t('art', 'art-nouveau', 'Art Nouveau', '新艺术', ['green', 'gold', 'brown'], ['organic', 'ornate', 'elegant']),
    t('art', 'surrealism', 'Surrealism', '超现实主义', ['purple', 'orange', 'teal'], ['dreamy', 'strange', 'bold'], { naturalHarmony: 'splitComplementary' }),
    t('art', 'minimalism', 'Minimalism', '极简主义', ['gray', 'white', 'black'], ['clean', 'sparse', 'calm'], { satBias: 'muted' }),

    t('culture', 'dunhuang', 'Dunhuang', '敦煌', ['orange', 'green', 'brown'], ['ancient', 'sacred', 'earthy']),
    t('culture', 'song-dynasty', 'Song Dynasty', '宋代', ['gray', 'green', 'brown'], ['refined', 'scholarly', 'muted'], { satBias: 'soft' }),
    t('culture', 'edo', 'Edo', '江户', ['indigo', 'red', 'white'], ['traditional', 'elegant', 'contrast']),
    t('culture', 'persian', 'Persian', '波斯', ['blue', 'gold', 'red'], ['rich', 'ornate', 'royal'], { naturalHarmony: 'complementary' }),
    t('culture', 'byzantine', 'Byzantine', '拜占庭', ['purple', 'gold', 'red'], ['majestic', 'sacred', 'deep']),
    t('culture', 'mayan', 'Mayan', '玛雅', ['green', 'red', 'yellow'], ['earthy', 'ritual', 'sun']),

    t('emotion', 'melancholy', 'Melancholy', '忧郁', ['blue', 'gray', 'indigo'], ['sad', 'quiet', 'deep'], { lightBias: 'lowKey' }),
    t('emotion', 'romantic', 'Romantic', '浪漫', ['pink', 'red', 'purple'], ['warm', 'tender', 'soft']),
    t('emotion', 'peaceful', 'Peaceful', '宁静', ['green', 'blue', 'gray'], ['calm', 'serene', 'balanced']),
    t('emotion', 'energetic', 'Energetic', '热烈', ['red', 'orange', 'yellow'], ['vivid', 'passion', 'dynamic'], { satBias: 'vibrant' }),
    t('emotion', 'mystical', 'Mystical', '神秘', ['purple', 'indigo', 'black'], ['enigmatic', 'deep', 'night']),
    t('emotion', 'dreamy', 'Dreamy', '梦幻', ['pink', 'lavender', 'cyan'], ['soft', 'hazy', 'light'], { lightBias: 'highKey', satBias: 'soft' }),

    t('material', 'ceramic', 'Ceramic', '陶瓷', ['white', 'blue', 'brown'], ['crafted', 'delicate', 'classic']),
    t('material', 'bronze', 'Bronze', '青铜', ['brown', 'metallic', 'green'], ['aged', 'heavy', 'historic']),
    t('material', 'marble', 'Marble', '大理石', ['white', 'gray', 'blue'], ['luxury', 'cool', 'solid']),
    t('material', 'silk', 'Silk', '丝绸', ['pink', 'gold', 'red'], ['smooth', 'lustrous', 'refined']),
    t('material', 'glass', 'Glass', '玻璃', ['cyan', 'blue', 'white'], ['clear', 'light', 'modern'], { lightBias: 'highKey' }),
    t('material', 'wood', 'Wood', '木材', ['brown', 'orange', 'yellow'], ['warm', 'natural', 'grounded']),
    t('material', 'concrete', 'Concrete', '混凝土', ['gray', 'blue', 'brown'], ['urban', 'stark', 'industrial'], { satBias: 'muted' }),

    t('season', 'spring-blossom', 'Spring Blossom', '春日樱花', ['pink', 'green', 'white'], ['fresh', 'delicate', 'hope']),
    t('season', 'summer-heat', 'Summer Heat', '夏日海岸', ['cyan', 'yellow', 'orange'], ['bright', 'warm', 'vivid']),
    t('season', 'autumn-maple', 'Autumn Maple', '秋叶枫红', ['orange', 'red', 'brown'], ['nostalgic', 'warm', 'rich']),
    t('season', 'winter-frost', 'Winter Frost', '冬雪清晨', ['white', 'blue', 'gray'], ['crisp', 'quiet', 'cold'], { lightBias: 'highKey' }),
    t('season', 'rainy-season', 'Rainy Season', '梅雨时节', ['gray', 'green', 'blue'], ['damp', 'soft', 'moody']),
    t('season', 'golden-harvest', 'Golden Harvest', '金秋丰收', ['yellow', 'orange', 'brown'], ['abundant', 'warm', 'earthy']),

    t('fantasy', 'aurora-dream', 'Aurora Dream', '极光梦境', ['purple', 'cyan', 'pink'], ['magical', 'ethereal', 'vivid']),
    t('fantasy', 'deep-cosmos', 'Deep Cosmos', '星海深空', ['indigo', 'purple', 'black'], ['vast', 'mysterious', 'cold'], { lightBias: 'lowKey' }),
    t('fantasy', 'fairytale-pink', 'Fairytale Pink', '童话粉城', ['pink', 'purple', 'white'], ['sweet', 'whimsical', 'light']),
    t('fantasy', 'mythic-gold', 'Mythic Gold', '神话金殿', ['gold', 'red', 'purple'], ['grand', 'legendary', 'rich']),
    t('fantasy', 'enchanted-forest', 'Enchanted Forest', '魔法森林', ['green', 'lime', 'purple'], ['mystical', 'lush', 'hidden']),
    t('fantasy', 'crystal-cave', 'Crystal Cave', '水晶洞穴', ['cyan', 'purple', 'white'], ['sparkling', 'cool', 'deep']),

    t('architecture', 'brutalism', 'Brutalism', '粗野主义', ['gray', 'brown', 'black'], ['raw', 'heavy', 'urban'], { satBias: 'muted' }),
    t('architecture', 'japandi', 'Japandi', '侘寂北欧', ['beige', 'gray', 'green'], ['minimal', 'warm', 'calm'], { satBias: 'soft' }),
    t('architecture', 'art-deco-gold', 'Art Deco Gold', '装饰艺术', ['gold', 'black', 'teal'], ['glamorous', 'geometric', 'luxury']),
    t('architecture', 'mediterranean', 'Mediterranean Villa', '地中海白墙', ['white', 'blue', 'orange'], ['sunny', 'coastal', 'relaxed']),
    t('architecture', 'nordic-timber', 'Nordic Timber', '北欧木屋', ['brown', 'white', 'blue'], ['cozy', 'natural', 'light']),
    t('architecture', 'industrial-loft', 'Industrial Loft', '工业仓库', ['gray', 'brown', 'orange'], ['urban', 'loft', 'edgy']),

    t('fashion', 'streetwear-neon', 'Streetwear Neon', '街头霓虹', ['pink', 'cyan', 'lime'], ['bold', 'urban', 'youth'], { satBias: 'vibrant' }),
    t('fashion', 'haute-couture', 'Haute Couture Ivory', '高定象牙', ['white', 'black', 'gold'], ['elegant', 'luxury', 'refined']),
    t('fashion', 'tropical-resort', 'Tropical Resort', '热带度假', ['cyan', 'orange', 'pink'], ['vacation', 'bright', 'relaxed']),
    t('fashion', 'monochrome-edge', 'Monochrome Edge', '单色锋芒', ['black', 'white', 'gray'], ['sharp', 'editorial', 'modern']),
    t('fashion', 'sage-linen', 'Sage Linen', '鼠尾草麻布', ['green', 'gray', 'brown'], ['soft', 'natural', 'calm'], { satBias: 'soft' }),
    t('fashion', 'retro-denim', 'Retro Denim', '复古丹宁', ['blue', 'indigo', 'brown'], ['casual', 'vintage', 'cool']),

    t('food', 'spice-market', 'Spice Market', '香料集市', ['red', 'orange', 'yellow'], ['warm', 'aromatic', 'vivid']),
    t('food', 'matcha-ceremony', 'Matcha Ceremony', '抹茶仪式', ['green', 'lime', 'brown'], ['zen', 'fresh', 'earthy']),
    t('food', 'wine-cellar', 'Wine Cellar', '酒窖陈年', ['red', 'purple', 'brown'], ['rich', 'deep', 'aged'], { lightBias: 'lowKey' }),
    t('food', 'saffron-feast', 'Saffron Feast', '藏红花盛宴', ['yellow', 'orange', 'red'], ['festive', 'golden', 'warm']),
    t('food', 'berry-jam', 'Berry Jam', '浆果蜜酱', ['purple', 'red', 'pink'], ['sweet', 'lush', 'jam']),
    t('food', 'sea-salt-caramel', 'Sea Salt Caramel', '海盐焦糖', ['brown', 'yellow', 'white'], ['sweet', 'salty', 'comfort']),
  ].map((entry) => {
    if (entry.primaryDomains.includes('beige') || entry.primaryDomains.includes('gold') || entry.primaryDomains.includes('lavender')) {
      const map = { beige: 'brown', gold: 'yellow', lavender: 'purple' };
      return {
        ...entry,
        primaryDomains: entry.primaryDomains.map((d) => map[d] || d),
      };
    }
    return entry;
  });
}

export const THEME_CATALOG = buildThemeCatalog();
const THEME_BY_ID = Object.fromEntries(THEME_CATALOG.map((t) => [t.id, t]));

// ── Color family tracker (Step 2) ───────────────────────────────────────────

function readFamilyHistory() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(FAMILY_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-FAMILY_STATS_WINDOW) : [];
  } catch {
    return [];
  }
}

function recordColorFamily(domainId) {
  try {
    if (typeof localStorage === 'undefined') return;
    const hist = readFamilyHistory();
    hist.push(domainId);
    localStorage.setItem(FAMILY_HISTORY_KEY, JSON.stringify(hist.slice(-FAMILY_STATS_WINDOW)));
  } catch { /* ignore */ }
}

export function pickBalancedColorFamily(themeDomains = []) {
  const hist = readFamilyHistory();
  const stats = {};
  for (const f of COLOR_FAMILIES) stats[f] = 0;
  for (const id of hist) {
    if (stats[id] != null) stats[id] += 1;
  }
  const total = Math.max(hist.length, 1);

  const candidates = themeDomains?.length
    ? themeDomains.filter((d) => COLOR_FAMILIES.includes(d))
    : COLOR_FAMILIES;

  const items = candidates.map((id) => {
    const pct = (stats[id] || 0) / total;
    let weight = 1;
    if (pct < 0.05) weight = 3.5;
    else if (pct < 0.08) weight = 2;
    else if (pct > 0.15) weight = 0.3;
    else if (pct > 0.12) weight = 0.55;
    if (themeDomains.includes(id)) weight *= 1.4;
    return { value: id, weight };
  });

  return pickWeighted(items.length ? items : COLOR_FAMILIES.map((id) => ({ value: id, weight: 1 })));
}

// ── Pickers ─────────────────────────────────────────────────────────────────

export function pickPaletteCountV2() {
  return pickWeighted(COUNT_WEIGHTS);
}

export function pickHarmonyModeV2(forcedId, themeEntry = null) {
  if (forcedId && forcedId !== 'customTheme') {
    const m = HARMONY_WEIGHTS_V2.find((x) => x.id === forcedId);
    if (m) return m.id;
  }
  const picked = pickWeighted(HARMONY_WEIGHTS_V2.map((m) => ({ value: m.id, weight: m.weight })));
  if (picked === 'customTheme' && themeEntry?.naturalHarmony) {
    return themeEntry.naturalHarmony;
  }
  if (picked === 'customTheme') return 'analogous';
  return picked;
}

export function pickSaturationMode(forcedId) {
  if (forcedId) {
    const m = SATURATION_MODES.find((x) => x.id === forcedId);
    if (m) return m.id;
  }
  return pickWeighted(SATURATION_MODES.map((m) => ({ value: m.id, weight: m.weight })));
}

export function pickBrightnessMode(forcedId, themeEntry = null) {
  if (forcedId) {
    const m = BRIGHTNESS_MODES.find((x) => x.id === forcedId);
    if (m) return m.id;
  }
  if (themeEntry?.lightBias && ['highKey', 'lowKey', 'balanced'].includes(themeEntry.lightBias)) {
    if (Math.random() < 0.55) return themeEntry.lightBias;
  }
  const modes = BRIGHTNESS_MODES.map((m) => m.id);
  return modes[Math.floor(Math.random() * modes.length)];
}

export function pickTheme(forcedId) {
  if (forcedId) {
    if (THEME_BY_ID[forcedId]) return THEME_BY_ID[forcedId];
    const style = UNIVERSE_STYLES.find((s) => s.id === forcedId || s.labelZh === forcedId);
    if (style) {
      const match = THEME_CATALOG.find((t) => t.labelZh === style.labelZh && t.category === style.category);
      if (match) return match;
    }
  }
  return THEME_CATALOG[Math.floor(Math.random() * THEME_CATALOG.length)];
}

function saturationModeToTier(satMode, themeEntry, slotIndex = 0, n = 5) {
  const mode = SATURATION_MODES.find((m) => m.id === satMode) || SATURATION_MODES[2];
  if (satMode === 'mixed') {
    const tierId = mode.tierIds[slotIndex % mode.tierIds.length];
    return ensureSaturationTier(SATURATION_TIERS.find((t) => t.id === tierId));
  }
  const tierId = themeEntry?.satBias && satMode === 'balanced'
    ? (['muted', 'soft'].includes(themeEntry.satBias) ? themeEntry.satBias : themeEntry.satBias === 'vibrant' ? 'high' : 'mid')
    : mode.tierIds[Math.floor(Math.random() * mode.tierIds.length)];
  const map = { muted: 'low', soft: 'midLow', balanced: 'mid', vibrant: 'high' };
  const resolved = map[satMode] || tierId;
  return ensureSaturationTier(SATURATION_TIERS.find((t) => t.id === resolved) || pickSaturationTier(resolved));
}

function brightnessModeToLightMode(brightnessMode) {
  const m = BRIGHTNESS_MODES.find((b) => b.id === brightnessMode);
  const id = m?.lightModeId || 'balanced';
  return ensureLightnessMode(LIGHTNESS_MODES.find((x) => x.id === id) || pickLightnessMode(id));
}

// ── Harmony & build (from aesthetic engine, extended) ───────────────────────

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

function assignLightnessSlots(n, lightMode, brightnessMode) {
  let darkRatio = 0.2;
  let lightRatio = 0.3;
  if (brightnessMode === 'highKey') {
    darkRatio = 0.05;
    lightRatio = 0.55;
  } else if (brightnessMode === 'lowKey') {
    darkRatio = 0.45;
    lightRatio = 0.1;
  }
  const darkN = Math.max(1, Math.round(n * darkRatio));
  const lightN = Math.max(1, Math.round(n * lightRatio));
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
  const map = { dark: lightMode.lDark, mid: lightMode.lMid, light: lightMode.lLight };
  const [lo, hi] = map[slot] || lightMode.lMid;
  return clamp(rand(lo, hi), 0.05, 0.98);
}

function cForSlot(slot, satTier, isAccent, satMode) {
  const tier = ensureSaturationTier(satTier);
  const [lo, hi] = tier.cRange;
  if (isAccent) return clamp(rand(hi * 0.92, hi * 1.15), lo, 0.24);
  if (satMode === 'mixed' && slot === 'light') return clamp(rand(lo * 0.7, hi), lo, 0.24);
  if (slot === 'dark') return clamp(rand(lo, (lo + hi) / 2), 0.004, 0.24);
  if (slot === 'light') return clamp(rand(lo * 0.85, hi * 0.75), 0.004, 0.2);
  return clamp(rand(lo, hi), 0.004, 0.24);
}

function buildPaletteSpec(primary, satMode, themeEntry, lightMode, harmonyId, brightnessMode, count) {
  const n = clamp(Math.round(count), 2, 10);
  const hues = harmonyHuesForCount(primary.h, harmonyId, n);
  const lSlots = assignLightnessSlots(n, lightMode, brightnessMode);
  const accentIdx = n - 1;

  return hues.map((h, i) => {
    const tier = saturationModeToTier(satMode, themeEntry, i, n);
    const isAccent = i === accentIdx;
    const l = i === 0 ? primary.l : lForSlot(lSlots[i], lightMode);
    const c = i === 0 ? primary.c : cForSlot(lSlots[i], tier, isAccent, satMode);
    return {
      hex: lchToHexClamped(l, c, wrapHue(h)),
      _l: l,
      _c: c,
      _h: h,
      _tierId: tier.id,
      _role: i === 0 ? 'anchor' : isAccent ? 'accent' : 'support',
    };
  });
}

function injectSurprise(specs, themeEntry, satMode) {
  if (Math.random() >= SURPRISE_PROBABILITY || specs.length < 2) return specs;
  const hues = specs.map((s) => s._h);
  const avgHue = hues.reduce((a, b) => a + b, 0) / hues.length;
  const delta = themeEntry?.surpriseHueDelta ?? pickWeighted([
    { value: 55, weight: 20 },
    { value: 90, weight: 25 },
    { value: 140, weight: 20 },
    { value: 180, weight: 15 },
    { value: 220, weight: 20 },
  ]);
  const sign = Math.random() < 0.5 ? 1 : -1;
  const h = wrapHue(avgHue + sign * delta + rand(-10, 10));
  const tier = saturationModeToTier(satMode === 'mixed' ? 'vibrant' : satMode, themeEntry, 0, specs.length);
  const c = clamp(rand(tier.cRange[1] * 0.95, tier.cRange[1] * 1.2), tier.cRange[0], 0.24);
  const l = rand(0.42, 0.78);
  const idx = specs.length - 1;
  const next = [...specs];
  next[idx] = {
    hex: lchToHexClamped(l, c, h),
    _l: l,
    _c: c,
    _h: h,
    _surprise: true,
    _role: 'accent',
  };
  return next;
}

const GRADIENT_MODES = ['hueGradient', 'brightnessGradient', 'saturationGradient', 'themeNarrative'];

function applyGradientOrder(specs, gradientMode) {
  const list = [...specs];
  if (gradientMode === 'hueGradient') {
    list.sort((a, b) => a._h - b._h);
  } else if (gradientMode === 'brightnessGradient') {
    list.sort((a, b) => a._l - b._l);
  } else if (gradientMode === 'saturationGradient') {
    list.sort((a, b) => a._c - b._c);
    const surprise = list.find((s) => s._surprise);
    if (surprise) {
      const rest = list.filter((s) => !s._surprise);
      return [...rest, surprise];
    }
  } else {
    const anchor = list.reduce((best, s) => (s._l < best._l ? s : best), list[0]);
    const accent = list.find((s) => s._surprise) || list.reduce((best, s) => (s._c > best._c ? s : best), list[0]);
    const support = list.filter((s) => s !== anchor && s !== accent);
    support.sort((a, b) => a._h - b._h);
    return [anchor, ...support, accent];
  }
  return list;
}

function assignArchitecture(specs) {
  const gradientMode = GRADIENT_MODES[Math.floor(Math.random() * GRADIENT_MODES.length)];
  const ordered = applyGradientOrder(specs, gradientMode);
  return ordered.map((s, i) => ({
    ...s,
    _role: i === 0 ? 'anchor' : i === ordered.length - 1 ? 'accent' : 'support',
  }));
}

// ── Quality & metrics ───────────────────────────────────────────────────────

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
  const minL = Math.min(...ls);
  const maxL = Math.max(...ls);
  return {
    avgL,
    avgC,
    spreadL,
    spreadC,
    hueHarmony,
    minDist,
    minL,
    maxL,
    darkCount: ls.filter((l) => l < 0.32).length,
    lightCount: ls.filter((l) => l > 0.72).length,
    midCount: ls.filter((l) => l >= 0.32 && l <= 0.72).length,
    lowSatCount: cs.filter((c) => c < 0.035).length,
  };
}

function passesQualityGates(entries) {
  const m = paletteMetrics(entries);
  if (m.minDist < 0.00015) return false;
  if (m.spreadL < 0.05) return false;
  if (hasFluorescentClash(entries)) return false;
  if (m.spreadL < 0.025 && m.spreadC < 0.008) return false;
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
  if (n === 0) {
    return { h: Math.random() * 360, l: lSum / locked.length, c: Math.max(0.03, cSum / locked.length) };
  }
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

function maxHistorySimilarity(fingerprint) {
  const history = readPaletteHistory();
  let max = 0;
  for (const entry of history) {
    max = Math.max(max, paletteSimilarity(fingerprint, entry));
  }
  return max;
}

/** Step 9: 7-component beauty score */
export function scoreBeautyV2(entries, ctx = {}) {
  const m = paletteMetrics(entries);
  const harmonyId = ctx.harmonyId || 'analogous';
  const satMode = ctx.saturationMode || 'balanced';
  const brightnessMode = ctx.brightnessMode || 'balanced';
  const themeEntry = ctx.themeEntry;

  let harmonyScore = clamp(55 + m.hueHarmony * 0.45, 40, 100);
  const targets = {
    analogous: 28,
    complementary: 85,
    splitComplementary: 55,
    triadic: 60,
    tetradic: 45,
    monochromatic: 12,
  };
  const target = targets[harmonyId] ?? 35;
  harmonyScore = clamp(100 - Math.abs(m.hueHarmony - target) * (harmonyId === 'complementary' ? 1.1 : 1.8), 45, 100);

  const lRatio = m.maxL > 0.05 ? m.maxL / Math.max(m.minL, 0.05) : 1;
  let contrastScore = clamp(40 + m.spreadL * 200 + Math.min(lRatio, 8) * 4, 0, 100);
  if (m.darkCount >= 1 && m.lightCount >= 1) contrastScore = clamp(contrastScore + 15, 0, 100);

  let valueStructure = 55;
  if (brightnessMode === 'highKey' && m.avgL > 0.72) valueStructure += 20;
  else if (brightnessMode === 'lowKey' && m.avgL < 0.38) valueStructure += 20;
  else if (brightnessMode === 'balanced' && m.darkCount >= 1 && m.lightCount >= 1) valueStructure += 18;
  valueStructure = clamp(valueStructure + m.spreadL * 80, 0, 100);

  let satBalance = clamp(50 + m.spreadC * 400, 0, 100);
  if (satMode === 'mixed' && m.lowSatCount >= 1 && m.avgC > 0.06) satBalance = clamp(satBalance + 18, 0, 100);
  if (m.avgC > 0.18 && m.lowSatCount < 1 && satMode !== 'vibrant') satBalance -= 12;
  satBalance = clamp(satBalance, 0, 100);

  let themeConsistency = 70;
  if (themeEntry?.primaryDomains?.length) {
    const matchN = entries.filter((e) => themeEntry.primaryDomains.includes(classifyHexDomain(e.hex))).length;
    themeConsistency = clamp(40 + (matchN / entries.length) * 55, 0, 100);
  }

  const sim = ctx.skipUniqueness ? 0 : maxHistorySimilarity(ctx.fingerprint);
  const uniqueness = clamp(100 - sim * 100, 0, 100);

  let surpriseFactor = 0;
  const hasSurprise = entries.some((e) => e._surprise);
  if (hasSurprise && entries.length >= 2) {
    const anchor = entries[0];
    const sur = entries.find((e) => e._surprise);
    if (sur && oklabDistSqFromHex(anchor.hex, sur.hex) > 0.08) surpriseFactor = 100;
    else if (sur) surpriseFactor = 60;
  }

  const total =
    harmonyScore * 0.25 +
    contrastScore * 0.2 +
    valueStructure * 0.15 +
    satBalance * 0.15 +
    themeConsistency * 0.1 +
    uniqueness * 0.1 +
    surpriseFactor * 0.05;

  return clamp(Math.round(total), 0, 100);
}

export function beautyGrade(score) {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'acceptable';
  return 'reject';
}

function extendedFingerprint(meta) {
  return paletteFingerprint({
    primaryHue: meta.primaryHue,
    primaryDomain: meta.primaryDomain,
    styleId: meta.styleId,
    saturationTier: meta.saturationTier,
    lightnessMode: meta.lightnessMode,
    theme: meta.theme,
    harmonyMode: meta.harmonyMode,
    brightnessMode: meta.brightnessMode,
    saturationMode: meta.saturationMode,
  });
}

/**
 * @param {object} [options]
 * @returns {{ palette: object, entries: Array<{hex:string,label:string}>, meta: object }}
 */
export function generateEnginePalette(options = {}) {
  const count = options.count != null ? clamp(Math.round(options.count), 2, 10) : pickPaletteCountV2();
  const minBeauty = options.minBeauty ?? 70;
  const maxAttempts = options.maxAttempts ?? 28;
  const locked = options.lockedColors?.length ? options.lockedColors : null;
  const lockedRoot = rootFromLocked(locked);
  const skipHistory = options.skipHistory === true;

  let bestEntries = null;
  let bestPalette = null;
  let bestMeta = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const relaxHistory = skipHistory || attempt >= Math.floor(maxAttempts * 0.55);

    const themeEntry = pickTheme(options.themeId || options.styleId);
    const domainId = pickBalancedColorFamily(themeEntry.primaryDomains);
    const domain = ensureHueDomain(HUE_DOMAINS.find((d) => d.id === domainId) || pickBalancedHueDomain());
    const satMode = pickSaturationMode(options.saturationMode);
    const brightnessMode = pickBrightnessMode(options.brightnessMode, themeEntry);
    const lightMode = brightnessModeToLightMode(brightnessMode);
    const harmonyId = pickHarmonyModeV2(options.harmonyId, themeEntry);
    const satTier = saturationModeToTier(satMode, themeEntry);

    const primary = lockedRoot
      ? {
          h: wrapHue(lockedRoot.h + rand(-10, 10)),
          l: clamp(lockedRoot.l + rand(-0.05, 0.05), 0.08, 0.95),
          c: clamp(lockedRoot.c * rand(0.88, 1.12), satTier.cRange[0], satTier.cRange[1]),
          domainId: classifyHexDomain(lchToHexClamped(lockedRoot.l, lockedRoot.c, lockedRoot.h)),
        }
      : samplePrimaryFromUniverse(domain, satTier, lightMode);

    let specs = buildPaletteSpec(primary, satMode, themeEntry, lightMode, harmonyId, brightnessMode, count);
    specs = injectSurprise(specs, themeEntry, satMode);
    specs = assignArchitecture(specs);

    const entries = specs.map(({ hex, _surprise, _discovery }) => ({
      hex,
      label: getPoeticColorName(hex),
      _surprise,
      _discovery,
    }));

    if (!passesQualityGates(entries)) continue;

    const fingerprint = extendedFingerprint({
      primaryHue: primary.h,
      primaryDomain: primary.domainId,
      styleId: themeEntry.id,
      saturationTier: satTier.id,
      lightnessMode: lightMode.id,
      theme: themeEntry.theme,
      harmonyMode: harmonyId,
      brightnessMode,
      saturationMode: satMode,
    });

    let beauty = scoreBeautyV2(entries, {
      harmonyId,
      saturationMode: satMode,
      brightnessMode,
      themeEntry,
      fingerprint,
      skipUniqueness: relaxHistory,
    });
    beauty += lockedBonus(entries, locked) * 0.008;
    beauty = clamp(Math.round(beauty), 0, 100);

    if (!relaxHistory && isTooSimilarToHistory(fingerprint, 0.6)) continue;

    if (beauty >= minBeauty || beauty > bestScore) {
      if (beauty > bestScore) {
        bestScore = beauty;
        const colors = specs.map((s) => s.hex);
        bestEntries = entries.map(({ hex, label }) => ({ hex, label }));
        bestPalette = {
          id: newPaletteId(),
          theme: themeEntry.theme,
          category: themeEntry.category,
          mood: [...themeEntry.moodTags],
          harmonyMode: harmonyId,
          brightnessMode,
          saturationMode: satMode,
          beautyScore: beauty,
          colors,
          dominantColor: colors[0],
          accentColor: colors[colors.length - 1],
        };
        bestMeta = {
          styleId: themeEntry.id,
          styleLabel: themeEntry.labelZh,
          category: themeEntry.category,
          theme: themeEntry.theme,
          mood: themeEntry.moodTags,
          harmonyId,
          harmonyMode: harmonyId,
          saturationTier: satTier.id,
          saturationMode: satMode,
          lightnessMode: lightMode.id,
          brightnessMode,
          primaryDomain: primary.domainId,
          primaryHue: Math.round(primary.h),
          count,
          beautyScore: beauty,
          beautyGrade: beautyGrade(beauty),
          dominantColor: colors[0],
          accentColor: colors[colors.length - 1],
          surprise: specs.some((s) => s._surprise),
        };
      }
      if (beauty >= 82 && !skipHistory) break;
    }
  }

  if (!bestEntries) {
    const themeEntry = pickTheme(options.themeId);
    const domain = ensureHueDomain(pickBalancedHueDomain());
    const satMode = pickSaturationMode(null);
    const brightnessMode = pickBrightnessMode(null, themeEntry);
    const lightMode = brightnessModeToLightMode(brightnessMode);
    const harmonyId = pickHarmonyModeV2(options.harmonyId, themeEntry);
    const satTier = saturationModeToTier(satMode, themeEntry);
    const primary = samplePrimaryFromUniverse(domain, satTier, lightMode);
    let specs = buildPaletteSpec(primary, satMode, themeEntry, lightMode, harmonyId, brightnessMode, count);
    specs = injectSurprise(specs, themeEntry, satMode);
    specs = assignArchitecture(specs);
    const colors = specs.map((s) => s.hex);
    bestEntries = specs.map(({ hex }) => ({ hex, label: getPoeticColorName(hex) }));
    bestPalette = {
      id: newPaletteId(),
      theme: themeEntry.theme,
      category: themeEntry.category,
      mood: [...themeEntry.moodTags],
      harmonyMode: harmonyId,
      brightnessMode,
      saturationMode: satMode,
      beautyScore: scoreBeautyV2(bestEntries, { harmonyId, saturationMode: satMode, brightnessMode, themeEntry }),
      colors,
      dominantColor: colors[0],
      accentColor: colors[colors.length - 1],
    };
    bestMeta = { ...bestPalette, styleId: themeEntry.id, styleLabel: themeEntry.labelZh, fallback: true };
  }

  if (!skipHistory && bestMeta && !bestMeta.fallback) {
    recordPaletteHistory(
      extendedFingerprint({
        primaryHue: bestMeta.primaryHue,
        primaryDomain: bestMeta.primaryDomain,
        styleId: bestMeta.styleId,
        saturationTier: bestMeta.saturationTier,
        lightnessMode: bestMeta.lightnessMode,
        theme: bestMeta.theme,
        harmonyMode: bestMeta.harmonyMode,
        brightnessMode: bestMeta.brightnessMode,
        saturationMode: bestMeta.saturationMode,
      }),
    );
    recordColorFamily(bestMeta.primaryDomain);
  }

  return { palette: bestPalette, entries: bestEntries, meta: bestMeta };
}

export function generatePaletteSchema(options = {}) {
  return generateEnginePalette(options).palette;
}
