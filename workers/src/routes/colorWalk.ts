import { Hono } from 'hono';
import type { WorkerEnv } from '../auth';
import {
  COLOR_WALK_SAVED_MAX,
  formatSavedColorRow,
  normalizeHex,
  normalizeLayoutId,
  normalizePhotoKeys,
  photoKeysToJson,
  type ColorWalkSavedRow,
} from '../lib/colorWalk';
import { ensureProfile } from '../lib/profiles';
import { requireUser } from '../middleware/session';

type Env = WorkerEnv;

const colorWalk = new Hono<{ Bindings: Env }>();

colorWalk.get('/color-walk/saved-colors', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;

  const { results } = await c.env.DB.prepare(
    `SELECT id, user_id, hex, layout_id, photo_keys, sort_order, created_at
     FROM color_walk_saved_colors
     WHERE user_id = ?
     ORDER BY sort_order ASC, created_at ASC`,
  )
    .bind(user.id)
    .all<ColorWalkSavedRow>();

  return c.json({ data: (results || []).map(formatSavedColorRow) });
});

colorWalk.post('/color-walk/saved-colors', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  await ensureProfile(c.env.DB, user);

  const body = await c.req.json<{
    hex?: unknown;
    layoutId?: unknown;
    photoKeys?: unknown;
  }>();

  const hex = normalizeHex(body.hex);
  if (!hex) return c.json({ error: 'invalid_hex' }, 400);

  const layoutId = normalizeLayoutId(body.layoutId);
  const photoKeys = normalizePhotoKeys(body.photoKeys);
  if (photoKeys == null) return c.json({ error: 'invalid_photo_keys' }, 400);

  // Idempotent: same hex already saved → treat as success and return existing row
  const existing = await c.env.DB.prepare(
    `SELECT id, user_id, hex, layout_id, photo_keys, sort_order, created_at
     FROM color_walk_saved_colors
     WHERE user_id = ? AND lower(hex) = lower(?)
     LIMIT 1`,
  )
    .bind(user.id, hex)
    .first<ColorWalkSavedRow>();
  if (existing) {
    return c.json({ id: existing.id, existing: true, data: formatSavedColorRow(existing) });
  }

  const id = crypto.randomUUID();
  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO color_walk_saved_colors
         (id, user_id, hex, layout_id, photo_keys, sort_order, created_at)
       SELECT ?, ?, ?, ?, ?,
              (SELECT COUNT(*) FROM color_walk_saved_colors WHERE user_id = ?),
              datetime('now')
       WHERE (SELECT COUNT(*) FROM color_walk_saved_colors WHERE user_id = ?) < ?`,
    )
      .bind(
        id,
        user.id,
        hex,
        layoutId,
        photoKeysToJson(photoKeys),
        user.id,
        user.id,
        COLOR_WALK_SAVED_MAX,
      )
      .run();

    if (!result.meta.changes) {
      return c.json({ error: 'saved_colors_full' }, 409);
    }
  } catch (e) {
    const msg = String(e);
    if (/UNIQUE constraint failed/i.test(msg)) {
      const row = await c.env.DB.prepare(
        `SELECT id, user_id, hex, layout_id, photo_keys, sort_order, created_at
         FROM color_walk_saved_colors
         WHERE user_id = ? AND lower(hex) = lower(?)
         LIMIT 1`,
      )
        .bind(user.id, hex)
        .first<ColorWalkSavedRow>();
      if (row) {
        return c.json({ id: row.id, existing: true, data: formatSavedColorRow(row) });
      }
      return c.json({ error: 'duplicate_color' }, 409);
    }
    return c.json({ error: 'insert_failed', message: msg }, 400);
  }

  return c.json({ id, existing: false }, 201);
});

colorWalk.delete('/color-walk/saved-colors/:id', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;

  const id = c.req.param('id');
  const result = await c.env.DB.prepare(
    `DELETE FROM color_walk_saved_colors WHERE id = ? AND user_id = ?`,
  )
    .bind(id, user.id)
    .run();

  if (!result.meta.changes) return c.json({ error: 'not_found' }, 404);
  return c.json({ ok: true });
});

colorWalk.put('/color-walk/saved-colors/reorder', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;

  const body = await c.req.json<{ ids?: unknown }>();
  const ids = Array.isArray(body.ids)
    ? body.ids.map((id) => String(id || '').trim()).filter(Boolean)
    : null;
  if (!ids?.length) return c.json({ error: 'ids required' }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT id FROM color_walk_saved_colors WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC`,
  )
    .bind(user.id)
    .all<{ id: string }>();

  const existing = (results || []).map((r) => r.id);
  if (ids.length !== existing.length) {
    return c.json({ error: 'invalid_reorder' }, 400);
  }

  const existingSet = new Set(existing);
  if (ids.some((id) => !existingSet.has(id))) {
    return c.json({ error: 'invalid_reorder' }, 400);
  }

  const db = c.env.DB;
  const stmts = [
    ...ids.map((id, idx) =>
      db.prepare(
        `UPDATE color_walk_saved_colors SET sort_order = ? WHERE id = ? AND user_id = ?`,
      ).bind(-(idx + 1), id, user.id),
    ),
    ...ids.map((id, idx) =>
      db.prepare(
        `UPDATE color_walk_saved_colors SET sort_order = ? WHERE id = ? AND user_id = ?`,
      ).bind(idx, id, user.id),
    ),
  ];

  await db.batch(stmts);
  return c.json({ ok: true });
});

export default colorWalk;
