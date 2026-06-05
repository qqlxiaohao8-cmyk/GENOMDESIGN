import type { D1Database } from '@cloudflare/workers-types';
import { parseJson, toJson } from './json';

const WINNER_TAG = '每日色卡';

export async function tallyDailyWinners(db: D1Database, challengeDate: string) {
  const existing = await db
    .prepare('SELECT challenge_date FROM daily_palette_tallies WHERE challenge_date = ?')
    .bind(challengeDate)
    .first();
  if (existing) return { ok: true, skipped: true, winners: [], count: 0 };

  const ranked = await db
    .prepare(
      `SELECT s.id, s.style_id, s.user_id, s.created_at,
              COUNT(v.id) AS vote_count
       FROM daily_palette_submissions s
       LEFT JOIN daily_palette_votes v ON v.submission_id = s.id
       WHERE s.challenge_date = ?
       GROUP BY s.id, s.style_id, s.user_id, s.created_at
       HAVING vote_count > 0
       ORDER BY vote_count DESC, s.created_at ASC
       LIMIT 3`,
    )
    .bind(challengeDate)
    .all<{ id: string; style_id: string; vote_count: number }>();

  const winners: string[] = [];
  let rank = 0;

  for (const row of ranked.results || []) {
    rank += 1;
    winners.push(row.id);

    await db
      .prepare('UPDATE daily_palette_submissions SET winner_rank = ? WHERE id = ?')
      .bind(rank, row.id)
      .run();

    const style = await db
      .prepare('SELECT keywords, extraction_snapshot FROM styles WHERE id = ?')
      .bind(row.style_id)
      .first<{ keywords: string | null; extraction_snapshot: string | null }>();
    if (!style) continue;

    const keywords = parseJson<string[]>(style.keywords, []);
    if (!keywords.includes(WINNER_TAG)) keywords.push(WINNER_TAG);

    const snap = parseJson<Record<string, unknown>>(style.extraction_snapshot, {});
    Object.assign(snap, {
      dailyWinner: true,
      dailyWinnerDate: challengeDate,
      dailyWinnerRank: rank,
    });

    await db
      .prepare(
        `UPDATE styles SET is_public = 1, keywords = ?, extraction_snapshot = ? WHERE id = ?`,
      )
      .bind(toJson(keywords), toJson(snap), row.style_id)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO daily_palette_tallies (challenge_date, winner_submission_ids, tallied_at)
       VALUES (?, ?, datetime('now'))`,
    )
    .bind(challengeDate, toJson(winners))
    .run();

  return { ok: true, skipped: false, winners, count: rank };
}

export function yesterdayDateKey(todayKey: string) {
  const [y, m, d] = todayKey.split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
