import { enrichSwatch } from './colorValues';
import { pickChineseColorNameForDateKey } from './chineseTraditionalColorNames';

/** How many past calendar days of GENOM Daily cards appear in Community (inclusive of today). */
export const DAILY_PALETTE_HISTORY_DAYS = 365;

/** Local calendar date key YYYY-MM-DD */
export function formatDailyPaletteDateKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
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

const THEMES = {
  new_year: {
    title: 'Midnight Confetti',
    overview:
      'Electric neons and deep ink for a new year countdown — high contrast, optimistic, built for screens that stay on past midnight.',
    colors: [
      { hex: '#F8F4E8', name: 'Champagne Mist' },
      { hex: '#FFD60A', name: 'Ball Drop Gold' },
      { hex: '#FF006E', name: 'Party Magenta' },
      { hex: '#0D1B2A', name: 'After Midnight' },
      { hex: '#00F5D4', name: 'Digital Firework' },
    ],
    keywords: ['New Year', 'celebration', 'night'],
  },
  valentines: {
    title: 'Velvet & Ink',
    overview:
      'Romantic without cliché: dusty rose, deep wine, and a warm paper neutral — editorial love notes, not candy hearts.',
    colors: [
      { hex: '#FFF0F3', name: 'Blush Paper' },
      { hex: '#E8A0B8', name: 'Dusty Rose' },
      { hex: '#722F37', name: 'Claret' },
      { hex: '#2C1810', name: 'Chocolate Ink' },
      { hex: '#C9A227', name: 'Gilded Accent' },
    ],
    keywords: ["Valentine's", 'romance', 'rose'],
  },
  womens_day: {
    title: 'March Bloom',
    overview:
      "International Women's Day — confident violets, soft lilac, and a grounding green-black for strength and clarity.",
    colors: [
      { hex: '#F3E8FF', name: 'Soft Lilac' },
      { hex: '#9333EA', name: 'Amethyst Bold' },
      { hex: '#4C1D95', name: 'Deep Violet' },
      { hex: '#14532D', name: 'Evergreen Resolve' },
      { hex: '#FBBF24', name: 'Sunrise Accent' },
    ],
    keywords: ["Women's Day", 'March 8', 'equity'],
  },
  earth_day: {
    title: 'Living Planet',
    overview:
      'Earth Day — moss, river blue, and cloud white; a palette that reads “biosphere” without stock-photo greenwash.',
    colors: [
      { hex: '#ECFDF5', name: 'Mist Forest' },
      { hex: '#22C55E', name: 'Sprout' },
      { hex: '#166534', name: 'Canopy' },
      { hex: '#0EA5E9', name: 'River Run' },
      { hex: '#422006', name: 'Soil Memory' },
    ],
    keywords: ['Earth Day', 'green', 'climate'],
  },
  labor_day: {
    title: 'Solidarity Stripe',
    overview:
      "International Workers' Day — industrial red, safety amber, and steel neutrals; honest labor, dignified rest.",
    colors: [
      { hex: '#FEF3C7', name: 'Safety Cream' },
      { hex: '#DC2626', name: 'Union Red' },
      { hex: '#B45309', name: 'Work Amber' },
      { hex: '#1E293B', name: 'Steel Blue Black' },
      { hex: '#E2E8F0', name: 'Concrete Haze' },
    ],
    keywords: ['Labor Day', 'May 1', 'workers'],
  },
  national_cn: {
    title: 'Crimson Parade',
    overview:
      'National Day energy — flag red, star gold, and solemn slate; celebratory but structured.',
    colors: [
      { hex: '#FFF7ED', name: 'Dawn Paper' },
      { hex: '#DE2910', name: 'Ceremony Red' },
      { hex: '#FCD34D', name: 'Star Gold' },
      { hex: '#1C1917', name: 'Obsidian' },
      { hex: '#78716C', name: 'Granite' },
    ],
    keywords: ['National Day', 'October', 'festive'],
  },
  halloween: {
    title: 'Pumpkin Voltage',
    overview:
      'Halloween — purple dusk, toxic orange, and cemetery fog; playful horror for interfaces that wink.',
    colors: [
      { hex: '#FAF5FF', name: 'Ghost Fog' },
      { hex: '#7C3AED', name: 'Witch Violet' },
      { hex: '#EA580C', name: 'Jack-o-Lantern' },
      { hex: '#14532D', name: 'Rotting Moss' },
      { hex: '#000000', name: 'Midnight' },
    ],
    keywords: ['Halloween', 'autumn', 'spooky'],
  },
  thanksgiving: {
    title: 'Harvest Table',
    overview:
      'Thanksgiving — squash gold, cranberry, and linen; warm wood tones for long tables and long stories.',
    colors: [
      { hex: '#FEFCE8', name: 'Linen' },
      { hex: '#CA8A04', name: 'Squash Gold' },
      { hex: '#9F1239', name: 'Cranberry' },
      { hex: '#78350F', name: 'Cinnamon Wood' },
      { hex: '#365314', name: 'Sage Stem' },
    ],
    keywords: ['Thanksgiving', 'harvest', 'warm'],
  },
  july_fourth: {
    title: 'Summer Spark',
    overview:
      'Independence Day — cobalt, cream, and ember red; open-air fireworks and wide porches.',
    colors: [
      { hex: '#F8FAFC', name: 'Summer Haze' },
      { hex: '#B91C1C', name: 'Rocket Red' },
      { hex: '#1E3A8A', name: 'Night Sky Blue' },
      { hex: '#BFDBFE', name: 'Lawn Afternoon' },
      { hex: '#0F172A', name: 'Late Show' },
    ],
    keywords: ['July 4', 'summer', 'fireworks'],
  },
  christmas: {
    title: 'Evergreen Glow',
    overview:
      'Winter holiday — pine, berry, and candlelight cream; cozy UI without default “Christmas red” overload.',
    colors: [
      { hex: '#FFFBEB', name: 'Candle Cream' },
      { hex: '#14532D', name: 'Norway Pine' },
      { hex: '#991B1B', name: 'Winter Berry' },
      { hex: '#CA8A04', name: 'Brass Ornament' },
      { hex: '#0C4A6E', name: 'Frost Shadow' },
    ],
    keywords: ['Christmas', 'winter', 'holiday'],
  },
  juneteenth: {
    title: 'Freedom Banner',
    overview:
      'Juneteenth — Pan-African red, black, and green with a bright gold accent for joy and remembrance.',
    colors: [
      { hex: '#FEF9C3', name: 'Dawn Gold' },
      { hex: '#B91C1C', name: 'Liberation Red' },
      { hex: '#166534', name: 'Growth Green' },
      { hex: '#0A0A0A', name: 'Heritage Black' },
      { hex: '#EAB308', name: 'Jubilee' },
    ],
    keywords: ['Juneteenth', 'freedom', 'June'],
  },
  lunar_season: {
    title: 'Lantern Haze',
    overview:
      'Lunar new year season — vermillion, lacquer black, and jade paper; luck and renewal without noisy gradients.',
    colors: [
      { hex: '#FFF7ED', name: 'Rice Paper' },
      { hex: '#C2410C', name: 'Vermillion' },
      { hex: '#B45309', name: 'Lacquer Gold' },
      { hex: '#14532D', name: 'Jade Knot' },
      { hex: '#18181B', name: 'Ink Stone' },
    ],
    keywords: ['Lunar New Year', 'spring festival', 'red'],
  },
};

const SOLAR_THEME = {
  lichun: {
    title: 'First Thaw',
    overview:
      '立春 — ice recedes, branches sharpen; pale mint and bark brown for the hinge between winter and growth.',
    colors: [
      { hex: '#ECFEFF', name: 'Meltwater' },
      { hex: '#5EEAD4', name: 'Willow Mist' },
      { hex: '#78716C', name: 'Bare Branch' },
      { hex: '#365314', name: 'Budding Moss' },
      { hex: '#1E293B', name: 'Cold Soil' },
    ],
  },
  chunfen: {
    title: 'Equinox Balance',
    overview:
      '春分 — equal day and night; balanced sage, sand, and sky for calm, centered layouts.',
    colors: [
      { hex: '#F0FDF4', name: 'Sprout Mist' },
      { hex: '#86EFAC', name: 'Young Leaf' },
      { hex: '#FDE68A', name: 'Afternoon Sun' },
      { hex: '#38BDF8', name: 'Clear Sky' },
      { hex: '#334155', name: 'Shadow Line' },
    ],
  },
  xiazhi: {
    title: 'High Sun',
    overview:
      '夏至 — longest day; saturated citrus, pool blue, and white heat for peak summer interfaces.',
    colors: [
      { hex: '#FFFBEB', name: 'Heat Haze' },
      { hex: '#FACC15', name: 'Lemon Peak' },
      { hex: '#F97316', name: 'Sunburn Orange' },
      { hex: '#0EA5E9', name: 'Pool Blue' },
      { hex: '#172554', name: 'Late Dusk' },
    ],
  },
  qiufen: {
    title: 'Harvest Balance',
    overview:
      '秋分 — crops and copper light; ochre, wheat, and dusk blue for transitional autumn.',
    colors: [
      { hex: '#FFFBEB', name: 'Wheat Field' },
      { hex: '#D97706', name: 'Ochre' },
      { hex: '#B45309', name: 'Copper Leaf' },
      { hex: '#57534E', name: 'Stone Path' },
      { hex: '#1E3A8A', name: 'Evening Indigo' },
    ],
  },
  dongzhi: {
    title: 'Solstice Ember',
    overview:
      '冬至 — shortest day; ember, charcoal, and frost blue; warmth saved for the center of the layout.',
    colors: [
      { hex: '#F8FAFC', name: 'Frost Paper' },
      { hex: '#94A3B8', name: 'Winter Sky' },
      { hex: '#EA580C', name: 'Hearth Ember' },
      { hex: '#1E293B', name: 'Long Night' },
      { hex: '#0F172A', name: 'Polar Shadow' },
    ],
  },
  default: {
    title: 'Turn of Season',
    overview:
      'Solar rhythm — earth, air, and slow color shift; a grounded palette tuned to the traditional calendar.',
    colors: [
      { hex: '#F5F5F4', name: 'Limestone' },
      { hex: '#A8A29E', name: 'River Stone' },
      { hex: '#57534E', name: 'Loam' },
      { hex: '#292524', name: 'Pine Bark' },
      { hex: '#0C0A09', name: 'Root Black' },
    ],
  },
};

function solarPaletteForTerm(termId) {
  const map = {
    lichun: SOLAR_THEME.lichun,
    yushui: SOLAR_THEME.lichun,
    jingzhe: SOLAR_THEME.lichun,
    chunfen: SOLAR_THEME.chunfen,
    qingming: SOLAR_THEME.chunfen,
    guyu: SOLAR_THEME.chunfen,
    lixia: SOLAR_THEME.xiazhi,
    xiaoman: SOLAR_THEME.xiazhi,
    mangzhong: SOLAR_THEME.xiazhi,
    xiazhi: SOLAR_THEME.xiazhi,
    xiaoshu: SOLAR_THEME.xiazhi,
    dashu: SOLAR_THEME.xiazhi,
    liqiu: SOLAR_THEME.qiufen,
    chushu: SOLAR_THEME.qiufen,
    bailu: SOLAR_THEME.qiufen,
    qiufen: SOLAR_THEME.qiufen,
    hanlu: SOLAR_THEME.dongzhi,
    shuangjiang: SOLAR_THEME.dongzhi,
    lidong: SOLAR_THEME.dongzhi,
    xiaoxue: SOLAR_THEME.dongzhi,
    daxue: SOLAR_THEME.dongzhi,
    dongzhi: SOLAR_THEME.dongzhi,
    xiaohan: SOLAR_THEME.dongzhi,
    dahan: SOLAR_THEME.dongzhi,
  };
  return map[termId] || SOLAR_THEME.default;
}

const SEASON_FALLBACK = {
  spring: {
    title: 'Paper Cherry',
    overview:
      'Spring default — blush wind, wet bark, and fresh green for interfaces that feel like opening windows.',
    colors: [
      { hex: '#FFF1F2', name: 'Petal Drift' },
      { hex: '#FDA4AF', name: 'Blossom' },
      { hex: '#4D7C0F', name: 'New Grass' },
      { hex: '#44403C', name: 'Wet Bark' },
      { hex: '#0EA5E9', name: 'April Rain' },
    ],
    keywords: ['spring', 'fresh'],
  },
  summer: {
    title: 'Salt & Citrus',
    overview:
      'Summer default — high-key yellows, sea teal, and white sand for bright, legible heat.',
    colors: [
      { hex: '#FFFBEB', name: 'Sun Bleach' },
      { hex: '#FDE047', name: 'Lemonade' },
      { hex: '#14B8A6', name: 'Sea Glass' },
      { hex: '#0369A1', name: 'Deep Swim' },
      { hex: '#1E293B', name: 'Beach Shadow' },
    ],
    keywords: ['summer', 'bright'],
  },
  autumn: {
    title: 'Copper Rust',
    overview:
      'Autumn default — rust, plum, and fog gray for editorial fall without pumpkin spice defaults.',
    colors: [
      { hex: '#FEF3C7', name: 'Hay Light' },
      { hex: '#C2410C', name: 'Rust' },
      { hex: '#7C2D12', name: 'Burnt Umber' },
      { hex: '#57534E', name: 'Fog Stone' },
      { hex: '#312E81', name: 'Plum Dusk' },
    ],
    keywords: ['autumn', 'warm'],
  },
  winter: {
    title: 'Polar Quiet',
    overview:
      'Winter default — ice blue, wool gray, and a single ember accent for cold clarity.',
    colors: [
      { hex: '#F8FAFC', name: 'Snow Blind' },
      { hex: '#CBD5E1', name: 'Wool' },
      { hex: '#64748B', name: 'Slate Frost' },
      { hex: '#0EA5E9', name: 'Glacier' },
      { hex: '#0F172A', name: 'Polar Night' },
    ],
    keywords: ['winter', 'cool'],
  },
};

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

const SEASON_QUOTES = {
  spring: {
    zh: '等闲识得东风面，万紫千红总是春。',
    zhSource: '朱熹《春日》',
    en: 'Casually I meet the face of the east wind: ten thousand purples, a thousand reds — all are spring.',
    enSource: 'Zhu Xi, “Spring Day” (tr.)',
  },
  summer: {
    zh: '接天莲叶无穷碧，映日荷花别样红。',
    zhSource: '杨万里《晓出净慈寺送林子方》',
    en: 'Lotus leaves to the horizon, endless jade green; lotus flowers in the sun, red beyond red.',
    enSource: 'Yang Wanli (tr.)',
  },
  autumn: {
    zh: '自古逢秋悲寂寥，我言秋日胜春朝。',
    zhSource: '刘禹锡《秋词》',
    en: 'Since old days, autumn meant sorrow — I say a clear autumn morning beats spring.',
    enSource: 'Liu Yuxi, “Autumn Song” (tr.)',
  },
  winter: {
    zh: '忽如一夜春风来，千树万树梨花开。',
    zhSource: '岑参《白雪歌送武判官归京》',
    en: 'Overnight it seems spring wind came — pear blossoms fill every tree.',
    enSource: 'Cen Shen, on snow (tr.)',
  },
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

function quoteForPick(pick) {
  if (pick.type === 'holiday') {
    return HOLIDAY_QUOTES[pick.key] || SEASON_QUOTES.spring;
  }
  if (pick.type === 'solar') {
    const g = SOLAR_TERM_QUOTE_GROUP[pick.termId] || 'turnOfSeason';
    return SOLAR_QUOTE_GROUPS[g] || SOLAR_QUOTE_GROUPS.turnOfSeason;
  }
  return SEASON_QUOTES[pick.key] || SEASON_QUOTES.spring;
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
  const quote = quoteForPick(pick);

  let title;
  let overview;
  let rawColors;
  let keywords;

  if (pick.type === 'holiday') {
    const pack = THEMES[pick.key];
    title = pack.title;
    overview = pack.overview;
    rawColors = pack.colors;
    keywords = ['GENOM Daily', ...pack.keywords];
  } else if (pick.type === 'solar') {
    const sp = solarPaletteForTerm(pick.termId);
    title = `${sp.title} · ${pick.zh}`;
    overview = `${sp.overview} (${pick.termLabel}).`;
    rawColors = sp.colors;
    keywords = ['GENOM Daily', '24 solar terms', pick.zh, pick.termLabel];
  } else {
    const pack = SEASON_FALLBACK[pick.key];
    /* 无节假日、非节气邻近日：以中国色名为调色板标题，色带仍随季节 */
    title = pickChineseColorNameForDateKey(dateKey);
    overview = `「${title}」— ${pack.overview}`;
    rawColors = pack.colors;
    keywords = ['GENOM Daily', '中国色', title, ...pack.keywords];
  }

  const colors = rawColors.map((c) => {
    const e = enrichSwatch(c.hex);
    return { ...e, name: c.name };
  });

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

/** SVG gradient data URL for vault/card previews */
export function dailyPaletteCoverDataUrl(hexes) {
  const list = (hexes || []).slice(0, 5);
  while (list.length < 5) list.push('#888888');
  const [a, b, c, d, e] = list;
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
