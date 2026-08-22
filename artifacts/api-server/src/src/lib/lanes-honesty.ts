/**
 * Provider / lane honesty snapshots for jobs and Bureau cases.
 * Counts only — never secret values. Fail-closed on missing web search.
 *
 * bureauIntegrity: operator-facing signal when Apex cannot out-perform a
 * general agent because the control plane (agentic LLM) or web search is dead.
 */
import { getAIKeyStatus } from "./ai-extractor";
import { getMistralWebSearchStatus } from "./mistral-web-search";
import { getNvidiaNimCaseReasoningStatus } from "./nvidia-nim-case-reasoning";
import { getAgenticLlmHealth } from "./agentic-llm-health";

export type BureauIntegrityLevel = "ok" | "degraded" | "critical";

export type LanesHonestySnapshot = {
  perplexity: number;
  tavily: number;
  exa: number;
  gemini: number;
  groq: number;
  mistral: number;
  nvidiaNim: number;
  companiesHouse: number;
  serper: number;
  webSearchActive: number;
  /** True when no Perplexity/Tavily/Exa slots are active — registry-only risk. */
  registryShallowRisk: boolean;
  /** True when Groq admission keys are missing — deterministic name gate only. */
  groqAdmissionFallback: boolean;
  /**
   * Configured chat/control LLMs that can drive agentic ReAct
   * (Groq + Gemini + Mistral + NVIDIA). Not the same as webSearchActive.
   */
  agenticLlmSlots: number;
  /** Last observed agentic step success (null = not yet exercised this process). */
  agenticLlmLastOk: boolean | null;
  agenticLlmLastModel: string | null;
  /** ok | degraded | critical — drives UI announcement */
  bureauIntegrity: BureauIntegrityLevel;
  bureauIntegrityReasons: string[];
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
  const serper = [process.env.SERPER_API_KEY, process.env.SERPER_API_KEY_2, process.env.SERPER_API_KEY_3, process.env.SERPER_KEY].some((k) => Boolean(k?.trim())) ? 1 : 0;
  // Serper powers agentic ReAct SERP; Tavily/Exa/Perplexity power other lanes.
  const webSearchActive = perplexity + tavily + exa + serper;
  const groqKeys = [
    process.env.GROQ_API_KEY,
    ...Array.from({ length: 10 }, (_, i) => process.env[`GROQ_API_KEY_${i + 1}`]),
  ].filter((k) => typeof k === "string" && k.trim().length > 0);
  const groq = groqKeys.length;
  const gemini = activeCount(status.gemini);
  const mistralN = mistral.configured ? 1 : 0;
  const nvidiaN = nvidia.configured ? 1 : 0;
  const agenticLlmSlots = (groq > 0 ? 1 : 0) + (gemini > 0 ? 1 : 0) + mistralN + nvidiaN;

  const agenticHealth = getAgenticLlmHealth();
  const agenticLlmLastOk = agenticHealth.ok;
  const agenticLlmLastModel = agenticHealth.model;

  const reasons: string[] = [];
  if (webSearchActive === 0) {
    reasons.push("No live web-search providers (Serper/Tavily/Exa/Perplexity) — registry-only research cannot beat general agents.");
  }
  if (agenticLlmSlots === 0) {
    reasons.push("No agentic control LLM configured (Groq/Gemini/Mistral/NVIDIA) — ReAct web loop cannot run.");
  }
  if (agenticLlmLastOk === false) {
    reasons.push("Last agentic LLM step failed across all configured providers — bureau is underperforming.");
  }
  if (groq === 0 && agenticLlmSlots > 0) {
    reasons.push("Groq missing — admission/name gate and preferred ReAct lane run on fallbacks only.");
  }

  let bureauIntegrity: BureauIntegrityLevel = "ok";
  if (webSearchActive === 0 || agenticLlmSlots === 0 || agenticLlmLastOk === false) {
    bureauIntegrity = "critical";
  } else if (reasons.length > 0) {
    bureauIntegrity = "degraded";
  }

  return {
    perplexity,
    tavily,
    exa,
    serper,
    gemini,
    groq,
    mistral: mistralN,
    nvidiaNim: nvidiaN,
    companiesHouse: process.env.COMPANIES_HOUSE_API_KEY ? 1 : 0,
    webSearchActive,
    registryShallowRisk: webSearchActive === 0,
    groqAdmissionFallback: groq === 0,
    agenticLlmSlots,
    agenticLlmLastOk,
    agenticLlmLastModel,
    bureauIntegrity,
    bureauIntegrityReasons: reasons,
    assessedAt: new Date().toISOString(),
  };
}
