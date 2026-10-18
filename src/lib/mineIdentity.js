import { hexToOklch } from './oklch.js';
import { getPoeticColorName } from './poeticColorNaming';
import { getProfileFont } from './profileFonts';

function temperamentFromHex(hex) {
  const o = hexToOklch(hex);
  if (o.l < 0.22 && o.c < 0.04) return '水墨';
  if (o.l > 0.86 && o.c < 0.04) return '素白';
  if (o.c < 0.03) return '素灰';
  if (o.h >= 20 && o.h <= 78 && o.c < 0.12 && o.l < 0.78) return '暖土';
  if (o.h < 18 || o.h >= 350) return '暖赤';
  if (o.h < 48) return '暖橙';
  if (o.h < 78) return '暖金';
  if (o.h < 155) return '草木';
  if (o.h < 200) return '冷青';
  if (o.h < 255) return '冷蓝';
  if (o.h < 310) return '暮紫';
  return '暖粉';
}

export function memberSerial(username, hex) {
  const raw = `${String(username || '')}|${String(hex || '').toUpperCase()}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0).slice(-4).padStart(4, '0');
}

export function mineIdentity({ username, hex, fontId, vaultCount }) {
  const colorName = getPoeticColorName(hex);
  const temper = temperamentFromHex(hex);
  const font = getProfileFont(fontId);
  return {
    username: username || '用户',
    hex: String(hex || '#B08968').toUpperCase(),
    colorName,
    temper,
    fontLabel: font.label,
    serial: memberSerial(username, hex),
    vaultCount: Number(vaultCount) || 0,
  };
}
