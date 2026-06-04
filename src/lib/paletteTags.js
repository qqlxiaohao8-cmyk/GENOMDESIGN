/**
 * 色卡自动标签系统
 * 从 hexes + 引擎 meta 派生中文标签，用于色海搜索与预览展示。
 *
 * 标签分三类：
 *   1. 色系  — 主色域 (红色系 / 蓝色系 …)
 *   2. 色感  — 深浅/冷暖/饱和度特征 (暖色 / 冷色 / 浅色 …)
 *   3. 风格  — 引擎风格类目 + 具体风格名 (自然 / 苔藓 …)
 */

import { hexToOklch } from './oklch.js';

// ── 色域中文映射 ───────────────────────────────────────────────────────────────
const DOMAIN_ZH = {
  red:      '红色系',
  orange:   '橙色系',
  yellow:   '黄色系',
  green:    '绿色系',
  cyan:     '青色系',
  blue:     '蓝色系',
  indigo:   '靛色系',
  purple:   '紫色系',
  pink:     '粉色系',
  brown:    '褐色系',
  gray:     '灰色系',
  black:    '黑色',
  white:    '白色',
  metallic: '金属色',
};

// ── 风格大类中文映射 ───────────────────────────────────────────────────────────
const CATEGORY_ZH = {
  nature:   '自然',
  art:      '艺术',
  emotion:  '情绪',
  culture:  '文化',
  material: '素材',
  design:   '设计',
};

// ── 和声类型中文映射 ───────────────────────────────────────────────────────────
const HARMONY_ZH = {
  monochromatic:    '单色阶',
  analogous:        '近似色',
  complementary:    '互补色',
  splitComplementary: '分裂互补',
  triadic:          '三角配色',
  tetradic:         '四角配色',
};

function normHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  return `#${s.toUpperCase()}`;
}

function collectOklch(hexes) {
  const out = [];
  for (const h of hexes) {
    const n = normHex(h);
    if (n) out.push(hexToOklch(n));
  }
  return out;
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/**
 * 从 hex 列表 + 引擎 meta 生成色卡标签（字符串数组，不超过 8 个）。
 *
 * @param {string[]} hexes
 * @param {{
 *   primaryDomain?: string,
 *   category?: string,
 *   styleLabel?: string,
 *   harmonyId?: string,
 *   saturationTier?: string,
 *   lightnessMode?: string,
 * }} [meta]
 * @returns {string[]}
 */
export function generatePaletteTags(hexes, meta = {}) {
  const tags = [];

  // ── 1. 色感分析 ─────────────────────────────────────────────────────────────
  const oklchList = collectOklch(hexes || []);
  if (oklchList.length >= 2) {
    const avgL = avg(oklchList.map((x) => x.l));
    const avgC = avg(oklchList.map((x) => x.c));
    const chromatic = oklchList.filter((x) => x.c > 0.04);
    const hueList = chromatic.map((x) => x.h);

    // 明度
    if (avgL > 0.73) tags.push('浅色');
    else if (avgL < 0.30) tags.push('深色');

    // 饱和度
    if (avgC < 0.035) tags.push('极简灰');
    else if (avgC < 0.058) tags.push('低饱和');
    else if (avgC > 0.135) tags.push('高饱和');

    // 冷暖 (有足够色相样本时才判断)
    if (hueList.length >= 2) {
      const warmN = hueList.filter((h) => h <= 80 || h >= 285).length;
      const coolN = hueList.filter((h) => h >= 150 && h <= 255).length;
      const n = hueList.length;
      if (warmN / n >= 0.55) tags.push('暖色');
      else if (coolN / n >= 0.55) tags.push('冷色');
    }
  }

  // ── 2. 主色域 ────────────────────────────────────────────────────────────────
  if (meta.primaryDomain) {
    const zh = DOMAIN_ZH[meta.primaryDomain];
    if (zh) tags.push(zh);
  }

  // ── 3. 风格大类 ──────────────────────────────────────────────────────────────
  if (meta.category) {
    const zh = CATEGORY_ZH[meta.category];
    if (zh) tags.push(zh);
  }

  // ── 4. 具体风格名 ─────────────────────────────────────────────────────────────
  const styleLabel = meta.styleLabel ? String(meta.styleLabel).trim() : '';
  if (styleLabel && styleLabel.length >= 2) {
    tags.push(styleLabel);
  }

  // ── 5. 和声类型 ──────────────────────────────────────────────────────────────
  if (meta.harmonyId) {
    const zh = HARMONY_ZH[meta.harmonyId];
    if (zh) tags.push(zh);
  }

  // 去重 + 限制总数
  const seen = new Set();
  const unique = [];
  for (const t of tags) {
    const k = String(t).trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    unique.push(k);
    if (unique.length >= 8) break;
  }
  return unique;
}
