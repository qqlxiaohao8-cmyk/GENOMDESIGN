import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Upload, RotateCcw } from 'lucide-react';
import InkWashLoader from './InkWashLoader';
import AnalysisResultView from './AnalysisResultView';
import EditPublishView from './EditPublishView';
import { extractHarmoniousFiveFromDataUrl } from '../../lib/paletteExtract';
import { compressImageDataUrl } from '../../lib/styleImageUpload';

/**
 * 析色 · 整条流程容器（预览 → 墨色分析 → 结果 → 发布）。
 *
 * 状态机：
 *   pick        · 兜底入口：用户经某些跳转直接落地时才看到；点击相机立刻弹出系统选图
 *   confirming  · 展示所选照片，用户点击「上传」进入分析
 *   analyzing   · InkWashLoader 期间调用取色管线
 *   result      · AnalysisResultView：手动 / 策略变体 / 设计学
 *   editing     · EditPublishView：命名 + 来源 + 发布校验
 *
 * 说明：为把「专属 pick 页」收起，App.jsx 会在用户点击「析色」导航按钮时直接开启系统选图，
 * 并通过 `initialImage` 把 data URL 透传进来。拿到 data URL 后我们直接进入 confirming。
 *
 * @param {object} props
 * @param {string | null} [props.initialImage]                      来自外部（App.jsx）的 data URL
 * @param {() => void} [props.onConsumedInitialImage]               内部消费掉后通知父组件清空
 * @param {(payload: {
 *   title: string,
 *   hexes: string[],
 *   sourceType: 'own_shot'|'internet_image',
 *   submitToDailyHunt: boolean,
 *   imageDataUrl: string,
 * }) => Promise<{ ok: boolean, error?: string }>} props.onPublish
 */
export default function ExtractFlowMobile({
  initialImage = null,
  onConsumedInitialImage,
  onPublish,
}) {
  const [stage, setStage] = useState('pick');
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [hexes, setHexes] = useState([]);
  const [stageError, setStageError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const fileInputRef = useRef(null);

  /* ── 消费父级透传的 initialImage ── */
  useEffect(() => {
    if (!initialImage) return;
    setPreviewDataUrl(initialImage);
    setStage('confirming');
    setStageError(null);
    onConsumedInitialImage?.();
  }, [initialImage, onConsumedInitialImage]);

  /* ── 选图 ── */
  const openPicker = useCallback(() => {
    setStageError(null);
    fileInputRef.current?.click();
  }, []);

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('无法读取所选文件'));
      r.readAsDataURL(file);
    });

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type || '')) {
      setStageError('请选择 JPG / PNG / WEBP 图片。');
      return;
    }
    if (file.size > 28 * 1024 * 1024) {
      setStageError('图片过大（需 ≤ 28MB）。');
      return;
    }
    try {
      const raw = await readFileAsDataUrl(file);
      const compressed = await compressImageDataUrl(raw, 3200, 0.88);
      setPreviewDataUrl(compressed);
      setStage('confirming');
      setStageError(null);
    } catch (err) {
      setStageError(err?.message || '处理图片失败。');
    }
  }, []);

  /* ── 上传并分析：使用「多彩和谐」策略作为默认初次结果 ── */
  const handleUpload = useCallback(async () => {
    if (!previewDataUrl) return;
    setStage('analyzing');
    setStageError(null);
    try {
      const out = await extractHarmoniousFiveFromDataUrl(previewDataUrl);
      if (!Array.isArray(out) || out.length < 5) throw new Error('取色失败，请换一张图再试。');
      setHexes(out.slice(0, 5));
      setStage('result');
    } catch (err) {
      setStageError(err?.message || '取色失败，请重试。');
      setStage('confirming');
    }
  }, [previewDataUrl]);

  /* ── 返回 / 重置 ── */
  const reset = useCallback(() => {
    setStage('pick');
    setPreviewDataUrl(null);
    setHexes([]);
    setStageError(null);
    setPublishError(null);
    setPublishing(false);
  }, []);

  const backFromResult = useCallback(() => {
    setStage('confirming');
  }, []);

  const backFromEditing = useCallback(() => {
    setStage('result');
    setPublishError(null);
  }, []);

  /* ── 发布 ── */
  const handlePublish = useCallback(
    async (payload) => {
      if (!previewDataUrl) return { ok: false, error: '缺少图片数据。' };
      setPublishing(true);
      setPublishError(null);
      try {
        const res = await onPublish?.({ ...payload, imageDataUrl: previewDataUrl });
        if (res?.ok) {
          reset();
          return { ok: true };
        }
        setPublishError(res?.error || '发布失败。');
        return { ok: false, error: res?.error || '发布失败。' };
      } catch (err) {
        setPublishError(err?.message || '发布失败。');
        return { ok: false, error: err?.message || '发布失败。' };
      } finally {
        setPublishing(false);
      }
    },
    [onPublish, previewDataUrl, reset]
  );

  /* ── 视图 ── */
  if (stage === 'analyzing') {
    return (
      <div className="flex h-full w-full min-h-0 flex-1">
        <InkWashLoader />
      </div>
    );
  }

  if (stage === 'result') {
    return (
      <AnalysisResultView
        imageSrc={previewDataUrl}
        hexes={hexes}
        onHexesChange={setHexes}
        onBack={backFromResult}
        onConfirm={() => setStage('editing')}
      />
    );
  }

  if (stage === 'editing') {
    return (
      <EditPublishView
        imageSrc={previewDataUrl}
        hexes={hexes}
        onBack={backFromEditing}
        onPublish={handlePublish}
        publishing={publishing}
        externalError={publishError}
      />
    );
  }

  /* pick / confirming 共享背景（pick 为兜底状态） */
  return (
    <div className="flex h-full w-full min-h-0 flex-1 flex-col bg-zen-mist">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-10 pt-6">
        <p className="mb-2 text-[10px] font-extralight uppercase tracking-[0.35em] text-zen-ink/45">
          Extract · Workspace
        </p>
        <h1 className="mb-8 font-zenSerif text-4xl font-semibold tracking-tight text-zen-ink sm:text-5xl">
          析色
        </h1>

        {stage === 'pick' ? (
          <div className="flex w-full max-w-sm flex-col items-center gap-5">
            <button
              type="button"
              onClick={openPicker}
              className="group relative flex h-32 w-32 items-center justify-center rounded-full border border-zen-ink/20 bg-zen-paper/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-all hover:border-zen-vermilion/60 hover:shadow-md sm:h-40 sm:w-40"
              aria-label="打开相机或相册"
            >
              <span className="absolute inset-2 rounded-full border border-zen-ink/10 transition-colors group-hover:border-zen-vermilion/30" aria-hidden />
              <Camera size={44} className="text-zen-ink/75 transition-colors group-hover:text-zen-ink" aria-hidden />
            </button>
            <p className="text-center font-zenSerif text-base font-medium text-zen-ink">
              选一张照片开始析色
            </p>
          </div>
        ) : (
          <div className="flex w-full max-w-xl flex-col items-center gap-4">
            <div className="w-full overflow-hidden rounded-2xl border border-zen-ink/10 bg-zen-paper/70 shadow-sm">
              <img
                src={previewDataUrl}
                alt="待上传图片"
                className="block h-auto max-h-[58dvh] w-full object-contain"
              />
            </div>
            <div className="flex w-full items-center justify-center gap-2">
              <button
                type="button"
                onClick={openPicker}
                className="inline-flex items-center gap-1.5 rounded-full border border-zen-ink/15 bg-white/85 px-4 py-2 text-[11px] font-extralight uppercase tracking-widest text-zen-ink hover:bg-white"
              >
                <RotateCcw size={14} aria-hidden /> 重新选择
              </button>
              <button
                type="button"
                onClick={handleUpload}
                className="inline-flex items-center gap-1.5 rounded-full bg-zen-ink px-5 py-2 text-[11px] font-extralight uppercase tracking-widest text-white shadow-sm hover:brightness-110"
              >
                <Upload size={14} aria-hidden /> 上传
              </button>
            </div>
          </div>
        )}

        {stageError ? (
          <p className="mt-6 max-w-md rounded-2xl border-2 border-red-500 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700" role="alert">
            {stageError}
          </p>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
