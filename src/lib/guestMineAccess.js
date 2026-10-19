/**
 * 未登录可以看色空、生色和取色，不能进收藏，也不能发布或下载。
 */
export const PREVIEW_USER = {
  id: 'preview',
  email: 'preview@sekong.app',
  user_metadata: { username: '空山', accent_hex: '#B08968', font_id: 'serif' },
};

export function guestCanOpenMine() {
  return false;
}

export function canOpenMine(user) {
  return Boolean(user) || guestCanOpenMine();
}
