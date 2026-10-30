/**
 * Provider / lane honesty snapshots for jobs and Bureau cases.
 * Counts only configured active capabilities; never reads or emits secret values.
 */
import { getAIKeyStatus } from "./ai-extractor";
import { getAgenticLlmHealth } from "./agentic-llm-health";
import { getGroqBossStatus } from "./groq-boss";
import { getGroqRightHandStatus } from "./groq-right-hand-reasoning";

export type BureauIntegrityLevel = "ok" | "degraded" | "critical";

export type LanesHonestySnapshot = {
  groqBoss: number;
  groqRightHand: number;
  groqInvestigator: number;
  serper: number;
  serpapi: number;
  tavily: number;
  exa: number;
  companiesHouse: number;
  webSearchActive: number;
  registryShallowRisk: boolean;
  /** No alternate model-provider admission fallback exists in the canonical Groq-only control plane. */
  groqAdmissionFallback: boolean;
  agenticLlmSlots: number;
  agenticLlmLastOk: boolean | null;
  agenticLlmLastModel: string | null;
  bureauIntegrity: BureauIntegrityLevel;
  bureauIntegrityReasons: string[];
  assessedAt: string;
};

function activeCount(slots: Array<{ state: string }> | undefined): number {
  return (slots ?? []).filter((slot) => slot.state === "active").length;
}

export function buildLanesHonestySnapshot(): LanesHonestySnapshot {
  const status = getAIKeyStatus();
  const groqBoss = getGroqBossStatus().configured ? 1 : 0;
  const groqRightHand = getGroqRightHandStatus().configured ? 1 : 0;
  const groqInvestigator = activeCount(status.groqInvestigator);
  const serper = activeCount(status.serper);
  const serpapi = activeCount(status.serpapi);
  const tavily = activeCount(status.tavily);
  const exa = activeCount(status.exa);
  const webSearchActive = serper + serpapi + tavily + exa;
  const companiesHouse = process.env.COMPANIES_HOUSE_API_KEY?.trim() ? 1 : 0;

  const agenticLlmSlots = groqInvestigator;
  const agenticHealth = getAgenticLlmHealth();
  const agenticLlmLastOk = agenticHealth.ok;
  const agenticLlmLastModel = agenticHealth.model;
  const reasons: string[] = [];

  if (groqBoss === 0) reasons.push("Groq Boss is not configured; canonical case direction cannot proceed.");
  if (groqRightHand === 0) reasons.push("Groq Right-hand is not configured; required independent oversight cannot proceed.");
  if (agenticLlmSlots === 0) reasons.push("No configured Groq Investigator capability is available for the ReAct research loop.");
  if (webSearchActive === 0) reasons.push("No active web-search provider is configured; discovery cannot inspect public search results.");
  if (agenticLlmLastOk === false) reasons.push("The last recorded Groq Investigator model attempt failed.");

  let bureauIntegrity: BureauIntegrityLevel = "ok";
  if (groqBoss === 0 || groqRightHand === 0 || agenticLlmSlots === 0 || webSearchActive === 0 || agenticLlmLastOk === false) {
    bureauIntegrity = "critical";
  } else if (reasons.length > 0) {
    bureauIntegrity = "degraded";
  }

  return {
    groqBoss,
    groqRightHand,
    groqInvestigator,
    serper,
    serpapi,
    tavily,
    exa,
    companiesHouse,
    webSearchActive,
    registryShallowRisk: webSearchActive === 0,
    groqAdmissionFallback: false,
    agenticLlmSlots,
    agenticLlmLastOk,
    agenticLlmLastModel,
    bureauIntegrity,
    bureauIntegrityReasons: reasons,
    assessedAt: new Date().toISOString(),
  };
}
