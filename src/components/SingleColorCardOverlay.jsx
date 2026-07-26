import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Search, X } from 'lucide-react';
import {
  formatPoeticQuoteSource,
  getPoeticColorEntry,
  getPoeticQuoteForHex,
} from '../lib/poeticColorNaming';
import { renderSingleColorCardPngBlob } from '../lib/renderSingleColorCardPng';
import sekongLogo from '../../下载色空.png';

/**
 * 分析页单色色卡弹层：3:4，上 2/3 纯色，下 1/3 白底信息区。
 */
export default function SingleColorCardOverlay({
  color,
  onClose,
  onFindMore,
}) {
  const [downloadBusy, setDownloadBusy] = useState(false);

  const resolved = useMemo(() => {
    if (!color?.hex) return null;
    const entry = getPoeticColorEntry(color.hex);
    const quote = getPoeticQuoteForHex(color.hex);
    return {
      hex: color.hex,
      name: color.name || entry.name2 || '素灰',
      poem: color.poem || quote.zh || entry.poem || '',
      poemSource: color.poemSource || quote.zhSource || formatPoeticQuoteSource(entry.poet, entry.source),
    };
  }, [color]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  if (!resolved) return null;

  const hexLabel = String(resolved.hex || '').replace(/^#/, '').toUpperCase();

  const handleDownload = async () => {
    if (downloadBusy) return;
    setDownloadBusy(true);
    try {
      const blob = await renderSingleColorCardPngBlob({
        hex: resolved.hex,
        name: resolved.name,
        poem: resolved.poem,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sekong-${resolved.name || hexLabel}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[220] flex flex-col items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${resolved.name} 色卡`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-zen-ink/45 backdrop-blur-sm"
        aria-label="关闭色卡"
        onClick={handleClose}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="type-overline text-white/80">单色色卡</p>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/25 text-white backdrop-blur hover:bg-black/40"
            aria-label="关闭"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div
          className="overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
          style={{ aspectRatio: '3 / 4' }}
        >
          <div className="flex h-full w-full flex-col">
            <div className="min-h-0 flex-[2]" style={{ backgroundColor: resolved.hex }} />
            <div className="relative min-h-0 flex-1 bg-white px-5 pb-5 pt-4">
              <div className="absolute bottom-5 left-5 right-24 flex flex-col items-start gap-1">
                <p className="font-zenSerif text-2xl font-medium leading-none text-zen-ink">
                  {resolved.name}
                </p>
                <p className="font-mono text-[12px] tracking-wide text-zen-ink/50">
                  #{hexLabel}
                </p>
                {resolved.poem ? (
                  <p className="mt-1 line-clamp-3 text-left text-[12px] font-extralight leading-relaxed text-zen-ink/70">
                    {resolved.poem}
                  </p>
                ) : null}
              </div>
              <img
                src={sekongLogo}
                alt="色空"
                className="absolute bottom-5 right-5 h-8 w-auto object-contain opacity-90"
                draggable={false}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onFindMore?.(resolved)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/35 bg-white/90 px-3 py-2.5 text-[12px] font-extralight text-zen-ink transition-colors hover:bg-white"
          >
            <Search size={14} strokeWidth={2} aria-hidden />
            查看更多色卡
          </button>
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloadBusy}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-zen-ink px-3 py-2.5 text-[12px] font-extralight text-white transition-colors hover:brightness-110 disabled:opacity-50"
          >
            {downloadBusy ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <Download size={14} strokeWidth={2} aria-hidden />
            )}
            下载色卡
          </button>
        </div>
      </div>
    </div>
  );
}
