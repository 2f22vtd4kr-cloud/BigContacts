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
  thinkingLevel: "minimal" | "low" | "medium" | "high";
  tier: "high_volume" | "standard";
};

const MODELS: Record<string, GeminiControlModel> = {
  "gemini-3.8-flash": { model: "gemini-3.8-flash", thinkingLevel: "medium", tier: "standard" },
  "gemini-3.7-flash": { model: "gemini-3.7-flash", thinkingLevel: "medium", tier: "standard" },
  "gemini-3.6-flash": { model: "gemini-3.6-flash", thinkingLevel: "low", tier: "standard" },
  "gemini-3.5-flash": { model: "gemini-3.5-flash", thinkingLevel: "low", tier: "standard" },
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

const cooldownUntilByModel = new Map<string, number>();

function cooldownKey(model: string, scope: string): string {
  return `${scope}:${model}`;
}

function setGeminiModelCooldown(model: string, cooldownMs: number, maxCooldownMs: number, scope = "global"): void {
  const bounded = Math.max(1_000, Math.min(maxCooldownMs, Math.floor(cooldownMs)));
  cooldownUntilByModel.set(cooldownKey(model, scope), Date.now() + bounded);
}

export function markGeminiModelRateLimited(model: string, cooldownMs: number, scope = "global"): void {
  setGeminiModelCooldown(model, cooldownMs, 15 * 60_000, scope);
}

export function markGeminiModelDailyQuotaExhausted(model: string, now = Date.now(), scope = "global"): number {
  // Google documents RPD reset at midnight Pacific time. Use a conservative
  // 24-hour cooldown if timezone conversion cannot be established; otherwise
  // release the model shortly after the next Pacific midnight.
  try {
    const zone = "America/Los_Angeles";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(now))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    const localNowMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const offsetMs = localNowMs - now;
    const nextLocalMidnight = new Date(localNowMs);
    nextLocalMidnight.setUTCDate(nextLocalMidnight.getUTCDate() + 1);
    nextLocalMidnight.setUTCHours(0, 0, 0, 0);
    const nextReset = nextLocalMidnight.getTime() - offsetMs;
    const cooldownMs = Math.max(60_000, nextReset - now + 60_000);
    setGeminiModelCooldown(model, cooldownMs, 26 * 60 * 60_000, scope);
    return cooldownMs;
  } catch {
    const cooldownMs = 24 * 60 * 60_000;
    setGeminiModelCooldown(model, cooldownMs, 26 * 60 * 60_000, scope);
    return cooldownMs;
  }
}

export function resetGeminiModelCooldownsForTests(): void {
  cooldownUntilByModel.clear();
}

export function isGeminiModelCoolingDown(model: string, now = Date.now(), scope = "global"): boolean {
  const key = cooldownKey(model, scope);
  const until = cooldownUntilByModel.get(key) ?? 0;
  if (until <= now) {
    cooldownUntilByModel.delete(key);
    return false;
  }
  return true;
}

export function chooseAvailableGeminiControlModels(
  role: GeminiControlRole,
  catalogNames: readonly string[],
  scope = "global",
): string[] {
  const ordered = chooseGeminiControlModels(role, catalogNames);
  const available = ordered.filter((model) => !isGeminiModelCoolingDown(model, Date.now(), scope));
  // If every eligible model is cooling down, do not silently re-enable a
  // known-exhausted model. The caller must fail closed until a cooldown expires.
  return available;
}

export const GEMINI_STABLE_CONTROL_MODELS: readonly GeminiControlModel[] =
  Object.values(MODELS);


export type GeminiThinkingRiskProfile = {
  contradictionPressure?: number;
  identityAmbiguity?: number;
  falsificationRequired?: boolean;
  terminalDecision?: boolean;
  routine?: boolean;
};

/**
 * Select a model-compatible thinking level from epistemic risk. This is a
 * policy helper; callers may still override it for hard provider constraints.
 */
export function chooseAdaptiveGeminiThinkingLevel(
  model: string,
  risk: GeminiThinkingRiskProfile = {},
): GeminiControlModel["thinkingLevel"] {
  const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
  const contradiction = clamp(risk.contradictionPressure ?? 0);
  const ambiguity = clamp(risk.identityAmbiguity ?? 0);
  const normalized = model.replace(/^models\//, "").toLowerCase();
  const lite = normalized.includes("flash-lite");
  if (contradiction >= 0.7 || ambiguity >= 0.8 || risk.falsificationRequired || risk.terminalDecision) {
    return "high";
  }
  if (contradiction >= 0.35 || ambiguity >= 0.45) return "medium";
  if (risk.routine) return lite ? "minimal" : "low";
  return lite ? "low" : "medium";
}
