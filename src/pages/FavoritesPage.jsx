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
import { getPoeticColorName } from '../lib/poeticColorNaming';
import { IconMemory, IconWalk } from '../components/icons/HeyteaIcons';

function ProfileColorHero({ hex, username, onEdit }) {
  const text = pickReadableTextOnHex(hex);
  return (
    <button
      type="button"
      onClick={onEdit}
      className="relative mb-6 block w-full overflow-hidden text-left"
      style={{ backgroundColor: hex, minHeight: '8.5rem' }}
      aria-label="编辑个人颜色"
    >
      <span
        className="absolute left-5 top-5 font-heytea text-[11px] tracking-[0.16em] opacity-70"
        style={{ color: text }}
      >
        我的
      </span>
      <span
        className="absolute bottom-5 left-5 font-heytea text-[1.7rem] tracking-[0.06em]"
        style={{ color: text }}
      >
        {username}
      </span>
    </button>
  );
}

function DailyColorNudge({ today, yesterday, winnerTitle, onPlay, onVote }) {
  return (
    <section className="mb-7 px-1">
      <p className="font-heytea text-[13px] text-zen-stone">今日颜色</p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onVote}
          className="min-w-0 flex-1 text-left"
        >
          <div className="h-14 w-full" style={{ backgroundColor: yesterday.hex }} />
          <p className="mt-2 font-heytea text-[14px]">{winnerTitle || yesterday.name}</p>
          <p className="type-caption mt-0.5">昨日</p>
        </button>
        <button
          type="button"
          onClick={onPlay}
          className="min-w-0 flex-1 text-left"
        >
          <div className="h-14 w-full" style={{ backgroundColor: today.hex }} />
          <p className="mt-2 font-heytea text-[14px]">{today.name}</p>
          <p className="type-caption mt-0.5">今日</p>
        </button>
      </div>
      <button type="button" onClick={onPlay} className="zen-action mt-3">
        参加今日设计
      </button>
    </section>
  );
}

function ActivityRail({ cards, onOpen }) {
  return (
    <section className="mb-8">
      <p className="mb-3 px-1 font-heytea text-[13px] text-zen-stone">可以参加</p>
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
            <p className="font-heytea text-[16px]">{card.title}</p>
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
  const yesterday = useMemo(
    () => getTodayColor(dateFromDailyPaletteKey(addChallengeDays(dateKey, -1))),
    [dateKey],
  );
  const activityCards = useMemo(() => getHomeActivityCards(), []);
  const [winnerTitle, setWinnerTitle] = useState('');
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memorySession, setMemorySession] = useState(0);
  const [walkOpen, setWalkOpen] = useState(false);

  const username = user?.user_metadata?.username
    || user?.email?.split('@')[0]
    || '用户';
  const accentHex = user?.user_metadata?.accent_hex || '#C93756';

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    const yesterdayKey = addChallengeDays(challengeDateKey(), -1);
    (async () => {
      const { rows } = await fetchSubmissionsForChallengeDate(null, yesterdayKey);
      const { bySubmission } = await fetchVotesForChallengeDate(null, yesterdayKey);
      if (cancelled || !rows.length) return;
      const scored = rows.map((row) =>
        mapSubmissionToFeedCard(row, (bySubmission[row.id] || []).length),
      );
      scored.sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
      if (scored[0]?.title) setWinnerTitle(scored[0].title);
    })();
    return () => { cancelled = true; };
  }, [user]);

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

  if (!user) {
    return (
      <div className="px-5 pt-10">
        <h2 className="type-h2">登录后这里是你的颜色</h2>
        <button type="button" className="zen-action mt-5" onClick={onOpenAuth}>
          登录
        </button>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <ProfileColorHero
        hex={accentHex}
        username={username}
        onEdit={onEditProfile}
      />

      <div className="px-4 md:px-6">
        <DailyColorNudge
          today={today}
          yesterday={yesterday}
          winnerTitle={winnerTitle}
          onPlay={() => onStartChallenge?.(today)}
          onVote={() => onOpenDailyPool?.()}
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
        {vaultColorPaletteItems.length === 0 ? (
          <p className="px-1 font-heytea text-zen-ink/50">还没有收下颜色</p>
        ) : (
          <MasonryColumns className={`${FAVORITES_MASONRY_CLASS} zen-feed-scrap`} gap={PALETTE_FEED_MASONRY_GAP}>
            {vaultColorPaletteItems.map((item) => {
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
