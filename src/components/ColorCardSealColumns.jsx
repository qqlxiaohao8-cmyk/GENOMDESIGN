import React, { useMemo, useState, useEffect } from 'react';
import { Camera, Copy, Lock, Check } from 'lucide-react';
import sealChatgptSvg from '../assets/color-card-seal-chatgpt.svg?raw';
import sealSekaSvg from '../assets/color-card-seal-seka.svg?raw';
import { uniquePoeticNamesForSwatches } from '../lib/poeticColorNaming';
import { normalizeHex } from '../lib/randomInspiration';
import { palettePoeticTitleFromHexes } from '../lib/palettePoeticTitle';
import { pickReadableTextOnHex } from '../lib/colorValues';

/** 与 `color-card-seal-chatgpt.svg` 一致（viewBox 0 0 1024 1536）；模版内深色 `fill="#000000"` 替换为色值。 */
export const SEAL_VECTOR_VIEWBOX = '0 0 1024 1536';

/** 色卡.svg viewBox（845 × 1862） */
const SEKA_VIEWBOX = '0 0 845 1862';
const SEKA_FO_X = 80;
const SEKA_FO_W = 685;
const SEKA_FO_Y = 200;
const SEKA_FO_H = 1462;

/** 仅保留中央色名时的 foreignObject 区域（viewBox 坐标）。 */
const FO_X = 96;
const FO_W = 832;
const FO_Y = 160;
const FO_H = 1216;

/** 去掉 XML 声明、DOCTYPE、根 `<svg>`，只保留内部图案 `<g>…</g>`。 */
function extractSealSvgInner(raw) {
  return raw
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<svg\b[\s\S]*?>/, '')
    .replace(/<\/svg>\s*$/i, '')
    .trim();
}

const SEAL_TEMPLATE_INNER = extractSealSvgInner(sealChatgptSvg);
const SEKA_TEMPLATE_INNER = extractSealSvgInner(sealSekaSvg);

/** @param {string} swatchHex */
function sealVectorInnerHtml(swatchHex) {
  const fill = normalizeHex(swatchHex);
  return SEAL_TEMPLATE_INNER.replace(/fill="#000000"/gi, `fill="${fill}"`);
}

function sekaVectorInnerHtml(swatchHex) {
  const fill = normalizeHex(swatchHex);
  return SEKA_TEMPLATE_INNER.replace(/fill="#000000"/gi, `fill="${fill}"`);
}

function SealColumnBody({ hexRaw, zh }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={400}
      className="pointer-events-none absolute inset-y-0 left-1/2 h-full w-[400px] min-w-[400px] max-w-[400px] -translate-x-1/2"
      viewBox={SEAL_VECTOR_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <g dangerouslySetInnerHTML={{ __html: sealVectorInnerHtml(hexRaw) }} />
      <foreignObject x={FO_X} y={FO_Y} width={FO_W} height={FO_H}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className="font-zenSerif flex h-full items-center justify-center px-2 text-white [box-sizing:border-box] [text-shadow:0_4px_28px_rgba(0,0,0,0.45)]"
        >
          <span
            className="text-center text-[clamp(2.25rem,8.25vmin,6.85rem)] font-semibold leading-[1.28] tracking-[0.26em] sm:tracking-[0.32em]"
            style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
            lang="zh-Hans"
          >
            {zh}
          </span>
        </div>
      </foreignObject>
    </svg>
  );
}

/**
 * 移动端横向色卡列：使用 色卡.svg 图案。
 *  - 默认 `meet`：SVG 完整入画，边角不被裁切（适用于等比例列表卡）。
 *  - fillHeight=true：`slice`，SVG 按色彩主体拉至列高占满，左右各裁掉一小条外缘装饰——
 *    配合 2/3 屏高的色卡区，色卡.svg 图案始终铺满且不被压缩变形。
 */
function SekaMobileColumnBody({ hexRaw, zh, fillHeight = false }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none block h-full w-full"
      viewBox={SEKA_VIEWBOX}
      preserveAspectRatio={fillHeight ? 'xMidYMid slice' : 'xMidYMid meet'}
      aria-hidden
    >
      <g dangerouslySetInnerHTML={{ __html: sekaVectorInnerHtml(hexRaw) }} />
      <foreignObject x={SEKA_FO_X} y={SEKA_FO_Y} width={SEKA_FO_W} height={SEKA_FO_H}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className="font-zenSerif flex h-full items-center justify-center px-0.5 text-white [box-sizing:border-box] [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]"
        >
          <span
            className="text-center text-[clamp(0.95rem,6vmin,1.55rem)] font-semibold leading-[1.28] tracking-[0.12em] sm:tracking-[0.16em]"
            style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
            lang="zh-Hans"
          >
            {zh}
          </span>
        </div>
      </foreignObject>
    </svg>
  );
}

/**
 * 移动端：5 列 色卡.svg 同屏平铺。
 * 关键点：
 *  - 5 列等分行宽（`flex: 1 1 0`），列高由 SVG 比例 845:1862 自然推出，不设固定高度，
 *    因此 5 列始终能完整出现在视口中，不再横向滚动；
 *  - 行容器 `items-center` 垂直居中，容器高度若大于列高则留出等量上下留白；
 *  - SVG `preserveAspectRatio="xMidYMid meet"` 完整展示，不裁切；
 *  - 列间 gap 与左右 padding 配合，保持等距且互不接触。
 */
function MobileSekaColumns({
  list,
  swatchZh,
  paletteTitle,
  showPaletteHeading,
  className = '',
  interactive,
  fillParent = false,
  locked,
  onCopyHex,
  onToggleLock,
  onShoot,
  _copiedHex,
}) {
  // 色卡之间只留 2px 的可见细缝，四边几乎无内边距 ——
  // 让 5 张色卡被拉到最大又不会互相触碰。
  const ROW_PAD_Y = 0;
  const COL_GAP = 2;
  const COL_PAD_X = 0;

  const wrapperClass = interactive || fillParent
    ? 'flex min-h-0 min-w-0 h-full w-full flex-1 flex-col overflow-hidden'
    : 'flex h-[min(96vh,calc(100dvh-3.75rem))] w-full min-w-0 max-w-full shrink-0 flex-col overflow-hidden';

  return (
    <div className={wrapperClass}>
      {showPaletteHeading ? (
        <p
          className="pointer-events-none shrink-0 px-3 pb-1 pt-0 text-center font-zenSerif text-xs font-medium tracking-[0.36em] text-zen-ink/88"
          lang="zh-Hans"
        >
          {paletteTitle}
        </p>
      ) : null}
      <div
        className={[
          'flex min-h-0 flex-1 shrink-0 flex-nowrap items-center justify-center overflow-hidden',
          className,
        ].filter(Boolean).join(' ')}
        style={{ gap: COL_GAP, paddingLeft: COL_PAD_X, paddingRight: COL_PAD_X, paddingTop: ROW_PAD_Y, paddingBottom: ROW_PAD_Y }}
      >
        {list.map((c, i) => {
          const hexRaw = typeof c.hex === 'string' ? c.hex : '#888888';
          const hex = hexRaw.toUpperCase().startsWith('#') ? hexRaw.toUpperCase() : `#${hexRaw.toUpperCase()}`;
          const zh = swatchZh[i] || '';
          const isLocked = !!(locked && locked[i]);
          const swatchHex = normalizeHex(hexRaw);
          const onSwatch = pickReadableTextOnHex(swatchHex);
          const isCopied = _copiedHex?.toUpperCase() === hex?.toUpperCase();
          const actionBorder =
            onSwatch.toUpperCase() === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.35)';
          const actionBtnStyle = {
            backgroundColor: swatchHex,
            color: onSwatch,
            borderColor: actionBorder,
            ['--tw-ring-offset-color']: swatchHex,
          };
          const actionBtnBase =
            'pointer-events-auto flex h-5 w-5 items-center justify-center rounded-full border shadow-md transition-[filter,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';
          /* 列尺寸：
             - fillParent（编辑/色海/空生色 详情页）：每列铺满父级高（由外壳定为 2/3 视口），
               5 列等分行宽；内部 色卡.svg 以 slice 模式拉满，不变形；
             - 默认（卡片预览等）：保持 845:1862 原始比例，不超过父级高度。 */
          const colStyle = fillParent
            ? {
                flex: '1 1 0',
                minWidth: 0,
                height: '100%',
                backgroundColor: swatchHex,
              }
            : {
                flex: '1 1 0',
                minWidth: 0,
                maxHeight: '100%',
                aspectRatio: '845 / 1862',
              };

          if (interactive) {
            return (
              <div
                key={`mob-${i}-${hex}`}
                style={colStyle}
                className="group relative isolate h-full min-h-0 overflow-hidden"
              >
                <SekaMobileColumnBody hexRaw={hexRaw} zh={zh} fillHeight={fillParent} />
                <div className="pointer-events-none absolute inset-x-0 bottom-0.5 z-[3] flex flex-col items-center gap-0.5 px-0.5">
                  <span className="rounded-full bg-black/35 px-1 py-[1px] text-[7px] font-mono text-white/95 tracking-tight backdrop-blur-sm">
                    {isCopied ? '✓' : hex}
                  </span>
                  <div className="pointer-events-auto flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onCopyHex?.({ ...c, hex: hexRaw }); }}
                      style={actionBtnStyle}
                      className={`${actionBtnBase} hover:brightness-95 focus-visible:ring-white/90`}
                      aria-label={`复制 ${hex}`}
                    >
                      <Copy size={9} strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onToggleLock?.(i); }}
                      style={actionBtnStyle}
                      className={`${actionBtnBase} hover:brightness-95 focus-visible:ring-white/90 ${
                        isLocked ? 'ring-2 ring-zen-vermilion ring-offset-1 ring-offset-[var(--tw-ring-offset-color)] shadow-lg' : ''
                      }`}
                      aria-label={isLocked ? '已锁定' : '锁定此色'}
                    >
                      <Lock size={9} strokeWidth={isLocked ? 2.5 : 2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onShoot?.({ ...c, hex: hexRaw }); }}
                      style={actionBtnStyle}
                      className={`${actionBtnBase} hover:brightness-95 focus-visible:ring-white/90`}
                      aria-label={`析色拍摄 ${zh}`}
                    >
                      <Camera size={9} strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <button
              key={`mob-${i}-${hex}`}
              type="button"
              onClick={(e) => { e.stopPropagation(); onCopyHex?.({ ...c, hex: hexRaw }); }}
              style={colStyle}
              className="group relative isolate h-full min-h-0 overflow-hidden border-0 p-0 text-left shadow-none outline-none transition-[filter] hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-0"
              aria-label={`${zh}，复制 ${hex}`}
            >
              <SekaMobileColumnBody hexRaw={hexRaw} zh={zh} fillHeight={fillParent} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 填满父级列（如保存色卡弹窗预览），与全屏色海同款矢量印章 + 竖排色名。 */
function SealColumnBodyFill({ hexRaw, zh }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={SEAL_VECTOR_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g dangerouslySetInnerHTML={{ __html: sealVectorInnerHtml(hexRaw) }} />
      <foreignObject x={FO_X} y={FO_Y} width={FO_W} height={FO_H}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          className="font-zenSerif flex h-full items-center justify-center px-0.5 text-white [box-sizing:border-box] [text-shadow:0_2px_14px_rgba(0,0,0,0.5)]"
        >
          <span
            className="text-center text-[clamp(0.5rem,2.6vmin,0.82rem)] font-semibold leading-[1.28] tracking-[0.14em] sm:tracking-[0.18em]"
            style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
            lang="zh-Hans"
          >
            {zh}
          </span>
        </div>
      </foreignObject>
    </svg>
  );
}

/**
 * 横向五联印章缩略预览（保存色卡第一步等）。题名与竖排中文色名规则与色海/全屏预览一致。
 */
export function ColorCardSealStripPreview({ colors, className = '' }) {
  const list = (Array.isArray(colors) ? colors : []).filter((c) => c && c.hex).slice(0, 5);
  const fingerprint = useMemo(() => list.map((c) => normalizeHex(c.hex)).join('|'), [list]);
  const swatchZh = useMemo(() => uniquePoeticNamesForSwatches(list), [fingerprint, list]);
  const paletteTitle = useMemo(() => palettePoeticTitleFromHexes(list.map((c) => c.hex)), [fingerprint, list]);

  if (!list.length) return null;

  return (
    <div
      className={[
        'flex flex-col overflow-hidden rounded-xl border border-zen-ink/10 bg-zen-mist/60 shadow-inner',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <p
        className="pointer-events-none shrink-0 border-b border-zen-ink/8 bg-zen-paper/70 px-2 py-2 text-center font-zenSerif text-[11px] font-medium tracking-[0.32em] text-zen-ink/88 sm:text-xs sm:tracking-[0.38em]"
        lang="zh-Hans"
      >
        {paletteTitle}
      </p>
      <div
        className="flex h-[min(200px,32vh)] min-h-[148px] w-full min-w-0 flex-nowrap bg-neutral-900/5"
        role="img"
        aria-label="五色印章条预览"
      >
        {list.map((c, i) => {
          const hexRaw = typeof c.hex === 'string' ? c.hex : '#888888';
          const zh = swatchZh[i] || '';
          return (
            <div
              key={`prev-${i}-${hexRaw}`}
              className="relative min-h-0 min-w-0 flex-1 overflow-hidden border-r border-white/10 last:border-r-0"
            >
              <SealColumnBodyFill hexRaw={hexRaw} zh={zh} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setMobile(e.matches);
    setMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return mobile;
}

/** Mobile: single card displayed at original aspect ratio, tap to copy */
function MobileSealCard({ hexRaw, zh, hex, isLocked, onCopy, onToggleLock, copiedHex, interactive }) {
  const isCopied = copiedHex?.toUpperCase() === hex?.toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onCopy?.()}
      className="relative w-full overflow-hidden rounded-2xl border border-zen-ink/8 shadow-sm active:scale-[0.98] transition-transform"
      style={{ aspectRatio: '1024 / 1536' }}
      aria-label={`${zh} ${hex}，点击复制`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 h-full w-full"
        viewBox={SEAL_VECTOR_VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <g dangerouslySetInnerHTML={{ __html: sealVectorInnerHtml(hexRaw) }} />
        <foreignObject x={FO_X} y={FO_Y} width={FO_W} height={FO_H}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            className="font-zenSerif flex h-full items-center justify-center px-2 text-white [box-sizing:border-box] [text-shadow:0_4px_28px_rgba(0,0,0,0.45)]"
          >
            <span
              className="text-center text-[2.5rem] font-semibold leading-[1.28] tracking-[0.26em]"
              style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
              lang="zh-Hans"
            >
              {zh}
            </span>
          </div>
        </foreignObject>
      </svg>
      {/* Hex badge */}
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/25 backdrop-blur-sm px-3 py-1 text-[11px] font-mono text-white/90 tracking-wide">
        {isCopied ? '已复制 ✓' : hex}
      </span>
      {/* Lock indicator for interactive mode */}
      {interactive && isLocked && (
        <span className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-zen-vermilion/80 text-white shadow">
          <Lock size={14} strokeWidth={2.5} />
        </span>
      )}
      {/* Lock toggle tap zone (top-right corner) */}
      {interactive && onToggleLock && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onToggleLock(); } }}
          className={`absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            isLocked ? 'bg-zen-vermilion/80 text-white' : 'bg-black/20 backdrop-blur-sm text-white/70'
          }`}
          aria-label={isLocked ? '已锁定' : '锁定此色'}
        >
          <Lock size={15} strokeWidth={isLocked ? 2.5 : 2} />
        </span>
      )}
    </button>
  );
}

/** 色海预览 & 空生色：五列均分视口同时可见；单列最大 800px（2× 原 400），宽屏仍满额放大。 */
const COL_FLEX_STYLE = {
  flex: '1 1 0',
  minWidth: 0,
  maxWidth: 800,
};

/**
 * 色卡放大：`color-card-seal-chatgpt.svg`；仅中央竖排中文色名（无拼音与数值）。
 * @param {object} props
 * @param {boolean} [props.interactive=false] 空生色：每列底部复制 / 锁定 / 拍摄，整列不再作为单一复制按钮。
 * @param {boolean[]} [props.locked]
 * @param {(index: number) => void} [props.onToggleLock]
 * @param {(color: object) => void} [props.onShoot]
 * @param {string} [props.className] 外层滚动容器额外 class
 * @param {string} [props.paletteTitle] 整盘题名（不设则由五色内容稳定生成，与单色名无关）
 * @param {boolean} [props.showPaletteHeading=true] 是否显示整盘题名
 */
export default function ColorCardSealColumns({
  colors,
  onCopyHex,
  copiedHex: _copiedHex,
  interactive = false,
  fillParent = false,
  locked = [],
  onToggleLock,
  onShoot,
  className = '',
  paletteTitle: paletteTitleProp = null,
  showPaletteHeading = true,
}) {
  const isMobile = useIsMobile();
  const list = (Array.isArray(colors) ? colors : []).filter((c) => c && c.hex).slice(0, 5);

  const fingerprint = useMemo(() => list.map((c) => normalizeHex(c.hex)).join('|'), [list]);

  const swatchZh = useMemo(() => uniquePoeticNamesForSwatches(list), [fingerprint, list]);

  const paletteTitle = useMemo(() => {
    if (paletteTitleProp != null && String(paletteTitleProp).trim()) return String(paletteTitleProp).trim();
    return palettePoeticTitleFromHexes(list.map((c) => c.hex));
  }, [paletteTitleProp, fingerprint, list]);

  if (!list.length) return null;

  /* ── Mobile: horizontal 色卡.svg columns ── */
  if (isMobile) {
    return (
      <MobileSekaColumns
        list={list}
        swatchZh={swatchZh}
        paletteTitle={paletteTitle}
        showPaletteHeading={showPaletteHeading}
        className={className}
        interactive={interactive}
        fillParent={fillParent}
        locked={locked}
        onCopyHex={onCopyHex}
        onToggleLock={onToggleLock}
        onShoot={onShoot}
        _copiedHex={_copiedHex}
      />
    );
  }

  /* ── Desktop: original 5-column horizontal layout ── */
  const rowClass = interactive
    ? [
        'flex min-h-0 w-full flex-1 shrink-0 flex-nowrap items-stretch justify-evenly gap-0 overflow-x-visible overflow-y-visible px-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')
    : [
        'flex min-h-0 w-full flex-1 flex-nowrap items-stretch justify-evenly gap-0 overflow-x-visible overflow-y-visible px-0',
        className,
      ]
        .filter(Boolean)
        .join(' ');

  const wrapperClass = interactive || fillParent
    ? 'flex min-h-0 min-w-0 h-full w-full flex-1 flex-col overflow-x-visible overflow-y-hidden'
    : 'flex h-[min(96vh,calc(100dvh-3.75rem))] w-full min-w-0 max-w-full shrink-0 flex-col overflow-x-visible overflow-y-hidden';

  return (
    <div className={wrapperClass}>
      {showPaletteHeading ? (
        <p
          className="pointer-events-none shrink-0 px-3 pb-2 pt-0 text-center font-zenSerif text-sm font-medium tracking-[0.42em] text-zen-ink/88 md:text-base md:tracking-[0.48em]"
          lang="zh-Hans"
        >
          {paletteTitle}
        </p>
      ) : null}
      <div className={rowClass}>
      {list.map((c, i) => {
        const hexRaw = typeof c.hex === 'string' ? c.hex : '#888888';
        const hex = hexRaw.toUpperCase().startsWith('#') ? hexRaw.toUpperCase() : `#${hexRaw.toUpperCase()}`;
        const zh = swatchZh[i] || '';
        const isLocked = !!locked[i];
        const swatchHex = normalizeHex(hexRaw);
        const onSwatch = pickReadableTextOnHex(swatchHex);
        const actionBtnBase =
          'pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border shadow-md transition-[filter,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1';
        const actionBorder =
          onSwatch.toUpperCase() === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.35)';
        const actionBtnStyle = {
          backgroundColor: swatchHex,
          color: onSwatch,
          borderColor: actionBorder,
          ['--tw-ring-offset-color']: swatchHex,
        };

        if (interactive) {
          return (
            <div
              key={`ks-${i}-${hex}`}
              style={{ ...COL_FLEX_STYLE, backgroundColor: fillParent ? swatchHex : undefined }}
              className="group relative isolate box-border h-full min-h-0 overflow-visible"
            >
              <SealColumnBody hexRaw={hexRaw} zh={zh} />
              <div className="absolute inset-x-0 bottom-[max(0.5rem,env(safe-area-inset-bottom,0px))] z-[3] flex items-center justify-center gap-1 px-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyHex?.({ ...c, hex: hexRaw });
                  }}
                  style={actionBtnStyle}
                  className={`${actionBtnBase} hover:brightness-95 focus-visible:ring-white/90`}
                  aria-label={`复制 ${hex}`}
                  title="复制 HEX"
                >
                  <Copy size={16} strokeWidth={2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock?.(i);
                  }}
                  style={actionBtnStyle}
                  className={`${actionBtnBase} hover:brightness-95 focus-visible:ring-white/90 ${
                    isLocked ? 'ring-2 ring-zen-vermilion ring-offset-1 ring-offset-[var(--tw-ring-offset-color)] shadow-lg' : ''
                  }`}
                  aria-label={isLocked ? '已锁定，下次生成保留此色' : '锁定此色'}
                  title={isLocked ? '已锁定' : '锁定'}
                >
                  <Lock size={16} strokeWidth={isLocked ? 2.5 : 2} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShoot?.({ ...c, hex: hexRaw });
                  }}
                  style={actionBtnStyle}
                  className={`${actionBtnBase} hover:brightness-95 focus-visible:ring-white/90`}
                  aria-label={`前往析色拍摄 ${zh}`}
                  title="析色拍摄"
                >
                  <Camera size={16} strokeWidth={2} aria-hidden />
                </button>
              </div>
            </div>
          );
        }

        return (
          <button
            key={`${hex}-${i}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopyHex?.({ ...c, hex: hexRaw });
            }}
            style={{ ...COL_FLEX_STYLE, backgroundColor: fillParent ? swatchHex : undefined }}
            className="group relative isolate box-border h-full min-h-0 overflow-visible border-0 p-0 text-left shadow-none outline-none transition-[filter] hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-0"
            aria-label={`${zh}，复制 ${hex}`}
          >
            <SealColumnBody hexRaw={hexRaw} zh={zh} />
          </button>
        );
      })}
      </div>
    </div>
  );
}
