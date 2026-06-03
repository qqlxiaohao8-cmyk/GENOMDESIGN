import { pickReadableTextOnHex } from './colorValues';
import { getPoeticColorName, uniquePoeticNamesForSwatches } from './poeticColorNaming';
import sekongLogoUrl from '../../下载色空.png';

export function loadImageForExport(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for export.'));
    img.src = src;
  });
}

function normalizeHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '#888888';
  return `#${s.toUpperCase()}`;
}

/** 2–10 色，不补位；名称缺省时用诗词两字名。 */
function prepareColors(colors) {
  const raw = (Array.isArray(colors) ? colors : [])
    .slice(0, 10)
    .map((c) => {
      if (typeof c === 'string') return { hex: normalizeHex(c), name: '' };
      return { hex: normalizeHex(c?.hex), name: String(c?.name || '').trim() };
    })
    .filter((c) => c.hex);
  if (raw.length < 1) {
    return [{ hex: '#888888', name: '素灰' }, { hex: '#AAAAAA', name: '素灰' }];
  }
  const names = uniquePoeticNamesForSwatches(raw);
  return raw.map((c, i) => ({
    hex: c.hex,
    name: c.name || names[i] || getPoeticColorName(c.hex),
  }));
}

const FONT_STACK = '"Songti SC", "STSong", "SimSun", "NSimSun", serif';

function drawVerticalName(ctx, text, cx, topY, fontSize, fillStyle) {
  const t = String(text || '').trim() || '—';
  const chars = Array.from(t).slice(0, 4);
  if (!chars.length) return;
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.font = `500 ${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const lineGap = fontSize * 1.15;
  let y = topY;
  for (const ch of chars) {
    ctx.fillText(ch, cx, y);
    y += lineGap;
  }
  ctx.restore();
}

/**
 * 色卡下载模版：上方等宽竖条（数量随用户 2–10 色变化），下方白底 + 色空 logo + 色卡名称。
 * 布局比例固定，仅竖条数量与宽度变化。
 */
export async function renderSekongPalettePngBlob({ title, colors }) {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
    try {
      await document.fonts.load('28px "Songti SC"');
      await document.fonts.load('24px "Songti SC"');
    } catch {
      /* ignore */
    }
  }

  const list = prepareColors(colors);
  const n = list.length;

  const W = 1080;
  const swatchH = 480;
  const footerH = 112;
  const H = swatchH + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const swatchW = W / n;

  list.forEach((c, i) => {
    const x = i * swatchW;
    ctx.fillStyle = c.hex;
    ctx.fillRect(x, 0, swatchW, swatchH);

    const fg = pickReadableTextOnHex(c.hex);
    const fontSize = Math.round(Math.min(32, Math.max(18, swatchW * 0.22)));
    const labelTop = Math.round(swatchH * 0.06);
    drawVerticalName(ctx, c.name, x + swatchW / 2, labelTop, fontSize, fg);
  });

  // 页脚：白底 + logo + 色卡名
  const footerY = swatchH;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, footerY, W, footerH);

  const logoImg = await loadImageForExport(sekongLogoUrl);
  const footerPadX = 36;
  const logoMaxH = footerH * 0.78;
  const logoScale = logoMaxH / logoImg.naturalHeight;
  const logoW = logoImg.naturalWidth * logoScale;
  const logoH = logoImg.naturalHeight * logoScale;
  const logoY = footerY + (footerH - logoH) / 2;
  ctx.drawImage(logoImg, footerPadX, logoY, logoW, logoH);

  const titleText = String(title || '色盘').trim().slice(0, 40) || '色盘';
  const titleX = footerPadX + logoW + 28;
  const titleMaxW = W - titleX - footerPadX;
  ctx.fillStyle = '#1a1a1a';
  ctx.font = `600 28px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const titleY = footerY + footerH / 2;

  let displayTitle = titleText;
  while (displayTitle.length > 1 && ctx.measureText(displayTitle).width > titleMaxW) {
    displayTitle = `${displayTitle.slice(0, -1)}…`;
  }
  ctx.fillText(displayTitle, titleX, titleY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed.'))), 'image/png', 0.95);
  });
}

/** 模版宽高比，供 UI 预览使用 */
export const SEKONG_PALETTE_EXPORT_ASPECT = 1080 / (480 + 112);
