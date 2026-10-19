/**
 * 色海 / 收藏 feed 布局约定：
 * - 色海：网格（先横后竖），移动 2 列、桌面 4 列
 * - 收藏：网格，移动 1 列、桌面 2 列（不用 columns，避免滑入时色卡后出现）
 * - 色条高度两页相同，不随列宽变化（见 ColorSeaStripes PALETTE_FEED_STRIPE_HEIGHT_CLASS）
 */

/** 色海 feed：CSS grid 先横后竖，移动 2 列 / md+ 桌面 4 列 */
export const COLOR_SEA_MASONRY_CLASS = 'grid w-full grid-cols-2 md:grid-cols-4';

/**
 * 收藏 feed：普通网格。
 * 不用 CSS columns：页面滑入时多列内容要等位移动画结束才绘制，色卡会单独冒出来。
 */
export const FAVORITES_MASONRY_CLASS = 'grid w-full grid-cols-1 sm:grid-cols-2';

export const PALETTE_FEED_MASONRY_GAP = '0.85rem';
