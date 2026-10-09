const RESEARCH_PROVIDER_KEY_NAMES = [
  "GROQ_BOSS_API_KEY",
  "GROQ_INVESTIGATOR_API_KEY",
  "GROQ_RIGHT_HAND_API_KEY",
  "GROQ_API_KEY",
  "GROQ_API_KEY_2",
  "GROQ_API_KEY_3",
  "GEMINI_API_KEY",
  "GEMINI_RIGHT_HAND_API_KEY",
  "HF_TOKEN",
  "SERPER_API_KEY",
  "SERPER_API_KEY_2",
  "SERPER_API_KEY_3",
  "SERPER_KEY",
  "TAVILY_API_KEY",
  "SERPAPI_API_KEY",
  "EXA_API_KEY",
  "SCRAPFLY_API_KEY",
  "ZENROWS_API_KEY",
  "COMPANIES_HOUSE_API_KEY",
] as const;

/**
 * Public /healthz reports only whether some research provider capability has a
 * configured credential. Redis health is reported separately and is never
 * evidence that a model or source provider can be called.
 */
export function hasResearchProviderKey(env: Record<string, string | undefined>): boolean {
  return RESEARCH_PROVIDER_KEY_NAMES.some((name) => {
    const value = env[name];
    return typeof value === "string" && value.trim().length > 0;
  });
}
