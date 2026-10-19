/**
 * Apex Python network-tool authorization contract.
 *
 * The API process deliberately has no local subprocess sandbox. Network-capable
 * tools may execute only through the separately deployed, signed Apex OSINT worker.
 * The worker must be deployed behind the required egress NetworkPolicies/proxy;
 * a local environment flag or an installed package is not an attestation.
 */

export type PythonSandboxCapability = "network_osint" | "local_analysis";
export type PythonSandboxState = "unavailable" | "attested";
export type PythonOsintTool =
  | "holehe"
  | "maigret"
  | "sherlock"
  | "theharvester"
  | "spiderfoot";

export interface PythonSandboxAttestation {
  state: "attested";
  executorId: string;
  /** Must identify the enforced NetworkPolicy profile, not an arbitrary label. */
  networkNamespace: string;
  /** Must identify the public-only egress proxy protected by separate network policy. */
  egressBroker: string;
  filesystemMode: "ephemeral-readonly-input" | "ephemeral-isolated";
  maxOutputBytes: number;
  maxRuntimeMs: number;
  allowedCapabilities: readonly PythonSandboxCapability[];
  availableTools: readonly PythonOsintTool[];
  toolVersions: Partial<Record<PythonOsintTool, string>>;
  expiresAt: string;
  issuedAt?: string;
  workerImageDigest?: string;
  egressProxyImageDigest?: string;
  isolationProofIssuedAt?: string;
  isolationProofExpiresAt?: string;
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
  // No local assertion or environment variable may convert this process into
  // an attested sandbox. A remote worker attestation is passed explicitly to
  // authorizePythonSandboxRequest only after its signature is verified.
  return { state: "unavailable", reason: UNAVAILABLE_REASON, attestation: null };
}

export function authorizePythonSandboxRequest(
  request: PythonSandboxRequest,
  verifiedRemoteAttestation?: PythonSandboxAttestation,
): {
  allowed: boolean;
  reason: string | null;
  attestation: PythonSandboxAttestation | null;
} {
  if (request.signal?.aborted) return { allowed: false, reason: "cancelled", attestation: null };
  const attestation = verifiedRemoteAttestation ?? getPythonSandboxState().attestation;
  if (!attestation || attestation.state !== "attested") {
    return { allowed: false, reason: UNAVAILABLE_REASON, attestation: null };
  }
  if (!attestation.allowedCapabilities.includes(request.capability)) {
    return { allowed: false, reason: `Python capability ${request.capability} is not authorized by the sandbox attestation.`, attestation };
  }
  if (!Number.isFinite(request.timeoutMs) || request.timeoutMs <= 0 || request.timeoutMs > attestation.maxRuntimeMs) {
    return { allowed: false, reason: "Python runtime exceeds the attested execution budget.", attestation };
  }
  if (!Number.isFinite(request.maxOutputBytes) || request.maxOutputBytes <= 0 || request.maxOutputBytes > attestation.maxOutputBytes) {
    return { allowed: false, reason: "Python output exceeds the attested output budget.", attestation };
  }
  if (request.destinationPolicy === "approved-public-web-only"
    && (!attestation.networkNamespace.trim() || !attestation.egressBroker.trim())) {
    return { allowed: false, reason: "Python network namespace or egress broker is not attested.", attestation };
  }
  return { allowed: true, reason: null, attestation };
}

export { UNAVAILABLE_REASON as PYTHON_SANDBOX_UNAVAILABLE_REASON };
