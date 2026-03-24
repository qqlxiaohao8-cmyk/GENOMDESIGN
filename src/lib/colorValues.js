/** @param {string} hex #RRGGBB */
export function hexToRgb(hex) {
  const h = String(hex || '')
    .replace(/^#/, '')
    .trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return [0, 0, 0];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToCmyk(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k >= 1 - 1e-6) return [0, 0, 0, 100];
  const c = Math.round(((1 - rr - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gg - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bb - k) / (1 - k)) * 100);
  const kk = Math.round(k * 100);
  return [c, m, y, kk];
}

export function enrichSwatch(hex) {
  const h = String(hex || '')
    .trim()
    .toUpperCase();
  const norm = h.startsWith('#') ? h : `#${h.replace(/^#/, '')}`;
  const rgb = hexToRgb(norm);
  const cmyk = rgbToCmyk(rgb[0], rgb[1], rgb[2]);
  return { hex: norm, rgb, cmyk };
}

export function formatRgbLine(r, g, b) {
  return `RGB ${r} ${g} ${b}`;
}

export function formatCmykLine(cmyk) {
  const [c, m, y, k] = cmyk;
  return `CMYK ${c}% ${m}% ${y}% ${k}%`;
}

export function pickReadableTextOnHex(hex) {
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.2126 * (r / 255) ** 2.2 + 0.7152 * (g / 255) ** 2.2 + 0.0722 * (b / 255) ** 2.2) ** (1 / 2.2);
  return lum > 0.55 ? '#0F172A' : '#FFFFFF';
}

function normHex(hex) {
  let h = String(hex || '').trim();
  if (!h.startsWith('#')) h = `#${h.replace(/^#/, '')}`;
  return h.toUpperCase();
}

/** sRGB relative luminance (WCAG). */
export function relativeLuminanceHex(hex) {
  const [r, g, b] = hexToRgb(normHex(hex));
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Contrast ratio of two solid fills (larger = more contrast). */
export function contrastRatioHex(fgHex, bgHex) {
  const L1 = relativeLuminanceHex(fgHex) + 0.05;
  const L2 = relativeLuminanceHex(bgHex) + 0.05;
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return hi / lo;
}

/**
 * Text color from other palette swatches when readable; else black/white on `backgroundHex`.
 */
export function pickPaletteAccentTextColor(backgroundHex, paletteHexStrings, minRatio = 3) {
  const bg = normHex(backgroundHex);
  const others = (paletteHexStrings || []).map(normHex).filter((h) => /^#[0-9A-F]{6}$/.test(h) && h !== bg);
  const fallback = pickReadableTextOnHex(bg);
  let best = fallback;
  let bestRatio = contrastRatioHex(fallback, bg);
  for (const h of others) {
    const r = contrastRatioHex(h, bg);
    if (r > bestRatio) {
      best = h;
      bestRatio = r;
    }
  }
  if (bestRatio >= minRatio) return best;
  return fallback;
}
