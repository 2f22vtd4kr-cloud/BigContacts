export interface AIKeySlot {
  index: number;
  state: "active" | "rate_limited" | "missing";
  expiresAt: string | null;
}

export interface AIKeyStatus {
  groq: AIKeySlot[];
  perplexity: AIKeySlot[];
  gemini: AIKeySlot[];
  tavily: AIKeySlot[];
  exa: AIKeySlot[];
  serper: AIKeySlot[];
  mistral: AIKeySlot[];
  nvidia: AIKeySlot[];
}

export interface UpstashSlot {
  slot: number;
  status: string;
  quotaExhausted: boolean;
  latencyMs?: number | null;
}

export interface SystemStatus {
  ai: AIKeyStatus;
  databases: {
    postgres: { status: "ok" | "error"; latencyMs: number | null };
    localRedis: { status: string; latencyMs: number | null };
    upstash: UpstashSlot[];
  };
  generatedAt: string;
  cached: boolean;
  cachedAgoMs: number;
}

export const AI_PROVIDERS: Array<keyof AIKeyStatus> = [
  "groq",
  "perplexity",
  "gemini",
  "tavily",
  "exa",
  "serper",
  "mistral",
  "nvidia",
];

export const PROVIDER_LABELS: Record<keyof AIKeyStatus, string> = {
  groq: "Groq LLaMA",
  perplexity: "Perplexity",
  gemini: "Gemini",
  tavily: "Tavily",
  exa: "Exa",
  serper: "Serper",
  mistral: "Mistral",
  nvidia: "NVIDIA NIM",
};

export interface ApiKeySummary {
  active: number;
  rateLimited: number;
  missing: number;
  configured: number;
  total: number;
}

export function summarizeApiKeys(status: SystemStatus | null): ApiKeySummary {
  return AI_PROVIDERS.reduce<ApiKeySummary>(
    (summary, provider) => {
      const slots = status?.ai?.[provider] ?? [];
      for (const slot of slots) {
        summary.total += 1;
        if (slot.state !== "missing") summary.configured += 1;
        if (slot.state === "active") summary.active += 1;
        if (slot.state === "rate_limited") summary.rateLimited += 1;
        if (slot.state === "missing") summary.missing += 1;
      }
      return summary;
    },
    { active: 0, rateLimited: 0, missing: 0, configured: 0, total: 0 },
  );
}

export function getSoonestReset(status: SystemStatus | null): string | null {
  const timestamps = AI_PROVIDERS.flatMap((provider) =>
    (status?.ai?.[provider] ?? [])
      .filter((slot) => slot.state === "rate_limited" && slot.expiresAt)
      .map((slot) => slot.expiresAt as string),
  );
  return timestamps.sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
}

export async function fetchSystemStatus(base: string, signal?: AbortSignal): Promise<SystemStatus> {
  const response = await fetch(`${base}/api/system/status`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.text();
  const trimmed = body.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    throw new Error(`Expected JSON, got non-json body`);
  }
  return JSON.parse(trimmed) as SystemStatus;
}