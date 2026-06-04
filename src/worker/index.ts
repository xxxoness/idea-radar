import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = Env;

type Keyword = {
  id: number;
  phrase: string;
  category: string;
  language: string;
  priority: number;
  enabled: number;
};

type RawPostInput = {
  platform: "threads";
  post_id: string;
  permalink: string;
  text: string;
  username: string;
  posted_at: string;
  keyword: string;
  language: string;
  search_type: "RECENT" | "TOP";
  raw_score: number;
};

type RawPost = RawPostInput & { id: number };

type Analysis = {
  is_startup_signal: boolean;
  title: string;
  problem: string;
  audience: string;
  possible_solution: string;
  category: string;
  pain_score: number;
  demand_score: number;
  monetization_score: number;
  buildability_score: number;
  trend_score: number;
  final_score: number;
  mvp_plan: string;
  codex_prompt: string;
  language?: string;
  group_key?: string;
};

type ScanResult = {
  ok: boolean;
  runId: number;
  mode: "mock" | "real";
  status: "success" | "failed" | "running";
  keywordsScanned: number;
  postsFound: number;
  postsSaved: number;
  shortlisted: number;
  analyzed: number;
  ideasCreated: number;
  ideasUpdated: number;
  error?: string;
};

type IdeaAlertCandidate = {
  id: number;
  title: string;
  problem: string;
  possible_solution: string;
  category: string;
  language: string;
  final_score: number;
  telegram_alert_sent: number;
};

type IdeaUpsertResult = {
  ideaId: number;
  created: boolean;
  updated: boolean;
  shouldAlert: boolean;
};

type TelegramResult = {
  ok: boolean;
  configured: boolean;
  error?: string;
  description?: string;
};

type ThreadsDiagnosticStep = {
  ok: boolean;
  status?: number;
  error?: string;
  data?: unknown;
};

type ThreadsDiagnostics = {
  ok: boolean;
  mode: "mock" | "real";
  tokenPresent: boolean;
  keyword: string;
  me: ThreadsDiagnosticStep;
  keywordSearch: ThreadsDiagnosticStep & { postsReturned: number };
  lastRealScan: Record<string, unknown> | null;
  lastThreadsApiError: string | null;
  hint?: string;
};

type ThreadsSearchResponse = {
  data?: Array<Record<string, string>>;
  error?: unknown;
};

const app = new Hono<{ Bindings: Bindings }>();

const SIGNALS = [
  "someone should build",
  "i would pay",
  "why is there no app",
  "need a tool",
  "wish there was",
  "annoying",
  "manual",
  "spreadsheet",
  "бесит",
  "заебался",
  "нужен сервис",
  "я бы платил",
  "почему нет приложения",
  "надо автоматизировать",
  "ищу инструмент"
];

const JUNK = [
  "giveaway",
  "airdrop",
  "follow me",
  "link in bio",
  "crypto pump",
  "onlyfans",
  "discount code",
  "promo code"
];

const PUBLIC_REVIEW_PAGES: Record<string, { title: string; body: string }> = {
  "/privacy": {
    title: "Privacy Policy",
    body: `
      <p><strong>Idea Radar</strong> is a private/internal dashboard used to find startup and product idea signals in public Threads posts.</p>
      <h2>Data we collect</h2>
      <p>Idea Radar stores limited information from public Threads posts returned by the official Threads API: public post text, permalink, username, timestamp, matched keyword, category, language, raw score, and scoring/analysis generated for private idea research.</p>
      <h2>Data we do not collect</h2>
      <p>Idea Radar does not collect private messages, emails, phone numbers, passwords, payment data, health data, government IDs, or other sensitive data. It does not ask users for Threads login credentials.</p>
      <h2>How data is used</h2>
      <p>Collected data is used only inside the private dashboard for grouping similar signals, scoring demand and pain, and planning potential MVPs. We do not resell data, publish a searchable database of posts, or use the data for spam, outreach, or automated messaging.</p>
      <h2>Retention</h2>
      <p>Raw posts are intended to be retained for a limited operational period, while summarized private ideas may be retained for internal planning. Removal requests are handled manually.</p>
      <h2>Contact</h2>
      <p>For privacy questions or data deletion requests, contact <a href="mailto:dobryak.ky5@gmail.com">dobryak.ky5@gmail.com</a>.</p>
    `
  },
  "/data-deletion": {
    title: "Data Deletion Instructions",
    body: `
      <p>This HTTPS-ready page explains how to request removal of public Threads source data stored by Idea Radar.</p>
      <h2>How to request deletion</h2>
      <p>Email <a href="mailto:dobryak.ky5@gmail.com">dobryak.ky5@gmail.com</a> with the subject <strong>Idea Radar data deletion request</strong>.</p>
      <h2>What to include</h2>
      <p>Please include the Threads username and/or the specific Threads permalink that should be reviewed for deletion.</p>
      <h2>Processing time</h2>
      <p>Requests are processed through reasonable manual review. We may reply to confirm the source identity or ask for the exact permalink if the request is ambiguous.</p>
      <h2>What is deleted</h2>
      <p>When a matching source is found, we delete the related <code>raw_posts</code> row, linked <code>post_analysis</code>, and <code>idea_sources</code> links tied to that source. Private aggregate idea records may be updated or removed when needed to complete the deletion.</p>
    `
  },
  "/terms": {
    title: "Terms of Use",
    body: `
      <p>Idea Radar is a private/internal research dashboard for identifying startup and product idea signals from public Threads posts.</p>
      <h2>Official API use</h2>
      <p>The app uses the official Threads API only. It does not use scraping, proxies, browser automation, credential sharing, fake accounts, or any method intended to bypass access controls.</p>
      <h2>Private/internal use</h2>
      <p>Idea Radar is not a public search engine and does not publish a public database of Threads posts. Access to the dashboard and API is intended for an authorized admin only.</p>
      <h2>Compliance</h2>
      <p>The user/admin must comply with Meta terms, Threads Platform requirements, and applicable law. Public post data should only be used for internal idea research, signal grouping, scoring, and MVP planning.</p>
      <h2>Prohibited use</h2>
      <p>Do not use Idea Radar for spam, unsolicited outreach, harassment, profiling sensitive traits, reselling post data, or building a public surveillance/search database.</p>
    `
  },
  "/app-review": {
    title: "Meta App Review Checklist",
    body: `
      <p>This page is provided for Meta reviewers evaluating Idea Radar for Threads API access.</p>
      <h2>App name</h2>
      <p>Idea Radar</p>
      <h2>Purpose</h2>
      <p>Idea Radar is a private Cloudflare-hosted dashboard that monitors public Threads keyword search results to identify startup, website, app, AI-tool, micro SaaS, and vibe-coding idea signals.</p>
      <h2>Requested permission</h2>
      <p><code>threads_keyword_search</code></p>
      <h2>Why this permission is needed</h2>
      <p>The app needs keyword search to find public posts that contain explicit product pain or demand signals, such as "someone should build", "I would pay for", "need a tool for", or the demo keyword <code>radar-test-xy929</code>. Without keyword search, the app cannot discover relevant public idea signals.</p>
      <h2>Data collected</h2>
      <p>Public post text, permalink, username, timestamp, matched keyword, category, language, score, and private analysis used for grouping and MVP planning.</p>
      <h2>Data not collected</h2>
      <p>No private messages, emails, phone numbers, passwords, payment data, sensitive data, browser cookies, or login credentials are collected.</p>
      <h2>Testing steps</h2>
      <ol>
        <li>Open the production URL: <a href="https://idea-radar.tg-ai-notes.workers.dev/">https://idea-radar.tg-ai-notes.workers.dev/</a>.</li>
        <li>Use the reviewer/admin credentials provided in the Meta App Review notes to access the dashboard.</li>
        <li>Open Settings and find <strong>Threads API Diagnostics</strong>.</li>
        <li>Enter demo keyword <code>radar-test-xy929</code> and click <strong>Test</strong>.</li>
        <li>Run a scan from the dashboard. The app uses the official Threads keyword_search API, stores matching public posts, filters startup signals, and groups them into private ideas.</li>
        <li>Confirm Telegram test is optional and does not affect Threads API behavior.</li>
      </ol>
      <h2>Production URL</h2>
      <p><a href="https://idea-radar.tg-ai-notes.workers.dev/">https://idea-radar.tg-ai-notes.workers.dev/</a></p>
      <h2>Policy links</h2>
      <ul>
        <li><a href="/privacy">Privacy Policy</a></li>
        <li><a href="/data-deletion">Data Deletion Instructions</a></li>
        <li><a href="/terms">Terms of Use</a></li>
      </ul>
    `
  }
};

app.use("/api/*", cors());

for (const path of Object.keys(PUBLIC_REVIEW_PAGES)) {
  app.get(path, (c) => c.html(renderPublicReviewPage(path)));
}

app.get("/api/health", async (c) => {
  const mockMode = isMockMode(c.env);
  return c.json({
    ok: true,
    service: "idea-radar",
    mode: mockMode ? "mock" : "real",
    tokens: {
      admin: Boolean(c.env.ADMIN_TOKEN),
      threads: Boolean(c.env.THREADS_ACCESS_TOKEN),
      telegram: Boolean(c.env.TELEGRAM_BOT_TOKEN && c.env.TELEGRAM_CHAT_ID),
      workersAi: Boolean(c.env.AI)
    },
    limits: {
      maxKeywordsPerScan: Number(c.env.MAX_KEYWORDS_PER_SCAN || 12),
      maxPostsPerSearch: Number(c.env.MAX_POSTS_PER_SEARCH || 20),
      maxAiCandidates: Number(c.env.MAX_AI_CANDIDATES || 24),
      alertScoreThreshold: Number(c.env.ALERT_SCORE_THRESHOLD || 8.5)
    },
    config: {
      dashboardUrlSet: Boolean(c.env.DASHBOARD_URL)
    }
  });
});

app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health") {
    await next();
    return;
  }
  if (!isAuthorized(c.req.raw, c.env)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

app.get("/api/ideas", async (c) => {
  const status = c.req.query("status");
  const category = c.req.query("category");
  const search = c.req.query("search");
  const minScore = Number(c.req.query("min_score") || 0);
  const limit = clamp(Number(c.req.query("limit") || 80), 1, 200);

  const where: string[] = ["final_score >= ?"];
  const params: unknown[] = [minScore];
  if (status && status !== "all") {
    where.push("status = ?");
    params.push(status);
  }
  if (category && category !== "all") {
    where.push("category = ?");
    params.push(category);
  }
  const safeSearch = safeLikeSearch(search);
  if (safeSearch) {
    where.push("(title LIKE ? ESCAPE '\\' OR problem LIKE ? ESCAPE '\\' OR audience LIKE ? ESCAPE '\\')");
    params.push(safeSearch, safeSearch, safeSearch);
  }

  const ideas = await c.env.DB.prepare(
    `SELECT * FROM ideas WHERE ${where.join(" AND ")} ORDER BY final_score DESC, last_seen_at DESC LIMIT ?`
  )
    .bind(...params, limit)
    .all();

  return c.json({ ideas: ideas.results });
});

app.get("/api/ideas/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const idea = await c.env.DB.prepare("SELECT * FROM ideas WHERE id = ?").bind(id).first();
  if (!idea) return c.json({ error: "Not found" }, 404);

  const sources = await c.env.DB.prepare(
    `SELECT raw_posts.* FROM raw_posts
     JOIN idea_sources ON idea_sources.raw_post_id = raw_posts.id
     WHERE idea_sources.idea_id = ?
     ORDER BY raw_posts.raw_score DESC, raw_posts.posted_at DESC`
  )
    .bind(id)
    .all();

  return c.json({ idea, sources: sources.results });
});

app.post("/api/ideas/:id/status", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await safeJson<{ status?: string }>(c.req.raw);
  const status = body.status || "new";
  if (!["new", "saved", "rejected", "build_next"].includes(status)) {
    return c.json({ error: "Invalid status" }, 400);
  }
  await c.env.DB.prepare("UPDATE ideas SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(status, id)
    .run();
  return c.json({ ok: true });
});

app.get("/api/keywords", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM keywords ORDER BY enabled DESC, priority DESC, phrase ASC").all();
  return c.json({ keywords: rows.results });
});

app.post("/api/keywords", async (c) => {
  const body = await safeJson<Partial<Keyword>>(c.req.raw);
  if (!body.phrase?.trim()) return c.json({ error: "phrase is required" }, 400);
  const result = await c.env.DB.prepare(
    `INSERT INTO keywords (phrase, category, language, priority, enabled)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      body.phrase.trim(),
      body.category || "general",
      body.language || "en",
      clamp(Number(body.priority || 3), 1, 5),
      body.enabled === 0 ? 0 : 1
    )
    .run();
  return c.json({ ok: true, id: result.meta.last_row_id });
});

app.patch("/api/keywords/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await safeJson<Partial<Keyword>>(c.req.raw);
  const current = await c.env.DB.prepare("SELECT * FROM keywords WHERE id = ?").bind(id).first<Keyword>();
  if (!current) return c.json({ error: "Not found" }, 404);
  await c.env.DB.prepare(
    `UPDATE keywords
     SET phrase = ?, category = ?, language = ?, priority = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(
      (body.phrase || current.phrase).trim(),
      body.category ?? current.category,
      body.language ?? current.language,
      body.priority === undefined ? current.priority : clamp(Number(body.priority), 1, 5),
      body.enabled === undefined ? current.enabled : body.enabled ? 1 : 0,
      id
    )
    .run();
  return c.json({ ok: true });
});

app.delete("/api/keywords/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM keywords WHERE id = ?").bind(Number(c.req.param("id"))).run();
  return c.json({ ok: true });
});

app.post("/api/scan/run", async (c) => {
  try {
    const result = await runScan(c.env);
    return c.json(result, result.ok ? 200 : 500);
  } catch (error) {
    return c.json(
      {
        ok: false,
        status: "failed",
        error: error instanceof Error ? error.message : String(error)
      },
      500
    );
  }
});

app.get("/api/scan/runs", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM scan_runs ORDER BY started_at DESC LIMIT 20").all();
  return c.json({ runs: rows.results });
});

app.get("/api/threads/diagnostics", async (c) => {
  try {
    const q = cleanDiagnosticKeyword(c.req.query("q") || "radar-test");
    const result = await getThreadsDiagnostics(c.env, q);
    return c.json(result);
  } catch (error) {
    return c.json({
      ok: false,
      mode: isMockMode(c.env) ? "mock" : "real",
      tokenPresent: Boolean(c.env.THREADS_ACCESS_TOKEN),
      keyword: cleanDiagnosticKeyword(c.req.query("q") || "radar-test"),
      me: { ok: false, error: "Diagnostics failed before Threads /me check" },
      keywordSearch: { ok: false, postsReturned: 0, error: "Diagnostics failed before keyword_search check" },
      lastRealScan: null,
      lastThreadsApiError: null,
      hint: friendlyThreadsError(error)
    });
  }
});

app.post("/api/telegram/test", async (c) => {
  const result = await sendTelegram(
    c.env,
    [
      "✅ Idea Radar Telegram test",
      "",
      "Telegram is configured and ready.",
      "Strong idea alerts and daily digests can be delivered to this chat."
    ].join("\n")
  );
  return c.json(result, result.ok || !result.configured ? 200 : 502);
});

app.post("/api/demo/clear", async (c) => {
  if (!isMockMode(c.env)) return c.json({ ok: false, error: "Demo cleanup is only available in mock mode" }, 409);
  await clearDemoData(c.env);
  return c.json({ ok: true });
});

app.get("*", async (c) => {
  const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
  if (assetResponse.status !== 404 || c.req.path.startsWith("/api/")) {
    return assetResponse;
  }
  const url = new URL(c.req.url);
  url.pathname = "/";
  url.search = "";
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(event, env));
  }
};

async function handleScheduled(event: ScheduledEvent, env: Env) {
  await runScan(env);
  if (event.cron === "0 8 * * *") {
    await sendDailyDigest(env);
  }
}

async function runScan(env: Env): Promise<ScanResult> {
  await cleanupRawPosts(env);
  await markStaleRuns(env);
  const mode = isMockMode(env) ? "mock" : "real";
  const run = await env.DB.prepare("INSERT INTO scan_runs (mode, status) VALUES (?, 'running')")
    .bind(mode)
    .run();
  const runId = Number(run.meta.last_row_id);
  const counters: ScanResult = {
    ok: false,
    runId,
    mode,
    status: "running",
    keywordsScanned: 0,
    postsFound: 0,
    postsSaved: 0,
    shortlisted: 0,
    analyzed: 0,
    ideasCreated: 0,
    ideasUpdated: 0
  };

  try {
    const maxKeywords = Number(env.MAX_KEYWORDS_PER_SCAN || 12);
    const keywords = await getEnabledKeywords(env, maxKeywords);
    counters.keywordsScanned = keywords.length;
    const candidates: RawPost[] = [];

    for (const keyword of keywords) {
      for (const searchType of ["RECENT", "TOP"] as const) {
        const posts = mode === "mock" ? mockThreadsSearch(keyword, searchType) : await searchThreads(env, keyword, searchType);
        counters.postsFound += posts.length;
        for (const post of posts) {
          const filtered = preFilterPost(post);
          if (!filtered.keep) continue;
          post.raw_score = filtered.score;
          const saved = await saveRawPost(env, post);
          if (saved) {
            counters.postsSaved += 1;
            candidates.push(saved);
          }
        }
      }
    }

    const shortlist = candidates
      .sort((a, b) => b.raw_score - a.raw_score)
      .slice(0, Number(env.MAX_AI_CANDIDATES || 24));
    counters.shortlisted = shortlist.length;

    for (const post of shortlist) {
      const analysis = await analyzePost(env, post, mode === "mock");
      if (!analysis.is_startup_signal || analysis.final_score < 6) continue;
      counters.analyzed += 1;
      await saveAnalysis(env, post.id, analysis, env.AI ? "workers-ai-or-fallback" : "rule-based");
      const upsert = await upsertIdea(env, post, analysis);
      counters.ideasCreated += upsert.created ? 1 : 0;
      counters.ideasUpdated += upsert.updated ? 1 : 0;
      if (upsert.shouldAlert) {
        await sendStrongIdeaAlert(env, upsert.ideaId);
      }
    }

    await finishRun(env, runId, "success", counters);
    counters.ok = true;
    counters.status = "success";
    return counters;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    counters.ok = false;
    counters.status = "failed";
    counters.error = message;
    await finishRun(env, runId, "failed", counters, message);
    return counters;
  }
}

async function getEnabledKeywords(env: Env, limit: number) {
  const rows = await env.DB.prepare(
    "SELECT * FROM keywords WHERE enabled = 1 ORDER BY priority DESC, updated_at DESC LIMIT ?"
  )
    .bind(limit)
    .all<Keyword>();
  if (rows.results.length) return rows.results;
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO keywords (phrase, category, language, priority, enabled) VALUES ('someone should build', 'micro SaaS', 'en', 5, 1)"),
    env.DB.prepare("INSERT OR IGNORE INTO keywords (phrase, category, language, priority, enabled) VALUES ('нужен сервис', 'apps', 'ru', 5, 1)")
  ]);
  const fallback = await env.DB.prepare("SELECT * FROM keywords WHERE enabled = 1 ORDER BY priority DESC LIMIT ?")
    .bind(limit)
    .all<Keyword>();
  return fallback.results;
}

async function searchThreads(env: Env, keyword: Keyword, searchType: "RECENT" | "TOP"): Promise<RawPostInput[]> {
  const json = await fetchThreadsKeywordSearch(env, keyword.phrase, searchType, Number(env.MAX_POSTS_PER_SEARCH || 20));
  return (json.data || []).map((item) => ({
    platform: "threads",
    post_id: String(item.id),
    permalink: item.permalink || `https://threads.net/t/${item.id}`,
    text: item.text || "",
    username: item.username || "unknown",
    posted_at: item.timestamp || new Date().toISOString(),
    keyword: keyword.phrase,
    language: keyword.language,
    search_type: searchType,
    raw_score: 0
  }));
}

async function fetchThreadsKeywordSearch(env: Env, keyword: string, searchType: "RECENT" | "TOP", limit: number) {
  const url = new URL(`/${env.THREADS_API_VERSION || "v1.0"}/keyword_search`, env.THREADS_API_BASE || "https://graph.threads.net");
  url.searchParams.set("q", keyword);
  url.searchParams.set("search_type", searchType);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fields", "id,permalink,text,username,timestamp");
  url.searchParams.set("access_token", env.THREADS_ACCESS_TOKEN || "");

  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const json: ThreadsSearchResponse = await response.json<ThreadsSearchResponse>().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Threads API ${response.status}: ${safeThreadsError(json)}`);
  }
  return json;
}

async function getThreadsDiagnostics(env: Env, keyword: string): Promise<ThreadsDiagnostics> {
  const tokenPresent = Boolean(env.THREADS_ACCESS_TOKEN);
  const mode = isMockMode(env) ? "mock" : "real";
  const history = await getThreadsDiagnosticHistory(env);

  const missingToken = "THREADS_ACCESS_TOKEN is not set";
  const diagnostics: ThreadsDiagnostics = {
    ok: false,
    mode,
    tokenPresent,
    keyword,
    me: tokenPresent ? { ok: false } : { ok: false, error: missingToken },
    keywordSearch: tokenPresent ? { ok: false, postsReturned: 0 } : { ok: false, postsReturned: 0, error: missingToken },
    lastRealScan: history.lastRealScan,
    lastThreadsApiError: history.lastThreadsApiError
  };

  if (!tokenPresent) {
    diagnostics.hint = "Set THREADS_ACCESS_TOKEN with Wrangler to run real Threads diagnostics.";
    return diagnostics;
  }

  diagnostics.me = await checkThreadsMe(env);
  diagnostics.keywordSearch = await checkThreadsKeywordSearch(env, keyword);
  diagnostics.ok = diagnostics.me.ok && diagnostics.keywordSearch.ok;
  if (diagnostics.keywordSearch.ok && diagnostics.keywordSearch.postsReturned === 0) {
    diagnostics.hint = "Threads returned 0 posts. This can happen when Meta App Review limits keyword_search access or when the keyword has no recent results.";
  } else if (!diagnostics.ok) {
    diagnostics.hint = "Check Threads token validity, app permissions, and Meta App Review access for keyword_search.";
  }
  return diagnostics;
}

async function getThreadsDiagnosticHistory(env: Env) {
  try {
    const lastRealScan = await env.DB.prepare(
      `SELECT id, mode, status, started_at, finished_at, keywords_scanned, posts_found, posts_saved,
        shortlisted, analyzed, ideas_created, ideas_updated, error
       FROM scan_runs WHERE mode = 'real' ORDER BY started_at DESC LIMIT 1`
    ).first<Record<string, unknown>>();
    const lastErrorRun = await env.DB.prepare(
      "SELECT error FROM scan_runs WHERE mode = 'real' AND error IS NOT NULL ORDER BY started_at DESC LIMIT 1"
    ).first<{ error: string }>();
    return {
      lastRealScan: lastRealScan || null,
      lastThreadsApiError: lastErrorRun?.error ? friendlyThreadsError(lastErrorRun.error) : null
    };
  } catch (error) {
    return {
      lastRealScan: null,
      lastThreadsApiError: `Unable to read scan_runs history: ${friendlyThreadsError(error)}`
    };
  }
}

async function checkThreadsMe(env: Env): Promise<ThreadsDiagnosticStep> {
  try {
    const url = new URL(`/${env.THREADS_API_VERSION || "v1.0"}/me`, env.THREADS_API_BASE || "https://graph.threads.net");
    url.searchParams.set("fields", "id,username");
    url.searchParams.set("access_token", env.THREADS_ACCESS_TOKEN || "");
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    const json: Record<string, unknown> = await response.json<Record<string, unknown>>().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, status: response.status, error: friendlyThreadsError(json) };
    }
    return {
      ok: true,
      status: response.status,
      data: {
        id: typeof json.id === "string" ? "present" : "missing",
        username: typeof json.username === "string" ? json.username : undefined
      }
    };
  } catch (error) {
    return { ok: false, error: friendlyThreadsError(error) };
  }
}

async function checkThreadsKeywordSearch(
  env: Env,
  keyword: string
): Promise<ThreadsDiagnosticStep & { postsReturned: number }> {
  try {
    const json = await fetchThreadsKeywordSearch(env, keyword, "RECENT", 5);
    const postsReturned = Array.isArray(json.data) ? json.data.length : 0;
    return { ok: true, status: 200, postsReturned };
  } catch (error) {
    const status = extractStatus(error);
    return { ok: false, status, postsReturned: 0, error: friendlyThreadsError(error) };
  }
}

function cleanDiagnosticKeyword(value: string) {
  const cleaned = cleanText(value.replace(/[\u0000-\u001f\u007f]/g, " "), 80);
  return cleaned.length >= 2 ? cleaned : "radar-test";
}

function safeThreadsError(value: unknown) {
  const message = extractThreadsErrorMessage(value);
  return message || "Threads API request failed";
}

function friendlyThreadsError(value: unknown) {
  const message = extractThreadsErrorMessage(value) || (value instanceof Error ? value.message : String(value || ""));
  const lower = message.toLowerCase();
  if (lower.includes("permission") || lower.includes("app review") || lower.includes("access")) {
    return "Threads API access is limited. Check app permissions and Meta App Review access for keyword_search.";
  }
  if (lower.includes("token") || lower.includes("oauth") || lower.includes("expired") || lower.includes("invalid")) {
    return "Threads token is invalid or expired. Rotate THREADS_ACCESS_TOKEN with Wrangler secret put.";
  }
  return cleanText(message || "Threads API request failed", 240);
}

function extractThreadsErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message.replace(/access_token=[^&\s]+/g, "access_token=hidden");
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const error = record.error;
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    const message = typeof err.message === "string" ? err.message : "";
    const type = typeof err.type === "string" ? err.type : "";
    const code = typeof err.code === "number" || typeof err.code === "string" ? `code ${err.code}` : "";
    return cleanText([message, type, code].filter(Boolean).join(" "), 240);
  }
  if (typeof record.message === "string") return cleanText(record.message, 240);
  return "";
}

function extractStatus(error: unknown) {
  const match = error instanceof Error ? error.message.match(/Threads API\s+(\d+)/) : null;
  return match ? Number(match[1]) : undefined;
}

function mockThreadsSearch(keyword: Keyword, searchType: "RECENT" | "TOP"): RawPostInput[] {
  const now = Date.now();
  const base = demoPostsForKeyword(keyword);
  return base.map((text, index) => ({
    platform: "threads",
    post_id: `mock-${slug(keyword.phrase)}-${searchType.toLowerCase()}-${index}-${Math.floor(now / 3_600_000)}`,
    permalink: `https://threads.net/@mock/post/${slug(keyword.phrase)}-${index}`,
    text,
    username: index === 2 ? "demo_ru" : "demo_builder",
    posted_at: new Date(now - index * 45 * 60 * 1000).toISOString(),
    keyword: keyword.phrase,
    language: keyword.language,
    search_type: searchType,
    raw_score: 0
  }));
}

function preFilterPost(post: RawPostInput) {
  const text = post.text.toLowerCase();
  if (post.text.trim().length < 35 || post.text.length > 1200) return { keep: false, score: 0 };
  if (JUNK.some((term) => text.includes(term))) return { keep: false, score: 0 };

  let score = 2;
  for (const signal of SIGNALS) {
    if (text.includes(signal)) score += 1.2;
  }
  if (text.includes("pay") || text.includes("платил")) score += 1.5;
  if (text.includes("manual") || text.includes("вручную") || text.includes("spreadsheet")) score += 1.1;
  if (text.includes("ai") || text.includes("автоматиз")) score += 0.8;
  if (post.search_type === "TOP") score += 0.6;
  return { keep: score >= 4.2, score: clampScore(score) };
}

async function saveRawPost(env: Env, post: RawPostInput): Promise<RawPost | null> {
  const existing = await env.DB.prepare("SELECT id FROM raw_posts WHERE platform = ? AND post_id = ?")
    .bind(post.platform, post.post_id)
    .first<{ id: number }>();
  if (existing) return null;

  await env.DB.prepare(
    `INSERT OR IGNORE INTO raw_posts
     (platform, post_id, permalink, text, username, posted_at, keyword, language, search_type, raw_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      post.platform,
      post.post_id,
      post.permalink,
      post.text,
      post.username,
      post.posted_at,
      post.keyword,
      post.language,
      post.search_type,
      post.raw_score
    )
    .run();
  return env.DB.prepare("SELECT * FROM raw_posts WHERE platform = ? AND post_id = ?")
    .bind(post.platform, post.post_id)
    .first<RawPost>();
}

async function analyzePost(env: Env, post: RawPost, forceRuleBased = false): Promise<Analysis> {
  if (forceRuleBased) {
    return ruleBasedAnalysis(post);
  }
  if (env.AI) {
    try {
      const response = await withTimeout(
        env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages: [
            {
              role: "system",
              content:
                "Analyze social posts for startup ideas. Return only strict JSON with keys: is_startup_signal,title,problem,audience,possible_solution,category,pain_score,demand_score,monetization_score,buildability_score,trend_score,final_score,mvp_plan,codex_prompt. Scores are 0-10. final_score must use pain*0.30+demand*0.25+monetization*0.20+buildability*0.15+trend*0.10."
            },
            {
              role: "user",
              content: `Post: ${post.text}\nKeyword: ${post.keyword}\nSearch type: ${post.search_type}`
            }
          ],
          response_format: { type: "json_object" }
        }),
        8000
      );
      const text = typeof response === "string" ? response : JSON.stringify(response);
      return normalizeAnalysis(JSON.parse(extractJson(text)), post);
    } catch {
      return ruleBasedAnalysis(post);
    }
  }
  return ruleBasedAnalysis(post);
}

function ruleBasedAnalysis(post: RawPost): Analysis {
  const text = post.text;
  const lower = text.toLowerCase();
  const language = normalizeLanguage(post.language || inferLanguage(text));
  const category = inferCategory(post.keyword, lower);
  const blueprint = ideaBlueprint(category, language, post.keyword, lower);
  const pain = clampScore(5.5 + signalCount(lower) * 0.7 + (lower.includes("manual") || lower.includes("вручную") ? 1.2 : 0));
  const demand = clampScore(5 + (lower.includes("pay") || lower.includes("платил") ? 2 : 0) + (post.search_type === "TOP" ? 0.8 : 0));
  const monetization = clampScore(5.5 + (lower.includes("pay") || lower.includes("платил") ? 2 : 0) + (category === "local business" ? 0.8 : 0));
  const buildability = clampScore(category === "AI tools" ? 7.2 : 8.1);
  const trend = clampScore(6 + (lower.includes("ai") || lower.includes("vibe") ? 1.5 : 0));
  const finalScore = weightedScore(pain, demand, monetization, buildability, trend);
  const title = blueprint.title;
  return {
    is_startup_signal: finalScore >= 6,
    title,
    problem: blueprint.problem,
    audience: blueprint.audience,
    possible_solution: blueprint.solution,
    category,
    pain_score: pain,
    demand_score: demand,
    monetization_score: monetization,
    buildability_score: buildability,
    trend_score: trend,
    final_score: finalScore,
    mvp_plan: blueprint.mvpPlan,
    codex_prompt: blueprint.codexPrompt,
    language,
    group_key: groupKeyFor(blueprint.title, category, language)
  };
}

function normalizeAnalysis(raw: Partial<Analysis>, post: RawPost): Analysis {
  const fallback = ruleBasedAnalysis(post);
  const pain = clampScore(Number(raw.pain_score ?? fallback.pain_score));
  const demand = clampScore(Number(raw.demand_score ?? fallback.demand_score));
  const monetization = clampScore(Number(raw.monetization_score ?? fallback.monetization_score));
  const buildability = clampScore(Number(raw.buildability_score ?? fallback.buildability_score));
  const trend = clampScore(Number(raw.trend_score ?? fallback.trend_score));
  return {
    is_startup_signal: Boolean(raw.is_startup_signal ?? fallback.is_startup_signal),
    title: cleanText(raw.title || fallback.title, 120),
    problem: cleanText(raw.problem || fallback.problem, 800),
    audience: cleanText(raw.audience || fallback.audience, 400),
    possible_solution: cleanText(raw.possible_solution || fallback.possible_solution, 800),
    category: cleanText(raw.category || fallback.category, 80),
    pain_score: pain,
    demand_score: demand,
    monetization_score: monetization,
    buildability_score: buildability,
    trend_score: trend,
    final_score: weightedScore(pain, demand, monetization, buildability, trend),
    mvp_plan: cleanText(raw.mvp_plan || fallback.mvp_plan, 1600),
    codex_prompt: cleanText(raw.codex_prompt || fallback.codex_prompt, 1600),
    language: normalizeLanguage(raw.language || fallback.language || inferLanguage(post.text)),
    group_key: groupKeyFor(raw.group_key || raw.title || fallback.title, raw.category || fallback.category, raw.language || fallback.language || inferLanguage(post.text))
  };
}

async function saveAnalysis(env: Env, rawPostId: number, analysis: Analysis, analyzer: string) {
  await env.DB.prepare(
    `INSERT INTO post_analysis
     (raw_post_id, is_startup_signal, title, problem, audience, possible_solution, category,
      pain_score, demand_score, monetization_score, buildability_score, trend_score, final_score,
      mvp_plan, codex_prompt, analyzer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      rawPostId,
      analysis.is_startup_signal ? 1 : 0,
      analysis.title,
      analysis.problem,
      analysis.audience,
      analysis.possible_solution,
      analysis.category,
      analysis.pain_score,
      analysis.demand_score,
      analysis.monetization_score,
      analysis.buildability_score,
      analysis.trend_score,
      analysis.final_score,
      analysis.mvp_plan,
      analysis.codex_prompt,
      analyzer
    )
    .run();
}

async function upsertIdea(env: Env, post: RawPost, analysis: Analysis): Promise<IdeaUpsertResult> {
  const language = normalizeLanguage(analysis.language || post.language || inferLanguage(post.text));
  const groupKey = cleanGroupKey(analysis.group_key) || groupKeyFor(analysis.title, analysis.category, language);
  const threshold = Number(env.ALERT_SCORE_THRESHOLD || 8.5);
  const existing = await env.DB.prepare(
    `SELECT * FROM ideas
     WHERE group_key = ? AND category = ? AND language = ?
     ORDER BY final_score DESC LIMIT 1`
  )
    .bind(groupKey, analysis.category, language)
    .first<{
      id: number;
      source_count: number;
      pain_score: number;
      demand_score: number;
      monetization_score: number;
      buildability_score: number;
      trend_score: number;
      final_score: number;
      telegram_alert_sent?: number;
    }>();

  if (existing) {
    const sourceCount = existing.source_count + 1;
    const nextScore = Math.max(existing.final_score, analysis.final_score);
    await env.DB.prepare(
      `UPDATE ideas SET
        pain_score = ?, demand_score = ?, monetization_score = ?, buildability_score = ?, trend_score = ?,
        final_score = ?, source_count = ?, last_seen_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(
        average(existing.pain_score, analysis.pain_score),
        average(existing.demand_score, analysis.demand_score),
        average(existing.monetization_score, analysis.monetization_score),
        average(existing.buildability_score, analysis.buildability_score),
        average(existing.trend_score, analysis.trend_score),
        nextScore,
        sourceCount,
        existing.id
      )
      .run();
    await env.DB.prepare("INSERT OR IGNORE INTO idea_sources (idea_id, raw_post_id) VALUES (?, ?)")
      .bind(existing.id, post.id)
      .run();
    return {
      ideaId: existing.id,
      created: false,
      updated: true,
      shouldAlert: nextScore >= threshold && !existing.telegram_alert_sent
    };
  }

  const inserted = await env.DB.prepare(
    `INSERT INTO ideas
     (title, problem, audience, possible_solution, category, language, group_key, pain_score, demand_score, monetization_score,
      buildability_score, trend_score, final_score, mvp_plan, codex_prompt, source_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  )
    .bind(
      analysis.title,
      analysis.problem,
      analysis.audience,
      analysis.possible_solution,
      analysis.category,
      language,
      groupKey,
      analysis.pain_score,
      analysis.demand_score,
      analysis.monetization_score,
      analysis.buildability_score,
      analysis.trend_score,
      analysis.final_score,
      analysis.mvp_plan,
      analysis.codex_prompt
    )
    .run();
  await env.DB.prepare("INSERT OR IGNORE INTO idea_sources (idea_id, raw_post_id) VALUES (?, ?)")
    .bind(inserted.meta.last_row_id, post.id)
    .run();
  const ideaId = Number(inserted.meta.last_row_id);
  return {
    ideaId,
    created: true,
    updated: false,
    shouldAlert: analysis.final_score >= threshold
  };
}

async function finishRun(env: Env, runId: number, status: string, counters: ScanResult, error: string | null = null) {
  await env.DB.prepare(
    `UPDATE scan_runs SET
      status = ?, finished_at = CURRENT_TIMESTAMP, keywords_scanned = ?, posts_found = ?, posts_saved = ?,
      shortlisted = ?, analyzed = ?, ideas_created = ?, ideas_updated = ?, error = ?
     WHERE id = ?`
  )
    .bind(
      status,
      counters.keywordsScanned,
      counters.postsFound,
      counters.postsSaved,
      counters.shortlisted,
      counters.analyzed,
      counters.ideasCreated,
      counters.ideasUpdated,
      error,
      runId
    )
    .run();
}

async function sendStrongIdeaAlert(env: Env, ideaId: number) {
  const idea = await env.DB.prepare("SELECT * FROM ideas WHERE id = ?")
    .bind(ideaId)
    .first<IdeaAlertCandidate>();
  if (!idea || idea.telegram_alert_sent) return false;

  const result = await sendTelegram(env, formatStrongIdeaMessage(env, idea));
  if (result.ok) {
    await env.DB.prepare(
      "UPDATE ideas SET telegram_alert_sent = 1, last_alerted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(ideaId)
      .run();
  }
  return result.ok;
}

async function sendDailyDigest(env: Env, limit = 5) {
  const rows = await env.DB.prepare(
    `SELECT * FROM ideas
     WHERE final_score >= 7.5 AND status != 'rejected' AND last_seen_at >= datetime('now', '-1 day')
     ORDER BY final_score DESC, last_seen_at DESC LIMIT ?`
  )
    .bind(limit)
    .all<IdeaAlertCandidate>();
  if (!rows.results.length) return false;
  const lines = rows.results.map((idea, index) =>
    [
      `${index + 1}. ${idea.title} — ${Number(idea.final_score).toFixed(1)}`,
      `${idea.category} / ${String(idea.language || "en").toUpperCase()}`,
      shortLine(String(idea.problem), 180),
      ideaUrl(env, Number(idea.id))
    ].join("\n")
  );
  const result = await sendTelegram(env, ["📡 Idea Radar Daily Digest", "", ...lines].join("\n\n"));
  return result.ok;
}

async function sendTelegram(env: Env, text: string): Promise<TelegramResult> {
  if (!hasTelegram(env)) {
    return { ok: false, configured: false, error: "Telegram is not configured" };
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: text.slice(0, 3900),
        disable_web_page_preview: false
      })
    });
    const json: { ok?: boolean; description?: string } = await response.json<{ ok?: boolean; description?: string }>().catch(() => ({}));
    if (!response.ok || !json.ok) {
      return {
        ok: false,
        configured: true,
        error: json.description || `Telegram API returned ${response.status}`,
        description: json.description
      };
    }
    return { ok: true, configured: true };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function formatStrongIdeaMessage(env: Env, idea: IdeaAlertCandidate) {
  return [
    "🔥 Strong Idea",
    "",
    idea.title,
    `Score: ${Number(idea.final_score).toFixed(1)}`,
    `Category: ${idea.category} / ${String(idea.language || "en").toUpperCase()}`,
    "",
    `Problem: ${shortLine(idea.problem, 420)}`,
    "",
    `MVP idea: ${shortLine(idea.possible_solution, 280)}`,
    "",
    `Open: ${ideaUrl(env, Number(idea.id))}`
  ].join("\n");
}

function ideaUrl(env: Env, id: number) {
  const base = (env.DASHBOARD_URL || "http://127.0.0.1:8789").replace(/\/+$/, "");
  return `${base}/ideas/${id}`;
}

function shortLine(value: string, max: number) {
  const clean = cleanText(value, max + 20);
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

async function cleanupRawPosts(env: Env) {
  await env.DB.prepare("DELETE FROM raw_posts WHERE created_at < datetime('now', '-30 days')").run();
}

async function markStaleRuns(env: Env) {
  await env.DB.prepare(
    "UPDATE scan_runs SET status = 'failed', finished_at = CURRENT_TIMESTAMP, error = 'stale local run interrupted' WHERE status = 'running' AND started_at < datetime('now', '-10 minutes')"
  ).run();
}

async function clearDemoData(env: Env) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM idea_sources"),
    env.DB.prepare("DELETE FROM post_analysis"),
    env.DB.prepare("DELETE FROM ideas"),
    env.DB.prepare("DELETE FROM raw_posts"),
    env.DB.prepare("DELETE FROM scan_runs")
  ]);
}

function isAuthorized(request: Request, env: Env) {
  if (!env.ADMIN_TOKEN) return true;
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-admin-token");
  return token === env.ADMIN_TOKEN;
}

function isMockMode(env: Env) {
  if (env.MOCK_MODE === "true") return true;
  if (env.MOCK_MODE === "false") return false;
  return !env.THREADS_ACCESS_TOKEN;
}

function hasTelegram(env: Env) {
  return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

async function safeJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

function weightedScore(pain: number, demand: number, monetization: number, buildability: number, trend: number) {
  return Number((pain * 0.3 + demand * 0.25 + monetization * 0.2 + buildability * 0.15 + trend * 0.1).toFixed(2));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function clampScore(value: number) {
  return Number(clamp(value, 0, 10).toFixed(1));
}

function signalCount(text: string) {
  return SIGNALS.filter((signal) => text.includes(signal)).length;
}

function inferCategory(keyword: string, text: string) {
  const source = `${keyword} ${text}`.toLowerCase();
  if (source.includes("ai")) return "AI tools";
  if (source.includes("dev") || source.includes("coding") || source.includes("инструмент")) return "devtools";
  if (source.includes("local") || source.includes("gym") || source.includes("spreadsheet")) return "local business";
  if (source.includes("app") || source.includes("прилож")) return "apps";
  if (source.includes("website")) return "websites";
  return "micro SaaS";
}

function inferAudience(category: string) {
  const map: Record<string, string> = {
    "AI tools": "Founders, operators, creators, and teams with repeated knowledge-work tasks.",
    devtools: "Developers, vibe coders, indie hackers, and small engineering teams.",
    "local business": "Local service businesses, studios, clinics, gyms, and agencies.",
    apps: "Consumers or prosumers frustrated by a repeated daily workflow.",
    websites: "Creators, local businesses, and niche communities that need a clearer web workflow."
  };
  return map[category] || "Indie founders, small teams, and operators with repeated manual work.";
}

function demoPostsForKeyword(keyword: Keyword) {
  const language = normalizeLanguage(keyword.language);
  const category = keyword.category;
  if (language === "ru") {
    if (category === "AI tools") {
      return [
        "Нужен сервис, который разбирает клиентские сообщения из Telegram и превращает их в список задач, рисков и готовый ответ. Я бы платил за это каждый месяц.",
        "Заебался вручную собирать повторяющиеся жалобы из чатов поддержки. Почему нет AI-инструмента, который сам делает сводку и план улучшений?",
        "Надо автоматизировать разбор голосовых и текстовых отзывов клиентов: сейчас всё копируется в таблицу, это бесит и занимает часы."
      ];
    }
    if (category === "devtools" || category === "vibe coding") {
      return [
        "Ищу инструмент для vibe coding: вставляешь идею, а он делает структуру проекта, задачи для Codex и чеклист запуска. Я бы платил.",
        "Бесит вручную переводить фидбек пользователей в issues. Нужен devtool, который группирует баги и пишет понятные задачи.",
        "Почему нет приложения, которое смотрит на README и ошибки сборки, а потом предлагает точный план фикса для новичков?"
      ];
    }
    if (category === "local business") {
      return [
        "Нужен сервис для локальных студий: заявки приходят из Instagram и Telegram, потом всё теряется в таблицах. Надо автоматизировать follow-up.",
        "Почему нет простого приложения для салонов, которое превращает сообщения клиентов в записи, напоминания и повторные продажи?",
        "Бесит вручную сверять заявки, оплаты и расписание. Я бы платил за маленькую CRM для локального бизнеса."
      ];
    }
    return [
      "Нужен сервис, который собирает заявки из разных каналов, убирает дубли и показывает что делать дальше. Сейчас всё вручную.",
      "Почему нет приложения для маленьких команд, где можно быстро превратить хаос из сообщений в понятный рабочий процесс?",
      "Я бы платил за инструмент, который помогает найти повторяющуюся боль клиентов и сразу собрать MVP-план."
    ];
  }

  if (category === "AI tools") {
    return [
      "Someone should build an AI tool that turns messy client emails into a scoped task list, risks, estimate, and reply draft. I would pay for it monthly.",
      "I need a tool that reads support chats, groups repeated complaints, and turns them into a weekly product improvement plan.",
      "Wish there was an AI assistant that converts customer voice notes and emails into clean tickets without another manual spreadsheet."
    ];
  }
  if (category === "devtools" || category === "vibe coding") {
    return [
      "Need a tool for vibe coding that turns a rough idea into repo structure, Codex prompts, and a launch checklist.",
      "Someone should build a devtool that reads build errors, README files, and package scripts, then explains the next fix like a senior engineer.",
      "It is annoying to turn user feedback into GitHub issues manually. I would pay for a tiny assistant that clusters bugs and writes clear tickets."
    ];
  }
  if (category === "local business") {
    return [
      "Why is there no app for local gyms to turn Instagram DMs into bookings, reminders, and follow-ups? Everything is manual spreadsheet chaos.",
      "I would pay for a simple CRM that helps salons capture leads from messages, schedule visits, and remind clients automatically.",
      "Someone should build a lightweight booking follow-up tool for local service businesses that live inside DMs."
    ];
  }
  if (category === "websites") {
    return [
      "Wish there was a website builder for niche service businesses that starts from their messages and creates pages, FAQs, and quote forms.",
      "Someone should build a tiny site generator that turns messy offer notes into a landing page, pricing page, and intake form.",
      "Why is there no app that helps creators turn repeated audience questions into a useful searchable mini-site?"
    ];
  }
  return [
    "Someone should build a micro SaaS that turns repeated customer requests into workflows, templates, and reminders.",
    "I would pay for a tool that spots manual spreadsheet work in a small team and suggests the fastest automation to ship.",
    "Need a tool that collects scattered requests, finds patterns, and creates a simple MVP plan for the most painful workflow."
  ];
}

function ideaBlueprint(category: string, language: string, keyword: string, text: string) {
  const normalizedLanguage = normalizeLanguage(language || inferLanguage(text));
  const normalizedCategory = category || inferCategory(keyword, text);
  const ru = normalizedLanguage === "ru";

  const blueprints: Record<string, ReturnType<typeof makeBlueprint>> = {
    "AI tools": ru
      ? makeBlueprint(
          "AI-сводки клиентских сообщений",
          "Команды вручную разбирают письма, чаты и отзывы клиентов, поэтому повторяющиеся проблемы теряются и превращаются в задачи слишком поздно.",
          "Основатели, саппорт, агентства и продуктовые команды.",
          "Сервис собирает сообщения, группирует боли, выделяет риски и превращает их в задачи, ответы и план улучшений.",
          "1. Загрузить или вставить сообщения.\n2. Сгруппировать повторяющиеся боли.\n3. Сгенерировать задачи, риски и ответ клиенту.\n4. Добавить еженедельную сводку.",
          "Собери MVP AI-сервиса на Cloudflare Workers + React, который превращает клиентские сообщения в задачи, риски, ответы и план улучшений."
        )
      : makeBlueprint(
          "AI Customer Message Triage",
          "Teams lose hours turning messy emails, chats, and customer feedback into scoped tasks, risks, and replies.",
          "Founders, support teams, agencies, consultants, and product operators.",
          "An AI workspace that groups repeated pain, extracts requirements, drafts replies, and creates a practical improvement plan.",
          "1. Paste or forward messages.\n2. Cluster repeated complaints and requests.\n3. Generate tasks, risks, estimates, and replies.\n4. Send weekly summaries.",
          "Build a Cloudflare Workers + React MVP that turns customer messages into clustered pains, tasks, risks, reply drafts, and weekly summaries."
        ),
    devtools: ru
      ? makeBlueprint(
          "Devtool для задач из фидбека",
          "Разработчики и vibe coders вручную превращают ошибки, README и пользовательский фидбек в понятные задачи.",
          "Разработчики, indie hackers, vibe coders и маленькие команды.",
          "Инструмент анализирует контекст проекта, группирует фидбек и пишет готовые issues, планы фикса и Codex prompts.",
          "1. Подключить репозиторий или вставить лог.\n2. Найти повторяющиеся проблемы.\n3. Сгенерировать issues и план фикса.\n4. Экспортировать prompts для Codex.",
          "Собери devtool MVP для генерации issues, планов фикса и Codex prompts из логов, README и пользовательского фидбека."
        )
      : makeBlueprint(
          "Vibe Coding Project Planner",
          "Builders waste time translating rough ideas, build errors, and feedback into repo structure, issues, and next prompts.",
          "Developers, vibe coders, indie hackers, and small engineering teams.",
          "A devtool that turns ideas and project context into structure, tickets, fix plans, and high-quality Codex prompts.",
          "1. Paste idea, README, logs, or feedback.\n2. Detect project type and blockers.\n3. Generate repo plan, issues, and prompts.\n4. Track build-ready next steps.",
          "Build a devtool MVP that converts rough product ideas, logs, README files, and feedback into repo plans, GitHub issues, and Codex prompts."
        ),
    "local business": ru
      ? makeBlueprint(
          "CRM заявок из сообщений",
          "Локальные бизнесы теряют заявки и повторные продажи, потому что сообщения, записи и follow-up живут в разных чатах и таблицах.",
          "Салоны, студии, тренеры, клиники и локальные сервисы.",
          "Мини-CRM собирает лиды из сообщений, ведет статусы, напоминает о follow-up и показывает конверсию.",
          "1. Добавить лид вручную или импортом.\n2. Вести статус заявки.\n3. Настроить напоминания.\n4. Смотреть простую аналитику.",
          "Собери MVP мини-CRM для локального бизнеса: заявки из сообщений, статусы, follow-up, напоминания и простая аналитика."
        )
      : makeBlueprint(
          "DM-to-Booking CRM",
          "Local businesses lose bookings because leads, reminders, and follow-ups are scattered across DMs and spreadsheets.",
          "Gyms, salons, studios, clinics, coaches, and local service operators.",
          "A lightweight CRM that captures message leads, tracks booking status, sends reminders, and shows follow-up priorities.",
          "1. Capture leads from DMs manually or by import.\n2. Track booking stages.\n3. Add reminders and follow-ups.\n4. Show simple conversion stats.",
          "Build a DM-to-booking CRM MVP for local service businesses with lead capture, booking status, reminders, and simple conversion tracking."
        )
  };

  return (
    blueprints[normalizedCategory] ||
    (ru
      ? makeBlueprint(
          "Автоматизация ручного workflow",
          "Маленькие команды видят повторяющуюся боль клиентов, но продолжают решать её вручную в сообщениях и таблицах.",
          "Основатели, операторы и небольшие команды.",
          "Сервис находит повторяющиеся запросы, группирует их и предлагает самый быстрый MVP или автоматизацию.",
          "1. Собрать запросы.\n2. Найти повторы.\n3. Оценить боль и спрос.\n4. Сгенерировать MVP-план.",
          "Собери MVP сервиса, который находит повторяющиеся боли клиентов и превращает их в план автоматизации или micro SaaS."
        )
      : makeBlueprint(
          "Manual Workflow Automation Radar",
          "Small teams keep solving repeated customer requests manually in chats, spreadsheets, and scattered notes.",
          "Founders, operators, agencies, and small teams.",
          "A tool that detects repeated pain, groups requests, scores demand, and suggests the fastest automation or micro SaaS MVP.",
          "1. Collect requests.\n2. Cluster repeated workflows.\n3. Score pain and demand.\n4. Generate a build-ready MVP plan.",
          "Build an MVP that finds repeated customer pains in messy notes and turns them into scored automation or micro SaaS plans."
        ))
  );
}

function makeBlueprint(
  title: string,
  problem: string,
  audience: string,
  solution: string,
  mvpPlan: string,
  codexPrompt: string
) {
  return { title, problem, audience, solution, mvpPlan, codexPrompt };
}

function groupKeyFor(value: string, category: string, language: string) {
  const normalized = normalizeForSignature(`${language} ${category} ${value}`)
    .split(" ")
    .filter((token) => !GROUP_STOP_WORDS.has(token))
    .slice(0, 8)
    .join("-");
  return cleanText(normalized || `${normalizeLanguage(language)}-${slug(category)}`, 96);
}

function cleanGroupKey(value?: string) {
  if (!value) return "";
  return normalizeForSignature(value)
    .split(" ")
    .filter((token) => !GROUP_STOP_WORDS.has(token))
    .slice(0, 8)
    .join("-");
}

function normalizeForSignature(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GROUP_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "into",
  "from",
  "для",
  "или",
  "что",
  "это",
  "как",
  "из",
  "в"
]);

function normalizeLanguage(language: string) {
  return language?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function inferLanguage(text: string) {
  return /[а-яё]/i.test(text) ? "ru" : "en";
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

function cleanText(text: string, max: number) {
  return String(text).replace(/\s+/g, " ").trim().slice(0, max);
}

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function safeLikeSearch(search?: string | null) {
  const cleaned = cleanText(search || "", 64);
  if (cleaned.length < 2) return "";
  const tokens = cleaned
    .split(/\s+/)
    .slice(0, 6)
    .join(" ")
    .replace(/[\\%_]/g, (match) => `\\${match}`);
  return `%${tokens}%`;
}

function renderPublicReviewPage(path: string) {
  const page = PUBLIC_REVIEW_PAGES[path] || PUBLIC_REVIEW_PAGES["/privacy"];
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${page.title} - Idea Radar</title>
    <style>
      :root {
        color: #17211d;
        background: #f6f8f4;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
      }
      main {
        width: min(880px, calc(100% - 32px));
        margin: 0 auto;
        padding: 48px 0 64px;
      }
      nav {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 32px;
      }
      a {
        color: #12615d;
      }
      nav a {
        text-decoration: none;
        border: 1px solid #cfdcd1;
        border-radius: 8px;
        padding: 8px 10px;
        background: #fff;
      }
      h1 {
        font-size: clamp(32px, 6vw, 48px);
        line-height: 1.05;
        margin: 0 0 16px;
      }
      h2 {
        font-size: 20px;
        margin: 28px 0 8px;
      }
      p, li {
        line-height: 1.7;
        color: #34423c;
      }
      code {
        background: #edf2ee;
        border-radius: 6px;
        padding: 2px 5px;
      }
      .card {
        background: #fff;
        border: 1px solid #dfe7df;
        border-radius: 8px;
        padding: 28px;
      }
      .updated {
        color: #607168;
        margin-bottom: 20px;
      }
    </style>
  </head>
  <body>
    <main>
      <nav aria-label="Public policy pages">
        <a href="/privacy">Privacy</a>
        <a href="/data-deletion">Data Deletion</a>
        <a href="/terms">Terms</a>
        <a href="/app-review">App Review</a>
      </nav>
      <section class="card">
        <h1>${page.title}</h1>
        <p class="updated">Idea Radar public policy page. Last updated: June 1, 2026.</p>
        ${page.body}
      </section>
    </main>
  </body>
</html>`;
}

function average(a: number, b: number) {
  return Number(((a + b) / 2).toFixed(2));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Workers AI timed out")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
