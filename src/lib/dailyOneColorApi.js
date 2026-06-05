import { apiFetch, ApiError } from './apiClient';
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

export async function fetchSubmissionsForChallengeDate(_legacy, dateKey) {
  try {
    const { data } = await apiFetch(
      `/daily-one-color/submissions?date=${encodeURIComponent(dateKey)}`,
    );
    return { rows: Array.isArray(data) ? data : [], error: null };
  } catch (e) {
    return { rows: [], error: e };
  }
}

export async function fetchVotesForChallengeDate(_legacy, dateKey, voterUserId = null) {
  try {
    const { data } = await apiFetch(
      `/daily-one-color/votes?date=${encodeURIComponent(dateKey)}`,
    );
    const bySubmission = data && typeof data === 'object' ? data : {};
    const myVoteIds = new Set();
    let myVoteCount = 0;
    const voterId = voterUserId || null;
    for (const [sid, voters] of Object.entries(bySubmission)) {
      for (const vid of voters || []) {
        if (voterId && vid === voterId) {
          myVoteIds.add(sid);
          myVoteCount += 1;
        }
      }
    }
    return { bySubmission, myVoteIds, myVoteCount, error: null };
  } catch (e) {
    return { bySubmission: {}, myVoteIds: new Set(), myVoteCount: 0, error: e };
  }
}

export async function fetchMySubmissionForChallengeDate(_legacy, dateKey, userId) {
  if (!userId) return { row: null, error: null };
  try {
    const { data } = await apiFetch(
      `/daily-one-color/my-submission?date=${encodeURIComponent(dateKey)}`,
    );
    return { row: data || null, error: null };
  } catch (e) {
    return { row: null, error: e };
  }
}

export async function insertDailyPaletteSubmission(_legacy, row) {
  try {
    const { id } = await apiFetch('/daily-one-color/submissions', {
      method: 'POST',
      body: {
        challengeDate: row.challengeDate,
        styleId: row.styleId,
        title: row.title,
        palette: row.palette,
        imageUrl: row.imageUrl,
        tags: row.tags || [],
        dailyAnchorHex: row.dailyAnchorHex || null,
      },
    });
    return { id: id ?? null, error: null };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 409 || e.code === 'one_per_user_per_day')) {
      return { id: null, error: new Error('one_per_user_per_day') };
    }
    return { id: null, error: e };
  }
}

export async function castDailyPaletteVote(_legacy, submissionId, _voterUserId) {
  try {
    await apiFetch('/daily-one-color/votes', {
      method: 'POST',
      body: { submissionId },
    });
    return { error: null };
  } catch (e) {
    return { error: e };
  }
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
