/**
 * 色海标签：精简词表 + 分类面板（颜色 → 风格 → 主题）
 */

import {
  ALL_CANONICAL_SEA_TAGS,
  buildCanonicalTagBuckets,
  classifySeaTag,
  normalizeLegacySeaTag,
  SEA_COLOR_HUE_TAGS,
  SEA_DAILY_COLOR_TAG,
  SEA_STYLE_TAGS,
  SEA_TAG_CATEGORIES,
  SEA_THEME_TAGS,
} from './seaTagVocabulary.js';
import { getSeasonalQuickTagScores } from './seaTagSeasonality.js';

export { SEA_TAG_CATEGORIES, classifySeaTag } from './seaTagVocabulary.js';

/** 横向快捷栏最多展示数量（可横向滑动） */
export const QUICK_TAG_LIMIT = 20;

/** 热度不足时补位的默认标签（保证栏内多样） */
const QUICK_TAG_FALLBACK = [
  '红色', '蓝色', '绿色', '紫色', '粉色',
  '极简', '莫兰迪', '自然', '新中式',
  '海洋', '森林', '星空宇宙', '市集文创',
];

const META_TAG_DENY = [
  /^genom\s*daily$/i,
  /^color[-\s]?extract$/i,
  /^palette$/i,
  /^24\s*solar\s*terms$/i,
  /^中国色$/i,
  /^逐日观色$/i,
  /^色海导入$/i,
];

/**
 * @param {string} tag
 * @returns {boolean}
 */
export function isDisplayableSeaTag(tag) {
  const s = String(tag || '').trim();
  if (!s || s === 'All' || s === '全部') return false;
  if (META_TAG_DENY.some((re) => re.test(s))) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  if (ALL_CANONICAL_SEA_TAGS.has(s)) return true;
  return normalizeLegacySeaTag(s) != null;
}

function canonicalizeForFilter(tag) {
  const s = String(tag || '').trim();
  if (ALL_CANONICAL_SEA_TAGS.has(s)) return s;
  return normalizeLegacySeaTag(s);
}

function pushUnique(list, seen, tag) {
  const t = String(tag || '').trim();
  if (!t || !ALL_CANONICAL_SEA_TAGS.has(t) || seen.has(t)) return false;
  seen.add(t);
  list.push(t);
  return true;
}

/**
 * @param {string[]} rankedFromFeed
 * @param {{ dateKey?: string, limit?: number }} [options]
 * @returns {{
 *   quickTags: string[],
 *   categories: Array<{ id: string, label: string, tags: string[] }>,
 * }}
 */
export function buildColorSeaTagSets(rankedFromFeed = [], options = {}) {
  const buckets = buildCanonicalTagBuckets();
  const limit = options.limit ?? QUICK_TAG_LIMIT;
  const dateKey = options.dateKey;

  const popularity = new Map();
  rankedFromFeed.forEach((tag, i) => {
    if (tag === 'All') return;
    const c = canonicalizeForFilter(tag);
    if (!c) return;
    const rankScore = rankedFromFeed.length - i;
    popularity.set(c, Math.max(popularity.get(c) || 0, rankScore));
  });

  const seasonalScores = getSeasonalQuickTagScores(dateKey);
  const seasonalBoost = new Map(seasonalScores.map(({ tag, score }) => [tag, score]));

  const heatRanked = [...popularity.entries()]
    .sort((a, b) => {
      const boostA = seasonalBoost.get(a[0]) || 0;
      const boostB = seasonalBoost.get(b[0]) || 0;
      if (boostB !== boostA) return boostB - boostA;
      return b[1] - a[1];
    })
    .map(([tag]) => tag);

  const seen = new Set();
  const quickTags = [];

  pushUnique(quickTags, seen, SEA_DAILY_COLOR_TAG);

  for (const { tag, score } of seasonalScores) {
    if (quickTags.length >= limit) break;
    if (score < 45) break;
    pushUnique(quickTags, seen, tag);
    if (quickTags.filter((t) => seasonalBoost.has(t)).length >= 4) break;
  }

  for (const tag of heatRanked) {
    if (quickTags.length >= limit) break;
    pushUnique(quickTags, seen, tag);
  }

  for (const tag of QUICK_TAG_FALLBACK) {
    if (quickTags.length >= limit) break;
    pushUnique(quickTags, seen, tag);
  }

  const diversifyPool = [
    ...SEA_COLOR_HUE_TAGS,
    ...SEA_STYLE_TAGS,
    ...SEA_THEME_TAGS,
  ];
  for (const tag of diversifyPool) {
    if (quickTags.length >= limit) break;
    pushUnique(quickTags, seen, tag);
  }

  const categories = SEA_TAG_CATEGORIES.map(({ id, label }) => ({
    id,
    label,
    tags: buckets[id] || [],
  }));

  return { quickTags, categories };
}
