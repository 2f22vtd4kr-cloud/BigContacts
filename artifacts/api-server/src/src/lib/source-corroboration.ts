/**
 * Independent source corroboration (professional OSINT practice).
 *
 * References (method, not product deps):
 * - Two-source rule: independent sources, not the same feed mirrored
 *   https://peoplelocatorskiptracing.com/open-source-intelligence-osint-guide/
 * - Phone OSINT validation matrix / chain of evidence with URLs
 *   https://theosintvault.io/phone-osint-guide
 * - Attribution: URL + collection method; primary over aggregator
 *   https://molfar.com/news-posts/osint-email-search
 *
 * Aggregator hosts often recycle one underlying feed — counting three
 * people-search URLs is still one weak source class.
 */

const AGGREGATOR_HOST_RE =
  /(?:zoominfo|apollo\.io|rocketreach|signalhire|contactout|hunter\.io|clearbit|lusha|spokeo|whitepages|beenverified|intelius|peoplefinder|fastpeoplesearch|truepeoplesearch|thats them|radaris|beenverified)/i;

export function hostnameOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./i, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

export function isAggregatorHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return AGGREGATOR_HOST_RE.test(host);
}

/**
 * Count independent corroborating hosts among source URLs.
 * Aggregator hosts collapse to a single "aggregator" bucket.
 * Primary/registry hosts each count fully.
 */
export function countIndependentSourceHosts(urls: string[] | null | undefined): number {
  if (!urls?.length) return 0;
  const hosts = new Set<string>();
  let sawAggregator = false;
  for (const raw of urls) {
    const h = hostnameOf(String(raw));
    if (!h) continue;
    if (isAggregatorHost(h)) {
      sawAggregator = true;
      continue;
    }
    hosts.add(h);
  }
  return hosts.size + (sawAggregator ? 1 : 0);
}

/** True when ≥2 independent non-empty host buckets (classic two-source rule). */
export function meetsTwoSourceRule(urls: string[] | null | undefined): boolean {
  return countIndependentSourceHosts(urls) >= 2;
}
