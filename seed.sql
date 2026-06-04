INSERT OR IGNORE INTO settings (key, value) VALUES
  ('daily_digest_hour_utc', '8'),
  ('instant_alert_score', '8.5');

INSERT OR IGNORE INTO keywords (phrase, category, language, priority, enabled) VALUES
  ('someone should build', 'micro SaaS', 'en', 5, 1),
  ('I would pay for', 'micro SaaS', 'en', 5, 1),
  ('why is there no app', 'apps', 'en', 5, 1),
  ('need a tool for', 'devtools', 'en', 4, 1),
  ('wish there was', 'websites', 'en', 4, 1),
  ('annoying manual spreadsheet', 'local business', 'en', 4, 1),
  ('vibe coding', 'vibe coding', 'en', 3, 1),
  ('AI tool for', 'AI tools', 'en', 5, 1),
  ('надо автоматизировать', 'micro SaaS', 'ru', 5, 1),
  ('нужен сервис', 'apps', 'ru', 5, 1),
  ('я бы платил', 'micro SaaS', 'ru', 5, 1),
  ('почему нет приложения', 'apps', 'ru', 5, 1),
  ('ищу инструмент', 'devtools', 'ru', 4, 1),
  ('бесит spreadsheet', 'local business', 'ru', 4, 1),
  ('заебался вручную', 'AI tools', 'ru', 4, 1);

INSERT OR IGNORE INTO raw_posts (platform, post_id, permalink, text, username, posted_at, keyword, language, search_type, raw_score) VALUES
  ('threads', 'demo-1', 'https://threads.net/@demo/post/demo-1', 'Someone should build an AI tool that reads messy client emails and turns them into scoped tasks, estimates, and a reply draft. I would pay for this every month.', 'opsfounder', datetime('now', '-2 hours'), 'AI tool for', 'en', 'TOP', 9.4),
  ('threads', 'demo-2', 'https://threads.net/@demo/post/demo-2', 'Why is there no app for local gyms to turn Instagram DMs into bookings and follow-ups? Everything is manual spreadsheet chaos.', 'localgrowth', datetime('now', '-4 hours'), 'why is there no app', 'en', 'RECENT', 8.8),
  ('threads', 'demo-3', 'https://threads.net/@demo/post/demo-3', 'Нужен сервис, который автоматически собирает отзывы клиентов из чатов и делает план улучшений. Я бы платил, потому что сейчас все вручную.', 'ru_builder', datetime('now', '-5 hours'), 'нужен сервис', 'ru', 'TOP', 8.9);

INSERT OR IGNORE INTO ideas (
  id, title, problem, audience, possible_solution, category, language, group_key, status,
  pain_score, demand_score, monetization_score, buildability_score, trend_score, final_score,
  mvp_plan, codex_prompt, source_count
) VALUES
  (1, 'AI Email-to-Scope Assistant', 'Small agencies lose hours translating vague client emails into tasks, estimates, and careful replies.', 'Freelancers, agencies, consultants, and productized service teams.', 'A lightweight inbox assistant that extracts requirements, creates a task checklist, estimates effort, and drafts a polished response.', 'AI tools', 'en', 'en-ai-tools-email-scope', 'new', 9, 8.5, 8, 8, 8.5, 8.45, '1. Connect Gmail forwarding or paste email. 2. Extract requirements and unknowns. 3. Generate scope, estimate, and reply. 4. Add templates per service type.', 'Build a Cloudflare Workers + React MVP for an AI assistant that converts messy client emails into project scope, task checklist, estimate, and response draft.', 1),
  (2, 'DM-to-Booking CRM for Local Gyms', 'Local gyms handle leads in Instagram DMs and spreadsheets, causing missed follow-ups and inconsistent booking.', 'Independent gyms, coaches, studios, and local fitness operators.', 'A simple CRM that imports lead conversations, suggests next follow-up, and tracks bookings from DM to visit.', 'local business', 'en', 'en-local-business-dm-booking', 'new', 8.5, 8, 8.5, 7.5, 7, 8.05, '1. Manual lead import. 2. Follow-up reminders. 3. Booking status board. 4. Telegram/Email alerts. 5. CSV export.', 'Create a CRM MVP for local gyms that turns DM leads into a booking pipeline with follow-up reminders and conversion tracking.', 1),
  (3, 'AI-сводки отзывов из чатов', 'Команды вручную собирают отзывы клиентов из чатов и слишком поздно понимают, что нужно улучшить.', 'Основатели, саппорт, продуктовые команды и локальные сервисы.', 'Сервис собирает отзывы из чатов, группирует жалобы и превращает их в план улучшений.', 'AI tools', 'ru', 'ru-ai-tools-feedback-digest', 'new', 8.7, 8.1, 7.8, 7.6, 7.5, 8.08, '1. Загрузить экспорт чата. 2. Найти повторяющиеся жалобы. 3. Сформировать приоритетный план. 4. Добавить еженедельную сводку.', 'Собери MVP на Cloudflare Workers + React для анализа отзывов клиентов из чатов и генерации плана улучшений.', 1);

INSERT OR IGNORE INTO idea_sources (idea_id, raw_post_id)
SELECT 1, id FROM raw_posts WHERE post_id = 'demo-1';

INSERT OR IGNORE INTO idea_sources (idea_id, raw_post_id)
SELECT 2, id FROM raw_posts WHERE post_id = 'demo-2';

INSERT OR IGNORE INTO keywords (phrase, category, language, priority, enabled) VALUES
  ('someone should build', 'micro SaaS', 'en', 5, 1),
  ('I would pay for', 'micro SaaS', 'en', 5, 1),
  ('why is there no app', 'apps', 'en', 5, 1),
  ('need a tool for', 'devtools', 'en', 4, 1),
  ('manual spreadsheet', 'micro SaaS', 'en', 5, 1),
  ('annoying workflow', 'micro SaaS', 'en', 5, 1),
  ('startup idea', 'micro SaaS', 'en', 4, 1),
  ('micro SaaS', 'micro SaaS', 'en', 4, 1),
  ('AI tool for', 'AI tools', 'en', 5, 1),
  ('built with Cursor', 'vibe coding', 'en', 4, 1),
  ('vibe coding', 'vibe coding', 'en', 3, 1),
  ('нужен сервис', 'apps', 'ru', 5, 1),
  ('я бы платил', 'micro SaaS', 'ru', 5, 1),
  ('почему нет приложения', 'apps', 'ru', 5, 1),
  ('надо автоматизировать', 'micro SaaS', 'ru', 5, 1),
  ('бесит вручную', 'micro SaaS', 'ru', 5, 1),
  ('ищу инструмент', 'devtools', 'ru', 4, 1);
