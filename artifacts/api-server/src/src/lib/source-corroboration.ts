/**
 * Independent source corroboration and evidence-graph primitives.
 *
 * The graph is operational state, not a post-hoc decoration: a model-authored
 * claim points at immutable observations, while deterministic code validates
 * the observation set and source independence before any promotion decision.
 */

const AGGREGATOR_HOST_RE =
  /(?:zoominfo|apollo\.io|rocketreach|signalhire|contactout|hunter\.io|clearbit|lusha|spokeo|whitepages|beenverified|intelius|peoplefinder|fastpeoplesearch|truepeoplesearch|thats them|radaris)/i;

export type EvidenceNodeKind = "observation" | "claim" | "promotion" | "validation";
export type EvidenceEdgeKind = "supports" | "contradicts" | "derives_from" | "attributes_to" | "promotes" | "validates";

export interface EvidenceObservation {
  id: string;
  sourceUrl: string;
  sourceHost: string;
  observedAt: string;
  runId?: string | null;
  caseId?: number | null;
  turn?: number | null;
  collectionMethod?: string | null;
  eventId?: number | null;
  excerpt?: string | null;
}

export interface EvidenceClaim {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  scope: "candidate" | "organization" | "target";
  personName?: string | null;
  confidence?: number | null;
}

export interface EvidenceEdge {
  from: string;
  to: string;
  kind: EvidenceEdgeKind;
  createdAt: string;
  reason?: string | null;
}

export interface EvidenceGraph {
  observations: EvidenceObservation[];
  claims: EvidenceClaim[];
  edges: EvidenceEdge[];
}

export function hostnameOf(url: string): string | null {
  try { const u = new URL(url); return u.hostname.replace(/^www\./i, "").toLowerCase() || null; } catch { return null; }
}
export function isAggregatorHost(host: string | null | undefined): boolean { return Boolean(host && AGGREGATOR_HOST_RE.test(host)); }
export function countIndependentSourceHosts(urls: string[] | null | undefined): number {
  if (!urls?.length) return 0;
  const hosts = new Set<string>(); let sawAggregator = false;
  for (const raw of urls) { const h = hostnameOf(String(raw)); if (!h) continue; if (isAggregatorHost(h)) sawAggregator = true; else hosts.add(h); }
  return hosts.size + (sawAggregator ? 1 : 0);
}
export function meetsTwoSourceRule(urls: string[] | null | undefined): boolean { return countIndependentSourceHosts(urls) >= 2; }

export function observationsFromSourceUrls(
  urls: readonly string[],
  metadata: Pick<EvidenceObservation, "observedAt" | "runId" | "caseId" | "turn" | "collectionMethod" | "eventId"> & { idPrefix?: string; excerptByUrl?: Record<string, string> } = { observedAt: new Date().toISOString() },
): EvidenceObservation[] {
  const seen = new Set<string>(); const observations: EvidenceObservation[] = [];
  const idPrefix = String(metadata.idPrefix ?? "run").replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 80) || "run";
  for (const raw of urls) {
    if (typeof raw !== "string") continue;
    const sourceUrl = raw.trim(); const sourceHost = hostnameOf(sourceUrl); if (!sourceHost) continue;
    const canonical = (() => { try { return new URL(sourceUrl).href; } catch { return null; } })();
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    observations.push({ id: `observation:${idPrefix}:${observations.length + 1}`, sourceUrl: canonical, sourceHost, observedAt: metadata.observedAt, runId: metadata.runId ?? null, caseId: metadata.caseId ?? null, turn: metadata.turn ?? null, collectionMethod: metadata.collectionMethod ?? null, eventId: metadata.eventId ?? null, excerpt: metadata.excerptByUrl?.[canonical] ?? null });
  }
  return observations;
}

export function buildClaimSupportGraph(claim: EvidenceClaim, observations: readonly EvidenceObservation[], reason = "model-attributed source support"): EvidenceGraph {
  const observationIds = new Set(observations.map((observation) => observation.id));
  const edges = observations.filter((observation) => observationIds.has(observation.id)).map((observation) => ({ from: claim.id, to: observation.id, kind: "supports" as const, createdAt: new Date().toISOString(), reason }));
  return { observations: [...observations], claims: [claim], edges };
}

export function graphHasIndependentCorroboration(graph: EvidenceGraph): boolean { return meetsTwoSourceRule(graph.observations.map((observation) => observation.sourceUrl)); }

/**
 * Structural graph validation. `requireImmutableEventAnchor` is reserved for
 * the canonical persisted path; older in-memory graph callers can still use
 * this primitive without falsely claiming that synthetic observations are
 * immutable event records.
 */
export function validateClaimSupportGraph(graph: EvidenceGraph, requireImmutableEventAnchor = false): { valid: boolean; reason: string | null } {
  if (graph.claims.length !== 1) return { valid: false, reason: "graph must contain exactly one claim" };
  const claim = graph.claims[0];
  const supportingIds = new Set(graph.edges.filter((edge) => edge.from === claim.id && edge.kind === "supports").map((edge) => edge.to));
  if (!supportingIds.size) return { valid: false, reason: "claim has no supporting observations" };
  if (graph.observations.some((observation) => !supportingIds.has(observation.id))) return { valid: false, reason: "graph contains unattributed observations" };
  if (graph.observations.some((observation) => !/^https?:\/\//i.test(observation.sourceUrl))) return { valid: false, reason: "non-http observation" };
  if (requireImmutableEventAnchor && graph.observations.some((observation) => observation.eventId == null)) return { valid: false, reason: "observation is not anchored to an immutable event" };
  return { valid: true, reason: null };
}
