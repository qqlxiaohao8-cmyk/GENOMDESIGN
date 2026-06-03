/**
 * OKLab / OKLCH (Björn Ottosson) ↔ sRGB. Single source for perceptual color generation in GENOM.
 */

export function wrapHueDeg(deg) {
  let x = deg % 360;
  if (x < 0) x += 360;
  return x;
}

function linSrgbChannel(u) {
  const c = u / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function srgbByteFromLinear(lin) {
  if (lin <= 0) return 0;
  if (lin >= 1) return 255;
  const v = lin <= 0.0031308 ? lin * 12.92 : 1.055 * lin ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

/** @param {string} hex #RRGGBB */
export function hexToRgb255(hex) {
  const h = String(hex || '')
    .replace(/^#/, '')
    .trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgb255ToHex(r, g, b) {
  const c = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

export function srgb255ToOklab(r, g, b) {
  const R = linSrgbChannel(r);
  const G = linSrgbChannel(g);
  const B = linSrgbChannel(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** @returns {[number, number, number]} linear sRGB 0..1 */
export function oklabToLinearSrgb(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  const rl = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [rl, gl, bl];
}

export function oklabToSrgb255(L, a, b) {
  const [rl, gl, bl] = oklabToLinearSrgb(L, a, b);
  return {
      r: srgbByteFromLinear(rl),
      g: srgbByteFromLinear(gl),
      b: srgbByteFromLinear(bl),
    };
}

/** @returns {{ l: number, c: number, h: number }} l≈0..1, c≥0, h degrees */
export function rgb255ToOklch(r, g, b) {
  const { L, a, b: bb } = srgb255ToOklab(r, g, b);
  const c = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  if (c < 1e-8) h = 0;
  return { l: L, c, h };
}

export function hexToOklch(hex) {
  const { r, g, b } = hexToRgb255(hex);
  return rgb255ToOklch(r, g, b);
}

export function lchToOklab(l, c, hDeg) {
  const hr = (hDeg * Math.PI) / 180;
  return { L: l, a: c * Math.cos(hr), b: c * Math.sin(hr) };
}

/**
 * OKLCH → sRGB hex; reduce chroma in-gamut before hard clip.
 */
export function lchToHexClamped(L, C, h) {
  let c = C;
  for (let step = 0; step < 20; step++) {
    const { L: La, a, b } = lchToOklab(L, c, h);
    const [rl, gl, bl] = oklabToLinearSrgb(La, a, b);
    if (rl >= -1e-3 && rl <= 1.0006 && gl >= -1e-3 && gl <= 1.0006 && bl >= -1e-3 && bl <= 1.0006) {
      return rgb255ToHex(srgbByteFromLinear(rl), srgbByteFromLinear(gl), srgbByteFromLinear(bl));
    }
    c *= 0.89;
  }
  const { L: La, a, b: bb } = lchToOklab(L, 0, h);
  const [rl, gl, bl] = oklabToLinearSrgb(La, a, bb);
  const clip = (x) => srgbByteFromLinear(Math.min(1, Math.max(0, x)));
  return rgb255ToHex(clip(rl), clip(gl), clip(bl));
}

/** Perceptual distance in OKLab (squared). Better than RGB² for palette spacing. */
export function oklabDistSqFromHex(hexA, hexB) {
  const A = hexToRgb255(hexA);
  const B = hexToRgb255(hexB);
  const oa = srgb255ToOklab(A.r, A.g, A.b);
  const ob = srgb255ToOklab(B.r, B.g, B.b);
  const dL = oa.L - ob.L;
  const da = oa.a - ob.a;
  const db = oa.b - ob.b;
  return dL * dL + da * da + db * db;
}

/** In-gamut UI color: mid L, moderate C, full hue wheel. */
export function randomOklchHex() {
  const h = Math.random() * 360;
  const L = 0.38 + Math.random() * 0.38;
  const C = 0.04 + Math.random() * 0.1;
  return lchToHexClamped(L, C, h);
}

/** Linear mix in OKLab (t 0..1). */
export function mixHexOklab(aHex, bHex, t) {
  const ra = hexToRgb255(aHex);
  const rb = hexToRgb255(bHex);
  const A = srgb255ToOklab(ra.r, ra.g, ra.b);
  const B = srgb255ToOklab(rb.r, rb.g, rb.b);
  const L = A.L + (B.L - A.L) * t;
  const a = A.a + (B.a - A.a) * t;
  const b = A.b + (B.b - A.b) * t;
  const { r, g, b: bb } = oklabToSrgb255(L, a, b);
  return rgb255ToHex(r, g, bb);
}
