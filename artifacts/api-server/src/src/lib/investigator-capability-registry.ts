/**
 * Runtime Investigator capability registry.
 *
 * Each configured Investigator credential is a separately selectable capability.
 * The registry is the deterministic availability boundary; it is not research
 * strategy. Boss chooses among these capabilities. The selected capability
 * owns exactly one credential; the Investigator model routing remains inside
 * that capability adapter.
 */
export const GROQ_INVESTIGATOR_KEY_NAMES = [
  "GROQ_INVESTIGATOR_API_KEY",
  ...Array.from({ length: 5 }, (_, i) => `GROQ_INVESTIGATOR_API_KEY_${i + 1}`),
] as const;

export type GroqInvestigatorCapability = `groq-investigator-${number}`;
export type InvestigatorCapability = GroqInvestigatorCapability;

export const INVESTIGATOR_CAPABILITIES = GROQ_INVESTIGATOR_KEY_NAMES.map(
  (_keyName, index) => `groq-investigator-${index + 1}` as GroqInvestigatorCapability,
);

function keyIndex(capability: InvestigatorCapability): number | null {
  const match = capability.match(/^groq-investigator-(\d+)$/);
  if (!match) return null;
  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 1 && index <= GROQ_INVESTIGATOR_KEY_NAMES.length ? index : null;
}

export function investigatorCapabilityKeyName(capability: InvestigatorCapability): string | null {
  const index = keyIndex(capability);
  return index == null ? null : GROQ_INVESTIGATOR_KEY_NAMES[index - 1] ?? null;
}

export function investigatorCapabilityLabel(capability: InvestigatorCapability): string {
  const keyName = investigatorCapabilityKeyName(capability);
  return keyName ? `Groq Investigator ${keyIndex(capability)} (${keyName})` : capability;
}

export function getAvailableInvestigatorCapabilities(
  env: NodeJS.ProcessEnv = process.env,
): InvestigatorCapability[] {
  return INVESTIGATOR_CAPABILITIES.filter((capability) => {
    const keyName = investigatorCapabilityKeyName(capability);
    return Boolean(keyName && env[keyName]?.trim());
  });
}
