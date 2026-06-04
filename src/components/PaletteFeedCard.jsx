import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Bookmark, BookmarkX, Sparkles, Download, Link, MoreHorizontal, ThumbsUp, BarChart3 } from 'lucide-react';
import ColorSeaStripes, { PALETTE_FEED_STRIPE_HEIGHT_CLASS } from './ColorSeaStripes';
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

const footerBtn =
  'flex items-center justify-center rounded-full text-zen-ink/50 hover:bg-zen-ink/[0.05] transition-colors';

/**
 * 色海 / 收藏 feed 色卡：竖条色盘 + 底部名称与操作（无边框）。
 */
export default function PaletteFeedCard({
  colors = [],
  title,
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
  const menuRef = useRef(null);

  const displayColors = useMemo(() => {
    const row = Array.isArray(colors) && colors.length >= 2
      ? colors.slice(0, 10)
      : [{ hex: '#D4C5B0' }, { hex: '#8A7560' }];
    return enrichColorsWithChineseNames(row);
  }, [colors]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const isFavorites = mode === 'favorites';
  const isDailyVote = mode === 'dailyVote';
  const displayTitle = useMemo(
    () => resolveChinesePaletteTitle(title, displayColors) || '未命名色卡',
    [title, displayColors],
  );

  const menuPanel = menuOpen ? (
    <div className="absolute bottom-full right-0 z-50 mb-1 min-w-[9rem] rounded-xl bg-white py-1 shadow-lg">
      {onAnalyze && (
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-[12px] font-extralight text-zen-ink hover:bg-zen-ink/[0.04] transition-colors"
          onClick={() => { setMenuOpen(false); onAnalyze(); }}
        >
          <BarChart3 size={13} strokeWidth={2} aria-hidden />
          分析色卡
        </button>
      )}
      {onOpenInShengSe && (
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-[12px] font-extralight text-zen-ink hover:bg-zen-ink/[0.04] transition-colors"
          onClick={() => { setMenuOpen(false); onOpenInShengSe(); }}
        >
          <Sparkles size={13} strokeWidth={2} aria-hidden />
          在生色中打开
        </button>
      )}
      {onDownload && (
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-[12px] font-extralight text-zen-ink hover:bg-zen-ink/[0.04] transition-colors"
          onClick={() => { setMenuOpen(false); onDownload(); }}
        >
          <Download size={13} strokeWidth={2} aria-hidden />
          导出图片
        </button>
      )}
      {onCopyLink && (
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-[12px] font-extralight text-zen-ink hover:bg-zen-ink/[0.04] transition-colors"
          onClick={() => { setMenuOpen(false); onCopyLink(); }}
        >
          <Link size={13} strokeWidth={2} aria-hidden />
          拷贝链接
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white">
      <ColorSeaStripes
        colors={displayColors}
        className={`!rounded-none rounded-t-2xl ${PALETTE_FEED_STRIPE_HEIGHT_CLASS}`}
      />

      <div
        className="relative flex min-h-[2.25rem] items-center gap-2 rounded-b-2xl bg-white px-2.5 py-1.5"
        ref={menuRef}
      >
        <p className="type-caption min-w-0 flex-1 truncate text-zen-ink/75">
          {displayTitle}
        </p>
        <div className="relative flex shrink-0 items-center gap-0.5">
          {isDailyVote ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onVote?.(); }}
              disabled={voteBusy || voteDisabled || voted}
              className={`${footerBtn} h-8 gap-1 px-2 disabled:opacity-40 ${
                voted ? 'text-zen-vermilion' : 'hover:text-zen-vermilion'
              }`}
              aria-label={voted ? '已投票' : '投票'}
              title={voted ? '已投票' : '为此色卡投票'}
            >
              <ThumbsUp size={13} strokeWidth={2} fill={voted ? 'currentColor' : 'none'} aria-hidden />
              <span className="text-[10px] tabular-nums">{formatLikeCount(voteCount)}</span>
            </button>
          ) : isFavorites ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUnfavorite?.(); }}
              className={`${footerBtn} h-8 w-8 hover:text-zen-vermilion`}
              aria-label="从收藏中移除"
              title="从收藏中移除（不影响色海展示）"
            >
              <BookmarkX size={13} strokeWidth={2} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
              disabled={favoriteBusy}
              className={`${footerBtn} h-8 w-8 disabled:opacity-40 ${favorited ? 'text-zen-vermilion' : 'hover:text-zen-vermilion'}`}
              aria-label={favorited ? '取消收藏' : '收藏色卡'}
              title={favorited ? '取消收藏' : '收藏色卡'}
            >
              <Bookmark size={13} strokeWidth={2} fill={favorited ? 'currentColor' : 'none'} aria-hidden />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className={`${footerBtn} h-8 w-8 hover:text-zen-ink`}
            aria-label="更多选项"
          >
            <MoreHorizontal size={13} strokeWidth={2} aria-hidden />
          </button>

          {menuPanel}
        </div>
      </div>
    </div>
  );
}
