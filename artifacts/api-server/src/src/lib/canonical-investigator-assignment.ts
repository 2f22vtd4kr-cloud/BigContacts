import type { InvestigatorCapability } from "./investigator-capability-registry";

export type ReconciledInvestigatorAssignment = {
  caseFile: string;
  previousInvestigator: InvestigatorCapability | null;
  changed: boolean;
};

/**
 * Reconcile the Boss-selected opening capability into the canonical case file.
 * A change is permitted only when preflight explicitly excluded the prior
 * durable capability; the selected replacement must still be runtime-available
 * and must not itself be excluded.
 */
export function reconcilePreflightInvestigatorAssignment(input: {
  caseFile: string | null;
  selectedInvestigator: InvestigatorCapability;
  availableInvestigators: readonly InvestigatorCapability[];
  excludedInvestigators: readonly InvestigatorCapability[];
}): ReconciledInvestigatorAssignment {
  if (!input.availableInvestigators.includes(input.selectedInvestigator)) {
    throw new Error("Boss-selected Investigator capability is no longer runtime-available.");
  }
  if (input.excludedInvestigators.includes(input.selectedInvestigator)) {
    throw new Error("Boss selected an Investigator capability explicitly excluded by preflight.");
  }

  let durable: Record<string, unknown> = {};
  if (input.caseFile?.trim()) {
    const parsed: unknown = JSON.parse(input.caseFile);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Canonical discovery case has unreadable durable Investigator assignment state.");
    }
    durable = parsed as Record<string, unknown>;
  }

  const previousRaw = durable.investigatorLlm;
  const previousInvestigator = typeof previousRaw === "string"
    ? previousRaw as InvestigatorCapability
    : null;
  const changed = previousInvestigator !== input.selectedInvestigator;

  if (previousInvestigator && changed && !input.excludedInvestigators.includes(previousInvestigator)) {
    throw new Error("Refusing to rotate a durable Investigator capability that preflight did not exclude.");
  }

  const history = Array.isArray(durable.investigatorCapabilityHistory)
    ? durable.investigatorCapabilityHistory
    : [];
  const next: Record<string, unknown> = {
    ...durable,
    investigatorLlm: input.selectedInvestigator,
    ...(previousInvestigator && changed
      ? {
          investigatorCapabilityHistory: [
            ...history,
            {
              from: previousInvestigator,
              to: input.selectedInvestigator,
              trigger: "preflight_excluded",
            },
          ].slice(-15),
        }
      : {}),
  };

  return {
    caseFile: JSON.stringify(next),
    previousInvestigator,
    changed,
  };
}
