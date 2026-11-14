export type IdentityGateDecision = "accepted" | "review" | "rejected";

export interface IdentityGateResult {
  decision: IdentityGateDecision;
  reason: string;
}

/**
 * Graph identity is a semantic model decision followed by deterministic
 * corroboration checks. Numeric similarity and name shape are not identity
 * verdicts. Unresolved assessments remain reviewable and never auto-merge.
 */
export function evaluateIdentityGate(input: {
  score: number;
  signals: string[];
  leftSources: string[];
  rightSources: string[];
  leftName?: string | null;
  rightName?: string | null;
  semanticAssessment?: "same_person" | "different_people" | "unresolved" | null;
  semanticRationale?: string | null;
}): IdentityGateResult {
  if (input.semanticAssessment === "different_people") {
    return { decision: "rejected", reason: input.semanticRationale?.trim() || "Investigator assessed the records as different people." };
  }
  if (input.semanticAssessment !== "same_person" || !input.semanticRationale?.trim()) {
    return { decision: "review", reason: "Identity remains unresolved; name similarity and numeric scores cannot establish that two records are the same person." };
  }

  const signals = new Set(input.signals);
  const rightSources = new Set(input.rightSources.map((source) => source.toLowerCase()));
  const sourceOverlap = input.leftSources.filter((source) => rightSources.has(source.toLowerCase()));
  const crossSource = input.leftSources.length > 0
    && input.rightSources.length > 0
    && sourceOverlap.length < Math.min(input.leftSources.length, input.rightSources.length);
  if (!crossSource) {
    return { decision: "review", reason: "Investigator assessed a same-person link, but independent source corroboration is not yet present." };
  }

  const hasStableIdentifier = signals.has("shared_registry_identifier") || signals.has("shared_asset_identifier");
  const hasAttributableProfile = signals.has("shared_public_profile") && signals.has("shared_affiliation");
  if (hasStableIdentifier || hasAttributableProfile) {
    return { decision: "accepted", reason: input.semanticRationale.trim() };
  }
  return { decision: "review", reason: "The model's same-person assessment lacks an independent stable identifier or corroborated attributable profile." };
}
