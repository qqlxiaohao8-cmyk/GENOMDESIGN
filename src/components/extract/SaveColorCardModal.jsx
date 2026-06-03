import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, ChevronRight, Download, Sparkles } from 'lucide-react';
import { suggestPaletteTitles } from '../../lib/paletteTitleSuggestions';
import SekongPaletteSharePreview from '../SekongPaletteSharePreview';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onConfirm: (note: string, paletteTitle: string) => Promise<{ success?: boolean, authRequired?: boolean } | void>,
 *   busy: boolean,
 *   colors: Array<{ hex: string, name?: string }>,
 *   overview?: string,
 *   onDownloadPng: () => void | Promise<void>,
 *   downloadBusy?: boolean,
 *   onPublishToSea: () => void | Promise<void>,
 *   publishDisabled?: boolean,
 * }} props
 */
export default function SaveColorCardModal({
  open,
  onClose,
  onConfirm,
  busy,
  colors = [],
  overview = '',
  onDownloadPng,
  downloadBusy = false,
  onPublishToSea,
  publishDisabled = true,
}) {
  const [step, setStep] = useState('strip');
  const [note, setNote] = useState('');
  const [paletteTitle, setPaletteTitle] = useState('');

  const suggestions = useMemo(
    () => suggestPaletteTitles({ colors, overview }),
    [colors, overview]
  );

  useEffect(() => {
    if (!open) return;
    setStep('strip');
    setNote('');
    setPaletteTitle((colors[0]?.name || '').trim().slice(0, 120));
    // Intentionally only when dialog opens — avoid wiping the form on parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    const title = paletteTitle.trim() || (colors[0]?.name || '').trim() || '未命名色谱';
    const res = await onConfirm(note.trim(), title);
    if (res && res.authRequired) {
      onClose();
      return;
    }
    if (res && res.success === false) return;
    setStep('done');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zen-ink/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-card-title"
    >
      <div className="zen-modal-surface w-full max-w-xl p-6 shadow-lg max-h-[min(92vh,840px)] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 id="save-card-title" className="font-zenSerif text-xl font-medium text-zen-ink">
            保存色卡
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zen-ink/40 hover:bg-zen-ink/[0.06]"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'strip' ? (
          <>
            <p className="text-xs text-zen-ink/55 mb-4 leading-relaxed">
              下方为「色空」分享图预览：下载 PNG 时将导出相同排版（宋体、下载色空.png 与山水图景）。下一步可为色盘起名并备注。
            </p>
            <div className="mb-5 space-y-2">
              <p className="text-[10px] font-extralight uppercase tracking-[0.2em] text-zen-ink/45">
                PNG 分享预览
              </p>
              <SekongPaletteSharePreview colors={colors} title={paletteTitle} className="max-h-[min(52vh,440px)]" />
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-zen-ink/15 text-[10px] font-extralight uppercase tracking-widest text-zen-ink/80 hover:bg-zen-ink/[0.04]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => setStep('name')}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-zen-ink text-white text-[10px] font-extralight uppercase tracking-widest border border-zen-ink/20"
              >
                下一步
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
          </>
        ) : null}

        {step === 'name' ? (
          <>
            <p className="text-xs text-zen-ink/55 mb-3 leading-relaxed">
              起名工具：点击下方灵感可填入名称，也可自由编辑。此名将用于「藏」条目与发布到色海时的展示名。
            </p>
            <div className="mb-4 flex justify-center">
              <SekongPaletteSharePreview colors={colors} title={paletteTitle} className="max-h-[min(38vh,320px)]" />
            </div>
            <label htmlFor="palette-title" className="text-[10px] font-extralight uppercase tracking-[0.2em] text-zen-ink/45">
              色卡名称
            </label>
            <input
              id="palette-title"
              type="text"
              value={paletteTitle}
              onChange={(e) => setPaletteTitle(e.target.value.slice(0, 120))}
              maxLength={120}
              placeholder="例如：秋柿与陶土 · 五色"
              className="mt-1 w-full rounded-2xl border border-zen-ink/15 px-3 py-2.5 text-sm font-extralight text-zen-ink placeholder:text-zen-ink/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-zen-vermilion/35"
            />
            {suggestions.length ? (
              <div className="mt-3">
                <p className="text-[10px] font-extralight uppercase tracking-widest text-zen-ink/40 mb-2">
                  灵感推荐
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPaletteTitle(s.slice(0, 120))}
                      className="px-3 py-1.5 rounded-full border border-zen-ink/12 bg-white text-[11px] font-extralight text-zen-ink/85 hover:border-zen-vermilion/35 hover:bg-zen-vermilion/[0.06] transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <label htmlFor="vault-note" className="mt-4 block text-[10px] font-extralight uppercase tracking-[0.2em] text-zen-ink/45">
              备注（选填）
            </label>
            <textarea
              id="vault-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="例如：市集霓虹、客户初稿…"
              className="mt-1 w-full rounded-2xl border border-zen-ink/15 p-3 text-sm font-extralight text-zen-ink placeholder:text-zen-ink/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-zen-vermilion/35"
            />
            <div className="mt-5 flex flex-wrap gap-2 justify-between">
              <button
                type="button"
                onClick={() => setStep('strip')}
                className="px-5 py-2.5 rounded-full border border-zen-ink/15 text-[10px] font-extralight uppercase tracking-widest text-zen-ink/80 hover:bg-zen-ink/[0.04]"
              >
                上一步
              </button>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full border border-zen-ink/15 text-[10px] font-extralight uppercase tracking-widest text-zen-ink/80 hover:bg-zen-ink/[0.04]"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSave()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-zen-ink text-white text-[10px] font-extralight uppercase tracking-widest border border-zen-ink/20 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="animate-spin" size={16} /> : null}
                  保存至藏
                </button>
              </div>
            </div>
          </>
        ) : null}

        {step === 'done' ? (
          <>
            <p className="text-xs text-zen-ink/70 mb-3 leading-relaxed">
              已保存至「藏」。导出 PNG 为下方预览效果；亦可发布到色海。
            </p>
            <div className="mb-5 flex justify-center">
              <SekongPaletteSharePreview colors={colors} title={paletteTitle} className="max-h-[min(40vh,340px)]" />
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={!!downloadBusy}
                onClick={() => void onDownloadPng()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zen-ink/15 bg-white py-3.5 text-[10px] font-extralight uppercase tracking-widest hover:bg-zen-ink/[0.04] disabled:opacity-50"
              >
                {downloadBusy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <Download size={18} aria-hidden />}
                下载 PNG
              </button>
              <button
                type="button"
                disabled={publishDisabled || !!busy}
                onClick={() => void onPublishToSea()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zen-vermilion/35 bg-zen-vermilion text-white py-3.5 text-[10px] font-extralight uppercase tracking-widest hover:opacity-95 disabled:opacity-40"
              >
                <Sparkles size={18} aria-hidden />
                发布色卡到色海
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full py-2.5 rounded-full text-[10px] font-extralight uppercase tracking-widest text-zen-ink/50 hover:text-zen-ink"
            >
              完成并关闭
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
