-- GENOM app schema for Cloudflare D1 (SQLite)
-- Better Auth creates its own auth tables separately (user, session, account, verification, …)
-- user_id columns reference Better Auth user.id (TEXT)

PRAGMA foreign_keys = ON;

-- ── Profiles (replaces Supabase auth.users.user_metadata) ─────────────────
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  username TEXT,
  accent_hex TEXT DEFAULT '#888888',
  font_id TEXT DEFAULT 'serif',
  first_name TEXT,
  last_name TEXT,
  profile_complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Styles (vault + 色海) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS styles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  aesthetic TEXT,
  typography TEXT,
  fonts TEXT,              -- JSON
  palette TEXT,            -- JSON
  design_logic TEXT,
  keywords TEXT,           -- JSON array
  prompt TEXT,
  extraction_snapshot TEXT, -- JSON
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS styles_user_id_idx ON styles(user_id);
CREATE INDEX IF NOT EXISTS styles_public_created_idx ON styles(is_public, created_at DESC);

-- ── Style likes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS style_likes (
  style_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (style_id, user_id),
  FOREIGN KEY (style_id) REFERENCES styles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS style_likes_user_idx ON style_likes(user_id);

-- ── Daily 一色 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_palette_submissions (
  id TEXT PRIMARY KEY,
  challenge_date TEXT NOT NULL,
  user_id TEXT NOT NULL,
  style_id TEXT NOT NULL,
  title TEXT NOT NULL,
  palette TEXT NOT NULL,
  image_url TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  daily_anchor_hex TEXT,
  winner_rank INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (challenge_date, user_id),
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  FOREIGN KEY (style_id) REFERENCES styles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_palette_votes (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  voter_user_id TEXT NOT NULL,
  challenge_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (submission_id, voter_user_id),
  FOREIGN KEY (submission_id) REFERENCES daily_palette_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (voter_user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS daily_palette_tallies (
  challenge_date TEXT PRIMARY KEY,
  tallied_at TEXT NOT NULL DEFAULT (datetime('now')),
  winner_submission_ids TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS daily_submissions_date_idx
  ON daily_palette_submissions(challenge_date DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS daily_votes_date_voter_idx
  ON daily_palette_votes(challenge_date, voter_user_id);

-- ── Color Hunt (optional / legacy) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS color_hunt_submissions (
  id TEXT PRIMARY KEY,
  hunt_date TEXT NOT NULL,
  user_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  palette TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (hunt_date, user_id)
);

CREATE TABLE IF NOT EXISTS color_hunt_votes (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  voter_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (submission_id, voter_user_id)
);

CREATE TABLE IF NOT EXISTS color_hunt_reports (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  reporter_user_id TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (submission_id, reporter_user_id)
);
