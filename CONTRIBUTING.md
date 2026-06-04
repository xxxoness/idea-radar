# Contributing

Thank you for your interest in Idea Radar.

Idea Radar is an open-source AI product-research tool for discovering startup and product ideas from social signals.

Contributions, issues, and improvements are welcome.

## Good contribution areas

- Bug fixes
- Documentation improvements
- Cloudflare Workers improvements
- D1 schema and migration improvements
- Dashboard UX improvements
- Telegram alert improvements
- Idea scoring and grouping improvements
- Source connector improvements
- Security hardening
- Tests and automated checks

## Before contributing

Please do not commit real secrets, tokens, credentials, or private data.

Do not commit:

- .dev.vars
- .env
- Cloudflare API tokens
- Telegram bot tokens
- Threads access tokens
- Admin tokens
- Production credentials

Use .dev.vars.example for local setup examples.

## Development

Install dependencies with npm install.

Run the dashboard with npm run dev.

Run the Worker locally with npm run dev:worker.

Run typecheck and build with npm run build.

## Pull requests

When opening a pull request, please include:

- What changed
- Why it changed
- How it was tested
- Screenshots for dashboard/UI changes, if relevant

## Maintainer

Maintained by Yaroslav / xxxoness.