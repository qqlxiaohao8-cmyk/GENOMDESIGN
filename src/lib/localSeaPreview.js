import { uniquePoeticNamesForSwatches } from './poeticColorNaming';
import { generatePaletteTags } from './paletteTags';
import { OFFICIAL_SEA_PALETTES } from '../data/officialSeaPalettes';

function toSeaItem(palette, index) {
  const hexes = palette.hexes.map((h) => String(h).toUpperCase());
  const named = uniquePoeticNamesForSwatches(hexes.map((hex) => ({ hex }))).map((name, j) => ({
    hex: hexes[j],
    name,
  }));
  const title = palette.title;
  const keywords = generatePaletteTags(hexes, {}, palette.tags || [], title);
  return {
    id: `official-sea-${String(index + 1).padStart(3, '0')}`,
    ownerUserId: null,
    aesthetic: title,
    keywords,
    prompt: title,
    createdAt: new Date(Date.UTC(2026, 0, 11, 12, 0, index)).toISOString(),
    likeCount: 0,
    isPublic: true,
    isOfficial: true,
    extractionSnapshot: {
      colorCard: true,
      engineTags: keywords,
      themeTags: palette.tags || [],
      sourceType: 'official_sea_50',
      colorCardData: {
        colors: named,
        overview: title,
      },
      aesthetic: title,
      keywords,
    },
  };
}

export function buildOfficialSeaItems() {
  return OFFICIAL_SEA_PALETTES.map(toSeaItem);
}

/** 色海离线 / 正式底库 */
export function buildLocalSeaPreviewItems() {
  return buildOfficialSeaItems();
}
