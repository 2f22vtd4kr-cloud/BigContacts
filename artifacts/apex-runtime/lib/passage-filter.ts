export function filterClaimUrls(urls: string[]): string[] {
  return (urls || []).filter((u) => /^https?:\/\//i.test(u)).slice(0, 20);
}
export function filterPassagesForQuery(passages: string[], _query: string): string[] {
  return (passages || []).slice(0, 12);
}
