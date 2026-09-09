import { assertSafeOutboundUrl } from "./ssrf-safe-fetch";
import {
  browserFetchConfigured,
  getBrowserFetchCount,
  resetBrowserFetchCount,
  isChallengeHtml,
} from "./browser-fetch-core";
import { browserFetchHtml as unsafeBrowserFetchHtml } from "./browser-fetch-core";

export { browserFetchConfigured, getBrowserFetchCount, resetBrowserFetchCount, isChallengeHtml };

/**
 * Browser/proxy escalation is still an outbound network operation. Validate the
 * Investigator-selected destination before handing it to any third-party
 * scraping service or Playwright.
 */
export async function browserFetchHtml(url: string): Promise<{ html: string; provider: string }> {
  await assertSafeOutboundUrl(url);
  return unsafeBrowserFetchHtml(url);
}
