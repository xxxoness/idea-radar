ALTER TABLE ideas ADD COLUMN telegram_alert_sent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ideas ADD COLUMN last_alerted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_ideas_telegram_alert ON ideas(telegram_alert_sent, final_score, last_seen_at);
