import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Download, Link, Send, Loader2, Sparkles, Check } from 'lucide-react';
import {
  paletteTitleFromHexesAndMeta,
  randomPalettePoeticTitleFromHexes,
  PALETTE_TITLE_MAX_LEN,
  PALETTE_TITLE_MIN_LEN,
  clampPaletteTitle,
  isValidPaletteTitle,
} from '../lib/palettePoeticTitle';
import { isDuplicatePublicTitle } from '../lib/palettePublicTitle';
import { enrichColorsWithChineseNames } from '../lib/paletteChineseDisplay';
import { fetchAiPaletteTitle } from '../lib/paletteTitleApi';
import DailySubmitSuccessModal from '../components/DailySubmitSuccessModal';
import SekongPaletteSharePreview from '../components/SekongPaletteSharePreview';

/**
 * 预览与发布页。
 * flow: { type: 'publish', hexes: string[], imageDataUrl: string }
 */
export default function PublishPreviewPage({
  flow,
  user,
  onBack,
  onPublish,
  onDownload,
  onCopyLink,
  onOpenAuth,
  /** 每日一色投稿成功后进入投票池 */
  onGoToDailyVote,
  /** 'colorSea' | 'dailyOneColor' */
  publishTarget = 'colorSea',
  existingPublicTitles = [],
}) {
  const { hexes = [], imageDataUrl, tags: flowTags = [], paletteMeta = {} } = flow;
  const isDailySubmit = publishTarget === 'dailyOneColor';
  const paletteTags = Array.isArray(flowTags) ? flowTags : [];
  const [title, setTitle] = useState('');
  const [titleInitialized, setTitleInitialized] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [titleShake, setTitleShake] = useState(false);
  const [publishedId, setPublishedId] = useState(null);
  const [dailySuccessOpen, setDailySuccessOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const recentTitlesRef = useRef([]);
  const titleInputRef = useRef(null);

  const safeColors = hexes.slice(0, 10);

  const colorDetails = useMemo(
    () => enrichColorsWithChineseNames(safeColors.map((h) => ({ hex: h }))),
    [safeColors],
  );

  const takenTitles = existingPublicTitles;

  useEffect(() => {
    if (titleInitialized || !hexes.length) return;
    const defaultTitle = paletteTitleFromHexesAndMeta(hexes, paletteMeta, paletteTags, takenTitles);
    setTitle(defaultTitle);
    setTitleInitialized(true);
  }, [hexes, paletteMeta, paletteTags, takenTitles, titleInitialized]);

  const isDuplicateTitle = (t) => isDuplicatePublicTitle(t, takenTitles);

  const shakeTitleInput = () => {
    setTitleShake(true);
    setTimeout(() => setTitleShake(false), 450);
    titleInputRef.current?.focus();
  };

  const promptLogin = () => {
    titleInputRef.current?.blur();
    onOpenAuth?.();
    return false;
  };

  const requireAuth = () => (user ? true : promptLogin());

  const generateTitle = async () => {
    if (!requireAuth()) return;
    setGeneratingTitle(true);
    const exclude = [
      ...new Set([
        title.trim(),
        ...recentTitlesRef.current,
        ...takenTitles,
      ].filter(Boolean)),
    ];
    try {
      const aiTitle = await fetchAiPaletteTitle({
        colors: colorDetails,
        tags: paletteTags,
        paletteMeta,
        excludeTitles: exclude,
        currentTitle: title.trim(),
      });
      const t = aiTitle
        || randomPalettePoeticTitleFromHexes(hexes, exclude, paletteMeta, paletteTags);
      if (t) {
        setTitle(t);
        recentTitlesRef.current = [...recentTitlesRef.current, t].slice(-15);
        setPublishError(null);
      }
    } catch {
      const t = randomPalettePoeticTitleFromHexes(hexes, exclude, paletteMeta, paletteTags);
      if (t) {
        setTitle(t);
        recentTitlesRef.current = [...recentTitlesRef.current, t].slice(-15);
      }
    } finally {
      setGeneratingTitle(false);
    }
  };

  const handlePublish = async () => {
    if (!requireAuth()) return;
    if (!isValidPaletteTitle(title)) {
      setPublishError(`请填写 ${PALETTE_TITLE_MIN_LEN}–${PALETTE_TITLE_MAX_LEN} 字的色卡名称。`);
      return;
    }
    if (!isDailySubmit && isDuplicateTitle(title)) {
      setPublishError('色海已有同名色卡，请换一个名称。');
      shakeTitleInput();
      return;
    }
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await onPublish({ title: clampPaletteTitle(title), hexes, imageDataUrl, tags: paletteTags });
      if (res?.ok) {
        setPublishedId(res.id);
        if (isDailySubmit) {
          setDailySuccessOpen(true);
        }
      } else if (res?.error === 'duplicate_title') {
        setPublishError('色海已有同名色卡，请换一个名称。');
        shakeTitleInput();
      } else {
        setPublishError(res?.error || '发布失败，请重试。');
      }
    } catch (e) {
      setPublishError(e.message || '发布失败。');
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = () => {
    if (publishedId) {
      onCopyLink?.(publishedId);
    } else {
      setPublishError(isDailySubmit ? '每日一色投稿暂无公开链接。' : '请先发布色卡，再拷贝链接。');
      return;
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleGoToDailyVote = () => {
    setDailySuccessOpen(false);
    onGoToDailyVote?.();
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-zen-paper overflow-hidden">
      <DailySubmitSuccessModal
        open={isDailySubmit && dailySuccessOpen}
        title={clampPaletteTitle(title)}
        colors={safeColors}
        onGoVote={handleGoToDailyVote}
        onClose={() => setDailySuccessOpen(false)}
      />
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zen-ink/10">
        <button
          type="button"
          onClick={onBack}
          className="type-flow-action hover:text-zen-ink transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={2} aria-hidden />
          上一页
        </button>
        <h1 className="type-flow-title">
          {isDailySubmit ? '预览 · 投稿' : '预览 · 发布'}
        </h1>
        <button
          type="button"
          onClick={handlePublish}
          disabled={publishing || !!publishedId}
          className={`type-flow-action flex items-center gap-1.5 transition-opacity disabled:opacity-40 ${publishedId ? 'text-green-600' : 'text-zen-vermilion hover:opacity-75'}`}
        >
          {publishing ? (
            <Loader2 size={15} strokeWidth={2} className="animate-spin" />
          ) : publishedId ? (
            <Check size={15} strokeWidth={2.5} />
          ) : (
            <Send size={15} strokeWidth={2} />
          )}
          {publishedId
            ? (isDailySubmit ? '已投稿' : '已发布')
            : (isDailySubmit ? '投稿到每日一色' : '发布到色海')}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-5 md:px-6">
          {/* 下载模版预览（与导出 PNG 一致，桌面/移动端放大） */}
          <SekongPaletteSharePreview
            colors={safeColors}
            className="w-full shadow-md"
          />

          {/* Title input */}
          <div>
            <label className="type-overline mb-1.5 block">
              色卡名称
              <span className="ml-2 font-extralight normal-case tracking-normal text-zen-ink/40">
                {PALETTE_TITLE_MIN_LEN}–{PALETTE_TITLE_MAX_LEN} 字
              </span>
            </label>
            <div className="flex gap-2">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                readOnly={!user}
                onChange={(e) => {
                  if (!user) return;
                  setTitle(clampPaletteTitle(e.target.value));
                  setPublishError(null);
                }}
                onFocus={() => {
                  if (!user) promptLogin();
                }}
                onClick={() => {
                  if (!user) promptLogin();
                }}
                placeholder={user ? '如：生椰拿铁、降真香、丰收…' : '点击登录后命名'}
                maxLength={PALETTE_TITLE_MAX_LEN}
                className={`type-body-sm flex-1 rounded-xl border px-3 py-2.5 text-zen-ink placeholder:text-zen-ink/30 focus:outline-none transition-colors ${
                  titleShake ? 'animate-title-shake border-red-400 bg-red-50/40' : 'border-zen-ink/15 bg-zen-mist/20 focus:border-zen-ink/30'
                } ${!user ? 'cursor-pointer' : ''}`}
              />
              <button
                type="button"
                onClick={generateTitle}
                disabled={generatingTitle}
                className="flex items-center gap-1 rounded-xl border border-zen-ink/15 px-3 py-2.5 text-[11px] font-extralight text-zen-ink/60 hover:bg-zen-ink/[0.04] disabled:opacity-40 transition-colors"
                aria-label="AI 生成名称，可多次点击换名"
                title={user ? 'AI 理解配色意境后生成名称，可多次生成' : '登录后生成名称'}
              >
                {generatingTitle
                  ? <Loader2 size={13} strokeWidth={2} className="animate-spin" />
                  : <Sparkles size={13} strokeWidth={2} />}
                <span className="hidden sm:inline">生成</span>
              </button>
            </div>
          </div>

          {/* Palette tags */}
          {paletteTags.length > 0 && (
            <div>
              <p className="type-overline mb-2">
                色卡标签
              </p>
              <div className="flex flex-wrap gap-1.5">
                {paletteTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zen-ink/15 px-2.5 py-1 text-[11px] font-extralight text-zen-ink/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {publishError && (
            <p className="type-body-sm rounded-xl bg-red-50 px-3 py-2.5 text-red-500">
              {publishError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onDownload?.(safeColors.map((h) => ({ hex: h })), title)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-zen-ink/15 py-3 text-[12px] font-extralight text-zen-ink hover:bg-zen-ink/[0.04] transition-colors"
            >
              <Download size={14} strokeWidth={2} aria-hidden />
              下载图片
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-zen-ink/15 py-3 text-[12px] font-extralight text-zen-ink hover:bg-zen-ink/[0.04] transition-colors"
            >
              {linkCopied
                ? <Check size={14} strokeWidth={2.5} className="text-green-600" />
                : <Link size={14} strokeWidth={2} aria-hidden />}
              {linkCopied ? '已复制' : '拷贝链接'}
            </button>
          </div>

          {!user && (
            <p className="type-note text-center">
              {isDailySubmit
                ? '登录后可命名并投稿到每日一色投票池。'
                : '登录后可命名色卡并发布到色海。'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
