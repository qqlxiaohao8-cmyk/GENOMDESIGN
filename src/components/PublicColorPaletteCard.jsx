import React, { useMemo } from 'react';
import { Heart, Share2, Maximize2, CheckCircle2, Copy, Trash2, Loader2 } from 'lucide-react';
import InteractivePaletteStripes from './InteractivePaletteStripes';
import { buildPaletteDisplayTags, resolvePaletteDisplayTitle } from '../lib/paletteDisplayTags';

export function formatLikeCount(n) {
  const x = Number(n) || 0;
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(1)}M`;
  if (x >= 1_000) return `${(x / 1_000).toFixed(1)}K`;
  return String(x);
}

const iconActionClass =
  'inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-full border-2 border-black bg-white text-black shadow-[2px_2px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none hover:bg-[#ccff00]/50 transition-all disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0';

const likeActionBase =
  'inline-flex items-center gap-1.5 shrink-0 rounded-full border-2 border-black px-2.5 py-1.5 text-black shadow-[2px_2px_0_0_#000] text-sm font-black tabular-nums hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-40 disabled:hover:translate-x-0 disabled:hover:translate-y-0';

/**
 * Feed / vault tile — flat card (no outer border), rounded-2xl swatch; open + like keep Genom buttons.
 */
export default function PublicColorPaletteCard({
  colors,
  title,
  overview = null,
  showOverviewText = true,
  onCopyHex,
  copiedHexKey,
  /** Scope stripe copy feedback per card (e.g. style id) so keys do not collide across the grid */
  hexCopyScope = '',
  likeCount = 0,
  liked = false,
  likeBusy = false,
  onToggleLike,
  onOpenDetail,
  onCopyShareLink,
  shareCopied = false,
  /** Same “copy overview” control as Vault (optional; e.g. Community). */
  onCopyOverview = null,
  overviewCopied = false,
  showSocialRow = true,
  /** When set, shows vault actions on the right instead of the social row */
  vaultActions = null,
  /** e.g. delete control over the swatch */
  swatchOverlay = null,
  /** From style row / snapshot (e.g. color-extract, palette). Shown as pills when `onPickTag` is set. */
  keywords = [],
  /** Matches `communityTag` in App — selected pill uses accent fill. */
  activeKeywordTag = null,
  /** Matches active community search string for search-mode pills. */
  activeSearchQuery = null,
  /** Community: filter feed when a pill is clicked (`pick` is keyword or search payload). */
  onPickTag = null,
}) {
  const { list, displayTitle } = useMemo(() => {
    const row = Array.isArray(colors) ? colors.slice(0, 5) : [];
    while (row.length < 5) {
      row.push({ hex: '#888888', name: '—' });
    }
    return {
      list: row,
      displayTitle: resolvePaletteDisplayTitle(title, row),
    };
  }, [colors, title]);

  const displayTags = onPickTag
    ? buildPaletteDisplayTags({ keywords, colors: list, paletteTitle: displayTitle })
    : [];

  const tagPillClass = (active) =>
    `inline-flex max-w-full items-center truncate rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 transition-colors ${
      active ? 'border-neutral-400 bg-[#ccff00]/40 text-black' : 'hover:bg-neutral-100'
    }`;

  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="relative">
        {swatchOverlay}
        <InteractivePaletteStripes
          colors={list}
          onCopyHex={onCopyHex}
          hexCopyScope={hexCopyScope}
          copiedHexKey={copiedHexKey}
        />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1 pr-1">
            <p className="text-[15px] font-medium text-neutral-900 leading-snug line-clamp-3">
              {displayTitle || 'Untitled palette'}
            </p>
          </div>

          {vaultActions ? (
            <div className="flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  vaultActions.onCopyOverview?.();
                }}
                className={iconActionClass}
                title="Copy overview"
                aria-label="Copy overview"
              >
                {vaultActions.overviewCopied ? (
                  <CheckCircle2 size={18} strokeWidth={2.25} className="text-green-700" aria-hidden />
                ) : (
                  <Copy size={18} strokeWidth={2.25} aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  vaultActions.onOpenDetail?.();
                }}
                className={iconActionClass}
                title="Open"
                aria-label="Open details"
              >
                <Maximize2 size={18} strokeWidth={2.25} aria-hidden />
              </button>
              {vaultActions.onDelete ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    vaultActions.onDelete();
                  }}
                  disabled={vaultActions.deleteBusy}
                  className={`${iconActionClass} hover:bg-red-50 hover:border-red-600`}
                  title="Delete"
                  aria-label="Delete from vault"
                >
                  {vaultActions.deleteBusy ? (
                    <Loader2 size={18} strokeWidth={2.25} className="animate-spin" aria-hidden />
                  ) : (
                    <Trash2 size={18} strokeWidth={2.25} aria-hidden />
                  )}
                </button>
              ) : null}
            </div>
          ) : showSocialRow ? (
            <div className="flex items-center gap-4 shrink-0 flex-wrap justify-end">
              {typeof onCopyOverview === 'function' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCopyOverview();
                  }}
                  className={iconActionClass}
                  title="Copy overview"
                  aria-label="Copy overview"
                >
                  {overviewCopied ? (
                    <CheckCircle2 size={18} strokeWidth={2.25} className="text-green-700" aria-hidden />
                  ) : (
                    <Copy size={18} strokeWidth={2.25} aria-hidden />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenDetail?.();
                }}
                className={iconActionClass}
                title="Open"
                aria-label="Open palette"
              >
                <Maximize2 size={18} strokeWidth={2.25} aria-hidden />
              </button>
              {typeof onCopyShareLink === 'function' ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCopyShareLink();
                  }}
                  className={iconActionClass}
                  title={shareCopied ? 'Link copied' : 'Copy share link'}
                  aria-label={shareCopied ? 'Link copied' : 'Copy share link'}
                >
                  {shareCopied ? (
                    <CheckCircle2 size={18} strokeWidth={2.25} className="text-green-700" aria-hidden />
                  ) : (
                    <Share2 size={18} strokeWidth={2.25} aria-hidden />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleLike?.();
                }}
                disabled={likeBusy}
                className={`${likeActionBase} ${liked ? 'bg-[#ccff00] hover:bg-[#b8e600]' : 'bg-white hover:bg-[#ccff00]/50'}`}
                aria-pressed={liked}
                aria-label={liked ? 'Unlike palette' : 'Like palette'}
              >
                <Heart
                  size={18}
                  strokeWidth={2.25}
                  className={liked ? 'fill-black text-black' : 'text-black'}
                  aria-hidden
                />
                <span>{formatLikeCount(likeCount)}</span>
              </button>
            </div>
          ) : onOpenDetail || onCopyShareLink ? (
            <div className="flex items-center gap-4 shrink-0">
              {onOpenDetail ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpenDetail();
                  }}
                  className={iconActionClass}
                  title="Open card"
                  aria-label="Open card"
                >
                  <Maximize2 size={18} strokeWidth={2.25} aria-hidden />
                </button>
              ) : null}
              {onCopyShareLink ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCopyShareLink();
                  }}
                  className={iconActionClass}
                  title={shareCopied ? 'Link copied' : 'Copy share link'}
                  aria-label={shareCopied ? 'Link copied' : 'Copy share link'}
                >
                  {shareCopied ? (
                    <CheckCircle2 size={18} strokeWidth={2.25} className="text-green-700" aria-hidden />
                  ) : (
                    <Share2 size={18} strokeWidth={2.25} aria-hidden />
                  )}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {onPickTag && displayTags.length > 0 ? (
          <ul className="mt-2.5 flex flex-wrap gap-1.5 list-none p-0 m-0" aria-label="Palette tags">
            {displayTags.map(({ label, pick }) => {
              const active =
                pick.type === 'keyword'
                  ? activeKeywordTag != null &&
                    String(activeKeywordTag).trim().toLowerCase() === pick.value.toLowerCase()
                  : activeSearchQuery != null &&
                    String(activeSearchQuery).trim().toLowerCase() === pick.value.toLowerCase();
              const key = `${pick.type}:${pick.value}`;
              return (
                <li key={key} className="m-0 p-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onPickTag(pick);
                    }}
                    className={tagPillClass(active)}
                    title={
                      pick.type === 'keyword'
                        ? `Show palettes tagged “${pick.value}”`
                        : `Search for “${pick.value}”`
                    }
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {showOverviewText && overview ? (
          <p className="mt-2 text-xs font-medium text-neutral-600 leading-relaxed line-clamp-3">{overview}</p>
        ) : null}
      </div>
    </div>
  );
}
