import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, BookmarkX, MoreHorizontal, Sparkles, ThumbsUp } from 'lucide-react';
import ColorSeaStripes from './ColorSeaStripes';
import {
  enrichColorsWithChineseNames,
  resolveChinesePaletteTitle,
} from '../lib/paletteChineseDisplay';

export function formatLikeCount(n) {
  const x = Number(n) || 0;
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `${(x / 1_000).toFixed(1)}K`;
  return String(x);
}

/**
 * 色海 / 收藏 feed 色卡：
 * 看色条 → 点色复制 → 标题跟着当前色走 → 图标操作是下一步。
 */
const footerBtn =
  'inline-flex items-center justify-center text-zen-stone smooth-transition hover:text-zen-ink';

export default function PaletteFeedCard({
  colors = [],
  title,
  cardId = '',
  favorited = false,
  favoriteBusy = false,
  onToggleFavorite,
  onUnfavorite,
  onOpenInShengSe,
  onDownload,
  onCopyLink,
  onAnalyze,
  mode = 'sea',
  voteCount = 0,
  voted = false,
  voteBusy = false,
  voteDisabled = false,
  onVote,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [copiedHexKey, setCopiedHexKey] = useState(null);
  const [activeStripe, setActiveStripe] = useState(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const copyTimer = useRef(null);

  const updateMenuPos = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      bottom: window.innerHeight - rect.top + 4,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuPos();
    const onLayout = () => updateMenuPos();
    window.addEventListener('scroll', onLayout, true);
    window.addEventListener('resize', onLayout);
    return () => {
      window.removeEventListener('scroll', onLayout, true);
      window.removeEventListener('resize', onLayout);
    };
  }, [menuOpen, updateMenuPos]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (
        menuRef.current?.contains(e.target)
        || triggerRef.current?.contains(e.target)
      ) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);

  const isFavorites = mode === 'favorites';
  const isDailyVote = mode === 'dailyVote';

  const displayColors = useMemo(() => {
    const row = Array.isArray(colors) && colors.length >= 2
      ? colors.slice(0, 10)
      : [{ hex: '#D4C5B0' }, { hex: '#8A7560' }];
    return enrichColorsWithChineseNames(row);
  }, [colors]);

  const displayTitle = useMemo(
    () => resolveChinesePaletteTitle(title, displayColors) || '未命名色卡',
    [title, displayColors],
  );

  const handleCopyHex = useCallback((hex, copyKey) => {
    const value = String(hex || '').trim();
    if (!value) return;
    void navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedHexKey(copyKey);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedHexKey(null), 1400);
  }, []);

  const liveLine = copiedHexKey && activeStripe
    ? `已复制 ${activeStripe.hex}`
    : activeStripe
      ? `${activeStripe.name}  ${activeStripe.hex}`
      : displayTitle;

  const hasOverflow = Boolean(
    onAnalyze
    || onDownload
    || onCopyLink
    || (onOpenInShengSe && isDailyVote),
  );

  const menuItems = (
    <>
      {onAnalyze && (
        <button
          type="button"
          className="zen-menu-row"
          onClick={() => { setMenuOpen(false); onAnalyze(); }}
        >
          分析色卡
        </button>
      )}
      {onOpenInShengSe && isDailyVote && (
        <button
          type="button"
          className="zen-menu-row"
          onClick={() => { setMenuOpen(false); onOpenInShengSe(); }}
        >
          在生色中打开
        </button>
      )}
      {onDownload && (
        <button
          type="button"
          className="zen-menu-row"
          onClick={() => { setMenuOpen(false); onDownload(); }}
        >
          导出图片
        </button>
      )}
      {onCopyLink && (
        <button
          type="button"
          className="zen-menu-row"
          onClick={() => { setMenuOpen(false); onCopyLink(); }}
        >
          拷贝链接
        </button>
      )}
    </>
  );

  const menuPanel = menuOpen && menuPos && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={menuRef}
        className="fixed z-[500] min-w-[9rem] border-0 bg-zen-paper py-2"
        style={{ bottom: menuPos.bottom, right: menuPos.right }}
      >
        {menuItems}
      </div>,
      document.body,
    )
    : null;

  return (
    <div className="zen-specimen flex w-full min-w-0 flex-col gap-2.5">
      <ColorSeaStripes
        colors={displayColors}
        className="zen-wash--tile"
        hexCopyScope={cardId || displayTitle}
        copiedHexKey={copiedHexKey}
        onCopyHex={handleCopyHex}
        onActiveChange={setActiveStripe}
      />

      <div className="relative flex min-h-[2rem] items-center gap-2 px-0.5">
        <p
          className={`min-w-0 flex-1 truncate tracking-[0.06em] ${
            activeStripe
              ? 'font-zenTypewriter text-[13px] text-zen-ink'
              : 'font-zenSerif text-[15px] text-zen-ink'
          }`}
        >
          {liveLine}
        </p>

        <div className="relative flex shrink-0 items-center gap-0.5">
          {isDailyVote ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onVote?.(); }}
              disabled={voteBusy || voteDisabled || voted}
              className={`${footerBtn} zen-hit h-8 gap-1 px-1.5 disabled:opacity-40 ${
                voted ? 'text-zen-vermilion' : 'hover:text-zen-vermilion'
              }`}
              aria-label={voted ? '已投票' : '投票'}
            >
              <ThumbsUp size={14} strokeWidth={2} fill={voted ? 'currentColor' : 'none'} aria-hidden />
              <span className="text-[10px] tabular-nums">{formatLikeCount(voteCount)}</span>
            </button>
          ) : isFavorites ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUnfavorite?.(); }}
              className={`${footerBtn} zen-hit h-8 w-8 hover:text-zen-vermilion`}
              aria-label="从收藏中移除"
            >
              <BookmarkX size={14} strokeWidth={2} aria-hidden />
            </button>
          ) : onToggleFavorite ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              disabled={favoriteBusy}
              className={`${footerBtn} zen-hit h-8 w-8 disabled:opacity-40 ${
                favorited ? 'text-zen-vermilion' : 'hover:text-zen-vermilion'
              }`}
              aria-label={favorited ? '取消收藏' : '收藏色卡'}
            >
              <Bookmark size={14} strokeWidth={2} fill={favorited ? 'currentColor' : 'none'} aria-hidden />
            </button>
          ) : null}

          {onOpenInShengSe && !isDailyVote ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenInShengSe(); }}
              className={`${footerBtn} zen-hit h-8 w-8 hover:text-zen-coal`}
              aria-label="打开"
            >
              <Sparkles size={14} strokeWidth={2} aria-hidden />
            </button>
          ) : null}

          {hasOverflow ? (
            <button
              ref={triggerRef}
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              className={`${footerBtn} zen-hit h-8 w-8`}
              aria-label="更多选项"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal size={14} strokeWidth={2} aria-hidden />
            </button>
          ) : null}

          {menuPanel}
        </div>
      </div>
    </div>
  );
}
