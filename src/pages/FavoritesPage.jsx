import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import MasonryColumns from '../components/MasonryColumns';
import PaletteFeedCard, { formatLikeCount } from '../components/PaletteFeedCard';
import ColorWalkFlowOverlay from '../components/ColorWalkFlowOverlay';
import ColorMemoryGame from '../components/ColorMemoryGame';
import { itemColorCardData } from '../components/StyleUiPreviewCard';
import { FAVORITES_MASONRY_CLASS, PALETTE_FEED_MASONRY_GAP } from '../lib/paletteFeedLayout';
import { dateFromDailyPaletteKey, getTodayColor } from '../lib/dailyPalette';
import { useCalendarDateKey } from '../hooks/useCalendarDateKey';
import useDailyOneColor from '../hooks/useDailyOneColor';
import {
  addChallengeDays,
  challengeDateKey,
  fetchSubmissionsForChallengeDate,
  fetchVotesForChallengeDate,
  mapSubmissionToFeedCard,
} from '../lib/dailyOneColorApi';
import { DAILY_VOTES_PER_USER } from '../lib/dailyOneColorConstants';
import { getHomeActivityCards } from '../lib/homeActivities';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { buildLocalSeaPreviewItems } from '../lib/localSeaPreview';
import { IconMemory, IconWalk } from '../components/icons/HeyteaIcons';
import ColorSeaStripes from '../components/ColorSeaStripes';

export const PREVIEW_USER = {
  id: 'preview',
  email: 'preview@sekong.app',
  user_metadata: { username: '空山', accent_hex: '#B08968' },
};

const PREVIEW_NAMES = ['晚茶', '青瓦', '疏影', '未央'];
const PREVIEW_COUNTS = [12, 7, 4, 2];

const PREVIEW_WINNER = (() => {
  const sample = buildLocalSeaPreviewItems()[0];
  const colors = sample.extractionSnapshot?.colorCardData?.colors || [];
  return {
    title: sample.aesthetic || '昨日赢家',
    colors,
    username: '晚茶',
    voteCount: 12,
  };
})();

const PREVIEW_VOTES = buildLocalSeaPreviewItems().slice(0, 4).map((item, i) => {
  const colors = item.extractionSnapshot?.colorCardData?.colors || [];
  return {
    id: `preview-vote-${i}`,
    title: item.aesthetic || '色卡',
    colors,
    voteCount: PREVIEW_COUNTS[i] || 1,
    votedByMe: false,
    username: PREVIEW_NAMES[i] || '匿名',
    ownerUserId: 'preview-other',
  };
});

function ProfileColorHero({ hex, username, onEdit }) {
  const text = pickReadableTextOnHex(hex);
  return (
    <button
      type="button"
      onClick={onEdit}
      className="mine-round relative mb-8 block w-full overflow-hidden text-left"
      style={{ backgroundColor: hex, minHeight: '8.5rem' }}
      aria-label="编辑个人颜色"
      data-mine-hero
    >
      <span
        className="absolute left-5 top-5 font-heytea text-[13px] tracking-[0.12em] opacity-70"
        style={{ color: text }}
      >
        我的
      </span>
      <span
        className="absolute bottom-5 left-5 font-heytea text-[2rem] leading-none tracking-[0.03em]"
        style={{ color: text }}
      >
        {username}
      </span>
    </button>
  );
}

function SectionHead({ label, aside }) {
  return (
    <div className="mine-section-head">
      <p className="mine-section-label">{label}</p>
      {aside ? <div className="mine-section-aside">{aside}</div> : null}
    </div>
  );
}

function TodayBlock({ today, onPlay }) {
  return (
    <section className="mine-section">
      <SectionHead label="今日" />
      <button
        type="button"
        onClick={onPlay}
        className="mine-round mine-today"
      >
        <div className="mine-today-wash" style={{ backgroundColor: today.hex }} />
        <div className="mine-today-copy">
          <p className="font-heytea text-[1.25rem] leading-none tracking-[0.02em]">
            {today.name}
          </p>
          <p className="type-caption">参加</p>
        </div>
      </button>
    </section>
  );
}

function VoteRow({ item, voted, busy, disabled, onVote }) {
  return (
    <div className="mine-round mine-vote-row">
      <div className="mine-vote-stripes">
        <ColorSeaStripes
          colors={item.colors || []}
          className="!h-14 !min-h-14 !max-h-14"
          hexCopyScope={`mine-vote-${item.id}`}
        />
      </div>
      <div className="mine-vote-meta">
        <p className="truncate font-heytea text-[1.02rem] leading-snug tracking-[0.02em]">
          {item.title || '色卡'}
        </p>
        <p className="type-caption mt-0.5 truncate">
          {item.username || '匿名'}
        </p>
      </div>
      <button
        type="button"
        onClick={onVote}
        disabled={busy || disabled || voted}
        className={`mine-vote-btn ${voted ? 'is-voted' : ''}`}
        aria-label={voted ? '已投票' : '投票'}
      >
        <span>{voted ? '已投' : '投票'}</span>
        <span className="tabular-nums opacity-60">{formatLikeCount(item.voteCount)}</span>
      </button>
    </div>
  );
}

function VoteSection({
  items,
  remaining,
  loading,
  winner,
  hasMore,
  onVote,
  onOpenPool,
  voteBusyId,
  voteDisabledFor,
}) {
  return (
    <section className="mine-section">
      <SectionHead
        label="投票"
        aside={(
          <span className="tabular-nums">
            余 {remaining}
          </span>
        )}
      />

      {loading && items.length === 0 ? (
        <p className="type-caption px-0.5 py-6">正在取今日色卡</p>
      ) : items.length === 0 ? (
        <p className="type-caption px-0.5 py-6">今日还没有投稿</p>
      ) : (
        <div className="mine-vote-list">
          {items.map((item) => (
            <VoteRow
              key={item.id}
              item={item}
              voted={item.votedByMe}
              busy={voteBusyId === item.id}
              disabled={voteDisabledFor?.(item)}
              onVote={() => onVote(item)}
            />
          ))}
        </div>
      )}

      {hasMore ? (
        <button type="button" onClick={onOpenPool} className="mine-more">
          全部
        </button>
      ) : null}

      {winner?.colors?.length ? (
        <div className="mine-round mine-yesterday">
          <ColorSeaStripes
            colors={winner.colors}
            className="!h-[4.5rem] !min-h-[4.5rem] !max-h-[4.5rem]"
            hexCopyScope="yesterday-winner"
          />
          <button
            type="button"
            onClick={onOpenPool}
            className="mine-yesterday-copy"
          >
            <p className="truncate font-heytea text-[1.02rem] leading-snug tracking-[0.02em]">
              {winner.title || '昨日赢家'}
            </p>
            <p className="type-caption mt-0.5 truncate">
              {winner.username ? `${winner.username} · 昨日` : '昨日'}
              {winner.voteCount != null ? ` · ${winner.voteCount}` : ''}
            </p>
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ActivityGrid({ cards, onOpen }) {
  return (
    <section className="mine-section">
      <SectionHead label="活动" />
      <div className="mine-activity-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onOpen(card)}
            className="mine-round heytea-activity-card mine-activity-card"
          >
            <div className="mb-3 flex h-10 items-end justify-between">
              <span className="h-9 w-7" style={{ backgroundColor: card.wash }} />
              {card.kind === 'memory' ? <IconMemory /> : null}
              {card.kind === 'walk' ? <IconWalk /> : null}
            </div>
            <p className="font-heytea text-[1.05rem] leading-snug tracking-[0.02em]">{card.title}</p>
            <p className="mt-1 text-[11px] text-zen-stone">{card.hint}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * 我的：身份、今日参加、投票、活动、收藏
 */
export default function FavoritesPage({
  user,
  authReady,
  vaultColorPaletteItems = [],
  onOpenAuth,
  onDeleteItem,
  onOpenInShengSe,
  onDownload,
  onCopyLink,
  onAnalyzePalette,
  onStartChallenge,
  onOpenDailyPool,
  onEditProfile,
}) {
  const dateKey = useCalendarDateKey();
  const today = useMemo(
    () => getTodayColor(dateFromDailyPaletteKey(dateKey)),
    [dateKey],
  );
  const activityCards = useMemo(() => getHomeActivityCards(), []);
  const [winner, setWinner] = useState(PREVIEW_WINNER);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memorySession, setMemorySession] = useState(0);
  const [walkOpen, setWalkOpen] = useState(false);

  const profile = user || PREVIEW_USER;
  const isPreview = !user;
  const username = profile?.user_metadata?.username
    || profile?.email?.split('@')[0]
    || '用户';
  const accentHex = profile?.user_metadata?.accent_hex || '#C93756';
  const previewVault = useMemo(() => buildLocalSeaPreviewItems().slice(0, 4), []);
  const shownVault = isPreview && vaultColorPaletteItems.length === 0
    ? previewVault
    : vaultColorPaletteItems;

  const vote = useDailyOneColor({ user });
  const liveVotes = vote.items;
  const voteItems = liveVotes.length > 0
    ? liveVotes.slice(0, 4)
    : (isPreview ? PREVIEW_VOTES : []);
  const remaining = user ? vote.remainingVotes : DAILY_VOTES_PER_USER;
  const hasMoreVotes = liveVotes.length > 4;

  useEffect(() => {
    let cancelled = false;
    const yesterdayKey = addChallengeDays(challengeDateKey(), -1);
    (async () => {
      const { rows } = await fetchSubmissionsForChallengeDate(null, yesterdayKey);
      const { bySubmission } = await fetchVotesForChallengeDate(null, yesterdayKey);
      if (cancelled || !rows.length) {
        if (!cancelled) setWinner(PREVIEW_WINNER);
        return;
      }
      const scored = rows.map((row) =>
        mapSubmissionToFeedCard(row, (bySubmission[row.id] || []).length),
      );
      scored.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
      const top = scored[0];
      if (!top) {
        setWinner(PREVIEW_WINNER);
        return;
      }
      setWinner({
        title: top.title || '昨日赢家',
        colors: top.colors || [],
        username: top.username || '匿名',
        voteCount: top.voteCount || 0,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!memoryOpen && !walkOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [memoryOpen, walkOpen]);

  const handleVote = async (item) => {
    if (!user) {
      onOpenAuth?.();
      return;
    }
    if (item.ownerUserId === user.id) return;
    await vote.castVote(item.id);
  };

  if (!authReady) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border border-zen-ink/20 border-t-zen-ink/60" />
      </div>
    );
  }

  return (
    <div className="mine-page px-4 pb-8 pt-4 md:px-6 md:pt-6">
      <ProfileColorHero
        hex={accentHex}
        username={username}
        onEdit={isPreview ? onOpenAuth : onEditProfile}
      />

      <TodayBlock
        today={today}
        onPlay={() => onStartChallenge?.(today)}
      />

      <VoteSection
        items={voteItems}
        remaining={remaining}
        loading={vote.loading && !isPreview}
        winner={winner}
        hasMore={hasMoreVotes}
        onVote={handleVote}
        onOpenPool={() => onOpenDailyPool?.()}
        voteBusyId={vote.voteBusyId}
        voteDisabledFor={(item) =>
          Boolean(user && (item.ownerUserId === user.id || (vote.remainingVotes <= 0 && !item.votedByMe)))
        }
      />

      <ActivityGrid
        cards={activityCards}
        onOpen={(card) => {
          if (card.kind === 'memory') {
            setMemorySession((n) => n + 1);
            setMemoryOpen(true);
            return;
          }
          if (card.kind === 'walk') {
            setWalkOpen(true);
          }
        }}
      />

      <section className="mine-section mine-section--last">
        <SectionHead label="收藏" />
        {shownVault.length === 0 ? (
          <p className="type-caption px-0.5">还没有收下颜色</p>
        ) : (
          <MasonryColumns className={`${FAVORITES_MASONRY_CLASS} zen-feed-scrap`} gap={PALETTE_FEED_MASONRY_GAP}>
            {shownVault.map((item) => {
              const cd = itemColorCardData(item);
              if (!cd) return null;
              return (
                <PaletteFeedCard
                  key={item.id}
                  cardId={item.id}
                  colors={cd.colors}
                  title={item.aesthetic || cd.overview || ''}
                  mode="favorites"
                  onUnfavorite={() => onDeleteItem?.(item.id)}
                  onAnalyze={() => onAnalyzePalette?.(item)}
                  onOpenInShengSe={() => onOpenInShengSe?.(cd.colors, item)}
                  onDownload={() => onDownload?.(cd.colors, item.aesthetic)}
                  onCopyLink={() => onCopyLink?.(item.id)}
                />
              );
            })}
          </MasonryColumns>
        )}
      </section>

      {memoryOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col" role="dialog" aria-modal="true" aria-label="色彩记忆">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" aria-hidden />
          <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
            <div className="mb-3 flex w-full max-w-md justify-end">
              <button
                type="button"
                onClick={() => setMemoryOpen(false)}
                className="flex h-10 w-10 items-center justify-center text-white"
                aria-label="关闭游戏"
              >
                <X size={18} strokeWidth={1.6} />
              </button>
            </div>
            <div className="flex min-h-0 w-full max-w-md flex-1 flex-col">
              <ColorMemoryGame key={memorySession} mobileFill />
            </div>
          </div>
        </div>
      )}

      <ColorWalkFlowOverlay
        open={walkOpen}
        onClose={() => setWalkOpen(false)}
        user={user}
        onOpenAuth={onOpenAuth}
        initialPhase="spin"
      />
    </div>
  );
}
