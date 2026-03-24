/**
 * Palette display title + tags: title follows swatch names or hue-based labels;
 * tags stay generic and never echo the title.
 */

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

function hexToRgb(hex) {
  const n = normalizedHex(hex);
  if (!n) return null;
  const h = n.slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d > 1e-6) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s, l };
}

function collectHsls(hexes) {
  const hsls = [];
  for (const hx of hexes) {
    const rgb = hexToRgb(hx);
    if (!rgb) continue;
    hsls.push(rgbToHsl(rgb.r, rgb.g, rgb.b));
  }
  return hsls;
}

function meanHueDegrees(hsls) {
  const hueList = hsls.filter((x) => x.s > 0.08).map((x) => x.h);
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
  const hsls = collectHsls(hexes);
  if (hsls.length === 0) return 'Color palette';
  const avgH = meanHueDegrees(hsls);
  const avgS = hsls.reduce((a, x) => a + x.s, 0) / hsls.length;
  const avgL = hsls.reduce((a, x) => a + x.l, 0) / hsls.length;

  if (avgS < 0.14) {
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
  const hsls = collectHsls(hexes);
  if (hsls.length === 0) return [];

  const avgL = hsls.reduce((a, x) => a + x.l, 0) / hsls.length;
  const avgS = hsls.reduce((a, x) => a + x.s, 0) / hsls.length;
  const hueList = hsls.filter((x) => x.s > 0.08).map((x) => x.h);

  const lightSpread =
    hsls.length > 1 ? Math.max(...hsls.map((x) => x.l)) - Math.min(...hsls.map((x) => x.l)) : 0;
  const chromaSpread =
    hsls.length > 1 ? Math.max(...hsls.map((x) => x.s)) - Math.min(...hsls.map((x) => x.s)) : 0;

  /** @type {DisplayTag[]} */
  const tags = [];

  if (avgL > 0.7) tags.push({ label: 'Light', pick: { type: 'search', value: 'light' } });
  else if (avgL < 0.34) tags.push({ label: 'Deep', pick: { type: 'search', value: 'dark' } });

  if (avgS < 0.16) tags.push({ label: 'Neutral', pick: { type: 'search', value: 'neutral' } });
  else if (avgS < 0.32) tags.push({ label: 'Muted', pick: { type: 'search', value: 'muted' } });
  else if (avgS > 0.42) tags.push({ label: 'Vivid', pick: { type: 'search', value: 'vivid' } });

  if (hueList.length >= 2 && avgS > 0.1) {
    const warmN = hueList.filter((deg) => deg <= 80 || deg >= 285).length;
    const coolN = hueList.filter((deg) => deg >= 150 && deg <= 255).length;
    const n = hueList.length;
    if (warmN / n > 0.55) tags.push({ label: 'Warm', pick: { type: 'search', value: 'warm' } });
    else if (coolN / n > 0.55) tags.push({ label: 'Cool', pick: { type: 'search', value: 'cool' } });
    else if (lightSpread > 0.28 && chromaSpread > 0.18) {
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
