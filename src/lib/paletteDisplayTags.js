/**
 * Palette display title + tags: title follows swatch names or hue-based labels;
 * tags stay generic and never echo the title. Classification uses OKLCH (not HSL).
 */

import { hexToOklch } from './oklch.js';

/** @typedef {{ type: 'keyword', value: string }} KeywordPick */
/** @typedef {{ type: 'search', value: string }} SearchPick */
/** @typedef {{ label: string, pick: KeywordPick | SearchPick }} DisplayTag */

const META_KEYWORD_DENY = [
  /^genom\s*daily$/i,
  /^color[-\s]?extract$/i,
  /^palette$/i,
  /^24\s*solar\s*terms$/i,
  /^中国色$/i,
];

function isDeniedMetaKeyword(s) {
  return META_KEYWORD_DENY.some((re) => re.test(String(s).trim()));
}

function normalizedHex(hex) {
  let h = String(hex || '')
    .trim()
    .replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return null;
  return `#${h.toUpperCase()}`;
}

function collectOklch(hexes) {
  const out = [];
  for (const hx of hexes) {
    const n = normalizedHex(hx);
    if (!n) continue;
    out.push(hexToOklch(n));
  }
  return out;
}

function meanHueDegrees(oklchList) {
  const hueList = oklchList.filter((x) => x.c > 0.04).map((x) => x.h);
  if (hueList.length === 0) return 0;
  let sx = 0;
  let sy = 0;
  for (const deg of hueList) {
    const r = (deg * Math.PI) / 180;
    sx += Math.cos(r);
    sy += Math.sin(r);
  }
  let deg = (Math.atan2(sy, sx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function isGenericPaletteName(name) {
  const t = String(name || '').trim();
  if (!t) return true;
  if (/^untitled|^color palette$|^color card$/i.test(t)) return true;
  if (/^mood\s*\d+$/i.test(t)) return true;
  if (/^color\s*\d+$/i.test(t)) return true;
  if (/^accent\s*\d+$/i.test(t)) return true;
  return false;
}

function isPlaceholderSwatchName(n) {
  const t = String(n || '').trim();
  if (!t || /^—+$/.test(t)) return true;
  if (/^color\s*\d+$/i.test(t)) return true;
  if (/^mood\s*\d+$/i.test(t)) return true;
  if (/^accent\s*\d+$/i.test(t)) return true;
  if (/^swatch$/i.test(t)) return true;
  return false;
}

/**
 * Hue-based title — wording avoids tag adjectives (warm, cool, light, muted, etc.).
 * @param {string[]} hexes
 */
export function synthesizePaletteNameFromHexes(hexes) {
  const ok = collectOklch(hexes);
  if (ok.length === 0) return 'Color palette';
  const avgH = meanHueDegrees(ok);
  const avgC = ok.reduce((a, x) => a + x.c, 0) / ok.length;
  const avgL = ok.reduce((a, x) => a + x.l, 0) / ok.length;

  if (avgC < 0.045) {
    if (avgL > 0.68) return 'Pearl sequence';
    if (avgL < 0.32) return 'Cinder suite';
    return 'Smoke study';
  }
  if (avgH >= 330 || avgH < 28) return avgL > 0.55 ? 'Bloom ledger' : 'Merlot trace';
  if (avgH < 55) return 'Amber field';
  if (avgH < 95) return 'Citron grove';
  if (avgH < 150) return 'Moss archive';
  if (avgH < 200) return 'Harbor study';
  if (avgH < 260) return 'Iris corridor';
  return 'Violet drift';
}

/**
 * Public card headline: keep good aesthetic titles; otherwise use swatch names or hue label.
 * @param {string | null | undefined} title
 * @param {Array<{ hex?: string, name?: string }>} colorRows padded to 5
 */
export function resolvePaletteDisplayTitle(title, colorRows) {
  const t = String(title || '').trim();
  if (!isGenericPaletteName(t)) return t || 'Color palette';
  const names = (colorRows || [])
    .map((c) => (c && typeof c === 'object' ? String(c.name || '').trim() : ''))
    .filter((n) => n && !isPlaceholderSwatchName(n));
  if (names.length >= 2) return `${names[0]} · ${names[1]}`;
  if (names.length === 1) return `${names[0]} group`;
  const hexes = (colorRows || []).map((c) => c?.hex).filter(Boolean);
  return synthesizePaletteNameFromHexes(hexes);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True if a tag label duplicates or is embedded in the palette title (or vice versa).
 */
export function tagConflictsWithTitle(tagLabel, paletteTitle) {
  const tag = String(tagLabel || '').trim().toLowerCase();
  const tit = String(paletteTitle || '').trim().toLowerCase();
  if (!tag || !tit) return false;
  if (tag === tit) return true;
  if (tit.includes(tag)) return true;
  if (tag.length >= 4 && tag.includes(tit)) return true;
  const tagWords = tag.split(/\s+/).filter((w) => w.length >= 3);
  for (const w of tagWords) {
    if (new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i').test(tit)) return true;
  }
  const titleWords = tit.split(/\s+/).filter((w) => w.length >= 3);
  for (const w of titleWords) {
    if (new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i').test(tag)) return true;
  }
  return false;
}

function inferColorCharacterTags(hexes) {
  const ok = collectOklch(hexes);
  if (ok.length === 0) return [];

  const avgL = ok.reduce((a, x) => a + x.l, 0) / ok.length;
  const avgC = ok.reduce((a, x) => a + x.c, 0) / ok.length;
  const hueList = ok.filter((x) => x.c > 0.04).map((x) => x.h);

  const lightSpread =
    ok.length > 1 ? Math.max(...ok.map((x) => x.l)) - Math.min(...ok.map((x) => x.l)) : 0;
  const chromaSpread =
    ok.length > 1 ? Math.max(...ok.map((x) => x.c)) - Math.min(...ok.map((x) => x.c)) : 0;

  /** @type {DisplayTag[]} */
  const tags = [];

  if (avgL > 0.7) tags.push({ label: 'Light', pick: { type: 'search', value: 'light' } });
  else if (avgL < 0.34) tags.push({ label: 'Deep', pick: { type: 'search', value: 'dark' } });

  if (avgC < 0.05) tags.push({ label: 'Neutral', pick: { type: 'search', value: 'neutral' } });
  else if (avgC < 0.095) tags.push({ label: 'Muted', pick: { type: 'search', value: 'muted' } });
  else if (avgC > 0.14) tags.push({ label: 'Vivid', pick: { type: 'search', value: 'vivid' } });

  if (hueList.length >= 2 && avgC > 0.055) {
    const warmN = hueList.filter((deg) => deg <= 80 || deg >= 285).length;
    const coolN = hueList.filter((deg) => deg >= 150 && deg <= 255).length;
    const n = hueList.length;
    if (warmN / n > 0.55) tags.push({ label: 'Warm', pick: { type: 'search', value: 'warm' } });
    else if (coolN / n > 0.55) tags.push({ label: 'Cool', pick: { type: 'search', value: 'cool' } });
    else if (lightSpread > 0.2 && chromaSpread > 0.055) {
      tags.push({ label: 'Contrast', pick: { type: 'search', value: 'contrast' } });
    }
  }

  const seen = new Set();
  const out = [];
  for (const t of tags) {
    const k = t.label.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= 3) break;
  }
  return out;
}

function isGenericTopicKeyword(s) {
  const t = String(s).trim();
  if (t.length < 2 || t.length > 22) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;
  if (/^\d+$/.test(t)) return false;
  return true;
}

/**
 * @param {{
 *   keywords?: string[] | null,
 *   colors?: Array<{ hex?: string } | string> | null,
 *   paletteTitle: string,
 * }} opts
 * @returns {DisplayTag[]}
 */
export function buildPaletteDisplayTags({ keywords = [], colors = [], paletteTitle = '' } = {}) {
  const hexes = (Array.isArray(colors) ? colors : [])
    .slice(0, 5)
    .map((c) => (typeof c === 'string' ? c : c?.hex))
    .filter(Boolean);

  const titleNorm = String(paletteTitle || '').trim();

  const inferred = inferColorCharacterTags(hexes);

  const seenPick = new Set();
  const mark = (pick) => {
    const key = `${pick.type}:${String(pick.value).trim().toLowerCase()}`;
    if (seenPick.has(key)) return false;
    seenPick.add(key);
    return true;
  };

  /** @type {DisplayTag[]} */
  const result = [];
  for (const t of inferred) {
    if (tagConflictsWithTitle(t.label, titleNorm)) continue;
    if (mark(t.pick)) result.push(t);
  }

  (Array.isArray(keywords) ? keywords : []).forEach((k) => {
    if (result.length >= 6) return;
    const s = String(k).trim();
    if (!s || isDeniedMetaKeyword(s) || !isGenericTopicKeyword(s)) return;
    if (tagConflictsWithTitle(s, titleNorm)) return;
    const pick = { type: 'keyword', value: s };
    if (!mark(pick)) return;
    result.push({ label: s, pick });
  });

  return result.filter((item) => !tagConflictsWithTitle(item.label, titleNorm)).slice(0, 6);
}
