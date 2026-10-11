/**
 * 主题色约束：标签必须能在色卡里被认出来。
 * 国庆节要有红金，海洋要有青蓝，而不是随机套标签。
 */

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function wrapHue(h) {
  return ((h % 360) + 360) % 360;
}

export function hexToHsl(hex) {
  const s = String(hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  const r = parseInt(s.slice(0, 2), 16) / 255;
  const g = parseInt(s.slice(2, 4), 16) / 255;
  const b = parseInt(s.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: sat * 100, l: l * 100 };
}

export function hslToHex(h, s, l) {
  const hh = wrapHue(h);
  const ss = clamp(s, 0, 100) / 100;
  const ll = clamp(l, 0, 100) / 100;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n) => {
    const k = (n + hh / 30) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** @typedef {'red'|'orange'|'gold'|'yellow'|'green'|'teal'|'blue'|'purple'|'pink'|'brown'|'gray'|'black'|'white'} HueFamily */

const FAMILY_ZH = {
  red: '红',
  orange: '橙',
  gold: '金',
  yellow: '黄',
  green: '绿',
  teal: '青',
  blue: '蓝',
  purple: '紫',
  pink: '粉',
  brown: '褐',
  gray: '灰',
  black: '墨',
  white: '白',
};

export function classifyFamily(hsl) {
  if (!hsl) return 'gray';
  const { h, s, l } = hsl;
  if (l >= 90 && s < 14) return 'white';
  if (l <= 14 && s < 22) return 'black';
  if (s < 10) return l > 72 ? 'white' : l < 28 ? 'black' : 'gray';
  if (s < 28 && l < 48 && (h < 50 || h > 330)) return 'brown';
  if (h >= 350 || h < 14) return l > 68 && s < 55 ? 'pink' : 'red';
  if (h < 28) return l > 70 && s < 45 ? 'pink' : 'orange';
  if (h < 42) return 'orange';
  if (h < 54) return 'gold';
  if (h < 72) return 'yellow';
  if (h < 160) return 'green';
  if (h < 195) return 'teal';
  if (h < 250) return 'blue';
  if (h < 295) return 'purple';
  if (h < 335) return s > 35 && l < 55 ? 'purple' : 'pink';
  return l > 62 ? 'pink' : 'red';
}

function hasFamily(stats, names, { minS = 18, maxL = 96, minL = 6, minN = 1 } = {}) {
  const set = new Set(names);
  const n = stats.filter((c) => (
    set.has(classifyFamily(c)) && c.s >= minS && c.l <= maxL && c.l >= minL
  )).length;
  return n >= minN;
}

function majority(stats, names, minN = 2) {
  const set = new Set(names);
  return stats.filter((c) => set.has(classifyFamily(c))).length >= minN;
}

/**
 * 每个主题：色卡里必须能看见这些颜色。
 * require = 至少一枚；also = 再至少一枚；majority = 至少两枚落在这些色族。
 */
export const THEME_FIT = {
  海洋: { majority: ['teal', 'blue', 'white'] },
  森林: { majority: ['green', 'brown'] },
  星空宇宙: { majority: ['blue', 'purple', 'black'] },
  山川湖泊: { majority: ['blue', 'teal', 'green', 'gray', 'white'] },
  春节: { require: ['red'], also: ['gold', 'yellow', 'orange'] },
  中秋: { require: ['gold', 'yellow', 'orange'], also: ['brown', 'gold', 'yellow', 'orange', 'blue'] },
  端午: { majority: ['green', 'gold', 'yellow'] },
  圣诞节: { require: ['red'], also: ['green'] },
  情人节: { majority: ['pink', 'red'] },
  青春校园: { majority: ['blue', 'green', 'yellow', 'orange', 'gold'] },
  毕业季: { majority: ['blue', 'gold', 'yellow', 'black', 'white'] },
  开学季: { majority: ['yellow', 'blue', 'red', 'orange'] },
  校园青春: { majority: ['orange', 'blue', 'yellow', 'green'] },
  生日派对: { majority: ['pink', 'yellow', 'gold', 'orange'] },
  婚礼婚庆: { majority: ['pink', 'gold', 'white', 'yellow', 'red'] },
  成人礼: { majority: ['blue', 'gold', 'black', 'purple'] },
  金榜题名: { require: ['red'], also: ['gold', 'yellow'] },
  运动会: { majority: ['red', 'green', 'blue', 'orange'] },
  音乐节: { majority: ['purple', 'pink', 'gold', 'orange', 'teal'] },
  市集文创: { majority: ['brown', 'gold', 'orange', 'red'] },
  公益环保: { majority: ['green', 'teal', 'brown'] },
  '24节气': { majority: ['green', 'gold', 'orange', 'brown', 'teal'] },
  考试季: { majority: ['gold', 'yellow', 'brown', 'white', 'orange'] },
  寒暑假: { majority: ['blue', 'teal', 'yellow', 'orange'] },
  读书季: { majority: ['brown', 'gold', 'yellow', 'white', 'orange'] },
  年终: { majority: ['gold', 'brown', 'gray', 'yellow', 'orange'] },
  元旦: { require: ['gold', 'yellow'], also: ['red', 'blue', 'black'] },
  腊八: { majority: ['brown', 'red', 'gold'] },
  元宵: { require: ['red', 'gold', 'orange'], also: ['gold', 'yellow', 'red'] },
  妇女节: { majority: ['pink', 'purple'] },
  植树节: { majority: ['green'] },
  清明: { majority: ['green', 'gray', 'white'] },
  愚人节: { majority: ['yellow', 'orange', 'pink', 'teal'] },
  劳动节: { majority: ['orange', 'yellow', 'gray'] },
  青年节: { require: ['red'], also: ['gold', 'yellow', 'white'] },
  母亲节: { majority: ['pink', 'red', 'gold'] },
  护士节: { majority: ['white', 'blue', 'teal', 'pink', 'gray'] },
  儿童节: { majority: ['yellow', 'orange', 'pink', 'green', 'blue'] },
  父亲节: { majority: ['brown', 'blue', 'gray'] },
  七夕: { majority: ['pink', 'red', 'purple', 'gold'] },
  重阳: { majority: ['gold', 'orange', 'brown', 'yellow', 'red'] },
  国庆节: { require: ['red'], also: ['gold', 'yellow', 'orange'] },
  抗战纪念日: { majority: ['gray', 'black', 'brown', 'gold'] },
  国家公祭日: { majority: ['white', 'black', 'gray'] },
  万圣节: { require: ['orange'], also: ['black', 'purple'] },
  感恩节: { majority: ['orange', 'brown', 'gold'] },
};

export function themeFitsColors(theme, hexes) {
  const rule = THEME_FIT[theme];
  if (!rule) return true;
  const stats = (hexes || []).map(hexToHsl).filter(Boolean);
  if (stats.length < 3) return false;
  if (rule.require && !hasFamily(stats, rule.require, { minS: 26, minN: 1 })) return false;
  if (rule.also && !hasFamily(stats, rule.also, { minS: 18, minN: 1 })) return false;
  if (rule.majority && !majority(stats, rule.majority, 2)) return false;
  return true;
}

export function inferThemeFromColors(hexes) {
  const hits = Object.keys(THEME_FIT).filter((t) => themeFitsColors(t, hexes));
  if (!hits.length) return null;
  const joined = (hexes || []).join('');
  let hash = 0;
  for (let i = 0; i < joined.length; i += 1) hash = (hash * 33 + joined.charCodeAt(i)) >>> 0;
  return hits[hash % hits.length];
}

/** 生色风格如何压/放饱和与明度 */
export const STYLE_ENVELOPES = {
  极简: { sMul: 0.46, sBias: -6, lShift: 8, sMax: 46, lMin: 38, lMax: 92 },
  现代: { sMul: 0.62, lShift: 4, sMax: 64, lMin: 26, lMax: 90 },
  复古: { sMul: 0.86, lShift: -4, sMin: 34, sMax: 80, lMin: 30, lMax: 72 },
  自然: { sMul: 0.72, sMax: 68, lMin: 28, lMax: 82 },
  奶油: { sMul: 0.42, lShift: 14, sMax: 48, lMin: 62, lMax: 92 },
  马卡龙: { sMul: 0.78, lShift: 10, sMin: 36, sMax: 78, lMin: 58, lMax: 88 },
  莫兰迪: { sMul: 0.38, sBias: -4, lShift: 6, sMax: 40, lMin: 48, lMax: 82 },
  温柔韩系: { sMul: 0.44, lShift: 10, sMax: 50, lMin: 56, lMax: 90 },
  'ins 清新': { sMul: 0.58, lShift: 8, sMax: 58, lMin: 52, lMax: 90 },
  新中式: { sMul: 0.58, lShift: -2, sMax: 62, lMin: 22, lMax: 84 },
  Y2K: { sMul: 1.02, sMin: 48, sMax: 96, lMin: 42, lMax: 78 },
  赛博朋克: { sMul: 1.08, sMin: 62, sMax: 100, lMin: 28, lMax: 68 },
  学院风: { sMul: 0.52, lShift: 2, sMax: 54, lMin: 32, lMax: 86 },
  田园风: { sMul: 0.64, sMax: 62, lMin: 30, lMax: 80 },
  暗黑哥特: { sMul: 0.72, lShift: -10, sMax: 72, lMin: 10, lMax: 56 },
  波西米亚: { sMul: 0.92, sMin: 40, sMax: 88, lMin: 32, lMax: 74 },
};

function applyEnvelope(h, s, l, env) {
  const ss = clamp(s * (env.sMul ?? 1) + (env.sBias ?? 0), env.sMin ?? 8, env.sMax ?? 96);
  const ll = clamp(l + (env.lShift ?? 0), env.lMin ?? 8, env.lMax ?? 94);
  return { h: wrapHue(h), s: ss, l: ll };
}

function jitter(hsl, seed, i) {
  const h = hsl.h + ((seed * 7 + i * 13) % 9) - 4;
  const s = hsl.s + ((seed * 3 + i * 5) % 11) - 5;
  const l = hsl.l + ((seed * 5 + i * 7) % 9) - 4;
  return { h: wrapHue(h), s: clamp(s, 6, 98), l: clamp(l, 6, 95) };
}

/** 每主题 2～3 套已调和的五色骨架（再经风格信封变化） */
export const THEME_RECIPES = {
  海洋: [
    [{ h: 198, s: 48, l: 38 }, { h: 186, s: 36, l: 58 }, { h: 205, s: 22, l: 82 }, { h: 38, s: 28, l: 78 }, { h: 210, s: 40, l: 18 }],
    [{ h: 174, s: 42, l: 42 }, { h: 192, s: 50, l: 28 }, { h: 188, s: 18, l: 88 }, { h: 32, s: 34, l: 70 }, { h: 200, s: 30, l: 52 }],
  ],
  森林: [
    [{ h: 128, s: 36, l: 28 }, { h: 110, s: 42, l: 42 }, { h: 95, s: 22, l: 72 }, { h: 28, s: 28, l: 32 }, { h: 140, s: 18, l: 86 }],
    [{ h: 142, s: 30, l: 22 }, { h: 118, s: 38, l: 48 }, { h: 88, s: 34, l: 58 }, { h: 32, s: 22, l: 42 }, { h: 150, s: 14, l: 80 }],
  ],
  星空宇宙: [
    [{ h: 232, s: 42, l: 14 }, { h: 252, s: 38, l: 28 }, { h: 268, s: 30, l: 46 }, { h: 42, s: 28, l: 82 }, { h: 220, s: 20, l: 8 }],
    [{ h: 246, s: 50, l: 18 }, { h: 210, s: 36, l: 24 }, { h: 280, s: 42, l: 38 }, { h: 200, s: 18, l: 70 }, { h: 230, s: 28, l: 10 }],
  ],
  山川湖泊: [
    [{ h: 200, s: 28, l: 48 }, { h: 168, s: 22, l: 62 }, { h: 40, s: 12, l: 78 }, { h: 130, s: 20, l: 32 }, { h: 210, s: 16, l: 86 }],
    [{ h: 188, s: 34, l: 40 }, { h: 28, s: 18, l: 56 }, { h: 150, s: 24, l: 28 }, { h: 205, s: 14, l: 80 }, { h: 220, s: 22, l: 22 }],
  ],
  春节: [
    [{ h: 4, s: 78, l: 42 }, { h: 8, s: 70, l: 32 }, { h: 44, s: 72, l: 52 }, { h: 40, s: 36, l: 86 }, { h: 20, s: 18, l: 14 }],
    [{ h: 0, s: 72, l: 46 }, { h: 42, s: 68, l: 48 }, { h: 12, s: 58, l: 28 }, { h: 36, s: 22, l: 90 }, { h: 38, s: 50, l: 68 }],
  ],
  中秋: [
    [{ h: 40, s: 62, l: 56 }, { h: 32, s: 48, l: 42 }, { h: 28, s: 28, l: 72 }, { h: 222, s: 28, l: 22 }, { h: 44, s: 20, l: 88 }],
    [{ h: 46, s: 58, l: 50 }, { h: 24, s: 36, l: 38 }, { h: 38, s: 42, l: 76 }, { h: 18, s: 22, l: 24 }, { h: 42, s: 30, l: 84 }],
  ],
  端午: [
    [{ h: 92, s: 38, l: 36 }, { h: 78, s: 46, l: 48 }, { h: 44, s: 52, l: 54 }, { h: 128, s: 22, l: 22 }, { h: 70, s: 16, l: 84 }],
    [{ h: 108, s: 34, l: 32 }, { h: 48, s: 48, l: 50 }, { h: 86, s: 28, l: 64 }, { h: 30, s: 24, l: 28 }, { h: 140, s: 18, l: 78 }],
  ],
  圣诞节: [
    [{ h: 4, s: 72, l: 38 }, { h: 142, s: 42, l: 28 }, { h: 44, s: 58, l: 56 }, { h: 130, s: 16, l: 88 }, { h: 150, s: 30, l: 18 }],
    [{ h: 8, s: 64, l: 32 }, { h: 128, s: 36, l: 36 }, { h: 40, s: 42, l: 78 }, { h: 0, s: 48, l: 52 }, { h: 140, s: 22, l: 14 }],
  ],
  情人节: [
    [{ h: 348, s: 52, l: 52 }, { h: 340, s: 38, l: 72 }, { h: 18, s: 28, l: 32 }, { h: 350, s: 22, l: 88 }, { h: 352, s: 46, l: 28 }],
    [{ h: 354, s: 58, l: 46 }, { h: 12, s: 32, l: 70 }, { h: 330, s: 24, l: 82 }, { h: 20, s: 36, l: 28 }, { h: 344, s: 40, l: 62 }],
  ],
  青春校园: [
    [{ h: 208, s: 42, l: 58 }, { h: 118, s: 34, l: 48 }, { h: 42, s: 48, l: 72 }, { h: 24, s: 18, l: 88 }, { h: 220, s: 22, l: 32 }],
    [{ h: 198, s: 36, l: 64 }, { h: 32, s: 52, l: 58 }, { h: 130, s: 28, l: 40 }, { h: 40, s: 12, l: 90 }, { h: 214, s: 30, l: 28 }],
  ],
  毕业季: [
    [{ h: 220, s: 22, l: 16 }, { h: 40, s: 48, l: 72 }, { h: 208, s: 36, l: 62 }, { h: 348, s: 28, l: 70 }, { h: 44, s: 42, l: 52 }],
    [{ h: 214, s: 28, l: 24 }, { h: 42, s: 36, l: 82 }, { h: 200, s: 22, l: 78 }, { h: 38, s: 50, l: 48 }, { h: 230, s: 16, l: 12 }],
  ],
  开学季: [
    [{ h: 46, s: 62, l: 56 }, { h: 208, s: 32, l: 48 }, { h: 6, s: 58, l: 46 }, { h: 38, s: 14, l: 88 }, { h: 220, s: 12, l: 36 }],
    [{ h: 40, s: 54, l: 62 }, { h: 198, s: 28, l: 68 }, { h: 12, s: 48, l: 40 }, { h: 30, s: 18, l: 84 }, { h: 210, s: 20, l: 30 }],
  ],
  校园青春: [
    [{ h: 22, s: 62, l: 56 }, { h: 210, s: 34, l: 42 }, { h: 38, s: 48, l: 72 }, { h: 128, s: 28, l: 46 }, { h: 40, s: 10, l: 90 }],
    [{ h: 28, s: 54, l: 50 }, { h: 200, s: 40, l: 58 }, { h: 48, s: 42, l: 78 }, { h: 214, s: 22, l: 28 }, { h: 110, s: 24, l: 62 }],
  ],
  生日派对: [
    [{ h: 340, s: 48, l: 68 }, { h: 44, s: 52, l: 72 }, { h: 18, s: 42, l: 58 }, { h: 160, s: 28, l: 78 }, { h: 36, s: 16, l: 90 }],
    [{ h: 350, s: 42, l: 62 }, { h: 38, s: 58, l: 64 }, { h: 320, s: 32, l: 76 }, { h: 28, s: 36, l: 48 }, { h: 48, s: 20, l: 88 }],
  ],
  婚礼婚庆: [
    [{ h: 346, s: 32, l: 74 }, { h: 38, s: 36, l: 72 }, { h: 36, s: 12, l: 90 }, { h: 20, s: 28, l: 58 }, { h: 140, s: 14, l: 68 }],
    [{ h: 352, s: 28, l: 68 }, { h: 42, s: 42, l: 64 }, { h: 30, s: 10, l: 92 }, { h: 348, s: 22, l: 52 }, { h: 40, s: 24, l: 80 }],
  ],
  成人礼: [
    [{ h: 228, s: 32, l: 18 }, { h: 42, s: 48, l: 52 }, { h: 352, s: 36, l: 28 }, { h: 38, s: 14, l: 88 }, { h: 230, s: 12, l: 8 }],
    [{ h: 250, s: 28, l: 22 }, { h: 40, s: 42, l: 60 }, { h: 220, s: 20, l: 36 }, { h: 36, s: 18, l: 84 }, { h: 260, s: 16, l: 12 }],
  ],
  金榜题名: [
    [{ h: 6, s: 72, l: 40 }, { h: 44, s: 68, l: 50 }, { h: 38, s: 18, l: 86 }, { h: 20, s: 16, l: 16 }, { h: 40, s: 42, l: 68 }],
    [{ h: 2, s: 64, l: 36 }, { h: 42, s: 58, l: 46 }, { h: 32, s: 22, l: 80 }, { h: 16, s: 20, l: 20 }, { h: 48, s: 36, l: 58 }],
  ],
  运动会: [
    [{ h: 4, s: 70, l: 46 }, { h: 128, s: 40, l: 40 }, { h: 208, s: 48, l: 50 }, { h: 40, s: 12, l: 92 }, { h: 42, s: 56, l: 52 }],
    [{ h: 14, s: 68, l: 50 }, { h: 210, s: 42, l: 42 }, { h: 110, s: 36, l: 48 }, { h: 0, s: 8, l: 88 }, { h: 38, s: 48, l: 60 }],
  ],
  音乐节: [
    [{ h: 292, s: 52, l: 48 }, { h: 42, s: 58, l: 54 }, { h: 248, s: 36, l: 22 }, { h: 172, s: 34, l: 62 }, { h: 320, s: 28, l: 76 }],
    [{ h: 328, s: 56, l: 52 }, { h: 38, s: 50, l: 48 }, { h: 268, s: 40, l: 28 }, { h: 186, s: 30, l: 58 }, { h: 300, s: 22, l: 80 }],
  ],
  市集文创: [
    [{ h: 28, s: 36, l: 42 }, { h: 8, s: 52, l: 40 }, { h: 38, s: 32, l: 68 }, { h: 118, s: 22, l: 38 }, { h: 210, s: 20, l: 46 }],
    [{ h: 32, s: 42, l: 48 }, { h: 18, s: 38, l: 30 }, { h: 40, s: 24, l: 78 }, { h: 6, s: 44, l: 46 }, { h: 24, s: 18, l: 22 }],
  ],
  公益环保: [
    [{ h: 122, s: 36, l: 42 }, { h: 88, s: 28, l: 58 }, { h: 38, s: 22, l: 74 }, { h: 198, s: 24, l: 62 }, { h: 28, s: 24, l: 32 }],
    [{ h: 140, s: 32, l: 36 }, { h: 100, s: 24, l: 68 }, { h: 42, s: 16, l: 84 }, { h: 174, s: 28, l: 48 }, { h: 32, s: 20, l: 28 }],
  ],
  '24节气': [
    [{ h: 92, s: 28, l: 48 }, { h: 48, s: 36, l: 56 }, { h: 18, s: 42, l: 46 }, { h: 168, s: 18, l: 70 }, { h: 32, s: 16, l: 24 }],
    [{ h: 22, s: 52, l: 48 }, { h: 38, s: 40, l: 66 }, { h: 118, s: 24, l: 40 }, { h: 28, s: 18, l: 82 }, { h: 20, s: 22, l: 22 }],
  ],
  考试季: [
    [{ h: 42, s: 48, l: 62 }, { h: 38, s: 16, l: 88 }, { h: 348, s: 18, l: 78 }, { h: 28, s: 14, l: 20 }, { h: 36, s: 28, l: 48 }],
    [{ h: 46, s: 42, l: 56 }, { h: 32, s: 20, l: 82 }, { h: 40, s: 12, l: 90 }, { h: 22, s: 18, l: 26 }, { h: 38, s: 34, l: 70 }],
  ],
  寒暑假: [
    [{ h: 198, s: 42, l: 68 }, { h: 32, s: 56, l: 58 }, { h: 38, s: 28, l: 82 }, { h: 8, s: 48, l: 52 }, { h: 210, s: 24, l: 40 }],
    [{ h: 186, s: 36, l: 62 }, { h: 44, s: 48, l: 70 }, { h: 18, s: 42, l: 54 }, { h: 200, s: 16, l: 88 }, { h: 220, s: 28, l: 32 }],
  ],
  读书季: [
    [{ h: 36, s: 22, l: 78 }, { h: 24, s: 16, l: 22 }, { h: 8, s: 32, l: 38 }, { h: 40, s: 18, l: 62 }, { h: 32, s: 10, l: 88 }],
    [{ h: 32, s: 28, l: 70 }, { h: 20, s: 18, l: 28 }, { h: 42, s: 32, l: 52 }, { h: 28, s: 12, l: 84 }, { h: 16, s: 22, l: 18 }],
  ],
  年终: [
    [{ h: 40, s: 36, l: 62 }, { h: 32, s: 12, l: 72 }, { h: 28, s: 18, l: 38 }, { h: 36, s: 8, l: 86 }, { h: 22, s: 16, l: 24 }],
    [{ h: 38, s: 42, l: 54 }, { h: 24, s: 20, l: 46 }, { h: 40, s: 14, l: 80 }, { h: 30, s: 10, l: 32 }, { h: 42, s: 24, l: 68 }],
  ],
  元旦: [
    [{ h: 44, s: 68, l: 52 }, { h: 4, s: 64, l: 42 }, { h: 228, s: 28, l: 16 }, { h: 40, s: 18, l: 88 }, { h: 48, s: 36, l: 72 }],
    [{ h: 42, s: 58, l: 48 }, { h: 8, s: 52, l: 50 }, { h: 220, s: 22, l: 22 }, { h: 36, s: 12, l: 90 }, { h: 38, s: 44, l: 64 }],
  ],
  腊八: [
    [{ h: 24, s: 38, l: 36 }, { h: 8, s: 48, l: 34 }, { h: 38, s: 32, l: 58 }, { h: 28, s: 16, l: 78 }, { h: 18, s: 22, l: 20 }],
    [{ h: 20, s: 42, l: 40 }, { h: 4, s: 40, l: 38 }, { h: 42, s: 28, l: 66 }, { h: 32, s: 18, l: 24 }, { h: 16, s: 26, l: 52 }],
  ],
  元宵: [
    [{ h: 8, s: 70, l: 44 }, { h: 42, s: 62, l: 52 }, { h: 24, s: 48, l: 38 }, { h: 36, s: 20, l: 86 }, { h: 220, s: 22, l: 16 }],
    [{ h: 4, s: 64, l: 48 }, { h: 38, s: 54, l: 60 }, { h: 14, s: 42, l: 32 }, { h: 44, s: 28, l: 78 }, { h: 30, s: 18, l: 18 }],
  ],
  妇女节: [
    [{ h: 292, s: 28, l: 68 }, { h: 336, s: 32, l: 72 }, { h: 320, s: 22, l: 84 }, { h: 268, s: 20, l: 52 }, { h: 340, s: 16, l: 90 }],
    [{ h: 328, s: 36, l: 64 }, { h: 300, s: 24, l: 76 }, { h: 348, s: 28, l: 58 }, { h: 280, s: 18, l: 44 }, { h: 330, s: 14, l: 88 }],
  ],
  植树节: [
    [{ h: 118, s: 42, l: 40 }, { h: 88, s: 34, l: 52 }, { h: 28, s: 28, l: 36 }, { h: 198, s: 22, l: 68 }, { h: 130, s: 18, l: 80 }],
    [{ h: 132, s: 36, l: 34 }, { h: 100, s: 30, l: 58 }, { h: 32, s: 24, l: 28 }, { h: 110, s: 20, l: 74 }, { h: 148, s: 26, l: 46 }],
  ],
  清明: [
    [{ h: 118, s: 16, l: 48 }, { h: 40, s: 8, l: 72 }, { h: 100, s: 20, l: 36 }, { h: 200, s: 8, l: 80 }, { h: 130, s: 12, l: 24 }],
    [{ h: 96, s: 18, l: 52 }, { h: 32, s: 10, l: 64 }, { h: 150, s: 14, l: 40 }, { h: 0, s: 4, l: 86 }, { h: 80, s: 16, l: 30 }],
  ],
  愚人节: [
    [{ h: 48, s: 62, l: 62 }, { h: 338, s: 42, l: 66 }, { h: 172, s: 36, l: 58 }, { h: 18, s: 48, l: 54 }, { h: 40, s: 10, l: 90 }],
    [{ h: 52, s: 54, l: 58 }, { h: 24, s: 56, l: 56 }, { h: 320, s: 32, l: 72 }, { h: 186, s: 28, l: 68 }, { h: 42, s: 14, l: 88 }],
  ],
  劳动节: [
    [{ h: 28, s: 68, l: 50 }, { h: 42, s: 52, l: 56 }, { h: 36, s: 8, l: 62 }, { h: 210, s: 8, l: 42 }, { h: 32, s: 16, l: 84 }],
    [{ h: 22, s: 62, l: 46 }, { h: 40, s: 44, l: 62 }, { h: 0, s: 6, l: 54 }, { h: 28, s: 36, l: 32 }, { h: 38, s: 12, l: 80 }],
  ],
  青年节: [
    [{ h: 4, s: 70, l: 42 }, { h: 42, s: 58, l: 54 }, { h: 36, s: 16, l: 86 }, { h: 8, s: 48, l: 28 }, { h: 40, s: 32, l: 70 }],
    [{ h: 0, s: 64, l: 46 }, { h: 38, s: 48, l: 62 }, { h: 32, s: 12, l: 90 }, { h: 12, s: 40, l: 32 }, { h: 44, s: 40, l: 50 }],
  ],
  母亲节: [
    [{ h: 340, s: 36, l: 64 }, { h: 8, s: 42, l: 52 }, { h: 36, s: 32, l: 72 }, { h: 24, s: 22, l: 38 }, { h: 348, s: 18, l: 88 }],
    [{ h: 348, s: 40, l: 58 }, { h: 28, s: 28, l: 68 }, { h: 352, s: 24, l: 78 }, { h: 16, s: 30, l: 42 }, { h: 38, s: 16, l: 86 }],
  ],
  护士节: [
    [{ h: 198, s: 18, l: 86 }, { h: 174, s: 22, l: 68 }, { h: 210, s: 16, l: 52 }, { h: 340, s: 14, l: 80 }, { h: 200, s: 8, l: 92 }],
    [{ h: 186, s: 16, l: 82 }, { h: 208, s: 20, l: 60 }, { h: 168, s: 14, l: 74 }, { h: 330, s: 12, l: 86 }, { h: 220, s: 10, l: 36 }],
  ],
  儿童节: [
    [{ h: 48, s: 62, l: 62 }, { h: 18, s: 58, l: 56 }, { h: 338, s: 42, l: 68 }, { h: 118, s: 36, l: 54 }, { h: 208, s: 38, l: 60 }],
    [{ h: 42, s: 56, l: 66 }, { h: 330, s: 46, l: 62 }, { h: 168, s: 32, l: 58 }, { h: 24, s: 50, l: 52 }, { h: 200, s: 28, l: 72 }],
  ],
  父亲节: [
    [{ h: 28, s: 28, l: 36 }, { h: 214, s: 18, l: 42 }, { h: 32, s: 16, l: 22 }, { h: 36, s: 10, l: 70 }, { h: 220, s: 10, l: 28 }],
    [{ h: 24, s: 32, l: 40 }, { h: 208, s: 16, l: 36 }, { h: 20, s: 20, l: 26 }, { h: 38, s: 12, l: 78 }, { h: 30, s: 14, l: 52 }],
  ],
  七夕: [
    [{ h: 336, s: 42, l: 56 }, { h: 42, s: 48, l: 58 }, { h: 268, s: 24, l: 22 }, { h: 348, s: 28, l: 74 }, { h: 20, s: 16, l: 16 }],
    [{ h: 350, s: 48, l: 50 }, { h: 38, s: 40, l: 66 }, { h: 300, s: 22, l: 32 }, { h: 330, s: 20, l: 82 }, { h: 240, s: 18, l: 14 }],
  ],
  重阳: [
    [{ h: 38, s: 48, l: 52 }, { h: 24, s: 42, l: 40 }, { h: 32, s: 28, l: 68 }, { h: 18, s: 22, l: 28 }, { h: 42, s: 16, l: 82 }],
    [{ h: 32, s: 52, l: 46 }, { h: 42, s: 36, l: 60 }, { h: 22, s: 30, l: 34 }, { h: 36, s: 18, l: 76 }, { h: 28, s: 20, l: 22 }],
  ],
  国庆节: [
    [{ h: 0, s: 90, l: 46 }, { h: 46, s: 86, l: 52 }, { h: 4, s: 82, l: 32 }, { h: 42, s: 22, l: 92 }, { h: 44, s: 72, l: 64 }],
    [{ h: 2, s: 88, l: 42 }, { h: 48, s: 84, l: 50 }, { h: 8, s: 74, l: 52 }, { h: 40, s: 14, l: 93 }, { h: 38, s: 36, l: 16 }],
    [{ h: 358, s: 86, l: 48 }, { h: 50, s: 88, l: 56 }, { h: 6, s: 78, l: 28 }, { h: 44, s: 40, l: 80 }, { h: 0, s: 70, l: 36 }],
  ],
  抗战纪念日: [
    [{ h: 36, s: 10, l: 62 }, { h: 28, s: 16, l: 38 }, { h: 32, s: 22, l: 48 }, { h: 0, s: 6, l: 18 }, { h: 38, s: 8, l: 80 }],
    [{ h: 30, s: 14, l: 44 }, { h: 24, s: 18, l: 28 }, { h: 40, s: 12, l: 70 }, { h: 8, s: 12, l: 22 }, { h: 36, s: 8, l: 84 }],
  ],
  国家公祭日: [
    [{ h: 40, s: 6, l: 88 }, { h: 0, s: 4, l: 12 }, { h: 36, s: 6, l: 58 }, { h: 40, s: 8, l: 78 }, { h: 220, s: 4, l: 22 }],
    [{ h: 36, s: 8, l: 84 }, { h: 0, s: 2, l: 16 }, { h: 40, s: 4, l: 68 }, { h: 30, s: 6, l: 42 }, { h: 0, s: 4, l: 8 }],
  ],
  万圣节: [
    [{ h: 28, s: 72, l: 48 }, { h: 32, s: 18, l: 12 }, { h: 272, s: 28, l: 22 }, { h: 24, s: 48, l: 32 }, { h: 42, s: 36, l: 58 }],
    [{ h: 24, s: 68, l: 42 }, { h: 280, s: 24, l: 18 }, { h: 18, s: 16, l: 10 }, { h: 32, s: 54, l: 54 }, { h: 260, s: 20, l: 28 }],
  ],
  感恩节: [
    [{ h: 24, s: 52, l: 44 }, { h: 32, s: 38, l: 36 }, { h: 42, s: 42, l: 58 }, { h: 28, s: 22, l: 76 }, { h: 18, s: 28, l: 24 }],
    [{ h: 28, s: 48, l: 40 }, { h: 38, s: 36, l: 52 }, { h: 20, s: 32, l: 30 }, { h: 40, s: 18, l: 80 }, { h: 32, s: 26, l: 22 }],
  ],
};

const FESTIVE_THEMES = new Set(['国庆节', '春节', '元宵', '金榜题名', '青年节', '元旦', '圣诞节']);

export function buildThemedPalette({ theme, style, variant = 0, seed = 0, count = 5, hueShift = 0 }) {
  const recipes = THEME_RECIPES[theme];
  if (!recipes?.length) return [];
  let env = { ...(STYLE_ENVELOPES[style] || STYLE_ENVELOPES.现代) };
  if (FESTIVE_THEMES.has(theme)) {
    env = {
      ...env,
      sMul: Math.max(env.sMul ?? 1, 0.84),
      sBias: 0,
      sMin: Math.max(env.sMin ?? 8, 40),
      lMin: Math.min(env.lMin ?? 8, 28),
    };
  }
  const base = recipes[variant % recipes.length];
  const paint = (hsl, i, envelope) => {
    const j = jitter({ ...hsl, h: wrapHue(hsl.h + hueShift) }, seed + variant * 17, i);
    const e = applyEnvelope(j.h, j.s, j.l, envelope);
    return hslToHex(e.h, e.s, e.l);
  };
  let hexes = base.slice(0, count).map((hsl, i) => paint(hsl, i, env));
  if (!themeFitsColors(theme, hexes)) {
    const mild = {
      ...env,
      sMul: Math.max(env.sMul ?? 1, 0.8),
      sBias: 0,
      lShift: 0,
      sMin: Math.max(env.sMin ?? 8, 28),
      lMin: 16,
      lMax: 88,
    };
    hexes = base.slice(0, count).map((hsl, i) => paint(hsl, i, mild));
  }
  if (!themeFitsColors(theme, hexes)) {
    hexes = base.slice(0, count).map((hsl, i) => {
      const j = jitter({ ...hsl, h: wrapHue(hsl.h + hueShift) }, seed + variant * 17, i);
      return hslToHex(j.h, j.s, j.l);
    });
  }
  return hexes;
}

const FAMILY_WORDS = {
  red: ['朱', '绛', '丹', '柿', '旗红', '唇', '榴'],
  orange: ['橘', '杏', '柿霜', '晚橘', '灶火'],
  gold: ['金', '桂', '麦', '蜜', '铜'],
  yellow: ['柠', '鹅黄', '麦田', '灯花'],
  green: ['苔', '竹', '松', '艾', '芽'],
  teal: ['青瓷', '潮青', '盐青', '湖'],
  blue: ['靛', '海', '夜蓝', '远山'],
  purple: ['藤', '葡', '紫雾', '夜藤'],
  pink: ['桃', '樱', '脂', '藕'],
  brown: ['焙', '檀', '栗', '牛皮'],
  gray: ['灰鸽', '水泥', '淡墨', '雾'],
  black: ['墨', '夜', '烬', '沉'],
  white: ['乳', '纱', '宣', '霜', '浅'],
};

export function describePaletteVibe(hexes = []) {
  const stats = hexes.map(hexToHsl).filter(Boolean);
  if (!stats.length) {
    return {
      summary: '颜色不足',
      warmth: '中性',
      satLabel: '含蓄',
      litLabel: '适中',
      dominantZh: [],
      nameWords: ['未名'],
      families: [],
    };
  }
  const families = stats.map(classifyFamily);
  const counts = new Map();
  families.forEach((f) => counts.set(f, (counts.get(f) || 0) + 1));
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f);
  const chroma = ranked.filter((f) => !['gray', 'white', 'black'].includes(f));
  const dominant = (chroma.length ? chroma : ranked).slice(0, 3);
  const avgS = stats.reduce((a, c) => a + c.s, 0) / stats.length;
  const avgL = stats.reduce((a, c) => a + c.l, 0) / stats.length;
  const warmN = stats.filter((c) => c.h < 70 || c.h > 320).length;
  const coolN = stats.length - warmN;
  const warmth = warmN > coolN + 1 ? '暖' : coolN > warmN + 1 ? '冷' : '中性';
  const satLabel = avgS > 55 ? '鲜艳' : avgS < 26 ? '灰扑' : '含蓄';
  const litLabel = avgL > 74 ? '浅淡' : avgL < 32 ? '深沉' : '适中';
  const dominantZh = dominant.map((f) => FAMILY_ZH[f] || f);
  const nameWords = dominant.flatMap((f) => FAMILY_WORDS[f] || []).slice(0, 10);
  const summary = `主色偏${dominantZh.join('与') || '灰'}，${satLabel}、${litLabel}，整体偏${warmth}。看见的是这些颜色本身，不是标签。`;
  return {
    summary,
    warmth,
    satLabel,
    litLabel,
    dominantZh,
    nameWords,
    families,
    avgS,
    avgL,
    satKey: avgS > 55 ? 'vivid' : avgS < 26 ? 'muted' : 'mid',
    litKey: avgL > 74 ? 'high' : avgL < 32 ? 'low' : 'mid',
  };
}

function fingerprint(hexes) {
  const joined = [...hexes].map((h) => String(h).toUpperCase()).sort().join('');
  let hash = 5381;
  for (let i = 0; i < joined.length; i += 1) hash = (hash * 33) ^ joined.charCodeAt(i);
  return hash >>> 0;
}

const NAMING_FORMULA_POOLS = {
  mood: ['钝感力', '自洽', '松弛感', '边界感', '温柔叛逆', '焦虑灰'],
  east: ['敦煌沙', '朱砂痣', '胭脂扣', '盛唐', '洛神', '只此青绿'],
  nature: ['午夜海面', '雨后青苔', '晨雾', '苔原', '月光沉海', '深海黎明'],
  film: ['花样年华', '爱乐之城', '小王子', '布达佩斯'],
  food: ['海盐焦糖', '抹茶拿铁', '焦糖玛奇朵', '肉桂卷', '黑巧', '打翻的牛奶'],
  urban: ['加班夜', '早高峰', '独居', '周一焦虑', '周五傍晚'],
  eastPoem: ['竹月', '青花瓷', '江南烟雨', '朱砂痣'],
  cyber: ['银翼杀手', '霓虹雨夜', '全息', '极光'],
  action: ['揉碎晚霞', '熄灭灯火', '打翻的牛奶'],
};

function namingThemeFromVibe(vibe) {
  const fam = vibe.families || [];
  const has = (n) => fam.includes(n);
  if (vibe.satKey === 'vivid' && vibe.avgS > 72 && (has('pink') || has('purple') || has('teal') || has('blue'))) {
    return 'cyber';
  }
  if (vibe.satKey === 'vivid' && (has('red') || has('gold'))) return 'east';
  if (has('brown') && (has('gold') || has('white') || has('yellow') || has('orange'))) return 'food';
  if (has('green') && vibe.satKey !== 'vivid') return 'nature';
  if (has('green') || has('teal')) return 'nature';
  if (has('pink') || has('purple')) return 'film';
  if (vibe.satKey === 'muted' && (has('gray') || has('white') || has('brown'))) return 'mood';
  if (has('blue') || has('gray')) return 'urban';
  if (vibe.warmth === '暖' && vibe.litKey === 'low') return 'eastPoem';
  if (vibe.warmth === '暖' && vibe.satKey === 'vivid') return 'action';
  return 'mood';
}

/**
 * 本地兜底：按颜色特征匹配主题公式，不用直白色名。
 */
export function titleFromPaletteVibe(hexes, { exclude = [] } = {}) {
  const vibe = describePaletteVibe(hexes);
  const banned = new Set((exclude || []).map((s) => String(s).trim()).filter(Boolean));
  const key = namingThemeFromVibe(vibe);
  const pool = (NAMING_FORMULA_POOLS[key] || NAMING_FORMULA_POOLS.mood)
    .filter((t) => t.length >= 2 && t.length <= 12 && !banned.has(t));
  const use = pool.length ? pool : NAMING_FORMULA_POOLS.mood;
  return use[fingerprint(hexes) % use.length];
}
