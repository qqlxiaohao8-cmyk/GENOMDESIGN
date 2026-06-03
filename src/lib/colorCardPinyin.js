import { pinyin } from 'pinyin-pro';

/** 色卡印章区顶部拼音（带声调），仅供展示。 */
export function colorNamePinyin(name) {
  if (!name || typeof name !== 'string') return '';
  const s = name.trim();
  if (!s) return '';
  try {
    const out = pinyin(s, { toneType: 'symbol', type: 'string' });
    return String(out).trim().toLowerCase();
  } catch {
    return '';
  }
}
