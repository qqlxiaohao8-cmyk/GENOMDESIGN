/** 是否需完成首次资料设置（用户名 + 代表色 + 字体） */
export function needsProfileOnboarding(user) {
  if (!user) return false;
  const m = user.user_metadata || {};
  if (m.profile_complete === true) return false;
  if (String(m.username || '').trim() && m.accent_hex) return false;
  return true;
}
