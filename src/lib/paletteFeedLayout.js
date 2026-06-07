/**
 * 色海 / 收藏 feed 布局约定：
 * - 色海：移动 2 列、桌面 4 列，按行优先填满（grid）
 * - 收藏：移动 1 列、桌面 2 列，按行优先填满（grid）
 * - 色条高度两页相同，不随列宽变化（见 ColorSeaStripes PALETTE_FEED_STRIPE_HEIGHT_CLASS）
 */

/** 色海 feed：单行 grid、按行优先填满（先上后下、先左后右），宽屏增加列数 */
export const COLOR_SEA_MASONRY_CLASS =
  'grid w-full grid-flow-row grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';

/** 收藏 feed：约为色海列数的一半 */
export const FAVORITES_MASONRY_CLASS =
  'grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4';

export const PALETTE_FEED_MASONRY_GAP = '0.5rem';
