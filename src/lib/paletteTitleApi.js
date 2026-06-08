import { apiFetch } from './apiClient';

/**
 * 调用 Workers AI 为色卡生成意境名称。
 * @param {{
 *   colors: Array<{ hex: string, name?: string }>,
 *   tags?: string[],
 *   paletteMeta?: object,
 *   excludeTitles?: string[],
 *   currentTitle?: string,
 * }} payload
 * @returns {Promise<string|null>}
 */
export async function fetchAiPaletteTitle(payload) {
  try {
    const res = await apiFetch('/palette/generate-title', {
      method: 'POST',
      body: payload,
    });
    const title = res?.data?.title;
    return typeof title === 'string' && title.trim() ? title.trim() : null;
  } catch {
    return null;
  }
}
