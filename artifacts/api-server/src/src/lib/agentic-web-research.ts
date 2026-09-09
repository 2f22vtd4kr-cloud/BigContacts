import { AsyncLocalStorage } from "node:async_hooks";
import { safeOutboundFetch } from "./ssrf-safe-fetch";

const outboundContext = new AsyncLocalStorage<boolean>();
const nativeFetch = globalThis.fetch.bind(globalThis);

// Install one process-level shim, but enforce it only inside an Investigator
// execution context. Non-Investigator application traffic keeps native fetch.
if (!(globalThis.fetch as typeof fetch & { __apexSsrfGuard?: boolean }).__apexSsrfGuard) {
  const guardedFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (!outboundContext.getStore()) return nativeFetch(input, init);
    return safeOutboundFetch(input, init, nativeFetch);
  }) as typeof fetch & { __apexSsrfGuard?: boolean };
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
