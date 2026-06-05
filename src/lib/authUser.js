/** Map Better Auth user → Supabase-shaped user for existing UI code. */
export function mapAuthUser(baUser) {
  if (!baUser) return null;
  const fullName = (baUser.name || '').trim();
  const parts = fullName ? fullName.split(/\s+/) : [];
  return {
    id: baUser.id,
    email: baUser.email,
    user_metadata: {
      username: baUser.username || '',
      accent_hex: baUser.accent_hex || '',
      font_id: baUser.font_id || 'serif',
      profile_complete: baUser.profile_complete === true,
      avatar_url: baUser.image || '',
      full_name: fullName,
      name: fullName,
      first_name: parts[0] || '',
      last_name: parts.slice(1).join(' ') || '',
    },
  };
}

export function displayUserName(user) {
  if (!user) return '';
  const m = user.user_metadata || {};
  if (m.username) return m.username;
  const combined = [m.first_name, m.last_name]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .join(' ')
    .trim();
  if (combined) return combined;
  if (m.full_name) return m.full_name.trim();
  if (m.name) return m.name.trim();
  if (user.email) return user.email.split('@')[0];
  return '';
}

export function passwordResetTokenFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('error')) return null;
  return params.get('token');
}

export function clearPasswordResetQuery() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('token');
  url.searchParams.delete('error');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}
