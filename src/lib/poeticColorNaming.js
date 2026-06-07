import { hexToOklch, oklabDistSqFromHex } from './oklch.js';
import { oklabBucketKey } from './poetryColorLexicon.js';
import generatedIndex from '../data/poeticColorIndex.json';

function normalizeHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '#000000';
  return `#${s.toUpperCase()}`;
}

const UNKNOWN_ENTRY = {
  hex: '#808080',
  name2: '素灰',
  poem: '白发三千丈，缘愁似个长',
  poet: '李白',
  source: '秋浦歌十七首',
};

function buildDbCache(entries) {
  return entries.map((entry) => {
    const o = hexToOklch(entry.hex);
    return {
      ...entry,
      hex: normalizeHex(entry.hex),
      l: o.l,
      c: o.c,
      h: o.h,
      bucket: oklabBucketKey(entry.hex),
    };
  });
}

/** chinese-poetry 构建索引（构建时已合并手写 override） */
const _dbCache = buildDbCache(generatedIndex);

const _hexEntryCache = new Map();

function nearestPoeticEntry(hex) {
  const norm = normalizeHex(hex);
  if (_hexEntryCache.has(norm)) return _hexEntryCache.get(norm);

  let best = null;
  let bestD = Infinity;
  for (const item of _dbCache) {
    const d = oklabDistSqFromHex(norm, item.hex);
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }

  const out = best
    ? {
        hex: best.hex,
        name2: best.name2,
        poem: best.poem,
        poet: best.poet,
        source: best.source,
      }
    : { ...UNKNOWN_ENTRY, hex: norm };

  _hexEntryCache.set(norm, out);
  return out;
}

export function getPoeticColorEntry(hex) {
  const e = nearestPoeticEntry(hex);
  return { name2: e.name2, poem: e.poem, poet: e.poet, source: e.source };
}

export function getPoeticColorName(hex) {
  return nearestPoeticEntry(hex).name2;
}

/** @param {string} [poet] @param {string} [source] */
export function formatPoeticQuoteSource(poet, source) {
  const p = String(poet || '').trim();
  const s = String(source || '').trim();
  if (p && s) return `${p}《${s}》`;
  return p || s || '';
}

/**
 * 与 hex 绑定的诗句与出处（OKLCH 最近邻诗色条目）
 * @param {string} hex
 * @returns {{ zh: string, zhSource: string, en: string, enSource: string }}
 */
export function getPoeticQuoteForHex(hex) {
  const { poem, poet, source } = getPoeticColorEntry(hex);
  return {
    zh: poem,
    zhSource: formatPoeticQuoteSource(poet, source),
    en: '',
    enSource: '',
  };
}

function pickPreferredTwoChar(item) {
  const raw = item?.name2 ?? item?.name ?? item?.label;
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\s+/g, '');
  if (!/^[\u4e00-\u9fff]{2}$/.test(s)) return null;
  return s;
}

/**
 * 每条实色一意两字名：同一 hex 一致；不同 hex 不共享同名（必要时顺延次近锚点）。
 * @param {Array<{ hex: string, name?: string, label?: string, name2?: string }>} items
 * @returns {string[]}
 */
export function uniquePoeticNamesForSwatches(items) {
  const rows = (items || []).map((item, index) => ({
    item,
    index,
    hex: normalizeHex(item?.hex),
  }));
  const hexToName = new Map();
  const used = new Set();

  const sortedByHex = [...rows].sort((a, b) => a.hex.localeCompare(b.hex));
  for (const row of sortedByHex) {
    if (hexToName.has(row.hex)) continue;

    const preferred = pickPreferredTwoChar(row.item);
    let chosen = null;
    if (preferred && !used.has(preferred)) {
      chosen = preferred;
    } else {
      const ranked = [..._dbCache]
        .map((e) => ({ name2: e.name2, d: oklabDistSqFromHex(row.hex, e.hex) }))
        .sort((a, b) => a.d - b.d);
      for (const r of ranked) {
        if (!used.has(r.name2)) {
          chosen = r.name2;
          break;
        }
      }
    }

    if (!chosen) chosen = '素灰';
    used.add(chosen);
    hexToName.set(row.hex, chosen);
  }

  return rows.map((row) => hexToName.get(row.hex) || '素灰');
}

export const POETIC_COLOR_DB_SIZE = _dbCache.length;
