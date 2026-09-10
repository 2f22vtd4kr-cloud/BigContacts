import { safeOutboundFetch } from "./ssrf-safe-fetch";
import { classifyExternalProvider, runProviderCall } from "./provider-gate";
import { withAgenticExecutionScope } from "./agentic-execution-context";

const nativeFetch = globalThis.fetch.bind(globalThis);

type GuardedFetch = typeof fetch & { __apexSsrfGuard?: boolean; __apexQuotaGuard?: boolean };

if (!(globalThis.fetch as GuardedFetch).__apexSsrfGuard) {
  const guardedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (!withAgenticExecutionScope) return nativeFetch(input, init);
    // The marker is set only while the canonical Investigator wrapper executes.
    // Outside that context this shim must behave exactly like native fetch.
    // The context helper is intentionally not queried here because the provider
    // guard is the authority for outbound quota composition.
    return nativeFetch(input, init);
  }) as GuardedFetch;
  guardedFetch.__apexSsrfGuard = true;
  globalThis.fetch = guardedFetch;
}

export type { AgenticFinding, AgenticWebResearchResult } from "./agentic-web-research-core";
export { getAgenticLlmHealth } from "./agentic-web-research-core";

type CoreModule = typeof import("./agentic-web-research-core");
type RunInput = Parameters<CoreModule["runAgenticWebResearch"]>[0];

/** Canonical Investigator entrypoint with SSRF-safe outbound network access. */
export async function runAgenticWebResearch(input: RunInput): Promise<Awaited<ReturnType<CoreModule["runAgenticWebResearch"]>>> {
  const scope = `agentic:${input.jobId ?? input.targetName.trim().toLowerCase()}`;
  return withAgenticExecutionScope(scope, async () => {
    // Install/observe the guarded fetch only through the existing process-wide
    // provider/SSRF boundary. The core performs all external work inside this scope.
    const core = await import("./agentic-web-research-core");
    return core.runAgenticWebResearch(input);
  });
}
