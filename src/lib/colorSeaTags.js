/**
 * 色海标签：完整可搜词表 + 分类（颜色 → 风格 → 主题，从左到右展示）
 */

import { UNIVERSE_STYLES } from './colorUniverse.js';

const META_TAG_DENY = [
  /^genom\s*daily$/i,
  /^color[-\s]?extract$/i,
  /^palette$/i,
  /^24\s*solar\s*terms$/i,
  /^中国色$/i,
  /^逐日观色$/i,
];

const HUE_DOMAIN_TAGS = [
  '红色系', '橙色系', '黄色系', '绿色系', '青色系', '蓝色系', '靛色系',
  '紫色系', '粉色系', '褐色系', '灰色系', '黑色', '白色', '金属色',
];

const COLOR_FEEL_TAGS = [
  '暖色', '冷色', '浅色', '深色', '高饱和', '低饱和', '极简灰', '对比',
];

const STYLE_CATEGORY_TAGS = ['自然', '艺术', '情绪', '素材', '设计'];

const THEME_CATEGORY_LABEL = '文化';

const HARMONY_TAGS = [
  '单色阶', '近似色', '互补色', '分裂互补', '三角配色', '四角配色',
];

/** 设计类中偏场景/氛围 → 主题 */
const THEME_DESIGN_LABELS = new Set([
  '海洋', '森林', '日落', '黎明', '星空', '糖果', '咖啡', '岩石', '植物',
  '金属', '雾感', '热带水果', '复古游戏', '梦幻',
]);

/** 横向快捷栏 */
export const COLOR_SEA_QUICK_TAGS = [
  '每日色卡',
  '暖色', '冷色', '红色系', '蓝色系', '自然', '艺术', '莫兰迪', '互补色', '苔藓', '竹林',
];

/** @type {{ id: 'color' | 'style' | 'theme', label: string }[]} */
export const SEA_TAG_CATEGORIES = [
  { id: 'color', label: '颜色' },
  { id: 'style', label: '风格' },
  { id: 'theme', label: '主题' },
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
  if (/[\u4e00-\u9fff]/.test(s)) return s.length >= 2 && s.length <= 14;
  return false;
}

const styleLabelSet = new Set(
  UNIVERSE_STYLES.filter((s) =>
    ['nature', 'art', 'emotion', 'material', 'design'].includes(s.category)
    && !THEME_DESIGN_LABELS.has(s.labelZh),
  ).map((s) => s.labelZh),
);

const themeLabelSet = new Set([
  ...HARMONY_TAGS,
  ...UNIVERSE_STYLES.filter((s) => s.category === 'culture').map((s) => s.labelZh),
  ...THEME_DESIGN_LABELS,
  '每日色卡',
]);

/**
 * @param {string} tag
 * @returns {'color' | 'style' | 'theme'}
 */
export function classifySeaTag(tag) {
  const s = String(tag || '').trim();
  if (COLOR_FEEL_TAGS.includes(s) || HUE_DOMAIN_TAGS.includes(s)) return 'color';
  if (HARMONY_TAGS.includes(s) || themeLabelSet.has(s)) return 'theme';
  if (STYLE_CATEGORY_TAGS.includes(s) || styleLabelSet.has(s)) return 'style';
  if (/色系$/.test(s)) return 'color';
  if (/配色$|色阶$/.test(s)) return 'theme';
  return 'style';
}

function sortZh(tags) {
  return [...tags].sort((a, b) => a.localeCompare(b, 'zh-Hans'));
}

function buildMasterBuckets() {
  const buckets = {
    color: sortZh([...new Set([...COLOR_FEEL_TAGS, ...HUE_DOMAIN_TAGS])]),
    style: sortZh([
      ...new Set([
        ...STYLE_CATEGORY_TAGS,
        ...UNIVERSE_STYLES.filter(
          (s) =>
            ['nature', 'art', 'emotion', 'material', 'design'].includes(s.category)
            && !THEME_DESIGN_LABELS.has(s.labelZh),
        ).map((s) => s.labelZh),
      ]),
    ]),
    theme: sortZh([
      ...new Set([
        THEME_CATEGORY_LABEL,
        ...HARMONY_TAGS,
        ...UNIVERSE_STYLES.filter(
          (s) => s.category === 'culture' || THEME_DESIGN_LABELS.has(s.labelZh),
        ).map((s) => s.labelZh),
      ]),
    ]),
  };
  return buckets;
}

function addToBucket(buckets, bucketSeen, tag) {
  if (!isDisplayableSeaTag(tag)) return;
  const cat = classifySeaTag(tag);
  if (bucketSeen[cat].has(tag)) return;
  bucketSeen[cat].add(tag);
  buckets[cat].push(tag);
}

/**
 * @param {string[]} rankedFromFeed
 * @returns {{
 *   quickTags: string[],
 *   categories: Array<{ id: string, label: string, tags: string[] }>,
 * }}
 */
export function buildColorSeaTagSets(rankedFromFeed = []) {
  const buckets = buildMasterBuckets();
  const bucketSeen = {
    color: new Set(buckets.color),
    style: new Set(buckets.style),
    theme: new Set(buckets.theme),
  };

  const fromFeed = rankedFromFeed.filter((t) => t !== 'All' && isDisplayableSeaTag(t));
  for (const tag of fromFeed) {
    addToBucket(buckets, bucketSeen, tag);
  }

  for (const id of SEA_TAG_CATEGORIES) {
    buckets[id.id] = sortZh(buckets[id.id]);
  }

  const seen = new Set();
  const quickTags = [];
  for (const t of COLOR_SEA_QUICK_TAGS) {
    if (seen.has(t)) continue;
    seen.add(t);
    quickTags.push(t);
  }
  for (const cat of SEA_TAG_CATEGORIES) {
    for (const t of buckets[cat.id]) {
      if (quickTags.length >= 20) break;
      if (seen.has(t)) continue;
      seen.add(t);
      quickTags.push(t);
    }
  }

  const categories = SEA_TAG_CATEGORIES.map(({ id, label }) => ({
    id,
    label,
    tags: buckets[id] || [],
  }));

  return { quickTags, categories };
}
