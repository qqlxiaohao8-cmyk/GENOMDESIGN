/**
 * 色彩宇宙：色域、饱和度/明度宇宙、100+ 风格池、历史统计与相似度。
 */
import { wrapHueDeg, hexToOklch } from './oklch.js';

const HISTORY_KEY = 'genom-palette-universe-history-v1';
const HISTORY_MAX = 50;
const STATS_WINDOW = 100;

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

function pickWeighted(items) {
  if (!items?.length) return undefined;
  const total = items.reduce((s, x) => s + (x.weight || 0), 0);
  if (total <= 0) return items[0].value;
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight || 0;
    if (r <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '');
}

// slug kept for optional external use
export { slug };

/** 14 色域 */
export const HUE_DOMAINS = [
  { id: 'red', label: 'Red', labelZh: '红', hueRanges: [[350, 360], [0, 18]] },
  { id: 'orange', label: 'Orange', labelZh: '橙', hueRanges: [[18, 48]] },
  { id: 'yellow', label: 'Yellow', labelZh: '黄', hueRanges: [[48, 72]] },
  { id: 'green', label: 'Green', labelZh: '绿', hueRanges: [[72, 155]] },
  { id: 'cyan', label: 'Cyan', labelZh: '青', hueRanges: [[155, 195]] },
  { id: 'blue', label: 'Blue', labelZh: '蓝', hueRanges: [[195, 248]] },
  { id: 'indigo', label: 'Indigo', labelZh: '靛', hueRanges: [[248, 275]] },
  { id: 'purple', label: 'Purple', labelZh: '紫', hueRanges: [[275, 310]] },
  { id: 'pink', label: 'Pink', labelZh: '粉', hueRanges: [[310, 350]] },
  { id: 'brown', label: 'Brown', labelZh: '褐', hueRanges: [[22, 55]], lRange: [0.22, 0.48], cRange: [0.03, 0.09] },
  { id: 'gray', label: 'Gray', labelZh: '灰', hueRanges: [[0, 360]], lRange: [0.35, 0.72], cRange: [0.004, 0.025] },
  { id: 'black', label: 'Black', labelZh: '黑', hueRanges: [[0, 360]], lRange: [0.06, 0.18], cRange: [0.004, 0.02] },
  { id: 'white', label: 'White', labelZh: '白', hueRanges: [[0, 360]], lRange: [0.82, 0.97], cRange: [0.004, 0.022] },
  { id: 'metallic', label: 'Metallic', labelZh: '金属', hueRanges: [[42, 58], [195, 215]], lRange: [0.42, 0.78], cRange: [0.012, 0.045] },
];

const DOMAIN_BY_ID = Object.fromEntries(HUE_DOMAINS.map((d) => [d.id, d]));

/** 饱和度宇宙 */
export const SATURATION_TIERS = [
  { id: 'low', labelZh: '低饱和', weight: 20, cRange: [0.008, 0.032] },
  { id: 'midLow', labelZh: '中低饱和', weight: 20, cRange: [0.022, 0.052] },
  { id: 'mid', labelZh: '中饱和', weight: 20, cRange: [0.042, 0.085] },
  { id: 'midHigh', labelZh: '中高饱和', weight: 20, cRange: [0.068, 0.12] },
  { id: 'high', labelZh: '高饱和', weight: 15, cRange: [0.1, 0.16] },
  { id: 'ultra', labelZh: '超高饱和', weight: 5, cRange: [0.14, 0.22] },
];

/** 明度宇宙 */
export const LIGHTNESS_MODES = [
  { id: 'light', labelZh: '浅色系', lDark: [0.55, 0.68], lMid: [0.68, 0.82], lLight: [0.82, 0.96] },
  { id: 'dark', labelZh: '深色系', lDark: [0.08, 0.22], lMid: [0.22, 0.38], lLight: [0.35, 0.52] },
  { id: 'balanced', labelZh: '均衡', lDark: [0.12, 0.28], lMid: [0.38, 0.68], lLight: [0.72, 0.92] },
  { id: 'highKey', labelZh: 'High-Key', lDark: [0.72, 0.82], lMid: [0.82, 0.9], lLight: [0.9, 0.97] },
  { id: 'lowKey', labelZh: 'Low-Key', lDark: [0.06, 0.14], lMid: [0.14, 0.26], lLight: [0.26, 0.38] },
];

const DEFAULT_SAT_TIER = SATURATION_TIERS.find((t) => t.id === 'mid') ?? SATURATION_TIERS[0];
const DEFAULT_LIGHT_MODE = LIGHTNESS_MODES.find((m) => m.id === 'balanced') ?? LIGHTNESS_MODES[0];
const DEFAULT_HUE_DOMAIN = HUE_DOMAINS.find((d) => d.id === 'blue') ?? HUE_DOMAINS[0];

export function ensureSaturationTier(tier) {
  if (tier?.cRange?.length >= 2) return tier;
  return DEFAULT_SAT_TIER;
}

export function ensureLightnessMode(mode) {
  if (mode?.lMid?.length >= 2) return mode;
  return DEFAULT_LIGHT_MODE;
}

export function ensureHueDomain(domain) {
  if (domain?.hueRanges?.length) return domain;
  return DEFAULT_HUE_DOMAIN;
}

/** 冷门色锚点（提高权重） */
export const BOOSTED_HUE_ANCHORS = [
  { name: 'ochre', labelZh: '赭石', h: 42, l: 0.52, c: 0.09 },
  { name: 'olive', labelZh: '橄榄绿', h: 98, l: 0.48, c: 0.07 },
  { name: 'brass', labelZh: '黄铜', h: 52, l: 0.62, c: 0.06 },
  { name: 'wine', labelZh: '酒红', h: 352, l: 0.32, c: 0.1 },
  { name: 'indigoDeep', labelZh: '靛蓝', h: 268, l: 0.32, c: 0.11 },
  { name: 'peacock', labelZh: '孔雀蓝', h: 192, l: 0.42, c: 0.12 },
  { name: 'rust', labelZh: '铁锈红', h: 22, l: 0.38, c: 0.11 },
  { name: 'turquoise', labelZh: '松石绿', h: 172, l: 0.55, c: 0.1 },
  { name: 'mustard', labelZh: '芥末黄', h: 82, l: 0.68, c: 0.13 },
  { name: 'deepPurple', labelZh: '深紫', h: 292, l: 0.28, c: 0.12 },
];

function buildStyleCatalog() {
  const rows = [
    ['nature', '苔藓'], ['nature', '火山'], ['nature', '极光'], ['nature', '海岸'],
    ['nature', '雨天'], ['nature', '竹林'], ['nature', '沙漠'], ['nature', '珊瑚'],
    ['nature', '樱花'], ['nature', '深海'], ['nature', '熔岩'], ['nature', '冰川'],
    ['nature', '湿地'], ['nature', '高原'], ['nature', '峡谷'], ['nature', '草原'],
    ['nature', '红树林'], ['nature', '盐湖'], ['nature', '梯田'], ['nature', '风暴'],
    ['art', '浮世绘'], ['art', '印象派'], ['art', '野兽派'], ['art', '包豪斯'],
    ['art', '孟菲斯'], ['art', '未来主义'], ['art', '巴洛克'], ['art', '洛可可'],
    ['art', '超现实主义'], ['art', '立体主义'], ['art', '极简主义'], ['art', '波普艺术'],
    ['art', '装饰艺术'], ['art', '新艺术'], ['art', '构成主义'], ['art', '表现主义'],
    ['art', '抽象表现'], ['art', '色域绘画'], ['art', '光晕派'], ['art', '街头涂鸦'],
    ['emotion', '忧郁'], ['emotion', '浪漫'], ['emotion', '孤独'], ['emotion', '热烈'],
    ['emotion', '神秘'], ['emotion', '狂欢'], ['emotion', '宁静'], ['emotion', '空灵'],
    ['emotion', '压抑'], ['emotion', '怀旧'], ['emotion', '希望'], ['emotion', '焦虑'],
    ['emotion', '温柔'], ['emotion', '冷峻'], ['emotion', '慵懒'], ['emotion', '激昂'],
    ['emotion', '禅意'], ['emotion', '诡谲'], ['emotion', '纯真'], ['emotion', '沉郁'],
    ['culture', '敦煌'], ['culture', '宋代'], ['culture', '江户'], ['culture', '拜占庭'],
    ['culture', '玛雅'], ['culture', '波斯'], ['culture', '维京'], ['culture', '阿兹特克'],
    ['culture', '凯尔特'], ['culture', '蒙古'], ['culture', '高棉'], ['culture', '印加'],
    ['culture', '古埃及'], ['culture', '文艺复兴'], ['culture', '维多利亚'], ['culture', '民国'],
    ['culture', '阿拉伯'], ['culture', '非洲部落'], ['culture', '因纽特'], ['culture', '夏威夷'],
    ['material', '陶瓷'], ['material', '青铜'], ['material', '翡翠'], ['material', '羊皮纸'],
    ['material', '玻璃'], ['material', '丝绸'], ['material', '牛仔布'], ['material', '混凝土'],
    ['material', '大理石'], ['material', '琥珀'], ['material', '漆器'], ['material', '竹编'],
    ['material', '蜡染'], ['material', '铁锈'], ['material', '磨砂'], ['material', '珐琅'],
    ['design', '莫兰迪'], ['design', '赛博朋克'], ['design', '合成波'], ['design', '北欧'],
    ['design', '和风'], ['design', '水墨'], ['design', '复古胶片'], ['design', '奢华'],
    ['design', '时尚杂志'], ['design', '粗野主义'], ['design', '暗色学院'], ['design', '浅色学院'],
    ['design', '糖果'], ['design', '热带水果'], ['design', '复古游戏'], ['design', '星空'],
    ['design', '雾感'], ['design', '侘寂'], ['design', '咖啡'], ['design', '岩石'],
    ['design', '金属'], ['design', '植物'], ['design', '极简'], ['design', '梦幻'],
    ['design', '日落'], ['design', '黎明'], ['design', '海洋'], ['design', '森林'],
  ];
  return rows.map(([category, labelZh], i) => ({
    id: `${category}-${i}`,
    label: labelZh,
    labelZh,
    category,
  }));
}

export const UNIVERSE_STYLES = buildStyleCatalog();
const STYLE_BY_ID = Object.fromEntries(UNIVERSE_STYLES.map((s) => [s.id, s]));

export function classifyHexDomain(hex) {
  const o = hexToOklch(hex);
  if (o.l < 0.2 && o.c < 0.025) return 'black';
  if (o.l > 0.85 && o.c < 0.028) return 'white';
  if (o.c < 0.028 && o.l > 0.3 && o.l < 0.75) return 'gray';
  if (o.c < 0.08 && o.h >= 22 && o.h <= 55 && o.l < 0.55) return 'brown';
  if (o.c < 0.05 && ((o.h >= 42 && o.h <= 58) || (o.h >= 195 && o.h <= 215))) return 'metallic';
  for (const d of HUE_DOMAINS) {
    if (['brown', 'gray', 'black', 'white', 'metallic'].includes(d.id)) continue;
    for (const [a, b] of d.hueRanges) {
      if (o.h >= a && o.h <= b) return d.id;
    }
    if (d.hueRanges.some(([a, b]) => a > b && (o.h >= a || o.h <= b))) return d.id;
  }
  return 'blue';
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

function hueInDomain(domain) {
  const ranges = domain.hueRanges;
  const [a, b] = ranges[Math.floor(Math.random() * ranges.length)];
  if (a <= b) return rand(a, b);
  return Math.random() < 0.5 ? rand(a, 360) : rand(0, b);
}

function readHistory() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function writeHistory(list) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-HISTORY_MAX)));
  } catch { /* ignore */ }
}

export function getDomainStats() {
  const history = readHistory();
  const stats = { total: 0 };
  for (const d of HUE_DOMAINS) stats[d.id] = 0;
  for (const entry of history.slice(-STATS_WINDOW)) {
    const id = entry.primaryDomain || 'blue';
    if (stats[id] != null) stats[id] += 1;
    stats.total += 1;
  }
  return stats;
}

/** 色域均衡抽样：100 套内每域目标 5–10% */
export function pickBalancedHueDomain() {
  const stats = getDomainStats();
  const total = Math.max(stats.total, 1);
  const items = HUE_DOMAINS.map((d) => {
    const pct = (stats[d.id] || 0) / total;
    let weight = 1;
    if (pct < 0.05) weight = 3.2;
    else if (pct < 0.07) weight = 2.2;
    else if (pct > 0.12) weight = 0.35;
    else if (pct > 0.1) weight = 0.65;
    return { value: d.id, weight };
  });
  const id = pickWeighted(items);
  return DOMAIN_BY_ID[id] ?? DEFAULT_HUE_DOMAIN;
}

export function pickSaturationTier(forcedId) {
  if (forcedId) {
    const t = SATURATION_TIERS.find((x) => x.id === forcedId);
    if (t) return t;
  }
  const id = pickWeighted(SATURATION_TIERS.map((t) => ({ value: t.id, weight: t.weight })));
  return ensureSaturationTier(SATURATION_TIERS.find((t) => t.id === id));
}

export function pickLightnessMode(forcedId) {
  if (forcedId) {
    const m = LIGHTNESS_MODES.find((x) => x.id === forcedId);
    if (m) return m;
  }
  return ensureLightnessMode(LIGHTNESS_MODES[Math.floor(Math.random() * LIGHTNESS_MODES.length)]);
}

export function pickUniverseStyle(forcedId) {
  if (forcedId) {
    if (STYLE_BY_ID[forcedId]) return STYLE_BY_ID[forcedId];
    const byLabel = UNIVERSE_STYLES.find((s) => s.labelZh === forcedId || s.label === forcedId);
    if (byLabel) return byLabel;
  }
  return UNIVERSE_STYLES[Math.floor(Math.random() * UNIVERSE_STYLES.length)];
}

/**
 * 颜色随机：从色域 + 饱和度/明度宇宙抽样（30% 冷门锚点）
 */
export function samplePrimaryFromUniverse(domain, satTier, lightMode) {
  domain = ensureHueDomain(domain);
  satTier = ensureSaturationTier(satTier);
  lightMode = ensureLightnessMode(lightMode);
  if (Math.random() < 0.3) {
    const anchor = BOOSTED_HUE_ANCHORS[Math.floor(Math.random() * BOOSTED_HUE_ANCHORS.length)];
    const c = clamp(rand(satTier.cRange[0], satTier.cRange[1]) * rand(0.85, 1.15), 0.006, 0.22);
    const lMid = (lightMode.lMid[0] + lightMode.lMid[1]) / 2;
    return {
      h: wrapHue(anchor.h + rand(-8, 8)),
      l: clamp(lMid + rand(-0.12, 0.12), 0.06, 0.97),
      c,
      domainId: classifyHexDomainFromSpec(anchor.h, lMid, c),
      fromBoost: anchor.name,
    };
  }

  let h = hueInDomain(domain);
  let l;
  let c = rand(satTier.cRange[0], satTier.cRange[1]);

  if (domain.lRange) {
    l = rand(domain.lRange[0], domain.lRange[1]);
    c = rand(domain.cRange[0], domain.cRange[1]);
  } else {
    const roll = Math.random();
    if (roll < 0.2) l = rand(lightMode.lDark[0], lightMode.lDark[1]);
    else if (roll < 0.7) l = rand(lightMode.lMid[0], lightMode.lMid[1]);
    else l = rand(lightMode.lLight[0], lightMode.lLight[1]);
  }

  if (domain.id === 'black') c = rand(0.004, 0.018);
  if (domain.id === 'white') c = rand(0.004, 0.02);
  if (domain.id === 'gray') c = rand(0.004, 0.025);

  return {
    h: wrapHue(h),
    l: clamp(l, 0.05, 0.98),
    c: clamp(c, 0.004, 0.22),
    domainId: domain.id,
    fromBoost: null,
  };
}

function classifyHexDomainFromSpec(h, l, c) {
  if (l < 0.2 && c < 0.025) return 'black';
  if (l > 0.85 && c < 0.028) return 'white';
  if (c < 0.028) return 'gray';
  for (const d of HUE_DOMAINS) {
    if (['brown', 'gray', 'black', 'white', 'metallic'].includes(d.id)) continue;
    for (const [a, b] of d.hueRanges) {
      if (h >= a && h <= b) return d.id;
    }
  }
  return 'blue';
}

/** 惊喜色：与主色域形成记忆点 */
export function pickDiscoverySpec(avgHue, satTier) {
  satTier = ensureSaturationTier(satTier);
  const offset = pickWeighted([
    { value: 55, weight: 25 },
    { value: 90, weight: 20 },
    { value: 140, weight: 20 },
    { value: 180, weight: 15 },
    { value: 220, weight: 10 },
    { value: 300, weight: 10 },
  ]);
  const sign = Math.random() < 0.5 ? 1 : -1;
  const h = wrapHue(avgHue + sign * offset + rand(-12, 12));
  const c = clamp(rand(satTier.cRange[1], satTier.cRange[1] * 1.35), 0.06, 0.22);
  const l = rand(0.45, 0.78);
  return { h, l, c, isDiscovery: true };
}

export function paletteFingerprint(meta) {
  return {
    primaryHue: meta.primaryHue,
    primaryDomain: meta.primaryDomain,
    styleId: meta.styleId,
    saturationTier: meta.saturationTier,
    lightnessMode: meta.lightnessMode,
    ts: Date.now(),
  };
}

/** 与历史条目相似度 0–1 */
export function paletteSimilarity(a, b) {
  if (!a || !b) return 0;
  const hueSim = 1 - hueDelta(a.primaryHue, b.primaryHue) / 180;
  let score = hueSim * 0.35;
  if (a.styleId === b.styleId) score += 0.2;
  if (a.saturationTier === b.saturationTier) score += 0.2;
  if (a.lightnessMode === b.lightnessMode) score += 0.15;
  if (a.primaryDomain === b.primaryDomain) score += 0.1;
  return clamp(score, 0, 1);
}

export function isTooSimilarToHistory(fingerprint, threshold = 0.6) {
  const history = readHistory();
  for (const entry of history) {
    if (paletteSimilarity(fingerprint, entry) > threshold) return true;
  }
  return false;
}

export function recordPaletteHistory(fingerprint) {
  const history = readHistory();
  history.push(fingerprint);
  writeHistory(history);
}

export function clearPaletteHistory() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(HISTORY_KEY);
  } catch { /* ignore */ }
}

export const UNIVERSE_STYLE_COUNT = UNIVERSE_STYLES.length;
