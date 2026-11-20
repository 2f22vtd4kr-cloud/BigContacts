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
  ...Array.from({ length: 7 }, (_, i) => `GROQ_INVESTIGATOR_API_KEY_${i + 1}`),
] as const;

export type GroqInvestigatorCapability = `groq-investigator-${number}` | "groq-investigator-20b";
export type InvestigatorCapability = GroqInvestigatorCapability;
export const GROQ_INVESTIGATOR_20B_CAPABILITY: GroqInvestigatorCapability = "groq-investigator-20b";

export const INVESTIGATOR_CAPABILITIES: GroqInvestigatorCapability[] = [
  // GPT-OSS 20B is available by default when the shared Investigator credential is configured.
  GROQ_INVESTIGATOR_20B_CAPABILITY,
  ...GROQ_INVESTIGATOR_KEY_NAMES.map(
    (_keyName, index) => `groq-investigator-${index + 1}` as GroqInvestigatorCapability,
  ),
];

export type InvestigatorCapabilityRuntimeHealth = {
  capability: InvestigatorCapability;
  status: "unobserved" | "healthy" | "degraded";
  successfulActions: number;
  failedActions: number;
  parseFailures: number;
  providerFailures: number;
  consecutiveFailures: number;
  lastFailureClass: string | null;
  lastFailureAt: string | null;
  lastSuccessAt: string | null;
};

type MutableInvestigatorCapabilityRuntimeHealth = Omit<InvestigatorCapabilityRuntimeHealth, "capability" | "status">;
const investigatorRuntimeHealth = new Map<InvestigatorCapability, MutableInvestigatorCapabilityRuntimeHealth>();

function investigatorRuntimeHealthStatus(current: MutableInvestigatorCapabilityRuntimeHealth): InvestigatorCapabilityRuntimeHealth["status"] {
  const totalActions = current.successfulActions + current.failedActions;
  if (totalActions === 0) return "unobserved";
  const failureRateIsMaterial = current.consecutiveFailures > 0 && current.failedActions >= 2 && current.failedActions * 2 >= totalActions;
  return current.consecutiveFailures >= 2 || failureRateIsMaterial ? "degraded" : "healthy";
}

function emptyInvestigatorRuntimeHealth(): MutableInvestigatorCapabilityRuntimeHealth {
  return {
    successfulActions: 0,
    failedActions: 0,
    parseFailures: 0,
    providerFailures: 0,
    consecutiveFailures: 0,
    lastFailureClass: null,
    lastFailureAt: null,
    lastSuccessAt: null,
  };
}

/** Record model-contract/provider outcomes without silently changing Boss's lane selection. */
export function recordInvestigatorCapabilityRuntimeOutcome(
  capability: InvestigatorCapability,
  outcome: { success: true } | { success: false; failureClass: string },
): InvestigatorCapabilityRuntimeHealth {
  const current = investigatorRuntimeHealth.get(capability) ?? emptyInvestigatorRuntimeHealth();
  if (outcome.success) {
    current.successfulActions += 1;
    current.consecutiveFailures = 0;
    current.lastSuccessAt = new Date().toISOString();
  } else {
    current.failedActions += 1;
    current.consecutiveFailures += 1;
    current.lastFailureClass = outcome.failureClass;
    current.lastFailureAt = new Date().toISOString();
    if (outcome.failureClass.includes("parse") || outcome.failureClass.includes("contract")) current.parseFailures += 1;
    else current.providerFailures += 1;
  }
  investigatorRuntimeHealth.set(capability, current);
  return { capability, status: investigatorRuntimeHealthStatus(current), ...current };
}

/** Runtime health is advisory telemetry for Boss/Right-hand, never an automatic lane rotation. */
export function getInvestigatorCapabilityRuntimeHealthSnapshot(
  env: NodeJS.ProcessEnv = process.env,
): InvestigatorCapabilityRuntimeHealth[] {
  return getAvailableInvestigatorCapabilities(env).map((capability) => {
    const current = investigatorRuntimeHealth.get(capability) ?? emptyInvestigatorRuntimeHealth();
    return {
      capability,
      status: investigatorRuntimeHealthStatus(current),
      ...current,
    };
  });
}


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
  if (capability === GROQ_INVESTIGATOR_20B_CAPABILITY) return "Groq Investigator GPT-OSS 20B (economical routine action model)";
  const keyName = investigatorCapabilityKeyName(capability);
  return keyName ? `Groq Investigator ${keyIndex(capability)} (${keyName})` : capability;
}

function isTwentyBInvestigatorEnabled(env: NodeJS.ProcessEnv): boolean {
  // Boss should have the economical routine Investigator lane by default.
  // Operators can explicitly disable it with APEX_ENABLE_GROQ_INVESTIGATOR_20B=false.
  return env.APEX_ENABLE_GROQ_INVESTIGATOR_20B?.trim().toLowerCase() !== "false";
}

export function getAvailableInvestigatorCapabilities(
  env: NodeJS.ProcessEnv = process.env,
): InvestigatorCapability[] {
  return INVESTIGATOR_CAPABILITIES.filter((capability) => {
    if (capability === GROQ_INVESTIGATOR_20B_CAPABILITY && !isTwentyBInvestigatorEnabled(env)) return false;
    const keyName = investigatorCapabilityKeyName(capability);
    return Boolean(keyName && env[keyName]?.trim());
  });
}

/**
 * Expand failed capability slots to configured aliases sharing both the
 * credential and model lane. Boss must not treat a same-key slot on another
 * model lane as exhausted; 20B and 120B quotas/contracts remain distinct.
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
        if (!credential) return null;
        const modelLane = capability === GROQ_INVESTIGATOR_20B_CAPABILITY ? "20b" : "120b";
        return modelLane + ":" + digestDiagnosticText(credential);
      })
      .filter((value): value is string => value !== null),
  );
  if (!fingerprints.size) return [];
  // A shared credential does not make 20B and 120B the same quota or
  // compatibility lane. Expand aliases only within the failed model lane.
  return INVESTIGATOR_CAPABILITIES.filter((capability) => {
    const keyName = investigatorCapabilityKeyName(capability);
    const credential = keyName ? env[keyName]?.trim() : undefined;
    if (!credential) return false;
    const modelLane = capability === GROQ_INVESTIGATOR_20B_CAPABILITY ? "20b" : "120b";
    return fingerprints.has(modelLane + ":" + digestDiagnosticText(credential));
  });
}


/**
 * Return quota-independent, configured capabilities for explicit recovery.
 * Two slot names holding the same API key are one provider quota pool and may
 * not be treated as independent alternates after that credential is exhausted.
 */

/**
 * Model-scoped quota recovery is a narrow exception to credential deduplication:
 * the explicit 20B capability shares the configured credential but calls a
 * different model, so it can recover a 120B-only token cap. The ordinary
 * registry continues to collapse same-credential slots.
 */
export function getModelScopedInvestigatorQuotaFallback(
  env: NodeJS.ProcessEnv,
  failedCapability: InvestigatorCapability,
  unavailableCapabilities: readonly InvestigatorCapability[] = [],
): InvestigatorCapability | null {
  const configured = new Set(getAvailableInvestigatorCapabilities(env));
  const unavailable = new Set(unavailableCapabilities);
  if (
    failedCapability !== GROQ_INVESTIGATOR_20B_CAPABILITY
    && configured.has(GROQ_INVESTIGATOR_20B_CAPABILITY)
    && !unavailable.has(GROQ_INVESTIGATOR_20B_CAPABILITY)
  ) return GROQ_INVESTIGATOR_20B_CAPABILITY;
  const defaultCapability: InvestigatorCapability = "groq-investigator-1";
  if (
    failedCapability === GROQ_INVESTIGATOR_20B_CAPABILITY
    && configured.has(defaultCapability)
    && !unavailable.has(defaultCapability)
  ) return defaultCapability;
  return null;
}

export function getAvailableDistinctInvestigatorCapabilities(
  env: NodeJS.ProcessEnv = process.env,
  excludedCapabilities: readonly InvestigatorCapability[] = [],
): InvestigatorCapability[] {
  const fingerprintFor = (capability: InvestigatorCapability): string | null => {
    const keyName = investigatorCapabilityKeyName(capability);
    const credential = keyName ? env[keyName]?.trim() : undefined;
    if (!credential) return null;
    // Standard 120B capability slots sharing one key are aliases. The 20B
    // capability deliberately reuses the first key but calls a different
    // model with a separately observed/model-scoped quota, so it must remain
    // selectable and must not be excluded when only a 120B slot is exhausted.
    const modelLane = capability === GROQ_INVESTIGATOR_20B_CAPABILITY ? "20b" : "120b";
    return modelLane + ":" + digestDiagnosticText(credential);
  };
  const excludedCredentials = new Set(
    excludedCapabilities.map(fingerprintFor).filter((value): value is string => value !== null),
  );
  const seenCredentials = new Set(excludedCredentials);
  const available: InvestigatorCapability[] = [];
  for (const capability of getAvailableInvestigatorCapabilities(env)) {
    const fingerprint = fingerprintFor(capability);
    if (!fingerprint || seenCredentials.has(fingerprint)) continue;
    seenCredentials.add(fingerprint);
    available.push(capability);
  }
  return available;
}
