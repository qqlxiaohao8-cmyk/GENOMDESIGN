import { loadImageForCanvas } from './renderColorCardPng';
import { CARD_RECT, getLayoutCells, getLayoutPhotoCount } from './colorWalkLayouts';
import { computePhotoDrawMetrics } from '../components/colorWalk/ColorWalkPhotoCell';

const EXPORT_WIDTH = 900;
const EXPORT_HEIGHT = Math.round(EXPORT_WIDTH * (4 / 3));

/**
 * @param {{
 *   hex: string,
 *   files: Array<string | null>,
 *   transforms: Array<{ scale: number, ox: number, oy: number } | null>,
 *   width?: number,
 *   height?: number,
 * }} opts
 */
export async function renderColorWalkLayoutPng({
  hex,
  files,
  transforms,
  width = EXPORT_WIDTH,
  height = EXPORT_HEIGHT,
}) {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const photoCount = getLayoutPhotoCount(files);
  const cells = getLayoutCells(photoCount);
  const filled = files
    .map((url, i) => (url ? { url, slotIdx: i } : null))
    .filter(Boolean);

  const images = await Promise.all(
    filled.map((entry) => loadImageForCanvas(entry.url)),
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported.');

  for (let i = 0; i < cells.length; i += 1) {
    const rect = cells[i];
    const entry = filled[i];
    if (!entry) continue;

    const img = images[i];
    const dx = rect.x * width;
    const dy = rect.y * height;
    const dw = rect.w * width;
    const dh = rect.h * height;

    const transform = transforms[entry.slotIdx] || { scale: 1, ox: 0, oy: 0 };
    const metrics = computePhotoDrawMetrics(img, { width: dw, height: dh }, transform);

    const drawW = img.naturalWidth * metrics.baseScale * metrics.userScale;
    const drawH = img.naturalHeight * metrics.baseScale * metrics.userScale;
    const ix = dx + (dw - drawW) / 2 + metrics.ox;
    const iy = dy + (dh - drawH) / 2 + metrics.oy;

    ctx.save();
    ctx.beginPath();
    ctx.rect(dx, dy, dw, dh);
    ctx.clip();
    ctx.drawImage(img, ix, iy, drawW, drawH);
    ctx.restore();
  }

  const cx = CARD_RECT.x * width;
  const cy = CARD_RECT.y * height;
  const cw = CARD_RECT.w * width;
  const ch = CARD_RECT.h * height;
  ctx.fillStyle = hex;
  ctx.fillRect(cx, cy, cw, ch);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG export failed.'))),
      'image/png',
      0.92,
    );
  });
}

export function downloadColorWalkLayoutPng(blob, filename = 'color-walk.png') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
