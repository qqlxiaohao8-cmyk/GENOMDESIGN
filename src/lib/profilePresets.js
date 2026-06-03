export const PROFILE_ACCENT_PRESETS = [
  '#C93756', '#FF4C00', '#E8C48E', '#4F8A5B', '#2B7BA8',
  '#6B4FA8', '#E8A598', '#8B5E3C', '#2D2D2D', '#A8A8A8',
];

export function normalizeProfileHex(hex) {
  const s = String(hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return '#C93756';
  return `#${s.toUpperCase()}`;
}
