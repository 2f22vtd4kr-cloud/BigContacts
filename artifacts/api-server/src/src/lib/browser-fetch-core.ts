/** toolVisit chain: plain fetch → Scrapfly → ZenRows → Browserless → Playwright (firecrawl/MCP-class primary-source fetch).
 * Fail-closed HTML only; never invent contacts from challenge pages.
 */
/**
 * Optional browser / anti-bot scrape fallback for toolVisit.
 *
 * Default path remains plain fetch. Escalate only when:
 *   - HTML looks like a Cloudflare (or similar) challenge, or
 *   - HTTP layer reported 403/503
 * and a provider key or PLAYWRIGHT_ENABLED is configured.
 *
 * See docs/PLAYWRIGHT_FALLBACK.md for service comparison and ops limits.
 * Fail-closed: empty string means "could not obtain page" — never invent content.
 */

import { logger } from "./logger";

export function isChallengeHtml(html: string): boolean {
  if (!html || html.length < 40) return false;
  const head = html.slice(0, 8_000).toLowerCase();
  if (/just a moment/.test(head) && /cloudflare/.test(head)) return true;
  if (/cf-browser-verification|cf-challenge|attention required!\s*\|\s*cloudflare/.test(head)) return true;
  if (/enable javascript and cookies to continue/.test(head) && html.length < 30_000) return true;
  if (/^HTTP 403/.test(html) || /^HTTP 503/.test(html)) return true;
  return false;
}

function maxBrowserFetches(): number {
  const n = Number(process.env.BROWSER_FETCH_MAX_PER_CASE ?? "5");
  return Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 5;
}

function timeoutMs(): number {
  const n = Number(process.env.BROWSER_FETCH_TIMEOUT_MS ?? "25000");
  return Number.isFinite(n) && n >= 5_000 ? Math.min(n, 60_000) : 25_000;
}

/** Per-process counter — reset by process restart; good enough for case-local caps. */
let browserFetchCount = 0;

export function resetBrowserFetchCount(): void {
  browserFetchCount = 0;
}

export function getBrowserFetchCount(): number {
  return browserFetchCount;
}

async function fetchViaScrapfly(url: string): Promise<string | null> {
  const key = process.env.SCRAPFLY_API_KEY ?? "";
  if (!key) return null;
  try {
    const u = new URL("https://api.scrapfly.io/scrape");
    u.searchParams.set("key", key);
    u.searchParams.set("url", url);
    u.searchParams.set("asp", "true");
    u.searchParams.set("render_js", "true");
    u.searchParams.set("country", "us");
    const resp = await fetch(u.toString(), { signal: AbortSignal.timeout(timeoutMs()) });
    if (!resp.ok) {
      logger.debug({ status: resp.status, url }, "scrapfly fetch non-OK");
      return null;
    }
    const data = (await resp.json()) as { result?: { content?: string } };
    const html = data?.result?.content ?? "";
    return html.length > 100 ? html : null;
  } catch (err: any) {
    logger.debug({ err: err?.message, url }, "scrapfly fetch failed");
    return null;
  }
}

async function fetchViaZenRows(url: string): Promise<string | null> {
  const key = process.env.ZENROWS_API_KEY ?? "";
  if (!key) return null;
  try {
    const u = new URL("https://api.zenrows.com/v1/");
    u.searchParams.set("apikey", key);
    u.searchParams.set("url", url);
    u.searchParams.set("js_render", "true");
    u.searchParams.set("premium_proxy", "true");
    const resp = await fetch(u.toString(), { signal: AbortSignal.timeout(timeoutMs()) });
    if (!resp.ok) return null;
    const html = await resp.text();
    return html.length > 100 ? html : null;
  } catch (err: any) {
    logger.debug({ err: err?.message, url }, "zenrows fetch failed");
    return null;
  }
}

async function fetchViaBrowserlessContent(url: string): Promise<string | null> {
  const token = process.env.BROWSERLESS_TOKEN ?? "";
  if (!token) return null;
  try {
    const endpoint =
      process.env.BROWSERLESS_CONTENT_URL
      ?? `https://production-sfo.browserless.io/content?token=${encodeURIComponent(token)}`;
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, gotoOptions: { waitUntil: "domcontentloaded", timeout: timeoutMs() } }),
      signal: AbortSignal.timeout(timeoutMs() + 5_000),
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    return html.length > 100 ? html : null;
  } catch (err: any) {
    logger.debug({ err: err?.message, url }, "browserless content fetch failed");
    return null;
  }
}

/**
 * Optional Playwright path — dynamic import so default deploys need no playwright package.
 * Requires PLAYWRIGHT_ENABLED=1 and either local chromium or PLAYWRIGHT_WS_ENDPOINT.
 */
async function fetchViaPlaywright(url: string): Promise<string | null> {
  if (process.env.PLAYWRIGHT_ENABLED !== "1" && process.env.PLAYWRIGHT_ENABLED !== "true") {
    return null;
  }
  try {
    // Dynamic import: package may be absent in default install
    const pw = await import("playwright").catch(() => null);
    if (!pw?.chromium) {
      logger.debug("playwright package not installed; skip browser path");
      return null;
    }
    const ws = process.env.PLAYWRIGHT_WS_ENDPOINT ?? "";
    const browser = ws
      ? await pw.chromium.connectOverCDP(ws)
      : await pw.chromium.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-dev-shm-usage"],
        });
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs() });
      // Brief wait for CF JS challenge on some hosts
      await page.waitForTimeout(2_500).catch(() => undefined);
      const html = await page.content();
      return html.length > 100 ? html : null;
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch (err: any) {
    logger.debug({ err: err?.message, url }, "playwright fetch failed");
    return null;
  }
}

/**
 * Escalate after plain fetch fails anti-bot. Tries providers in order; returns "" if none work.
 */
export async function browserFetchHtml(url: string): Promise<{ html: string; provider: string }> {
  if (browserFetchCount >= maxBrowserFetches()) {
    logger.info({ url, count: browserFetchCount }, "browser_fetch budget exhausted for process");
    return { html: "", provider: "budget_exhausted" };
  }
  browserFetchCount++;

  const attempts: Array<[string, () => Promise<string | null>]> = [
    ["scrapfly", () => fetchViaScrapfly(url)],
    ["zenrows", () => fetchViaZenRows(url)],
    ["browserless", () => fetchViaBrowserlessContent(url)],
    ["playwright", () => fetchViaPlaywright(url)],
  ];

  for (const [provider, fn] of attempts) {
    const html = await fn();
    if (html && !isChallengeHtml(html)) {
      logger.info({ url, provider, bytes: html.length }, "browser_fetch ok");
      return { html, provider };
    }
    if (html && isChallengeHtml(html)) {
      logger.debug({ url, provider }, "browser_fetch still challenge HTML");
    }
  }
  logger.info({ url }, "browser_fetch all providers failed or unconfigured");
  return { html: "", provider: "none" };
}

/** True if any escalate path is configured. */
export function browserFetchConfigured(): boolean {
  return Boolean(
    process.env.SCRAPFLY_API_KEY
    || process.env.ZENROWS_API_KEY
    || process.env.BROWSERLESS_TOKEN
    || process.env.PLAYWRIGHT_ENABLED === "1"
    || process.env.PLAYWRIGHT_ENABLED === "true",
  );
}
