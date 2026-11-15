/**
 * Compatibility adapter for older target-selection callers.
 *
 * Semantic eligibility, identity, role and company materiality are not
 * classified by local keyword/name regexes. The Investigator/Boss must judge
 * them against the mission and source observations. This adapter intentionally
 * never vetoes a named candidate; it returns a neutral review envelope.
 */
import { assessCompanyRealism } from "./reachability-realism";

export type TargetFitnessOutcome =
  | "strong"
  | "weak"
  | "review"
  | "reject_fame_only"
  | "reject_non_person";

export type TargetFitnessResult = {
  fit: TargetFitnessOutcome;
  reasons: string[];
  roleHints: string[];
};

export function evaluateTargetFitness(input: {
  name: string;
  type?: string | null;
  role?: string | null;
  snippet?: string | null;
  notes?: string | null;
  personScoped?: boolean;
  companyScoped?: boolean;
  companyMetadata?: string | null;
}): TargetFitnessResult {
  const name = input.name.trim();
  if (!name) {
    return {
      fit: "review",
      reasons: ["Target name is missing; request a valid target identifier before research."],
      roleHints: [],
    };
  }
  const company = input.companyScoped
    ? assessCompanyRealism({ metadata: input.companyMetadata })
    : null;
  return {
    fit: "review",
    reasons: [
      "Target-fitness heuristics are disabled. Assess this candidate against the human objective, source-backed identity, contextual role/relationship, uncertainty and expected information gain.",
      input.type ? "Stored entity type (unverified context): " + input.type.slice(0, 80) : "Entity type is unresolved.",
      input.role ? "Stored role text (unverified context): " + input.role.slice(0, 180) : "Role is unresolved.",
      input.snippet ? "Stored source/search lead (not yet evidence): " + input.snippet.slice(0, 240) : "",
      input.notes ? "Stored notes (context only): " + input.notes.slice(0, 180) : "",
      ...(company?.evidence ?? []).map((record) => "Company observation (" + record.collection + "): " + record.details
        + (record.sourceUrl ? " Source URL: " + record.sourceUrl : "")),
    ].filter(Boolean),
    roleHints: [],
  };
}

/** A legacy caller may request this flag, but semantic uncertainty is never a code-level veto. */
export function shouldRejectTarget(_result: TargetFitnessResult): boolean {
  return false;
}

/** Reframing is now a model decision; this adapter never prescribes it. */
export function suggestReframe(_input: {
  name: string;
  fit: TargetFitnessOutcome;
}): string | null {
  return null;
}
