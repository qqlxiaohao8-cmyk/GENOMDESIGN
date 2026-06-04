/**
 * 色海 / 收藏 feed 布局约定：
 * - 色海：移动 2 列、桌面 4 列瀑布流
 * - 收藏：列数为色海的一半（移动 1 列、桌面 2 列）
 * - 色条高度两页相同，不随列宽变化（见 ColorSeaStripes PALETTE_FEED_STRIPE_HEIGHT_CLASS）
 */

/** 色海主瀑布流 */
export const COLOR_SEA_MASONRY_CLASS = 'w-full columns-2 md:columns-4';

/** 色海顶部精选区（与主 feed 列数一致） */
export const COLOR_SEA_FEATURED_GRID_CLASS = 'grid grid-cols-2 gap-3 md:grid-cols-4';

/** 收藏瀑布流 */
export const FAVORITES_MASONRY_CLASS = 'w-full columns-1 md:columns-2';

export const PALETTE_FEED_MASONRY_GAP = '0.75rem';
