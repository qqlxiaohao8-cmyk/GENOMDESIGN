import { pickReadableTextOnHex } from './colorValues';
import { colorRoleLabelAtIndex } from './colorCardRoles';

export function loadImageForCanvas(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for export.'));
    img.src = src;
  });
}

/**
 * Matches on-screen color card: full-bleed image, evenly spaced opaque swatches (sharp rects,
 * no border), hex + name left, Primary/Secondary caption right. Optional overview band below.
 */
export async function renderColorCardToPngBlob({ overview, colors, image }) {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const W = 880;
  const ar = image.naturalWidth > 0 ? image.naturalHeight / image.naturalWidth : 1.35;
  const H = Math.min(Math.round(W * Math.max(ar, 1.15)), 1400);
  const footerBand = overview ? 132 : 0;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H + footerBand;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported.');

  const ir = image.naturalWidth / image.naturalHeight;
  const boxR = W / H;
  let dw = W;
  let dh = H;
  let ox = 0;
  let oy = 0;
  if (ir > boxR) {
    dh = H;
    dw = dh * ir;
    ox = (W - dw) / 2;
  } else {
    dw = W;
    dh = dw / ir;
    oy = (H - dh) / 2;
  }
  ctx.drawImage(image, ox, oy, dw, dh);

  const n = Math.max(colors.length || 5, 1);
  const topPad = Math.round(H * 0.06);
  const bottomPad = Math.round(H * 0.06);
  const usable = H - topPad - bottomPad;
  const slotH = usable / n;
  const swatchH = Math.min(Math.round(slotH * 0.82), Math.round(H * 0.145));
  const swW = W * 0.54;
  const x0 = (W - swW) / 2;
  const padX = 16;
  const padRight = 14;

  colors.forEach((c, i) => {
    const slotTop = topPad + i * slotH;
    const y = slotTop + (slotH - swatchH) / 2;

    ctx.fillStyle = c.hex;
    ctx.fillRect(x0, y, swW, swatchH);

    const fg = pickReadableTextOnHex(c.hex);
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.88;
    ctx.font = '500 15px "Bricolage Grotesque", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(c.hex).toUpperCase(), x0 + padX, y + 10);
    ctx.globalAlpha = 1;

    ctx.fillStyle = fg;
    ctx.font = '700 26px "Bricolage Grotesque", system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(c.name, x0 + padX, y + 10 + 18 + 6);

    const role = colorRoleLabelAtIndex(i).toUpperCase();
    ctx.fillStyle = fg;
    ctx.globalAlpha = 0.92;
    ctx.font = '600 11px "Bricolage Grotesque", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(role, x0 + swW - padRight, y + swatchH / 2);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  });

  if (overview) {
    const y0 = H + 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, H, canvas.width, canvas.height - H);
    ctx.fillStyle = '#1e293b';
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const maxW = W - 48;
    let line = '';
    let ly = y0;
    const words = overview.split(/\s+/);
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, 24, ly);
        line = w;
        ly += 24;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, 24, ly);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed.'))), 'image/png', 0.92);
  });
}
