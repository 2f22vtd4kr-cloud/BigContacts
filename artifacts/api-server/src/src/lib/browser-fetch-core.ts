import { sanitizeUrlForEvidence } from "./url-privacy";
import { safeThrownErrorSummary } from "./provider-error-diagnostics";
/** Optional browser / anti-bot escalation for Investigator page retrieval. */
import { assertSafeOutboundUrl, safeOutboundFetch } from "./ssrf-safe-fetch";
import { getAgenticExecutionScope } from "./agentic-execution-context";
import { logger } from "./logger";
import { runProviderCall } from "./provider-gate";

export type BrowserProvider = "scrapfly" | "zenrows" | "browserless" | "playwright";
export type BrowserFetchOptions = { scope?: string; signal?: AbortSignal; provider: BrowserProvider };
const MAX_BROWSER_RESPONSE_BYTES = 2_000_000;
const MAX_BROWSER_FETCH_SCOPES = 256;
export function isChallengeHtml(html: string): boolean { if (!html || html.length < 40) return false; const head = html.slice(0, 8_000).toLowerCase(); return (/just a moment/.test(head) && /cloudflare/.test(head)) || /cf-browser-verification|cf-challenge|attention required!\s*\|\s*cloudflare/.test(head) || (/enable javascript and cookies to continue/.test(head) && html.length < 30_000) || /^HTTP 403/.test(html) || /^HTTP 503/.test(html); }
function maxBrowserFetches(): number { const n = Number(process.env.BROWSER_FETCH_MAX_PER_CASE ?? "5"); return Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 5; }
function timeoutMs(): number { const n = Number(process.env.BROWSER_FETCH_TIMEOUT_MS ?? "25000"); return Number.isFinite(n) && n >= 5_000 ? Math.min(n, 60_000) : 25_000; }
const browserFetchCounts = new Map<string, number>();
function rememberBrowserFetchScope(scope: string, count: number): void { if (!browserFetchCounts.has(scope) && browserFetchCounts.size >= MAX_BROWSER_FETCH_SCOPES) { const oldest = browserFetchCounts.keys().next().value as string | undefined; if (oldest) browserFetchCounts.delete(oldest); } browserFetchCounts.set(scope, count); }
export function resetBrowserFetchCount(scope?: string): void { if (scope) browserFetchCounts.delete(scope); else browserFetchCounts.clear(); }
export function getBrowserFetchCount(scope = "process"): number { return browserFetchCounts.get(scope) ?? 0; }
async function providerFetch(provider: "scrapfly" | "zenrows" | "browserless", url: string, init: RequestInit, signal?: AbortSignal): Promise<Response> { return runProviderCall({ provider, account: new URL(url).hostname, signal }, () => safeOutboundFetch(url, init)); }
function throwIfAborted(signal?: AbortSignal): void { if (signal?.aborted) throw new Error("browser fetch cancelled"); }
function raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> { if (!signal) return promise; return new Promise<T>((resolve, reject) => { const abort = () => reject(new Error("browser fetch cancelled")); if (signal.aborted) return abort(); signal.addEventListener("abort", abort, { once: true }); void promise.then((v) => { signal.removeEventListener("abort", abort); resolve(v); }, (e) => { signal.removeEventListener("abort", abort); reject(e); }); }); }
async function readResponseTextCapped(response: Response, signal?: AbortSignal): Promise<string> { throwIfAborted(signal); const declared = Number(response.headers.get("content-length") ?? NaN); if (Number.isFinite(declared) && declared > MAX_BROWSER_RESPONSE_BYTES) throw new Error(`browser response exceeds ${MAX_BROWSER_RESPONSE_BYTES} byte limit`); const reader = response.body?.getReader(); if (!reader) return (await response.text()).slice(0, MAX_BROWSER_RESPONSE_BYTES); const chunks: Uint8Array[] = []; let bytes = 0; try { for (;;) { throwIfAborted(signal); const part = await reader.read(); if (part.done) break; bytes += part.value.byteLength; if (bytes > MAX_BROWSER_RESPONSE_BYTES) { await reader.cancel().catch(() => undefined); throw new Error(`browser response exceeds ${MAX_BROWSER_RESPONSE_BYTES} byte limit`); } chunks.push(part.value); } } finally { reader.releaseLock(); } return new TextDecoder().decode(Buffer.concat(chunks.map((x) => Buffer.from(x)))); }
async function readJsonCapped<T>(response: Response, signal?: AbortSignal): Promise<T> { return JSON.parse(await readResponseTextCapped(response, signal)) as T; }
async function verifiedProviderFinalUrl(rawUrl: unknown): Promise<string | null> {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    await assertSafeOutboundUrl(parsed.href);
    return sanitizeUrlForEvidence(parsed.href);
  } catch {
    return null;
  }
}
async function fetchViaScrapfly(url: string, signal?: AbortSignal): Promise<BrowserFetchAttempt> {
  const key = process.env.SCRAPFLY_API_KEY ?? "";
  if (!key) return { html: null, observedUrl: null };
  throwIfAborted(signal);
  try {
    const u = new URL("https://api.scrapfly.io/scrape");
    u.searchParams.set("key", key);
    u.searchParams.set("url", url);
    u.searchParams.set("asp", "true");
    u.searchParams.set("render_js", "true");
    const resp = await providerFetch("scrapfly", u.toString(), { signal: signal ?? AbortSignal.timeout(timeoutMs()) }, signal);
    if (!resp.ok) return { html: null, observedUrl: null };
    const data = await readJsonCapped<{ result?: { content?: string; url?: string } }>(resp, signal);
    const html = data?.result?.content ?? "";
    const usable = html.length > 100 && html.length <= MAX_BROWSER_RESPONSE_BYTES;
    const reportedUrl = data?.result?.url;
    const observedUrl = usable ? await verifiedProviderFinalUrl(reportedUrl) : null;
    // If the provider reports a destination, failure to validate that destination
    // means the returned document must not be exposed to the model at all. Missing
    // navigation metadata remains lead-only, but a known unsafe redirect fails closed.
    if (usable && typeof reportedUrl === "string" && reportedUrl.trim() && !observedUrl) {
      return { html: null, observedUrl: null };
    }
    return { html: usable ? html : null, observedUrl };
  } catch (err: any) {
    if (signal?.aborted) throw new Error("browser fetch cancelled");
    logger.debug({ error: safeThrownErrorSummary("Browser provider request failed", err), url: sanitizeUrlForEvidence(url) }, "scrapfly fetch failed");
    return { html: null, observedUrl: null };
  }
}
async function fetchViaZenRows(url: string, signal?: AbortSignal): Promise<BrowserFetchAttempt> {
  const key = process.env.ZENROWS_API_KEY ?? "";
  if (!key) return { html: null, observedUrl: null };
  throwIfAborted(signal);
  try {
    const u = new URL("https://api.zenrows.com/v1/");
    u.searchParams.set("apikey", key);
    u.searchParams.set("url", url);
    u.searchParams.set("js_render", "true");
    u.searchParams.set("premium_proxy", "true");
    const resp = await providerFetch("zenrows", u.toString(), { signal: signal ?? AbortSignal.timeout(timeoutMs()) }, signal);
    if (!resp.ok) return { html: null, observedUrl: null };
    const html = await readResponseTextCapped(resp, signal);
    const usable = html.length > 100 && html.length <= MAX_BROWSER_RESPONSE_BYTES;
    const reportedUrl = resp.headers.get("Zr-Final-Url");
    const observedUrl = usable ? await verifiedProviderFinalUrl(reportedUrl) : null;
    // A known but unsafe redirect invalidates the document itself, not just its
    // provenance label. Missing final-URL metadata remains lead-only.
    if (usable && reportedUrl?.trim() && !observedUrl) {
      return { html: null, observedUrl: null };
    }
    return { html: usable ? html : null, observedUrl };
  } catch (err: any) {
    if (signal?.aborted) throw new Error("browser fetch cancelled");
    logger.debug({ error: safeThrownErrorSummary("Browser provider request failed", err), url: sanitizeUrlForEvidence(url) }, "zenrows fetch failed");
    return { html: null, observedUrl: null };
  }
}
async function fetchViaBrowserlessContent(url: string, signal?: AbortSignal): Promise<string | null> { const token = process.env.BROWSERLESS_TOKEN ?? ""; if (!token) return null; throwIfAborted(signal); try { const endpoint = process.env.BROWSERLESS_CONTENT_URL ?? `https://production-sfo.browserless.io/content?token=${encodeURIComponent(token)}`; const resp = await providerFetch("browserless", endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, gotoOptions: { waitUntil: "domcontentloaded", timeout: timeoutMs() } }), signal: signal ?? AbortSignal.timeout(timeoutMs() + 5_000) }, signal); if (!resp.ok) return null; const html = await readResponseTextCapped(resp, signal); return html.length > 100 ? html : null; } catch (err: any) { if (signal?.aborted) throw new Error("browser fetch cancelled"); logger.debug({ error: safeThrownErrorSummary("Browser provider request failed", err), url: sanitizeUrlForEvidence(url) }, "browserless content fetch failed"); return null; } }
type BrowserFetchAttempt = { html: string | null; observedUrl: string | null };

async function fulfillPlaywrightRequestThroughPinnedTransport(route: any, signal?: AbortSignal): Promise<void> {
  const request = route.request();
  const rawUrl = request.url();
  let protocol = "";
  try { protocol = new URL(rawUrl).protocol; } catch { await route.abort("blockedbyclient"); return; }

  // These schemes are browser-local and do not open a network connection.
  if (protocol === "data:" || protocol === "blob:" || protocol === "about:") {
    await route.continue();
    return;
  }
  if ((protocol !== "http:" && protocol !== "https:") || signal?.aborted) {
    await route.abort("blockedbyclient");
    return;
  }

  try {
    const headers: Record<string, string> = { ...request.headers() };
    // Let the pinned transport generate connection-specific headers for the
    // exact validated destination. Keep ordinary origin/cookie/content headers.
    for (const key of Object.keys(headers)) {
      if (["host", "content-length", "transfer-encoding", "connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "upgrade"].includes(key.toLowerCase())) {
        delete headers[key];
      }
    }
    const rawBody = request.postDataBuffer();
    const response = await safeOutboundFetch(rawUrl, {
      method: request.method(),
      headers,
      body: rawBody ? new Uint8Array(rawBody) : undefined,
      signal,
    });
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (!["connection", "content-length", "transfer-encoding", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "upgrade"].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });
    const body = Buffer.from(await response.arrayBuffer());
    await route.fulfill({
      status: response.status,
      headers: responseHeaders,
      ...(response.status === 204 || response.status === 205 || response.status === 304 ? {} : { body }),
    });
  } catch {
    await route.abort("blockedbyclient");
  }
}

async function fetchViaPlaywright(url: string, signal?: AbortSignal): Promise<BrowserFetchAttempt> {
  if (process.env.PLAYWRIGHT_ENABLED !== "1" && process.env.PLAYWRIGHT_ENABLED !== "true") return { html: null, observedUrl: null };
  throwIfAborted(signal);
  try {
    const pw = await import("playwright").catch(() => null);
    if (!pw?.chromium) return { html: null, observedUrl: null };
    const ws = process.env.PLAYWRIGHT_WS_ENDPOINT ?? "";
    const browser: any = ws ? await pw.chromium.connectOverCDP(ws) : await pw.chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      // Block service-worker traffic: Playwright's page routing is not an egress
      // boundary for requests issued by an uncontrolled service worker.
      const context = await browser.newContext({ serviceWorkers: "block" });
      try {
        const page = await context.newPage();
        await page.route("**/*", async (route: any) => {
          await fulfillPlaywrightRequestThroughPinnedTransport(route, signal);
        });
        // WebSockets are not covered by page.route("**/*"). Fail closed if this
        // Playwright build cannot intercept them, otherwise a visited page could
        // reach internal services without passing through DNS pinning.
        const routeWebSocket = (page as any).routeWebSocket;
        if (typeof routeWebSocket !== "function") {
          throw new Error("Playwright WebSocket interception is required for safe browser fetch.");
        }
        await routeWebSocket.call(page, "**/*", (socket: any) => {
          socket.close({ code: 1008, reason: "WebSocket egress is disabled for research fetches." });
        });
        await page.addInitScript(() => {
          const disabledTransport = class {
            constructor() { throw new Error("Peer-to-peer transports are disabled for research fetches."); }
          };
          for (const name of ["RTCPeerConnection", "webkitRTCPeerConnection", "WebTransport"]) {
            try {
              Object.defineProperty(window, name, { value: disabledTransport, configurable: false, writable: false });
            } catch { /* Unsupported browser API; network requests remain routed and pinned. */ }
          }
        });
        await raceAbort(page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs() }), signal);
        throwIfAborted(signal);
        await raceAbort(page.waitForTimeout(2_500), signal).catch(() => undefined);
        throwIfAborted(signal);
        const finalUrl = page.url();
        // Attribute source material to the effective document URL, never blindly
        // to a pre-redirect request URL.
        await assertSafeOutboundUrl(finalUrl);
        const html = await page.content();
        const usable = html.length > 100 && html.length <= MAX_BROWSER_RESPONSE_BYTES;
        return { html: usable ? html : null, observedUrl: usable ? sanitizeUrlForEvidence(finalUrl) : null };
      } finally {
        await context.close().catch(() => undefined);
      }
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch (err: any) {
    if (signal?.aborted) throw new Error("browser fetch cancelled");
    logger.debug({ error: safeThrownErrorSummary("Browser provider request failed", err), url: sanitizeUrlForEvidence(url) }, "playwright fetch failed");
    return { html: null, observedUrl: null };
  }
}
export async function browserFetchHtml(url: string, options: BrowserFetchOptions): Promise<{ html: string; provider: string; observedUrl: string | null }> {
  throwIfAborted(options.signal);
  await assertSafeOutboundUrl(url);
  const scope = options.scope?.trim() || getAgenticExecutionScope();
  const count = getBrowserFetchCount(scope);
  if (count >= maxBrowserFetches()) {
    logger.info({ url: sanitizeUrlForEvidence(url), scope, count }, "browser_fetch budget exhausted");
    return { html: "", provider: "budget_exhausted", observedUrl: null };
  }
  rememberBrowserFetchScope(scope, count + 1);
  // Scrapfly result.url and ZenRows' Zr-Final-Url report the effective URL after
  // redirects. Validate that reported destination before exposing it as an observed
  // source. Browserless /content has no equivalent in this adapter and remains
  // lead-only; Playwright attests the effective URL through the pinned transport.
  const attempts: Array<[BrowserProvider, () => Promise<BrowserFetchAttempt>]> = [
    ["scrapfly", () => fetchViaScrapfly(url, options.signal)],
    ["zenrows", () => fetchViaZenRows(url, options.signal)],
    ["browserless", async () => ({ html: await fetchViaBrowserlessContent(url, options.signal), observedUrl: null })],
    ["playwright", () => fetchViaPlaywright(url, options.signal)],
  ];
  const selected = options.provider ? attempts.filter(([provider]) => provider === options.provider) : [];
  if (!selected.length) return { html: "", provider: "provider_required", observedUrl: null };
  for (const [provider, fn] of selected) {
    throwIfAborted(options.signal);
    const result = await fn();
    if (result.html && !isChallengeHtml(result.html)) {
      logger.info({ url: sanitizeUrlForEvidence(url), provider, bytes: result.html.length, scope, sourceUrlVerified: Boolean(result.observedUrl) }, "browser_fetch ok");
      return { html: result.html, provider, observedUrl: result.observedUrl };
    }
    if (result.html && isChallengeHtml(result.html)) logger.debug({ url: sanitizeUrlForEvidence(url), provider }, "browser_fetch challenge for model-selected provider");
  }
  logger.info({ url: sanitizeUrlForEvidence(url), provider: options.provider, scope }, "browser_fetch selected provider failed or unconfigured");
  return { html: "", provider: options.provider, observedUrl: null };
}

export function browserFetchConfigured(): boolean { return Boolean(process.env.SCRAPFLY_API_KEY || process.env.ZENROWS_API_KEY || process.env.BROWSERLESS_TOKEN || process.env.PLAYWRIGHT_ENABLED === "1" || process.env.PLAYWRIGHT_ENABLED === "true"); }
