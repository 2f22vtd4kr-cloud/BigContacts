export interface AIKeySlot {
  index: number;
  state: "active" | "exhausted" | "missing";
  expiresAt: string | null;
}

export interface AIKeyStatus {
  groq: AIKeySlot[];
  perplexity: AIKeySlot[];
  gemini: AIKeySlot[];
  tavily: AIKeySlot[];
  exa: AIKeySlot[];
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
];

export const PROVIDER_LABELS: Record<keyof AIKeyStatus, string> = {
  groq: "Groq LLaMA",
  perplexity: "Perplexity",
  gemini: "Gemini",
  tavily: "Tavily",
  exa: "Exa",
};

export interface ApiKeySummary {
  active: number;
  exhausted: number;
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
        if (slot.state === "active") summary.active += 1;
        if (slot.state === "exhausted") summary.exhausted += 1;
        if (slot.state === "missing") summary.missing += 1;
      }
      return summary;
    },
    { active: 0, exhausted: 0, missing: 0, configured: 0, total: 0 },
  );
}

export async function fetchSystemStatus(base: string, signal?: AbortSignal): Promise<SystemStatus> {
  const response = await fetch(`${base}/api/system/status`, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<SystemStatus>;
}