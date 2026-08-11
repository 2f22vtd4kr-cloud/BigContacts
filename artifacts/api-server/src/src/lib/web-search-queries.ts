/**
 * Shared operator-aware web search sub-query planner.
 * Used by deep-web OSINT and LLM web lanes (Mistral, etc.) for consistent
 * multi-angle decomposition without inventing contacts.
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
 * Build 3–8 quoted / site: / OR-group sub-queries for a named target.
 * Deterministic. Never invents people or contact values.
 */
export function buildWebSearchSubQueries(ctx: WebSearchQueryContext): string[] {
  const name = (ctx.name ?? "").trim();
  if (name.length < 2) return [];

  const type = (ctx.type ?? "").toLowerCase();
  const isCorp = /company|org|corporation|fund|trust|llc|ltd|plc/.test(type) ||
    /\b(llc|ltd|inc|corp|plc|holdings)\b/i.test(name);
  const queries: string[] = [];

  if (!isCorp) {
    queries.push(`"${name}" (email OR contact OR phone)`);
    queries.push(`"${name}" site:linkedin.com/in`);
    if (ctx.nNumber) {
      queries.push(`"${ctx.nNumber}" (owner OR registrant) (email OR contact)`);
    }
    if (ctx.companyName && ctx.companyName !== name) {
      const shortCo = ctx.companyName.slice(0, 48);
      queries.push(`"${name}" "${shortCo}" (director OR officer OR contact)`);
    } else if (ctx.formType) {
      queries.push(`"${name}" (investor OR director OR "beneficial owner") (SEC OR EDGAR)`);
      queries.push(`"${name}" site:sec.gov`);
    }
    if (ctx.geography) {
      const city = ctx.geography.split(",")[0]?.trim();
      if (city && city.length > 2) {
        queries.push(`"${name}" "${city}" (email OR contact OR linkedin)`);
      }
    }
  } else {
    const clean = name
      .replace(/\b(llc|ltd|limited|corp|corporation|inc|incorporated|group|holdings|trust|co)\b\.?$/gi, "")
      .trim();
    queries.push(`"${name}" (CEO OR director OR "management team") (email OR contact)`);
    queries.push(`"${clean}" ("registered office" OR "head office" OR about OR team) (contact OR email)`);
    if (/uk|ltd|plc/i.test(ctx.sourceRegistries ?? "") || /\b(ltd|plc)\b/i.test(name)) {
      queries.push(`site:companies-house.gov.uk "${clean}"`);
    }
    if (/sec|edgar|us/i.test(ctx.sourceRegistries ?? "")) {
      queries.push(`site:sec.gov "${clean}"`);
    }
  }

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
  return unique.slice(0, 8);
}
