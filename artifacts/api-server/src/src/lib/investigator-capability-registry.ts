/**
 * Runtime Investigator capability registry.
 *
 * Each configured Investigator credential is a separately selectable capability.
 * The registry is the deterministic availability boundary; it is not research
 * strategy. Boss chooses among these capabilities. The selected capability
 * owns exactly one credential; the Investigator model routing remains inside
 * that capability adapter.
 */
import { digestDiagnosticText } from "./provider-error-diagnostics";

export const GROQ_INVESTIGATOR_KEY_NAMES = [
  "GROQ_INVESTIGATOR_API_KEY",
  ...Array.from({ length: 5 }, (_, i) => `GROQ_INVESTIGATOR_API_KEY_${i + 1}`),
] as const;

export type GroqInvestigatorCapability = `groq-investigator-${number}` | "groq-investigator-20b";
export type InvestigatorCapability = GroqInvestigatorCapability;
export const GROQ_INVESTIGATOR_20B_CAPABILITY: GroqInvestigatorCapability = "groq-investigator-20b";

export const INVESTIGATOR_CAPABILITIES: GroqInvestigatorCapability[] = [
  ...GROQ_INVESTIGATOR_KEY_NAMES.map(
    (_keyName, index) => `groq-investigator-${index + 1}` as GroqInvestigatorCapability,
  ),
  GROQ_INVESTIGATOR_20B_CAPABILITY,
];

function keyIndex(capability: InvestigatorCapability): number | null {
  if (capability === GROQ_INVESTIGATOR_20B_CAPABILITY) return 1;
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
  if (capability === GROQ_INVESTIGATOR_20B_CAPABILITY) return "Groq Investigator GPT-OSS 20B model fallback";
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

/**
 * Expand a set of failed capability slots to every configured slot sharing
 * those credentials. Boss must see aliases as excluded too, or it may choose
 * an apparently different slot that cannot escape the exhausted quota pool.
 */
export function getInvestigatorCredentialAliases(
  env: NodeJS.ProcessEnv = process.env,
  capabilities: readonly InvestigatorCapability[] = [],
): InvestigatorCapability[] {
  const fingerprints = new Set(
    capabilities
      .map((capability) => {
        const keyName = investigatorCapabilityKeyName(capability);
        const credential = keyName ? env[keyName]?.trim() : undefined;
        return credential ? digestDiagnosticText(credential) : null;
      })
      .filter((value): value is string => value !== null),
  );
  if (!fingerprints.size) return [];
  // A model-specific TPD fallback shares a credential but not the exhausted
  // model's per-model token budget. Keep it out of credential-alias exclusion;
  // the explicit token-capacity recovery path decides when it is eligible.
  return INVESTIGATOR_CAPABILITIES.filter((capability) => {
    if (capability === GROQ_INVESTIGATOR_20B_CAPABILITY) return false;
    const keyName = investigatorCapabilityKeyName(capability);
    const credential = keyName ? env[keyName]?.trim() : undefined;
    return Boolean(credential && fingerprints.has(digestDiagnosticText(credential)));
  });
}


/**
 * Return quota-independent, configured capabilities for explicit recovery.
 * Two slot names holding the same API key are one provider quota pool and may
 * not be treated as independent alternates after that credential is exhausted.
 */
export function getAvailableDistinctInvestigatorCapabilities(
  env: NodeJS.ProcessEnv = process.env,
  excludedCapabilities: readonly InvestigatorCapability[] = [],
): InvestigatorCapability[] {
  const fingerprintFor = (capability: InvestigatorCapability): string | null => {
    const keyName = investigatorCapabilityKeyName(capability);
    const credential = keyName ? env[keyName]?.trim() : undefined;
    return credential ? digestDiagnosticText(credential) : null;
  };
  const excludedCredentials = new Set(
    excludedCapabilities.map(fingerprintFor).filter((value): value is string => value !== null),
  );
  const seenCredentials = new Set(excludedCredentials);
  const available: InvestigatorCapability[] = [];
  for (const capability of INVESTIGATOR_CAPABILITIES) {
    const fingerprint = fingerprintFor(capability);
    if (!fingerprint || seenCredentials.has(fingerprint)) continue;
    seenCredentials.add(fingerprint);
    available.push(capability);
  }
  return available;
}
