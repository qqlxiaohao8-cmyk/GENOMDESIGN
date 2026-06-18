import { normalizeLegacySeaTag } from './seaTagVocabulary.js';

/** 筛选时：旧标签（红色系）与新标签（红色）互通 */
export function tagMatchesSeaFilter(activeTag, keyword) {
  const filter = String(activeTag || '').trim();
  const raw = String(keyword || '').trim();
  if (!filter || !raw) return false;
  const normalized = normalizeLegacySeaTag(raw) ?? raw;
  if (normalized === filter) return true;
  if (raw === filter) return true;
  return false;
}
