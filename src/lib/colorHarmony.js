/**
 * Build 5-color palettes from a base hex using common harmony rules (all steps in OKLCH).
 */

import { wrapHueDeg, hexToOklch, lchToHexClamped } from './oklch.js';

function normalizeHex(hex) {
  const s = String(hex || '')
    .trim()
    .replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(s)) return '#808080';
  return `#${s.toUpperCase()}`;
}

function jitterHueDeg(rnd) {
  return (rnd() - 0.5) * 14;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export const HARMONY_TYPES = [
  { id: 'complementary', label: '互补色' },
  { id: 'analogous', label: '邻近色' },
  { id: 'monochromatic', label: '单色' },
  { id: 'triadic', label: '三色组' },
  { id: 'split', label: '分裂互补' },
];

/**
 * @param {string} baseHex
 * @param {string} typeId
 * @param {number} [seed] different seeds give “再生成” variants
 * @returns {{ hexes: string[], neutralWarn: string | null }}
 */
export function harmonyPaletteFive(baseHex, typeId, seed = 0) {
  const hex = normalizeHex(baseHex);
  const base = hexToOklch(hex);
  let { l: L0, c: C0, h: H0 } = base;

  if (C0 < 1e-6) {
    C0 = 0.09;
    H0 = wrapHueDeg(seed * 47.3);
  }
  // 把基准 L / C 夹进「愉悦区间」，避免由于原图偏暗或偏灰导致整组色卡也偏暗偏灰
  const L0safe = clamp(L0, 0.4, 0.72);
  const C0safe = clamp(C0, 0.08, 0.16);

  let rnd = mulberry32(seed || 0x9e3779b9);

  // 直接传入绝对 L（而不是乘因子），保证整组有干净的明暗阶梯
  const rowAbs = (deltaHdeg, L, cFactor) => {
    const h = wrapHueDeg(H0 + deltaHdeg + jitterHueDeg(rnd) * 0.6);
    const Lfinal = clamp(L + (rnd() - 0.5) * 0.025, 0.28, 0.86);
    const Cfinal = clamp(C0safe * cFactor + (rnd() - 0.5) * 0.015, 0.04, 0.18);
    return lchToHexClamped(Lfinal, Cfinal, h);
  };

  let hexes;
  switch (typeId) {
    case 'complementary': {
      // 两个主色（对角 180°）+ 各一淡一深 + 一个柔和中间桥色
      hexes = [
        rowAbs(0, 0.42, 1.0),
        rowAbs(180, 0.52, 1.0),
        rowAbs(0, 0.72, 0.55),
        rowAbs(180, 0.72, 0.55),
        rowAbs(10, 0.84, 0.35),
      ];
      break;
    }
    case 'analogous': {
      // 五色从冷到暖的渐变
      hexes = [
        rowAbs(-36, 0.40, 0.9),
        rowAbs(-18, 0.52, 1.0),
        rowAbs(0, L0safe, 1.0),
        rowAbs(18, 0.66, 1.0),
        rowAbs(36, 0.80, 0.8),
      ];
      break;
    }
    case 'monochromatic': {
      // 干净的 5 阶色阶
      hexes = [
        rowAbs(0, 0.32, 0.55),
        rowAbs(0, 0.46, 0.85),
        rowAbs(0, L0safe, 1.0),
        rowAbs(0, 0.70, 0.85),
        rowAbs(0, 0.84, 0.55),
      ];
      break;
    }
    case 'triadic': {
      hexes = [
        rowAbs(0, 0.56, 1.0),
        rowAbs(120, 0.56, 1.0),
        rowAbs(240, 0.56, 1.0),
        rowAbs(0, 0.80, 0.55),
        rowAbs(120, 0.34, 0.75),
      ];
      break;
    }
    case 'split': {
      hexes = [
        rowAbs(0, 0.54, 1.0),
        rowAbs(150, 0.54, 0.95),
        rowAbs(210, 0.54, 0.95),
        rowAbs(0, 0.82, 0.45),
        rowAbs(180, 0.32, 0.7),
      ];
      break;
    }
    default: {
      hexes = [hex, hex, hex, hex, hex];
    }
  }

  hexes = hexes.map(normalizeHex);
  const neutralWarn =
    base.c < 0.035 ? '基准色接近中性灰，已按设计学规则补充饱和度；若需更精准请更换参考或点击「再生成」。' : null;
  return { hexes, neutralWarn };
}

function mulberry32(a) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildCardHexesFromCustomPicks(picks, typeId = 'monochromatic', seed = 0) {
  const clean = (picks || []).map(normalizeHex).filter(Boolean);
  if (!clean.length) return harmonyPaletteFive('#808080', 'monochromatic', seed);
  const base = clean[Math.floor(clean.length / 2)];
  const { hexes, neutralWarn } = harmonyPaletteFive(base, typeId, seed + clean.length * 31);
  const merged = clean.slice(0, 3).concat(hexes).slice(0, 5);
  while (merged.length < 5) merged.push(hexes[merged.length] || base);
  return { hexes: merged.map(normalizeHex), neutralWarn };
}
