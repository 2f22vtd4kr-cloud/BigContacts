const RESEARCH_PROVIDER_KEY_NAMES = [
  "GROQ_BOSS_API_KEY",
  ...Array.from({ length: 10 }, (_, index) => `GROQ_BOSS_API_KEY_${index + 1}`),
  "GROQ_INVESTIGATOR_API_KEY",
  ...Array.from({ length: 7 }, (_, index) => `GROQ_INVESTIGATOR_API_KEY_${index + 1}`),
  "GROQ_RIGHT_HAND_API_KEY",
  ...Array.from({ length: 5 }, (_, index) => `GROQ_RIGHT_HAND_API_KEY_${index + 1}`),
  "SERPER_API_KEY",
  "SERPER_API_KEY_2",
  "SERPER_API_KEY_3",
  "SERPER_KEY",
  "TAVILY_API_KEY",
  ...Array.from({ length: 8 }, (_, index) => `TAVILY_API_KEY_${index + 1}`),
  "EXA_API_KEY",
  "EXA_1",
  "EXA_2",
  ...Array.from({ length: 8 }, (_, index) => `EXA_API_KEY_${index + 1}`),
  "SCRAPFLY_API_KEY",
  "ZENROWS_API_KEY",
  "COMPANIES_HOUSE_API_KEY",
] as const;

/**
 * Public /healthz reports only whether a canonical model or research-source
 * capability has a configured credential. Retired provider keys, generic
 * legacy Groq keys, HF_TOKEN alone, and Redis URLs do not make research ready.
 * Redis health is reported separately and is never evidence that a model or
 * source provider can be called.
 */
export function hasResearchProviderKey(env: Record<string, string | undefined>): boolean {
  return RESEARCH_PROVIDER_KEY_NAMES.some((name) => {
    const value = env[name];
    return typeof value === "string" && value.trim().length > 0;
  });
}
