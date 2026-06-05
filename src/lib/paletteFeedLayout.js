/**
 * 色海 / 收藏 feed 布局约定：
 * - 色海：移动 2 列、桌面 4 列，按行优先填满（grid）
 * - 收藏：移动 1 列、桌面 2 列，按行优先填满（grid）
 * - 色条高度两页相同，不随列宽变化（见 ColorSeaStripes PALETTE_FEED_STRIPE_HEIGHT_CLASS）
 */

/** 色海主 feed：按行优先排列（移动 2 列 / 桌面 4 列，先填满一行再换行） */
export const COLOR_SEA_MASONRY_CLASS = 'grid w-full grid-cols-2 md:grid-cols-4';

/** 色海顶部精选区（与主 feed 列数一致） */
export const COLOR_SEA_FEATURED_GRID_CLASS = 'grid grid-cols-2 gap-3 md:grid-cols-4';

/** 收藏 feed：按行优先（移动 1 列 / 桌面 2 列） */
export const FAVORITES_MASONRY_CLASS = 'grid w-full grid-cols-1 md:grid-cols-2';

export const PALETTE_FEED_MASONRY_GAP = '0.75rem';
