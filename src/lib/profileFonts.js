/** 用户可选正文字体（写入 user_metadata.font_id，并作用于 document） */

export const PROFILE_FONTS = [
  {
    id: 'serif',
    label: '宋韵',
    desc: 'Noto Serif · 温润书卷',
    sample: '色空',
    cssFamily: '"Noto Serif SC", "Songti SC", STSong, SimSun, serif',
    tailwindClass: 'font-zenSerif',
  },
  {
    id: 'sans',
    label: '清简',
    desc: 'Noto Sans · 利落现代',
    sample: '色空',
    cssFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    tailwindClass: 'font-profile-sans',
  },
  {
    id: 'display',
    label: '展饰',
    desc: 'Bricolage · 几何标题感',
    sample: 'GENOM',
    cssFamily: '"Bricolage Grotesque", "Noto Sans SC", system-ui, sans-serif',
    tailwindClass: 'font-bricolage',
  },
  {
    id: 'kai',
    label: '楷意',
    desc: 'Kai / 楷体 · 手写筋骨',
    sample: '色空',
    cssFamily: '"KaiTi", "STKaiti", "楷体", "Noto Serif SC", serif',
    tailwindClass: 'font-profile-kai',
  },
];

const FONT_BY_ID = Object.fromEntries(PROFILE_FONTS.map((f) => [f.id, f]));

const DEFAULT_FONT_ID = 'serif';

export function getProfileFont(id) {
  return FONT_BY_ID[id] || FONT_BY_ID[DEFAULT_FONT_ID];
}

export function applyProfileFont(fontId) {
  if (typeof document === 'undefined') return;
  const font = getProfileFont(fontId);
  const root = document.documentElement;
  root.dataset.font = font.id;
  document.body.style.fontFamily = font.cssFamily;
  for (const f of PROFILE_FONTS) {
    root.classList.remove(f.tailwindClass);
  }
  root.classList.add(font.tailwindClass);
}
