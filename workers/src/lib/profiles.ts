import type { D1Database } from '@cloudflare/workers-types';
import type { AppUser } from '../middleware/session';

export async function ensureProfile(db: D1Database, user: AppUser) {
  await db
    .prepare(
      `INSERT INTO profiles (user_id, username, accent_hex, font_id, profile_complete, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO NOTHING`,
    )
    .bind(
      user.id,
      user.username ?? null,
      user.accent_hex ?? '#888888',
      user.font_id ?? 'serif',
      user.profile_complete ? 1 : 0,
    )
    .run();
}

export async function syncProfileFromUser(db: D1Database, user: AppUser) {
  const nameParts = (user.name || '').trim().split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.slice(1).join(' ') || null;
  await db
    .prepare(
      `INSERT INTO profiles (user_id, username, accent_hex, font_id, first_name, last_name, profile_complete, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         username = excluded.username,
         accent_hex = excluded.accent_hex,
         font_id = excluded.font_id,
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         profile_complete = excluded.profile_complete,
         updated_at = datetime('now')`,
    )
    .bind(
      user.id,
      user.username ?? null,
      user.accent_hex ?? '#888888',
      user.font_id ?? 'serif',
      firstName,
      lastName,
      user.profile_complete ? 1 : 0,
    )
    .run();
}
