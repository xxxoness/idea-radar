# Idea Radar

Closed Cloudflare MVP for finding startup, app, website, AI-tool, micro SaaS, and vibe-coding ideas from Threads Keyword Search API signals.

It runs locally and on Cloudflare Workers with D1, Workers AI fallback logic, a React/Vite dashboard, and optional Telegram alerts. If `THREADS_ACCESS_TOKEN` is missing, it automatically uses full mock/demo mode.

## Stack

- Cloudflare Workers + Hono
- D1 database
- Workers AI with rule-based fallback
- React + Vite + TypeScript dashboard
- Telegram Bot API
- Wrangler

## Features

- Official Threads Keyword Search API path only. No browser login, scraping, proxies, or protection bypass.
- Enabled keyword scanning in `RECENT` and `TOP`.
- Pre-filter for startup pain/demand signals in English and Russian.
- AI analysis returns strict startup idea JSON, with fallback when Workers AI is unavailable.
- D1 tables: `keywords`, `raw_posts`, `post_analysis`, `ideas`, `idea_sources`, `settings`, `scan_runs`.
- Raw posts are cleaned after 30 days; ideas are kept permanently.
- Dashboard protected by `ADMIN_TOKEN` for API access.
- Telegram daily digest and instant alerts for `final_score >= 8.5`.
- Seed includes EN/RU keyword packs, demo raw posts, and demo ideas.

## Local Setup

```bash
npm install
npm run build
```

Create a D1 database:

```bash
npx wrangler d1 create idea-radar-db
```

Copy the returned `database_id` into `wrangler.toml`.

Apply migrations and seed locally:

```bash
npm run db:migrate:local
npm run db:seed:local
```

Run the Worker locally:

```bash
npm run build
npm run dev:worker
```

Open the local Wrangler URL, usually `http://127.0.0.1:8787`.

For frontend-only iteration, run Vite:

```bash
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:8787`, so keep `npm run dev:worker` running in another terminal.

## Secrets and Environment

Set production secrets with Wrangler:

```bash
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put THREADS_ACCESS_TOKEN
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

Variables in `wrangler.toml`:

- `MOCK_MODE=auto`: uses mock mode when `THREADS_ACCESS_TOKEN` is absent.
- `THREADS_API_BASE=https://graph.threads.net`
- `THREADS_API_VERSION=v1.0`
- `MAX_KEYWORDS_PER_SCAN=12`
- `MAX_POSTS_PER_SEARCH=20`
- `MAX_AI_CANDIDATES=24`
- `ALERT_SCORE_THRESHOLD=8.5`
- `DASHBOARD_URL=http://127.0.0.1:8789`: base URL used in Telegram links. Set this to your deployed Worker URL in production.

Without `ADMIN_TOKEN`, local API access is open. In production, always set `ADMIN_TOKEN` and enter it in the dashboard token field.

Do not commit `.dev.vars`, `.env`, `.env.*`, `.wrangler`, or `wrangler-dev*.log`. The app never returns `THREADS_ACCESS_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, or `ADMIN_TOKEN` in API responses.

## Current production status

- Cloudflare Worker URL: `https://idea-radar.tg-ai-notes.workers.dev`
- Worker name: `idea-radar`
- D1 database binding: `DB`
- D1 database name: `idea-radar-db`
- Migrations: run `npm run db:migrate` for remote D1 and `npm run db:migrate:local` for local D1.
- Seed: run `npm run db:seed` remote or `npm run db:seed:local` local. It uses `INSERT OR IGNORE` so existing user keywords are not deleted.
- Telegram test: Settings -> Send Telegram test, or `POST /api/telegram/test`.
- Mock vs real mode: `MOCK_MODE=auto` uses mock mode only when `THREADS_ACCESS_TOKEN` is missing.
- Admin access: production should have `ADMIN_TOKEN` set.
- Cron: configured in `wrangler.toml` for daily digest and scans every 6 hours.

Production checks:

```bash
curl.exe https://idea-radar.tg-ai-notes.workers.dev/api/health
curl.exe -X POST https://idea-radar.tg-ai-notes.workers.dev/api/scan/run -H "Authorization: Bearer <ADMIN_TOKEN>"
curl.exe "https://idea-radar.tg-ai-notes.workers.dev/api/threads/diagnostics?q=radar-test" -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Local checks use the Wrangler dev URL, for example:

```bash
curl.exe http://127.0.0.1:8789/api/health
curl.exe -X POST http://127.0.0.1:8789/api/scan/run -H "Authorization: Bearer <ADMIN_TOKEN>"
curl.exe "http://127.0.0.1:8789/api/threads/diagnostics?q=radar-test" -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## Telegram Alerts

Telegram is optional. If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_CHAT_ID` is missing, Idea Radar keeps working and Settings shows Telegram as disabled.

To enable it:

1. Open Telegram and message `@BotFather`.
2. Run `/newbot`, choose a name and username, then copy the bot token.
3. Start a chat with your bot, or add it to a group where alerts should be delivered.
4. Get the chat id:
   - For a direct chat, send a message to the bot, then open `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates`.
   - For a group, add the bot, send a message in the group, then inspect `chat.id` in `getUpdates`.
5. Set secrets:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
```

For local testing, put the same names in `.dev.vars` or use Wrangler secret support for your local workflow.

Test from the dashboard Settings page with **Send Telegram test**, or call:

```bash
curl.exe -X POST http://127.0.0.1:8789/api/telegram/test
```

With secrets configured, `/api/telegram/test` returns `{"ok":true,"configured":true}` and sends a test message. Without secrets it returns JSON such as `{"ok":false,"configured":false,"error":"Telegram is not configured"}` and does not crash.

Alerts:

- Instant alert: sent after scan for a new or newly strong idea with `final_score >= ALERT_SCORE_THRESHOLD`.
- Duplicate protection: an idea is marked after a successful Telegram send and will not be alerted repeatedly.
- Daily digest: the scheduled handler sends top ideas seen in the last day during the daily cron.

## Threads API Access

Real scanning is ready when `THREADS_ACCESS_TOKEN` is set. The collector calls the official API endpoint configured by:

```text
{THREADS_API_BASE}/{THREADS_API_VERSION}/keyword_search
```

It sends:

- `q`
- `search_type=RECENT|TOP`
- `limit`
- `fields=id,permalink,text,username,timestamp`
- `access_token`

If your approved Threads API app uses a different official path or field name, update `THREADS_API_BASE`, `THREADS_API_VERSION`, or the `searchThreads` function in `src/worker/index.ts`.

The Settings page includes **Threads API Diagnostics**. It checks whether the token is present, whether `/me` responds, and whether `keyword_search` returns posts for a test keyword. If `postsFound=0`, it may mean Meta App Review has not granted keyword search access yet, the token lacks permission, or the keyword has no recent Threads results.

Short-lived Threads tokens are temporary and can expire. For production, exchange a short-lived token for a long-lived Threads token using Meta's official Threads API token exchange endpoint:

```text
GET https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=<APP_SECRET>&access_token=<SHORT_LIVED_TOKEN>
```

Store the returned token as a Cloudflare secret and rotate it before it expires:

```bash
npx wrangler secret put THREADS_ACCESS_TOKEN
```

Never place the token in `wrangler.toml`, README, screenshots, logs, or frontend code.

## Meta App Review package

Public URLs for Meta settings:

- Privacy Policy URL: `https://idea-radar.tg-ai-notes.workers.dev/privacy`
- User Data Deletion URL: `https://idea-radar.tg-ai-notes.workers.dev/data-deletion`
- Terms URL: `https://idea-radar.tg-ai-notes.workers.dev/terms`
- Reviewer checklist URL: `https://idea-radar.tg-ai-notes.workers.dev/app-review`

Requested permission:

- `threads_keyword_search`

Use Case text for Meta App Review:

```text
Idea Radar is a private/internal dashboard for startup and product idea research. It uses the official Threads Keyword Search API to search public Threads posts for keywords that indicate product pain or demand, such as "someone should build", "I would pay for", "need a tool for", and the demo keyword "radar-test-xy929". The app stores limited public post metadata and text, filters spam, scores startup signals, groups similar posts into private idea records, and helps plan MVPs. It does not collect private messages, credentials, emails, phone numbers, or sensitive data. It does not scrape, use proxies, automate browser login, publish a public post database, resell data, or use the data for spam/outreach.
```

Reviewer testing steps:

1. Open `https://idea-radar.tg-ai-notes.workers.dev/app-review`.
2. Open the production dashboard URL: `https://idea-radar.tg-ai-notes.workers.dev/`.
3. Sign in with the reviewer/admin access token supplied in the Meta App Review notes.
4. Open Settings.
5. In **Threads API Diagnostics**, enter `radar-test-xy929` and click **Test**.
6. Confirm that the app checks `/me` and `keyword_search` through the official Threads API and shows either returned post count or a friendly permission/token/access message.
7. Click **Run scan now** and confirm the dashboard stores public matching posts, filters startup signals, groups them into ideas, and does not expose tokens.
8. Optional: use **Send Telegram test** to confirm Telegram alerts are separate from Threads API access.

Short screencast to include:

1. Show the public `/privacy`, `/data-deletion`, `/terms`, and `/app-review` pages loading over HTTPS.
2. Show dashboard login with the admin token already prepared but not visible.
3. Open Settings and run Threads API Diagnostics with `radar-test-xy929`.
4. Run a scan and show the result message for posts found, zero posts, or pre-filtered posts.
5. Open an idea detail page to show public source permalink, score, category, and MVP planning fields.
6. Briefly show that no scraping, browser login, proxy, or token display exists in the UI.

## Deploy

```bash
npm run build
npm run db:migrate
npm run db:seed
npm run deploy
```

The included cron config runs:

- Daily digest at `0 8 * * *`
- Scan every 6 hours at `0 */6 * * *`

You can edit `[triggers].crons` in `wrangler.toml`.

## API

- `GET /api/health`
- `GET /api/ideas`
- `GET /api/ideas/:id`
- `POST /api/ideas/:id/status`
- `GET /api/keywords`
- `POST /api/keywords`
- `PATCH /api/keywords/:id`
- `DELETE /api/keywords/:id`
- `POST /api/scan/run`
- `GET /api/scan/runs`
- `GET /api/threads/diagnostics?q=radar-test`
- `POST /api/telegram/test`
- `POST /api/demo/clear` mock mode only

Authenticated calls use:

```text
Authorization: Bearer <ADMIN_TOKEN>
```

## Mock Mode

Mock mode is automatic when `THREADS_ACCESS_TOKEN` is not present. It generates realistic Threads-like pain posts from enabled keywords, stores deduplicated raw posts, analyzes the shortlist, groups similar posts into ideas, and fills the dashboard.

Use it to validate:

- Dashboard opens.
- `Run scan now` creates or updates ideas.
- Telegram test does not crash without Telegram secrets.
- D1 schema, migrations, and seed are working.
