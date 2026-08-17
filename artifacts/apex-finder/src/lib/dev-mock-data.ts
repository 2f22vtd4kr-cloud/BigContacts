/**
 * Offline UI scaffolding only (?mock=1 / ?demo=1).
 * No seeded people, companies, or fabricated contacts.
 * Production data comes from api-server + Postgres only.
 */

export type MockEntity = {
  id: number;
  name: string;
  type: "HNWI" | "Corporation" | "Trust" | "Gatekeeper";
  nationality: string | null;
  estimatedNetWorth: number | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  contactConfidence: number | null;
  accessScore: number | null;
  contactOutcome: string | null;
  sourceRegistries: string | null;
  linkedinHeadline: string | null;
  isStarred: boolean;
  isHidden: boolean;
  cookedAt: string | null;
  bayesianScore: number | null;
  assetCount?: number;
};

/** Empty on purpose — never ship demo people as if they were researched. */
export const MOCK_ENTITIES: MockEntity[] = [];

export function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  return q.get("mock") === "1" || q.get("demo") === "1";
}

export function mockHotLeads() {
  return [] as Array<{
    entityId: number;
    entityName: string;
    entityType: string;
    nationality: string | null;
    estimatedNetWorth: number | null;
    accessScore: number | null;
    contactConfidence: number | null;
    assetCount: number;
    signalDate: string;
    contactOutcome: string | null;
    email: string | null;
    phone: string | null;
  }>;
}

export function mockDashboardStats() {
  return {
    totalEntities: 0,
    hotLeadsCount: 0,
    totalAssets: 0,
    totalRelationships: 0,
  };
}

/** Neutral idle live-state — no named targets. */
export function mockAtlasLiveState() {
  return {
    runStatus: "idle" as const,
    phase: 0,
    phaseLabel: "IDLE",
    phaseProgress: 0,
    phaseTotal: 7,
    sourceStep: 0,
    sourceTotal: 0,
    currentEntities: [] as string[],
    entityProgress: 0,
    entityTotal: 0,
    detail: "No active research run",
    atlasTelemetry: {
      stage: "Idle",
      status: "idle" as const,
      targetName: undefined as string | undefined,
      targetType: undefined as string | undefined,
      toolIds: [] as string[],
      activeToolId: undefined as string | undefined,
      prompt: undefined as string | undefined,
      inputSummary: undefined as string | undefined,
      resultSummary: undefined as string | undefined,
      sources: 0,
      evidence: 0,
      contacts: 0,
      nextAction: "Launch Apex Atlas to start a research job",
      disposition: undefined as string | undefined,
      personaNames: undefined as string[] | undefined,
    },
    eventLog: [] as Array<Record<string, unknown>>,
  };
}

export function mockLiveNodes(): Set<string> {
  return new Set();
}

/** Provider slots shaped for offline layout only — not live credentials. */
export function mockSystemStatus() {
  const slot = (state: "active" | "rate_limited" | "missing", index: number) => ({
    index,
    state,
    expiresAt: state === "rate_limited" ? new Date(Date.now() + 60_000).toISOString() : null,
  });
  return {
    ai: {
      groq: [slot("missing", 0)],
      perplexity: [slot("missing", 0)],
      gemini: [slot("missing", 0)],
      tavily: [slot("missing", 0)],
      exa: [slot("missing", 0)],
    },
    openResearch: {
      state: "off" as const,
      huggingFace: { configured: false },
      serper: { configured: false },
      adapter: { available: false, model: null },
      mistral: { configured: false, model: null, rateLimit: null },
    },
    bureauReasoning: {
      configured: false,
      model: null,
      endpoint: null,
      role: "right_hand_advisor" as const,
      capability: "case_file_reasoning_only" as const,
    },
    geminiBoss: {
      configured: false,
      model: null,
      role: "head_investigator" as const,
    },
    databases: {
      postgres: { status: "unknown" as const, latencyMs: null },
      localRedis: { status: "unknown", latencyMs: null },
      upstash: [] as Array<{ index: number; status: string; latencyMs: number }>,
    },
    generatedAt: new Date().toISOString(),
    cached: false,
    cachedAgoMs: 0,
  };
}

export function mockIngestJobsPayload() {
  return {
    jobs: [
      {
        id: "sec-edgar",
        status: "idle",
        progress: 0,
        inserted: 0,
        skipped: 0,
        errors: 0,
        message: "Ready",
      },
      {
        id: "companies-house",
        status: "idle",
        progress: 0,
        inserted: 0,
        skipped: 0,
        errors: 0,
        message: "Ready",
      },
    ],
  };
}
