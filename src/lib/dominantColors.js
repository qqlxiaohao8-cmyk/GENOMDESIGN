import { oklabDistSqFromHex, mixHexOklab } from './oklch.js';

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

function hexToRgb(hex) {
  const h = String(hex).replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return [0, 0, 0];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function colorDistSq(a, b) {
  return oklabDistSqFromHex(a, b);
}

/**
 * @param {HTMLImageElement} img
 * @param {{ minDistSq?: number }} [options]
 * @returns {string[]} exactly 5 #RRGGBB
 */
function extractFiveDominantFromImageElement(img, options = {}) {
  const MIN_DIST = options.minDistSq ?? 0.00042;
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  const maxSide = 96;
  const scale = maxSide / Math.max(nw, nh, 1);
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const bucketCounts = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const qr = (r >> 3) << 3;
    const qg = (g >> 3) << 3;
    const qb = (b >> 3) << 3;
    const key = rgbToHex(qr, qg, qb);
    bucketCounts.set(key, (bucketCounts.get(key) || 0) + 1);
  }
  const sorted = [...bucketCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return ['#808080', '#A0A0A0', '#C0C0C0', '#606060', '#404040'];
  }
  const chosen = [];
  for (const [hex] of sorted) {
    if (chosen.length >= 5) break;
    const ok = chosen.every((c) => colorDistSq(c, hex) >= MIN_DIST);
    if (ok) chosen.push(hex);
  }
  for (const [hex] of sorted) {
    if (chosen.length >= 5) break;
    if (!chosen.includes(hex)) chosen.push(hex);
  }
  while (chosen.length < 5) {
    chosen.push(chosen[chosen.length - 1] || '#808080');
  }
  return chosen.slice(0, 5);
}

/**
 * @param {string} dataUrl
 * @param {{ minDistSq?: number }} [options]
 * @returns {Promise<string[]>} exactly 5 #RRGGBB hex strings
 */
export function extractFiveDominantHexesFromDataUrl(dataUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        resolve(extractFiveDominantFromImageElement(img, options));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Could not read image.'));
    img.src = dataUrl;
  });
}

/**
 * Alternative `minDistSq` values for dominant extraction. Index 0 matches the default pipeline;
 * other indices bias toward more or fewer distinct hues. Re-extract UI cycles these for visible change.
 */
/** OKLab squared-distance thresholds (perceptual spacing). */
export const DOMINANT_EXTRACT_ALTERNATES = [0.00042, 0.00072, 0.00028, 0.00058, 0.00035];

/**
 * @param {string} dataUrl
 * @param {number} [variantCount]
 * @returns {Promise<string[][]>} each entry is five hex strings
 */
export async function extractPaletteVariantsFromDataUrl(dataUrl, variantCount = 5) {
  const n = Math.min(Math.max(1, variantCount), DOMINANT_EXTRACT_ALTERNATES.length);
  const dists = DOMINANT_EXTRACT_ALTERNATES.slice(0, n);
  return Promise.all(dists.map((minDistSq) => extractFiveDominantHexesFromDataUrl(dataUrl, { minDistSq })));
}

/**
 * Sample opaque pixel at normalized coordinates (0–1) on the full-resolution image.
 * @param {string} dataUrl
 * @param {number} nx
 * @param {number} ny
 * @returns {Promise<string>} #RRGGBB
 */
function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read image.'));
    img.src = dataUrl;
  });
}

/**
 * For each target hex, find the normalized image point whose color is closest in OKLab.
 * @param {string} dataUrl
 * @param {string[]} hexes
 * @returns {Promise<Array<{ nx: number, ny: number }>>}
 */
export async function findNormalizedPointsForHexes(dataUrl, hexes) {
  const img = await loadImageElement(dataUrl);
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  const maxSide = 120;
  const sc = maxSide / Math.max(nw, nh, 1);
  const w = Math.max(1, Math.round(nw * sc));
  const h = Math.max(1, Math.round(nh * sc));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const usedCells = new Set();
  const MIN_CELL_GAP = 3;

  return hexes.map((targetHex) => {
    let bestD = Infinity;
    let bestX = 0.5;
    let bestY = 0.5;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] < 128) continue;
        let tooClose = false;
        for (const key of usedCells) {
          const [ux, uy] = key.split(',').map(Number);
          if (Math.hypot(x - ux, y - uy) < MIN_CELL_GAP) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        const hx = rgbToHex(data[i], data[i + 1], data[i + 2]);
        const d = colorDistSq(targetHex, hx);
        if (d < bestD) {
          bestD = d;
          bestX = w > 1 ? x / (w - 1) : 0.5;
          bestY = h > 1 ? y / (h - 1) : 0.5;
        }
      }
    }

    const cx = Math.round(bestX * (w - 1));
    const cy = Math.round(bestY * (h - 1));
    usedCells.add(`${cx},${cy}`);
    return { nx: bestX, ny: bestY };
  });
}

/**
 * Sample `count` colors along a sweep path; `sweepT` (0–1) shifts the path across the image.
 * @returns {Promise<Array<{ hex: string, nx: number, ny: number }>>}
 */
export async function sampleSweepPaletteFromDataUrl(dataUrl, count, sweepT) {
  const n = Math.max(2, Math.min(10, count));
  const t = Math.max(0, Math.min(1, sweepT));
  const items = [];
  for (let i = 0; i < n; i++) {
    const along = n === 1 ? 0.5 : i / (n - 1);
    const cx = 0.12 + t * 0.76;
    const cy = 0.12 + t * 0.76;
    const spread = (along - 0.5) * 0.9;
    const nx = Math.max(0.03, Math.min(0.97, cx + spread * 0.38));
    const ny = Math.max(0.03, Math.min(0.97, cy - spread * 0.38));
    // eslint-disable-next-line no-await-in-loop
    const hex = await sampleHexAtNormalizedPoint(dataUrl, nx, ny);
    items.push({ hex, nx, ny });
  }
  return items;
}

export function sampleHexAtNormalizedPoint(dataUrl, nx, ny) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const nw = img.naturalWidth || img.width;
        const nh = img.naturalHeight || img.height;
        const canvas = document.createElement('canvas');
        canvas.width = nw;
        canvas.height = nh;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const u = Math.max(0, Math.min(1, nx));
        const v = Math.max(0, Math.min(1, ny));
        const x = Math.min(nw - 1, Math.max(0, Math.floor(u * (nw - 1))));
        const y = Math.min(nh - 1, Math.max(0, Math.floor(v * (nh - 1))));
        const px = ctx.getImageData(x, y, 1, 1).data;
        resolve(rgbToHex(px[0], px[1], px[2]));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Could not read image.'));
    img.src = dataUrl;
  });
}

function luminanceRgb(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function minPairwiseDist(hexes) {
  let m = Infinity;
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      m = Math.min(m, colorDistSq(hexes[i], hexes[j]));
    }
  }
  return m;
}

function mixHex(a, b, t) {
  return mixHexOklab(a, b, t);
}

function extractTwoExtremaFromImageElement(img) {
  const nw = img.naturalWidth || img.width;
  const nh = img.naturalHeight || img.height;
  const maxSide = 128;
  const scale = maxSide / Math.max(nw, nh, 1);
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  let minL = 1e9;
  let maxL = -1;
  let minHex = '#000000';
  let maxHex = '#FFFFFF';
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const L = luminanceRgb(r, g, b);
    const hx = rgbToHex(r, g, b);
    if (L < minL) {
      minL = L;
      minHex = hx;
    }
    if (L > maxL) {
      maxL = L;
      maxHex = hx;
    }
  }
  if (minHex === maxHex) {
    maxHex = rgbToHex(255, 255, 255);
  }
  return [minHex, maxHex];
}

function expandTwoToFive(pair) {
  const [a, b] = pair;
  const m = mixHex(a, b, 0.5);
  const a1 = mixHex(a, m, 0.5);
  const b1 = mixHex(m, b, 0.5);
  return [a, b, m, a1, b1];
}

const ADAPTIVE_VARIANCE_THRESHOLD = 0.000085;

/**
 * If automatic 5-color extraction is very low-contrast (near solid / B&W), fall back to two extreme luminance swatches
 * expanded to five stops for naming / vault compatibility.
 * @returns {Promise<{ hexes: string[], lowVariance: boolean, pair: string[] | null }>}
 */
export async function extractAdaptiveDominantHexesFromDataUrl(dataUrl, options = {}) {
  const five = await extractFiveDominantHexesFromDataUrl(dataUrl, options);
  if (minPairwiseDist(five) >= ADAPTIVE_VARIANCE_THRESHOLD) {
    return { hexes: five, lowVariance: false, pair: null };
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const pair = extractTwoExtremaFromImageElement(img);
        const hexes = expandTwoToFive(pair);
        resolve({ hexes, lowVariance: true, pair });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('Could not read image.'));
    img.src = dataUrl;
  });
}
