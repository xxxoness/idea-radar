interface Env {
  DB: D1Database;
  AI?: Ai;
  ASSETS: Fetcher;
  ADMIN_TOKEN?: string;
  THREADS_ACCESS_TOKEN?: string;
  THREADS_API_BASE?: string;
  THREADS_API_VERSION?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  DASHBOARD_URL?: string;
  MOCK_MODE?: "auto" | "true" | "false";
  MAX_KEYWORDS_PER_SCAN?: string;
  MAX_POSTS_PER_SEARCH?: string;
  MAX_AI_CANDIDATES?: string;
  ALERT_SCORE_THRESHOLD?: string;
}
