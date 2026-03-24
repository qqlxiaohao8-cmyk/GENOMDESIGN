import React from 'react';
import { X, Download, Sparkles, Loader2 } from 'lucide-react';
import ColorCardLayout from './ColorCardLayout';

export default function ColorCardPreviewOverlay({
  imageSrc,
  colorCardData,
  onClose,
  onCopySwatch,
  copiedHex,
  onDownload,
  downloadBusy,
  onOpenInExtract,
  openInExtractBusy = false,
}) {
  if (!colorCardData?.colors?.length) return null;
  return (
    <div
      className="fixed inset-0 z-[190] flex flex-col items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Color card"
    >
      <div className="relative w-full max-w-lg flex flex-col gap-4 pb-8">
        <div className="flex items-center justify-between gap-2 sticky top-0 z-10 py-2 -mt-2 bg-black/40 backdrop-blur rounded-xl px-3 border border-white/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-white">Color card</p>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {typeof onOpenInExtract === 'function' ? (
              <button
                type="button"
                onClick={() => void onOpenInExtract()}
                disabled={openInExtractBusy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#ccff00] text-black text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
              >
                {openInExtractBusy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} aria-hidden />}
                Open in Extract
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDownload}
              disabled={downloadBusy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0_0_#fff] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
            >
              <Download size={14} aria-hidden />
              PNG
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-[#ccff00] transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <ColorCardLayout
          imageSrc={imageSrc}
          colors={colorCardData.colors}
          swatchOnClick={onCopySwatch}
          copiedHex={copiedHex}
        />
        {colorCardData.overview ? (
          <p className="text-sm md:text-[15px] font-medium text-white/95 leading-relaxed text-center px-2 max-w-lg mx-auto">
            {colorCardData.overview}
          </p>
        ) : null}
        <p className="text-center text-[10px] font-bold text-white/80 uppercase tracking-widest">
          Tap a swatch to copy HEX · RGB · CMYK
        </p>
      </div>
    </div>
  );
}
