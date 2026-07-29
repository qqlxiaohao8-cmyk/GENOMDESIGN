import { parseJson, toJson } from './json';

export const COLOR_WALK_SAVED_MAX = 5;

export const COLOR_WALK_LAYOUTS = ['mosaic', 'columns', 'strip'] as const;
export type ColorWalkLayoutId = (typeof COLOR_WALK_LAYOUTS)[number];

export type ColorWalkSavedRow = {
  id: string;
  user_id: string;
  hex: string;
  layout_id: string;
  photo_keys: string;
  sort_order: number;
  created_at: string;
};

export function normalizeHex(raw: unknown): string | null {
  const s = String(raw || '').trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s);
  if (!m) return null;
  return `#${m[1].toUpperCase()}`;
}

export function normalizeLayoutId(raw: unknown): ColorWalkLayoutId {
  const id = String(raw || 'mosaic').trim();
  return (COLOR_WALK_LAYOUTS as readonly string[]).includes(id)
    ? (id as ColorWalkLayoutId)
    : 'mosaic';
}

export function normalizePhotoKeys(raw: unknown): string[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;
  const keys = raw
    .map((k) => String(k || '').trim())
    .filter(Boolean)
    .slice(0, COLOR_WALK_SAVED_MAX);
  return keys;
}

export function formatSavedColorRow(row: ColorWalkSavedRow) {
  return {
    id: row.id,
    user_id: row.user_id,
    hex: row.hex,
    layout_id: row.layout_id,
    photo_keys: parseJson<string[]>(row.photo_keys, []),
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

export function photoKeysToJson(keys: string[]): string {
  return toJson(keys) ?? '[]';
}
