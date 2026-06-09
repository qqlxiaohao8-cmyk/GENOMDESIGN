import React, { useEffect, useRef } from 'react';
import { Check, ThumbsUp, X } from 'lucide-react';
import SekongPaletteSharePreview from './SekongPaletteSharePreview';
import { DAILY_VOTES_PER_USER } from '../lib/dailyOneColorConstants';

/**
 * 每日一色投稿成功后的确认卡片：预览色卡 + 进入投票池。
 */
export default function DailySubmitSuccessModal({
  open,
  title,
  colors = [],
  onGoVote,
  onClose,
}) {
  const voteBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const t = window.setTimeout(() => voteBtnRef.current?.focus(), 0);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const safeColors = (colors || []).slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-submit-success-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zen-clay/50 bg-white shadow-zen-lg">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-zen-ink/10 text-zen-ink/45 transition-colors hover:bg-zen-ink/[0.04] hover:text-zen-ink"
          aria-label="关闭"
        >
          <X size={16} strokeWidth={2} aria-hidden />
        </button>

        <div className="px-5 pb-5 pt-6">
          <div className="mb-4 flex items-start gap-3 pr-8">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
              <Check size={18} strokeWidth={2.5} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="daily-submit-success-title" className="type-h4 text-zen-coal">
                投稿成功
              </h2>
              <p className="type-body-sm mt-1 text-zen-stone">
                你的色卡已进入今日投票池
              </p>
            </div>
          </div>

          <SekongPaletteSharePreview
            colors={safeColors}
            className="w-full shadow-sm"
          />

          {title ? (
            <p className="type-caption mt-3 text-center font-zenSerif text-[13px] font-medium tracking-[0.2em] text-zen-ink">
              {title}
            </p>
          ) : null}

          <p className="type-note mt-3 text-center text-zen-ink/45">
            每日 {DAILY_VOTES_PER_USER} 票 · 前三名将入选色海「每日色卡」
          </p>

          <button
            ref={voteBtnRef}
            type="button"
            onClick={onGoVote}
            className="zen-btn-vermilion mt-5 flex w-full items-center justify-center gap-2 py-3.5"
          >
            <ThumbsUp size={15} strokeWidth={2} aria-hidden />
            去观览并投票
          </button>
        </div>
      </div>
    </div>
  );
}
