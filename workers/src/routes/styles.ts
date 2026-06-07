import { Hono } from 'hono';
import type { WorkerEnv } from '../auth';
import { toJson } from '../lib/json';
import { ensureProfile } from '../lib/profiles';
import { formatStyleRow, type StyleRow } from '../lib/styles';
import { getSessionUser, requireUser } from '../middleware/session';

type Env = WorkerEnv & { STYLE_IMAGES: R2Bucket };

const styles = new Hono<{ Bindings: Env }>();

async function findDuplicatePublicTitle(
  db: D1Database,
  aesthetic: string | null | undefined,
  excludeId?: string,
) {
  const norm = String(aesthetic || '').trim().toLowerCase();
  if (!norm) return null;
  const sql = excludeId
    ? `SELECT id FROM styles WHERE is_public = 1 AND lower(trim(aesthetic)) = ? AND id != ? LIMIT 1`
    : `SELECT id FROM styles WHERE is_public = 1 AND lower(trim(aesthetic)) = ? LIMIT 1`;
  const stmt = excludeId
    ? db.prepare(sql).bind(norm, excludeId)
    : db.prepare(sql).bind(norm);
  return stmt.first<{ id: string }>();
}

styles.get('/styles/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare(`SELECT * FROM styles WHERE id = ?`)
    .bind(id)
    .first<StyleRow>();
  if (!row) return c.json({ error: 'not found' }, 404);

  if (!row.is_public) {
    const user = await getSessionUser(c);
    if (!user || user.id !== row.user_id) {
      return c.json({ error: 'not found' }, 404);
    }
  }

  return c.json({ data: formatStyleRow(row) });
});

styles.get('/styles', async (c) => {
  const scope = c.req.query('scope') || 'explore';
  if (scope === 'explore') {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM styles WHERE is_public = 1 ORDER BY created_at DESC`,
    ).all<StyleRow>();
    return c.json({ data: (results || []).map(formatStyleRow) });
  }
  if (scope === 'vault') {
    const user = await requireUser(c);
    if (user instanceof Response) return user;
    await ensureProfile(c.env.DB, user);
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM styles WHERE user_id = ? ORDER BY created_at DESC`,
    )
      .bind(user.id)
      .all<StyleRow>();
    return c.json({ data: (results || []).map(formatStyleRow) });
  }
  return c.json({ error: 'invalid scope' }, 400);
});

styles.get('/style-likes', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  const { results } = await c.env.DB.prepare(
    `SELECT style_id FROM style_likes WHERE user_id = ?`,
  )
    .bind(user.id)
    .all<{ style_id: string }>();
  return c.json({ data: (results || []).map((r) => r.style_id) });
});

styles.post('/styles', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  await ensureProfile(c.env.DB, user);

  const body = await c.req.json<Record<string, unknown>>();
  const id = crypto.randomUUID();
  const row = {
    id,
    user_id: user.id,
    is_public: body.is_public ? 1 : 0,
    image_url: String(body.image_url || ''),
    aesthetic: (body.aesthetic as string) ?? null,
    typography: (body.typography as string) ?? null,
    fonts: toJson(body.fonts),
    palette: toJson(body.palette),
    design_logic: (body.design_logic as string) ?? null,
    keywords: toJson(body.keywords ?? []),
    prompt: (body.prompt as string) ?? null,
    extraction_snapshot: toJson(body.extraction_snapshot),
  };
  if (!row.image_url) return c.json({ error: 'image_url required' }, 400);

  if (row.is_public && row.aesthetic) {
    const dup = await findDuplicatePublicTitle(c.env.DB, row.aesthetic);
    if (dup) return c.json({ error: 'duplicate_title' }, 409);
  }

  await c.env.DB.prepare(
    `INSERT INTO styles (
      id, user_id, is_public, image_url, aesthetic, typography, fonts, palette,
      design_logic, keywords, prompt, extraction_snapshot, like_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`,
  )
    .bind(
      row.id,
      row.user_id,
      row.is_public,
      row.image_url,
      row.aesthetic,
      row.typography,
      row.fonts,
      row.palette,
      row.design_logic,
      row.keywords,
      row.prompt,
      row.extraction_snapshot,
    )
    .run();

  return c.json({ id }, 201);
});

styles.patch('/styles/:id', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare(
    `SELECT id, is_public, aesthetic FROM styles WHERE id = ? AND user_id = ?`,
  )
    .bind(id, user.id)
    .first<{ id: string; is_public: number; aesthetic: string | null }>();
  if (!existing) return c.json({ error: 'not found' }, 404);

  const body = await c.req.json<Record<string, unknown>>();
  const willBePublic =
    body.is_public === true || (body.is_public === undefined && existing.is_public === 1);
  const nextAesthetic =
    body.aesthetic !== undefined ? (body.aesthetic as string) : existing.aesthetic;
  if (willBePublic && nextAesthetic) {
    const dup = await findDuplicatePublicTitle(c.env.DB, nextAesthetic, id);
    if (dup) return c.json({ error: 'duplicate_title' }, 409);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  const setField = (col: string, val: unknown, json = false) => {
    if (val === undefined) return;
    fields.push(`${col} = ?`);
    values.push(json ? toJson(val) : val);
  };

  setField('is_public', body.is_public === true ? 1 : body.is_public === false ? 0 : undefined);
  setField('image_url', body.image_url);
  setField('aesthetic', body.aesthetic);
  setField('typography', body.typography);
  setField('fonts', body.fonts, true);
  setField('palette', body.palette, true);
  setField('design_logic', body.design_logic);
  setField('keywords', body.keywords, true);
  setField('prompt', body.prompt);
  setField('extraction_snapshot', body.extraction_snapshot, true);

  if (!fields.length) return c.json({ ok: true });
  values.push(id, user.id);
  await c.env.DB.prepare(
    `UPDATE styles SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
  )
    .bind(...values)
    .run();
  return c.json({ ok: true });
});

styles.delete('/styles/:id', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  const id = c.req.param('id');
  const result = await c.env.DB.prepare(
    `DELETE FROM styles WHERE id = ? AND user_id = ?`,
  )
    .bind(id, user.id)
    .run();
  if (!result.meta.changes) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});

styles.post('/styles/:id/like', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  await ensureProfile(c.env.DB, user);
  const styleId = c.req.param('id');

  const style = await c.env.DB.prepare(
    `SELECT id, is_public FROM styles WHERE id = ? AND is_public = 1`,
  )
    .bind(styleId)
    .first();
  if (!style) return c.json({ error: 'not found' }, 404);

  const existing = await c.env.DB.prepare(
    `SELECT 1 FROM style_likes WHERE style_id = ? AND user_id = ?`,
  )
    .bind(styleId, user.id)
    .first();
  if (existing) return c.json({ ok: true });

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO style_likes (style_id, user_id, created_at) VALUES (?, ?, datetime('now'))`,
    ).bind(styleId, user.id),
    c.env.DB.prepare(
      `UPDATE styles SET like_count = like_count + 1 WHERE id = ?`,
    ).bind(styleId),
  ]);
  return c.json({ ok: true });
});

styles.delete('/styles/:id/like', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  const styleId = c.req.param('id');

  const result = await c.env.DB.prepare(
    `DELETE FROM style_likes WHERE style_id = ? AND user_id = ?`,
  )
    .bind(styleId, user.id)
    .run();
  if (result.meta.changes) {
    await c.env.DB.prepare(
      `UPDATE styles SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END WHERE id = ?`,
    )
      .bind(styleId)
      .run();
  }
  return c.json({ ok: true });
});

export default styles;
