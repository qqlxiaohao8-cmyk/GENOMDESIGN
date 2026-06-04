import { formatDailyPaletteDateKey } from './dailyPalette';
import { DAILY_VOTES_PER_USER } from './dailyOneColorConstants';

export function challengeDateKey(d = new Date()) {
  return formatDailyPaletteDateKey(d);
}

export function addChallengeDays(dateKey, delta) {
  const [y, m, day] = String(dateKey).split('-').map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, day + delta);
  return formatDailyPaletteDateKey(dt);
}

export async function tallyDailyWinnersForDate(supabase, dateKey) {
  if (!supabase || !dateKey) return { ok: false, error: new Error('missing supabase or date') };
  const { data, error } = await supabase.rpc('tally_daily_one_color_winners', {
    p_challenge_date: dateKey,
  });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

/** 应用启动时结算「昨日」Top3（幂等） */
export async function runPendingDailyTallies(supabase) {
  if (!supabase) return;
  const today = challengeDateKey(new Date());
  const yesterday = addChallengeDays(today, -1);
  await tallyDailyWinnersForDate(supabase, yesterday);
}

export async function fetchSubmissionsForChallengeDate(supabase, dateKey) {
  const { data, error } = await supabase
    .from('daily_palette_submissions')
    .select(
      'id, challenge_date, user_id, style_id, title, palette, image_url, tags, daily_anchor_hex, winner_rank, created_at',
    )
    .eq('challenge_date', dateKey)
    .order('created_at', { ascending: true });
  return { rows: Array.isArray(data) ? data : [], error };
}

export async function fetchVotesForChallengeDate(supabase, dateKey, voterUserId = null) {
  const { data, error } = await supabase
    .from('daily_palette_votes')
    .select('submission_id, voter_user_id')
    .eq('challenge_date', dateKey);
  if (error) return { bySubmission: {}, myVoteIds: new Set(), myVoteCount: 0, error };
  const bySubmission = {};
  const myVoteIds = new Set();
  let myVoteCount = 0;
  const voterId = voterUserId || null;
  for (const row of data || []) {
    const sid = row.submission_id;
    if (!bySubmission[sid]) bySubmission[sid] = [];
    bySubmission[sid].push(row.voter_user_id);
    if (voterId && row.voter_user_id === voterId) {
      myVoteIds.add(sid);
      myVoteCount += 1;
    }
  }
  return { bySubmission, myVoteIds, myVoteCount, error: null };
}

export async function fetchMySubmissionForChallengeDate(supabase, dateKey, userId) {
  if (!userId) return { row: null, error: null };
  const { data, error } = await supabase
    .from('daily_palette_submissions')
    .select('id, challenge_date, user_id, style_id, title, palette, created_at')
    .eq('challenge_date', dateKey)
    .eq('user_id', userId)
    .maybeSingle();
  return { row: data || null, error };
}

export async function insertDailyPaletteSubmission(supabase, row) {
  const { data, error } = await supabase
    .from('daily_palette_submissions')
    .insert({
      challenge_date: row.challengeDate,
      user_id: row.userId,
      style_id: row.styleId,
      title: row.title,
      palette: row.palette,
      image_url: row.imageUrl,
      tags: row.tags || [],
      daily_anchor_hex: row.dailyAnchorHex || null,
    })
    .select('id')
    .single();
  return { id: data?.id ?? null, error };
}

export async function castDailyPaletteVote(supabase, submissionId, voterUserId) {
  const { error } = await supabase.from('daily_palette_votes').insert({
    submission_id: submissionId,
    voter_user_id: voterUserId,
  });
  return { error };
}

export function votesRemaining(myVoteCount) {
  return Math.max(0, DAILY_VOTES_PER_USER - (Number(myVoteCount) || 0));
}

export function mapSubmissionToFeedCard(row, voteCount = 0, votedByMe = false) {
  const palette = Array.isArray(row.palette) ? row.palette : [];
  const colors = palette.map((h) =>
    typeof h === 'string' ? { hex: h } : { hex: h?.hex || '#888888' },
  );
  return {
    id: row.id,
    styleId: row.style_id,
    title: row.title,
    colors,
    voteCount,
    votedByMe,
    winnerRank: row.winner_rank,
    ownerUserId: row.user_id,
    createdAt: row.created_at,
  };
}
