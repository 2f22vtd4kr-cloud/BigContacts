/**
 * Identity adjudication contract for model-led research.
 *
 * Semantic identity is not inferred from employer/domain lists, surnames,
 * transliteration heuristics or token overlap. The Investigator supplies an
 * explicit same/different/unresolved assessment; deterministic code verifies
 * its evidence and provenance before any card mutation.
 */
const NAME_STOP_WORDS = new Set(["the", "and", "for"]);
const ORGANIZATION_SUFFIXES = new Set(["inc", "llc", "ltd", "company", "corp", "plc", "co", "sa", "ag", "bv", "nv", "oy", "ab", "kg", "srl", "spa", "pte", "pty", "sas", "sarl", "llp", "lp"]);

export type IdentitySemanticAssessment = "same_person" | "different_people" | "unresolved";
export type IdentityCollisionResult = {
  risk: boolean;
  assessment: IdentitySemanticAssessment;
  reason: string | null;
};

export function identityNameTokens(value: string | null | undefined): string[] {
  const decomposed = String(value ?? "").normalize("NFKD").toLowerCase();
  let preserved = "";
  let previousBase = "";
  for (const character of decomposed) {
    if (/\p{M}/u.test(character)) {
      // Remove Latin accent marks for fuzzy matching, but preserve meaningful
      // marks in other scripts (e.g. the Ukrainian breve in й).
      if (!previousBase || !/\p{Script=Latin}/u.test(previousBase)) preserved += character;
      continue;
    }
    preserved += character;
    previousBase = character;
  }
  return preserved.normalize("NFC").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => Array.from(token).length >= 2 && !NAME_STOP_WORDS.has(token));
}
export function organizationNameTokens(value: string | null | undefined): string[] {
  const tokens = identityNameTokens(value);
  if (tokens.length && ORGANIZATION_SUFFIXES.has(tokens[tokens.length - 1]!)) tokens.pop();
  return tokens;
}

export function assessIdentityCollision(input: {
  targetName: string;
  companyName?: string | null;
  personName?: string | null;
  value: string;
  sourceUrls: string[];
  note?: string | null;
  identityAssessment?: IdentitySemanticAssessment | null;
  identityRationale?: string | null;
}): IdentityCollisionResult {
  const unresolved: IdentityCollisionResult = {
    risk: true,
    assessment: input.identityAssessment ?? "unresolved",
    reason: "identity assessment is unresolved; preserve as review evidence and do not merge or promote",
  };
  const personName = input.personName?.trim() ?? "";
  const value = String(input.value ?? "").trim();
  const contactLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    || /^(?:\+?\d[\d\s().-]{6,})$/.test(value);

  if (!personName) {
    return {
      risk: true,
        assessment: "unresolved",
      reason: contactLike
        ? "contact has no model-attributed person identity; retain as organization/unknown route"
        : "finding has no model-attributed person identity",
    };
  }
  if (!Array.isArray(input.sourceUrls) || input.sourceUrls.length === 0) {
    return { risk: true, assessment: "unresolved", reason: "identity has no cited source" };
  }
  // Source class is retained in provenance and interpreted contextually by
  // the models; do not hard-exclude a source domain with a static allow/deny
  // list. Exact fetched-quote and identity/value binding are enforced by the
  // immutable evidence persistence boundary.
  // Identity interpretation belongs to the model. Missing or uncertain
  // verdicts do not become a semantic rejection; they remain unresolved and
  // are simply ineligible for irreversible card promotion.
  if (input.identityAssessment === "same_person") {
    if (!input.identityRationale?.trim()) {
      return { risk: true, assessment: "unresolved", reason: "same-person assessment lacks a model-authored rationale" };
    }
    return { risk: false, assessment: "same_person", reason: null };
  }
  if (input.identityAssessment === "different_people") {
    return { risk: true, assessment: "different_people", reason: input.identityRationale?.trim() || "Investigator assessed these as different people" };
  }
  return unresolved;
}

/**
 * Name-pair similarity alone can never authorize a graph merge. Exact
 * duplicates are handled by deterministic ID/deduplication keys; every other
 * pair remains unresolved until an Investigator-authored assessment exists.
 */
export function assessGraphNamePairRisk(leftName: string, rightName: string): IdentityCollisionResult {
  const left = leftName.trim().normalize("NFKC").toLocaleLowerCase();
  const right = rightName.trim().normalize("NFKC").toLocaleLowerCase();
  // Even exact same-name strings can describe different people. This function
  // has no immutable record IDs or source-backed context, so it cannot prove
  // identity; exact duplicate record detection belongs to the persistence key.
  return {
    risk: true,
    assessment: "unresolved",
    reason: left && right && left === right
      ? "identical display names do not prove the same person; require an exact record duplicate or Investigator assessment"
      : "name similarity alone cannot establish identity; require an Investigator same-person assessment",
  };
}
