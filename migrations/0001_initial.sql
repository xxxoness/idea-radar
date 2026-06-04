CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  language TEXT NOT NULL DEFAULT 'en',
  priority INTEGER NOT NULL DEFAULT 3,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS raw_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL DEFAULT 'threads',
  post_id TEXT NOT NULL,
  permalink TEXT NOT NULL,
  text TEXT NOT NULL,
  username TEXT NOT NULL,
  posted_at TEXT NOT NULL,
  keyword TEXT NOT NULL,
  search_type TEXT NOT NULL,
  raw_score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, post_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_posts_created_at ON raw_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_raw_posts_score ON raw_posts(raw_score);

CREATE TABLE IF NOT EXISTS post_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_post_id INTEGER NOT NULL,
  is_startup_signal INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  audience TEXT NOT NULL,
  possible_solution TEXT NOT NULL,
  category TEXT NOT NULL,
  pain_score REAL NOT NULL DEFAULT 0,
  demand_score REAL NOT NULL DEFAULT 0,
  monetization_score REAL NOT NULL DEFAULT 0,
  buildability_score REAL NOT NULL DEFAULT 0,
  trend_score REAL NOT NULL DEFAULT 0,
  final_score REAL NOT NULL DEFAULT 0,
  mvp_plan TEXT NOT NULL,
  codex_prompt TEXT NOT NULL,
  analyzer TEXT NOT NULL DEFAULT 'rule-based',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(raw_post_id) REFERENCES raw_posts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_post_analysis_score ON post_analysis(final_score);

CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  problem TEXT NOT NULL,
  audience TEXT NOT NULL,
  possible_solution TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  pain_score REAL NOT NULL DEFAULT 0,
  demand_score REAL NOT NULL DEFAULT 0,
  monetization_score REAL NOT NULL DEFAULT 0,
  buildability_score REAL NOT NULL DEFAULT 0,
  trend_score REAL NOT NULL DEFAULT 0,
  final_score REAL NOT NULL DEFAULT 0,
  mvp_plan TEXT NOT NULL,
  codex_prompt TEXT NOT NULL,
  source_count INTEGER NOT NULL DEFAULT 1,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ideas_score ON ideas(final_score);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);

CREATE TABLE IF NOT EXISTS idea_sources (
  idea_id INTEGER NOT NULL,
  raw_post_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(idea_id, raw_post_id),
  FOREIGN KEY(idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
  FOREIGN KEY(raw_post_id) REFERENCES raw_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  mode TEXT NOT NULL DEFAULT 'mock',
  status TEXT NOT NULL DEFAULT 'running',
  keywords_scanned INTEGER NOT NULL DEFAULT 0,
  posts_found INTEGER NOT NULL DEFAULT 0,
  posts_saved INTEGER NOT NULL DEFAULT 0,
  shortlisted INTEGER NOT NULL DEFAULT 0,
  analyzed INTEGER NOT NULL DEFAULT 0,
  ideas_created INTEGER NOT NULL DEFAULT 0,
  ideas_updated INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
