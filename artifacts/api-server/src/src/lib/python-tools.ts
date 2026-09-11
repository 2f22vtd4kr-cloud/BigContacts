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

const PYTHON_OSINT_EGRESS_GOVERNED = false;
const PYTHON_OSINT_EGRESS_ERROR =
  "Python OSINT capability unavailable: subprocess network egress is not yet governed by the Apex sandbox/egress boundary.";

export interface SubprocessOptions { signal?: AbortSignal }

export interface HolehePlatform {
  name: string;
  url?: string;
  exists: boolean;
  emailrecovery?: boolean;
  phonenumber?: boolean;
  others?: Record<string, unknown>;
}

export interface HoleheResult {
  email: string;
  found: HolehePlatform[];
  totalChecked: number;
  totalFound: number;
  available: boolean;
  error?: string;
}

export interface MaigretProfile {
  siteName: string;
  url?: string;
  status: "found" | "not_found" | "error" | "unknown";
  profileData?: Record<string, string>;
  tags?: string[];
}

export interface MaigretResult {
  username: string;
  found: MaigretProfile[];
  totalSitesChecked: number;
  available: boolean;
  reportUrl?: string;
  error?: string;
}

export interface SherlockProfile { siteName: string; url: string; status: "found"; }
export interface SherlockResult {
  username: string;
  found: SherlockProfile[];
  totalSitesChecked: number;
  available: boolean;
  reviewOnly: true;
  error?: string;
}

export interface HarvesterResult {
  domain: string;
  emails: string[];
  subdomains: string[];
  ips: string[];
  hosts: string[];
  totalFound: number;
  available: boolean;
  error?: string;
}

export interface OpenDeepResearchResult {
  status: "completed" | "failed" | "timeout" | "unavailable";
  report: string | null;
  citations: string[];
  searches: number;
  pages: number;
  model: string | null;
  available: boolean;
  reviewOnly: true;
  error?: string;
}

function cancelled(signal?: AbortSignal): never | void {
  if (signal?.aborted) throw new Error("cancelled");
}

export async function runHolehe(email: string, options: SubprocessOptions = {}): Promise<HoleheResult> {
  const base: HoleheResult = { email, found: [], totalChecked: 0, totalFound: 0, available: false };
  cancelled(options.signal);
  if (!PYTHON_OSINT_EGRESS_GOVERNED) return { ...base, error: PYTHON_OSINT_EGRESS_ERROR };
  if (!email?.includes("@")) return { ...base, error: "Invalid email" };
  return base;
}

export async function runMaigret(username: string, options: SubprocessOptions = {}): Promise<MaigretResult> {
  const base: MaigretResult = { username, found: [], totalSitesChecked: 0, available: false };
  cancelled(options.signal);
  if (!PYTHON_OSINT_EGRESS_GOVERNED) return { ...base, error: PYTHON_OSINT_EGRESS_ERROR };
  const sanitized = username.replace(/[^a-zA-Z0-9._\-]/g, "");
  if (!sanitized) return { ...base, error: "Invalid username" };
  return base;
}

export async function runSherlock(username: string, options: SubprocessOptions = {}): Promise<SherlockResult> {
  const base: SherlockResult = { username, found: [], totalSitesChecked: 0, available: false, reviewOnly: true };
  cancelled(options.signal);
  if (!PYTHON_OSINT_EGRESS_GOVERNED) return { ...base, error: PYTHON_OSINT_EGRESS_ERROR };
  const sanitized = username.replace(/[^a-zA-Z0-9._\-]/g, "");
  if (!sanitized) return { ...base, error: "Invalid username" };
  return base;
}

export async function runTheHarvester(domain: string, _sources = "bing,duckduckgo,yahoo,certspotter,crtsh", options: SubprocessOptions = {}): Promise<HarvesterResult> {
  const base: HarvesterResult = { domain, emails: [], subdomains: [], ips: [], hosts: [], totalFound: 0, available: false };
  cancelled(options.signal);
  if (!PYTHON_OSINT_EGRESS_GOVERNED) return { ...base, error: PYTHON_OSINT_EGRESS_ERROR };
  const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
  if (!cleanDomain || !cleanDomain.includes(".")) return { ...base, error: "Invalid domain" };
  return base;
}

export async function runOpenDeepResearch(
  _prompt: string,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<OpenDeepResearchResult> {
  const base: OpenDeepResearchResult = {
    status: "unavailable", report: null, citations: [], searches: 0, pages: 0,
    model: null, available: false, reviewOnly: true,
  };
  cancelled(options.signal);
  if (!PYTHON_OSINT_EGRESS_GOVERNED) return { ...base, error: PYTHON_OSINT_EGRESS_ERROR };
  return base;
}

/**
 * Availability is intentionally reported as false for network-capable Python
 * capabilities while the governed sandbox is absent. This prevents health
 * surfaces from advertising a capability that the canonical runtime must not
 * execute.
 */
export async function checkPythonToolsAvailability(): Promise<Record<string, boolean>> {
  return {
    holehe: false,
    maigret: false,
    sherlock: false,
    theHarvester: false,
    openDeepResearch: false,
  };
}
