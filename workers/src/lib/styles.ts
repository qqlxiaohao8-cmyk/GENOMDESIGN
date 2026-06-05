import { parseJson } from './json';

export type StyleRow = {
  id: string;
  user_id: string;
  is_public: number;
  image_url: string;
  aesthetic: string | null;
  typography: string | null;
  fonts: string | null;
  palette: string | null;
  design_logic: string | null;
  keywords: string | null;
  prompt: string | null;
  extraction_snapshot: string | null;
  like_count: number;
  created_at: string;
};

export function formatStyleRow(row: StyleRow) {
  return {
    id: row.id,
    user_id: row.user_id,
    is_public: Boolean(row.is_public),
    image_url: row.image_url,
    aesthetic: row.aesthetic,
    typography: row.typography,
    fonts: parseJson(row.fonts, null),
    palette: parseJson(row.palette, null),
    design_logic: row.design_logic,
    keywords: parseJson<string[]>(row.keywords, []),
    prompt: row.prompt,
    extraction_snapshot: parseJson(row.extraction_snapshot, null),
    like_count: row.like_count ?? 0,
    created_at: row.created_at,
  };
}
