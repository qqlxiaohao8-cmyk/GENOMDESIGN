import React from 'react';
import { ArrowLeft, Camera, Loader2, Trash2, X } from 'lucide-react';
import { pickReadableTextOnHex } from '../lib/colorValues';
import { getPoeticColorName } from '../lib/poeticColorNaming';
import { COLOR_WALK_SAVED_MAX } from '../lib/colorWalkApi';

/**
 * Color Walk 五色收藏页：固定 5 格，空位虚线，满额提示。
 */
export default function ColorWalkSavedColorsPage({
  slots = [],
  full = false,
  loading = false,
  saving = false,
  deletingId = null,
  onBack,
  onClose,
  onDelete,
  onCamera,
}) {
  return (
    <div className="relative z-10 mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-1 md:px-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zen-ink/15 bg-white text-zen-ink transition-colors hover:bg-zen-mist"
          aria-label="返回 Color Walk"
        >
          <ArrowLeft size={18} strokeWidth={2} aria-hidden />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="type-overline text-zen-ink/55">Color Walk</p>
          <h2 className="type-h3 truncate">已存颜色</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zen-ink/15 bg-white text-zen-ink transition-colors hover:bg-zen-mist"
          aria-label="关闭 Color Walk"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {full && (
        <div className="mb-4 rounded-2xl border border-zen-vermilion/25 bg-zen-vermilion/[0.06] px-4 py-3 text-center">
          <p className="text-sm font-medium text-zen-vermilion">储存已满</p>
          <p className="mt-0.5 text-[12px] font-extralight text-zen-ink/60">
            最多保存 {COLOR_WALK_SAVED_MAX} 个颜色，删除后再继续储存
          </p>
        </div>
      )}

      {(loading || saving) && (
        <div className="mb-3 flex items-center justify-center gap-2 text-[12px] font-extralight text-zen-ink/45">
          <Loader2 size={14} className="animate-spin" aria-hidden />
          {saving ? '正在储存…' : '加载中…'}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: COLOR_WALK_SAVED_MAX }, (_, i) => {
            const item = slots[i] || null;
            if (!item) {
              return (
                <div
                  key={`empty-${i}`}
                  className="flex min-h-[8.5rem] flex-col items-center justify-center rounded-2xl border border-dashed border-zen-ink/20 bg-white/40 px-4 py-6 text-center"
                >
                  <p className="text-[12px] font-extralight text-zen-ink/35">空位 {i + 1}</p>
                </div>
              );
            }

            const name = getPoeticColorName(item.hex);
            const labelColor = pickReadableTextOnHex(item.hex);
            const busy = deletingId === item.id;

            return (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-2xl border border-black/10 shadow-sm"
                style={{ backgroundColor: item.hex, minHeight: '8.5rem' }}
              >
                <div className="absolute inset-0 bg-black/10" aria-hidden />
                <div className="relative flex h-full min-h-[8.5rem] flex-col justify-between p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onCamera?.(item)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-black/25 text-white backdrop-blur-md transition-transform hover:scale-105"
                      aria-label={`为 ${name} 拍照排版`}
                    >
                      <Camera size={18} strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(item.id)}
                      disabled={busy}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white backdrop-blur transition-colors hover:bg-black/35 disabled:opacity-50"
                      aria-label={`删除 ${name}`}
                    >
                      {busy ? (
                        <Loader2 size={14} className="animate-spin" aria-hidden />
                      ) : (
                        <Trash2 size={14} strokeWidth={2} aria-hidden />
                      )}
                    </button>
                  </div>
                  <div style={{ color: labelColor }}>
                    <p className="font-zenSerif text-xl font-medium drop-shadow-sm">{name}</p>
                    <p className="mt-0.5 font-mono text-[12px] tracking-wide opacity-85">
                      {item.hex}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
