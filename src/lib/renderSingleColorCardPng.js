import { getPoeticColorEntry, getPoeticQuoteForHex } from './poeticColorNaming';
import { loadImageForExport } from './renderSekongPalettePng';
import sekongLogoUrl from '../../下载色空.png';

function normalizeHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '#888888';
  return `#${s.toUpperCase()}`;
}

const FONT_STACK = '"Songti SC", "STSong", "SimSun", "NSimSun", serif';

/**
 * 单色色卡 PNG：3:4，上方 2/3 纯色，下方 1/3 白底（左下名称/HEX/诗句，右下色空 logo）。
 * @param {{ hex: string, name?: string, poem?: string }} opts
 */
export async function renderSingleColorCardPngBlob({ hex, name, poem }) {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
    try {
      await document.fonts.load('48px "Songti SC"');
      await document.fonts.load('28px "Songti SC"');
      await document.fonts.load('22px "Songti SC"');
    } catch {
      /* ignore */
    }
  }

  const colorHex = normalizeHex(hex);
  const entry = getPoeticColorEntry(colorHex);
  const quote = getPoeticQuoteForHex(colorHex);
  const displayName = String(name || entry.name2 || '素灰').trim() || '素灰';
  const displayPoem = String(poem || quote.zh || entry.poem || '').trim();
  const hexLabel = colorHex.replace(/^#/, '').toUpperCase();

  const W = 900;
  const H = 1200;
  const colorH = Math.round(H * (2 / 3));
  const footerH = H - colorH;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported.');

  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, W, colorH);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, colorH, W, footerH);

  const padX = 48;
  const padBottom = 44;
  let textY = colorH + footerH - padBottom;

  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';

  if (displayPoem) {
    ctx.font = `400 22px ${FONT_STACK}`;
    const maxPoemW = W * 0.58;
    const lines = wrapText(ctx, displayPoem, maxPoemW).slice(0, 3);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      ctx.fillText(lines[i], padX, textY);
      textY -= 30;
    }
    textY -= 10;
  }

  ctx.font = `400 24px ${FONT_STACK}`;
  ctx.fillStyle = 'rgba(26,26,26,0.55)';
  ctx.fillText(`#${hexLabel}`, padX, textY);
  textY -= 36;

  ctx.font = `500 48px ${FONT_STACK}`;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(displayName, padX, textY);

  const logoImg = await loadImageForExport(sekongLogoUrl);
  const logoMaxH = footerH * 0.28;
  const logoScale = logoMaxH / logoImg.naturalHeight;
  const logoW = logoImg.naturalWidth * logoScale;
  const logoH = logoImg.naturalHeight * logoScale;
  const logoX = W - padX - logoW;
  const logoY = colorH + footerH - padBottom - logoH;
  ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed.'))), 'image/png', 0.95);
  });
}

function wrapText(ctx, text, maxWidth) {
  const chars = Array.from(String(text || ''));
  const lines = [];
  let line = '';
  for (const ch of chars) {
    const next = line + ch;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export const SINGLE_COLOR_CARD_ASPECT = 3 / 4;
