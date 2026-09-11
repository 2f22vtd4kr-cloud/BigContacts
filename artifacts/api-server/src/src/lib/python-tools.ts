/**
 * Python OSINT capability boundary.
 *
 * Holehe, Maigret, Sherlock, theHarvester and the Python-backed deep-research
 * adapter own their network stacks. Until Apex supplies an OS/container-level
 * sandbox with governed egress, these capabilities must remain unavailable.
 *
 * This is deliberately enforced in the canonical source, not by a build-time
 * mutation or an environment-variable opt-in. Cancellation/output limits in
 * the old runner are useful hygiene but cannot turn an unrestricted Python
 * network process into an egress boundary.
 */

import { authorizePythonSandboxRequest, getPythonSandboxState, PYTHON_SANDBOX_UNAVAILABLE_REASON } from "./python-sandbox-contract";

export interface SubprocessOptions { signal?: AbortSignal }

export interface HolehePlatform { name: string; url?: string; exists: boolean; emailrecovery?: boolean; phonenumber?: boolean; others?: Record<string, unknown>; }
export interface HoleheResult { email: string; found: HolehePlatform[]; totalChecked: number; totalFound: number; available: boolean; error?: string; }
export interface MaigretProfile { siteName: string; url?: string; status: "found" | "not_found" | "error" | "unknown"; profileData?: Record<string, string>; tags?: string[]; }
export interface MaigretResult { username: string; found: MaigretProfile[]; totalSitesChecked: number; available: boolean; reportUrl?: string; error?: string; }
export interface SherlockProfile { siteName: string; url: string; status: "found"; }
export interface SherlockResult { username: string; found: SherlockProfile[]; totalSitesChecked: number; available: boolean; reviewOnly: true; error?: string; }
export interface HarvesterResult { domain: string; emails: string[]; subdomains: string[]; ips: string[]; hosts: string[]; totalFound: number; available: boolean; error?: string; }
export interface OpenDeepResearchResult { status: "completed" | "failed" | "timeout" | "unavailable"; report: string | null; citations: string[]; searches: number; pages: number; model: string | null; available: boolean; reviewOnly: true; error?: string; }

function cancelled(signal?: AbortSignal): never | void { if (signal?.aborted) throw new Error("cancelled"); }
function authorizeNetworkPython(signal?: AbortSignal): string | null {
  const authorization = authorizePythonSandboxRequest({ capability: "network_osint", signal, timeoutMs: 30_000, maxOutputBytes: 1_000_000, destinationPolicy: "approved-public-web-only" });
  return authorization.allowed ? null : authorization.reason ?? PYTHON_SANDBOX_UNAVAILABLE_REASON;
}

export async function runHolehe(email: string, options: SubprocessOptions = {}): Promise<HoleheResult> {
  const base: HoleheResult = { email, found: [], totalChecked: 0, totalFound: 0, available: false };
  cancelled(options.signal); const blocked = authorizeNetworkPython(options.signal); if (blocked) return { ...base, error: blocked };
  if (!email?.includes("@")) return { ...base, error: "Invalid email" }; return base;
}
export async function runMaigret(username: string, options: SubprocessOptions = {}): Promise<MaigretResult> {
  const base: MaigretResult = { username, found: [], totalSitesChecked: 0, available: false };
  cancelled(options.signal); const blocked = authorizeNetworkPython(options.signal); if (blocked) return { ...base, error: blocked };
  const sanitized = username.replace(/[^a-zA-Z0-9._\-]/g, ""); if (!sanitized) return { ...base, error: "Invalid username" }; return base;
}
export async function runSherlock(username: string, options: SubprocessOptions = {}): Promise<SherlockResult> {
  const base: SherlockResult = { username, found: [], totalSitesChecked: 0, available: false, reviewOnly: true };
  cancelled(options.signal); const blocked = authorizeNetworkPython(options.signal); if (blocked) return { ...base, error: blocked };
  const sanitized = username.replace(/[^a-zA-Z0-9._\-]/g, ""); if (!sanitized) return { ...base, error: "Invalid username" }; return base;
}
export async function runTheHarvester(domain: string, _sources = "bing,duckduckgo,yahoo,certspotter,crtsh", options: SubprocessOptions = {}): Promise<HarvesterResult> {
  const base: HarvesterResult = { domain, emails: [], subdomains: [], ips: [], hosts: [], totalFound: 0, available: false };
  cancelled(options.signal); const blocked = authorizeNetworkPython(options.signal); if (blocked) return { ...base, error: blocked };
  const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim(); if (!cleanDomain || !cleanDomain.includes(".")) return { ...base, error: "Invalid domain" }; return base;
}
export async function runOpenDeepResearch(_prompt: string, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<OpenDeepResearchResult> {
  const base: OpenDeepResearchResult = { status: "unavailable", report: null, citations: [], searches: 0, pages: 0, model: null, available: false, reviewOnly: true };
  cancelled(options.signal); const authorization = authorizePythonSandboxRequest({ capability: "network_osint", signal: options.signal, timeoutMs: options.timeoutMs ?? 30_000, maxOutputBytes: 1_000_000, destinationPolicy: "approved-public-web-only" });
  if (!authorization.allowed) return { ...base, error: authorization.reason ?? PYTHON_SANDBOX_UNAVAILABLE_REASON }; return base;
}

/**
 * Availability is tied to the trusted sandbox attestation, not to whether the
 * Python packages happen to be installed. Installation alone never authorizes
 * network-capable subprocess execution.
 */
export async function checkPythonToolsAvailability(): Promise<Record<string, boolean>> {
  const sandbox = getPythonSandboxState();
  const enabled = sandbox.state === "attested" && Boolean(sandbox.attestation?.allowedCapabilities.includes("network_osint"));
  return { holehe: enabled, maigret: enabled, sherlock: enabled, theHarvester: enabled, openDeepResearch: enabled };
}
