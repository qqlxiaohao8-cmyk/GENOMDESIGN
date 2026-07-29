-- Color Walk: per-user ordered saved colors (max 5 enforced in Worker)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS color_walk_saved_colors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  hex TEXT NOT NULL,
  layout_id TEXT NOT NULL DEFAULT 'mosaic',
  photo_keys TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS color_walk_saved_user_order_idx
  ON color_walk_saved_colors(user_id, sort_order ASC, created_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS color_walk_saved_user_hex_idx
  ON color_walk_saved_colors(user_id, lower(hex));
