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
import { getHomeActivityCards } from '../lib/homeActivities';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { buildLocalSeaPreviewItems } from '../lib/localSeaPreview';
import { IconMemory, IconWalk } from '../components/icons/HeyteaIcons';

export const PREVIEW_USER = {
  id: 'preview',
  email: 'preview@sekong.app',
  user_metadata: { username: '空山', accent_hex: '#B08968' },
};

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
        className="absolute left-5 top-5 font-heytea text-[1.05rem] tracking-[0.08em] opacity-80"
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

function TodayBlock({ today, onPlay, onVote }) {
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
          <p className="font-heytea text-[1.45rem] leading-none tracking-[0.02em]">
            {today.name}
          </p>
          <p className="text-[0.95rem] tracking-[0.08em] text-zen-stone">参加</p>
        </div>
      </button>
      <button
        type="button"
        onClick={onVote}
        className="mine-round mine-vote-entry"
        aria-label="今日投票，为今日色卡投一票"
      >
        <span className="mine-vote-copy">
          <span className="mine-vote-title">今日投票</span>
          <span className="mine-vote-hint">为今日色卡投一票</span>
        </span>
        <span className="mine-vote-go">进入</span>
      </button>
    </section>
  );
}

function ActivityGrid({ cards, onOpen }) {
  return (
    <section className="mine-section mine-section--last">
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
              {card.kind === 'vault' ? (
                <span className="flex h-8 w-8 overflow-hidden rounded-md">
                  <span className="h-full flex-1" style={{ backgroundColor: '#C45A6A' }} />
                  <span className="h-full flex-1" style={{ backgroundColor: '#C4A35A' }} />
                  <span className="h-full flex-1" style={{ backgroundColor: '#5A8A6A' }} />
                </span>
              ) : null}
            </div>
            <p className="font-heytea text-[1.2rem] leading-snug tracking-[0.02em]">{card.title}</p>
            <p className="mt-1 text-[0.88rem] text-zen-stone">{card.hint}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * 我的：身份、今日参加、投票、活动（含收藏入口）
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
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [memorySession, setMemorySession] = useState(0);
  const [walkOpen, setWalkOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);

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
    if (!memoryOpen && !walkOpen && !vaultOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [memoryOpen, walkOpen, vaultOpen]);

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
        onVote={() => onOpenDailyPool?.()}
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
            return;
          }
          if (card.kind === 'vault') {
            setVaultOpen(true);
          }
        }}
      />

      {vaultOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-zen-paper" role="dialog" aria-modal="true" aria-label="收藏">
          <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top,0px))] md:px-6">
            <p className="mine-section-label mb-0">收藏</p>
            <button
              type="button"
              onClick={() => setVaultOpen(false)}
              className="flex h-10 w-10 items-center justify-center"
              aria-label="关闭收藏"
            >
              <X size={18} strokeWidth={1.6} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] md:px-6">
            {shownVault.length === 0 ? (
              <p className="px-0.5 pt-6 text-[1rem] text-zen-stone">还没有收下颜色</p>
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
        </div>
      )}

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
