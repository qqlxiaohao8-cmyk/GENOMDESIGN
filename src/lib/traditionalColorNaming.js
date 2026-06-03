import { hexToOklch, oklabDistSqFromHex } from './oklch.js';

function normalizeHex(hex) {
  const s = String(hex || '')
    .trim()
    .replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '#000000';
  return `#${s.toUpperCase()}`;
}

/**
 * Canonical 中国传统色 samples — each entry is [hex, name, hueGroup].
 * hueGroup clusters visually similar hues so 2-5 neighbouring hex codes share a single name.
 * Nearest OKLab distance is used to find the best match for any arbitrary hex.
 */
const CANONICAL_TRADITIONAL = [
  ['#FFB3A7', '粉红'],
  ['#FF4C00', '朱红'],
  ['#9D2933', '胭脂'],
  ['#C93756', '海棠红'],
  ['#F05654', '石榴红'],
  ['#FF2121', '大红'],
  ['#8B3A3A', '枣红'],
  ['#A91B0D', '银朱'],
  ['#FF7300', '橙色'],
  ['#FFC773', '杏黄'],
  ['#FFC64B', '鹅黄'],
  ['#FAFF72', '樱草黄'],
  ['#E8D098', '缃色'],
  ['#CAFF70', '黄绿'],
  ['#9ACD32', '柳黄'],
  ['#7FFF00', '葱绿'],
  ['#00FA9A', '碧色'],
  ['#00BFFF', '天青'],
  ['#44CEF6', '蔚蓝'],
  ['#177CB0', '靛青'],
  ['#003472', '花青'],
  ['#426AB3', '宝蓝'],
  ['#4B5CC4', '品蓝'],
  ['#815E5B', '绀赭'],
  ['#E4C6D0', '雪青'],
  ['#815476', '丁香色'],
  ['#4C221B', '玄色'],
  ['#D2B48C', '驼色'],
  ['#8B4513', '褐色'],
  ['#D2691E', '赭色'],
  ['#F4A460', '秋香色'],
  ['#E29C45', '琥珀'],
  ['#CA7A2C', '琥珀黄'],
  ['#A67C52', '茶色'],
  ['#A78E44', '秋香'],
  ['#758A72', '竹青'],
  ['#5E7153', '铜绿'],
  ['#BCE672', '嫩绿'],
  ['#0EB0C9', '湖蓝'],
  ['#40DE5A', '草绿'],
  ['#2E4E7E', '藏青'],
  ['#A78D8B', '鼠背灰'],
  ['#C0C4C3', '月白'],
  ['#E9E7EF', '雪色'],
  ['#F2FDFF', '鱼肚白'],
  ['#EEDEB0', '牙色'],
  ['#F2EADA', '精白'],
  ['#3B2E7E', '茄色'],
  ['#4C8DA2', '青碧'],
  ['#D9ECF1', '天水碧'],
  ['#B0A4E3', '藕荷'],
  ['#725D68', '紫棠'],
  ['#3D3B4F', '玄青'],
  ['#D9B611', '栀子黄'],
  ['#F08845', '珊蝴'],
  ['#FF8936', '韲粉'],
  ['#D85916', '朱砂'],
  ['#A98175', '檀'],
  ['#EDD1D8', '水红'],
  ['#DAC4A6', '芦灰'],
  ['#3E4531', '苍绿'],
  ['#2775B6', '孔雀蓝'],
  ['#145A94', '品月'],
  ['#B7AE8F', '秋香黄'],
  ['#949C51', '螺绿'],
  ['#61AC85', '青矾绿'],
  ['#12A182', '绿松石'],
  ['#507E96', '靛蓝灰'],
  ['#D276A4', '品红'],
  ['#8976AB', '蒲葡'],
  ['#5D5138', '油绿'],
  ['#827998', '芦穗灰'],
  ['#C6DFD5', '艾绿'],
  ['#BCECE7', '湖绿'],
  ['#5698C4', '琉璃蓝'],
  ['#134857', '深竹月'],
  ['#2D004E', '青莲'],
  ['#8E453F', '嫣红'],
  ['#5D1010', '黯'],
  ['#312520', '煤黑'],
  ['#74787C', '铅'],
  ['#DCDBDB', '霜色'],
  ['#A29B7C', '秋香褐'],
  ['#7397AB', '甾灰'],
  ['#C89B40', '金黄'],
  ['#F86B1C', '雄黄'],
  ['#C3272B', '猩红'],
  ['#0C8918', '翠绿'],
  ['#003A6C', '海涛蓝'],
  ['#FFC12C', '柠檬黄'],
  ['#FFC773', '芒果黄'],
  ['#F0C239', '缃'],
  ['#423C3B', '玄铁'],
  ['#41555D', '铁灰'],
  ['#877F74', '相思灰'],
  ['#665A59', '鸦青'],
  ['#5F5D38', '橄榄绿'],
  ['#B0D5B0', '豆绿'],
  ['#96C24E', '草黄绿'],
  ['#66A9C9', '睛蓝'],
  ['#8FB2C9', '涧石蓝'],
];

/**
 * Build hue-grouped buckets. Each canonical sample belongs to a hue bucket (30° wide).
 * Names within a bucket can be shared by 2-5 hex codes.
 */
const HUE_BUCKET_SIZE = 30;

function hueBucket(h) {
  return Math.floor(((h % 360) + 360) % 360 / HUE_BUCKET_SIZE);
}

const _canonCache = CANONICAL_TRADITIONAL.map(([hex, name]) => {
  const o = hexToOklch(hex);
  return { hex, name, l: o.l, c: o.c, h: o.h, bucket: hueBucket(o.h) };
});

/**
 * Deterministic hex→name cache. A hex always gets the same name site-wide.
 * Hue-similar hexes (within 30° bucket) may share a name if their perceptual
 * distance to the same canonical anchor is the smallest.
 */
const _hexNameGlobal = new Map();

function perceptualDistSq(hexA, hexB) {
  return oklabDistSqFromHex(hexA, hexB);
}

/**
 * Deterministic nearest Chinese traditional name for any hex.
 * Same hex always returns the same name (cached globally).
 */
export function nearestChineseTraditionalName(hex) {
  const norm = normalizeHex(hex);
  if (_hexNameGlobal.has(norm)) return _hexNameGlobal.get(norm);

  let bestName = '中国色';
  let bestD = Infinity;
  for (const c of _canonCache) {
    const d = perceptualDistSq(norm, c.hex);
    if (d < bestD) {
      bestD = d;
      bestName = c.name;
    }
  }
  _hexNameGlobal.set(norm, bestName);
  return bestName;
}

function rankedTraditionalNames(hex) {
  const norm = normalizeHex(hex);
  return _canonCache
    .map((c) => ({ name: c.name, d: perceptualDistSq(norm, c.hex) }))
    .sort((a, b) => a.d - b.d);
}

function pickPreferredChinese(item) {
  for (const key of ['name', 'label']) {
    const raw = item?.[key];
    if (raw == null) continue;
    const s = String(raw).trim().replace(/\s+/g, '');
    if (/[\u4e00-\u9fff]/.test(s)) return s;
  }
  return null;
}

/**
 * 每条实色一意中文名：同一 hex 只对应一名；不同 hex 不得共用一名（顺延次近传统样本名）。
 * @param {Array<{ hex: string, name?: string, label?: string }>} items
 * @returns {string[]}
 */
export function uniqueTraditionalNamesForSwatches(items) {
  const usedNames = new Set();
  const hexToName = new Map();
  const out = [];

  for (const item of items) {
    const hex = normalizeHex(item.hex);
    if (hexToName.has(hex)) {
      out.push(hexToName.get(hex));
      continue;
    }

    const preferred = pickPreferredChinese(item);
    const ranked = rankedTraditionalNames(hex);
    let chosen = null;

    if (preferred && !usedNames.has(preferred)) {
      chosen = preferred;
    } else {
      for (const { name } of ranked) {
        if (!usedNames.has(name)) {
          chosen = name;
          break;
        }
      }
    }

    if (!chosen) {
      const base = ranked[0]?.name || '色';
      let k = 2;
      chosen = `${base}·${k}`;
      while (usedNames.has(chosen)) {
        k += 1;
        chosen = `${base}·${k}`;
      }
    }

    usedNames.add(chosen);
    hexToName.set(hex, chosen);
    out.push(chosen);
  }

  return out;
}
