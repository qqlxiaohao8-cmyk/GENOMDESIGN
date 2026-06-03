/**
 * @param {{ colors?: Array<{ name?: string, hex?: string }>, overview?: string }} card
 * @returns {string[]}
 */
export function suggestPaletteTitles(card) {
  const colors = card?.colors || [];
  const overview = (card?.overview || '').trim();
  const names = colors.map((c) => (c?.name || '').trim()).filter(Boolean);
  const seen = new Set();
  const out = [];
  const add = (s) => {
    const t = String(s || '').trim();
    if (t.length < 2 || t.length > 42 || seen.has(t)) return;
    seen.add(t);
    out.push(t.slice(0, 40));
  };

  if (names[0] && names[1]) add(`${names[0]} · ${names[1]}`);
  if (names[0]) add(`${names[0]} 五色`);
  if (names.length >= 3) add(names.slice(0, 3).join(' / '));
  if (overview) {
    const line = overview.split(/[。！？\n]/)[0]?.trim() || overview;
    const short = line.slice(0, 12).trim();
    if (short.length >= 2) add(`${short} 色谱`);
  }
  if (names[0] && overview) {
    const bit = overview.slice(0, 8).trim();
    if (bit) add(`${names[0]} · ${bit}`);
  }

  return out.slice(0, 8);
}
