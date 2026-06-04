/**
 * 色空 Color Aesthetic Engine — delegates to Color Engine (theme-first pipeline)
 */
import {
  UNIVERSE_STYLES,
  HUE_DOMAINS,
  SATURATION_TIERS,
  LIGHTNESS_MODES,
  UNIVERSE_STYLE_COUNT,
} from './colorUniverse.js';
import {
  generateEnginePalette,
  pickPaletteCountV2,
  scoreBeautyV2,
  HARMONY_WEIGHTS_V2,
} from './colorEngine.js';

export { UNIVERSE_STYLES as AESTHETIC_STYLES, UNIVERSE_STYLE_COUNT, HUE_DOMAINS, SATURATION_TIERS, LIGHTNESS_MODES };
export { pickUniverseStyle as pickAestheticStyle, getDomainStats, clearPaletteHistory } from './colorUniverse.js';

export const HARMONY_MODES = HARMONY_WEIGHTS_V2.map((m) => ({
  id: m.id,
  labelZh:
    {
      analogous: '类似色',
      complementary: '互补色',
      splitComplementary: '分裂互补',
      triadic: '三角配色',
      tetradic: '四角配色',
      monochromatic: '单色系',
      customTheme: '主题配色',
    }[m.id] || m.id,
  weight: m.weight,
}));

export function pickPaletteCount() {
  return pickPaletteCountV2();
}

export function pickHarmonyMode(forcedId) {
  if (forcedId) {
    const m = HARMONY_MODES.find((x) => x.id === forcedId);
    if (m) return m.id;
  }
  const total = HARMONY_MODES.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of HARMONY_MODES) {
    r -= item.weight;
    if (r <= 0) return item.id;
  }
  return HARMONY_MODES[0].id;
}

export function computeBeautyScore(entries, harmonyId, satTierId) {
  return scoreBeautyV2(entries, {
    harmonyId,
    saturationMode: satTierId === 'low' ? 'muted' : satTierId === 'midLow' ? 'soft' : satTierId === 'mid' ? 'balanced' : satTierId === 'high' || satTierId === 'ultra' ? 'vibrant' : 'balanced',
  });
}

/**
 * Diversity First 生成管线 → Color Engine
 * @returns {{ colors: Array<{ hex: string, label: string }>, meta: object }}
 */
export function generateAestheticPalette(options = {}) {
  const result = generateEnginePalette({
    count: options.count,
    themeId: options.styleId,
    styleId: options.styleId,
    harmonyId: options.harmonyId,
    brightnessMode: options.brightnessMode,
    saturationMode: options.saturationMode,
    lockedColors: options.lockedColors,
    minBeauty: options.minBeauty ?? 70,
    maxAttempts: options.maxAttempts ?? 28,
    skipHistory: options.skipHistory === true,
  });

  const { entries, meta, palette } = result;
  const colors = entries || [];

  const enrichedMeta = meta
    ? {
        ...meta,
        saturationLabel: meta.saturationMode,
        lightnessLabel: meta.brightnessMode,
        discovery: meta.surprise,
        paletteId: palette?.id,
      }
    : null;

  return { colors, meta: enrichedMeta };
}

export function aestheticPaletteEntries(count, options = {}) {
  return generateAestheticPalette({ ...options, count }).colors;
}
