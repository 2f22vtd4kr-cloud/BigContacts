import { bindExactSourceSpan } from "./research-epistemic-vnext";

/**
 * Bind a model-selected person name to the exact registry result row that
 * supplied the URL. Registry searches are not page fetches: the formatted
 * observation line carries a row name followed by its unvisited record URLs.
 * Never let a name on a neighbouring row borrow another row's URL.
 */
export function bindExactRegistryLeadName(
  observation: string,
  sourceUrl: string,
  targetName: string,
): ReturnType<typeof bindExactSourceSpan> {
  const normalize = (raw: string): string | null => {
    try {
      const url = new URL(raw.trim());
      if (url.protocol !== "https:" || url.username || url.password) return null;
      url.hash = "";
      url.hostname = url.hostname.toLowerCase();
      return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href;
    } catch {
      return null;
    }
  };
  const expected = normalize(sourceUrl);
  if (!expected || !observation.trim() || !targetName.trim()) return null;

  const marker = "; UNVISITED_RECORD_URLS (leads only):";
  for (const line of observation.split(/\r?\n/)) {
    const markerIndex = line.indexOf(marker);
    if (markerIndex < 0) continue;
    const rowUrls = line.slice(markerIndex + marker.length).split("|")
      .map((value) => normalize(value))
      .filter((value): value is string => Boolean(value));
    if (!rowUrls.includes(expected)) continue;
    const rowText = line.slice(0, markerIndex);
    const span = bindExactSourceSpan(rowText, targetName, undefined, 320);
    if (span?.exact) return span;
  }
  return null;
}
