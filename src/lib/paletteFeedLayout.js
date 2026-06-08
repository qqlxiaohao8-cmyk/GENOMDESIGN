/**
 * 色海 / 收藏 feed 布局约定：
 * - 色海：瀑布流（columns），移动 2 列、桌面 4 列
 * - 收藏：瀑布流（columns），移动 1 列、桌面 2 列
 * - 色条高度两页相同，不随列宽变化（见 ColorSeaStripes PALETTE_FEED_STRIPE_HEIGHT_CLASS）
 */

/** 色海 feed：CSS columns 瀑布流，移动 2 列 / md+ 桌面 4 列 */
export const COLOR_SEA_MASONRY_CLASS = 'w-full columns-2 md:columns-4';

/** 收藏 feed：CSS columns 瀑布流，移动 1 列 / sm+ 桌面 2 列 */
export const FAVORITES_MASONRY_CLASS = 'w-full columns-1 sm:columns-2';

export const PALETTE_FEED_MASONRY_GAP = '0.5rem';
