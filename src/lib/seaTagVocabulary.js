/**
 * 色海标签词表：仅保留最通用、易分类的标签（颜色 / 风格 / 主题）。
 */

/** @typedef {'color' | 'style' | 'theme'} SeaTagCategory */

export const SEA_DAILY_COLOR_TAG = '每日色卡';

export const SEA_COLOR_HUE_TAGS = [
  '红色', '橙色', '黄色', '绿色', '青色', '蓝色', '紫色', '粉色', '棕色', '米色', '灰色', '黑色', '白色',
];

/** @deprecated 色感词不再作为色海「颜色」类筛选标签 */
export const SEA_COLOR_FEEL_TAGS = [];

export const SEA_STYLE_TAGS = [
  '极简', '现代', '复古', '自然', '奶油', '马卡龙', '莫兰迪', '温柔韩系', 'ins 清新',
  '新中式', 'Y2K', '赛博朋克', '学院风', '田园风', '暗黑哥特', '波西米亚',
];

export const SEA_THEME_TAGS = [
  '海洋', '森林', '星空宇宙', '山川湖泊',
  '春节', '中秋', '端午', '圣诞节', '情人节',
  '青春校园', '毕业季', '开学季', '校园青春',
  '生日派对', '婚礼婚庆', '成人礼', '金榜题名',
  '运动会', '音乐节', '市集文创', '公益环保',
  '24节气',
  '考试季', '寒暑假', '读书季', '年终',
  '元旦', '腊八', '元宵', '妇女节', '植树节', '清明', '愚人节', '劳动节', '青年节',
  '母亲节', '护士节', '儿童节', '父亲节', '七夕',
  '重阳', '国庆节', '抗战纪念日', '国家公祭日', '万圣节', '感恩节',
];

export const SEA_SPECIAL_TAGS = [SEA_DAILY_COLOR_TAG];

export const SEA_TAG_CATEGORIES = [
  { id: 'color', label: '颜色' },
  { id: 'style', label: '风格' },
  { id: 'theme', label: '主题' },
];

export const ALL_CANONICAL_SEA_TAGS = new Set([
  ...SEA_COLOR_FEEL_TAGS,
  ...SEA_COLOR_HUE_TAGS,
  ...SEA_STYLE_TAGS,
  ...SEA_THEME_TAGS,
  ...SEA_SPECIAL_TAGS,
]);

/** @deprecated 快捷栏改由 buildColorSeaTagSets 动态生成 */
export const COLOR_SEA_QUICK_TAGS = [
  '每日色卡',
  '红色', '蓝色', '绿色',
  '极简', '莫兰迪', '海洋', '森林',
];

const HUE_LEGACY_MAP = {
  红色系: '红色', 橙色系: '橙色', 黄色系: '黄色', 绿色系: '绿色',
  青色系: '青色', 蓝色系: '蓝色', 靛色系: '蓝色', 紫色系: '紫色',
  粉色系: '粉色', 褐色系: '棕色', 棕色系: '棕色', 灰色系: '灰色',
  金属色: '灰色', 黑白: null,
  红色: '红色', 橙色: '橙色', 黄色: '黄色', 绿色: '绿色',
  青色: '青色', 蓝色: '蓝色', 紫色: '紫色', 粉色: '粉色',
  棕色: '棕色', 米色: '米色', 灰色: '灰色', 黑色: '黑色', 白色: '白色',
};

const DROP_LEGACY_FEEL = new Set([
  '暖色', '冷色', '浅色', '深色', '高饱和', '低饱和', '极简灰', '对比',
]);

const HARMONY_CANONICAL = {
  monochromatic: null,
  analogous: null,
  complementary: null,
  splitComplementary: null,
  triadic: null,
  tetradic: null,
};

/** 旧主题名 / 引擎细项 → 新主题词表 */
const THEME_LABEL_MAP = {
  海洋: '海洋', 深海: '海洋', 海岸: '海洋', 夏日海岸: '海洋', 珊瑚: '海洋',
  森林: '森林', 植物: '森林', 竹林: '森林', 苔藓: '森林', 湿地: '森林',
  红树林: '森林', 草原: '森林', 樱花: '森林',
  星空宇宙: '星空宇宙', 星空: '星空宇宙', 星海: '星空宇宙', 极光: '星空宇宙',
  山川湖泊: '山川湖泊', 山川: '山川湖泊', 湖泊: '山川湖泊', 月牙泉: '山川湖泊',
  峡谷: '山川湖泊', 高原: '山川湖泊', 盐湖: '山川湖泊', 梯田: '山川湖泊',
  岩石: '山川湖泊', 沙漠: '山川湖泊', 火山: '山川湖泊', 冰川: '山川湖泊',
  春节: '春节', 年味: '春节', 新春: '春节', 新年: '春节',
  中秋: '中秋', 月饼: '中秋',
  端午: '端午', 粽子: '端午',
  圣诞节: '圣诞节', 圣诞: '圣诞节',
  情人节: '情人节', 玫瑰: '情人节',
  青春校园: '青春校园', 校园青春: '校园青春', 校园: '青春校园',
  毕业季: '毕业季', 毕业: '毕业季',
  开学季: '开学季', 开学: '开学季',
  生日派对: '生日派对', 生日: '生日派对',
  婚礼婚庆: '婚礼婚庆', 婚礼: '婚礼婚庆', 婚庆: '婚礼婚庆',
  成人礼: '成人礼',
  金榜题名: '金榜题名', 状元: '金榜题名',
  运动会: '运动会', 运动: '运动会',
  音乐节: '音乐节', 音乐: '音乐节',
  市集文创: '市集文创', 市集: '市集文创', 文创: '市集文创',
  美食: '市集文创', 咖啡: '市集文创', 热带水果: '市集文创', 糖果: '市集文创',
  香料集市: '市集文创', 抹茶仪式: '市集文创', 酒窖陈年: '市集文创', 柠檬塔: '市集文创',
  公益环保: '公益环保', 环保: '公益环保', 公益: '公益环保',
  '24节气': '24节气', 二十四节气: '24节气', 节气: '24节气',
  考试季: '考试季', 考试: '考试季', 备考: '考试季', 中考: '考试季', 高考: '考试季',
  寒暑假: '寒暑假', 寒假: '寒暑假', 暑假: '寒暑假',
  读书季: '读书季', 阅读: '读书季',
  年终: '年终', 年末: '年终',
  元旦: '元旦', 跨年: '元旦',
  腊八: '腊八', 腊八粥: '腊八',
  元宵: '元宵', 元宵节: '元宵', 灯会: '元宵',
  妇女节: '妇女节', 三八: '妇女节', 女神节: '妇女节',
  植树节: '植树节', 植树: '植树节',
  清明: '清明', 清明节: '清明', 踏青: '清明',
  愚人节: '愚人节',
  劳动节: '劳动节', 五一: '劳动节',
  青年节: '青年节', 五四: '青年节',
  母亲节: '母亲节',
  护士节: '护士节', 白衣天使: '护士节',
  儿童节: '儿童节', 六一: '儿童节',
  父亲节: '父亲节',
  七夕: '七夕', 七夕节: '七夕', 乞巧: '七夕',
  端午节: '端午',
  重阳: '重阳', 重阳节: '重阳', 登高: '重阳',
  国庆节: '国庆节', 国庆: '国庆节', 十一: '国庆节',
  抗战纪念日: '抗战纪念日', 抗战: '抗战纪念日',
  国家公祭日: '国家公祭日', 公祭: '国家公祭日', 南京大屠杀: '国家公祭日',
  万圣节: '万圣节', 万圣: '万圣节',
  感恩节: '感恩节',
};

const THEME_LEGACY_MAP = {
  城市: '市集文创', 季节: null, 植物: '森林',
  互补色: null, 近似色: null, 单色阶: null,
  建党节: null, 建军节: null, 教师节: null, 七一: null, 八一: null, 恩师: null,
  春日樱花: '春节', 夏日海岸: '海洋', 秋叶枫红: '中秋',
  冬雪清晨: '圣诞节', 梅雨时节: '端午', 金秋丰收: '中秋',
  初雪寂静: '圣诞节', 仲夏蝉鸣: '毕业季', 热带度假: '海洋',
  日落: '山川湖泊', 黎明: '山川湖泊', 雾感: '山川湖泊', 雨天: '山川湖泊', 风暴: '海洋',
  街头涂鸦: '音乐节', 街头霓虹: '音乐节', 工业仓库: '市集文创',
};

const CATEGORY_TO_THEME = {
  nature: '森林',
  art: '市集文创',
  emotion: '青春校园',
  culture: '春节',
  material: '市集文创',
  season: '春节',
  fantasy: '星空宇宙',
  architecture: '山川湖泊',
  fashion: '音乐节',
  food: '市集文创',
};

/** 材质名等细粒度标签 → 丢弃 */
const DROP_LEGACY_TAGS = new Set([
  '青铜', '大理石', '陶瓷', '玻璃', '翡翠', '珐琅', '丝绸', '牛仔布', '混凝土',
  '琥珀', '漆器', '竹编', '蜡染', '铁锈', '磨砂', '羊皮纸', '热带度假', '都市皮革',
  '清新', '对比', '色海导入',
]);

/** 旧风格名 / 引擎细项 → 新风格词表 */
const STYLE_LABEL_TO_BROAD = {
  极简: '极简', 极简主义: '极简', 北欧: '极简', 侘寂: '极简',
  现代: '现代', 艺术: '现代', 情绪: '现代', 设计: '现代', 素材: '现代',
  包豪斯: '现代', 构成主义: '现代', 孟菲斯: '现代', 未来主义: '现代',
  波普艺术: '现代', 时尚杂志: '现代', 奢华: '现代', 粗野主义: '现代',
  复古: '复古', 复古胶片: '复古', 装饰艺术: '复古', 巴洛克: '复古',
  洛可可: '复古', 浮世绘: '复古', 民国: '复古', 维多利亚: '复古', 文艺复兴: '复古',
  自然: '自然', 苔藓: '田园风', 竹林: '田园风', 草原: '田园风', 樱花: '田园风',
  奶油: '奶油', 糖果: '马卡龙', 热带水果: '马卡龙',
  马卡龙: '马卡龙',
  莫兰迪: '莫兰迪',
  温柔韩系: '温柔韩系', 温柔: '温柔韩系', 韩系: '温柔韩系', 慵懒: '温柔韩系',
  'ins 清新': 'ins 清新', ins: 'ins 清新',
  新中式: '新中式', 和风: '新中式', 水墨: '新中式', 禅意: '新中式', 宋代: '新中式',
  Y2K: 'Y2K', 合成波: 'Y2K', 复古游戏: 'Y2K',
  赛博朋克: '赛博朋克', 街头涂鸦: '赛博朋克', 街头霓虹: '赛博朋克',
  学院风: '学院风', 暗色学院: '学院风', 浅色学院: '学院风',
  田园风: '田园风', 田园: '田园风',
  暗黑哥特: '暗黑哥特', 哥特: '暗黑哥特', 沉郁: '暗黑哥特', 诡谲: '暗黑哥特', 忧郁: '暗黑哥特',
  波西米亚: '波西米亚',
};

const STYLE_LEGACY_MAP = {
  艺术: '现代', 和风: '新中式', 情绪: '现代', 素材: '现代', 设计: '现代', 文化: '复古',
};

const CATEGORY_TO_STYLE = {
  nature: '自然',
  art: '现代',
  emotion: '温柔韩系',
  culture: '新中式',
  material: '现代',
  season: '田园风',
  fantasy: '波西米亚',
  architecture: '现代',
  fashion: '温柔韩系',
  food: '奶油',
};

/**
 * @param {string} tag
 * @returns {SeaTagCategory}
 */
export function classifySeaTag(tag) {
  const s = String(tag || '').trim();
  const mapped = normalizeLegacySeaTag(s) ?? s;
  if (SEA_COLOR_HUE_TAGS.includes(mapped) || mapped === SEA_DAILY_COLOR_TAG) return 'color';
  if (SEA_STYLE_TAGS.includes(mapped)) return 'style';
  if (SEA_THEME_TAGS.includes(mapped)) return 'theme';
  return 'style';
}

/**
 * @param {string} tag
 * @returns {string | null}
 */
export function normalizeLegacySeaTag(tag) {
  const s = String(tag || '').trim();
  if (!s) return null;
  if (DROP_LEGACY_TAGS.has(s)) return null;
  if (DROP_LEGACY_FEEL.has(s)) return null;
  if (ALL_CANONICAL_SEA_TAGS.has(s)) return s;

  if (HUE_LEGACY_MAP[s] !== undefined) return HUE_LEGACY_MAP[s];
  if (/色系$/.test(s)) return HUE_LEGACY_MAP[s] ?? null;

  if (s === '极简灰' || s === '对比') return null;

  if (STYLE_LABEL_TO_BROAD[s]) return STYLE_LABEL_TO_BROAD[s];
  if (STYLE_LEGACY_MAP[s]) return STYLE_LEGACY_MAP[s];
  if (THEME_LABEL_MAP[s]) return THEME_LABEL_MAP[s];
  if (THEME_LEGACY_MAP[s] !== undefined) return THEME_LEGACY_MAP[s];

  if (['自然', '艺术', '情绪', '素材', '设计', '文化'].includes(s)) {
    const catMap = {
      自然: 'nature',
      艺术: 'art',
      情绪: 'emotion',
      素材: 'material',
      设计: 'design',
      文化: 'culture',
    };
    return CATEGORY_TO_STYLE[catMap[s]] ?? CATEGORY_TO_THEME[catMap[s]] ?? null;
  }

  if (['分裂互补', '三角配色', '四角配色', '单色阶', '近似色', '互补色'].includes(s)) {
    return null;
  }

  return null;
}

/**
 * @param {string} [styleLabel]
 * @param {string} [category]
 * @returns {string | null}
 */
export function broadStyleFromMeta(styleLabel, category) {
  const label = String(styleLabel || '').trim();
  if (label && STYLE_LABEL_TO_BROAD[label]) return STYLE_LABEL_TO_BROAD[label];
  if (label && THEME_LABEL_MAP[label]) return null;

  if (category === 'design') {
    if (label && /和风|水墨|侘寂|禅|宋|中式/.test(label)) return '新中式';
    if (label && /莫兰迪/.test(label)) return '莫兰迪';
    if (label && /马卡龙|糖果/.test(label)) return '马卡龙';
    if (label && /奶油|奶|柔/.test(label)) return '奶油';
    if (label && /莫兰迪|北欧|极简/.test(label)) return '极简';
    if (label && /赛博|霓虹|朋克/.test(label)) return '赛博朋克';
    if (label && /Y2K|千禧|合成波/.test(label)) return 'Y2K';
    if (label && /复古|胶片|装饰|学院/.test(label)) return '复古';
    if (label && /田园|牧/.test(label)) return '田园风';
    if (label && /哥特|暗/.test(label)) return '暗黑哥特';
    if (label && /波西米亚/.test(label)) return '波西米亚';
    if (label && /韩系|温柔/.test(label)) return '温柔韩系';
    if (label && /ins|清新/.test(label)) return 'ins 清新';
    return '现代';
  }

  return CATEGORY_TO_STYLE[category] ?? null;
}

/**
 * @param {string} [styleLabel]
 * @param {string} [category]
 * @returns {string | null}
 */
export function broadThemeFromMeta(styleLabel, category) {
  const label = String(styleLabel || '').trim();
  if (label && THEME_LABEL_MAP[label]) return THEME_LABEL_MAP[label];
  if (label && /星|宇|夜|银河/.test(label)) return '星空宇宙';
  if (label && /山|湖|泉|溪|谷|川/.test(label)) return '山川湖泊';
  if (label && /森|林|竹|木|植/.test(label)) return '森林';
  if (label && /海|洋|浪|潮/.test(label)) return '海洋';
  return CATEGORY_TO_THEME[category] ?? null;
}

/**
 * @param {string} [harmonyId]
 * @returns {string | null}
 */
export function inferStyleFromTitle(title) {
  const t = String(title || '').trim();
  if (!t) return null;
  if (/荷|竹|堤|泉|大漠|塘|烟|西湖|风荷|孤烟|谷雨|清明|山/.test(t)) return '自然';
  if (/茶|焙|煎茶|水墨|侘|禅|宋|中式/.test(t)) return '新中式';
  if (/胶片|旧|复古|民国/.test(t)) return '复古';
  if (/极简|素|白/.test(t)) return '极简';
  if (/椰|奶|酪|露|糕/.test(t)) return '奶油';
  if (/马卡龙|糖|甜/.test(t)) return '马卡龙';
  if (/莫兰迪/.test(t)) return '莫兰迪';
  if (/霓虹|赛博|朋克/.test(t)) return '赛博朋克';
  return null;
}

export function inferThemeFromTitle(title) {
  const t = String(title || '').trim();
  if (!t) return null;
  if (/24节气|二十四节气|立春|雨水|惊蛰|春分|清明|谷雨|立夏|小满|芒种|夏至|小暑|大暑|立秋|处暑|白露|秋分|寒露|霜降|立冬|小雪|大雪|冬至|小寒|大寒/.test(t)) {
    if (/清明/.test(t) && !/24节气|二十四节气/.test(t)) return '清明';
    return '24节气';
  }
  if (/考试|备考|中考|高考|期末/.test(t)) return '考试季';
  if (/元宵/.test(t)) return '元宵';
  if (/腊八/.test(t)) return '腊八';
  if (/元旦|跨年/.test(t)) return '元旦';
  if (/春节|新年|年味/.test(t)) return '春节';
  if (/中秋|月饼/.test(t)) return '中秋';
  if (/端午|粽子/.test(t)) return '端午';
  if (/圣诞/.test(t)) return '圣诞节';
  if (/情人|玫瑰/.test(t)) return '情人节';
  if (/七夕|乞巧/.test(t)) return '七夕';
  if (/重阳|登高/.test(t)) return '重阳';
  if (/国庆|十一/.test(t)) return '国庆节';
  if (/万圣/.test(t)) return '万圣节';
  if (/感恩/.test(t)) return '感恩节';
  if (/公祭|南京大屠杀/.test(t)) return '国家公祭日';
  if (/抗战/.test(t)) return '抗战纪念日';
  if (/妇女|三八|女神节/.test(t)) return '妇女节';
  if (/植树/.test(t)) return '植树节';
  if (/愚人/.test(t)) return '愚人节';
  if (/劳动|五一/.test(t)) return '劳动节';
  if (/青年|五四/.test(t)) return '青年节';
  if (/母亲/.test(t)) return '母亲节';
  if (/护士/.test(t)) return '护士节';
  if (/儿童|六一/.test(t)) return '儿童节';
  if (/父亲/.test(t)) return '父亲节';
  if (/毕业/.test(t)) return '毕业季';
  if (/开学/.test(t)) return '开学季';
  if (/读书|阅读/.test(t)) return '读书季';
  if (/寒假|暑假|寒暑/.test(t)) return '寒暑假';
  if (/年终|年末/.test(t)) return '年终';
  if (/校园|青春/.test(t)) return '青春校园';
  if (/生日/.test(t)) return '生日派对';
  if (/婚|嫁/.test(t)) return '婚礼婚庆';
  if (/成人礼/.test(t)) return '成人礼';
  if (/金榜|状元/.test(t)) return '金榜题名';
  if (/运动/.test(t)) return '运动会';
  if (/音乐/.test(t)) return '音乐节';
  if (/市集|文创|咖啡|茶|糕|酿|焙|露|酪|椰|柚|梅|荔|桂|橙|玛德|煎茶/.test(t)) return '市集文创';
  if (/环保|公益/.test(t)) return '公益环保';
  if (/星|宇|夜|银河/.test(t)) return '星空宇宙';
  if (/海|洋|潮|浪|汐/.test(t)) return '海洋';
  if (/荷|竹|林|森|植|花|草/.test(t)) return '森林';
  if (/山|湖|泉|溪|谷|川|大漠|堤|塘|西湖|风荷|孤烟|谷雨/.test(t)) return '山川湖泊';
  return null;
}

/**
 * @param {string} [harmonyId]
 * @returns {string | null}
 */
export function harmonyTagFromId(harmonyId) {
  return HARMONY_CANONICAL[harmonyId] ?? null;
}

export function buildCanonicalTagBuckets() {
  return {
    color: [SEA_DAILY_COLOR_TAG, ...SEA_COLOR_HUE_TAGS],
    style: [...SEA_STYLE_TAGS],
    theme: [...SEA_THEME_TAGS],
  };
}

/**
 * 按优先级组装色卡标签：色系 + 风格 + 主题 + 色感（最多 5 个）。
 * @param {{
 *   hue?: string | null,
 *   style?: string | null,
 *   theme?: string | null,
 *   colorFeel?: string[],
 *   legacy?: string[],
 * }} parts
 * @returns {string[]}
 */
export function assembleSeaTags({
  hue = null,
  style = null,
  theme = null,
  colorFeel = [],
  legacy = [],
}) {
  const seen = new Set();
  const out = [];

  const push = (tag) => {
    const t = String(tag || '').trim();
    if (!t || !ALL_CANONICAL_SEA_TAGS.has(t) || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  if (style) push(style);
  if (theme) push(theme);
  if (hue) push(hue);

  for (const f of colorFeel) {
    const mapped = normalizeLegacySeaTag(f);
    if (mapped && SEA_COLOR_HUE_TAGS.includes(mapped)) push(mapped);
  }

  for (const raw of legacy) {
    const mapped = normalizeLegacySeaTag(raw);
    if (!mapped) continue;
    if (mapped === '现代' && style !== '现代') continue;
    push(mapped);
  }

  return out.slice(0, 5);
}
