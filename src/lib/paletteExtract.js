/**
 * 高质量取色引擎
 *
 * 目标：
 *  1) 默认提取的 5 色应覆盖画面里「不同的颜色」，而不是同一色系的反复。
 *  2) 默认 5 色互相搭配和谐（OKLCH 空间里按色相分桶 + 亮度排序）。
 *  3) 用户在页面可切换的「算法样式」要产生 明显不同 的搭配（主色优先 / 多彩 / 明暗 / 点缀 / 和声）。
 *
 * 实现方式：
 *  - 将图像下采样到 ~160 边，逐像素读取 RGBA。
 *  - 忽略近白 / 近黑 / 低饱和像素（可选保留，用于 lowVariance 判定）。
 *  - 将像素转到 OKLCH（L: 0~1, C: ~0~0.35, h: 0~360°），按 12 个 hue bin × 4 个 L bin 进行频次聚合。
 *  - 根据策略从不同 bin 取代表色：
 *      • harmonic (默认): hue 桶从多到少选，每个桶内用像素量加权平均 → 保证色相分散。
 *      • dominant:        原先频次最多的桶（更贴近画面主色），并按 OKLab 距离去重。
 *      • tonal:           锁定主 hue，同一色相内从暗到亮分 5 档，呈现单色调冷 / 暖渐变。
 *      • accent:          1 个最饱和点缀 + 4 个画面中性色（低 C）。
 *      • harmony:         取主色，按 OKLCH 类比/三等分/分裂互补自动生成其余 4 色。
 */

import { hexToOklch, lchToHexClamped, oklabDistSqFromHex } from './oklch.js';

/* ────────────────────────────────────────────────────────────────────────── */
/*                              基础：采样与分桶                              */
/* ────────────────────────────────────────────────────────────────────────── */

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('无法读取图片'));
    img.src = dataUrl;
  });
}

/** 下采样 + 读取 RGBA buffer。 */
function readSamples(img, maxSide = 160) {
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  const scale = maxSide / Math.max(nw, nh, 1);
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return { data, w, h };
}

/**
 * @param {Uint8ClampedArray} data RGBA 像素流
 * @returns {Array<{ L: number, C: number, h: number, r: number, g: number, b: number, w: number }>}
 */
function toOklchSamples(data) {
  const out = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const hex = rgbToHex(r, g, b);
    const { l, c, h } = hexToOklch(hex);
    out.push({ L: l, C: c, h, r, g, b, w: 1 });
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                               分桶聚合                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const HUE_BINS = 12; // 30° 每桶
const L_BINS = 4;    // 0-0.25-0.5-0.75-1
const C_CUT = 0.035; // 低于此即视为中性（无明显色相）

/** 将 OKLCH 像素按 hue/L 聚合成桶。中性像素单独维护。 */
function aggregateBuckets(samples) {
  /** @type {Map<string, { count: number, sumL: number, sumC: number, sumCos: number, sumSin: number }>} */
  const buckets = new Map();
  const neutrals = {
    count: 0,
    sumL: 0,
    sumC: 0,
  };
  for (const s of samples) {
    if (s.C < C_CUT) {
      neutrals.count += 1;
      neutrals.sumL += s.L;
      neutrals.sumC += s.C;
      continue;
    }
    const hBin = Math.min(HUE_BINS - 1, Math.floor((s.h / 360) * HUE_BINS));
    const lBin = Math.min(L_BINS - 1, Math.floor(s.L * L_BINS));
    const key = `${hBin}:${lBin}`;
    const rec = buckets.get(key) || {
      count: 0,
      sumL: 0,
      sumC: 0,
      sumCos: 0,
      sumSin: 0,
      hBin,
      lBin,
    };
    rec.count += 1;
    rec.sumL += s.L;
    rec.sumC += s.C;
    const hr = (s.h * Math.PI) / 180;
    rec.sumCos += Math.cos(hr);
    rec.sumSin += Math.sin(hr);
    buckets.set(key, rec);
  }
  return { buckets, neutrals, total: samples.length };
}

function bucketToHex(rec) {
  const L = rec.sumL / rec.count;
  const C = rec.sumC / rec.count;
  let h = (Math.atan2(rec.sumSin, rec.sumCos) * 180) / Math.PI;
  if (h < 0) h += 360;
  return lchToHexClamped(L, C, h);
}

function neutralsToHex(n) {
  if (!n.count) return null;
  const L = Math.max(0.05, Math.min(0.95, n.sumL / n.count));
  return lchToHexClamped(L, 0, 0);
}

/** 按 hBin 聚合——每个色相桶保留其下的最突出 lBin 代表。 */
function topByHueBin(buckets) {
  const byHue = new Map(); // hBin -> { rec, count }
  for (const rec of buckets.values()) {
    const prev = byHue.get(rec.hBin);
    if (!prev || rec.count > prev.count) byHue.set(rec.hBin, { rec, count: rec.count });
  }
  return [...byHue.values()].sort((a, b) => b.count - a.count).map((x) => x.rec);
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                              策略实现                                    */
/* ────────────────────────────────────────────────────────────────────────── */

/**
 * 把一个 hex 调整到「可展示的柔和区间」：
 *  - L 夹在 [0.24, 0.86]：避免纯黑纯白带来的不和谐；
 *  - C 夹在 [0.035, 0.19]：避免一块色过于刺眼；
 *  - 保留原 hue（若原本近中性则保留灰度）。
 */
function softenHex(hex) {
  const { l, c, h } = hexToOklch(hex);
  const L = Math.max(0.24, Math.min(0.86, l));
  const C = c < C_CUT * 0.5 ? c : Math.max(0.035, Math.min(0.19, c));
  return lchToHexClamped(L, C, h);
}

/**
 * 让 5 色整体有清晰的明暗层次：若整组过于扁平（最大 L - 最小 L < 0.25），
 * 则把两端以等差拉开，得到可读性更好的色阶。
 */
function balanceLightness(hexes) {
  const entries = hexes.map((hex) => ({ hex, ...hexToOklch(hex) }));
  const sorted = [...entries].sort((a, b) => a.l - b.l);
  const spread = sorted[sorted.length - 1].l - sorted[0].l;
  if (spread >= 0.28) return sorted.map((e) => e.hex);
  // 平均 L 的位置为锚，按 [-0.22, -0.11, 0, +0.11, +0.22] 展开
  const midL = sorted.reduce((s, e) => s + e.l, 0) / sorted.length;
  const offsets = [-0.24, -0.12, 0, 0.12, 0.24];
  return sorted.map((e, i) => {
    const L = Math.max(0.2, Math.min(0.9, midL + offsets[i]));
    return lchToHexClamped(L, Math.max(0.035, Math.min(0.2, e.c)), e.h);
  });
}

/**
 * 默认 · 和谐多彩：按「不同色相」优先取，若画面里色相少则回落到不同明度 bin，
 * 最后对整组做一次色彩软化 + 明暗平衡，避免出现刺眼或扁平的组合。
 */
function strategyHarmonic(aggregate) {
  const { buckets, neutrals, total } = aggregate;
  const huePicks = topByHueBin(buckets);
  const out = [];
  const MIN_DIST = 0.0010;

  for (const rec of huePicks) {
    if (out.length >= 5) break;
    const hex = softenHex(bucketToHex(rec));
    if (out.every((h) => oklabDistSqFromHex(h, hex) >= MIN_DIST)) out.push(hex);
  }

  // 若色相覆盖不足 5，从剩余 bin 里按频次补齐，并考虑不同明度 bin 以拉出层次。
  if (out.length < 5) {
    const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
    for (const rec of sorted) {
      if (out.length >= 5) break;
      const hex = softenHex(bucketToHex(rec));
      if (out.every((h) => oklabDistSqFromHex(h, hex) >= MIN_DIST * 0.4)) out.push(hex);
    }
  }

  if (out.length < 5 && neutrals.count > total * 0.04) {
    const nHex = neutralsToHex(neutrals);
    if (nHex && out.every((h) => oklabDistSqFromHex(h, nHex) >= MIN_DIST * 0.2)) out.push(nHex);
  }

  const backup = [...buckets.values()].sort((a, b) => b.count - a.count);
  let bi = 0;
  while (out.length < 5 && bi < backup.length) {
    const hex = softenHex(bucketToHex(backup[bi++]));
    if (!out.includes(hex)) out.push(hex);
  }
  while (out.length < 5) out.push(out[out.length - 1] || '#888888');

  return balanceLightness(out.slice(0, 5));
}

/**
 * 主色优先：频次最大的 bucket 依次入选；对结果做软化 + 平衡以避免过暗/过亮块。
 */
function strategyDominant(aggregate) {
  const { buckets, neutrals, total } = aggregate;
  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  const MIN_DIST = 0.0008;
  const out = [];
  for (const rec of sorted) {
    if (out.length >= 5) break;
    const hex = softenHex(bucketToHex(rec));
    if (out.every((h) => oklabDistSqFromHex(h, hex) >= MIN_DIST)) out.push(hex);
  }
  if (out.length < 5 && neutrals.count > total * 0.06) {
    const nHex = neutralsToHex(neutrals);
    if (nHex) out.push(softenHex(nHex));
  }
  let bi = 0;
  while (out.length < 5 && bi < sorted.length) {
    const hex = softenHex(bucketToHex(sorted[bi++]));
    if (!out.includes(hex)) out.push(hex);
  }
  while (out.length < 5) out.push(out[out.length - 1] || '#888888');
  return balanceLightness(out.slice(0, 5));
}

/**
 * 明暗渐变：取主色 hue，沿 L 轴分 5 档生成 monochromatic ramp，C 跟着画面里对应 L 段的平均值。
 */
function strategyTonal(aggregate) {
  const { buckets } = aggregate;
  const huePicks = topByHueBin(buckets);
  const primary = huePicks[0];
  if (!primary) return fallbackGray();
  const hBinWanted = primary.hBin;
  // 柔和的明度阶梯，避免最暗过黑 / 最亮过白
  const Ls = [0.30, 0.44, 0.58, 0.72, 0.84];
  const sameHue = [...buckets.values()].filter((r) => r.hBin === hBinWanted);
  let h;
  if (sameHue.length) {
    const sc = sameHue.reduce(
      (acc, r) => {
        acc.cos += r.sumCos;
        acc.sin += r.sumSin;
        return acc;
      },
      { cos: 0, sin: 0 }
    );
    h = (Math.atan2(sc.sin, sc.cos) * 180) / Math.PI;
    if (h < 0) h += 360;
  } else {
    const { h: hh } = hexToOklch(bucketToHex(primary));
    h = hh;
  }
  const baseC = primary ? primary.sumC / primary.count : 0.08;
  // 两端饱和稍降（偏粉彩），中段保留主饱和，整体更像设计系统色阶
  const cCurve = [0.55, 0.85, 1.0, 0.85, 0.55];
  const out = Ls.map((L, i) => {
    const C = Math.max(0.03, Math.min(0.18, baseC * cCurve[i]));
    // 整个色阶 hue 带极小的漂移，使末端稍冷、暗端稍暖
    const hueShift = (i - 2) * 2;
    return lchToHexClamped(L, C, (h + hueShift + 360) % 360);
  });
  return out;
}

/**
 * 点缀 · 1 强色 + 4 中性：取最饱和的主色作为 accent，其余 4 个用画面里的中性（低 C）按 L 分段。
 */
function strategyAccent(aggregate) {
  const { buckets, neutrals } = aggregate;
  // 选饱和最高且明度处于中间 50% 的桶做 accent，避免选到一块过暗过亮的失衡色
  const candidates = [...buckets.values()]
    .map((r) => ({ rec: r, L: r.sumL / r.count, C: r.sumC / r.count }))
    .filter((x) => x.L >= 0.32 && x.L <= 0.75)
    .sort((a, b) => b.C - a.C);
  const rich = candidates[0]?.rec || [...buckets.values()].sort((a, b) => b.sumC / b.count - a.sumC / a.count)[0];
  const accentHexRaw = rich ? bucketToHex(rich) : '#9A2B2B';
  // 提亮/降饱和到更悦目的区间
  const { h: accentH, c: accentC, l: accentL } = hexToOklch(accentHexRaw);
  const accentHex = lchToHexClamped(
    Math.max(0.4, Math.min(0.66, accentL)),
    Math.max(0.08, Math.min(0.20, accentC * 1.1)),
    accentH
  );

  // 中性阶梯：用 accent 互补色相的「暖灰 / 冷灰」4 阶，构造纸感中性
  const neutralLayers = [0.28, 0.46, 0.64, 0.86];
  // 给中性一点点 accent 的互补 hue（+180°）做为温度，视觉更柔
  const neutralH = (accentH + 180) % 360;
  let neutrals4;
  if (neutrals.count > 32) {
    // 用画面中性的 L 均值作为居中的偏移参考
    neutrals4 = neutralLayers.map((L) => lchToHexClamped(L, 0.012, neutralH));
  } else {
    neutrals4 = neutralLayers.map((L) => lchToHexClamped(L, 0.014, neutralH));
  }
  return sortByLightness([accentHex, ...neutrals4]);
}

/**
 * 和声：取主色，按 split-complementary + analogous 派生 4 色（OKLCH 色相旋转 + L/C 微调），
 * 得到更「设计感」的平衡组合。
 */
/**
 * 设计和声：基于画面主色随机选一种「色轮方案」：
 *  - analogous：±22°, ±44° 的类比色
 *  - splitComp：主色 + 互补 ±25°
 *  - triad：主色 + ±120°
 *  - tetrad：主色 + 90° + 180° + 270°
 * 然后把 5 色的 L/C 分配成「3 深 2 浅」或「2 深 3 浅」的组合，避免亮度扁平，
 * 并把整体 C 夹在 [0.06, 0.17] 以获得稳定的设计感。
 */
function strategyHarmony(aggregate) {
  const { buckets } = aggregate;
  const huePicks = topByHueBin(buckets);
  const primary = huePicks[0];
  if (!primary) return fallbackGray();
  const base = bucketToHex(primary);
  const { c, h } = hexToOklch(base);
  const baseC = Math.max(0.07, Math.min(0.16, c));

  // 方案候选；每次渲染选一个
  const schemes = {
    analogous: [-44, -22, 0, 22, 44],
    splitComp: [-25, 0, 155, 180, 205],
    triad: [-120, 0, 0, 120, 120],
    tetrad: [-180, -90, 0, 90, 135],
    complementary: [-12, 0, 12, 168, 192],
  };
  const schemeKeys = Object.keys(schemes);
  const chosenKey = schemeKeys[Math.floor(Math.random() * schemeKeys.length)];
  const offsets = schemes[chosenKey];

  // L 分配：制造明显的层次；5 色里有「深 / 中深 / 中 / 中浅 / 浅」
  const LsPool = [
    [0.32, 0.44, 0.58, 0.72, 0.84],
    [0.30, 0.48, 0.60, 0.70, 0.82],
    [0.34, 0.46, 0.56, 0.68, 0.80],
  ];
  const Ls = LsPool[Math.floor(Math.random() * LsPool.length)];
  // 给 C 做拱形曲线：中间色饱和最高，两端最低
  const cCurve = [0.55, 0.85, 1.0, 0.85, 0.55];

  const out = offsets.map((off, i) => {
    const newH = ((h + off) % 360 + 360) % 360;
    const newL = Ls[i];
    const newC = Math.max(0.045, Math.min(0.17, baseC * cCurve[i]));
    return lchToHexClamped(newL, newC, newH);
  });
  return sortByLightness(out);
}

/* ────────────────────────────────────────────────────────────────────────── */
/*                              工具 & 入口                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function sortByLightness(hexes) {
  return [...hexes].sort((a, b) => hexToOklch(a).l - hexToOklch(b).l);
}

function fallbackGray() {
  return ['#2C2C2C', '#555555', '#808080', '#B5B5B5', '#E5E5E5'];
}

/** ── 策略注册表 ── */
export const PALETTE_STRATEGIES = [
  { id: 'harmonic', label: '多彩和谐', hint: '覆盖画面里不同的色相', fn: strategyHarmonic },
  { id: 'dominant', label: '主色优先', hint: '最接近画面整体色调', fn: strategyDominant },
  { id: 'tonal', label: '明暗渐层', hint: '主色相沿明暗分五档', fn: strategyTonal },
  { id: 'accent', label: '点缀 · 中性', hint: '一色点睛 + 四色中性', fn: strategyAccent },
  { id: 'harmony', label: '设计和声', hint: '基于主色的色相和声组合', fn: strategyHarmony },
];

/**
 * 一次性做所有策略（共用像素采样），避免重复解码。
 * @param {string} dataUrl
 * @returns {Promise<{ default: string[], variants: Array<{ id: string, label: string, hint: string, hexes: string[] }>, lowVariance: boolean }>}
 */
export async function extractAllStrategiesFromDataUrl(dataUrl) {
  const img = await loadImage(dataUrl);
  const { data } = readSamples(img, 160);
  const samples = toOklchSamples(data);
  const aggregate = aggregateBuckets(samples);

  const variants = PALETTE_STRATEGIES.map((s) => {
    try {
      const hexes = s.fn(aggregate);
      return { id: s.id, label: s.label, hint: s.hint, hexes: hexes.slice(0, 5) };
    } catch {
      return { id: s.id, label: s.label, hint: s.hint, hexes: fallbackGray() };
    }
  });

  const def = variants.find((v) => v.id === 'harmonic')?.hexes || fallbackGray();

  // 低变化场景：画面几乎全是一种色（所有 bucket 总数极少 + neutrals 占比极高）
  const { buckets, neutrals, total } = aggregate;
  const lowVariance = buckets.size <= 2 && neutrals.count / Math.max(1, total) > 0.85;

  return { default: def, variants, lowVariance };
}

/** 便捷函数：默认 5 色（和谐） */
export async function extractHarmoniousFiveFromDataUrl(dataUrl) {
  const { default: def } = await extractAllStrategiesFromDataUrl(dataUrl);
  return def;
}
