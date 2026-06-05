import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCalendarDateKey } from './useCalendarDateKey';
import {
  castDailyPaletteVote,
  fetchMySubmissionForChallengeDate,
  fetchSubmissionsForChallengeDate,
  fetchVotesForChallengeDate,
  mapSubmissionToFeedCard,
  votesRemaining,
} from '../lib/dailyOneColorApi';
import { DAILY_VOTES_PER_USER } from '../lib/dailyOneColorConstants';

export default function useDailyOneColor({ user }) {
  const dateKey = useCalendarDateKey();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [myVoteCount, setMyVoteCount] = useState(0);
  const [myVoteIds, setMyVoteIds] = useState(() => new Set());
  const [voteBusyId, setVoteBusyId] = useState(null);
  const [mySubmission, setMySubmission] = useState(null);

  const refresh = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const { rows, error } = await fetchSubmissionsForChallengeDate(null, dateKey);
      if (error) {
        setLoadError(error.message || '加载失败');
        setItems([]);
        return;
      }
      const { bySubmission, myVoteIds: voted, myVoteCount: count } =
        await fetchVotesForChallengeDate(null, dateKey, user?.id);
      setMyVoteCount(count);
      setMyVoteIds(voted);
      const feed = rows.map((row) => {
        const votes = (bySubmission[row.id] || []).length;
        return mapSubmissionToFeedCard(row, votes, voted.has(row.id));
      });
      feed.sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      setItems(feed);
      if (user?.id) {
        const { row } = await fetchMySubmissionForChallengeDate(null, dateKey, user.id);
        setMySubmission(row);
      } else {
        setMySubmission(null);
      }
    } finally {
      setLoading(false);
    }
  }, [dateKey, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remainingVotes = useMemo(() => votesRemaining(myVoteCount), [myVoteCount]);

  const castVote = useCallback(
    async (submissionId) => {
      if (!user?.id || voteBusyId) return { ok: false, error: '请先登录' };
      if (remainingVotes <= 0) return { ok: false, error: '今日 5 票已用完' };
      if (myVoteIds.has(submissionId)) return { ok: false, error: '已为该色卡投过票' };
      setVoteBusyId(submissionId);
      try {
        const { error } = await castDailyPaletteVote(null, submissionId, user.id);
        if (error) {
          const msg = error.message || String(error);
          if (msg.includes('daily_vote_quota')) {
            return { ok: false, error: '今日 5 票已用完' };
          }
          if (msg.includes('self_vote')) {
            return { ok: false, error: '不能为自己的投稿投票' };
          }
          return { ok: false, error: msg || '投票失败' };
        }
        setMyVoteCount((n) => n + 1);
        setMyVoteIds((prev) => new Set([...prev, submissionId]));
        setItems((prev) =>
          prev
            .map((it) =>
              it.id === submissionId
                ? { ...it, voteCount: it.voteCount + 1, votedByMe: true }
                : it,
            )
            .sort((a, b) => {
              if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
              return new Date(a.createdAt) - new Date(b.createdAt);
            }),
        );
        return { ok: true };
      } finally {
        setVoteBusyId(null);
      }
    },
    [user?.id, voteBusyId, remainingVotes, myVoteIds],
  );

  return {
    dateKey,
    items,
    loading,
    loadError,
    remainingVotes,
    votesPerDay: DAILY_VOTES_PER_USER,
    mySubmission,
    voteBusyId,
    castVote,
    refresh,
  };
}
