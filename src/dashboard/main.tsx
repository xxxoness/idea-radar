import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  CircleOff,
  Copy,
  ExternalLink,
  Gauge,
  KeyRound,
  Loader2,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import "./styles.css";

type Idea = {
  id: number;
  title: string;
  problem: string;
  audience: string;
  possible_solution: string;
  category: string;
  language: string;
  group_key: string;
  status: string;
  final_score: number;
  pain_score: number;
  demand_score: number;
  monetization_score: number;
  buildability_score: number;
  trend_score: number;
  mvp_plan: string;
  codex_prompt: string;
  source_count: number;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

type Source = {
  id: number;
  permalink: string;
  text: string;
  username: string;
  keyword: string;
  language: string;
  search_type: string;
  raw_score: number;
  posted_at: string;
};

type Keyword = {
  id: number;
  phrase: string;
  category: string;
  language: string;
  priority: number;
  enabled: number;
};

type Health = {
  ok: boolean;
  mode: "mock" | "real";
  tokens: Record<string, boolean>;
  limits?: {
    maxKeywordsPerScan: number;
    maxPostsPerSearch: number;
    maxAiCandidates: number;
    alertScoreThreshold: number;
  };
  config?: {
    dashboardUrlSet: boolean;
  };
};

type ScanRun = {
  id: number;
  started_at: string;
  finished_at: string | null;
  mode: string;
  status: string;
  keywords_scanned: number;
  posts_found: number;
  posts_saved: number;
  shortlisted: number;
  analyzed: number;
  ideas_created: number;
  ideas_updated: number;
  error: string | null;
};

type ThreadsDiagnostics = {
  ok: boolean;
  mode: "mock" | "real";
  tokenPresent: boolean;
  keyword: string;
  me: { ok: boolean; status?: number; error?: string; data?: unknown };
  keywordSearch: { ok: boolean; status?: number; error?: string; postsReturned: number };
  lastRealScan: Partial<ScanRun> | null;
  lastThreadsApiError: string | null;
  hint?: string;
};

type View = "home" | "ideas" | "keywords" | "settings" | "idea";
type NoticeKind = "success" | "error" | "info";
type Notice = { kind: NoticeKind; text: string } | null;

const tokenKey = "idea-radar-admin-token";
const navItems: Array<{ view: View; label: string; icon: React.ReactNode }> = [
  { view: "home", label: "Overview", icon: <Gauge size={18} /> },
  { view: "ideas", label: "Ideas", icon: <Sparkles size={18} /> },
  { view: "keywords", label: "Keywords", icon: <Search size={18} /> },
  { view: "settings", label: "Settings", icon: <Settings size={18} /> }
];

function App() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem(tokenKey) || "");
  const [route, setRoute] = useState(parseRoute());
  const [health, setHealth] = useState<Health | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [runs, setRuns] = useState<ScanRun[]>([]);
  const [ideaDetail, setIdeaDetail] = useState<Idea | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [filters, setFilters] = useState({ status: "all", category: "all", minScore: "0", search: "" });
  const [draftKeyword, setDraftKeyword] = useState({ phrase: "", category: "AI tools", language: "en", priority: 4 });
  const [threadsKeyword, setThreadsKeyword] = useState("radar-test");
  const [threadsDiagnostics, setThreadsDiagnostics] = useState<ThreadsDiagnostics | null>(null);

  const authedFetch = useMemo(() => {
    return async <T,>(path: string, init: RequestInit = {}) => {
      const response = await fetch(path, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: adminToken ? `Bearer ${adminToken}` : "",
          ...(init.headers || {})
        }
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json() as Promise<T>;
    };
  }, [adminToken]);

  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    refresh();
  }, [adminToken, filters.status, filters.category, filters.minScore]);

  useEffect(() => {
    if (route.view === "idea" && route.ideaId) {
      loadIdea(route.ideaId);
    }
  }, [route.view, route.ideaId, adminToken]);

  useEffect(() => {
    if (route.view === "settings") {
      loadThreadsDiagnostics(threadsKeyword);
    }
  }, [route.view, adminToken]);

  const view = route.view;
  const topToday = ideas.slice(0, 5);
  const promisingIdeas = ideas.filter((idea) => idea.final_score >= 8);
  const strongSignals = ideas.filter((idea) => idea.final_score >= 8.5);
  const categories = Array.from(new Set(ideas.map((idea) => idea.category))).sort();

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [healthData, ideasData, keywordData, runsData] = await Promise.all([
        fetch("/api/health").then((r) => r.json() as Promise<Health>),
        authedFetch<{ ideas: Idea[] }>(
          `/api/ideas?status=${filters.status}&category=${filters.category}&min_score=${filters.minScore}&search=${encodeURIComponent(filters.search)}`
        ),
        authedFetch<{ keywords: Keyword[] }>("/api/keywords"),
        authedFetch<{ runs: ScanRun[] }>("/api/scan/runs")
      ]);
      setHealth(healthData);
      setIdeas(ideasData.ideas);
      setKeywords(keywordData.keywords);
      setRuns(runsData.runs);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function loadIdea(id: number) {
    setDetailLoading(true);
    setError("");
    try {
      const data = await authedFetch<{ idea: Idea; sources: Source[] }>(`/api/ideas/${id}`);
      setIdeaDetail(data.idea);
      setSources(data.sources);
    } catch (requestError) {
      setError(errorMessage(requestError));
      setIdeaDetail(null);
      setSources([]);
    } finally {
      setDetailLoading(false);
    }
  }

  function navigate(nextView: View, id?: number) {
    const path = nextView === "idea" && id ? `/ideas/${id}` : nextView === "home" ? "/" : `/${nextView}`;
    window.history.pushState({}, "", path);
    setRoute(parseRoute());
  }

  function saveToken(value: string) {
    setAdminToken(value);
    localStorage.setItem(tokenKey, value);
  }

  function clearToken() {
    setAdminToken("");
    localStorage.removeItem(tokenKey);
    showNotice("info", "Access token cleared");
  }

  async function runScan() {
    setActionBusy("scan");
    showNotice("info", "Scan started");
    try {
      const result = await authedFetch<{
        ok: boolean;
        postsFound?: number;
        shortlisted?: number;
        ideasCreated?: number;
        ideasUpdated?: number;
        error?: string;
      }>("/api/scan/run", { method: "POST" });
      if (!result.ok) throw new Error(result.error || "Scan failed");
      const changedIdeas = (result.ideasCreated || 0) + (result.ideasUpdated || 0);
      if (changedIdeas > 0) {
        showNotice("success", `Scan finished: ${result.ideasCreated || 0} created, ${result.ideasUpdated || 0} updated`);
      } else if ((result.postsFound || 0) === 0) {
        showNotice("info", "Scan completed, but Threads returned 0 posts");
      } else if ((result.shortlisted || 0) === 0) {
        showNotice("info", "Posts found, but no startup signal passed pre-filter");
      } else {
        showNotice("info", "Scan completed with no new idea updates");
      }
      await refresh();
      if (route.view === "settings") await loadThreadsDiagnostics(threadsKeyword);
    } catch (requestError) {
      showNotice("error", errorMessage(requestError));
    } finally {
      setActionBusy("");
    }
  }

  async function setIdeaStatus(id: number, status: string) {
    setActionBusy(`idea-${id}-${status}`);
    try {
      await authedFetch(`/api/ideas/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      showNotice("success", `Idea marked ${labelStatus(status)}`);
      setIdeas((current) => current.map((idea) => (idea.id === id ? { ...idea, status } : idea)));
      if (ideaDetail?.id === id) setIdeaDetail({ ...ideaDetail, status });
    } catch (requestError) {
      showNotice("error", errorMessage(requestError));
    } finally {
      setActionBusy("");
    }
  }

  async function addKeyword() {
    if (!draftKeyword.phrase.trim()) {
      showNotice("error", "Keyword phrase is required");
      return;
    }
    setKeywordsLoading(true);
    try {
      await authedFetch("/api/keywords", { method: "POST", body: JSON.stringify(draftKeyword) });
      showNotice("success", "Keyword added");
      setDraftKeyword({ phrase: "", category: draftKeyword.category, language: draftKeyword.language, priority: 4 });
      await refresh();
    } catch (requestError) {
      showNotice("error", errorMessage(requestError));
    } finally {
      setKeywordsLoading(false);
    }
  }

  async function patchKeyword(keyword: Keyword, patch: Partial<Keyword>) {
    setKeywordsLoading(true);
    try {
      await authedFetch(`/api/keywords/${keyword.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...keyword, ...patch })
      });
      showNotice("success", "Keyword updated");
      await refresh();
    } catch (requestError) {
      showNotice("error", errorMessage(requestError));
    } finally {
      setKeywordsLoading(false);
    }
  }

  async function deleteKeyword(keyword: Keyword) {
    if (!window.confirm(`Delete keyword "${keyword.phrase}"?`)) return;
    setKeywordsLoading(true);
    try {
      await authedFetch(`/api/keywords/${keyword.id}`, { method: "DELETE" });
      showNotice("success", "Keyword deleted");
      await refresh();
    } catch (requestError) {
      showNotice("error", errorMessage(requestError));
    } finally {
      setKeywordsLoading(false);
    }
  }

  async function testTelegram() {
    setActionBusy("telegram");
    try {
      const result = await authedFetch<{ ok: boolean; configured: boolean; error?: string }>("/api/telegram/test", { method: "POST" });
      showNotice(
        result.ok ? "success" : result.configured ? "error" : "info",
        result.ok ? "Telegram test sent" : result.error || "Telegram is not configured"
      );
    } catch (requestError) {
      showNotice("error", errorMessage(requestError));
    } finally {
      setActionBusy("");
    }
  }

  async function loadThreadsDiagnostics(keyword: string) {
    setActionBusy((current) => (current ? current : "threads-diagnostics"));
    try {
      const result = await authedFetch<ThreadsDiagnostics>(`/api/threads/diagnostics?q=${encodeURIComponent(keyword || "radar-test")}`);
      setThreadsDiagnostics(result);
      return result;
    } catch (requestError) {
      showNotice("error", errorMessage(requestError));
      return null;
    } finally {
      setActionBusy((current) => (current === "threads-diagnostics" ? "" : current));
    }
  }

  async function testThreadsKeyword() {
    setActionBusy("threads-test");
    try {
      const result = await loadThreadsDiagnostics(threadsKeyword);
      if (!result) return;
      if (result.keywordSearch.ok) {
        showNotice("success", `Threads API returned ${result.keywordSearch.postsReturned} posts`);
      } else {
        showNotice("error", result.keywordSearch.error || result.me.error || "Threads API test failed");
      }
    } finally {
      setActionBusy("");
    }
  }

  async function clearDemoData() {
    if (!window.confirm("Clear demo ideas, raw posts, analyses, sources, and scan runs?")) return;
    setActionBusy("clear-demo");
    try {
      const result = await authedFetch<{ ok: boolean; error?: string }>("/api/demo/clear", { method: "POST" });
      if (!result.ok) throw new Error(result.error || "Cleanup failed");
      showNotice("success", "Demo data cleared");
      await refresh();
      if (route.view === "idea") navigate("ideas");
    } catch (requestError) {
      showNotice("error", errorMessage(requestError));
    } finally {
      setActionBusy("");
    }
  }

  function showNotice(kind: NoticeKind, text: string) {
    setNotice({ kind, text });
    window.setTimeout(() => setNotice(null), 4200);
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Radar size={28} />
          <div>
            <strong>Idea Radar</strong>
            <span>{health?.mode === "real" ? "Threads API" : "Mock mode"}</span>
          </div>
        </div>

        <nav>
          {navItems.map((item) => (
            <button
              key={item.view}
              className={(view === item.view || (item.view === "ideas" && view === "idea")) ? "active" : ""}
              onClick={() => navigate(item.view)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <button className="primary wide" onClick={runScan} disabled={actionBusy === "scan"}>
          <RefreshCw size={17} className={actionBusy === "scan" ? "spin" : ""} /> Run scan now
        </button>
      </aside>

      <main>
        <header className="topbar">
          <div className="tokenControl">
            <label>Access token</label>
            <div className="tokenBox">
              <KeyRound size={17} />
              <input
                type="password"
                placeholder="Admin access"
                value={adminToken}
                onChange={(event) => saveToken(event.target.value)}
              />
              {adminToken && (
                <button className="ghostIcon" onClick={clearToken} aria-label="Clear access token">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
          <button className="iconButton" onClick={refresh} aria-label="Refresh" disabled={loading}>
            <RefreshCw size={18} className={loading ? "spin" : ""} />
          </button>
        </header>

        {notice && <div className={`notice ${notice.kind}`}>{notice.text}</div>}
        {error && <div className="pageError">{error}</div>}

        {view === "home" && (
          <Overview
            ideas={ideas}
            keywords={keywords}
            runs={runs}
            topToday={topToday}
            promisingIdeas={promisingIdeas}
            strongSignals={strongSignals}
            loading={loading}
            onOpen={(idea) => navigate("idea", idea.id)}
            onStatus={setIdeaStatus}
            actionBusy={actionBusy}
          />
        )}

        {view === "ideas" && (
          <IdeasPage
            ideas={ideas}
            categories={categories}
            filters={filters}
            loading={loading}
            setFilters={setFilters}
            refresh={refresh}
            onOpen={(idea) => navigate("idea", idea.id)}
            onStatus={setIdeaStatus}
            actionBusy={actionBusy}
          />
        )}

        {view === "idea" && (
          <IdeaPage
            idea={ideaDetail}
            sources={sources}
            loading={detailLoading}
            actionBusy={actionBusy}
            onBack={() => navigate("ideas")}
            onStatus={setIdeaStatus}
            showNotice={showNotice}
          />
        )}

        {view === "keywords" && (
          <KeywordsPage
            keywords={keywords}
            loading={loading || keywordsLoading}
            draftKeyword={draftKeyword}
            setDraftKeyword={setDraftKeyword}
            addKeyword={addKeyword}
            patchKeyword={patchKeyword}
            deleteKeyword={deleteKeyword}
          />
        )}

        {view === "settings" && (
          <SettingsPage
            health={health}
            loading={loading}
            actionBusy={actionBusy}
            onTelegramTest={testTelegram}
            onClearDemo={clearDemoData}
            runs={runs}
            threadsKeyword={threadsKeyword}
            setThreadsKeyword={setThreadsKeyword}
            threadsDiagnostics={threadsDiagnostics}
            onThreadsTest={testThreadsKeyword}
          />
        )}
      </main>
    </div>
  );
}

function Overview({
  ideas,
  keywords,
  runs,
  topToday,
  promisingIdeas,
  strongSignals,
  loading,
  onOpen,
  onStatus,
  actionBusy
}: {
  ideas: Idea[];
  keywords: Keyword[];
  runs: ScanRun[];
  topToday: Idea[];
  promisingIdeas: Idea[];
  strongSignals: Idea[];
  loading: boolean;
  onOpen: (idea: Idea) => void;
  onStatus: (id: number, status: string) => void;
  actionBusy: string;
}) {
  return (
    <section className="content">
      <div className="metrics">
        <Metric label="Top score" value={ideas[0]?.final_score?.toFixed(1) || "0.0"} />
        <Metric label="New ideas" value={String(ideas.filter((idea) => idea.status === "new").length)} />
        <Metric label="Strong signals" value={String(strongSignals.length)} />
        <Metric label="Keywords" value={String(keywords.length)} />
      </div>

      <Panel title="Top Ideas Today" icon={<Sparkles size={19} />}>
        <IdeaList
          ideas={topToday}
          loading={loading}
          emptyText="No ideas yet. Run a scan to fill today's radar."
          onOpen={onOpen}
          onStatus={onStatus}
          actionBusy={actionBusy}
        />
      </Panel>

      <Panel title="Promising Ideas 8.0+" icon={<Gauge size={19} />}>
        <IdeaList
          ideas={promisingIdeas.slice(0, 6)}
          loading={loading}
          emptyText="No ideas above 8.0 yet."
          onOpen={onOpen}
          onStatus={onStatus}
          actionBusy={actionBusy}
        />
      </Panel>

      <Panel title="Strong Signals 8.5+" icon={<Activity size={19} />}>
        <IdeaList
          ideas={strongSignals.slice(0, 6)}
          loading={loading}
          emptyText="No ideas above 8.5 yet"
          onOpen={onOpen}
          onStatus={onStatus}
          actionBusy={actionBusy}
        />
      </Panel>

      <Panel title="Latest Scan Runs" icon={<RefreshCw size={19} />}>
        {loading ? <LoadingState text="Loading scan runs" /> : <ScanRuns runs={runs} />}
      </Panel>
    </section>
  );
}

function IdeasPage({
  ideas,
  categories,
  filters,
  loading,
  setFilters,
  refresh,
  onOpen,
  onStatus,
  actionBusy
}: {
  ideas: Idea[];
  categories: string[];
  filters: { status: string; category: string; minScore: string; search: string };
  loading: boolean;
  setFilters: (filters: { status: string; category: string; minScore: string; search: string }) => void;
  refresh: () => void;
  onOpen: (idea: Idea) => void;
  onStatus: (id: number, status: string) => void;
  actionBusy: string;
}) {
  return (
    <section className="content">
      <div className="pageHeader">
        <div>
          <h1>Ideas</h1>
          <p>Filter, triage, and open startup signals from the latest scans.</p>
        </div>
      </div>
      <div className="toolbar">
        <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="saved">Saved</option>
          <option value="build_next">Build Next</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          max="10"
          aria-label="Minimum score"
          value={filters.minScore}
          onChange={(event) => setFilters({ ...filters, minScore: event.target.value })}
        />
        <input
          placeholder="Search ideas"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          onKeyDown={(event) => event.key === "Enter" && refresh()}
        />
        <button className="secondary" onClick={refresh}>
          <Search size={16} /> Search
        </button>
      </div>
      <IdeaList
        ideas={ideas}
        loading={loading}
        emptyText="No ideas match these filters."
        onOpen={onOpen}
        onStatus={onStatus}
        actionBusy={actionBusy}
      />
    </section>
  );
}

function IdeaPage({
  idea,
  sources,
  loading,
  actionBusy,
  onBack,
  onStatus,
  showNotice
}: {
  idea: Idea | null;
  sources: Source[];
  loading: boolean;
  actionBusy: string;
  onBack: () => void;
  onStatus: (id: number, status: string) => void;
  showNotice: (kind: NoticeKind, text: string) => void;
}) {
  if (loading) {
    return (
      <section className="content">
        <LoadingState text="Loading idea" />
      </section>
    );
  }

  if (!idea) {
    return (
      <section className="content">
        <button className="secondary fit" onClick={onBack}>
          <ArrowLeft size={16} /> Back to ideas
        </button>
        <EmptyState text="Idea not found." />
      </section>
    );
  }

  return (
    <section className="content detailContent">
      <button className="secondary fit" onClick={onBack}>
        <ArrowLeft size={16} /> Back to ideas
      </button>

      <section className="detailHero">
        <div className="score">{idea.final_score.toFixed(1)}</div>
        <div>
          <div className="ideaBadges">
            <span className="pill">{idea.category}</span>
            <span className="pill neutral">{idea.language?.toUpperCase() || "EN"}</span>
            <span className={`statusPill ${idea.status}`}>{labelStatus(idea.status)}</span>
          </div>
          <h1>{idea.title}</h1>
          <p>{idea.problem}</p>
        </div>
      </section>

      <StatusActions idea={idea} onStatus={onStatus} actionBusy={actionBusy} />

      <div className="detailGrid">
        <Panel title="Audience" icon={<Activity size={18} />}>
          <p className="readable">{idea.audience}</p>
        </Panel>
        <Panel title="Solution" icon={<Sparkles size={18} />}>
          <p className="readable">{idea.possible_solution}</p>
        </Panel>
      </div>

      <Panel title="Scores" icon={<Gauge size={18} />}>
        <div className="scoreGrid">
          <ScoreItem label="Pain" value={idea.pain_score} />
          <ScoreItem label="Demand" value={idea.demand_score} />
          <ScoreItem label="Monetization" value={idea.monetization_score} />
          <ScoreItem label="Buildability" value={idea.buildability_score} />
          <ScoreItem label="Trend" value={idea.trend_score} />
        </div>
      </Panel>

      <Panel title="MVP Plan" icon={<CheckCircle2 size={18} />}>
        <pre>{idea.mvp_plan}</pre>
      </Panel>

      <Panel title="Codex Prompt" icon={<Copy size={18} />}>
        <pre>{idea.codex_prompt}</pre>
        <button
          className="secondary fit"
          onClick={() => {
            navigator.clipboard.writeText(idea.codex_prompt);
            showNotice("success", "Codex prompt copied");
          }}
        >
          <Copy size={16} /> Copy prompt
        </button>
      </Panel>

      <Panel title="Metadata" icon={<Settings size={18} />}>
        <div className="metadataGrid">
          <Meta label="Group key" value={idea.group_key || "missing"} />
          <Meta label="Sources" value={String(idea.source_count)} />
          <Meta label="First seen" value={formatDate(idea.first_seen_at)} />
          <Meta label="Last seen" value={formatDate(idea.last_seen_at)} />
          <Meta label="Created" value={formatDate(idea.created_at)} />
          <Meta label="Updated" value={formatDate(idea.updated_at)} />
        </div>
      </Panel>

      <Panel title="Sources" icon={<ExternalLink size={18} />}>
        {sources.length ? (
          <div className="sources">
            {sources.map((source) => (
              <a className="source" key={source.id} href={source.permalink} target="_blank" rel="noreferrer">
                <strong>@{source.username}</strong>
                <span>{source.text}</span>
                <small>
                  {source.search_type} · {source.keyword} · raw {Number(source.raw_score).toFixed(1)} · {formatDate(source.posted_at)}
                </small>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState text="No sources linked yet." />
        )}
      </Panel>
    </section>
  );
}

function KeywordsPage({
  keywords,
  loading,
  draftKeyword,
  setDraftKeyword,
  addKeyword,
  patchKeyword,
  deleteKeyword
}: {
  keywords: Keyword[];
  loading: boolean;
  draftKeyword: { phrase: string; category: string; language: string; priority: number };
  setDraftKeyword: (draft: { phrase: string; category: string; language: string; priority: number }) => void;
  addKeyword: () => void;
  patchKeyword: (keyword: Keyword, patch: Partial<Keyword>) => void;
  deleteKeyword: (keyword: Keyword) => void;
}) {
  return (
    <section className="content">
      <div className="pageHeader">
        <div>
          <h1>Keywords</h1>
          <p>Manage scan inputs by category, language, priority, and enabled state.</p>
        </div>
      </div>

      <div className="keywordEditor">
        <input
          placeholder="Keyword phrase"
          value={draftKeyword.phrase}
          onChange={(event) => setDraftKeyword({ ...draftKeyword, phrase: event.target.value })}
        />
        <input
          placeholder="Category"
          value={draftKeyword.category}
          onChange={(event) => setDraftKeyword({ ...draftKeyword, category: event.target.value })}
        />
        <select value={draftKeyword.language} onChange={(event) => setDraftKeyword({ ...draftKeyword, language: event.target.value })}>
          <option value="en">EN</option>
          <option value="ru">RU</option>
        </select>
        <input
          aria-label="Priority"
          type="number"
          min="1"
          max="5"
          value={draftKeyword.priority}
          onChange={(event) => setDraftKeyword({ ...draftKeyword, priority: Number(event.target.value) })}
        />
        <button className="primary" onClick={addKeyword} disabled={loading}>
          <Plus size={17} /> Add
        </button>
      </div>

      {loading ? (
        <LoadingState text="Updating keywords" />
      ) : keywords.length ? (
        <div className="keywordList">
          {keywords.map((keyword) => (
            <KeywordRow key={keyword.id} keyword={keyword} patchKeyword={patchKeyword} deleteKeyword={deleteKeyword} />
          ))}
        </div>
      ) : (
        <EmptyState text="No keywords yet. Add one to start scanning." />
      )}
    </section>
  );
}

function KeywordRow({
  keyword,
  patchKeyword,
  deleteKeyword
}: {
  keyword: Keyword;
  patchKeyword: (keyword: Keyword, patch: Partial<Keyword>) => void;
  deleteKeyword: (keyword: Keyword) => void;
}) {
  const [draft, setDraft] = useState(keyword);

  useEffect(() => setDraft(keyword), [keyword]);

  const changed = JSON.stringify(draft) !== JSON.stringify(keyword);

  return (
    <div className="keywordRow">
      <button
        className={keyword.enabled ? "toggle on" : "toggle"}
        onClick={() => patchKeyword(keyword, { enabled: keyword.enabled ? 0 : 1 })}
        aria-label={keyword.enabled ? "Disable keyword" : "Enable keyword"}
      >
        {keyword.enabled ? <Check size={16} /> : <CircleOff size={16} />}
      </button>
      <input value={draft.phrase} onChange={(event) => setDraft({ ...draft, phrase: event.target.value })} />
      <input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
      <select value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value })}>
        <option value="en">EN</option>
        <option value="ru">RU</option>
      </select>
      <input
        aria-label="Keyword priority"
        type="number"
        min="1"
        max="5"
        value={draft.priority}
        onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })}
      />
      <button className="secondary compact" onClick={() => patchKeyword(keyword, draft)} disabled={!changed}>
        Save
      </button>
      <button className="iconButton danger" onClick={() => deleteKeyword(keyword)} aria-label="Delete keyword">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function SettingsPage({
  health,
  loading,
  actionBusy,
  onTelegramTest,
  onClearDemo,
  runs,
  threadsKeyword,
  setThreadsKeyword,
  threadsDiagnostics,
  onThreadsTest
}: {
  health: Health | null;
  loading: boolean;
  actionBusy: string;
  onTelegramTest: () => void;
  onClearDemo: () => void;
  runs: ScanRun[];
  threadsKeyword: string;
  setThreadsKeyword: (value: string) => void;
  threadsDiagnostics: ThreadsDiagnostics | null;
  onThreadsTest: () => void;
}) {
  const lastRealScan = threadsDiagnostics?.lastRealScan || runs.find((run) => run.mode === "real") || null;
  const lastScanSuccess = lastRealScan?.status === "success";
  const postsFound = Number(lastRealScan?.posts_found || 0);
  const threadsSearch = threadsDiagnostics?.keywordSearch;
  const adminChecklist = [
    { label: "Telegram enabled", ok: Boolean(health?.tokens.telegram) },
    { label: "Threads token present", ok: Boolean(health?.tokens.threads) },
    { label: "Last scan success", ok: Boolean(lastScanSuccess) },
    { label: "Dashboard URL set", ok: Boolean(health?.config?.dashboardUrlSet) },
    { label: "Cron enabled", ok: true },
    { label: "Admin token required", ok: Boolean(health?.tokens.admin) }
  ];

  return (
    <section className="content">
      <div className="pageHeader">
        <div>
          <h1>Settings</h1>
          <p>Runtime health, configured tokens, scan limits, and maintenance actions.</p>
        </div>
      </div>
      <Panel title="Runtime Status" icon={<Settings size={19} />}>
        {loading && !health ? (
          <LoadingState text="Loading runtime status" />
        ) : (
          <>
            <div className="statusGrid">
              <Status label="Runtime" value={health?.ok ? "healthy" : "unknown"} ok={Boolean(health?.ok)} />
              <Status label="Mock mode" value={health?.mode === "mock" ? "enabled" : "disabled"} ok={health?.mode === "mock"} />
              <Status label="Workers AI" value={health?.tokens.workersAi ? "bound" : "fallback"} ok={Boolean(health?.tokens.workersAi)} />
              <Status label="Threads token" value={health?.tokens.threads ? "set" : "missing"} ok={Boolean(health?.tokens.threads)} />
              <Status label="Telegram" value={health?.tokens.telegram ? "enabled" : "disabled"} ok={Boolean(health?.tokens.telegram)} />
              <Status label="Admin access" value={health?.tokens.admin ? "required" : "open local"} ok={Boolean(health?.tokens.admin)} />
            </div>
            <div className="metadataGrid settingsMeta">
              <Meta label="Max keywords per scan" value={String(health?.limits?.maxKeywordsPerScan ?? 12)} />
              <Meta label="Max posts per search" value={String(health?.limits?.maxPostsPerSearch ?? 20)} />
              <Meta label="Max AI candidates" value={String(health?.limits?.maxAiCandidates ?? 24)} />
              <Meta label="Alert threshold" value={String(health?.limits?.alertScoreThreshold ?? 8.5)} />
            </div>
            <div className="actions">
              <button className="primary" onClick={onTelegramTest} disabled={actionBusy === "telegram"}>
                <Bell size={17} /> Send Telegram test
              </button>
              {health?.mode === "mock" && (
                <button onClick={onClearDemo} className="secondary" disabled={actionBusy === "clear-demo"}>
                  <Trash2 size={17} /> Clear demo data
                </button>
              )}
            </div>
          </>
        )}
      </Panel>
      <Panel title="Threads API Diagnostics" icon={<Activity size={19} />}>
        <div className="statusGrid">
          <Status label="Mode" value={health?.mode || threadsDiagnostics?.mode || "unknown"} ok={health?.mode === "real"} />
          <Status
            label="Threads token"
            value={health?.tokens.threads || threadsDiagnostics?.tokenPresent ? "present" : "missing"}
            ok={Boolean(health?.tokens.threads || threadsDiagnostics?.tokenPresent)}
          />
          <Status
            label="/me"
            value={threadsDiagnostics?.me.ok ? "ok" : threadsDiagnostics?.me.error ? "failed" : "not tested"}
            ok={Boolean(threadsDiagnostics?.me.ok)}
          />
          <Status
            label="keyword_search"
            value={threadsSearch?.ok ? `${threadsSearch.postsReturned} posts` : threadsSearch?.error ? "failed" : "not tested"}
            ok={Boolean(threadsSearch?.ok)}
          />
        </div>
        <div className="metadataGrid settingsMeta">
          <Meta label="Last real scan" value={lastRealScan ? `${lastRealScan.status || "unknown"} #${lastRealScan.id || ""}` : "none"} />
          <Meta label="Posts found" value={String(lastRealScan?.posts_found ?? 0)} />
          <Meta label="Posts saved" value={String(lastRealScan?.posts_saved ?? 0)} />
          <Meta label="Shortlisted" value={String(lastRealScan?.shortlisted ?? 0)} />
          <Meta label="Analyzed" value={String(lastRealScan?.analyzed ?? 0)} />
          <Meta label="Last Threads API error" value={threadsDiagnostics?.lastThreadsApiError || String(lastRealScan?.error || "none")} />
        </div>
        {(threadsDiagnostics?.hint || postsFound === 0) && (
          <div className="pageNote">
            {threadsDiagnostics?.hint ||
              "If postsFound=0, this may be a Meta App Review limitation for keyword_search or simply no Threads results for the selected keywords."}
          </div>
        )}
        <div className="pageNote">Threads token may expire. Rotate it through Wrangler secret put THREADS_ACCESS_TOKEN.</div>
        <div className="keywordForm">
          <input
            value={threadsKeyword}
            onChange={(event) => setThreadsKeyword(event.target.value)}
            placeholder="Test Threads keyword"
          />
          <button className="primary" onClick={onThreadsTest} disabled={actionBusy === "threads-test"}>
            {actionBusy === "threads-test" ? <Loader2 size={17} className="spin" /> : <Search size={17} />} Test
          </button>
        </div>
        {threadsSearch?.error && <div className="pageError">{threadsSearch.error}</div>}
      </Panel>
      <Panel title="Admin Checklist" icon={<CheckCircle2 size={19} />}>
        <div className="statusGrid">
          {adminChecklist.map((item) => (
            <Status key={item.label} label={item.label} value={item.ok ? "ok" : "needs attention"} ok={item.ok} />
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Status({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="status">
      <span className={ok ? "dot ok" : "dot"} />
      <div>
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}

function StatusActions({
  idea,
  onStatus,
  actionBusy
}: {
  idea: Idea;
  onStatus: (id: number, status: string) => void;
  actionBusy: string;
}) {
  return (
    <div className="actions">
      <button
        className={idea.status === "saved" ? "selectedAction" : ""}
        onClick={() => onStatus(idea.id, "saved")}
        disabled={actionBusy.startsWith(`idea-${idea.id}`)}
      >
        Save
      </button>
      <button
        className={idea.status === "rejected" ? "selectedAction" : ""}
        onClick={() => onStatus(idea.id, "rejected")}
        disabled={actionBusy.startsWith(`idea-${idea.id}`)}
      >
        Reject
      </button>
      <button
        className={idea.status === "build_next" ? "primary" : ""}
        onClick={() => onStatus(idea.id, "build_next")}
        disabled={actionBusy.startsWith(`idea-${idea.id}`)}
      >
        Build Next
      </button>
    </div>
  );
}

function IdeaList({
  ideas,
  loading,
  emptyText,
  onOpen,
  onStatus,
  actionBusy
}: {
  ideas: Idea[];
  loading: boolean;
  emptyText: string;
  onOpen: (idea: Idea) => void;
  onStatus: (id: number, status: string) => void;
  actionBusy: string;
}) {
  if (loading) return <LoadingState text="Loading ideas" />;
  if (!ideas.length) return <EmptyState text={emptyText} />;
  return (
    <div className="ideas">
      {ideas.map((idea) => (
        <article className="ideaCard" key={idea.id} onClick={() => onOpen(idea)} role="button" tabIndex={0}>
          <div className="ideaTop">
            <span className="pill">{idea.category}</span>
            <strong>{idea.final_score.toFixed(1)}</strong>
          </div>
          <h3>{idea.title}</h3>
          <p>{idea.problem}</p>
          <div className="ideaMeta">
            <span>{idea.source_count} sources</span>
            <span>{idea.language?.toUpperCase() || "EN"}</span>
            <span>{labelStatus(idea.status)}</span>
          </div>
          <div className="miniActions" onClick={(event) => event.stopPropagation()}>
            <button disabled={actionBusy.startsWith(`idea-${idea.id}`)} onClick={() => onStatus(idea.id, "saved")}>
              Save
            </button>
            <button disabled={actionBusy.startsWith(`idea-${idea.id}`)} onClick={() => onStatus(idea.id, "rejected")}>
              Reject
            </button>
            <button disabled={actionBusy.startsWith(`idea-${idea.id}`)} onClick={() => onStatus(idea.id, "build_next")}>
              Build Next
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function ScanRuns({ runs }: { runs: ScanRun[] }) {
  if (!runs.length) return <EmptyState text="No scan runs yet." />;
  return (
    <div className="runs">
      {runs.slice(0, 8).map((run) => (
        <div className="runRow" key={run.id}>
          <div>
            <strong>
              #{run.id} {run.status}
            </strong>
            <span>{formatDate(run.started_at)}</span>
          </div>
          <span>
            {run.mode} · {run.keywords_scanned} keywords · {run.posts_saved} saved · {run.shortlisted} shortlisted ·{" "}
            {run.analyzed} analyzed · {run.ideas_created} new · {run.ideas_updated} updated
          </span>
          {run.error && <small>{run.error}</small>}
        </div>
      ))}
    </div>
  );
}

function ScoreItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="scoreItem">
      <span>{label}</span>
      <strong>{Number(value).toFixed(1)}</strong>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="state">
      <Loader2 size={18} className="spin" />
      <span>{text}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="state empty">{text}</div>;
}

function parseRoute(): { view: View; ideaId?: number } {
  const path = window.location.pathname;
  const ideaMatch = path.match(/^\/ideas\/(\d+)/);
  if (ideaMatch) return { view: "idea", ideaId: Number(ideaMatch[1]) };
  if (path.startsWith("/ideas")) return { view: "ideas" };
  if (path.startsWith("/keywords")) return { view: "keywords" };
  if (path.startsWith("/settings")) return { view: "settings" };
  return { view: "home" };
}

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Request failed";
  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    return parsed.error || error.message;
  } catch {
    return error.message;
  }
}

function labelStatus(status: string) {
  return status === "build_next" ? "Build Next" : status.slice(0, 1).toUpperCase() + status.slice(1);
}

function formatDate(value?: string | null) {
  if (!value) return "n/a";
  return value.replace("T", " ").replace(".000Z", "");
}

createRoot(document.getElementById("root") as HTMLElement).render(<App />);
