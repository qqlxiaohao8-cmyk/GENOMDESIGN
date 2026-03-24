import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarSync, X } from 'lucide-react';
import { formatDailyPaletteDateKey, getDailyPalette } from '../lib/dailyPalette';
import InteractivePaletteStripes from './InteractivePaletteStripes';

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
 * @param {{ open: boolean, onClose: () => void, dailyHero?: { title?: string, overview?: string, colors?: Array<{hex:string,name?:string}>, imageUrl?: string|null } }} props
 */
export default function DailyPaletteModal({ open, onClose, dailyHero = null }) {
  const closeBtnRef = useRef(null);
  const [copiedHexKey, setCopiedHexKey] = useState(null);

  const calendar = useMemo(() => getDailyPalette(new Date()), [open]);

  const title = dailyHero?.title ?? calendar.title;
  const overview = dailyHero?.overview ?? calendar.overview;
  const colors =
    dailyHero?.colors?.length ? dailyHero.colors : calendar.colors;
  const imageUrl =
    dailyHero?.imageUrl && /^https?:\/\//i.test(String(dailyHero.imageUrl))
      ? dailyHero.imageUrl
      : null;

  const datePretty = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date());
  }, []);

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

  const onCopyHex = (hex, copyKey) => {
    copyText(hex);
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
      <div className="relative w-full max-w-4xl max-h-[min(90dvh,880px)] overflow-y-auto bg-white border-2 border-black rounded-2xl shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-white hover:bg-[#ccff00] transition-colors"
          aria-label="Close daily palette"
        >
          <X size={20} aria-hidden />
        </button>

        <div className="p-6 sm:p-8 md:p-10 pr-14 sm:pr-16">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black text-[#ccff00] text-[9px] font-black uppercase tracking-[0.2em] rounded-full border-2 border-black">
              <CalendarSync size={12} strokeWidth={2.5} aria-hidden />
              Daily palette
            </span>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              {datePretty}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-start">
            <div className="min-w-0">
              <h2
                id="daily-palette-modal-title"
                className="text-2xl sm:text-3xl font-black text-neutral-900 font-bricolage leading-tight mb-4"
              >
                {title}
              </h2>
              <p className="text-sm sm:text-base font-medium text-neutral-700 leading-relaxed mb-6">
                {overview}
              </p>
              <div className="rounded-xl border-2 border-black/10 bg-[#fafafa] p-4 sm:p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">
                  Today&apos;s line · 今日一句
                </p>
                <blockquote className="border-l-4 border-[#ccff00] pl-4 m-0 space-y-3">
                  <p
                    lang="zh-Hans"
                    className="text-base sm:text-lg font-medium text-neutral-900 leading-relaxed tracking-tight"
                  >
                    {calendar.quote?.zh}
                  </p>
                  <p className="text-[11px] text-neutral-500 leading-snug not-italic">{calendar.quote?.zhSource}</p>
                  <p className="text-sm sm:text-base font-medium text-neutral-800 leading-relaxed pt-1 border-t border-black/5">
                    {calendar.quote?.en}
                  </p>
                  <p className="text-[11px] text-neutral-500 leading-snug not-italic">{calendar.quote?.enSource}</p>
                </blockquote>
                <p className="mt-4 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Day key · {dateKey}
                </p>
              </div>
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                Hover a swatch to expand · tap to copy HEX
              </p>
            </div>

            <div className="min-w-0">
              {imageUrl ? (
                <div className="mb-4 rounded-xl overflow-hidden border-2 border-black/10 bg-neutral-100">
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-full max-h-[200px] object-cover"
                    draggable={false}
                  />
                </div>
              ) : null}
              <div className="rounded-2xl border-2 border-black/10 p-3 bg-white">
                <InteractivePaletteStripes
                  colors={colors}
                  onCopyHex={onCopyHex}
                  hexCopyScope="daily-modal"
                  copiedHexKey={copiedHexKey}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
