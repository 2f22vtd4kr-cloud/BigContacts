/**
 * Shared web search sub-query helper for non-agentic lanes (deep-web, Mistral).
 * Keep this thin: trained models invent the real dig in agentic ReAct.
 * These are only seed angles — not a research playbook.
 */

export type WebSearchQueryContext = {
  name: string;
  type?: string | null;
  companyName?: string | null;
  geography?: string | null;
  sourceRegistries?: string | null;
  nNumber?: string | null;
  formType?: string | null;
  extraAngles?: string[];
};

/**
 * Build a few seed sub-queries. Cap at 4. Never invent people or contact values.
 */
export function buildWebSearchSubQueries(ctx: WebSearchQueryContext): string[] {
  const name = (ctx.name ?? "").trim();
  if (name.length < 2) return [];

  const queries: string[] = [];
  const shortCo = (ctx.companyName && ctx.companyName !== name)
    ? ctx.companyName.slice(0, 48)
    : "";
  const geo = (ctx.geography ?? "").trim();
  const city = geo.split(",")[0]?.trim() ?? "";

  queries.push(`"${name}"`);
  if (shortCo) queries.push(`"${name}" "${shortCo}"`);
  if (city && city.length > 2) {
    queries.push(shortCo ? `"${shortCo}" "${city}"` : `"${name}" "${city}"`);
  }
  if (ctx.nNumber) queries.push(`"${ctx.nNumber}"`);
  if (ctx.formType && !shortCo) queries.push(`"${name}"`);

  for (const angle of ctx.extraAngles ?? []) {
    const a = angle.trim();
    if (a.length >= 4) queries.push(`"${name}" ${a}`);
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const q of queries) {
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(q);
  }
  return unique.slice(0, 4);
}
