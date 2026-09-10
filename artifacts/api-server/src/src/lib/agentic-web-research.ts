import { AsyncLocalStorage } from "node:async_hooks";
import { safeOutboundFetch } from "./ssrf-safe-fetch";
import { classifyExternalProvider, runProviderCall } from "./provider-gate";

const outboundContext = new AsyncLocalStorage<boolean>();
const nativeFetch = globalThis.fetch.bind(globalThis);

type GuardedFetch = typeof fetch & {
  __apexSsrfGuard?: boolean;
  __apexQuotaGuard?: boolean;
};

// Install one process-level shim, but enforce it only inside an Investigator
// execution context. Exactly one layer owns quota accounting and exactly one
// layer owns SSRF pinning.
if (!(globalThis.fetch as GuardedFetch).__apexSsrfGuard) {
  const guardedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (!outboundContext.getStore()) return nativeFetch(input, init);

    // provider-gate owns quota when its process-wide wrapper is already outermost.
    if ((globalThis.fetch as GuardedFetch).__apexQuotaGuard) {
      return safeOutboundFetch(input, init);
    }

    // In isolated worker/test contexts there may be no process-wide quota shim.
    // Apply the same provider quota contract locally instead of bypassing it.
    const rawUrl = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const provider = classifyExternalProvider(rawUrl);
    return runProviderCall({ provider, account: "agentic-fetch" }, () => safeOutboundFetch(input, init));
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
  return outboundContext.run(true, async () => {
    const core = await import("./agentic-web-research-core");
    return core.runAgenticWebResearch(input);
  });
}
