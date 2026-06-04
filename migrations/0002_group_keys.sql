ALTER TABLE ideas ADD COLUMN group_key TEXT;
ALTER TABLE ideas ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
ALTER TABLE raw_posts ADD COLUMN language TEXT NOT NULL DEFAULT 'en';

CREATE INDEX IF NOT EXISTS idx_ideas_group ON ideas(group_key, category, language);

UPDATE ideas
SET group_key = lower(
  replace(
    replace(
      replace(substr(category || '-' || title, 1, 120), ' ', '-'),
      '/', '-'
    ),
    '.', ''
  )
)
WHERE group_key IS NULL OR group_key = '';
