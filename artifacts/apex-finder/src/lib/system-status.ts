export interface AIKeySlot {
  index: number;
  state: "active" | "rate_limited" | "missing";
  expiresAt: string | null;
}

export interface AIKeyStatus {
  groqInvestigator: AIKeySlot[];
  tavily: AIKeySlot[];
  exa: AIKeySlot[];
  serper: AIKeySlot[];
  serpapi: AIKeySlot[];
}

export interface RoleStatus {
  configured: boolean;
  model: string;
  provider?: string;
}

export interface UpstashSlot {
  slot: number;
  status: string;
  quotaExhausted: boolean;
  latencyMs?: number | null;
}

export interface SystemStatus {
  ai: AIKeyStatus;
  groqBoss?: RoleStatus;
  groqRightHand?: RoleStatus;
  pythonTools?: Record<string, boolean>;
  lanesHonesty?: {
    bureauIntegrity?: string;
    bureauIntegrityReasons?: string[];
    agenticLlmSlots?: number;
    webSearchActive?: number;
    agenticLlmLastOk?: boolean | null;
    agenticLlmLastModel?: string | null;
  };
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
  "groqInvestigator",
  "serper",
  "tavily",
  "exa",
];

export const PROVIDER_LABELS: Record<keyof AIKeyStatus, string> = {
  groqInvestigator: "Groq Investigator",
  serper: "Serper",
  tavily: "Tavily",
  exa: "Exa",
};

export interface ApiKeySummary {
  active: number;
  rateLimited: number;
  missing: number;
  configured: number;
  total: number;
}

export function summarizeApiKeys(status: SystemStatus | null): ApiKeySummary {
  const summary = AI_PROVIDERS.reduce<ApiKeySummary>(
    (current, provider) => {
      const slots = status?.ai?.[provider] ?? [];
      for (const slot of slots) {
        current.total += 1;
        if (slot.state !== "missing") current.configured += 1;
        if (slot.state === "active") current.active += 1;
        if (slot.state === "rate_limited") current.rateLimited += 1;
        if (slot.state === "missing") current.missing += 1;
      }
      return current;
    },
    { active: 0, rateLimited: 0, missing: 0, configured: 0, total: 0 },
  );

  // Control-plane roles are separate single credentials, not search-key pools.
  if (status) {
    for (const role of [status.groqBoss, status.groqRightHand]) {
      summary.total += 1;
      if (role?.configured) {
        summary.configured += 1;
        summary.active += 1;
      } else {
        summary.missing += 1;
      }
    }
  }
  return summary;
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
