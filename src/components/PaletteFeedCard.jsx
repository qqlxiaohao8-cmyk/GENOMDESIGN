import React, { useState, useRef, useEffect } from 'react';
import { Heart, Bookmark, BookmarkX, Sparkles, Download, Link, MoreHorizontal } from 'lucide-react';
import { pickReadableTextOnHex } from '../lib/colorValues';

export function formatLikeCount(n) {
  const x = Number(n) || 0;
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `${(x / 1_000).toFixed(1)}K`;
  return String(x);
}

/**
 * Rounded-rectangle color card for use in feeds (Favorites, 色海).
 *
 * Colors are shown as vertical bars in a horizontal row (横向竖条).
 * A floating action area sits at the bottom-right.
 *
 * Props:
 *   colors          – [{ hex, name }]
 *   title           – optional palette title
 *   likeCount       – number (for 色海 cards)
 *   liked           – boolean
 *   likeBusy        – boolean
 *   onToggleLike    – () => void  (shown when `mode === 'sea'`)
 *   onUnfavorite    – () => void  (shown when `mode === 'favorites'`)
 *   onOpenInShengSe – () => void
 *   onDownload      – () => void
 *   onCopyLink      – () => void  (optional)
 *   mode            – 'sea' | 'favorites'
 */
export default function PaletteFeedCard({
  colors = [],
  title,
  likeCount = 0,
  liked = false,
  likeBusy = false,
  onToggleLike,
  onUnfavorite,
  onOpenInShengSe,
  onDownload,
  onCopyLink,
  mode = 'sea',
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const safeColors = Array.isArray(colors) && colors.length >= 2
    ? colors.slice(0, 10)
    : [{ hex: '#D4C5B0' }, { hex: '#8A7560' }];

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 group">
      {/* Color bars — horizontal row of vertical strips */}
      <div className="flex" style={{ height: '6rem' }}>
        {safeColors.map((c, i) => {
          const hex = typeof c?.hex === 'string' ? c.hex : '#888888';
          const textColor = pickReadableTextOnHex(hex);
          return (
            <div
              key={i}
              style={{ flex: 1, backgroundColor: hex }}
              className="relative min-w-0"
            >
              {c?.name && (
                <span
                  className="absolute bottom-1 left-0 right-0 truncate px-0.5 text-center text-[8px] font-extralight tracking-wide opacity-0 group-hover:opacity-70 transition-opacity duration-200 pointer-events-none select-none"
                  style={{ color: textColor }}
                >
                  {c.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Title bar (if any) */}
      {title && (
        <div className="px-3 py-1.5 bg-white/90 backdrop-blur-sm border-t border-black/5">
          <p className="text-[11px] font-extralight tracking-wide text-zen-ink/70 truncate">{title}</p>
        </div>
      )}

      {/* Floating bottom-right actions */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1" ref={menuRef}>
        {/* Mode-specific primary action */}
        {mode === 'favorites' ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUnfavorite?.(); }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zen-ink/60 shadow hover:text-zen-vermilion transition-colors"
            aria-label="取消收藏"
            title="取消收藏"
          >
            <BookmarkX size={13} strokeWidth={2} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleLike?.(); }}
            disabled={likeBusy}
            className={`flex h-7 items-center gap-1 rounded-full bg-white/90 px-2 shadow transition-colors disabled:opacity-40 ${liked ? 'text-zen-vermilion' : 'text-zen-ink/60 hover:text-zen-vermilion'}`}
            aria-label={liked ? '取消收藏' : `收藏 ${formatLikeCount(likeCount)}`}
          >
            <Heart size={12} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} aria-hidden />
            <span className="text-[10px] font-extralight tabular-nums">{formatLikeCount(likeCount)}</span>
          </button>
        )}

        {/* More menu toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zen-ink/60 shadow hover:text-zen-ink transition-colors"
          aria-label="更多选项"
        >
          <MoreHorizontal size={13} strokeWidth={2} aria-hidden />
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute bottom-9 right-0 z-50 min-w-[9rem] rounded-xl border border-zen-ink/10 bg-white shadow-xl py-1">
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
        )}
      </div>
    </div>
  );
}
