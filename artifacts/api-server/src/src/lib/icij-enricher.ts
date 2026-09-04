/**
 * ICIJ Offshore Leaks Enricher
 */

import { logger } from "./logger";

const RECONCILE_URL = "https://offshoreleaks.icij.org/api/v1/reconcile";
const ENTITY_DETAIL_URL = "https://offshoreleaks.icij.org/nodes";

type IcijQueryResult = { result: IcijMatch[] };
type IcijBatchResult = Record<string, IcijQueryResult>;

export interface IcijMatch {
  id: string;
  name: string;
  score: number;
  match: boolean;
  type: Array<{ id: string; name: string }>;
  jurisdiction?: string | null;
  incorporationDate?: string | null;
  inactivationDate?: string | null;
  registeredAddress?: string | null;
  countryCode?: string | null;
  sourceId?: string | null;
  nodeType?: string | null;
  linkedOfficers?: Array<{ name: string; relationship: string }>;
  status?: string | null;
  profileUrl?: string | null;
}

export interface IcijEnrichResult {
  found: boolean;
  totalMatches: number;
  matches: IcijMatch[];
  sources: string[];
  queryName: string;
  error?: string;
}

export function isAcceptedIcijMatch(match: IcijMatch): boolean {
  return match.match === true;
}

function isSingleQueryResult(value: IcijQueryResult | IcijBatchResult): value is IcijQueryResult {
  return Array.isArray((value as Partial<IcijQueryResult>).result);
}

async function reconcile(
  queries: Record<string, { query: string; type?: string; limit?: number }>
): Promise<IcijBatchResult | IcijQueryResult> {
  const resp = await fetch(RECONCILE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "ApexFinder-OSINT/2.0 (research@apexfinder.private)",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      type: "Officer",
      queries: Object.fromEntries(Object.entries(queries).map(([key, query]) => [key, { query: query.query }])),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) throw new Error(`ICIJ reconcile HTTP ${resp.status}: ${resp.statusText}`);
  return resp.json() as Promise<IcijBatchResult | IcijQueryResult>;
}

async function fetchNodeDetail(nodeId: string): Promise<Partial<IcijMatch>> {
  try {
    const url = `${ENTITY_DETAIL_URL}/${encodeURIComponent(nodeId)}.json`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "ApexFinder-OSINT/2.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return {};
    const data = await resp.json() as any;
    return {
      jurisdiction: data?.jurisdiction ?? data?.country_codes?.[0] ?? null,
      incorporationDate: data?.incorporation_date ?? null,
      inactivationDate: data?.inactivation_date ?? null,
      registeredAddress: data?.registered_address ?? null,
      status: data?.status ?? null,
      nodeType: data?.node_type ?? null,
      sourceId: data?.sourceID ?? data?.source_id ?? null,
      profileUrl: `https://offshoreleaks.icij.org/nodes/${nodeId}`,
      linkedOfficers: (data?.linked_relationships ?? []).map((r: any) => ({
        name: r?.node?.name ?? r?.name ?? "Unknown",
        relationship: r?.relationship_type ?? r?.rel_type ?? "linked",
      })).slice(0, 20),
    };
  } catch {
    return {};
  }
}

export async function enrichWithIcij(
  entityName: string,
  aliases: string[] = [],
  fetchDetail = false
): Promise<IcijEnrichResult> {
  const queryName = entityName.trim();
  if (!queryName) return { found: false, totalMatches: 0, matches: [], sources: [], queryName };

  const allNames = [queryName, ...aliases.slice(0, 4)];
  const queries: Record<string, { query: string; type: string; limit: number }> = {};
  allNames.forEach((name, i) => { queries[`q${i}`] = { query: name, type: "/Entity", limit: 5 }; });

  let rawResults: IcijBatchResult;
  try {
    const response = await reconcile(queries);
    rawResults = isSingleQueryResult(response) ? { q0: response } : response;
  } catch (err: any) {
    logger.warn({ err: err.message, entityName }, "[ICIJ] reconcile API error");
    return { found: false, totalMatches: 0, matches: [], sources: [], queryName, error: err.message };
  }

  const seen = new Set<string>();
  const allMatches: IcijMatch[] = [];
  for (const key of Object.keys(queries)) {
    for (const match of rawResults[key]?.result ?? []) {
      if (!isAcceptedIcijMatch(match) || seen.has(match.id)) continue;
      seen.add(match.id);
      allMatches.push(match);
    }
  }

  allMatches.sort((a, b) => b.score - a.score);
  const topMatches = allMatches.slice(0, 15);

  if (fetchDetail && topMatches.length > 0) {
    const detailLimit = Math.min(topMatches.length, 5);
    const details = await Promise.allSettled(topMatches.slice(0, detailLimit).map((m) => fetchNodeDetail(m.id)));
    details.forEach((result, i) => {
      if (result.status === "fulfilled") Object.assign(topMatches[i]!, result.value);
    });
  }

  const sourceMap: Record<string, string> = {
    panama_papers: "Panama Papers",
    pandora_papers: "Pandora Papers",
    paradise_papers: "Paradise Papers",
    bahamas_leaks: "Bahamas Leaks",
    offshore_leaks: "Offshore Leaks",
    icij: "ICIJ",
  };
  const foundSources = new Set<string>();
  for (const match of topMatches) {
    if (match.sourceId) foundSources.add(sourceMap[match.sourceId.toLowerCase()] ?? match.sourceId);
  }

  logger.info({ entityName, matchCount: topMatches.length, sources: [...foundSources] }, "[ICIJ] enrichment complete");
  return { found: topMatches.length > 0, totalMatches: topMatches.length, matches: topMatches, sources: [...foundSources], queryName };
}

export function summariseIcijFindings(result: IcijEnrichResult): string | null {
  if (!result.found || result.matches.length === 0) return null;
  const lines: string[] = [`ICIJ Offshore Leaks — ${result.totalMatches} match(es):`];
  for (const match of result.matches.slice(0, 5)) {
    const parts: string[] = [`  • ${match.name} (score: ${match.score.toFixed(2)})`];
    if (match.jurisdiction) parts.push(`[${match.jurisdiction}]`);
    if (match.sourceId) parts.push(`via ${match.sourceId.replace(/_/g, " ")}`);
    if (match.nodeType) parts.push(`— ${match.nodeType}`);
    if (match.profileUrl) parts.push(`→ ${match.profileUrl}`);
    lines.push(parts.join(" "));
  }
  return lines.join("\n");
}
