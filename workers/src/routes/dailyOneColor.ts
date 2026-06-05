import { Hono } from 'hono';
import type { WorkerEnv } from '../auth';
import { parseJson, toJson } from '../lib/json';
import { ensureProfile } from '../lib/profiles';
import { tallyDailyWinners, yesterdayDateKey } from '../lib/tally';
import { requireUser } from '../middleware/session';

const DAILY_VOTES_PER_USER = 5;

type Env = WorkerEnv;

const daily = new Hono<{ Bindings: Env }>();

function formatSubmission(row: Record<string, unknown>) {
  return {
    id: row.id,
    challenge_date: row.challenge_date,
    user_id: row.user_id,
    style_id: row.style_id,
    title: row.title,
    palette: parseJson(row.palette as string, []),
    image_url: row.image_url,
    tags: parseJson(row.tags as string, []),
    daily_anchor_hex: row.daily_anchor_hex,
    winner_rank: row.winner_rank,
    created_at: row.created_at,
  };
}

daily.get('/daily-one-color/submissions', async (c) => {
  const date = c.req.query('date');
  if (!date) return c.json({ error: 'date required' }, 400);
  const { results } = await c.env.DB.prepare(
    `SELECT id, challenge_date, user_id, style_id, title, palette, image_url, tags,
            daily_anchor_hex, winner_rank, created_at
     FROM daily_palette_submissions
     WHERE challenge_date = ?
     ORDER BY created_at ASC`,
  )
    .bind(date)
    .all();
  return c.json({ data: (results || []).map(formatSubmission) });
});

daily.get('/daily-one-color/votes', async (c) => {
  const date = c.req.query('date');
  if (!date) return c.json({ error: 'date required' }, 400);
  const { results } = await c.env.DB.prepare(
    `SELECT submission_id, voter_user_id FROM daily_palette_votes WHERE challenge_date = ?`,
  )
    .bind(date)
    .all<{ submission_id: string; voter_user_id: string }>();

  const bySubmission: Record<string, string[]> = {};
  for (const row of results || []) {
    if (!bySubmission[row.submission_id]) bySubmission[row.submission_id] = [];
    bySubmission[row.submission_id].push(row.voter_user_id);
  }
  return c.json({ data: bySubmission });
});

daily.get('/daily-one-color/my-submission', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  const date = c.req.query('date');
  if (!date) return c.json({ error: 'date required' }, 400);
  const row = await c.env.DB.prepare(
    `SELECT id, challenge_date, user_id, style_id, title, palette, created_at
     FROM daily_palette_submissions WHERE challenge_date = ? AND user_id = ?`,
  )
    .bind(date, user.id)
    .first();
  return c.json({
    data: row
      ? {
          ...row,
          palette: parseJson(row.palette as string, []),
        }
      : null,
  });
});

daily.post('/daily-one-color/submissions', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  await ensureProfile(c.env.DB, user);

  const body = await c.req.json<{
    challengeDate: string;
    styleId: string;
    title: string;
    palette: unknown;
    imageUrl: string;
    tags?: unknown;
    dailyAnchorHex?: string | null;
  }>();

  const existing = await c.env.DB.prepare(
    `SELECT id FROM daily_palette_submissions WHERE challenge_date = ? AND user_id = ?`,
  )
    .bind(body.challengeDate, user.id)
    .first();
  if (existing) return c.json({ error: 'one_per_user_per_day' }, 409);

  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      `INSERT INTO daily_palette_submissions (
        id, challenge_date, user_id, style_id, title, palette, image_url, tags,
        daily_anchor_hex, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        id,
        body.challengeDate,
        user.id,
        body.styleId,
        body.title,
        toJson(body.palette),
        body.imageUrl,
        toJson(body.tags ?? []),
        body.dailyAnchorHex ?? null,
      )
      .run();
  } catch (e) {
    return c.json({ error: 'insert_failed', message: String(e) }, 400);
  }
  return c.json({ id }, 201);
});

daily.post('/daily-one-color/votes', async (c) => {
  const user = await requireUser(c);
  if (user instanceof Response) return user;
  await ensureProfile(c.env.DB, user);

  const body = await c.req.json<{ submissionId: string }>();
  if (!body.submissionId) return c.json({ error: 'submissionId required' }, 400);

  const submission = await c.env.DB.prepare(
    `SELECT id, user_id, challenge_date FROM daily_palette_submissions WHERE id = ?`,
  )
    .bind(body.submissionId)
    .first<{ id: string; user_id: string; challenge_date: string }>();
  if (!submission) return c.json({ error: 'not found' }, 404);
  if (submission.user_id === user.id) {
    return c.json({ error: 'self_vote_not_allowed' }, 400);
  }

  const dup = await c.env.DB.prepare(
    `SELECT 1 FROM daily_palette_votes WHERE submission_id = ? AND voter_user_id = ?`,
  )
    .bind(body.submissionId, user.id)
    .first();
  if (dup) return c.json({ ok: true });

  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM daily_palette_votes
     WHERE voter_user_id = ? AND challenge_date = ?`,
  )
    .bind(user.id, submission.challenge_date)
    .first<{ n: number }>();
  if ((countRow?.n ?? 0) >= DAILY_VOTES_PER_USER) {
    return c.json({ error: 'daily_vote_quota_exceeded' }, 400);
  }

  const voteId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO daily_palette_votes (id, submission_id, voter_user_id, challenge_date, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  )
    .bind(voteId, body.submissionId, user.id, submission.challenge_date)
    .run();

  return c.json({ ok: true });
});

daily.post('/daily-one-color/tally-yesterday', async (c) => {
  const today = c.req.query('today');
  if (!today) return c.json({ error: 'today required' }, 400);
  const yesterday = yesterdayDateKey(today);
  const result = await tallyDailyWinners(c.env.DB, yesterday);
  return c.json(result);
});

export default daily;
