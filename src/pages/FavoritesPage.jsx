import React, { useMemo, useRef, useState } from 'react';
import voteIcon from '../assets/icons/vote.png';
import MasonryColumns from '../components/MasonryColumns';
import PaletteFeedCard from '../components/PaletteFeedCard';
import VoteSwipeDeck from '../components/VoteSwipeDeck';
import { itemColorCardData } from '../components/StyleUiPreviewCard';
import { FAVORITES_MASONRY_CLASS, PALETTE_FEED_MASONRY_GAP } from '../lib/paletteFeedLayout';
import { dateFromDailyPaletteKey, getTodayColor } from '../lib/dailyPalette';
import { useCalendarDateKey } from '../hooks/useCalendarDateKey';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { buildLocalSeaPreviewItems } from '../lib/localSeaPreview';
import { PREVIEW_USER } from '../lib/guestMineAccess';
import { IconSea } from '../components/icons/HeyteaIcons';

/**
 * 首页：收藏色卡。顶栏固定，只有色卡列表滚动。
 */
export default function FavoritesPage({
  user,
  authReady,
  libraryReady = true,
  vaultColorPaletteItems = [],
  colorPaletteExploreFeed = [],
  onDeleteItem,
  onOpenInShengSe,
  onDownload,
  onCopyLink,
  onAnalyzePalette,
  onStartChallenge,
  onOpenDrawer,
  drawerOpen = false,
  onOpenSea,
}) {
  const dateKey = useCalendarDateKey();
  const today = useMemo(
    () => getTodayColor(dateFromDailyPaletteKey(dateKey)),
    [dateKey],
  );

  const profile = user || PREVIEW_USER;
  const isPreview = !user;
  const accentHex = profile?.user_metadata?.accent_hex || '#C93756';
  const previewVault = useMemo(() => buildLocalSeaPreviewItems().slice(0, 4), []);
  const shownVault = isPreview && vaultColorPaletteItems.length === 0
    ? previewVault
    : vaultColorPaletteItems;
  const headerInk = pickReadableTextOnHex(accentHex);
  const [, dailyMonth, dailyDay] = String(today.dateKey || '').split('-');
  const dailyDateLabel = dailyMonth && dailyDay
    ? `${Number(dailyMonth)}.${Number(dailyDay)}`
    : '';
  const headerInkLight = headerInk === '#FFFFFF';
  const skipHeaderClickRef = useRef(false);
  const [voteOpen, setVoteOpen] = useState(false);
  const voteCards = useMemo(
    () => (colorPaletteExploreFeed || []).map((item) => {
      const cd = itemColorCardData(item);
      if (!cd?.colors?.length) return null;
      return {
        id: item.id,
        title: item.aesthetic || cd.overview || '',
        colors: cd.colors,
      };
    }).filter(Boolean),
    [colorPaletteExploreFeed],
  );

  const isHeaderAction = (event) => Boolean(
    event.target.closest('[aria-label="色海"], [data-home-vote]'),
  );

  const openMineNow = (event) => {
    if (drawerOpen || isHeaderAction(event)) return;
    skipHeaderClickRef.current = true;
    onOpenDrawer?.();
  };

  const handleMineTriggerClick = (event) => {
    if (isHeaderAction(event)) return;
    if (skipHeaderClickRef.current) {
      skipHeaderClickRef.current = false;
      return;
    }
    onOpenDrawer?.();
  };

  if (!authReady) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border border-zen-ink/20 border-t-zen-ink/60" />
      </div>
    );
  }

  return (
    <div className="home-page">
      <header
        className={`home-sticky${drawerOpen ? ' is-mine-open' : ''}`}
        style={{ backgroundColor: accentHex, color: headerInk }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          openMineNow(event);
        }}
        onClick={handleMineTriggerClick}
      >
        <div className="home-topbar">
          <button
            type="button"
            className={`home-icon-btn${headerInkLight ? ' is-on-dark' : ''}`}
            data-home-vote
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setVoteOpen(true);
            }}
            aria-label="投票"
          >
            <img src={voteIcon} alt="" className="heytea-icon-upload" aria-hidden />
          </button>
          <button
            type="button"
            className={`home-icon-btn${headerInkLight ? ' is-on-dark' : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenSea?.();
            }}
            aria-label="色海"
          >
            <IconSea />
          </button>
        </div>
      </header>

      <div className="home-sheet">
        <div className={`home-stage${shownVault.length === 0 ? ' is-empty' : ''}`}>
          <button
            type="button"
            className="home-daily"
            onClick={(event) => {
              const swatch = event.currentTarget.querySelector('.home-daily__swatch');
              const rect = swatch?.getBoundingClientRect();
              onStartChallenge?.({
                ...today,
                sourceRect: rect
                  ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
                  : null,
              });
            }}
            aria-label={`每日挑战 ${today.name}，${today.poem || ''}，用今日色配一张卡`}
          >
            <span className="home-daily__swatch" aria-hidden>
              <svg viewBox="0 0 200 100" preserveAspectRatio="none">
                <defs>
                  <filter id="home-daily-brush" x="-8%" y="-30%" width="130%" height="160%">
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency="0.012 0.55"
                      numOctaves="2"
                      seed="5"
                      result="n"
                    />
                    <feDisplacementMap in="SourceGraphic" in2="n" scale="8" xChannelSelector="R" yChannelSelector="G" />
                  </filter>
                </defs>
                <rect x="-28" y="-24" width="196" height="148" fill={today.hex} filter="url(#home-daily-brush)" />
              </svg>
            </span>
            <span className="home-daily__copy">
              <span className="home-daily__kicker">
                <span>每日挑战</span>
                {dailyDateLabel ? (
                  <span className="home-daily__date">{dailyDateLabel}</span>
                ) : null}
              </span>
              <span className="home-daily__name">{today.name}</span>
              {today.poem ? (
                <span className="home-daily__poem">{today.poem}</span>
              ) : null}
              <span className="home-daily__go daily-pick-blink">
                <span className="home-daily__go-dot" style={{ backgroundColor: today.hex }} />
                用今日色配一张
              </span>
            </span>
          </button>
          {!libraryReady && shownVault.length === 0 ? null : shownVault.length === 0 ? (
            <p className="home-empty text-[1rem] text-zen-stone">还没有收藏的颜色</p>
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
      {voteOpen ? (
        <VoteSwipeDeck cards={voteCards} onClose={() => setVoteOpen(false)} />
      ) : null}
    </div>
  );
}
