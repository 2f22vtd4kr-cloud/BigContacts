/**
 * Independent source corroboration and evidence-graph primitives.
 *
 * References (method, not product deps):
 * - Two-source rule: independent sources, not the same feed mirrored
 * - Attribution: URL + collection method; primary over aggregator
 * - Evidence-guided research benefits from keeping claims and observations
 *   explicit instead of collapsing them into a single finding.
 *
 * Aggregator hosts often recycle one underlying feed — counting three
 * people-search URLs is still one weak source class.
 */

const AGGREGATOR_HOST_RE =
  /(?:zoominfo|apollo\.io|rocketreach|signalhire|contactout|hunter\.io|clearbit|lusha|spokeo|whitepages|beenverified|intelius|peoplefinder|fastpeoplesearch|truepeoplesearch|thats them|radaris|beenverified)/i;

export type EvidenceNodeKind = "observation" | "claim" | "promotion" | "validation";
export type EvidenceEdgeKind =
  | "supports"
  | "contradicts"
  | "derives_from"
  | "attributes_to"
  | "promotes"
  | "validates";

/**
 * An immutable reference to something the runtime actually observed.
 * Observation text is deliberately optional: the graph can reference a
 * durable event without duplicating potentially large source material.
 */
export interface EvidenceObservation {
  id: string;
  sourceUrl: string;
  sourceHost: string;
  observedAt: string;
  runId?: string | null;
  caseId?: number | null;
  turn?: number | null;
  collectionMethod?: string | null;
  excerpt?: string | null;
}

/** A model-authored proposition whose support must be explicit. */
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

/**
 * Construct immutable observation nodes from source URLs. This is intentionally
 * a graph representation only; it does not assert that the observations prove
 * any claim and it never promotes a value into an entity card.
 */
export function observationsFromSourceUrls(
  urls: readonly string[],
  metadata: Pick<EvidenceObservation, "observedAt" | "runId" | "caseId" | "turn" | "collectionMethod"> = { observedAt: new Date().toISOString() },
): EvidenceObservation[] {
  const seen = new Set<string>();
  const observations: EvidenceObservation[] = [];
  for (const raw of urls) {
    if (typeof raw !== "string") continue;
    const sourceUrl = raw.trim();
    const sourceHost = hostnameOf(sourceUrl);
    if (!sourceHost) continue;
    const canonical = (() => {
      try { return new URL(sourceUrl).href; } catch { return null; }
    })();
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    observations.push({
      id: `observation:${sourceHost}:${observations.length + 1}`,
      sourceUrl: canonical,
      sourceHost,
      observedAt: metadata.observedAt,
      runId: metadata.runId ?? null,
      caseId: metadata.caseId ?? null,
      turn: metadata.turn ?? null,
      collectionMethod: metadata.collectionMethod ?? null,
    });
  }
  return observations;
}

/**
 * Build a claim-support graph without deciding whether the claim is true.
 * Multiple observations may support one claim; that is the key distinction
 * from the old single-observation co-occurrence rule.
 */
export function buildClaimSupportGraph(
  claim: EvidenceClaim,
  observations: readonly EvidenceObservation[],
  reason = "model-attributed multi-source support",
): EvidenceGraph {
  const edges: EvidenceEdge[] = observations.map((observation) => ({
    from: claim.id,
    to: observation.id,
    kind: "supports",
    createdAt: new Date().toISOString(),
    reason,
  }));
  return {
    observations: [...observations],
    claims: [claim],
    edges,
  };
}

/**
 * Require at least two independent source buckets before a graph is considered
 * corroborated. This is a quality signal, not an automatic promotion rule.
 */
export function graphHasIndependentCorroboration(graph: EvidenceGraph): boolean {
  return meetsTwoSourceRule(graph.observations.map((observation) => observation.sourceUrl));
}
