import { enrichSwatch } from './colorValues';
import { getPoeticColorName, getPoeticQuoteForHex } from './poeticColorNaming';
import { classifyHexDomain } from './colorUniverse';
import { oklabDistSqFromHex, wrapHueDeg, lchToHexClamped } from './oklch.js';

/** How many past calendar days of GENOM Daily cards appear in Community (inclusive of today). */
export const DAILY_PALETTE_HISTORY_DAYS = 365;

/** 近 N 天内避免过于相近的 hex（感知距离） */
export const DAILY_COLOR_LOOKBACK_DAYS = 21;
/** 近 N 天内避免重复同一色系 */
export const DAILY_DOMAIN_LOOKBACK_DAYS = 7;
/** OKLab 距离² 下限：低于此视为「同色」 */
const DAILY_MIN_COLOR_DIST_SQ = 0.014;
const DAILY_HEX_MAX_ATTEMPTS = 64;

const dailyHexCache = new Map();

/**
 * Date key YYYY-MM-DD in **GMT+8** (Asia/Shanghai).
 * Daily color updates at 00:00 CST regardless of the user's local timezone.
 */
export function formatDailyPaletteDateKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const utcMs = x.getTime() + x.getTimezoneOffset() * 60000;
  const gmt8 = new Date(utcMs + 8 * 3600000);
  const y = gmt8.getFullYear();
  const m = String(gmt8.getMonth() + 1).padStart(2, '0');
  const day = String(gmt8.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function thanksgivingDate(year) {
  const nov1 = new Date(year, 10, 1);
  const dow = nov1.getDay();
  const firstThu = 1 + ((4 - dow + 7) % 7);
  return new Date(year, 10, firstThu + 21);
}

/** Approximate 二十四节气 (Gregorian anchors; ±1 day vs almanac). */
const SOLAR_TERMS = [
  { id: 'xiaohan', label: '小寒 Minor Cold', zh: '小寒', m: 1, d: 6 },
  { id: 'dahan', label: '大寒 Major Cold', zh: '大寒', m: 1, d: 20 },
  { id: 'lichun', label: '立春 Start of Spring', zh: '立春', m: 2, d: 4 },
  { id: 'yushui', label: 'Rain Water', zh: '雨水', m: 2, d: 19 },
  { id: 'jingzhe', label: 'Awakening of Insects', zh: '惊蛰', m: 3, d: 6 },
  { id: 'chunfen', label: 'Spring Equinox', zh: '春分', m: 3, d: 21 },
  { id: 'qingming', label: 'Clear & Bright', zh: '清明', m: 4, d: 5 },
  { id: 'guyu', label: 'Grain Rain', zh: '谷雨', m: 4, d: 20 },
  { id: 'lixia', label: 'Start of Summer', zh: '立夏', m: 5, d: 6 },
  { id: 'xiaoman', label: 'Grain Buds', zh: '小满', m: 5, d: 21 },
  { id: 'mangzhong', label: 'Grain in Ear', zh: '芒种', m: 6, d: 6 },
  { id: 'xiazhi', label: 'Summer Solstice', zh: '夏至', m: 6, d: 21 },
  { id: 'xiaoshu', label: 'Minor Heat', zh: '小暑', m: 7, d: 7 },
  { id: 'dashu', label: 'Major Heat', zh: '大暑', m: 7, d: 23 },
  { id: 'liqiu', label: 'Start of Autumn', zh: '立秋', m: 8, d: 8 },
  { id: 'chushu', label: 'End of Heat', zh: '处暑', m: 8, d: 23 },
  { id: 'bailu', label: 'White Dew', zh: '白露', m: 9, d: 8 },
  { id: 'qiufen', label: 'Autumn Equinox', zh: '秋分', m: 9, d: 23 },
  { id: 'hanlu', label: 'Cold Dew', zh: '寒露', m: 10, d: 8 },
  { id: 'shuangjiang', label: "Frost's Descent", zh: '霜降', m: 10, d: 23 },
  { id: 'lidong', label: 'Start of Winter', zh: '立冬', m: 11, d: 7 },
  { id: 'xiaoxue', label: 'Minor Snow', zh: '小雪', m: 11, d: 22 },
  { id: 'daxue', label: 'Major Snow', zh: '大雪', m: 12, d: 7 },
  { id: 'dongzhi', label: 'Winter Solstice', zh: '冬至', m: 12, d: 22 },
];

function seasonKey(month) {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/** Bilingual lines matched to each holiday theme (EN + classical / modern CN). */
const HOLIDAY_QUOTES = {
  new_year: {
    zh: '千门万户曈曈日，总把新桃换旧符。',
    zhSource: '王安石《元日》',
    en: 'A thousand doors open to the first sun; new charms replace the old on every frame.',
    enSource: 'Wang Anshi, “New Year’s Day” (tr.)',
  },
  valentines: {
    zh: '两情若是久长时，又岂在朝朝暮暮。',
    zhSource: '秦观《鹊桥仙》',
    en: 'If love lasts forever, what need for mornings and evenings side by side?',
    enSource: 'Qin Guan, “Immortal at the Magpie Bridge” (tr.)',
  },
  womens_day: {
    zh: '何须浅碧深红色，自是花中第一流。',
    zhSource: '李清照《鹧鸪天·桂花》',
    en: 'It need not wear bright green or deep red — by nature it is first among flowers.',
    enSource: 'Li Qingzhao, on the osmanthus (tr.)',
  },
  earth_day: {
    zh: '江碧鸟逾白，山青花欲燃。',
    zhSource: '杜甫《绝句二首》',
    en: 'River green makes the birds whiter; mountain blue sets the flowers aflame.',
    enSource: 'Du Fu, “Quatrain” (tr.)',
  },
  labor_day: {
    zh: '锄禾日当午，汗滴禾下土。谁知盘中餐，粒粒皆辛苦。',
    zhSource: '李绅《悯农》',
    en: 'Hoeing under the noon sun, sweat falls to the soil — who knows each grain on the plate was hard-won?',
    enSource: 'Li Shen, “Pity the Peasants” (tr.)',
  },
  juneteenth: {
    zh: '长风破浪会有时，直挂云帆济沧海。',
    zhSource: '李白《行路难》',
    en: 'A time will come to ride the wind and cleave the waves; I’ll set my cloud-white sail and cross the sea.',
    enSource: 'Li Bai, “Hard Roads” (tr.)',
  },
  july_fourth: {
    zh: '海阔凭鱼跃，天高任鸟飞。',
    zhSource: '古诗（佚名，后世常用）',
    en: 'The wide sea lets fish leap; the high sky lets birds fly.',
    enSource: 'Chinese proverb (tr.)',
  },
  national_cn: {
    zh: '苟利国家生死以，岂因祸福避趋之。',
    zhSource: '林则徐',
    en: 'If it serves the country, I would face life or death — not choose fortune and avoid harm.',
    enSource: 'Lin Zexu (tr.)',
  },
  halloween: {
    zh: '秋阴不散霜飞晚，留得枯荷听雨声。',
    zhSource: '李商隐《宿骆氏亭寄怀崔雍崔衮》',
    en: 'By the pricking of my thumbs, something wicked this way comes.',
    enSource: 'Shakespeare, Macbeth',
  },
  thanksgiving: {
    zh: '落其实者思其树，饮其流者怀其源。',
    zhSource: '《左传》',
    en: 'Who eats the fruit remembers the tree; who drinks the stream thinks of its source.',
    enSource: 'Zuo Zhuan (tr.)',
  },
  christmas: {
    zh: '晚来天欲雪，能饮一杯无？',
    zhSource: '白居易《问刘十九》',
    en: 'It is more blessed to give than to receive.',
    enSource: 'Acts 20:35 (NIV)',
  },
  lunar_season: {
    zh: '爆竹声中一岁除，春风送暖入屠苏。',
    zhSource: '王安石《元日》',
    en: 'In crackling firecrackers the old year ends; spring wind brings warmth to the door.',
    enSource: 'Wang Anshi, “New Year’s Day” (tr.)',
  },
};

/** “今日一句” pools — one line picked per calendar day on ordinary season days. */
const SEASON_QUOTE_POOLS = {
  spring: [
    {
      zh: '等闲识得东风面，万紫千红总是春。',
      zhSource: '朱熹《春日》',
      en: 'Casually I meet the face of the east wind: ten thousand purples, a thousand reds — all are spring.',
      enSource: 'Zhu Xi, “Spring Day” (tr.)',
    },
    {
      zh: '千里莺啼绿映红，水村山郭酒旗风。',
      zhSource: '杜牧《江南春》',
      en: 'Orioles sing for miles, red blooms and green weave — villages, hills, wine banners in the wind.',
      enSource: 'Du Mu, “Spring on the South Shore” (tr.)',
    },
    {
      zh: '春色满园关不住，一枝红杏出墙来。',
      zhSource: '叶绍翁《游园不值》',
      en: 'Spring fills the garden, yet cannot be contained — one branch of crimson apricot climbs the wall.',
      enSource: 'Ye Shaoweng (tr.)',
    },
    {
      zh: '竹外桃花三两枝，春江水暖鸭先知。',
      zhSource: '苏轼《惠崇春江晚景》',
      en: 'Beyond bamboo, two or three peach branches blush — spring river warms; ducks know first.',
      enSource: 'Su Shi (tr.)',
    },
    {
      zh: '人面不知何处去，桃花依旧笑春风。',
      zhSource: '崔护《题都城南庄》',
      en: 'That face — where has it gone? Peach blossoms still laugh in the spring wind.',
      enSource: 'Cui Hu (tr.)',
    },
    {
      zh: '乱花渐欲迷人眼，浅草才能没马蹄。',
      zhSource: '白居易《钱塘湖春行》',
      en: 'Wild blooms slowly dazzle the eye; shallow grass can barely hide a horse’s hoof.',
      enSource: 'Bai Juyi, “Spring on West Lake” (tr.)',
    },
    {
      zh: '草长莺飞二月天，拂堤杨柳醉春烟。',
      zhSource: '高鼎《村居》',
      en: 'Grass grows, orioles fly — second month sky; willows by the bank drunk on spring mist.',
      enSource: 'Gao Ding, “Village Life” (tr.)',
    },
  ],
  summer: [
    {
      zh: '接天莲叶无穷碧，映日荷花别样红。',
      zhSource: '杨万里《晓出净慈寺送林子方》',
      en: 'Lotus leaves to the horizon, endless jade green; lotus flowers in the sun, red beyond red.',
      enSource: 'Yang Wanli (tr.)',
    },
    {
      zh: '明月别枝惊鹊，清风半夜鸣蝉。',
      zhSource: '辛弃疾《西江月·夜行黄沙道中》',
      en: 'Bright moon startles magpies from the branch; clear wind at midnight — cicadas sing.',
      enSource: 'Xin Qiji (tr.)',
    },
    {
      zh: '水晶帘动微风起，满架蔷薇一院香。',
      zhSource: '高骈《山亭夏日》',
      en: 'Crystal curtains stir — a breeze rises; a trellis of roses scents the whole courtyard.',
      enSource: 'Gao Pian (tr.)',
    },
    {
      zh: '懒摇白羽扇，裸袒青林中。脱巾挂石壁，露顶洒松风。',
      zhSource: '李白《夏日山中》',
      en: 'Too lazy to wave my white fan; bare-chested in green woods. Cap off, hung on the cliff — scalp cooled by pine wind.',
      enSource: 'Li Bai, “Summer in the Mountains” (tr.)',
    },
  ],
  autumn: [
    {
      zh: '自古逢秋悲寂寥，我言秋日胜春朝。',
      zhSource: '刘禹锡《秋词》',
      en: 'Since old days, autumn meant sorrow — I say a clear autumn morning beats spring.',
      enSource: 'Liu Yuxi, “Autumn Song” (tr.)',
    },
    {
      zh: '停车坐爱枫林晚，霜叶红于二月花。',
      zhSource: '杜牧《山行》',
      en: 'I stop the cart for evening maples — frost-touched leaves redder than February flowers.',
      enSource: 'Du Mu, “Mountain Road” (tr.)',
    },
    {
      zh: '空山新雨后，天气晚来秋。',
      zhSource: '王维《山居秋暝》',
      en: 'After rain in empty hills, evening air carries autumn.',
      enSource: 'Wang Wei (tr.)',
    },
    {
      zh: '月落乌啼霜满天，江枫渔火对愁眠。',
      zhSource: '张继《枫桥夜泊》',
      en: 'Moon sets, crows cry, frost fills the sky — river maples, fishermen’s lamps, sleepless sorrow.',
      enSource: 'Zhang Ji, “Mooring at Maple Bridge” (tr.)',
    },
    {
      zh: '碧云天，黄叶地，秋色连波，波上寒烟翠。',
      zhSource: '范仲淹《苏幕遮》',
      en: 'Azure clouds, yellow leaves on earth — autumn color joins the waves; cold mist, jade on the water.',
      enSource: 'Fan Zhongyan (tr.)',
    },
  ],
  winter: [
    {
      zh: '忽如一夜春风来，千树万树梨花开。',
      zhSource: '岑参《白雪歌送武判官归京》',
      en: 'Overnight it seems spring wind came — pear blossoms fill every tree.',
      enSource: 'Cen Shen, on snow (tr.)',
    },
    {
      zh: '晚来天欲雪，能饮一杯无？',
      zhSource: '白居易《问刘十九》',
      en: 'Evening sky promises snow — will you share one cup of wine?',
      enSource: 'Bai Juyi (tr.)',
    },
    {
      zh: '孤舟蓑笠翁，独钓寒江雪。',
      zhSource: '柳宗元《江雪》',
      en: 'A lone boat, straw cloak and hat — one old man fishing in snow on a cold river.',
      enSource: 'Liu Zongyuan, “River Snow” (tr.)',
    },
    {
      zh: '墙角数枝梅，凌寒独自开。',
      zhSource: '王安石《梅花》',
      en: 'A few plum branches at the wall — blooming alone through the cold.',
      enSource: 'Wang Anshi, “Plum Blossom” (tr.)',
    },
    {
      zh: '柴门闻犬吠，风雪夜归人。',
      zhSource: '刘长卿《逢雪宿芙蓉山主人》',
      en: 'At the brushwood gate, dogs bark — someone returns through wind and snow at night.',
      enSource: 'Liu Changqing (tr.)',
    },
  ],
};

/** Map each solar term id → quote cluster. */
const SOLAR_TERM_QUOTE_GROUP = {
  lichun: 'earlySpring',
  yushui: 'earlySpring',
  jingzhe: 'earlySpring',
  chunfen: 'midSpring',
  qingming: 'midSpring',
  guyu: 'midSpring',
  lixia: 'earlySummer',
  xiaoman: 'earlySummer',
  mangzhong: 'earlySummer',
  xiazhi: 'peakSummer',
  xiaoshu: 'peakSummer',
  dashu: 'peakSummer',
  liqiu: 'earlyAutumn',
  chushu: 'earlyAutumn',
  bailu: 'earlyAutumn',
  qiufen: 'midAutumn',
  hanlu: 'midAutumn',
  shuangjiang: 'midAutumn',
  lidong: 'deepWinter',
  xiaoxue: 'deepWinter',
  daxue: 'deepWinter',
  dongzhi: 'deepWinter',
  xiaohan: 'deepWinter',
  dahan: 'deepWinter',
};

const SOLAR_QUOTE_GROUPS = {
  earlySpring: {
    zh: '春江水暖鸭先知。',
    zhSource: '苏轼《惠崇春江晚景》',
    en: 'Spring river water warms — ducks sense it first.',
    enSource: 'Su Shi (tr.)',
  },
  midSpring: {
    zh: '好雨知时节，当春乃发生。',
    zhSource: '杜甫《春夜喜雨》',
    en: 'Good rain knows its season; when spring arrives, it stirs to life.',
    enSource: 'Du Fu, “Happy Rain on a Spring Night” (tr.)',
  },
  earlySummer: {
    zh: '绿树阴浓夏日长，楼台倒影入池塘。',
    zhSource: '高骈《山亭夏日》',
    en: 'Green trees, thick shade — summer days grow long; pavilion shadows slip into the pond.',
    enSource: 'Gao Pian (tr.)',
  },
  peakSummer: {
    zh: '力尽不知热，但惜夏日长。',
    zhSource: '白居易《观刈麦》',
    en: 'Spent, yet not feeling heat — only wishing summer days would linger.',
    enSource: 'Bai Juyi, “Watching the Wheat Reapers” (tr.)',
  },
  earlyAutumn: {
    zh: '空山新雨后，天气晚来秋。',
    zhSource: '王维《山居秋暝》',
    en: 'After rain in empty hills, evening air carries autumn.',
    enSource: 'Wang Wei, “Autumn Evening in the Mountains” (tr.)',
  },
  midAutumn: {
    zh: '一年好景君须记，最是橙黄橘绿时。',
    zhSource: '苏轼《赠刘景文》',
    en: 'Remember the year’s best scene — oranges yellow, tangerines green.',
    enSource: 'Su Shi (tr.)',
  },
  deepWinter: {
    zh: '晚来天欲雪，能饮一杯无？',
    zhSource: '白居易《问刘十九》',
    en: 'Evening sky promises snow — will you share one cup of wine?',
    enSource: 'Bai Juyi, “Inviting Liu Nineteen” (tr.)',
  },
  turnOfSeason: {
    zh: '逝者如斯夫，不舍昼夜。',
    zhSource: '《论语·子罕》',
    en: 'It passes like this river, never ceasing day or night.',
    enSource: 'The Analects (tr.)',
  },
};

function fnv1a32(str) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp01(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function shiftDailyDateKey(dateKey, deltaDays) {
  const d = dateFromDailyPaletteKey(dateKey);
  d.setDate(d.getDate() + deltaDays);
  return formatDailyPaletteDateKey(d);
}

/** 由 dateKey + 尝试序号生成候选色（确定性） */
function dailyHexCandidate(dateKey, attempt = 0) {
  const u = fnv1a32(`genom-zhuri-${dateKey}|v2|${attempt}`);
  const h = wrapHueDeg((u % 360) + attempt * 37);
  const L = clamp01(0.38 + ((u >>> 8) & 0xff) / 650 + ((attempt % 5) - 2) * 0.028, 0.28, 0.78);
  const C = clamp01(0.055 + ((u >>> 16) & 0x7f) / 900 + ((attempt % 3) - 1) * 0.012, 0.04, 0.13);
  return lchToHexClamped(L, C, h);
}

function isTooSimilarToRecent(hex, recentHexes) {
  for (const past of recentHexes) {
    if (!past) continue;
    if (past.toUpperCase() === hex.toUpperCase()) return true;
    if (oklabDistSqFromHex(hex, past) < DAILY_MIN_COLOR_DIST_SQ) return true;
  }
  return false;
}

function domainUsedRecently(hex, recentDomains) {
  const domain = classifyHexDomain(hex);
  return recentDomains.includes(domain);
}

function scoreDailyCandidate(hex, recentHexes, recentDomains) {
  let minDist = Infinity;
  for (const past of recentHexes) {
    if (!past) continue;
    minDist = Math.min(minDist, oklabDistSqFromHex(hex, past));
  }
  let score = minDist;
  if (domainUsedRecently(hex, recentDomains)) score -= 0.08;
  return score;
}

function pickDailyHexForKey(dateKey) {
  const colorLookback = [];
  for (let i = 1; i <= DAILY_COLOR_LOOKBACK_DAYS; i++) {
    const past = dailyHexCache.get(shiftDailyDateKey(dateKey, -i));
    if (past) colorLookback.push(past);
  }

  const domainLookback = [];
  for (let i = 1; i <= DAILY_DOMAIN_LOOKBACK_DAYS; i++) {
    const past = dailyHexCache.get(shiftDailyDateKey(dateKey, -i));
    if (past) domainLookback.push(classifyHexDomain(past));
  }

  for (let attempt = 0; attempt < DAILY_HEX_MAX_ATTEMPTS; attempt++) {
    const candidate = dailyHexCandidate(dateKey, attempt);
    if (!isTooSimilarToRecent(candidate, colorLookback) && !domainUsedRecently(candidate, domainLookback)) {
      return candidate;
    }
  }

  let best = dailyHexCandidate(dateKey, 0);
  let bestScore = -Infinity;
  for (let a = 0; a < DAILY_HEX_MAX_ATTEMPTS; a++) {
    const c = dailyHexCandidate(dateKey, a);
    const s = scoreDailyCandidate(c, colorLookback, domainLookback);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return best;
}

function ensureDailyHexChain(dateKey) {
  const maxLookback = Math.max(DAILY_COLOR_LOOKBACK_DAYS, DAILY_DOMAIN_LOOKBACK_DAYS);
  for (let i = maxLookback; i >= 1; i--) {
    const pastKey = shiftDailyDateKey(dateKey, -i);
    if (!dailyHexCache.has(pastKey)) {
      dailyHexCache.set(pastKey, pickDailyHexForKey(pastKey));
    }
  }
}

/**
 * Deterministic OKLCH swatch per GMT+8 calendar day.
 * Avoids repeating a near-identical color within {@link DAILY_COLOR_LOOKBACK_DAYS}
 * and the same 色系 within {@link DAILY_DOMAIN_LOOKBACK_DAYS}.
 */
export function dailyHexFromDateKey(dateKey) {
  const key = String(dateKey || '').trim();
  if (!key) return dailyHexCandidate(formatDailyPaletteDateKey(), 0);
  if (dailyHexCache.has(key)) return dailyHexCache.get(key);

  ensureDailyHexChain(key);
  const chosen = pickDailyHexForKey(key);
  dailyHexCache.set(key, chosen);
  return chosen;
}

/** 测试 / 调试：清空按日缓存 */
export function clearDailyHexCache() {
  dailyHexCache.clear();
}

/** Second stop for gradients / hero cards (companion only — not a separate named 国色). */
export function gradientPartnerHex(hex) {
  const norm = String(hex || '')
    .trim()
    .toUpperCase();
  const body = norm.startsWith('#') ? norm.slice(1) : norm;
  if (!/^[0-9A-F]{6}$/.test(body)) return '#0EA5E9';
  const u = fnv1a32(`partner|#${body}`);
  const h = wrapHueDeg((u + 38) % 360);
  const L = 0.34 + ((u >>> 9) & 0x7f) / 420;
  const C = 0.05 + ((u >>> 17) & 0x6f) / 520;
  return lchToHexClamped(L, C, h);
}

/**
 * 今日一句：节假日用固定章句；平日/节气从季候池 + 当日色与 dateKey 哈希择句，使色与诗同日绑定。
 */
function quoteForDailySwatch(hex, date, pick) {
  const dateKey = formatDailyPaletteDateKey(date);
  const seed = `${dateKey}|${hex}`;
  if (pick.type === 'holiday') {
    return HOLIDAY_QUOTES[pick.key] || SEASON_QUOTE_POOLS.spring[0];
  }
  if (pick.type === 'solar') {
    const g = SOLAR_TERM_QUOTE_GROUP[pick.termId] || 'turnOfSeason';
    const base = SOLAR_QUOTE_GROUPS[g] || SOLAR_QUOTE_GROUPS.turnOfSeason;
    const turn = SOLAR_QUOTE_GROUPS.turnOfSeason;
    const pool = turn && turn !== base ? [base, turn] : [base];
    const idx = fnv1a32(seed + (pick.termId || '')) % pool.length;
    return pool[idx];
  }
  const pool = SEASON_QUOTE_POOLS[pick.key] || SEASON_QUOTE_POOLS.spring;
  const idx = fnv1a32(seed) % pool.length;
  return pool[idx];
}

function daysBetween(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function nearestSolarTerm(date) {
  const y = date.getFullYear();
  const candidates = SOLAR_TERMS.map((t) => ({
    ...t,
    dt: new Date(y, t.m - 1, t.d),
  }));
  const tMs = date.getTime();
  let best = candidates[0];
  let bestAbs = Infinity;
  for (const c of candidates) {
    const d = Math.abs(tMs - c.dt.getTime());
    if (d < bestAbs) {
      bestAbs = d;
      best = c;
    }
  }
  const dayDiff = Math.abs(daysBetween(date, best.dt));
  return { term: best, dayDiff };
}

function pickThemeKey(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  if (m === 1 && d === 1) return { type: 'holiday', key: 'new_year' };
  if (m === 2 && d === 14) return { type: 'holiday', key: 'valentines' };
  if (m === 3 && d === 8) return { type: 'holiday', key: 'womens_day' };
  if (m === 4 && d === 22) return { type: 'holiday', key: 'earth_day' };
  if (m === 5 && d === 1) return { type: 'holiday', key: 'labor_day' };
  if (m === 6 && d === 19) return { type: 'holiday', key: 'juneteenth' };
  if (m === 7 && d === 4) return { type: 'holiday', key: 'july_fourth' };
  if (m === 10 && d === 1) return { type: 'holiday', key: 'national_cn' };
  if (m === 10 && d === 31) return { type: 'holiday', key: 'halloween' };
  if (m === 12 && d === 25) return { type: 'holiday', key: 'christmas' };

  const tg = thanksgivingDate(y);
  if (m === tg.getMonth() + 1 && d === tg.getDate()) return { type: 'holiday', key: 'thanksgiving' };

  /* Lunar new year rough window (varies): late Jan – mid Feb */
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return { type: 'holiday', key: 'lunar_season' };

  const { term, dayDiff } = nearestSolarTerm(date);
  if (dayDiff <= 2) return { type: 'solar', termId: term.id, termLabel: term.label, zh: term.zh };

  return { type: 'season', key: seasonKey(m) };
}

/**
 * @param {Date} [date]
 * @returns {{ dateKey: string, title: string, overview: string, themeType: string, colors: Array<{hex:string,name:string,rgb:number[],cmyk:number[]}>, keywords: string[], quote: { zh: string, zhSource: string, en: string, enSource: string } }}
 */
export function getDailyPalette(date = new Date()) {
  const dateKey = formatDailyPaletteDateKey(date);
  const pick = pickThemeKey(date);
  const hex = dailyHexFromDateKey(dateKey);
  const name = getPoeticColorName(hex);
  const quote = getPoeticQuoteForHex(hex);
  const title = name;
  const overview = `「${name}」· ${quote.zh} — 今日逐日观色 · ${hex}`;

  const keywords = ['GENOM Daily', '逐日观色', name, hex, dateKey];
  if (pick.type === 'holiday') keywords.push('节日');
  if (pick.type === 'solar') keywords.push(pick.zh, pick.termLabel);

  const e = enrichSwatch(hex);
  const colors = [{ ...e, name }];

  return {
    dateKey,
    title,
    overview,
    themeType: pick.type,
    colors,
    keywords,
    quote,
  };
}

/**
 * 今日一色挑战用：颜色名、hex、诗句、日期键
 * @param {Date} [date]
 */
export function getTodayColor(date = new Date()) {
  const p = getDailyPalette(date);
  const swatch = p.colors[0];
  const quote = p.quote;
  return {
    hex: swatch.hex,
    name: swatch.name,
    quote,
    poem: quote?.zh ?? '',
    poet: quote?.zhSource ?? '',
    dateKey: p.dateKey,
  };
}

/** 从 GMT+8 dateKey 构造用于 getDailyPalette 的 Date */
export function dateFromDailyPaletteKey(dateKey) {
  const [yy, mm, dd] = String(dateKey).split('-').map((n) => parseInt(n, 10));
  return new Date(Date.UTC(yy, mm - 1, dd, 4, 0, 0));
}

/** SVG gradient data URL for vault/card previews */
export function dailyPaletteCoverDataUrl(hexes) {
  const raw = (hexes || []).filter(Boolean);
  const primary = raw[0] || '#888888';
  const b = raw[1] || gradientPartnerHex(primary);
  const c = raw[2] || primary;
  const d = raw[3] || b;
  const e = raw[4] || primary;
  const a = primary;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="1200" viewBox="0 0 880 1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${a}"/><stop offset="25%" stop-color="${b}"/><stop offset="50%" stop-color="${c}"/><stop offset="75%" stop-color="${d}"/><stop offset="100%" stop-color="${e}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Shape compatible with `mapStyleRow` + community cards.
 */
export function buildDailyPaletteFeedItem(date = new Date()) {
  const p = getDailyPalette(date);
  const hexes = p.colors.map((c) => c.hex);
  const [yy, mm, dd] = p.dateKey.split('-').map((n) => parseInt(n, 10));
  const createdAt = new Date(yy, mm - 1, dd, 12, 0, 0, 0).toISOString();
  return {
    id: `daily-${p.dateKey}`,
    ownerUserId: null,
    imageUrl: dailyPaletteCoverDataUrl(hexes),
    aesthetic: p.title,
    typography: null,
    fonts: null,
    palette: hexes,
    designLogic: null,
    keywords: p.keywords,
    prompt: p.overview,
    extractionSnapshot: {
      colorCard: true,
      colorCardData: {
        overview: p.overview,
        colors: p.colors,
      },
      keywords: p.keywords,
      prompt: p.overview,
    },
    isPublic: true,
    createdAt,
    likeCount: 0,
    isDailyPalette: true,
    dailyDateKey: p.dateKey,
  };
}

/**
 * One feed item per calendar day going back from `endDate` (inclusive).
 * @param {Date} [endDate]
 * @param {number} [dayCount]
 */
export function buildDailyPaletteFeedItemsForHistory(endDate = new Date(), dayCount = DAILY_PALETTE_HISTORY_DAYS) {
  const n = Math.max(1, Math.min(dayCount, 366 * 5));
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    out.push(buildDailyPaletteFeedItem(d));
  }
  return out;
}

export function isDailyPaletteItemId(id) {
  return typeof id === 'string' && id.startsWith('daily-');
}
