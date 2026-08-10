/**
 * Provider / lane honesty snapshots for jobs and Bureau cases.
 * Counts only — never secret values. Fail-closed on missing web search.
 */
import { getAIKeyStatus } from "./ai-extractor";
import { getMistralWebSearchStatus } from "./mistral-web-search";
import { getNvidiaNimCaseReasoningStatus } from "./nvidia-nim-case-reasoning";

export type LanesHonestySnapshot = {
  perplexity: number;
  tavily: number;
  exa: number;
  gemini: number;
  mistral: number;
  nvidiaNim: number;
  companiesHouse: number;
  webSearchActive: number;
  /** True when no Perplexity/Tavily/Exa slots are active — registry-only risk. */
  registryShallowRisk: boolean;
  assessedAt: string;
};

function activeCount(slots: Array<{ state: string }> | undefined): number {
  return (slots ?? []).filter((s) => s.state === "active").length;
}

export function buildLanesHonestySnapshot(): LanesHonestySnapshot {
  const status = getAIKeyStatus();
  const mistral = getMistralWebSearchStatus();
  const nvidia = getNvidiaNimCaseReasoningStatus();
  const perplexity = activeCount(status.perplexity);
  const tavily = activeCount(status.tavily);
  const exa = activeCount(status.exa);
  const webSearchActive = perplexity + tavily + exa;
  return {
    perplexity,
    tavily,
    exa,
    gemini: activeCount(status.gemini),
    mistral: mistral.configured ? 1 : 0,
    nvidiaNim: nvidia.configured ? 1 : 0,
    companiesHouse: process.env.COMPANIES_HOUSE_API_KEY ? 1 : 0,
    webSearchActive,
    registryShallowRisk: webSearchActive === 0,
    assessedAt: new Date().toISOString(),
  };
}
