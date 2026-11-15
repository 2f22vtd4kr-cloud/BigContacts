/**
 * @deprecated Legacy discovery pipeline. Canonical Apex Atlas launches use
 * runCanonicalAtlasPipeline -> runBureauAgenticWebPass. Do not route
 * Investigator-selected provisional review cards through this legacy path:
 * its candidate fitness/shape helpers are not the canonical admission policy.
 */
/** Deprecated legacy discovery intake utilities. Canonical investigation strategy belongs to the Investigator and Boss models. */


export type DiscoverySourceKind = "broad" | "registry" | "faa";

export type DiscoverySource =
  | { kind: "broad"; category: number; label: string }
  | { kind: "registry"; label: string; clearFirst?: boolean }
  | { kind: "faa"; label: string };

/** Fisher–Yates shuffle (in place). */
export function shuffleInPlace<T>(items: T[], random: () => number = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

export function shuffledCopy<T>(items: readonly T[], random: () => number = Math.random): T[] {
  return shuffleInPlace([...items], random);
}

/** Legacy compatibility: return every configured broad category without a fixed cap. */
export function sampleBroadCategories(
  sources: readonly DiscoverySource[],
  _count: number,
  _random: () => number = Math.random,
): Set<number> {
  const broad = sources.filter((s): s is Extract<DiscoverySource, { kind: "broad" }> => s.kind === "broad");
  return new Set(broad.map((s) => s.category));
}


/** Legacy compatibility: randomize the supplied source pool without fixed stages or category truncation. */
export function buildSourcesToRun(input: {
  sources: readonly DiscoverySource[];
  discoveryFirst?: boolean;
  broadCategories?: number | null;
  includeFaa?: boolean;
  random?: () => number;
}): DiscoverySource[] {
  const all = input.sources.filter((source) => source.kind !== "faa" || Boolean(input.includeFaa));
  return shuffledCopy(all, input.random ?? Math.random);
}


/**
 * Deprecated compatibility helpers. The canonical Investigator owns
 * relevance, targetability, role and ordering decisions. Legacy callers retain
 * their input order and receive no synthetic score or deterministic veto.
 */
export function rankCandidatesForAdmission<T>(candidates: T[]): T[] {
  return [...candidates];
}

/** Preserve every supplied lead for model review; do not infer entity shape. */
export function filterDiscoveryCandidatesByFitness<T>(candidates: T[]): T[] {
  return [...candidates];
}

/** Preserve the discovery model's chosen order; no keyword-based re-ranking. */
export function rankDiscoveryReviewCandidates<T>(candidates: T[]): T[] {
  return [...candidates];
}
