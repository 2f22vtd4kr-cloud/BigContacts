/**
 * Canonical adapters for non-AI OSINT tools.
 *
 * All network-capable Python tools execute through the separate, attested Apex
 * OSINT worker. No direct subprocess/network execution occurs in the Node API.
 * Worker output is treated as untrusted, review-only observations and never
 * writes Atlas state directly.
 */
import {
  executePythonOsintTool,
  refreshPythonOsintToolAvailability,
  type PythonOsintTool,
} from "./python-osint-worker-client";

export interface SubprocessOptions { signal?: AbortSignal }
export interface PythonToolExecution {
  requestId: string;
  tool: PythonOsintTool;
  status: "completed" | "partial" | "failed" | "unavailable" | "timeout" | "cancelled";
  toolVersion: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}
export interface HolehePlatform {
  name: string;
  url?: string;
  exists: boolean;
  emailrecovery?: boolean | string;
  phonenumber?: boolean | string;
  others?: Record<string, unknown>;
}
export interface HoleheResult { email: string; found: HolehePlatform[]; totalChecked: number; totalFound: number; available: boolean; execution?: PythonToolExecution; error?: string; }
export interface MaigretProfile { siteName: string; url?: string; status: "found" | "not_found" | "error" | "unknown"; profileData?: Record<string, string>; tags?: string[]; }
export interface MaigretResult { username: string; found: MaigretProfile[]; totalSitesChecked: number; available: boolean; execution?: PythonToolExecution; reportUrl?: string; error?: string; }
export interface SherlockProfile { siteName: string; url: string; status: "found"; }
export interface SherlockResult { username: string; found: SherlockProfile[]; totalSitesChecked: number; available: boolean; execution?: PythonToolExecution; reviewOnly: true; error?: string; }
export interface HarvesterResult { domain: string; emails: string[]; subdomains: string[]; ips: string[]; hosts: string[]; totalFound: number; available: boolean; execution?: PythonToolExecution; error?: string; }
export interface OpenDeepResearchResult { status: "completed" | "failed" | "timeout" | "unavailable"; report: string | null; citations: string[]; searches: number; pages: number; model: string | null; available: boolean; reviewOnly: true; error?: string; }

export type SpiderFootTargetType = "domain" | "hostname" | "ip" | "email" | "username" | "person" | "asn";
export type SpiderFootProfile = "identity-expansion" | "domain-infrastructure" | "organization-footprint" | "contact-adjacent" | "broad-osint";
export interface SpiderFootObservation {
  scanId: string;
  target: string;
  targetType: SpiderFootTargetType;
  profile: SpiderFootProfile;
  sourceModule: string;
  eventType: string;
  value: string;
  sourceUrl?: string;
  observedAt: string;
  parentEventId?: string;
}
export interface SpiderFootResult {
  target: string;
  targetType: SpiderFootTargetType;
  profile: SpiderFootProfile;
  observations: SpiderFootObservation[];
  eventsReceived: number;
  available: boolean;
  partial: boolean;
  error?: string;
  reviewOnly: true;
  execution?: PythonToolExecution;
}

const DEFAULT_HARVESTER_SOURCES = "bing,duckduckgo,yahoo,certspotter,crtsh";
const RESULT_STATUSES = new Set(["completed", "partial"]);
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function text(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function strings(value: unknown, maxItems = 100): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, maxItems).map((item) => item.trim().slice(0, 1_000))
    : [];
}
function asNonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
function resultPayload(response: { status: string; result: Record<string, unknown> | null }): Record<string, unknown> {
  return response.result ?? {};
}
function executionMetadata(response: {
  requestId: string; tool: PythonOsintTool; status: PythonToolExecution["status"];
  toolVersion: string | null; startedAt: string | null; finishedAt: string | null;
}): PythonToolExecution {
  return {
    requestId: response.requestId,
    tool: response.tool,
    status: response.status,
    toolVersion: response.toolVersion,
    startedAt: response.startedAt,
    finishedAt: response.finishedAt,
  };
}
function workerError(response: { status: string; error: string | null }): string | undefined {
  if (RESULT_STATUSES.has(response.status)) return undefined;
  return response.error ?? `OSINT worker operation ended with status ${response.status}.`;
}
async function executeTool(tool: PythonOsintTool, args: Record<string, unknown>, signal?: AbortSignal, timeoutMs = 30_000) {
  return executePythonOsintTool({ tool, args, signal, timeoutMs, maxOutputBytes: 1_000_000 });
}

export async function runHolehe(email: string, options: SubprocessOptions = {}): Promise<HoleheResult> {
  const base: HoleheResult = { email, found: [], totalChecked: 0, totalFound: 0, available: false };
  if (options.signal?.aborted) return { ...base, error: "OSINT execution was cancelled." };
  const normalizedEmail = text(email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { ...base, error: "Invalid email." };
  const response = await executeTool("holehe", { email: normalizedEmail }, options.signal);
  const data = resultPayload(response);
  const found = (Array.isArray(data.found) ? data.found : []).filter(isRecord).slice(0, 100).map((item) => ({
    name: text(item.name, 120) || text(item.service, 120) || "public service",
    ...(text(item.url, 500) ? { url: text(item.url, 500) } : {}),
    exists: item.exists === true,
    ...(typeof item.emailrecovery === "boolean" || typeof item.emailrecovery === "string" ? { emailrecovery: item.emailrecovery } : {}),
    ...(typeof item.phonenumber === "boolean" || typeof item.phonenumber === "string" ? { phonenumber: item.phonenumber } : {}),
    ...(isRecord(item.others) ? { others: item.others } : {}),
  }));
  return {
    email: normalizedEmail, found,
    totalChecked: asNonNegativeInteger(data.totalChecked),
    totalFound: asNonNegativeInteger(data.totalFound) || found.filter((item) => item.exists).length,
    available: RESULT_STATUSES.has(response.status),
    execution: executionMetadata(response),
    ...(workerError(response) ? { error: workerError(response) } : {}),
  };
}

export async function runMaigret(username: string, options: SubprocessOptions = {}): Promise<MaigretResult> {
  const base: MaigretResult = { username, found: [], totalSitesChecked: 0, available: false };
  const sanitized = text(username, 100).replace(/^@/, "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (options.signal?.aborted) return { ...base, error: "OSINT execution was cancelled." };
  if (sanitized.length < 2) return { ...base, error: "Invalid username." };
  const response = await executeTool("maigret", { username: sanitized }, options.signal);
  const data = resultPayload(response);
  const found = (Array.isArray(data.found) ? data.found : []).filter(isRecord).slice(0, 300).flatMap((item): MaigretProfile[] => {
    const siteName = text(item.siteName, 160) || text(item.site, 160);
    const status = ["found", "not_found", "error", "unknown"].includes(String(item.status)) ? item.status as MaigretProfile["status"] : "unknown";
    const url = text(item.url, 500);
    if (!siteName) return [];
    const profileData = isRecord(item.profileData)
      ? Object.fromEntries(Object.entries(item.profileData).filter((entry): entry is [string, string] => typeof entry[1] === "string").slice(0, 20))
      : undefined;
    return [{
      siteName, status,
      ...(url ? { url } : {}),
      ...(profileData ? { profileData } : {}),
      ...(Array.isArray(item.tags) ? { tags: strings(item.tags, 20) } : {}),
    }];
  });
  return {
    username: sanitized, found,
    totalSitesChecked: asNonNegativeInteger(data.totalSitesChecked),
    available: RESULT_STATUSES.has(response.status),
    execution: executionMetadata(response),
    ...(text(data.reportUrl, 500) ? { reportUrl: text(data.reportUrl, 500) } : {}),
    ...(workerError(response) ? { error: workerError(response) } : {}),
  };
}

export async function runSherlock(username: string, options: SubprocessOptions = {}): Promise<SherlockResult> {
  const base: SherlockResult = { username, found: [], totalSitesChecked: 0, available: false, reviewOnly: true };
  const sanitized = text(username, 100).replace(/^@/, "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (options.signal?.aborted) return { ...base, error: "OSINT execution was cancelled." };
  if (sanitized.length < 2) return { ...base, error: "Invalid username." };
  const response = await executeTool("sherlock", { username: sanitized }, options.signal);
  const data = resultPayload(response);
  const found = (Array.isArray(data.found) ? data.found : []).filter(isRecord).slice(0, 300).flatMap((item): SherlockProfile[] => {
    const siteName = text(item.siteName, 160) || text(item.site, 160);
    const url = text(item.url, 500);
    return siteName && url ? [{ siteName, url, status: "found" }] : [];
  });
  return {
    username: sanitized, found,
    totalSitesChecked: asNonNegativeInteger(data.totalSitesChecked),
    available: RESULT_STATUSES.has(response.status),
    execution: executionMetadata(response),
    reviewOnly: true,
    ...(workerError(response) ? { error: workerError(response) } : {}),
  };
}

export async function runTheHarvester(domain: string, sources = DEFAULT_HARVESTER_SOURCES, options: SubprocessOptions = {}): Promise<HarvesterResult> {
  const base: HarvesterResult = { domain, emails: [], subdomains: [], ips: [], hosts: [], totalFound: 0, available: false };
  const cleanDomain = text(domain, 254).replace(/^https?:\/\//i, "").split("/")[0]!.trim().toLowerCase();
  if (options.signal?.aborted) return { ...base, error: "OSINT execution was cancelled." };
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(cleanDomain)) return { ...base, error: "Invalid domain." };
  const allowedSources = new Set(DEFAULT_HARVESTER_SOURCES.split(","));
  const normalizedSources = text(sources, 250).split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!normalizedSources.length || normalizedSources.some((item) => !allowedSources.has(item))) return { ...base, error: "Requested theHarvester source list is outside the canonical allowlist." };
  const response = await executeTool("theharvester", { domain: cleanDomain, sources: [...new Set(normalizedSources)].join(",") }, options.signal, 60_000);
  const data = resultPayload(response);
  const emails = strings(data.emails, 100).filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
  const subdomains = strings(data.subdomains, 300);
  const ips = strings(data.ips, 300);
  const hosts = strings(data.hosts, 300);
  return {
    domain: cleanDomain, emails, subdomains, ips, hosts,
    totalFound: asNonNegativeInteger(data.totalFound) || emails.length + subdomains.length + ips.length + hosts.length,
    available: RESULT_STATUSES.has(response.status),
    execution: executionMetadata(response),
    ...(workerError(response) ? { error: workerError(response) } : {}),
  };
}

export async function runSpiderFoot(
  target: string,
  targetType: SpiderFootTargetType,
  profile: SpiderFootProfile = "identity-expansion",
  options: { signal?: AbortSignal; timeoutMs?: number; maxOutputBytes?: number } = {},
): Promise<SpiderFootResult> {
  const base: SpiderFootResult = {
    target, targetType, profile, observations: [], eventsReceived: 0,
    available: false, partial: false, reviewOnly: true,
  };
  if (options.signal?.aborted) return { ...base, error: "OSINT execution was cancelled." };
  const cleanTarget = text(target, 300);
  const targetTypes: SpiderFootTargetType[] = ["domain", "hostname", "ip", "email", "username", "person", "asn"];
  const profiles: SpiderFootProfile[] = ["identity-expansion", "domain-infrastructure", "organization-footprint", "contact-adjacent", "broad-osint"];
  if (!cleanTarget || !targetTypes.includes(targetType) || !profiles.includes(profile)) return { ...base, error: "Invalid SpiderFoot target, type, or profile." };
  const response = await executeTool("spiderfoot", { target: cleanTarget, targetType, profile }, options.signal, options.timeoutMs ?? 30_000);
  const data = resultPayload(response);
  const observations = (Array.isArray(data.observations) ? data.observations : []).filter(isRecord).slice(0, 300).flatMap((item): SpiderFootObservation[] => {
    const scanId = text(item.scanId, 100);
    const value = text(item.value, 2_000);
    const eventType = text(item.eventType, 120);
    const sourceModule = text(item.sourceModule, 120);
    const observedAt = text(item.observedAt, 60);
    if (!scanId || !value || !eventType || !sourceModule || !observedAt) return [];
    const sourceUrl = text(item.sourceUrl, 500);
    const parentEventId = text(item.parentEventId, 120);
    return [{
      scanId, target: cleanTarget, targetType, profile, sourceModule, eventType, value, observedAt,
      ...(sourceUrl && /^https?:\/\//i.test(sourceUrl) ? { sourceUrl } : {}),
      ...(parentEventId ? { parentEventId } : {}),
    }];
  });
  return {
    target: cleanTarget, targetType, profile, observations,
    eventsReceived: asNonNegativeInteger(data.eventsReceived) || observations.length,
    available: RESULT_STATUSES.has(response.status),
    partial: response.status === "partial" || data.partial === true,
    reviewOnly: true,
    execution: executionMetadata(response),
    ...(workerError(response) ? { error: workerError(response) } : {}),
  };
}

/**
 * The deep-research adapter is model-backed and is intentionally not advertised
 * as a non-AI tool. It remains unavailable until a separately reviewed adapter
 * and evidence policy are implemented.
 */
export async function runOpenDeepResearch(_prompt: string, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<OpenDeepResearchResult> {
  if (options.signal?.aborted) return { status: "unavailable", report: null, citations: [], searches: 0, pages: 0, model: null, available: false, reviewOnly: true, error: "cancelled" };
  return { status: "unavailable", report: null, citations: [], searches: 0, pages: 0, model: null, available: false, reviewOnly: true, error: "No canonical non-AI execution adapter exists for the model-backed deep-research capability." };
}

/** Availability reflects the fresh signed worker attestation and installed executors. */
export async function checkPythonToolsAvailability(): Promise<Record<string, boolean>> {
  const tools = await refreshPythonOsintToolAvailability();
  return {
    holehe: tools.holehe,
    maigret: tools.maigret,
    sherlock: tools.sherlock,
    theHarvester: tools.theharvester,
    spiderfoot: tools.spiderfoot,
    openDeepResearch: false,
  };
}
