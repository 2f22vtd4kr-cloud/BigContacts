/**
 * Python OSINT sandbox contract.
 *
 * This module deliberately contains no sandbox implementation. It defines the
 * minimum attestation a future executor must provide before network-capable
 * Python tools may run. Environment variables are not accepted as proof of
 * isolation because a compromised child process can inherit and rewrite them.
 */

export type PythonSandboxCapability = "network_osint" | "local_analysis";
export type PythonSandboxState = "unavailable" | "attested";

export interface PythonSandboxAttestation {
  state: "attested";
  executorId: string;
  networkNamespace: string;
  egressBroker: string;
  filesystemMode: "ephemeral-readonly-input" | "ephemeral-isolated";
  maxOutputBytes: number;
  maxRuntimeMs: number;
  allowedCapabilities: readonly PythonSandboxCapability[];
  expiresAt: string;
}

export interface PythonSandboxRequest {
  capability: PythonSandboxCapability;
  signal?: AbortSignal;
  timeoutMs: number;
  maxOutputBytes: number;
  destinationPolicy: "none" | "approved-public-web-only";
}

const UNAVAILABLE_REASON =
  "No trusted Apex Python sandbox attestation is installed; network-capable Python remains fail-closed.";

export function getPythonSandboxState(): {
  state: PythonSandboxState;
  reason: string | null;
  attestation: PythonSandboxAttestation | null;
} {
  // Deliberately no env-var opt-in. The eventual deployment executor must
  // supply a trusted attestation through an explicit process boundary.
  return { state: "unavailable", reason: UNAVAILABLE_REASON, attestation: null };
}

export function authorizePythonSandboxRequest(request: PythonSandboxRequest): {
  allowed: boolean;
  reason: string | null;
  attestation: PythonSandboxAttestation | null;
} {
  const state = getPythonSandboxState();
  if (request.signal?.aborted) return { allowed: false, reason: "cancelled", attestation: null };
  if (state.state !== "attested" || !state.attestation) return { allowed: false, reason: state.reason, attestation: null };
  if (!state.attestation.allowedCapabilities.includes(request.capability)) return { allowed: false, reason: `Python capability ${request.capability} is not authorized by the sandbox attestation.`, attestation: state.attestation };
  if (request.timeoutMs <= 0 || request.timeoutMs > state.attestation.maxRuntimeMs) return { allowed: false, reason: "Python runtime exceeds the attested execution budget.", attestation: state.attestation };
  if (request.maxOutputBytes <= 0 || request.maxOutputBytes > state.attestation.maxOutputBytes) return { allowed: false, reason: "Python output exceeds the attested output budget.", attestation: state.attestation };
  if (request.destinationPolicy === "approved-public-web-only" && !state.attestation.networkNamespace) return { allowed: false, reason: "Python network namespace is not attested.", attestation: state.attestation };
  return { allowed: true, reason: null, attestation: state.attestation };
}

export { UNAVAILABLE_REASON as PYTHON_SANDBOX_UNAVAILABLE_REASON };
