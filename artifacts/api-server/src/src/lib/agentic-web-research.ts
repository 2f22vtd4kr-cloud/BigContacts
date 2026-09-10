import { safeOutboundFetch } from "./ssrf-safe-fetch";
import { classifyExternalProvider, runProviderCall } from "./provider-gate";
import { getAgenticExecutionScope, withAgenticExecutionScope } from "./agentic-execution-context";

const nativeFetch = globalThis.fetch.bind(globalThis);
type GuardedFetch = typeof fetch & { __apexSsrfGuard?: boolean; __apexQuotaGuard?: boolean };

if (!(globalThis.fetch as GuardedFetch).__apexSsrfGuard) {
  const guardedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (getAgenticExecutionScope() === "process") return nativeFetch(input, init);
    if ((globalThis.fetch as GuardedFetch).__apexQuotaGuard) return safeOutboundFetch(input, init);
    const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const provider = classifyExternalProvider(rawUrl);
    return runProviderCall({ provider, account: "agentic-fetch" }, () => safeOutboundFetch(input, init));
  }) as GuardedFetch;
  guardedFetch.__apexSsrfGuard = true;
  globalThis.fetch = guardedFetch;
}

export type { AgenticFinding, AgenticWebResearchResult, AgenticTrajectoryRecord } from "./agentic-web-research-core";
export { getAgenticLlmHealth } from "./agentic-web-research-core";

type CoreModule = typeof import("./agentic-web-research-core");
type RunInput = Parameters<CoreModule["runAgenticWebResearch"]>[0];

/** Canonical Investigator entrypoint with SSRF-safe outbound network access. */
export async function runAgenticWebResearch(input: RunInput): Promise<Awaited<ReturnType<CoreModule["runAgenticWebResearch"]>>> {
  const scope = `agentic:${input.jobId ?? input.targetName.trim().toLowerCase()}`;
  return withAgenticExecutionScope(scope, async () => {
    const core = await import("./agentic-web-research-core");
    return core.runAgenticWebResearch(input);
  });
}
