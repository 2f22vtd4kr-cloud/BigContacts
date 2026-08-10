/**
 * Discovery intake — Replit-safe diversity + approachable-HNWI preference.
 *
 * Goals:
 * - Mix broad web themes and registry rounds without fixed Europe-first bias
 * - Prefer operators / active principals over famous-but-unreachable trophy names
 * - Real public signals only; never invent openness or contacts
 */

import { evaluateTargetFitness, shouldRejectTarget } from "./target-fitness";

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
 * Lightweight public-signal score for "worth a proposal" principals.
 * Higher = prefer admit/cook first. Does not invent facts — only reads text.
 * Fame-only / non-person targets score 0 so they are never preferred under budget.
 */
export function scoreApproachableCandidate(input: {
  name: string;
  snippet?: string | null;
  query?: string | null;
  notes?: string | null;
}): number {
  const fitness = evaluateTargetFitness({
    name: input.name,
    snippet: input.snippet,
    notes: `${input.query ?? ""}\n${input.notes ?? ""}`,
    personScoped: true,
  });
  if (shouldRejectTarget(fitness)) {
    return 0;
  }

  const text = `${input.name}\n${input.snippet ?? ""}\n${input.query ?? ""}\n${input.notes ?? ""}`.toLowerCase();
  let score = 0.3;

  if (/\b(founder|co-founder|cofounder|operator|managing partner|general partner|ceo|chief executive|owner-operator|proprietor)\b/i.test(text)) {
    score += 0.25;
  }
  // E residual: prefer officer / director / shareholder person recipes over corp shells.
  if (/\b(officer|director|board member|non-executive|shareholder|psc|beneficial owner|partner)\b/i.test(text)) {
    score += 0.18;
  }
  if (/\b(founder|operator|managing partner|gp)\b/i.test(input.name) === false && /\b(founded|launched|built|started)\b/i.test(text)) {
    score += 0.1;
  }

  if (/\b(angel investor|seed investor|early investor|portfolio company|interview|keynote|conference|summit|podcast)\b/i.test(text)) {
    score += 0.15;
  }
  if (/\b(family office|private equity|venture|growth equity)\b/i.test(text)) {
    score += 0.08;
  }

  if (/\b(contact|team@|info@|linkedin\.com\/in\/|about us|leadership)\b/i.test(text)) {
    score += 0.12;
  }

  if (/\b(billionaire|celebrity|socialite|heir|heiress|royalty)\b/i.test(text) && !/\b(founder|ceo|partner|operator|director)\b/i.test(text)) {
    score -= 0.15;
  }
  if (/\b(anonymous|undisclosed owner|shell company only)\b/i.test(text)) {
    score -= 0.2;
  }

  const nameParts = input.name.trim().split(/\s+/);
  if (nameParts.length >= 2 && nameParts.length <= 4 && /^[A-Za-zÀ-ÿ'\u2019\-]+$/.test(nameParts[0] ?? "")) {
    score += 0.05;
  }

  // Blend deterministic fitness so strong operators rise and trophies stay low.
  score = score * 0.7 + fitness.score * 0.3;

  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}

/** Sort candidates best-first for admission under a tight maxEntities budget. */
export function rankCandidatesForAdmission<T extends { name: string; snippet?: string; query?: string }>(
  candidates: T[],
): T[] {
  return [...candidates].sort((a, b) => {
    const sb = scoreApproachableCandidate(b);
    const sa = scoreApproachableCandidate(a);
    return sb - sa;
  });
}

/**
 * Drop fame-only trophies from discovery review lists.
 * Pure corp shells are kept but annotated so operators reframe to officers —
 * never presented as person targets without a person path.
 */
export function filterDiscoveryCandidatesByFitness<T extends {
  name: string;
  type?: string | null;
  relevance?: string | null;
  reachability?: string | null;
}>(candidates: T[]): T[] {
  const kept: T[] = [];
  for (const candidate of candidates) {
    const fitness = evaluateTargetFitness({
      name: candidate.name,
      type: candidate.type,
      snippet: `${candidate.relevance ?? ""} ${candidate.reachability ?? ""}`,
      personScoped: true,
    });
    if (fitness.fit === "reject_fame_only") {
      // Ultra-public household names never enter the discovery review deck.
      continue;
    }
    if (fitness.fit === "reject_non_person") {
      const relevance = String(candidate.relevance ?? "").trim();
      const note = "Corp/shell under person-scoped discovery — reframe to named officers/directors/shareholders before admission.";
      kept.push({
        ...candidate,
        relevance: relevance.includes("reframe") ? relevance : `${relevance ? `${relevance} ` : ""}${note}`.trim(),
        reachability: candidate.reachability
          ? String(candidate.reachability)
          : "Organization shell only; no person path claimed.",
      });
      continue;
    }
    kept.push(candidate);
  }
  return kept;
}

/** Rank discovery review candidates: approachable principals first, shells last. */
export function rankDiscoveryReviewCandidates<T extends {
  name: string;
  type?: string | null;
  relevance?: string | null;
  reachability?: string | null;
}>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => {
    const sb = scoreApproachableCandidate({
      name: b.name,
      snippet: `${b.relevance ?? ""} ${b.reachability ?? ""}`,
    });
    const sa = scoreApproachableCandidate({
      name: a.name,
      snippet: `${a.relevance ?? ""} ${a.reachability ?? ""}`,
    });
    return sb - sa;
  });
}
