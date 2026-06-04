# Security Policy

## Supported versions

Idea Radar is currently in active MVP development. Security fixes are applied to the `main` branch.

## Reporting a vulnerability

Please do not open a public issue with sensitive vulnerability details.

If you find a security issue, contact the maintainer privately.

Maintainer: Yaroslav / xxxoness

## Security scope

Important security areas:

- Admin token access
- Cloudflare Worker routes
- Telegram Bot API integration
- Threads API access token handling
- Cloudflare D1 database access
- Cloudflare Workers AI usage
- Dashboard/API authorization
- Cron-triggered scan jobs
- Environment variables and Wrangler secrets

## Secrets policy

Never commit real secrets to this repository.

Do not commit:

- `.dev.vars`
- `.env`
- `.env.local`
- Cloudflare API tokens
- Telegram bot tokens
- Threads access tokens
- Admin tokens
- Production credentials

Use Wrangler secrets for production values:

```bash
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put THREADS_ACCESS_TOKEN
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID