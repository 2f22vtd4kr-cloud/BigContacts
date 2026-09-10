import { assertSafeOutboundUrl } from "./ssrf-safe-fetch";
import { browserFetchConfigured, getBrowserFetchCount, resetBrowserFetchCount, isChallengeHtml } from "./browser-fetch-core";
import { browserFetchHtml as unsafeBrowserFetchHtml } from "./browser-fetch-core";

export { browserFetchConfigured, getBrowserFetchCount, resetBrowserFetchCount, isChallengeHtml };

export type BrowserFetchOptions = { scope?: string; signal?: AbortSignal };

/** Browser/proxy escalation is an Investigator-selected outbound operation. */
export async function browserFetchHtml(url: string, options: BrowserFetchOptions = {}): Promise<{ html: string; provider: string }> {
  if (options.signal?.aborted) throw new Error("browser fetch cancelled");
  await assertSafeOutboundUrl(url);
  if (options.signal?.aborted) throw new Error("browser fetch cancelled");
  return unsafeBrowserFetchHtml(url, options);
}
