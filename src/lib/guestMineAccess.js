/**
 * 正式环境未登录不能进「我的」。
 * 本地开发仍可预览全部页面（含游客「我的」）。
 */
export const PREVIEW_USER = {
  id: 'preview',
  email: 'preview@sekong.app',
  user_metadata: { username: '空山', accent_hex: '#B08968', font_id: 'serif' },
};

export function guestCanOpenMine() {
  return Boolean(import.meta.env.DEV);
}

export function canOpenMine(user) {
  return Boolean(user) || guestCanOpenMine();
}
