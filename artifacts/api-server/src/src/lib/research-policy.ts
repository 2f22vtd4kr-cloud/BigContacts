/**
 * Apex Atlas research policy primitives.
 *
 * Training-free, deterministic controls for deciding where research effort is
 * likely to add information. The model still owns the trajectory; these
 * functions expose an epistemic budget and make source independence explicit.
 */

export type EvidenceIndependenceInput = {
  sourceHosts: readonly string[];
  sourceClasses?: readonly string[];
  repeatedFamilyCount?: number;
};

export type ResearchFrontier = {
  saturation: number;
  sourceIndependence: number;
  contradictionPressure: number;
  unresolvedPressure: number;
  nextMovePriority: "explore" | "verify" | "falsify" | "contact";
  reasons: string[];
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function scoreSourceIndependence(input: EvidenceIndependenceInput): number {
  const hosts = new Set(input.sourceHosts.map((value) => value.trim().toLowerCase()).filter(Boolean));
  const classes = new Set((input.sourceClasses ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean));
  const repeated = Math.max(0, input.repeatedFamilyCount ?? 0);
  if (hosts.size === 0) return 0;
  const hostSignal = 1 - Math.exp(-hosts.size / 3);
  const classSignal = classes.size ? 1 - Math.exp(-classes.size / 2) : 0;
  const repetitionPenalty = Math.min(0.45, repeated * 0.08);
  return clamp(hostSignal * 0.65 + classSignal * 0.35 - repetitionPenalty);
}

export function assessResearchFrontier(input: {
  sourceFamilyDiversity: number;
  repeatedSourceFamilies: number;
  evidenceCount: number;
  unresolvedQuestions: number;
  contradictions: number;
  contactCount: number;
}): ResearchFrontier {
  const saturation = clamp(
    input.repeatedSourceFamilies / Math.max(1, input.sourceFamilyDiversity + input.repeatedSourceFamilies),
  );
  const sourceIndependence = clamp(
    Math.min(1, input.sourceFamilyDiversity / 4) * 0.7 +
    Math.min(1, input.evidenceCount / 10) * 0.3,
  );
  const contradictionPressure = clamp(input.contradictions / 3);
  const unresolvedPressure = clamp(input.unresolvedQuestions / 5);

  let nextMovePriority: ResearchFrontier["nextMovePriority"] = "explore";
  if (contradictionPressure >= 0.45) nextMovePriority = "falsify";
  else if (unresolvedPressure >= 0.45) nextMovePriority = "verify";
  else if (input.contactCount === 0 && input.evidenceCount >= 3) nextMovePriority = "contact";
  else if (saturation >= 0.55) nextMovePriority = "explore";

  const reasons: string[] = [];
  if (contradictionPressure >= 0.45) reasons.push("Contradictions are the highest-value unresolved discriminator.");
  if (unresolvedPressure >= 0.45) reasons.push("Open questions remain; prefer an action that closes a specific gap.");
  if (saturation >= 0.55) reasons.push("Repeated source families indicate diminishing returns; seek a different source family.");
  if (input.contactCount === 0 && input.evidenceCount >= 3) reasons.push("Identity/context evidence exists but no attributable contact route is retained.");
  if (!reasons.length) reasons.push("Evidence is still sparse; explore for independent anchors before narrowing.");
  return { saturation, sourceIndependence, contradictionPressure, unresolvedPressure, nextMovePriority, reasons };
}

export function scoreResearchAction(input: {
  expectedInformationGain: number;
  identityDiscrimination?: number;
  successProbability?: number;
  sourceIndependence?: number;
  contradictionValue?: number;
  contactRelevance?: number;
  cost?: number;
}): number {
  const information = clamp(input.expectedInformationGain);
  const identity = clamp(input.identityDiscrimination ?? information);
  const success = clamp(input.successProbability ?? 0.6);
  const independence = clamp(input.sourceIndependence ?? 0.5);
  const contradiction = clamp(input.contradictionValue ?? 0);
  const contact = clamp(input.contactRelevance ?? 0.5);
  const cost = clamp(input.cost ?? 0.3);
  const gross =
    information * 0.25 +
    identity * 0.15 +
    success * 0.15 +
    independence * 0.20 +
    contradiction * 0.15 +
    contact * 0.10;
  return clamp(gross * (1 - cost * 0.40));
}
