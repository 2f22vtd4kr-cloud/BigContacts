/**
 * Runtime Investigator capability registry.
 *
 * The registry is the deterministic availability boundary; it is not a research
 * strategy. Boss chooses among capabilities exposed here. A capability adapter
 * owns its own provider/model contract and the Investigator owns the trajectory
 * after assignment.
 */
export const INVESTIGATOR_CAPABILITIES = ["groq"] as const;
export type InvestigatorCapability = (typeof INVESTIGATOR_CAPABILITIES)[number];

function keyNames(capability: InvestigatorCapability): string[] {
  if (capability === "groq") return ["GROQ_INVESTIGATOR_API_KEY", ...Array.from({ length: 5 }, (_, i) => `GROQ_INVESTIGATOR_API_KEY_${i + 1}`)];
  return [];
}

export function getAvailableInvestigatorCapabilities(env: NodeJS.ProcessEnv = process.env): InvestigatorCapability[] {
  return INVESTIGATOR_CAPABILITIES.filter((capability) => keyNames(capability).some((name) => Boolean(env[name]?.trim())));
}

export function investigatorCapabilityLabel(capability: InvestigatorCapability): string {
  return capability;
}
