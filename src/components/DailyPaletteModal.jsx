import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarSync, X } from 'lucide-react';
import { formatDailyPaletteDateKey, getDailyPalette } from '../lib/dailyPalette';
import { useCalendarDateKey } from '../hooks/useCalendarDateKey';

function copyText(text) {
  try {
    void navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}

/**
 * @param {{ open: boolean, onClose: () => void, dailyHero?: { title?: string, overview?: string, colors?: Array<{hex:string,name?:string}>, imageUrl?: string|null, quote?: { zh?: string, zhSource?: string, en?: string, enSource?: string } } }} props
 */
export default function DailyPaletteModal({ open, onClose, dailyHero = null }) {
  const closeBtnRef = useRef(null);
  const [copiedHexKey, setCopiedHexKey] = useState(null);
  const calendarDateKey = useCalendarDateKey();

  const calendar = useMemo(() => getDailyPalette(new Date()), [open, calendarDateKey]);

  const title = dailyHero?.title ?? calendar.title;
  const overview = dailyHero?.overview ?? calendar.overview;
  const colors =
    dailyHero?.colors?.length ? dailyHero.colors : calendar.colors;
  const quote = dailyHero?.quote ?? calendar.quote;
  const imageUrl =
    dailyHero?.imageUrl && /^https?:\/\//i.test(String(dailyHero.imageUrl))
      ? dailyHero.imageUrl
      : null;

  const primary = colors[0];
  const hex = primary?.hex ? String(primary.hex).toUpperCase() : '#000000';
  const name = primary?.name || title;
  const datePretty = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, [open, calendarDateKey]);

  const dateKey = formatDailyPaletteDateKey(new Date());

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setCopiedHexKey(null);
  }, [open]);

  if (!open) return null;

  const copyKeyMain = `daily-one:${hex}`;
  const onCopyHex = (h, copyKey) => {
    copyText(h);
    setCopiedHexKey(copyKey);
    window.setTimeout(() => setCopiedHexKey((k) => (k === copyKey ? null : k)), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-palette-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl max-h-[min(90dvh,880px)] overflow-y-auto bg-zen-mist border border-zen-ink/10 rounded-2xl shadow-none">
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full border border-zen-ink/15 flex items-center justify-center bg-zen-paper hover:bg-zen-ink/[0.04] transition-colors duration-[2000ms]"
          aria-label="Close"
        >
          <X size={20} aria-hidden />
        </button>

        <div className="p-6 sm:p-8 md:p-10 pr-14 sm:pr-16 font-zenSans font-extralight">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zen-ink text-white text-[9px] font-extralight uppercase tracking-[0.2em] rounded-full border border-zen-ink/20">
              <CalendarSync size={12} strokeWidth={2.5} aria-hidden />
              逐日观色
            </span>
            <span className="text-[10px] font-extralight text-zen-ink/50 uppercase tracking-widest">
              {datePretty}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
            <div className="min-w-0 order-2 lg:order-1">
              <h2
                id="daily-palette-modal-title"
                className="text-2xl sm:text-3xl font-zenSerif font-medium text-zen-ink leading-tight mb-2"
              >
                {name}
              </h2>
              <p className="text-lg sm:text-xl font-mono font-medium text-zen-ink/90 tabular-nums tracking-wide mb-4">
                {hex}
              </p>
              <p className="text-sm sm:text-base font-extralight text-zen-ink/75 leading-relaxed mb-6">
                {overview}
              </p>
              <div className="rounded-xl border border-zen-ink/10 bg-zen-paper p-4 sm:p-5">
                <p className="text-[10px] font-extralight uppercase tracking-[0.2em] text-zen-ink/50 mb-3">
                  Today&apos;s line · 今日一句
                </p>
                <blockquote className="border-l-2 border-zen-vermilion/40 pl-4 m-0 space-y-3">
                  <p
                    lang="zh-Hans"
                    className="text-base sm:text-lg font-medium text-zen-ink leading-relaxed tracking-tight"
                  >
                    {quote?.zh}
                  </p>
                  <p className="text-[11px] text-zen-ink/50 leading-snug not-italic">{quote?.zhSource}</p>
                  <p className="text-sm sm:text-base font-extralight text-zen-ink/85 leading-relaxed pt-1 border-t border-zen-ink/10">
                    {quote?.en}
                  </p>
                  <p className="text-[11px] text-zen-ink/50 leading-snug not-italic">{quote?.enSource}</p>
                </blockquote>
                <p className="mt-4 text-[10px] font-extralight text-zen-ink/45 uppercase tracking-wider">
                  Day key · {dateKey}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCopyHex(hex, copyKeyMain)}
                className="mt-5 w-full sm:w-auto px-6 py-3 rounded-full border border-zen-ink/15 bg-white text-[10px] font-extralight uppercase tracking-widest hover:bg-zen-ink/[0.03] transition-colors"
              >
                {copiedHexKey === copyKeyMain ? 'Copied HEX' : 'Copy HEX'}
              </button>
            </div>

            <div className="min-w-0 order-1 lg:order-2">
              {imageUrl ? (
                <div className="mb-4 rounded-xl overflow-hidden border border-zen-ink/10 bg-zen-mist">
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full max-h-[220px] object-cover"
                    draggable={false}
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => onCopyHex(hex, copyKeyMain)}
                className="relative w-full aspect-[4/3] max-h-[min(52vw,380px)] rounded-2xl overflow-hidden border border-zen-ink/10 shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-zen-vermilion/50"
                style={{
                  backgroundColor: hex,
                }}
                aria-label={`${name} ${hex} — copy`}
              >
                <span className="sr-only">
                  {copiedHexKey === copyKeyMain ? 'Copied' : 'Click to copy HEX'}
                </span>
              </button>
              <p className="mt-3 text-[10px] font-extralight uppercase tracking-[0.2em] text-zen-ink/45">
                点击色块复制 HEX · 一名一色
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
