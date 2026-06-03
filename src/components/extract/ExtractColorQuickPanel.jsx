import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Check,
  Pipette,
  Trash2,
  Sparkles,
  RefreshCw,
  ZoomIn,
  GripVertical,
} from 'lucide-react';
import { sampleHexAtNormalizedPoint } from '../../lib/dominantColors';
import { fetchColorCardMetadata, fallbackColorCardMetadata } from '../../lib/colorCardAi';
import { HARMONY_TYPES, harmonyPaletteFive, buildCardHexesFromCustomPicks } from '../../lib/colorHarmony';
import PaletteRefinementWorkspace from '../PaletteRefinementWorkspace';
function clientToNormalized(clientX, clientY, imgEl) {
  if (!imgEl) return null;
  const ir = imgEl.getBoundingClientRect();
  const nw = imgEl.naturalWidth;
  const nh = imgEl.naturalHeight;
  if (!nw || !nh) return null;
  const scale = Math.min(ir.width / nw, ir.height / nh);
  const dw = nw * scale;
  const dh = nh * scale;
  const left = ir.left + (ir.width - dw) / 2;
  const top = ir.top + (ir.height - dh) / 2;
  const x = clientX - left;
  const y = clientY - top;
  if (x < 0 || y < 0 || x > dw || y > dh) return null;
  return { nx: x / dw, ny: y / dh };
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function cardFromHexes(hexes, apiKey, baseUrl, model) {
  const list = (hexes || []).slice(0, 5);
  while (list.length < 5) list.push('#808080');
  if (apiKey) {
    try {
      return await fetchColorCardMetadata({ apiKey, baseUrl, model, hexes: list });
    } catch (e) {
      console.warn('Naming failed', e);
    }
  }
  return fallbackColorCardMetadata(list);
}

export default function ExtractColorQuickPanel({
  imageSrc,
  colorCard,
  onColorCardChange,
  lowVariance,
  pairHexes,
  onBack,
  onAiAnalyze,
  onOpenSaveModal,
  onRefinementFinalize,
  copyToClipboard,
  copyStatusId,
  deepseekApiKey,
  deepseekBaseUrl,
  deepseekModel,
  aiAnalyzeDisabled,
  inspireLinkSlot = null,
}) {
  const imgRef = useRef(null);
  const wrapRef = useRef(null);
  const imagePickDraggingRef = useRef(false);
  const imagePickMovedRef = useRef(false);
  const imagePickLastRef = useRef({ x: 0, y: 0 });
  const [pickMode, setPickMode] = useState(false);
  const prevPickModeRef = useRef(false);
  const [magPos, setMagPos] = useState(null);
  const [draggingLoupe, setDraggingLoupe] = useState(false);
  const [previewHex, setPreviewHex] = useState(null);
  const [harmonyType, setHarmonyType] = useState('analogous');
  const [harmonySeed, setHarmonySeed] = useState(0);
  const [harmonyPreview, setHarmonyPreview] = useState(null);
  const [harmonyPreviewShowsOriginal, setHarmonyPreviewShowsOriginal] = useState(false);
  const [harmonyWarn, setHarmonyWarn] = useState(null);
  const [harmonyBusy, setHarmonyBusy] = useState(false);
  const [customRows, setCustomRows] = useState([]);
  const [toast, setToast] = useState(null);

  const colors = colorCard?.colors || [];

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((msg) => setToast(msg), []);

  const baseHex = colors[0]?.hex || '#808080';

  const runHarmonyPreview = useCallback(async () => {
    setHarmonyPreviewShowsOriginal(false);
    const { hexes, neutralWarn } = harmonyPaletteFive(baseHex, harmonyType, harmonySeed);
    setHarmonyWarn(neutralWarn);
    setHarmonyBusy(true);
    try {
      const card = await cardFromHexes(hexes, deepseekApiKey, deepseekBaseUrl, deepseekModel);
      setHarmonyPreview({ hexes, card });
    } finally {
      setHarmonyBusy(false);
    }
  }, [baseHex, harmonyType, harmonySeed, deepseekApiKey, deepseekBaseUrl, deepseekModel]);

  useEffect(() => {
    void runHarmonyPreview();
  }, [runHarmonyPreview]);

  useEffect(() => {
    if (prevPickModeRef.current && !pickMode) {
      void runHarmonyPreview();
    }
    prevPickModeRef.current = pickMode;
  }, [pickMode, runHarmonyPreview]);

  const sampleAtClient = useCallback(
    (cx, cy) => {
      if (!imgRef.current) return;
      const norm = clientToNormalized(cx, cy, imgRef.current);
      if (norm && /^data:image\//.test(imageSrc)) {
        sampleHexAtNormalizedPoint(imageSrc, norm.nx, norm.ny)
          .then(setPreviewHex)
          .catch(() => setPreviewHex(null));
      } else {
        setPreviewHex(null);
      }
    },
    [imageSrc]
  );

  const copyHex = useCallback(
    (hex, id) => {
      copyToClipboard(hex, id);
      showToast(`已复制 ${hex}`);
    },
    [copyToClipboard, showToast]
  );

  const onWrapPointerMove = (e) => {
    if (draggingLoupe) {
      onLoupePointerMove(e);
      return;
    }
    if (pickMode && imagePickDraggingRef.current && imgRef.current) {
      const cx = e.clientX;
      const cy = e.clientY;
      const dx = cx - imagePickLastRef.current.x;
      const dy = cy - imagePickLastRef.current.y;
      if (dx * dx + dy * dy > 36) imagePickMovedRef.current = true;
      imagePickLastRef.current = { x: cx, y: cy };
      setMagPos({ x: cx, y: cy });
      sampleAtClient(cx, cy);
      return;
    }
    if (!pickMode || !imgRef.current) return;
    const cx = e.clientX;
    const cy = e.clientY;
    setMagPos({ x: cx, y: cy });
    sampleAtClient(cx, cy);
  };

  const onWrapPointerDown = (e) => {
    if (!pickMode || draggingLoupe) return;
    if (e.button !== 0) return;
    if (e.target.closest?.('[data-pick-loupe]')) return;
    if (!imgRef.current || !/^data:image\//.test(imageSrc)) return;
    const norm = clientToNormalized(e.clientX, e.clientY, imgRef.current);
    if (!norm) return;
    imagePickDraggingRef.current = true;
    imagePickMovedRef.current = false;
    imagePickLastRef.current = { x: e.clientX, y: e.clientY };
    try {
      wrapRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setMagPos({ x: e.clientX, y: e.clientY });
    sampleAtClient(e.clientX, e.clientY);
  };

  const endImagePickDrag = (e, clientX, clientY) => {
    if (!imagePickDraggingRef.current) return;
    const wasTap = !imagePickMovedRef.current;
    imagePickDraggingRef.current = false;
    try {
      wrapRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (wasTap && /^data:image\//.test(imageSrc)) {
      void pickAt(clientX, clientY);
    }
  };

  const onWrapPointerUp = (e) => {
    if (draggingLoupe) {
      onLoupePointerUp(e);
      return;
    }
    endImagePickDrag(e, e.clientX, e.clientY);
  };

  const onWrapPointerCancel = (e) => {
    if (draggingLoupe) {
      onLoupePointerUp(e);
      return;
    }
    if (imagePickDraggingRef.current) {
      imagePickDraggingRef.current = false;
      try {
        wrapRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const onLoupePointerDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingLoupe(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const cx = e.clientX;
    const cy = e.clientY;
    setMagPos({ x: cx, y: cy });
    sampleAtClient(cx, cy);
  };

  const onLoupePointerMove = (e) => {
    if (!draggingLoupe) return;
    const cx = e.clientX;
    const cy = e.clientY;
    setMagPos({ x: cx, y: cy });
    sampleAtClient(cx, cy);
  };

  const onLoupePointerUp = (e) => {
    setDraggingLoupe(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const pickAt = async (clientX, clientY) => {
    const norm = clientToNormalized(clientX, clientY, imgRef.current);
    if (!norm || !/^data:image\//.test(imageSrc)) return;
    const hex = await sampleHexAtNormalizedPoint(imageSrc, norm.nx, norm.ny);
    setCustomRows((rows) => {
      if (rows.length >= 10) {
        showToast('自定义颜色最多 10 个');
        return rows;
      }
      return [...rows, { id: uid(), hex }];
    });
    showToast(`已吸取 ${hex}`);
  };

  const removeCustom = (id) => setCustomRows((rows) => rows.filter((r) => r.id !== id));

  const moveCustom = (from, to) => {
    setCustomRows((rows) => {
      if (to < 0 || to >= rows.length) return rows;
      const next = [...rows];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const generateFromCustom = async (replace) => {
    if (!customRows.length) {
      showToast('请先吸取或添加自定义颜色');
      return;
    }
    const picks = customRows.map((r) => r.hex);
    const { hexes, neutralWarn } = buildCardHexesFromCustomPicks(picks, harmonyType, harmonySeed);
    setHarmonyWarn(neutralWarn);
    setHarmonyBusy(true);
    try {
      const card = await cardFromHexes(hexes, deepseekApiKey, deepseekBaseUrl, deepseekModel);
      if (replace) {
        onColorCardChange(card);
        showToast('已用自定义基准生成并替换色卡');
      } else {
        setHarmonyPreview({ hexes, card });
        setHarmonyPreviewShowsOriginal(false);
        showToast('已生成预览，可在下方替换主色卡');
      }
    } finally {
      setHarmonyBusy(false);
    }
  };

  const displayColors = colors;
  const heroPair = lowVariance && pairHexes?.length === 2 ? pairHexes : null;

  const pointerHarmonyHexes = useMemo(() => {
    if (!pickMode || !previewHex) return null;
    try {
      return harmonyPaletteFive(previewHex, harmonyType, harmonySeed).hexes;
    } catch {
      return null;
    }
  }, [pickMode, previewHex, harmonyType, harmonySeed]);

  const applyHarmonyAsMain = async () => {
    if (harmonyPreviewShowsOriginal) return;
    if (pickMode && previewHex && pointerHarmonyHexes?.length === 5) {
      setHarmonyBusy(true);
      try {
        const card = await cardFromHexes(
          pointerHarmonyHexes,
          deepseekApiKey,
          deepseekBaseUrl,
          deepseekModel
        );
        onColorCardChange(card);
        setHarmonyPreviewShowsOriginal(false);
        showToast('已用当前指针取样的和谐方案替换主色卡');
      } finally {
        setHarmonyBusy(false);
      }
      return;
    }
    if (!harmonyPreview?.card) return;
    onColorCardChange(harmonyPreview.card);
    setHarmonyPreviewShowsOriginal(false);
    showToast('已用当前色卡类型替换主色卡');
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {toast ? (
        <div
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[150] px-4 py-2 rounded-full bg-zen-ink text-white text-xs font-extralight shadow-lg"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zen-ink/15 text-[10px] font-extralight uppercase tracking-widest text-zen-ink hover:bg-zen-ink/[0.04]"
        >
          <ArrowLeft size={16} />
          重新上传
        </button>
      </div>

      {inspireLinkSlot}

      {lowVariance ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50/90 text-amber-950 text-sm px-4 py-3 leading-relaxed">
          画面几乎无明显色相变化（如接近纯黑、纯白或灰阶）。以下<strong>主色 · 辅色</strong>
          由最暗与最亮采样得到，其余为阶调补充，仍可保存与继续编辑。
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
        {/* 左侧：图片 + 吸管 */}
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !pickMode;
                setPickMode(next);
                setMagPos(null);
                setDraggingLoupe(false);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-extralight uppercase tracking-widest transition-all touch-manipulation min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 ${
                pickMode
                  ? 'border-zen-vermilion bg-zen-vermilion text-white'
                  : 'border-zen-ink/15 bg-zen-paper text-zen-ink hover:bg-zen-ink/[0.04]'
              }`}
            >
              <Pipette size={16} aria-hidden />
              {pickMode ? '关闭手动取色' : '手动取色'}
            </button>
            {pickMode ? (
              <span className="text-[10px] text-zen-ink/50 flex items-center gap-1">
                <ZoomIn size={14} aria-hidden />
                在图上按住拖动可移动取色器，右侧和谐预览随指针更新；轻点一次将颜色加入下方列表（最多 10 个）。也可拖动圆环。
              </span>
            ) : (
              <span className="text-[10px] text-zen-ink/45">
                点按开启：同页展开手动取色与精细调色；关闭后将按当前主色刷新下方和谐预览。
              </span>
            )}
          </div>
          <div
            ref={wrapRef}
            className={`relative rounded-2xl border border-zen-ink/10 bg-zen-mist overflow-hidden ${
              pickMode ? 'cursor-crosshair touch-none' : ''
            }`}
              onPointerDown={onWrapPointerDown}
              onPointerMove={onWrapPointerMove}
              onPointerUp={onWrapPointerUp}
              onPointerCancel={onWrapPointerCancel}
              onPointerLeave={() => {
                if (pickMode && !draggingLoupe && !imagePickDraggingRef.current) setMagPos(null);
              }}
            >
            <img
              ref={imgRef}
              src={imageSrc}
              alt=""
              className="w-full h-auto max-h-[min(72vh,640px)] object-contain mx-auto block select-none"
              draggable={false}
            />
            {pickMode && magPos ? (
              <div
                role="presentation"
                data-pick-loupe
                aria-label="取色圆环，拖动移动圆心采样"
                className="fixed z-[140] w-24 h-24 rounded-full border-2 border-white shadow-xl overflow-hidden cursor-grab active:cursor-grabbing touch-none"
                style={{
                  left: magPos.x,
                  top: magPos.y,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: previewHex || 'rgba(0,0,0,0.15)',
                }}
                onPointerDown={onLoupePointerDown}
                onPointerMove={onLoupePointerMove}
                onPointerUp={onLoupePointerUp}
                onPointerCancel={onLoupePointerUp}
              >
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zen-ink/40 bg-white shadow-sm"
                  aria-hidden
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* 右侧：色块 */}
        <div className="space-y-6 min-w-0">
          <div>
            <p className="zen-micro-label mb-3 text-zen-ink/50">自动提取 · 和谐色卡</p>
            {heroPair ? (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {heroPair.map((hex, i) => (
                  <div key={hex + i} className="rounded-2xl border border-zen-ink/10 overflow-hidden">
                    <div className="h-24 md:h-28" style={{ backgroundColor: hex }} />
                    <div className="p-3 flex items-center justify-between gap-2 bg-zen-paper">
                      <span className="font-mono text-xs tabular-nums">{hex}</span>
                      <button
                        type="button"
                        onClick={() => copyHex(hex, `quick-${hex}-${i}`)}
                        className="p-2 rounded-full border border-zen-ink/10 hover:bg-zen-ink/[0.04]"
                        aria-label="复制"
                      >
                        {copyStatusId === `quick-${hex}-${i}` ? (
                          <Check size={16} className="text-green-700" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className={`grid gap-2 ${heroPair ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-5'}`}>
              {(heroPair ? displayColors.slice(2) : displayColors).map((c, i) => {
                const hex = c.hex;
                const idx = heroPair ? i + 2 : i;
                const hid = `sw-${hex}-${idx}`;
                return (
                  <div key={hid} className="rounded-xl border border-zen-ink/10 overflow-hidden flex flex-col">
                    <div className="h-16 sm:h-20 shrink-0" style={{ backgroundColor: hex }} title={c.name} />
                    <div className="p-1.5 flex flex-col gap-1 bg-zen-paper">
                      <span className="font-mono text-[10px] tabular-nums truncate">{hex}</span>
                      <button
                        type="button"
                        onClick={() => copyHex(hex, hid)}
                        className="flex items-center justify-center gap-1 py-1 rounded-lg border border-zen-ink/10 text-[9px] uppercase tracking-wider hover:bg-zen-ink/[0.04]"
                      >
                        {copyStatusId === hid ? <Check size={12} /> : <Copy size={12} />}
                        复制
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {heroPair ? (
              <p className="text-[10px] text-zen-ink/45 mt-2">上列为两极主色；下列为阶调补充。</p>
            ) : null}
          </div>

          {/* 色卡类型 */}
          <div className="rounded-2xl border border-zen-ink/10 bg-zen-paper/80 p-4">
            <p className="text-[10px] font-extralight uppercase tracking-[0.2em] text-zen-vermilion/90 mb-2">
              生成色卡类型
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {HARMONY_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setHarmonyType(t.id);
                    setHarmonySeed((s) => s + 1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-extralight border transition-all ${
                    harmonyType === t.id
                      ? 'border-zen-ink bg-zen-ink text-white'
                      : 'border-zen-ink/15 text-zen-ink/80 hover:bg-zen-ink/[0.04]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setHarmonySeed((s) => s + 1)}
                disabled={harmonyBusy}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-zen-ink/15 text-[10px] font-extralight hover:bg-zen-ink/[0.04] disabled:opacity-40"
              >
                <RefreshCw size={12} className={harmonyBusy ? 'animate-spin' : ''} />
                再生成
              </button>
            </div>
            {harmonyWarn ? <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">{harmonyWarn}</p> : null}
            {harmonyPreview?.card || (pickMode && previewHex && pointerHarmonyHexes) ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] text-zen-ink/45 shrink-0">
                    {harmonyPreviewShowsOriginal
                      ? '预览（当前自动提取色卡）'
                      : pickMode && previewHex && pointerHarmonyHexes
                        ? '预览（当前指针取样 — 拖动图片时同步更新）'
                        : '预览（基于当前主色第一色的和谐方案）'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setHarmonyPreviewShowsOriginal((v) => !v)}
                    disabled={!harmonyPreview?.card}
                    className="px-3 py-1 rounded-full border border-zen-ink/15 text-[10px] font-extralight text-zen-ink/80 hover:bg-zen-ink/[0.04] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {harmonyPreviewShowsOriginal ? '回到和谐预览' : '预览原始色卡'}
                  </button>
                </div>
                <div className="flex gap-1">
                  {(harmonyPreviewShowsOriginal
                    ? colors
                    : pickMode && previewHex && pointerHarmonyHexes
                      ? pointerHarmonyHexes.map((hex) => ({ hex, name: '' }))
                      : harmonyPreview?.card?.colors ?? []
                  ).map((c, i) => (
                    <button
                      key={`hp-${harmonyPreviewShowsOriginal ? 'orig' : pickMode && previewHex && pointerHarmonyHexes ? 'ptr' : 'har'}-${i}-${c.hex}`}
                      type="button"
                      onClick={() => copyHex(c.hex, `hp-${i}-${c.hex}`)}
                      className="flex-1 min-w-0 h-14 rounded-lg border border-zen-ink/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-zen-vermilion/50"
                      style={{ backgroundColor: c.hex }}
                      title={`${c.hex} 点击复制`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void applyHarmonyAsMain()}
                  disabled={
                    harmonyBusy ||
                    harmonyPreviewShowsOriginal ||
                    (!harmonyPreview?.card && !(pickMode && previewHex && pointerHarmonyHexes?.length === 5))
                  }
                  className="mt-2 w-full sm:w-auto px-4 py-2 rounded-full border border-zen-vermilion/40 text-[10px] font-extralight uppercase tracking-widest text-zen-vermilion hover:bg-zen-vermilion/10 disabled:opacity-40 disabled:pointer-events-none"
                >
                  用当前和谐方案替换原始色卡
                </button>
              </div>
            ) : harmonyBusy ? (
              <p className="text-xs text-zen-ink/45">生成预览中…</p>
            ) : null}
          </div>

          {/* 自定义颜色 */}
          <div className="rounded-2xl border border-dashed border-zen-ink/20 p-4 bg-zen-mist/40">
            <p className="text-[10px] font-extralight uppercase tracking-[0.2em] text-zen-ink/50 mb-2">
              自定义颜色 · 拖动排序
            </p>
            {customRows.length === 0 ? (
              <p className="text-xs text-zen-ink/45">开启「手动取色」后，在图上轻点一下将当前取样加入列表；拖动时可在上方预览和谐五色。</p>
            ) : (
              <ul className="space-y-2 mb-3">
                {customRows.map((row, i) => (
                  <li
                    key={row.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = Number(e.dataTransfer.getData('text/plain'));
                      if (!Number.isNaN(from)) moveCustom(from, i);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-zen-ink/10 bg-white px-2 py-2"
                  >
                    <GripVertical size={16} className="text-zen-ink/25 shrink-0 cursor-grab" />
                    <span className="w-8 h-8 rounded-lg border border-zen-ink/10 shrink-0" style={{ backgroundColor: row.hex }} />
                    <span className="font-mono text-xs flex-1 truncate">{row.hex}</span>
                    <button
                      type="button"
                      onClick={() => removeCustom(row.id)}
                      className="p-2 rounded-full text-zen-ink/40 hover:bg-red-50 hover:text-red-800"
                      aria-label="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void generateFromCustom(false)}
                disabled={harmonyBusy}
                className="px-4 py-2 rounded-full border border-zen-ink/15 text-[10px] font-extralight uppercase tracking-widest hover:bg-zen-ink/[0.04] disabled:opacity-40"
              >
                基于所选生成预览
              </button>
              <button
                type="button"
                onClick={() => void generateFromCustom(true)}
                disabled={harmonyBusy}
                className="px-4 py-2 rounded-full border border-zen-ink/15 bg-zen-ink text-white text-[10px] font-extralight uppercase tracking-widest disabled:opacity-40"
              >
                替换自动色卡
              </button>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
            <button type="button" onClick={onOpenSaveModal} className="btn-primary px-6 py-3 rounded-xl text-[11px]">
              保存色卡
            </button>
            <button
              type="button"
              onClick={onAiAnalyze}
              disabled={aiAnalyzeDisabled}
              className="btn-art px-6 py-3 rounded-xl text-[10px] disabled:opacity-40"
            >
              <Sparkles size={16} />
              AI 分析
            </button>
          </div>
        </div>

        {pickMode && onRefinementFinalize ? (
          <div className="col-span-1 lg:col-span-2 mt-4 lg:mt-2 pt-8 lg:pt-10 border-t border-zen-ink/10 scroll-mt-[max(5rem,env(safe-area-inset-top,0px))]">
            <PaletteRefinementWorkspace
              imageSrc={imageSrc}
              initialSwatches={colors}
              deepseekApiKey={deepseekApiKey}
              deepseekBaseUrl={deepseekBaseUrl}
              deepseekModel={deepseekModel}
              onFinalize={onRefinementFinalize}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
