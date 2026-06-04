/**
 * 色卡展示层：英文题名 / 色名统一映射为中文（诗色谱 + 画意题名）
 */
import { getPoeticColorName, uniquePoeticNamesForSwatches } from './poeticColorNaming';
import { palettePoeticTitleFromHexes } from './palettePoeticTitle';
import { isGenericPaletteName } from './paletteDisplayTags';

/** 文本以中文为主（至少 2 个汉字，或短串全为汉字） */
export function isChineseDominantText(s) {
  const t = String(s || '').trim();
  if (!t) return false;
  const zh = (t.match(/[\u4e00-\u9fff]/g) || []).length;
  if (zh >= 2) return true;
  return zh >= 1 && t.length <= 4 && !/[A-Za-z]{3,}/.test(t);
}

/** 典型英文 AI / Coolors 风格题名 */
export function isLikelyEnglishPaletteTitle(s) {
  const t = String(s || '').trim();
  if (!t || isChineseDominantText(t)) return false;
  const latin = (t.match(/[A-Za-z]/g) || []).length;
  return latin >= Math.max(3, t.length * 0.45);
}

/**
 * 色卡标题：已是中文则保留，否则按 hex 生成稳定中文题名
 * @param {string | null | undefined} title
 * @param {Array<{ hex?: string, name?: string }>} colors
 */
export function resolveChinesePaletteTitle(title, colors = []) {
  const t = String(title || '').trim();
  const hexes = (colors || []).map((c) => c?.hex).filter(Boolean);

  if (isChineseDominantText(t)) return t;
  if (t && !isGenericPaletteName(t) && !isLikelyEnglishPaletteTitle(t)) return t;

  const poeticNames = (colors || [])
    .map((c) => String(c?.name || '').trim())
    .filter((n) => isChineseDominantText(n));
  if (poeticNames.length >= 2) return `${poeticNames[0]} · ${poeticNames[1]}`;
  if (poeticNames.length === 1) return `${poeticNames[0]}色组`;

  return palettePoeticTitleFromHexes(hexes);
}

/**
 * 各色样名称：非中文名替换为诗色谱二字名（同色卡内不重复）
 */
export function enrichColorsWithChineseNames(colors) {
  const raw = (Array.isArray(colors) ? colors : [])
    .map((c) => {
      if (typeof c === 'string') return { hex: c, name: '' };
      return { hex: c?.hex, name: String(c?.name || '').trim() };
    })
    .filter((c) => c?.hex);

  if (raw.length < 1) return raw;

  const poeticNames = uniquePoeticNamesForSwatches(raw);
  return raw.map((c, i) => {
    const name = isChineseDominantText(c.name)
      ? c.name
      : poeticNames[i] || getPoeticColorName(c.hex);
    return { hex: c.hex, name };
  });
}
