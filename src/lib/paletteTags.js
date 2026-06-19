/**
 * 色卡自动标签：从 hex + 引擎 meta 派生精简后的色海标签（最多 5 个）。
 */

import { hexToOklch } from './oklch.js';
import { classifyHexDomain } from './colorUniverse.js';
import {
  assembleSeaTags,
  broadStyleFromMeta,
  broadThemeFromMeta,
  harmonyTagFromId,
  normalizeLegacySeaTag,
  inferStyleFromTitle,
  inferThemeFromTitle,
  SEA_STYLE_TAGS,
  SEA_THEME_TAGS,
} from './seaTagVocabulary.js';

const DOMAIN_TO_HUE = {
  red: '红色',
  orange: '橙色',
  yellow: '黄色',
  green: '绿色',
  lime: '绿色',
  cyan: '青色',
  blue: '蓝色',
  indigo: '蓝色',
  purple: '紫色',
  pink: '粉色',
  brown: '棕色',
  gray: '灰色',
  black: '黑色',
  white: '白色',
  metallic: '灰色',
};

function normHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toUpperCase()}`;
}

function collectOklch(hexes) {
  const out = [];
  for (const h of hexes) {
    const n = normHex(h);
    if (n) out.push(hexToOklch(n));
  }
  return out;
}

function dominantHueTag(hexes) {
  const counts = new Map();
  for (const h of hexes) {
    const n = normHex(h);
    if (!n) continue;
    const domain = classifyHexDomain(n);
    const tag = DOMAIN_TO_HUE[domain];
    if (!tag) continue;
    counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  let best = null;
  let bestN = 0;
  for (const [tag, n] of counts) {
    if (n > bestN) {
      best = tag;
      bestN = n;
    }
  }
  return best;
}

/**
 * @param {string[]} hexes
 * @param {{
 *   primaryDomain?: string,
 *   category?: string,
 *   styleLabel?: string,
 *   harmonyId?: string,
 * }} [meta]
 * @param {string[]} [legacyKeywords]
 * @param {string} [paletteTitle]
 * @returns {string[]}
 */
export function generatePaletteTags(hexes, meta = {}, legacyKeywords = [], paletteTitle = '') {
  const safeMeta = meta && typeof meta === 'object' ? meta : {};
  const legacy = Array.isArray(legacyKeywords) ? legacyKeywords : [];
  const mappedLegacy = legacy.map((k) => normalizeLegacySeaTag(k)).filter(Boolean);

  const legacyStyle = mappedLegacy.find(
    (t) => SEA_STYLE_TAGS.includes(t) && t !== '现代',
  ) || null;
  const legacyTheme = mappedLegacy.find((t) => SEA_THEME_TAGS.includes(t)) || null;

  const domain = safeMeta.primaryDomain || null;
  const hueFromMeta = domain ? DOMAIN_TO_HUE[domain] : null;
  const harmonyTheme = harmonyTagFromId(safeMeta.harmonyId);

  return assembleSeaTags({
    hue: hueFromMeta || dominantHueTag(hexes || []),
    style: legacyStyle || inferStyleFromTitle(paletteTitle) || broadStyleFromMeta(safeMeta.styleLabel, safeMeta.category),
    theme: legacyTheme || inferThemeFromTitle(paletteTitle) || broadThemeFromMeta(safeMeta.styleLabel, safeMeta.category) || harmonyTheme,
    colorFeel: [],
    legacy: [
      ...legacy,
      ...(harmonyTheme && !legacyTheme && !inferThemeFromTitle(paletteTitle) ? [harmonyTheme] : []),
    ],
  });
}

export { normalizeLegacySeaTag };
