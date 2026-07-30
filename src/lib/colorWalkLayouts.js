/**
 * Color Walk layout geometry.
 * All layouts share a fixed centered color-card rect; photo cells fill the rest.
 * Coordinates are fractional (0–1) relative to the canvas.
 */

const A = 7 / 24;
const B = 10 / 24;

export const CARD_RECT = { x: A, y: A, w: B, h: B };

export const LAYOUT_ASPECT = 3 / 4;

function clampCount(n) {
  return Math.max(1, Math.min(10, Math.round(n)));
}

/** 3×3 grid with center cell removed (8 photo slots). */
function grid8() {
  const xs = [0, A, A + B];
  const ys = [0, A, A + B];
  const ws = [A, B, A];
  const hs = [A, B, A];
  const cells = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      if (row === 1 && col === 1) continue;
      cells.push({ x: xs[col], y: ys[row], w: ws[col], h: hs[row] });
    }
  }
  return cells;
}

/** Split a cell vertically into top/bottom halves. */
function splitVertical(cell) {
  const half = cell.h / 2;
  return [
    { x: cell.x, y: cell.y, w: cell.w, h: half },
    { x: cell.x, y: cell.y + half, w: cell.w, h: half },
  ];
}

const LAYOUTS = {
  1: [{ x: 0, y: 0, w: 1, h: 1 }],

  2: [
    { x: 0, y: 0, w: 1, h: 0.5 },
    { x: 0, y: 0.5, w: 1, h: 0.5 },
  ],

  3: [
    { x: 0, y: 0, w: 1, h: A },
    { x: 0, y: A, w: 1, h: B },
    { x: 0, y: A + B, w: 1, h: A },
  ],

  4: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],

  5: [
    { x: 0, y: 0, w: 0.5, h: A },
    { x: 0.5, y: 0, w: 0.5, h: A },
    { x: 0, y: A, w: A, h: B },
    { x: A + B, y: A, w: A, h: B },
    { x: 0, y: A + B, w: 1, h: A },
  ],

  // Left column middle+bottom merged; right column middle+bottom merged
  6: [
    { x: 0, y: 0, w: A, h: A },
    { x: A, y: 0, w: B, h: A },
    { x: A + B, y: 0, w: A, h: A },
    { x: 0, y: A, w: A, h: B + A },
    { x: A, y: A + B, w: B, h: A },
    { x: A + B, y: A, w: A, h: B + A },
  ],

  // Left column unmerged; right column middle+bottom merged
  7: [
    { x: 0, y: 0, w: A, h: A },
    { x: A, y: 0, w: B, h: A },
    { x: A + B, y: 0, w: A, h: A },
    { x: 0, y: A, w: A, h: B },
    { x: 0, y: A + B, w: A, h: A },
    { x: A, y: A + B, w: B, h: A },
    { x: A + B, y: A, w: A, h: B + A },
  ],

  8: grid8(),

  9: (() => {
    const base = grid8();
    const midLeft = base[3];
    return [
      ...base.slice(0, 3),
      ...splitVertical(midLeft),
      ...base.slice(4),
    ];
  })(),

  10: (() => {
    const base = grid8();
    const midLeft = base[3];
    const midRight = base[4];
    return [
      ...base.slice(0, 3),
      ...splitVertical(midLeft),
      ...splitVertical(midRight),
      ...base.slice(5),
    ];
  })(),
};

/**
 * @param {number} photoCount 1–10
 * @returns {Array<{ x: number, y: number, w: number, h: number }>}
 */
export function getLayoutCells(photoCount) {
  const n = clampCount(photoCount);
  return LAYOUTS[n].map((c) => ({ ...c }));
}

export function getLayoutPhotoCount(files) {
  const n = (files || []).filter(Boolean).length;
  return clampCount(n || 1);
}
