/**
 * Gemini free-tier text model capability registry.
 *
 * The provider owns entitlement and current quota. Apex owns only the
 * role contract: which stable text models are compatible with the
 * Interactions API control-plane payload and which thinking level each
 * model accepts. The live /models catalog remains the source of truth
 * for whether a model is actually exposed to the configured credential.
 */
export type GeminiControlRole = "boss" | "right_hand";

export type GeminiControlModel = {
  model: string;
  thinkingLevel: "minimal" | "low";
  tier: "high_volume" | "standard";
};

const MODELS: Record<string, GeminiControlModel> = {
  "gemini-3.8-flash": { model: "gemini-3.8-flash", thinkingLevel: "low", tier: "standard" },
  "gemini-3.7-flash": { model: "gemini-3.7-flash", thinkingLevel: "low", tier: "standard" },
  "gemini-3.6-flash": { model: "gemini-3.6-flash", thinkingLevel: "minimal", tier: "standard" },
  "gemini-3.5-flash": { model: "gemini-3.5-flash", thinkingLevel: "minimal", tier: "standard" },
  "gemini-3.5-flash-lite": { model: "gemini-3.5-flash-lite", thinkingLevel: "minimal", tier: "high_volume" },
  "gemini-3.1-flash-lite": { model: "gemini-3.1-flash-lite", thinkingLevel: "minimal", tier: "high_volume" },
};

const ROLE_PREFERENCES: Record<GeminiControlRole, readonly string[]> = {
  // Right-hand is called more frequently, so the two current high-volume
  // Flash-Lite models are preferred before spending the smaller standard
  // Flash free-tier pool.  The remaining stable Flash models are still
  // eligible capacity fallbacks.
  right_hand: [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
  ],
  // Boss is a lower-frequency judgment boundary. Prefer the newer standard
  // Flash reasoning models, then fall back to high-volume Flash-Lite models
  // when the standard pool is rate-limited or otherwise unavailable.
  boss: [
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ],
};

export function getGeminiControlModel(model: string): GeminiControlModel | null {
  return MODELS[model] ?? null;
}

export function getGeminiThinkingLevel(model: string): "minimal" | "low" {
  return MODELS[model]?.thinkingLevel ?? "minimal";
}

export function chooseGeminiControlModels(
  role: GeminiControlRole,
  catalogNames: readonly string[],
): string[] {
  const available = new Set(
    catalogNames
      .map((name) => name.replace(/^models\//, ""))
      .filter((name) => Boolean(MODELS[name])),
  );

  return ROLE_PREFERENCES[role].filter((model) => available.has(model));
}

export function getGeminiRolePreferences(role: GeminiControlRole): readonly string[] {
  return ROLE_PREFERENCES[role];
}

export const GEMINI_STABLE_CONTROL_MODELS: readonly GeminiControlModel[] =
  Object.values(MODELS);
