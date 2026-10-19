import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  authorizePythonSandboxRequest,
  type PythonSandboxAttestation,
  type PythonSandboxCapability,
} from "./python-sandbox-contract";

export const PYTHON_OSINT_TOOLS = [
  "holehe",
  "maigret",
  "sherlock",
  "theharvester",
  "spiderfoot",
] as const;
export type PythonOsintTool = typeof PYTHON_OSINT_TOOLS[number];
export type PythonOsintToolStatus = "completed" | "partial" | "failed" | "unavailable" | "timeout" | "cancelled";
export type PythonOsintToolCorrelation = { jobId?: string | null; caseId?: number; investigatorTurn?: number };
type WorkerCancellationStatus = "cancelled" | "cancel_reserved" | "not_running" | "cancellation_timeout";
export type PythonOsintToolResponse = {
  requestId: string;
  tool: PythonOsintTool;
  status: PythonOsintToolStatus;
  toolVersion: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  executorId?: string | null;
  workerImageDigest?: string | null;
  egressProxyImageDigest?: string | null;
  isolationProofIssuedAt?: string | null;
  isolationProofExpiresAt?: string | null;
  correlation?: Record<string, unknown> | null;
  remoteCancellationConfirmed?: boolean | null;
};

type SignedEnvelope<T> = { payload: T; signature: string };
type PythonOsintWorkerAttestation = PythonSandboxAttestation & {
  availableTools: PythonOsintTool[];
  toolVersions: Partial<Record<PythonOsintTool, string>>;
  issuedAt: string;
  workerImageDigest: string;
  egressProxyImageDigest: string;
  isolationProofIssuedAt: string;
  isolationProofExpiresAt: string;
};

const REQUIRED_NETWORK_NAMESPACE = "kubernetes-egress-policy-apex-osint-v2";
const REQUIRED_EGRESS_BROKER = "apex-public-egress-proxy-v1";
const MAX_ATTESTATION_LIFETIME_MS = 15 * 60_000;
const MAX_ATTESTATION_RESPONSE_BYTES = 32_000;
const MAX_TOOL_RESPONSE_ENVELOPE_BYTES = 1_100_000;
const ATTESTATION_CACHE_MS = 15_000;

let cachedAttestation: { value: PythonOsintWorkerAttestation; verifiedAt: number } | null = null;
let cachedAvailableTools = new Set<PythonOsintTool>();

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + stableJson(record[key])).join(",") + "}";
}

function getWorkerConfig(): { baseUrl: URL; secret: string; expectedWorkerImageDigest: string; expectedProxyImageDigest: string } | null {
  const rawUrl = process.env.APEX_PYTHON_SANDBOX_URL?.trim();
  const secret = process.env.APEX_PYTHON_SANDBOX_TOKEN?.trim();
  const expectedWorkerImageDigest = process.env.APEX_PYTHON_OSINT_EXPECTED_WORKER_IMAGE_DIGEST?.trim() ?? "";
  const expectedProxyImageDigest = process.env.APEX_PYTHON_OSINT_EXPECTED_PROXY_IMAGE_DIGEST?.trim() ?? "";
  const digestPattern = /^sha256:[0-9a-f]{64}$/;
  // Image pins are operator-controlled trust anchors, not a feature-enable switch.
  // Without exact immutable image identities, the worker remains unavailable.
  if (!rawUrl || !secret || !digestPattern.test(expectedWorkerImageDigest) || !digestPattern.test(expectedProxyImageDigest)) return null;
  try {
    const baseUrl = new URL(rawUrl);
    if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) return null;
    if (baseUrl.pathname !== "/" && baseUrl.pathname !== "") return null;
    const internalServiceHost = baseUrl.hostname === "localhost"
      || baseUrl.hostname === "127.0.0.1"
      || baseUrl.hostname === "::1"
      || baseUrl.hostname.endsWith(".svc")
      || baseUrl.hostname.endsWith(".svc.cluster.local");
    if (baseUrl.protocol !== "https:" && !(baseUrl.protocol === "http:" && internalServiceHost)) return null;
    return { baseUrl, secret, expectedWorkerImageDigest, expectedProxyImageDigest };
  } catch {
    return null;
  }
}

function sign(secret: string, value: unknown): string {
  return createHmac("sha256", secret).update(stableJson(value)).digest("hex");
}

function signatureMatches(secret: string, value: unknown, signature: unknown): boolean {
  if (typeof signature !== "string" || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(sign(secret, value), "hex");
  const supplied = Buffer.from(signature, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

async function readJsonCapped(response: Response, maxBytes: number): Promise<unknown> {
  const contentLength = Number(response.headers.get("content-length") ?? "");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new Error("Sandbox worker response exceeded its size limit.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Sandbox worker response did not contain a readable body.");
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      totalBytes += next.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("Sandbox worker response exceeded its size limit.");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("Sandbox worker returned a non-JSON response.");
  }
}

async function fetchWorkerJson(
  url: URL,
  config: { baseUrl: URL; secret: string },
  options: { method?: "GET" | "POST"; body?: unknown; timeoutMs: number; maxBytes: number; signal?: AbortSignal },
): Promise<unknown> {
  if (options.signal?.aborted) throw new Error("cancelled");
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const body = options.body === undefined ? undefined : stableJson(options.body);
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: "Bearer " + config.secret,
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      headers["X-Apex-Request-Signature"] = sign(config.secret, options.body);
    }
    let response: Response;
    try {
      response = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        ...(body === undefined ? {} : { body }),
        signal: controller.signal,
        redirect: "error",
        cache: "no-store",
      });
    } catch {
      if (options.signal?.aborted) throw new Error("cancelled");
      if (controller.signal.aborted) throw new Error("Sandbox worker request timed out.");
      throw new Error("Sandbox worker is unreachable.");
    }
    const parsed = await readJsonCapped(response, options.maxBytes);
    if (!response.ok) throw new Error("Sandbox worker rejected the request (HTTP " + response.status + ").");
    return parsed;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

function isPythonTool(value: unknown): value is PythonOsintTool {
  return typeof value === "string" && (PYTHON_OSINT_TOOLS as readonly string[]).includes(value);
}

function validateAttestation(value: unknown): value is PythonOsintWorkerAttestation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (item.state !== "attested") return false;
  if (typeof item.executorId !== "string" || !item.executorId.trim() || item.executorId.length > 160) return false;
  if (item.networkNamespace !== REQUIRED_NETWORK_NAMESPACE || item.egressBroker !== REQUIRED_EGRESS_BROKER) return false;
  if (item.filesystemMode !== "ephemeral-readonly-input" && item.filesystemMode !== "ephemeral-isolated") return false;
  if (!Number.isSafeInteger(item.maxOutputBytes) || Number(item.maxOutputBytes) < 1_024 || Number(item.maxOutputBytes) > 2_000_000) return false;
  if (!Number.isSafeInteger(item.maxRuntimeMs) || Number(item.maxRuntimeMs) < 1_000 || Number(item.maxRuntimeMs) > 10 * 60_000) return false;
  if (!Array.isArray(item.allowedCapabilities) || !item.allowedCapabilities.includes("network_osint")) return false;
  if (!Array.isArray(item.availableTools) || item.availableTools.some((tool) => !isPythonTool(tool))) return false;
  if (!item.toolVersions || typeof item.toolVersions !== "object" || Array.isArray(item.toolVersions)) return false;
  for (const tool of item.availableTools as PythonOsintTool[]) {
    if (typeof (item.toolVersions as Record<string, unknown>)[tool] !== "string") return false;
  }
  if (typeof item.expiresAt !== "string" || typeof item.issuedAt !== "string") return false;
  const expiration = Date.parse(item.expiresAt);
  const issuedAt = Date.parse(item.issuedAt);
  const now = Date.now();
  if (!Number.isFinite(expiration) || expiration <= now || expiration - now > MAX_ATTESTATION_LIFETIME_MS) return false;
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60_000 || now - issuedAt > MAX_ATTESTATION_LIFETIME_MS) return false;
  const digestPattern = /^sha256:[0-9a-f]{64}$/;
  if (typeof item.workerImageDigest !== "string" || !digestPattern.test(item.workerImageDigest)) return false;
  if (typeof item.egressProxyImageDigest !== "string" || !digestPattern.test(item.egressProxyImageDigest)) return false;
  if (typeof item.isolationProofIssuedAt !== "string" || typeof item.isolationProofExpiresAt !== "string") return false;
  const proofIssued = Date.parse(item.isolationProofIssuedAt);
  const proofExpires = Date.parse(item.isolationProofExpiresAt);
  if (!Number.isFinite(proofIssued) || !Number.isFinite(proofExpires) || proofIssued > now + 60_000 || proofExpires <= now || proofExpires - proofIssued > 7 * 24 * 60 * 60 * 1000 || now - proofIssued > 7 * 24 * 60 * 60 * 1000) return false;
  return true;
}

function normalizeCorrelation(value?: PythonOsintToolCorrelation): PythonOsintToolCorrelation {
  const result: PythonOsintToolCorrelation = {};
  if (typeof value?.jobId === "string" && /^[A-Za-z0-9._:-]{1,120}$/.test(value.jobId)) result.jobId = value.jobId;
  if (Number.isSafeInteger(value?.caseId) && Number(value?.caseId) > 0) result.caseId = Number(value?.caseId);
  if (Number.isSafeInteger(value?.investigatorTurn) && Number(value?.investigatorTurn) >= 0 && Number(value?.investigatorTurn) <= 10_000) result.investigatorTurn = Number(value?.investigatorTurn);
  return result;
}

async function fetchAttestation(signal?: AbortSignal, forceRefresh = false): Promise<PythonOsintWorkerAttestation | null> {
  const config = getWorkerConfig();
  if (!config) {
    cachedAttestation = null;
    cachedAvailableTools = new Set();
    return null;
  }
  if (!forceRefresh && cachedAttestation) {
    const current = cachedAttestation.value;
    if (Date.now() - cachedAttestation.verifiedAt < ATTESTATION_CACHE_MS && Date.parse(current.expiresAt) > Date.now()) return current;
  }
  try {
    const response = await fetchWorkerJson(new URL("/v1/attestation", config.baseUrl), config, {
      timeoutMs: 3_000,
      maxBytes: MAX_ATTESTATION_RESPONSE_BYTES,
      signal,
    });
    if (!response || typeof response !== "object" || Array.isArray(response)) throw new Error("Invalid worker attestation envelope.");
    const envelope = response as Partial<SignedEnvelope<unknown>>;
    if (!signatureMatches(config.secret, envelope.payload, envelope.signature)) throw new Error("Worker attestation signature was invalid.");
    if (!validateAttestation(envelope.payload)) throw new Error("Worker attestation did not meet the Apex sandbox contract.");
    if (envelope.payload.workerImageDigest !== config.expectedWorkerImageDigest
      || envelope.payload.egressProxyImageDigest !== config.expectedProxyImageDigest) {
      throw new Error("Worker/proxy image identities did not match the API's operator-pinned deployment digests.");
    }
    const authorization = authorizePythonSandboxRequest({
      capability: "network_osint" as PythonSandboxCapability,
      signal,
      timeoutMs: Math.min(30_000, envelope.payload.maxRuntimeMs),
      maxOutputBytes: Math.min(1_000_000, envelope.payload.maxOutputBytes),
      destinationPolicy: "approved-public-web-only",
    }, envelope.payload);
    if (!authorization.allowed) throw new Error(authorization.reason ?? "Worker sandbox was not authorized.");
    cachedAttestation = { value: envelope.payload, verifiedAt: Date.now() };
    cachedAvailableTools = new Set(envelope.payload.availableTools);
    return envelope.payload;
  } catch {
    cachedAttestation = null;
    cachedAvailableTools = new Set();
    return null;
  }
}

export function getAvailablePythonOsintTools(): PythonOsintTool[] {
  const now = Date.now();
  if (
    cachedAttestation
    && now - cachedAttestation.verifiedAt < ATTESTATION_CACHE_MS
    && Date.parse(cachedAttestation.value.expiresAt) > now
  ) return [...cachedAvailableTools];
  return [];
}

export function isPythonOsintToolAvailable(tool: PythonOsintTool): boolean {
  return getAvailablePythonOsintTools().includes(tool);
}

export function pythonToolForAction(action: string): PythonOsintTool | null {
  switch (action) {
    case "footprint_email": return "holehe";
    case "footprint_username_maigret": return "maigret";
    case "footprint_username_sherlock": return "sherlock";
    case "harvest_domain": return "theharvester";
    case "footprint_spiderfoot": return "spiderfoot";
    default: return null;
  }
}

export function getAvailablePythonOsintActions(): string[] {
  const actions = new Map<PythonOsintTool, string>([
    ["holehe", "footprint_email"],
    ["maigret", "footprint_username_maigret"],
    ["sherlock", "footprint_username_sherlock"],
    ["theharvester", "harvest_domain"],
    ["spiderfoot", "footprint_spiderfoot"],
  ]);
  return getAvailablePythonOsintTools().flatMap((tool) => {
    const action = actions.get(tool);
    return action ? [action] : [];
  });
}

export async function refreshPythonOsintToolAvailability(signal?: AbortSignal): Promise<Record<PythonOsintTool, boolean>> {
  const attestation = await fetchAttestation(signal, true);
  return Object.fromEntries(PYTHON_OSINT_TOOLS.map((tool) => [tool, Boolean(attestation?.availableTools.includes(tool))])) as Record<PythonOsintTool, boolean>;
}

export async function executePythonOsintTool(input: {
  tool: PythonOsintTool;
  args: Record<string, unknown>;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxOutputBytes?: number;
  correlation?: PythonOsintToolCorrelation;
}): Promise<PythonOsintToolResponse> {
  const requestId = randomUUID();
  const base: PythonOsintToolResponse = {
    requestId,
    tool: input.tool,
    status: "unavailable",
    toolVersion: null,
    result: null,
    error: null,
    startedAt: null,
    finishedAt: null,
    executorId: null, workerImageDigest: null, egressProxyImageDigest: null,
    isolationProofIssuedAt: null, isolationProofExpiresAt: null, correlation: null,
    remoteCancellationConfirmed: null,
  };
  if (input.signal?.aborted) return { ...base, status: "cancelled", error: "OSINT execution was cancelled." };
  const attestation = await fetchAttestation(input.signal);
  if (input.signal?.aborted) return { ...base, status: "cancelled", error: "OSINT execution was cancelled." };
  if (!attestation || !attestation.availableTools.includes(input.tool)) {
    return { ...base, error: "No trusted, healthy Apex Python OSINT worker is available for " + input.tool + "." };
  }
  const config = getWorkerConfig();
  if (!config) return { ...base, error: "Apex Python OSINT worker configuration is unavailable." };
  const timeoutMs = Math.max(1_000, Math.min(input.timeoutMs ?? 30_000, attestation.maxRuntimeMs));
  const maxOutputBytes = Math.max(1_024, Math.min(input.maxOutputBytes ?? 1_000_000, attestation.maxOutputBytes));
  const request = {
    requestId,
    tool: input.tool,
    args: input.args,
    timeoutMs,
    maxOutputBytes,
    requestedAt: new Date().toISOString(),
    correlation: normalizeCorrelation(input.correlation),
  };
  let cancellationResult: PythonOsintToolResponse | null = null;
  let cancellationStatus: WorkerCancellationStatus | null = null;
  let cancellationPromise: Promise<WorkerCancellationStatus | null> | null = null;
  const requestRemoteCancellation = (): Promise<WorkerCancellationStatus | null> => {
    if (!cancellationPromise) cancellationPromise = requestWorkerCancellation(config, requestId).catch(() => null);
    return cancellationPromise;
  };
  const onAbort = () => { void requestRemoteCancellation(); };
  input.signal?.addEventListener("abort", onAbort, { once: true });
  if (input.signal?.aborted) onAbort();
  try {
    const raw = await fetchWorkerJson(new URL("/v1/execute", config.baseUrl), config, {
      method: "POST",
      body: request,
      timeoutMs: timeoutMs + 2_000,
      maxBytes: Math.min(MAX_TOOL_RESPONSE_ENVELOPE_BYTES, maxOutputBytes + 32_000),
      signal: input.signal,
    });
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Worker returned an invalid result envelope.");
    const envelope = raw as Partial<SignedEnvelope<unknown>>;
    if (!signatureMatches(config.secret, envelope.payload, envelope.signature)) throw new Error("Worker result signature was invalid.");
    if (!envelope.payload || typeof envelope.payload !== "object" || Array.isArray(envelope.payload)) throw new Error("Worker returned an invalid result payload.");
    const payload = envelope.payload as Record<string, unknown>;
    const statuses: PythonOsintToolStatus[] = ["completed", "partial", "failed", "unavailable", "timeout", "cancelled"];
    if (payload.requestId !== requestId || payload.tool !== input.tool || !statuses.includes(payload.status as PythonOsintToolStatus)) {
      throw new Error("Worker result did not match the requested operation.");
    }
    const status = payload.status as PythonOsintToolStatus;
    const result = payload.result && typeof payload.result === "object" && !Array.isArray(payload.result)
      ? payload.result as Record<string, unknown> : null;
    if (status === "completed" || status === "partial") {
      if (!result) throw new Error("Worker returned a successful status without a structured result.");
      const started = typeof payload.startedAt === "string" ? Date.parse(payload.startedAt) : NaN;
      const finished = typeof payload.finishedAt === "string" ? Date.parse(payload.finishedAt) : NaN;
      if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) throw new Error("Worker returned invalid execution timestamps.");
    }
    if (payload.executorId !== attestation.executorId
      || payload.workerImageDigest !== attestation.workerImageDigest
      || payload.egressProxyImageDigest !== attestation.egressProxyImageDigest
      || payload.isolationProofIssuedAt !== attestation.isolationProofIssuedAt
      || payload.isolationProofExpiresAt !== attestation.isolationProofExpiresAt) {
      throw new Error("Worker execution identity did not match the attested worker and proxy images.");
    }
    const responseCorrelation = payload.correlation && typeof payload.correlation === "object" && !Array.isArray(payload.correlation)
      ? payload.correlation as Record<string, unknown> : {};
    const expectedCorrelation = normalizeCorrelation(input.correlation);
    if (stableJson(responseCorrelation) !== stableJson(expectedCorrelation)) throw new Error("Worker result correlation did not match the originating Apex action.");
    return {
      requestId, tool: input.tool, status,
      toolVersion: typeof payload.toolVersion === "string" ? payload.toolVersion.slice(0, 120) : null,
      result,
      error: typeof payload.error === "string" ? payload.error.slice(0, 500) : status === "partial" ? "Worker reported an incomplete result." : null,
      startedAt: typeof payload.startedAt === "string" ? payload.startedAt : null,
      finishedAt: typeof payload.finishedAt === "string" ? payload.finishedAt : null,
      executorId: attestation.executorId,
      workerImageDigest: attestation.workerImageDigest,
      egressProxyImageDigest: attestation.egressProxyImageDigest,
      isolationProofIssuedAt: attestation.isolationProofIssuedAt,
      isolationProofExpiresAt: attestation.isolationProofExpiresAt,
      correlation: responseCorrelation,
      remoteCancellationConfirmed: false,
    };
  } catch (error) {
    if (input.signal?.aborted) {
      cancellationResult = { ...base, status: "cancelled", error: "OSINT execution was cancelled.", correlation: normalizeCorrelation(input.correlation) };
      return cancellationResult;
    }
    const message = error instanceof Error ? error.message : "Sandbox worker execution failed.";
    const status: PythonOsintToolStatus = /timed out/i.test(message) ? "timeout" : /unavailable|unreachable|configuration/i.test(message) ? "unavailable" : "failed";
    let remoteCancellationConfirmed: boolean | null = false;
    if (status === "timeout") {
      const remoteStatus = await requestRemoteCancellation();
      remoteCancellationConfirmed = remoteStatus === "cancelled" || remoteStatus === "cancel_reserved";
    }
    return {
      ...base, status, error: message.slice(0, 500),
      correlation: normalizeCorrelation(input.correlation), remoteCancellationConfirmed,
    };
  } finally {
    input.signal?.removeEventListener("abort", onAbort);
    if (input.signal?.aborted) {
      cancellationStatus = await requestRemoteCancellation();
      if (cancellationResult) cancellationResult.remoteCancellationConfirmed = cancellationStatus === "cancelled" || cancellationStatus === "cancel_reserved";
    }
  }
}

async function requestWorkerCancellation(
  config: { baseUrl: URL; secret: string }, requestId: string,
): Promise<WorkerCancellationStatus> {
  const body = { requestId, requestedAt: new Date().toISOString() };
  const raw = await fetchWorkerJson(new URL("/v1/cancel", config.baseUrl), config, {
    method: "POST", body, timeoutMs: 6_000, maxBytes: 4_096,
  });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Worker returned an invalid cancellation envelope.");
  const envelope = raw as Partial<SignedEnvelope<unknown>>;
  if (!signatureMatches(config.secret, envelope.payload, envelope.signature)) throw new Error("Worker cancellation response signature was invalid.");
  if (!envelope.payload || typeof envelope.payload !== "object" || Array.isArray(envelope.payload)) throw new Error("Worker cancellation response payload was invalid.");
  const payload = envelope.payload as Record<string, unknown>;
  const statuses: WorkerCancellationStatus[] = ["cancelled", "cancel_reserved", "not_running", "cancellation_timeout"];
  if (payload.requestId !== requestId || !statuses.includes(payload.status as WorkerCancellationStatus)) throw new Error("Worker cancellation response did not match the originating request.");
  return payload.status as WorkerCancellationStatus;
}

/** Test isolation: never carry an attestation between independently configured runs. */
export function resetPythonOsintWorkerCacheForTests(): void {
  cachedAttestation = null;
  cachedAvailableTools = new Set();
}
