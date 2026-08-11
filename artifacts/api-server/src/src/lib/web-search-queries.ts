/**
 * Shared operator-aware web search sub-query planner.
 * Used by deep-web OSINT and LLM web lanes (Mistral, etc.) for consistent
 * multi-angle decomposition without inventing contacts.
 *
 * Incorporates public-source menus inspired by mid-market OSINT practice
 * (org footprint / registry / contact-page / related-officer angles).
 * Fail-closed: queries never invent people or contact values.
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
 * Build quoted / site: / OR-group sub-queries for a named target.
 * Deterministic. Never invents people or contact values.
 * Cap raised to 12 so org-footprint angles survive alongside person+company.
 */
export function buildWebSearchSubQueries(ctx: WebSearchQueryContext): string[] {
  const name = (ctx.name ?? "").trim();
  if (name.length < 2) return [];

  const type = (ctx.type ?? "").toLowerCase();
  const isCorp = /company|org|corporation|fund|trust|llc|ltd|plc/.test(type) ||
    /\b(llc|ltd|inc|corp|plc|holdings)\b/i.test(name);
  const queries: string[] = [];
  const shortCo = (ctx.companyName && ctx.companyName !== name)
    ? ctx.companyName.slice(0, 48)
    : "";
  const geo = (ctx.geography ?? "").trim();
  const city = geo.split(",")[0]?.trim() ?? "";

  if (!isCorp) {
    queries.push(`"${name}" (email OR contact OR phone)`);
    queries.push(`"${name}" site:linkedin.com/in`);
    // Person + company is the highest-yield public OSINT angle
    if (shortCo) {
      queries.push(`"${name}" "${shortCo}" (email OR contact OR phone OR linkedin)`);
      queries.push(`"${name}" "${shortCo}" (director OR officer OR president OR owner OR "co-founder")`);
      queries.push(`"${shortCo}" (contact OR "contact us" OR "about us" OR team OR leadership) (email OR phone OR "info@")`);
      queries.push(`"${shortCo}" (BBB OR "better business" OR chamber)`);
      queries.push(`"${shortCo}" (site:opencorporates.com OR site:sec.gov OR GLEIF OR "companies house")`);
      queries.push(`"${shortCo}" site:facebook.com (info@ OR contact OR about)`);
      queries.push(`"${shortCo}" official website`);
    }
    if (ctx.nNumber) {
      queries.push(`"${ctx.nNumber}" (owner OR registrant) (email OR contact)`);
    }
    if (ctx.formType && !shortCo) {
      queries.push(`"${name}" (investor OR director OR "beneficial owner") (SEC OR EDGAR)`);
      queries.push(`"${name}" site:sec.gov`);
    }
    if (city && city.length > 2) {
      queries.push(`"${name}" "${city}" (email OR contact OR linkedin)`);
      if (shortCo) queries.push(`"${shortCo}" "${city}" (phone OR address OR contact)`);
    }
  } else {
    const clean = name
      .replace(/\b(llc|ltd|limited|corp|corporation|inc|incorporated|group|holdings|trust|co)\b\.?$/gi, "")
      .trim() || name;
    queries.push(`"${name}" (CEO OR director OR "management team" OR owner OR "co-founder") (email OR contact)`);
    queries.push(`"${clean}" ("registered office" OR "head office" OR about OR team OR leadership) (contact OR email OR "info@")`);
    queries.push(`"${clean}" (BBB OR chamber OR "better business")`);
    queries.push(`"${clean}" (site:opencorporates.com OR site:sec.gov OR GLEIF)`);
    queries.push(`"${clean}" site:facebook.com (info@ OR contact)`);
    queries.push(`"${clean}" ("contact us" OR "contact-page" OR "sales-contact") (phone OR email)`);
    if (/uk|ltd|plc/i.test(ctx.sourceRegistries ?? "") || /\b(ltd|plc)\b/i.test(name)) {
      queries.push(`site:companies-house.gov.uk "${clean}"`);
    }
    if (/sec|edgar|us/i.test(ctx.sourceRegistries ?? "") || !ctx.sourceRegistries) {
      queries.push(`site:sec.gov "${clean}"`);
    }
    if (city && city.length > 2) {
      queries.push(`"${clean}" "${city}" (phone OR address OR contact)`);
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
  return unique.slice(0, 12);
}
