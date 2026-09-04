import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { logger } from "./logger";

/**
 * One outbound-control boundary for all external Apex providers.
 *
 * This module controls network execution only. It does not select research
 * actions, change provider roles, or retry a failed provider. A quota error is
 * deliberately explicit so callers can preserve the provider gap and let the
 * investigator choose another action.
 */
export type ExternalProvider =
  | "serper"
  | "tavily"
  | "exa"
  | "groq"
  | "mistral"
  | "gemini"
  | "nvidia-nim"
  | "scrapfly"
  | "zenrows"
  | "browserless"
  | "companies-house"
  | "whoisjson"
  | "whoxy"
  | "registry"
  | "search"
  | "osint"
  | "generic";

type BudgetClass = "llm" | "search" | "scrape" | "registry" | "osint" | "generic";

type ProviderConfig = {
  budgetClass: BudgetClass;
  maxRequests: number;
  minIntervalMs: number;
  cacheTtlMs: number;
};

type ProviderState = {
  active: number;
  lastStartedAt: number;
  windowStartedAt: number;
  windowAttempts: number;
  cooldownUntil: number;
};

type CacheEntry = {
  expiresAt: number;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: Uint8Array;
};

type Waiter = {
  provider: ExternalProvider;
  resolve: () => void;
};

export class ProviderQuotaError extends Error {
  readonly code: "budget_exhausted" | "cooldown";
  readonly provider: ExternalProvider;
  readonly retryAfterMs: number;

  constructor(
    code: "budget_exhausted" | "cooldown",
    provider: ExternalProvider,
    retryAfterMs: number,
  ) {
    super(`${provider} ${code.replace("_", " ")}`);
    this.name = "ProviderQuotaError";
    this.code = code;
    this.provider = provider;
    this.retryAfterMs = retryAfterMs;
  }
}

const scopeStorage = new AsyncLocalStorage<string>();
const providerStates = new Map<string, ProviderState>();
const waiters: Waiter[] = [];
const responseCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<Response>>();

const globalConcurrency = () => boundedEnv("APEX_EXTERNAL_GLOBAL_CONCURRENCY", 4, 1, 32);
const perProviderConcurrency = () => boundedEnv("APEX_EXTERNAL_PROVIDER_CONCURRENCY", 1, 1, 8);
const windowMs = () => boundedEnv("APEX_EXTERNAL_WINDOW_MS", 10 * 60_000, 10_000, 24 * 60 * 60_000);
const perScopeMaxRequests = () =>
  boundedEnv("APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE", 40, 1, 10_000);

let activeGlobal = 0;

const DEFAULTS: Record<BudgetClass, Omit<ProviderConfig, "budgetClass">> = {
  llm: { maxRequests: 90, minIntervalMs: 250, cacheTtlMs: 0 },
  search: { maxRequests: 120, minIntervalMs: 125, cacheTtlMs: 60_000 },
  scrape: { maxRequests: 30, minIntervalMs: 250, cacheTtlMs: 5 * 60_000 },
  registry: { maxRequests: 150, minIntervalMs: 125, cacheTtlMs: 2 * 60_000 },
  osint: { maxRequests: 90, minIntervalMs: 150, cacheTtlMs: 60_000 },
  generic: { maxRequests: 300, minIntervalMs: 75, cacheTtlMs: 30_000 },
};

const PROVIDER_CLASSES: Record<ExternalProvider, BudgetClass> = {
  serper: "search",
  tavily: "search",
  exa: "search",
  groq: "llm",
  mistral: "llm",
  gemini: "llm",
  "nvidia-nim": "llm",
  scrapfly: "scrape",
  zenrows: "scrape",
  browserless: "scrape",
  "companies-house": "registry",
  whoisjson: "registry",
  whoxy: "registry",
  registry: "registry",
  search: "search",
  osint: "osint",
  generic: "generic",
};

function boundedEnv(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function providerConfig(provider: ExternalProvider): ProviderConfig {
  const budgetClass = PROVIDER_CLASSES[provider];
  const defaults = DEFAULTS[budgetClass];
  const suffix = provider.replace(/[^a-z0-9]/gi, "_").toUpperCase();
  return {
    budgetClass,
    maxRequests: boundedEnv(
      `APEX_PROVIDER_MAX_REQUESTS_${suffix}`,
      defaults.maxRequests,
      1,
      100_000,
    ),
    minIntervalMs: boundedEnv(
      `APEX_PROVIDER_MIN_INTERVAL_MS_${suffix}`,
      defaults.minIntervalMs,
      0,
      60_000,
    ),
    cacheTtlMs: defaults.cacheTtlMs,
  };
}

function getState(key: string): ProviderState {
  const existing = providerStates.get(key);
  if (existing) return existing;
  const created: ProviderState = {
    active: 0,
    lastStartedAt: 0,
    windowStartedAt: Date.now(),
    windowAttempts: 0,
    cooldownUntil: 0,
  };
  providerStates.set(key, created);
  return created;
}

function notifyWaiters(): void {
  for (let i = 0; i < waiters.length; i += 1) {
    const waiter = waiters[i]!;
    const state = getState(waiter.provider);
    if (activeGlobal >= globalConcurrency() || state.active >= perProviderConcurrency()) continue;
    waiters.splice(i, 1);
    waiter.resolve();
    return;
  }
}

async function acquireConcurrency(provider: ExternalProvider): Promise<void> {
  const state = getState(provider);
  if (activeGlobal < globalConcurrency() && state.active < perProviderConcurrency()) {
    activeGlobal += 1;
    state.active += 1;
    return;
  }
  await new Promise<void>((resolve) => waiters.push({ provider, resolve }));
  activeGlobal += 1;
  state.active += 1;
}

function releaseConcurrency(provider: ExternalProvider): void {
  activeGlobal = Math.max(0, activeGlobal - 1);
  const state = getState(provider);
  state.active = Math.max(0, state.active - 1);
  notifyWaiters();
}

function getScope(): string {
  return scopeStorage.getStore() ?? "process";
}

function scopeKey(provider: ExternalProvider): string {
  return `${getScope()}|${provider}`;
}

function accountFingerprint(input: string | URL | Request, init?: RequestInit): string {
  const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
  const auth = headers.get("authorization") ?? "";
  const apiKey = headers.get("x-api-key") ?? "";
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const queryCredential = (() => {
    try {
      const parsed = new URL(url);
      for (const key of ["key", "apikey", "api_key", "token"]) {
        const value = parsed.searchParams.get(key);
        if (value) return value;
      }
    } catch {
      // The original fetch will report malformed URLs.
    }
    return "";
  })();
  const material = auth || apiKey || queryCredential;
  if (!material) {
    try {
      return new URL(url).host;
    } catch {
      return "unknown";
    }
  }
  return createHash("sha256").update(material).digest("hex").slice(0, 16);
}

function providerStateKey(provider: ExternalProvider, account: string): string {
  return `${provider}|${account}`;
}

function parseRetryAfter(response: Response): number {
  const value = response.headers.get("retry-after");
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(5 * 60_000, Math.max(0, seconds * 1000));
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? Math.min(5 * 60_000, Math.max(0, timestamp - Date.now()))
    : 0;
}

function isQuotaResponse(provider: ExternalProvider, response: Response): boolean {
  if (response.status === 429 || response.status === 402) return true;
  if (response.status !== 403) return false;
  return provider !== "generic" && provider !== "search" && provider !== "osint";
}

function requestMethod(input: string | URL | Request, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  return input instanceof Request ? input.method.toUpperCase() : "GET";
}

function requestUrl(input: string | URL | Request): string {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return false;
  }
}

export function classifyExternalProvider(url: string): ExternalProvider {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "generic";
  }
  if (host.includes("serper.dev")) return "serper";
  if (host.includes("tavily.com")) return "tavily";
  if (host.includes("exa.ai")) return "exa";
  if (host.includes("groq.com")) return "groq";
  if (host.includes("mistral.ai")) return "mistral";
  if (host.includes("generativelanguage.googleapis.com") || host.includes("googleapis.com")) return "gemini";
  if (host.includes("nvidia.com")) return "nvidia-nim";
  if (host.includes("scrapfly.io")) return "scrapfly";
  if (host.includes("zenrows.com")) return "zenrows";
  if (host.includes("browserless.io")) return "browserless";
  if (host.includes("companieshouse.gov.uk") || host.includes("api.company-information.service.gov.uk")) {
    return "companies-house";
  }
  if (host.includes("whoisjson.com")) return "whoisjson";
  if (host.includes("whoxy.com")) return "whoxy";
  if (host.includes("duckduckgo.com") || host.includes("google.com") || host.includes("bing.com")) return "search";
  if (/registry|opencorporates|gleif|sec\.gov|brreg|icij|occrp/i.test(host)) return "registry";
  if (/holehe|maigret|sherlock|hunter|theharvester|gliner/i.test(host)) return "osint";
  return "generic";
}

function cacheKey(provider: ExternalProvider, input: string | URL | Request, init?: RequestInit): string | null {
  if (requestMethod(input, init) !== "GET") return null;
  const url = requestUrl(input);
  if (isLocalUrl(url)) return null;
  return `${provider}|${url}`;
}

function responseFromCache(entry: CacheEntry): Response {
  return new Response(entry.body.slice(), {
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
  });
}

async function runProviderFetch(
  provider: ExternalProvider,
  input: string | URL | Request,
  init: RequestInit | undefined,
  fetcher: () => Promise<Response>,
): Promise<Response> {
  const config = providerConfig(provider);
  const account = accountFingerprint(input, init);
  const state = getState(providerStateKey(provider, account));
  const now = Date.now();

  if (state.cooldownUntil > now) {
    throw new ProviderQuotaError("cooldown", provider, state.cooldownUntil - now);
  }

  if (now - state.windowStartedAt >= windowMs()) {
    state.windowStartedAt = now;
    state.windowAttempts = 0;
  }

  const scopeState = getState(scopeKey(provider));
  if (now - scopeState.windowStartedAt >= windowMs()) {
    scopeState.windowStartedAt = now;
    scopeState.windowAttempts = 0;
  }
  if (state.windowAttempts >= config.maxRequests || scopeState.windowAttempts >= perScopeMaxRequests()) {
    const retryAfterMs = Math.max(
      1_000,
      Math.min(windowMs(), state.windowStartedAt + windowMs() - now),
    );
    throw new ProviderQuotaError("budget_exhausted", provider, retryAfterMs);
  }

  const key = cacheKey(provider, input, init);
  const cached = key ? responseCache.get(key) : undefined;
  if (cached && cached.expiresAt > now) return responseFromCache(cached);
  if (cached) responseCache.delete(key!);

  const existing = key ? inFlight.get(key) : undefined;
  if (existing) return (await existing).clone();

  const task = (async () => {
    await acquireConcurrency(provider);
    try {
      const current = Date.now();
      const waitMs = Math.max(0, config.minIntervalMs - (current - state.lastStartedAt));
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      state.lastStartedAt = Date.now();
      state.windowAttempts += 1;
      scopeState.windowAttempts += 1;
      const response = await fetcher();
      if (isQuotaResponse(provider, response)) {
        const retryMs = parseRetryAfter(response);
        state.cooldownUntil = Date.now() + Math.max(retryMs, response.status === 429 ? 5_000 : 60_000);
      }
      if (key && response.ok && config.cacheTtlMs > 0) {
        const body = new Uint8Array(await response.clone().arrayBuffer());
        if (body.byteLength <= 1_500_000) {
          responseCache.set(key, {
            expiresAt: Date.now() + config.cacheTtlMs,
            status: response.status,
            statusText: response.statusText,
            headers: [...response.headers.entries()],
            body,
          });
        }
      }
      return response;
    } finally {
      releaseConcurrency(provider);
    }
  })();
  if (key) inFlight.set(key, task);
  try {
    return await task;
  } finally {
    if (key && inFlight.get(key) === task) inFlight.delete(key);
  }
}

export async function runProviderCall<T>(
  options: {
    provider: ExternalProvider;
    account?: string;
    scope?: string;
  },
  fn: () => Promise<T>,
): Promise<T> {
  const provider = options.provider;
  const account = options.account ?? "operation";
  const scope = options.scope ?? getScope();
  return scopeStorage.run(scope, async () => {
    const config = providerConfig(provider);
    const state = getState(providerStateKey(provider, account));
    const scopeState = getState(scopeKey(provider));
    const now = Date.now();
    if (state.cooldownUntil > now) {
      throw new ProviderQuotaError("cooldown", provider, state.cooldownUntil - now);
    }
    if (now - state.windowStartedAt >= windowMs()) {
      state.windowStartedAt = now;
      state.windowAttempts = 0;
    }
    if (now - scopeState.windowStartedAt >= windowMs()) {
      scopeState.windowStartedAt = now;
      scopeState.windowAttempts = 0;
    }
    if (
      state.windowAttempts >= config.maxRequests
      || scopeState.windowAttempts >= perScopeMaxRequests()
    ) {
      throw new ProviderQuotaError("budget_exhausted", provider, state.windowStartedAt + windowMs() - now);
    }
    await acquireConcurrency(provider);
    try {
      const waitMs = Math.max(0, config.minIntervalMs - (Date.now() - state.lastStartedAt));
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      state.lastStartedAt = Date.now();
      state.windowAttempts += 1;
      scopeState.windowAttempts += 1;
      try {
        return await fn();
      } catch (error) {
        if (error instanceof ProviderQuotaError && error.code === "cooldown") {
          state.cooldownUntil = Date.now() + error.retryAfterMs;
        }
        throw error;
      }
    } finally {
      releaseConcurrency(provider);
    }
  });
}

export function withProviderScope<T>(scope: string, fn: () => Promise<T>): Promise<T> {
  return scopeStorage.run(scope, fn);
}

export function installExternalQuotaGuard(): void {
  const current = globalThis.fetch;
  if (current && (current as typeof fetch & { __apexQuotaGuard?: boolean }).__apexQuotaGuard) return;
  const original = current.bind(globalThis);
  const guarded = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = requestUrl(input);
    if (isLocalUrl(url)) return original(input, init);
    const provider = classifyExternalProvider(url);
    return runProviderFetch(provider, input, init, () => original(input, init));
  }) as typeof fetch & { __apexQuotaGuard?: boolean };
  guarded.__apexQuotaGuard = true;
  globalThis.fetch = guarded;
  logger.info(
    {
      globalConcurrency: globalConcurrency(),
      providerConcurrency: perProviderConcurrency(),
      windowMs: windowMs(),
      perScopeMaxRequests: perScopeMaxRequests(),
    },
    "External provider quota gate installed",
  );
}

export function getProviderGateSnapshot(): {
  activeGlobal: number;
  providers: Array<{
    provider: ExternalProvider;
    active: number;
    windowAttempts: number;
    cooldownMs: number;
  }>;
} {
  const now = Date.now();
  return {
    activeGlobal,
    providers: [...providerStates.entries()]
      .filter(([key]) => !key.includes("|"))
      .map(([provider, state]) => ({
        provider: provider as ExternalProvider,
        active: state.active,
        windowAttempts: state.windowAttempts,
        cooldownMs: Math.max(0, state.cooldownUntil - now),
      })),
  };
}

export function resetProviderGateForTests(): void {
  providerStates.clear();
  responseCache.clear();
  inFlight.clear();
  waiters.length = 0;
  activeGlobal = 0;
}