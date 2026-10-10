import { assertSafeOutboundUrl } from "./ssrf-safe-fetch";
import { browserFetchConfigured, getAvailableBrowserFetchProviders, isBrowserFetchProviderAvailable, getBrowserFetchCount, resetBrowserFetchCount, isChallengeHtml } from "./browser-fetch-core";
import { browserFetchHtml as unsafeBrowserFetchHtml, type BrowserProvider } from "./browser-fetch-core";
import { runProviderCall } from "./provider-gate";

export { browserFetchConfigured, getAvailableBrowserFetchProviders, isBrowserFetchProviderAvailable, getBrowserFetchCount, resetBrowserFetchCount, isChallengeHtml };

export type BrowserFetchOptions = { scope?: string; signal?: AbortSignal; provider: BrowserProvider };

/** Browser/proxy escalation is an Investigator-selected outbound operation. */
export async function browserFetchHtml(url: string, options: BrowserFetchOptions): Promise<{ html: string; provider: string; observedUrl: string | null }> {
  if (options.signal?.aborted) throw new Error("browser fetch cancelled");
  await assertSafeOutboundUrl(url);
  if (options.signal?.aborted) throw new Error("browser fetch cancelled");
  if (options.provider === "playwright") {
    return runProviderCall({ provider: "playwright", account: new URL(url).hostname, scope: options.scope, signal: options.signal }, () => unsafeBrowserFetchHtml(url, options));
  }
  return unsafeBrowserFetchHtml(url, options);
}
