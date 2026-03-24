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
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2;
}

/**
 * @param {HTMLImageElement} img
 * @param {{ minDistSq?: number }} [options]
 * @returns {string[]} exactly 5 #RRGGBB
 */
function extractFiveDominantFromImageElement(img, options = {}) {
  const MIN_DIST = options.minDistSq ?? 35 * 35;
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
export const DOMINANT_EXTRACT_ALTERNATES = [35 * 35, 52 * 52, 28 * 28, 44 * 44, 32 * 32];

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
