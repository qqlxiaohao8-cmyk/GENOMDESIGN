import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Send, Loader2, Camera, Globe } from 'lucide-react';
import ColorCardDetailLayout from '../shared/ColorCardDetailLayout';

const DEFAULT_TITLE = '未命名色卡';
const MAX_TITLE_LEN = 28;

/**
 * 析色 · 编辑并发布页
 *
 * 采用共享 ColorCardDetailLayout 外壳，底部动作卡 = 图片来源 + 逐日观色勾选。
 */
export default function EditPublishView({
  imageSrc,
  hexes,
  onBack,
  onPublish,
  publishing = false,
  externalError = null,
}) {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [editingTitle, setEditingTitle] = useState(false);
  const [sourceType, setSourceType] = useState(null);
  const [submitToDailyHunt, setSubmitToDailyHunt] = useState(false);
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);

  const titleDisplay = title.trim() || DEFAULT_TITLE;
  const titleIsDefault = !title.trim() || title.trim() === DEFAULT_TITLE;
  const colors = useMemo(() => hexes.map((hex) => ({ hex })), [hexes]);

  const beginEditTitle = () => {
    setEditingTitle(true);
    setLocalError(null);
    if (title.trim() === DEFAULT_TITLE) setTitle('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const commitTitle = () => {
    setEditingTitle(false);
    if (!title.trim()) setTitle(DEFAULT_TITLE);
  };

  const handlePublish = async () => {
    if (publishing) return;
    if (titleIsDefault) {
      setLocalError('请先填写色卡名称后再发布。');
      setEditingTitle(true);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (!sourceType) {
      setLocalError('请选择图片来源：自己拍摄 或 网图。');
      return;
    }
    setLocalError(null);
    const res = await onPublish({
      title: title.trim().slice(0, MAX_TITLE_LEN),
      hexes,
      sourceType,
      submitToDailyHunt: sourceType === 'own_shot' ? submitToDailyHunt : false,
    });
    if (!res?.ok) setLocalError(res?.error || '发布失败，请稍后再试。');
  };

  const displayedError = localError || externalError;

  const topBarLeft = (
    <button
      type="button"
      onClick={onBack}
      disabled={publishing}
      className="inline-flex items-center gap-1.5 rounded-full border border-zen-ink/15 bg-white/85 px-3 py-1.5 text-[11px] font-extralight uppercase tracking-widest text-zen-ink hover:bg-white disabled:opacity-40"
      aria-label="返回"
    >
      <ArrowLeft size={14} aria-hidden /> 返回
    </button>
  );

  const topBarCenter = editingTitle ? (
    <input
      ref={inputRef}
      type="text"
      value={title}
      onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LEN))}
      onBlur={commitTitle}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitTitle();
        if (e.key === 'Escape') {
          setTitle((prev) => prev.trim() || DEFAULT_TITLE);
          setEditingTitle(false);
        }
      }}
      maxLength={MAX_TITLE_LEN}
      placeholder="为此色卡起一个名字"
      className="w-full max-w-xs rounded-full border border-zen-ink/20 bg-white px-4 py-1.5 text-center font-zenSerif text-sm font-medium tracking-[0.18em] text-zen-ink outline-none focus:border-zen-vermilion/60 focus:ring-2 focus:ring-zen-vermilion/25"
    />
  ) : (
    <button
      type="button"
      onClick={beginEditTitle}
      className={`min-w-0 max-w-full truncate rounded-full px-3 py-1.5 font-zenSerif text-sm font-medium tracking-[0.32em] transition-colors hover:bg-zen-ink/[0.04] ${
        titleIsDefault ? 'text-zen-ink/45' : 'text-zen-ink'
      }`}
      title="点击编辑色卡名称"
      lang="zh-Hans"
    >
      {titleDisplay}
    </button>
  );

  const topBarRight = (
    <button
      type="button"
      onClick={handlePublish}
      disabled={publishing}
      className="inline-flex items-center gap-1.5 rounded-full bg-zen-ink px-4 py-1.5 text-[11px] font-extralight uppercase tracking-widest text-white shadow-sm hover:brightness-110 disabled:opacity-40"
      aria-label="发布"
    >
      {publishing ? <Loader2 className="animate-spin" size={14} aria-hidden /> : <Send size={14} aria-hidden />}
      发布
    </button>
  );

  const bottomSlot = (
    <div className="rounded-2xl border border-zen-ink/10 bg-zen-paper/85 p-4 shadow-sm">
      <p className="mb-2 text-[10px] font-extralight uppercase tracking-widest text-zen-ink/55">
        图片来源 · 必选
      </p>
      <div className="grid grid-cols-2 gap-2">
        <SourceOption
          active={sourceType === 'own_shot'}
          icon={Camera}
          label="我自己拍摄"
          hint="可发布并参加逐日观色"
          onClick={() => {
            setSourceType('own_shot');
            setLocalError(null);
          }}
        />
        <SourceOption
          active={sourceType === 'internet_image'}
          icon={Globe}
          label="网图 / 参考"
          hint="可发布至色海，不参加逐日观色"
          onClick={() => {
            setSourceType('internet_image');
            setSubmitToDailyHunt(false);
            setLocalError(null);
          }}
        />
      </div>

      <label
        className={`mt-3 flex items-start gap-3 rounded-xl border p-3 transition-colors ${
          sourceType === 'own_shot'
            ? 'cursor-pointer border-zen-vermilion/25 bg-zen-vermilion/[0.06]'
            : 'cursor-not-allowed border-zen-ink/10 bg-zen-ink/[0.02] opacity-60'
        }`}
      >
        <input
          type="checkbox"
          className="mt-1 rounded border-zen-ink/25 text-zen-vermilion focus:ring-zen-vermilion/40"
          checked={submitToDailyHunt}
          disabled={sourceType !== 'own_shot'}
          onChange={(e) => setSubmitToDailyHunt(e.target.checked)}
        />
        <span className="text-xs leading-snug text-zen-ink/85">
          <span className="font-semibold text-zen-ink">同时参加逐日观色</span>
          <span className="mt-1 block text-[11px] font-extralight text-zen-ink/55">
            {sourceType === 'own_shot'
              ? '发布至色海的同时，将这张作品投稿到今日的逐日观色作品墙。'
              : '仅 "我自己拍摄" 的作品可以参加逐日观色。'}
          </span>
        </span>
      </label>
    </div>
  );

  const extraBottom = (
    <>
      {displayedError ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border-2 border-red-500 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
        >
          {displayedError}
        </p>
      ) : null}

      {imageSrc ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-center text-[10px] font-extralight uppercase tracking-widest text-zen-ink/45">
            参考图 · 来源
          </p>
          <div className="h-24 w-24 overflow-hidden rounded-xl border border-zen-ink/10 shadow-sm">
            <img src={imageSrc} alt="参考图缩略" className="h-full w-full object-cover" />
          </div>
        </div>
      ) : null}
    </>
  );

  return (
    <ColorCardDetailLayout
      topBarLeft={topBarLeft}
      topBarCenter={topBarCenter}
      topBarRight={topBarRight}
      colors={colors}
      paletteTitle={titleIsDefault ? '' : titleDisplay}
      showPaletteHeading={!titleIsDefault}
      bottomSlot={bottomSlot}
      extraBottom={extraBottom}
    />
  );
}

function SourceOption({ active, icon: Icon, label, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition-colors ${
        active
          ? 'border-zen-ink/70 bg-white shadow-sm ring-2 ring-zen-ink/10'
          : 'border-zen-ink/15 bg-white/70 hover:border-zen-ink/35'
      }`}
    >
      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zen-ink">
        <Icon size={14} aria-hidden />
        {label}
      </span>
      <span className="text-[10px] font-extralight text-zen-ink/55">{hint}</span>
    </button>
  );
}
