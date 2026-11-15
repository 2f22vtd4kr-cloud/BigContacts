/**
 * @deprecated Legacy discovery pipeline. Canonical Apex Atlas launches use
 * runCanonicalAtlasPipeline -> runBureauAgenticWebPass. Do not route
 * Investigator-selected provisional review cards through this legacy path:
 * its candidate fitness/shape helpers are not the canonical admission policy.
 */
/**
 * Discovery intake — Replit-safe diversity + approachable-HNWI preference.
 *
 * Goals:
 * - Mix broad web themes and registry rounds without fixed Europe-first bias
 * - Prefer operators / active principals over famous-but-unreachable trophy names
 * - Real public signals only; never invent openness or contacts
 */


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

/**
 * Sample N broad categories without replacement (true mix, not slice(0, N)).
 */
export function sampleBroadCategories(
  sources: readonly DiscoverySource[],
  count: number,
  random: () => number = Math.random,
): Set<number> {
  const broad = sources.filter((s): s is Extract<DiscoverySource, { kind: "broad" }> => s.kind === "broad");
  const picked = shuffledCopy(broad, random).slice(0, Math.max(1, Math.min(count, broad.length)));
  return new Set(picked.map((s) => s.category));
}

/**
 * Build the run order: keep a light broad/registry interleave, but shuffle
 * which broad themes and which registry slots appear so each run differs.
 */
export function buildSourcesToRun(input: {
  sources: readonly DiscoverySource[];
  discoveryFirst?: boolean;
  broadCategories?: number | null;
  includeFaa?: boolean;
  random?: () => number;
}): DiscoverySource[] {
  const random = input.random ?? Math.random;
  const all = input.sources.filter((s) => (s.kind === "faa" ? Boolean(input.includeFaa) : true));

  const broadAll = all.filter((s): s is Extract<DiscoverySource, { kind: "broad" }> => s.kind === "broad");
  const registryAll = all.filter((s): s is Extract<DiscoverySource, { kind: "registry" }> => s.kind === "registry");
  const faaAll = all.filter((s): s is Extract<DiscoverySource, { kind: "faa" }> => s.kind === "faa");

  const broadLimit =
    input.discoveryFirst && input.broadCategories != null && input.broadCategories > 0
      ? Math.max(1, Math.min(input.broadCategories, broadAll.length))
      : broadAll.length;

  const broadPicked = shuffledCopy(broadAll, random).slice(0, broadLimit);
  const registryPicked = shuffledCopy(registryAll, random);
  const faaPicked = shuffledCopy(faaAll, random);

  // Interleave: prefer pattern B R B R … so intake stays mixed, not all-web then all-registry.
  const out: DiscoverySource[] = [];
  const maxLen = Math.max(broadPicked.length, registryPicked.length, faaPicked.length);
  let faaInserted = false;
  for (let i = 0; i < maxLen; i++) {
    if (i < broadPicked.length) out.push(broadPicked[i]!);
    if (i < registryPicked.length) out.push(registryPicked[i]!);
    // Optional FAA sprinkle mid-run when enabled — not a required lane
    if (!faaInserted && faaPicked.length > 0 && i === Math.floor(maxLen / 2)) {
      out.push(faaPicked[0]!);
      faaInserted = true;
    }
  }
  if (!faaInserted && faaPicked.length > 0) out.push(faaPicked[0]!);

  return out;
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
