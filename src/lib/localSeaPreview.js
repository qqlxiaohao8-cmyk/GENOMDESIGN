import { hslToHex, THEME_PROFILES } from './matrixPaletteEngine';
import { uniquePoeticNamesForSwatches } from './poeticColorNaming';
import { generatePaletteTags } from './paletteTags';

/**
 * 色海离线标本：API 无数据时仍能看见色卡。
 * HSL 按主题写死，刷新不跳色。
 */
const LOCAL_HSL_SETS = [
  [[32, 22, 62], [28, 18, 48], [40, 14, 78], [18, 12, 32], [36, 20, 70]],
  [[12, 28, 72], [200, 18, 68], [85, 14, 74], [28, 16, 54], [330, 12, 78]],
  [[18, 72, 52], [42, 78, 58], [8, 64, 42], [200, 22, 28], [48, 70, 72]],
  [[352, 78, 58], [48, 86, 58], [168, 62, 48], [262, 58, 56], [22, 80, 56]],
  [[210, 12, 82], [200, 18, 62], [28, 10, 48], [40, 8, 90], [195, 14, 36]],
  [[18, 72, 58], [32, 68, 62], [350, 48, 62], [8, 56, 42], [42, 62, 74]],
  [[200, 42, 48], [188, 28, 62], [210, 22, 28], [175, 18, 78], [30, 12, 72]],
  [[92, 32, 68], [340, 28, 74], [48, 38, 78], [210, 22, 62], [18, 24, 56]],
  [[230, 28, 18], [220, 18, 32], [40, 22, 72], [210, 12, 48], [15, 30, 28]],
  [[28, 38, 48], [32, 22, 68], [210, 16, 42], [18, 28, 32], [40, 18, 78]],
  [[265, 22, 58], [320, 18, 68], [40, 24, 72], [210, 14, 42], [15, 16, 32]],
  [[8, 42, 42], [18, 28, 58], [32, 22, 72], [0, 8, 22], [28, 16, 82]],
];

function colorsFromHsl(rows) {
  return rows.map(([h, s, l]) => ({ hex: hslToHex(h, s, l) }));
}

export function buildLocalSeaPreviewItems() {
  return LOCAL_HSL_SETS.map((hslSet, i) => {
    const named = uniquePoeticNamesForSwatches(colorsFromHsl(hslSet)).map((name, j) => ({
      hex: hslToHex(...hslSet[j]),
      name,
    }));
    const title = named.length >= 2
      ? `${named[0].name} · ${named[1].name}`
      : (named[0]?.name || '色组');
    const hexes = named.map((c) => c.hex);
    const theme = THEME_PROFILES[i % THEME_PROFILES.length];
    const keywords = generatePaletteTags(hexes, { styleLabel: theme.name }, [], title);
    return {
      id: `local-sea-${i}`,
      ownerUserId: null,
      aesthetic: title,
      keywords,
      prompt: title,
      createdAt: new Date(Date.UTC(2026, 0, 20 - i)).toISOString(),
      likeCount: Math.max(0, 11 - i),
      isLocalPreview: true,
      extractionSnapshot: {
        colorCard: true,
        engineTags: keywords,
        colorCardData: {
          colors: named,
          overview: title,
        },
      },
    };
  });
}
