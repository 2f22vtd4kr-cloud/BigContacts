let count = 0;
export function resetBrowserFetchCount() { count = 0; }
export function getBrowserFetchCount() { return count; }
export function browserFetchConfigured() { return false; }
export function isChallengeHtml(html: string) {
  return /cf-browser-verification|just a moment|challenge-platform/i.test(html || "");
}
export async function browserFetchHtml(url: string): Promise<{ ok: boolean; html?: string; text?: string; error?: string }> {
  return browserFetch(url);
}
export async function browserFetch(url: string): Promise<{ ok: boolean; html?: string; text?: string; error?: string }> {
  count++;
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(18000),
      redirect: "follow",
    });
    const html = await r.text();
    return { ok: r.ok, html, text: html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ") };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
