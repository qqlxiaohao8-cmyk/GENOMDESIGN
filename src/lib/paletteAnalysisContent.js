import { itemColorCardData } from '../components/StyleUiPreviewCard';
import { isDisplayableSeaTag } from './colorSeaTags';
import { generatePaletteTags } from './paletteTags';
import {
  getPoeticColorEntry,
  getPoeticColorName,
  getPoeticQuoteForHex,
  uniquePoeticNamesForSwatches,
} from './poeticColorNaming';

function normalizeHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toUpperCase()}`;
}

function colorIntro(hex, name) {
  const { zh, zhSource } = getPoeticQuoteForHex(hex);
  if (zh && zhSource) return `「${zh}」— ${zhSource}`;
  if (zh) return `「${zh}」`;
  return `「${name}」与 #${hex.replace(/^#/, '')} 在诗色谱中相近，可作该色的意象参考。`;
}

/**
 * Resolve the public style id used for like/favorite counts.
 * Vault copies map back via sourceStyleId / favoritedFrom.
 */
export function resolvePublicStyleId(item) {
  if (!item) return null;
  const sid = item.extractionSnapshot?.sourceStyleId ?? item.extractionSnapshot?.favoritedFrom;
  if (sid) return sid;
  if (item.isPublic) return item.id;
  return null;
}

export function resolvePaletteLikeCount(item, exploreFeed = []) {
  if (!item) return 0;
  const publicId = resolvePublicStyleId(item);
  if (publicId && publicId !== item.id) {
    const source = exploreFeed.find((i) => i.id === publicId);
    if (source) return Number(source?.likeCount) || 0;
  }
  if (typeof item.likeCount === 'number') return Math.max(0, item.likeCount);
  if (!publicId) return 0;
  const source = exploreFeed.find((i) => i.id === publicId);
  return Number(source?.likeCount) || 0;
}

/**
 * @param {object} item vault / community style row
 * @param {{ exploreFeed?: object[], likeCountOverride?: number }} [opts]
 */
export function buildPaletteAnalysis(item, opts = {}) {
  const cd = itemColorCardData(item);
  if (!cd?.colors?.length) return null;

  const snap = item?.extractionSnapshot;
  const snapColors = snap?.colorCardData?.colors;
  const rawColors = (Array.isArray(snapColors) && snapColors.length
    ? snapColors
    : cd.colors
  ).slice(0, 10);

  const hasSnapNames = rawColors.every((c) => String(c?.name || '').trim());
  const poeticNames = hasSnapNames ? [] : uniquePoeticNamesForSwatches(rawColors);
  const colors = rawColors.map((c, i) => {
    const hex = normalizeHex(c.hex) || '#888888';
    const name = String(c.name || '').trim()
      || poeticNames[i]
      || getPoeticColorName(hex);
    const entry = getPoeticColorEntry(hex);
    const quote = getPoeticQuoteForHex(hex);
    return {
      hex,
      name,
      intro: colorIntro(hex, name),
      poem: quote.zh || entry.poem || '',
      poemSource: quote.zhSource || '',
    };
  });

  const title =
    (snap?.aesthetic || item?.aesthetic || '').trim() ||
    colors[0]?.name ||
    '未命名色卡';

  const hexes = colors.map((c) => c.hex);
  const keywordTags = (snap?.keywords || item?.keywords || [])
    .map((k) => String(k).trim())
    .filter((k) => k && isDisplayableSeaTag(k));
  const engineTags = Array.isArray(snap?.engineTags) && snap.engineTags.length
    ? snap.engineTags.map((t) => String(t).trim()).filter(Boolean)
    : generatePaletteTags(hexes, snap?.paletteMeta || {}, keywordTags);
  const tagSeen = new Set();
  const tags = [];
  for (const t of [...keywordTags, ...engineTags]) {
    if (tagSeen.has(t)) continue;
    tagSeen.add(t);
    tags.push(t);
    if (tags.length >= 6) break;
  }

  const likeCount = typeof opts.likeCountOverride === 'number'
    ? Math.max(0, opts.likeCountOverride)
    : resolvePaletteLikeCount(item, opts.exploreFeed);

  return {
    id: item.id,
    publicStyleId: resolvePublicStyleId(item),
    title,
    colors,
    tags,
    likeCount,
    inVault: true,
  };
}
