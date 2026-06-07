/** 色海公开色卡题名去重：lower(trim(aesthetic)) */
export function normalizePublicPaletteTitle(s) {
  return String(s || '').trim().toLowerCase();
}

export function isDuplicatePublicTitle(title, existingTitles = []) {
  const norm = normalizePublicPaletteTitle(title);
  if (!norm) return false;
  return existingTitles.some((t) => normalizePublicPaletteTitle(t) === norm);
}
