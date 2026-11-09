import { assessCompanyRealism } from "./reachability-realism";

/**
 * Target fitness gate — Phase 1.
 *
 * Prefer reachable operators/principals and reject pure organization shells
 * when the budget is person-scoped. Famous-person realism is a model-owned
 * Boss/Investigator judgment, not a deterministic name or description filter.
 * Never invent signals; only reads name + optional public footprint text.
 *
 * Outcomes:
 *   strong              — clear operator/principal signal
 *   weak                — person-shaped but thin signal; proceed with caution
 *   review              — ambiguous; human or Boss should look
 *   reject_fame_only    — legacy outcome retained for compatibility; not emitted here
 *   reject_non_person   — corp/shell with no person path when person-scoped
 */

export type TargetFitnessOutcome =
  | "strong"
  | "weak"
  | "review"
  | "reject_fame_only"
  | "reject_non_person";

export type TargetFitnessResult = {
  fit: TargetFitnessOutcome;
  score: number; // 0..1
  reasons: string[];
  roleHints: string[];
};

const OPERATOR_ROLE_RE =
  /\b(founder|co-?founder|cofounder|ceo|chief executive|managing partner|general partner|gp\b|operator|owner-?operator|proprietor|managing director|executive chairman|president(?!\s+of\s+the\s+united)|cto|cfo|coo|chief\s+\w+\s+officer|board\s+member|director(?!\s+of\s+photography)|shareholder|principal)\b/i;

const CORP_SHELL_RE =
  /\b(ltd|limited|llc|inc|corp|corporation|gmbh|aps|ab|oy|sa|sas|bv|nv|pty|plc|holdings?|group|investments?)\b/i;

const PERSON_NAME_RE = /^[A-Za-zÀ-ÿ'’.\-]+(?:\s+[A-Za-zÀ-ÿ'’.\-]+){0,4}$/;

/**
 * Evaluate whether a proposed target is fit for person-scoped OSINT budget.
 */
export function evaluateTargetFitness(input: {
  name: string;
  type?: string | null;
  role?: string | null;
  snippet?: string | null;
  notes?: string | null;
  /** When true, pure corp shells with no person path are rejected. */
  personScoped?: boolean;
  /** When true, evaluate an organization as a company target, not as a person. */
  companyScoped?: boolean;
  /** Structured, source-bound company evidence used by the company realism gate. */
  companyMetadata?: string | null;
}): TargetFitnessResult {
  const name = (input.name ?? "").trim();
  const type = (input.type ?? "").trim();
  const role = (input.role ?? "").trim();
  const footprint = `${role}\n${input.snippet ?? ""}\n${input.notes ?? ""}`.trim();
  const text = `${name}\n${footprint}`.toLowerCase();
  const reasons: string[] = [];
  const roleHints: string[] = [];
  let score = 0.4;

  if (!name || name.length < 2) {
    return {
      fit: "reject_non_person",
      score: 0,
      reasons: ["Empty or invalid name."],
      roleHints: [],
    };
  }

  const isOrgType =
    /^(corporation|corp|company|trust|org|organization|entity|partnership|llc|limited liability company)$/i.test(type) ||
    CORP_SHELL_RE.test(name);

  const looksLikePersonName = PERSON_NAME_RE.test(name) && !CORP_SHELL_RE.test(name);
  const hasOperatorRole = OPERATOR_ROLE_RE.test(text);

  if (input.companyScoped === true || (input.personScoped === false && isOrgType)) {
    const company = assessCompanyRealism({ metadata: input.companyMetadata });
    const companyReasons = [
      ...company.reasons,
      "Company-level realism is separate from individual owner wealth.",
      "Inc. 5000/fast-growth/unicorn rankings are discovery signals; ranking-only mentions are leads, not qualified targets.",
    ];
    if (company.status === "materiality_evidenced"
      && company.hasActiveCompanyRegistry
      && company.hasOwnershipControlEvidence
      && company.hasOfficialBusinessRoute) {
      return {
        fit: "strong",
        score: Math.max(0.7, Number((company.score / 100).toFixed(3))),
        reasons: companyReasons,
        roleHints: ["source-backed company materiality", "verified organization-level route"],
      };
    }
    if (company.hasSourceBackedScale || company.hasGrowthRankingSignal || company.hasActiveCompanyRegistry) {
      return {
        fit: "review",
        score: Number(Math.max(0.4, company.score / 100).toFixed(3)),
        reasons: [...companyReasons, ...company.blockers],
        roleHints: company.hasGrowthRankingSignal ? ["company growth ranking lead"] : ["company evidence requires independent validation"],
      };
    }
    return {
      fit: "review",
      score: 0.4,
      reasons: [
        "Company-shaped target requires company-specific evidence; do not apply person-only fitness rules.",
        ...company.blockers,
      ],
      roleHints: [],
    };
  }

  if (hasOperatorRole) {
    score += 0.3;
    const match = text.match(OPERATOR_ROLE_RE);
    if (match?.[0]) roleHints.push(match[0].toLowerCase());
    reasons.push("Operator/principal role signal present.");
  }

  if (looksLikePersonName) {
    score += 0.1;
  }

  if (/\b(linkedin\.com\/in\/|contact|team@|about us|leadership)\b/i.test(text)) {
    score += 0.1;
    reasons.push("Public contact or leadership footprint signal.");
  }

  // Person-scoped budget + pure org shell → reject
  if (input.personScoped !== false && isOrgType && !looksLikePersonName && !hasOperatorRole) {
    return {
      fit: "reject_non_person",
      score: Math.max(0, Math.min(1, Number(score.toFixed(3)))),
      reasons: [
        "Target is a corporation/shell with no person path while budget is person-scoped.",
        "Reframe to officers/directors/shareholders of the entity instead.",
      ],
      roleHints,
    };
  }

  score = Math.max(0, Math.min(1, Number(score.toFixed(3))));

  if (score >= 0.65 && hasOperatorRole) {
    return { fit: "strong", score, reasons, roleHints };
  }
  if (score >= 0.45 && looksLikePersonName) {
    return { fit: "weak", score, reasons: reasons.length ? reasons : ["Person-shaped with limited operator signal."], roleHints };
  }
  if (looksLikePersonName || hasOperatorRole) {
    return { fit: "review", score, reasons: reasons.length ? reasons : ["Ambiguous fitness; needs Boss/human review."], roleHints };
  }

  if (isOrgType) {
    return {
      fit: input.personScoped !== false ? "reject_non_person" : "review",
      score,
      reasons: ["Organization-shaped target without clear person path."],
      roleHints,
    };
  }

  return {
    fit: "review",
    score,
    reasons: reasons.length ? reasons : ["Insufficient public signal to rank fitness."],
    roleHints,
  };
}

/** True when the gate says do not spend a full research circle. */
export function shouldRejectTarget(result: TargetFitnessResult): boolean {
  return result.fit === "reject_fame_only" || result.fit === "reject_non_person";
}

/** Suggested reframe text for Boss / admission logs. */
export function suggestReframe(input: {
  name: string;
  fit: TargetFitnessOutcome;
}): string | null {
  if (input.fit === "reject_fame_only") {
    return `Do not research "${input.name}" as a trophy. Prefer a reachable officer, founder, or operator in the same industry with a documented public contact path.`;
  }
  if (input.fit === "reject_non_person") {
    return `Reframe from the brand/shell "${input.name}" to named officers, directors, or shareholders of that entity.`;
  }
  return null;
}
