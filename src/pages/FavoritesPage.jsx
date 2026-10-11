import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import MasonryColumns from '../components/MasonryColumns';
import PaletteFeedCard from '../components/PaletteFeedCard';
import ColorWalkFlowOverlay from '../components/ColorWalkFlowOverlay';
import ColorMemoryGame from '../components/ColorMemoryGame';
import { itemColorCardData } from '../components/StyleUiPreviewCard';
import { FAVORITES_MASONRY_CLASS, PALETTE_FEED_MASONRY_GAP } from '../lib/paletteFeedLayout';
import { dateFromDailyPaletteKey, getTodayColor } from '../lib/dailyPalette';
import { useCalendarDateKey } from '../hooks/useCalendarDateKey';
import {
  addChallengeDays,
  challengeDateKey,
  fetchSubmissionsForChallengeDate,
  fetchVotesForChallengeDate,
  mapSubmissionToFeedCard,
} from '../lib/dailyOneColorApi';
import { getHomeActivityCards } from '../lib/homeActivities';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { buildLocalSeaPreviewItems } from '../lib/localSeaPreview';
import { IconMemory, IconWalk } from '../components/icons/HeyteaIcons';
import ColorSeaStripes from '../components/ColorSeaStripes';

const PREVIEW_USER = {
  id: 'preview',
  email: 'preview@sekong.app',
  user_metadata: { username: '空山', accent_hex: '#B08968' },
};

const PREVIEW_WINNER = (() => {
  const sample = buildLocalSeaPreviewItems()[0];
  const colors = sample.extractionSnapshot?.colorCardData?.colors || [];
  return {
    title: sample.aesthetic || '昨日赢家',
    colors,
    username: '晚茶',
  };
})();

function ProfileColorHero({ hex, username, onEdit }) {
  const text = pickReadableTextOnHex(hex);
  return (
    <button
      type="button"
      onClick={onEdit}
      className="mine-round relative mb-6 block w-full overflow-hidden text-left"
      style={{ backgroundColor: hex, minHeight: '8.5rem' }}
      aria-label="编辑个人颜色"
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

function DailyColorNudge({ today, winner, onPlay, onVote }) {
  return (
    <section className="mb-8 px-1">
      <p className="type-h4 text-zen-stone">每日颜色</p>

      <button
        type="button"
        onClick={onPlay}
        className="mt-4 block w-full text-left"
      >
        <div
          className="mine-round h-28 w-full"
          style={{ backgroundColor: today.hex }}
        />
        <p className="mt-2.5 font-heytea text-[1.15rem] leading-snug tracking-[0.02em]">
          {today.name}
        </p>
        <p className="type-caption mt-1">今日 · 点击参加</p>
      </button>

      <button
        type="button"
        onClick={onVote}
        className="mt-6 block w-full text-left"
      >
        <div className="mine-round overflow-hidden">
          <ColorSeaStripes
            colors={winner?.colors || []}
            className="!h-28 !min-h-[7rem] !max-h-28"
            hexCopyScope="yesterday-winner"
          />
        </div>
        <p className="mt-2.5 font-heytea text-[1.15rem] leading-snug tracking-[0.02em]">
          {winner?.title || '昨日赢家'}
        </p>
        <p className="type-caption mt-1">
          {winner?.username ? `${winner.username} · 昨日赢家` : '昨日赢家'}
        </p>
      </button>
    </section>
  );
}

function ActivityRail({ cards, onOpen }) {
  return (
    <section className="mb-8">
      <p className="type-h4 mb-3 px-1 text-zen-stone">可以参加</p>
      <div className="heytea-activity-rail px-1">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onOpen(card)}
            className="heytea-activity-card"
          >
            <div className="mb-3 flex h-12 items-end justify-between">
              <span className="h-10 w-8" style={{ backgroundColor: card.wash }} />
              {card.kind === 'memory' ? <IconMemory /> : null}
              {card.kind === 'walk' ? <IconWalk /> : null}
            </div>
            <p className="font-heytea text-[1.15rem] leading-snug tracking-[0.02em]">{card.title}</p>
            <p className="mt-1 text-[11px] text-zen-stone">{card.hint}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * 我的：个人颜色 + 每日色 + 活动 + 收藏色卡
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

      <div>
        <DailyColorNudge
          today={today}
          winner={winner}
          onPlay={() => (isPreview ? onOpenAuth?.() : onStartChallenge?.(today))}
          onVote={() => (isPreview ? onOpenAuth?.() : onOpenDailyPool?.())}
        />

        <ActivityRail
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

        <p className="mb-3 px-1 font-heytea text-[13px] text-zen-stone">收藏的色卡</p>
        {shownVault.length === 0 ? (
          <p className="px-1 font-heytea text-zen-ink/50">还没有收下颜色</p>
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
      </div>

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
