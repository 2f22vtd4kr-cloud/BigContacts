# Playwright + scrape-API fallback for Apex `toolVisit`

**Status:** design + integration guide (not enabled by default)  
**Why:** plain `fetch` loses on Cloudflare challenge pages (e.g. BBB). Grok-class agents recover related officers from those pages; Apex does not until a browser or anti-bot scrape path exists.

**Fail-closed rule unchanged:** contacts still require `sourceUrls` and visible values. Browser/API only improves *page access*, never invents facts.

---

## 1. Problem

| Layer | Behavior today |
|--------|----------------|
| `toolVisit` in `agentic-web-research.ts` | Node `fetch` + strip style/script + CONTACT FACTS |
| Open company sites (`menschmfg.com`) | Works — email/phone/address recovered |
| Cloudflare “Just a moment…” (BBB, some directories) | Returns challenge HTML → zero PERSON facts |

Vanilla Playwright / `playwright-extra` stealth on datacenter IPs is **mostly dead** against modern Cloudflare (2026 benchmarks). Managed scrape APIs or residential + real fingerprint stacks are the practical path.

---

## 2. Recommended architecture (fallback chain)

```
toolVisit(url)
  ├─ 1. plain fetch (fast path, default)
  │     if body looks like CF challenge OR status 403/503 → escalate
  ├─ 2. scrape API if env key present (Scrapfly / ZenRows / Browserless content)
  │     asp/premium/js_render on
  └─ 3. Playwright (local or Browserless WS) if PLAYWRIGHT_ENABLED=1
        only for high-value related-people URLs (bbb.org, about, team)
```

**Do not** run Playwright on every visit — latency and cost explode. Gate on:

- challenge-page heuristic, **or**
- host allowlist: `bbb.org`, optional other CF hosts, **or**
- explicit `needsBrowser: true` from ranker after related-people hop

---

## 3. Challenge-page heuristic

Treat as blocked when HTML matches any of:

- `<title>Just a moment…`
- `cf-browser-verification` / `cf-challenge` / `Attention Required! | Cloudflare`
- body length &lt; 20k and contains `Enable JavaScript and cookies`
- HTTP 403/503 with Cloudflare server header

On match → escalate; never emit CONTACT FACTS from challenge HTML.

---

## 4. Scrape API services (investigation summary)

Benchmarks vary by month and target set. Treat these as **orientation**, not guarantees.

| Service | Role | CF notes (public benchmarks) | Fit for Apex |
|---------|------|------------------------------|--------------|
| **Scrapfly** | Scrape API + ASP + optional Cloud Browser | Strong CF rates in several 2026 benches | **Best first paid key** for `toolVisit` escalate |
| **Firecrawl** | Agent-oriented scrape | Strong CF in some agent benches | Good if already used for crawl |
| **ZenRows** | Anti-bot “universal” scrape | Mixed CF results across benches | Viable alternative |
| **ScrapingBee** | JS render + proxies | Moderate CF | Simple HTTP integration |
| **ScraperAPI** | Volume-oriented | Moderate | Cost-efficient bulk, not top CF |
| **Browserless** | Hosted Chromium via CDP/WS + REST `/content` | Stealth routes for CF | **Best if you want Playwright API without shipping Chromium** |
| **Bright Data** | Enterprise unlocker / scraping browser | Strong, expensive | Overkill until volume needs it |
| **Self-host FlareSolverr / Byparr** | Open-source CF solvers | Maintenance-heavy; lag CF changes | Optional lab only |

**Apex recommendation (order):**

1. **Scrapfly** (`SCRAPFLY_API_KEY`) or **ZenRows** (`ZENROWS_API_KEY`) — one HTTP call, ASP/js render  
2. **Browserless** (`BROWSERLESS_TOKEN`) — Playwright `connectOverCDP` or REST content  
3. Local **Playwright** only on a stable host with Chromium installed (Replit/ephemeral sandboxes are a poor fit)

Env names (proposed):

```bash
SCRAPFLY_API_KEY=
ZENROWS_API_KEY=
BROWSERLESS_TOKEN=
PLAYWRIGHT_ENABLED=0          # 1 to allow local/remote browser path
PLAYWRIGHT_WS_ENDPOINT=       # optional Browserless or self-hosted WS
BROWSER_FETCH_TIMEOUT_MS=25000
BROWSER_FETCH_MAX_PER_CASE=5  # hard cap per discovery job
```

---

## 5. Playwright integration options

### A. Local Playwright (stable VM / Docker)

```bash
pnpm add playwright
npx playwright install chromium
export PLAYWRIGHT_ENABLED=1
```

- Heavy image; needs `--no-sandbox` in many containers  
- Without residential proxy, CF success stays low  
- Use only as last resort or for non-CF JS-heavy pages

### B. Browserless (Playwright over WebSocket)

```ts
import { chromium } from "playwright";

const browser = await chromium.connectOverCDP(
  `wss://production-sfo.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
);
const page = await browser.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
const html = await page.content();
await browser.close();
```

Keeps Apex code on Playwright API; browsers run remotely.

### C. Scrapfly HTTP (no Playwright process)

```ts
const u = new URL("https://api.scrapfly.io/scrape");
u.searchParams.set("key", process.env.SCRAPFLY_API_KEY!);
u.searchParams.set("url", targetUrl);
u.searchParams.set("asp", "true");
u.searchParams.set("render_js", "true");
u.searchParams.set("country", "us");
const res = await fetch(u);
const data = await res.json();
const html = data?.result?.content ?? "";
```

Simplest escalate path for `toolVisit`.

### D. ZenRows HTTP

```ts
const u = new URL("https://api.zenrows.com/v1/");
u.searchParams.set("apikey", process.env.ZENROWS_API_KEY!);
u.searchParams.set("url", targetUrl);
u.searchParams.set("js_render", "true");
u.searchParams.set("premium_proxy", "true");
const html = await (await fetch(u)).text();
```

---

## 6. Code integration points (Apex)

| File | Change |
|------|--------|
| `artifacts/api-server/src/src/lib/browser-fetch.ts` | **New** — `isChallengeHtml`, `fetchViaScrapfly`, `fetchViaZenRows`, `fetchViaPlaywright`, `browserFetchHtml` |
| `agentic-web-research.ts` → `toolVisit` | Call `browserFetchHtml` when plain fetch is challenge/403 |
| Discovery budget | Count browser escalations; stop after `BROWSER_FETCH_MAX_PER_CASE` |
| Logging | Job log: `browser_fetch host=bbb.org provider=scrapfly ok=1` (no secrets) |

Pseudo-flow for `toolVisit`:

```ts
async function toolVisit(url: string): Promise<string> {
  let html = await plainFetchHtml(url);
  if (isChallengeHtml(html) || html.startsWith("HTTP 403")) {
    html = await browserFetchHtml(url); // uses env keys; may return ""
  }
  if (!html || isChallengeHtml(html)) {
    return `visit blocked (anti-bot): ${url}`;
  }
  // existing strip + CONTACT FACTS + passages
}
```

Wire `browser-fetch.ts` as optional; **zero behavior change** when no keys and `PLAYWRIGHT_ENABLED=0`.

---

## 7. Operational constraints

1. **Legal / ToS** — only public research surfaces; respect robots where required; no credential stuffing.  
2. **Cost** — CF-capable renders cost far more per URL than Serper/fetch; cap per case.  
3. **Latency** — 5–15s typical for ASP render; agentic loop already multi-step; keep max escalations small.  
4. **Sandbox** — ephemeral Replit/sandbox often cannot install Chromium; prefer Scrapfly/Browserless keys.  
5. **Fail-closed** — if all paths fail, return blocked observation; do **not** invent BBB officers.

---

## 8. Implementation checklist

- [ ] Add `browser-fetch.ts` with challenge detect + Scrapfly/ZenRows/Playwright stubs  
- [ ] Hook `toolVisit` escalate path behind env flags  
- [ ] Cap escalations per case + job log lines  
- [ ] Unit test: challenge HTML → escalate; normal HTML → no escalate  
- [ ] Manual: `menschmfg.com` still plain-fetch; `bbb.org` Mensch profile with Scrapfly key  
- [ ] Floors still pass; no new invented contacts  
- [ ] Document keys in handoff / `.env.example` (never commit secrets)

---

## 9. What this does *not* claim

Enabling Playwright or Scrapfly does **not** guarantee “always ≥ Grok Agent.” It closes the **access** gap on CF-walled public pages so related-people extraction can run on the same HTML Grok sees. Ranking, multi-hop, and materialization remain separate.

---

## 10. Minimal next PR

1. Ship `browser-fetch.ts` + `toolVisit` escalate (Scrapfly first if key set).  
2. Set `BROWSER_FETCH_MAX_PER_CASE=5`.  
3. Re-run Donald Mensch / Hastings and confirm BBB or non-CF dealer related names still work without regressions on company domain.
