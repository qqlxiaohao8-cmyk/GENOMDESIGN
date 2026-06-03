import React from 'react';
import ColorCardSealColumns from '../ColorCardSealColumns';

/**
 * 色卡详情页 · 统一排版外壳
 *
 * 结构：
 *  - 顶部栏（shrink-0）
 *  - 中段「色卡区」固定高 = 视口 2/3（66.67dvh）：
 *    5 列等分行宽并铺满整个色卡区高度；每列以 色卡.svg（slice 模式）拉满，
 *    保留原始图案与汉字印章，同时色卡整体占据屏幕 2/3 的纵向空间。
 *    每列底色用该 swatch 的 hex 填充，用于填补 SVG 的窄缘留白。
 *  - 底部动作卡（shrink-0），位于剩余的 1/3 内，可滚动。
 *
 * 此布局被 色海 / 空生色 / 编辑页 共用，保持视觉一致。
 *
 * @param {object} props
 * @param {React.ReactNode} [props.topBarLeft]
 * @param {React.ReactNode} [props.topBarCenter]
 * @param {React.ReactNode} [props.topBarRight]
 * @param {Array<{ hex: string }>} props.colors
 * @param {string | null | boolean} [props.paletteTitle]
 * @param {boolean} [props.showPaletteHeading]
 * @param {React.ReactNode} [props.bottomSlot]
 * @param {React.ReactNode} [props.extraBottom]
 * @param {string} [props.className]
 */
export default function ColorCardDetailLayout({
  topBarLeft = null,
  topBarCenter = null,
  topBarRight = null,
  colors,
  paletteTitle = null,
  showPaletteHeading = false,
  bottomSlot = null,
  extraBottom = null,
  className = '',
}) {
  return (
    <div className={`flex h-full w-full min-h-0 flex-col bg-zen-mist ${className}`}>
      {/* 顶部栏 */}
      <header className="flex shrink-0 items-center gap-3 border-b border-zen-ink/10 bg-zen-paper/90 px-2.5 py-2 backdrop-blur sm:px-5 sm:py-2.5">
        <div className="flex min-w-0 shrink-0 items-center">{topBarLeft}</div>
        <div className="flex min-w-0 flex-1 items-center justify-center">{topBarCenter}</div>
        <div className="flex min-w-0 shrink-0 items-center justify-end">{topBarRight}</div>
      </header>

      {/* 色卡区 —— 固定占视口 2/3 高 */}
      <div
        className="flex w-full shrink-0 flex-col items-stretch overflow-hidden px-0 pt-1 sm:px-2 sm:pt-2"
        style={{ height: '66.67dvh' }}
      >
        {showPaletteHeading && paletteTitle ? (
          <p
            className="mb-1 shrink-0 text-center font-zenSerif text-sm font-medium tracking-[0.38em] text-zen-ink/88"
            lang="zh-Hans"
          >
            {paletteTitle}
          </p>
        ) : null}
        <ColorCardFrame>
          <ColorCardSealColumns colors={colors} fillParent showPaletteHeading={false} />
        </ColorCardFrame>
      </div>

      {/* 底部动作卡 —— 放在剩余 1/3 里 */}
      {(bottomSlot || extraBottom) ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pb-6 pt-3 sm:px-4 sm:pb-8">
          <div className="mx-auto w-full max-w-2xl">
            {bottomSlot}
            {extraBottom}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 色卡框：占满父级 2/3 高 × 100% 宽。5 列由内部 ColorCardSealColumns 以 flex 等分。 */
export function ColorCardFrame({ children }) {
  return (
    <div className="flex h-full w-full min-h-0 items-stretch overflow-hidden rounded-2xl border border-zen-ink/10 bg-white shadow-sm">
      {children}
    </div>
  );
}
