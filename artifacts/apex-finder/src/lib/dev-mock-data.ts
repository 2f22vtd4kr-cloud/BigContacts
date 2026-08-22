/**
 * Offline UI scaffolding (?mock=1 / ?demo=1).
 * Demo entities exist ONLY for layout/screenshot review under mock flags.
 * Production still comes from api-server + Postgres when mock is off.
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

/** Demo ledger rows for ?mock=1 UI review only. */
export const MOCK_ENTITIES: MockEntity[] = [
  {
    id: 9001,
    name: "Demo Person Alpha",
    type: "HNWI",
    nationality: "US",
    estimatedNetWorth: 120_000_000,
    email: "alpha@example-demo.test",
    phone: "+1-555-0101",
    linkedinUrl: "https://www.linkedin.com/in/example",
    twitterHandle: null,
    contactConfidence: 82,
    accessScore: 0.74,
    contactOutcome: "verified",
    sourceRegistries: "demo",
    linkedinHeadline: "Demo role — UI review only",
    isStarred: true,
    isHidden: false,
    cookedAt: new Date().toISOString(),
    bayesianScore: 0.71,
    assetCount: 3,
  },
  {
    id: 9002,
    name: "Demo Holdings Ltd",
    type: "Corporation",
    nationality: "GB",
    estimatedNetWorth: null,
    email: "info@example-demo.test",
    phone: "+44-20-0000-0000",
    linkedinUrl: null,
    twitterHandle: null,
    contactConfidence: 45,
    accessScore: 0.38,
    contactOutcome: "partial",
    sourceRegistries: "demo",
    linkedinHeadline: null,
    isStarred: false,
    isHidden: false,
    cookedAt: new Date().toISOString(),
    bayesianScore: 0.42,
    assetCount: 1,
  },
  {
    id: 9003,
    name: "Demo Trust Beta",
    type: "Trust",
    nationality: "CH",
    estimatedNetWorth: null,
    email: null,
    phone: null,
    linkedinUrl: null,
    twitterHandle: null,
    contactConfidence: 12,
    accessScore: 0.20,
    contactOutcome: "none",
    sourceRegistries: "demo",
    linkedinHeadline: null,
    isStarred: false,
    isHidden: false,
    cookedAt: null,
    bayesianScore: 0.15,
    assetCount: 0,
  },
  {
    id: 9004,
    name: "Demo Gatekeeper",
    type: "Gatekeeper",
    nationality: "US",
    estimatedNetWorth: null,
    email: "gk@example-demo.test",
    phone: null,
    linkedinUrl: null,
    twitterHandle: null,
    contactConfidence: 61,
    accessScore: 0.55,
    contactOutcome: "direct",
    sourceRegistries: "demo",
    linkedinHeadline: "Counsel — demo",
    isStarred: false,
    isHidden: false,
    cookedAt: new Date().toISOString(),
    bayesianScore: 0.5,
    assetCount: 0,
  },
];

export function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  return q.get("mock") === "1" || q.get("demo") === "1";
}

export function mockHotLeads() {
  return MOCK_ENTITIES.filter((e) => e.type === "HNWI" || (e.contactConfidence ?? 0) >= 60).map((e) => ({
    entityId: e.id,
    entityName: e.name,
    entityType: e.type,
    nationality: e.nationality,
    estimatedNetWorth: e.estimatedNetWorth,
    accessScore: e.accessScore,
    contactConfidence: e.contactConfidence,
    assetCount: e.assetCount ?? 0,
    signalDate: new Date().toISOString(),
    contactOutcome: e.contactOutcome,
    email: e.email,
    phone: e.phone,
  }));
}

export function mockDashboardStats() {
  return {
    totalEntities: MOCK_ENTITIES.length,
    hotLeadsCount: MOCK_ENTITIES.filter((e) => (e.contactConfidence ?? 0) >= 70).length,
    totalAssets: MOCK_ENTITIES.reduce((n, e) => n + (e.assetCount ?? 0), 0),
    totalRelationships: 6,
  };
}

export function mockAtlasLiveState() {
  return {
    runStatus: "running" as const,
    phase: 3,
    phaseLabel: "CONTACT SURFACE",
    phaseProgress: 3,
    phaseTotal: 7,
    sourceStep: 2,
    sourceTotal: 5,
    currentEntities: ["Demo Holdings Ltd"],
    entityProgress: 1,
    entityTotal: 3,
    detail: "Mock live desk — UI review only",
    atlasTelemetry: {
      stage: "Web research",
      status: "running" as const,
      targetName: "Demo Holdings Ltd",
      targetType: "company",
      toolIds: ["serp", "fetch", "extract"],
      activeToolId: "fetch",
      prompt: "Public contact surface for Demo Holdings Ltd",
      inputSummary: "Company domain + officer names",
      resultSummary: "2 domain emails · 1 switchboard",
      sources: 4,
      evidence: 7,
      contacts: 2,
      nextAction: "Bind role emails to officers",
      disposition: undefined as string | undefined,
      personaNames: undefined as string[] | undefined,
    },
    eventLog: [
      {
        timestamp: new Date(Date.now() - 180000).toISOString(),
        kind: "narration",
        stage: "Live desk open",
        status: "active",
        actor: "right_hand",
        targetName: "Demo Holdings Ltd",
        story: "Opening on Demo Holdings Ltd — web surface first, then official pages if the SERP hands us a clean domain.",
        narration: "Opening on Demo Holdings Ltd — web surface first, then official pages if the SERP hands us a clean domain.",
      },
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        kind: "telemetry",
        stage: "Web search",
        status: "done",
        targetName: "Demo Holdings Ltd",
        activeToolId: "serper",
        toolIds: ["serper", "google"],
        methodKind: "search",
        actor: "web",
        story: "Done: searched the web for Demo Holdings Ltd officers and contact pages",
        inputSummary: "Demo Holdings Ltd officers contact",
        resultSummary: "Found company site and filings",
        sources: 3,
        narration: "Serper returned the company site plus a filings hit — next hop is the about page, not another blind search.",
      },
      {
        timestamp: new Date(Date.now() - 90000).toISOString(),
        kind: "telemetry",
        stage: "Official records",
        status: "done",
        targetName: "Demo Holdings Ltd",
        activeToolId: "companies-house",
        toolIds: ["companies-house"],
        methodKind: "registry",
        actor: "registry",
        story: "Done: Companies House officers list reviewed",
        inputSummary: "Demo Holdings Ltd",
        resultSummary: "2 officers listed on public register",
        narration: "Registry confirms two named officers — useful anchors if the website stays silent on personal routes.",
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        kind: "telemetry",
        stage: "Reading a page",
        status: "done",
        targetName: "Demo Holdings Ltd",
        activeToolId: "fetch",
        toolIds: ["fetch"],
        methodKind: "fetch",
        actor: "web",
        story: "Done: opened the company about page",
        inputSummary: "https://example-demo.test/about",
        resultSummary: "Page loaded · contact block visible",
        sourceUrls: ["https://example-demo.test/about"],
        links: [{ title: "About", url: "https://example-demo.test/about" }],
        narration: "About page loaded cleanly — extracting domain emails and any officer bylines before we touch social footprint tools.",
      },
      {
        timestamp: new Date(Date.now() - 30000).toISOString(),
        kind: "telemetry",
        stage: "Profile search",
        status: "done",
        targetName: "Demo Holdings Ltd",
        activeToolId: "maigret",
        toolIds: ["maigret", "holehe"],
        methodKind: "footprint",
        actor: "tool",
        story: "Done: username footprint on likely handles",
        resultSummary: "3 platform hits · review only",
        narration: "Footprint tools only confirmed public handles — treating them as soft leads, not verified personal inboxes.",
      },
      {
        timestamp: new Date().toISOString(),
        kind: "telemetry",
        stage: "Writing findings",
        status: "active",
        targetName: "Demo Holdings Ltd",
        activeToolId: "extract",
        toolIds: ["extract"],
        methodKind: "extract",
        actor: "web",
        story: "Now: pulling contact details from the about page",
        inputSummary: "CONTACT FACTS",
        resultSummary: "2 domain emails · 1 switchboard",
        sources: 1,
        contacts: 2,
        narration: "Structuring two domain emails and a switchboard from the about page — nothing personal claimed without a named byline.",
      },
    ],
  };
}

export function mockLiveNodes(): Set<string> {
  return new Set(["serp", "fetch", "extract", "domain"]);
}

export function mockSystemStatus() {
  const slots = (n: number, live: number, cool = 0) =>
    Array.from({ length: n }, (_, index) => ({
      index,
      state: (index < live ? "active" : index < live + cool ? "rate_limited" : "missing") as
        | "active"
        | "rate_limited"
        | "missing",
      expiresAt: index >= live && index < live + cool ? new Date(Date.now() + 60_000).toISOString() : null,
    }));
  return {
    ai: {
      groq: slots(11, 1),
      perplexity: slots(9, 0),
      gemini: slots(11, 1),
      tavily: slots(9, 1),
      exa: slots(11, 2),
    },
    openResearch: {
      state: "ready" as const,
      huggingFace: { configured: true },
      serper: { configured: true },
      adapter: { available: true, model: "demo" },
      mistral: { configured: true, model: "mistral-small", rateLimit: null },
    },
    bureauReasoning: {
      configured: true,
      model: "demo-nim",
      endpoint: "https://example.invalid",
      role: "right_hand_advisor" as const,
      capability: "case_file_reasoning_only" as const,
    },
    geminiBoss: {
      configured: true,
      model: "gemini-demo",
      role: "head_investigator" as const,
    },
    databases: {
      postgres: { status: "ok" as const, latencyMs: 12 },
      localRedis: { status: "ok", latencyMs: 1 },
      upstash: [1, 2, 3, 4, 5].map((index) => ({ index, status: "ok", latencyMs: 20 + index })),
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
        status: "running",
        progress: 42,
        inserted: 12,
        skipped: 3,
        errors: 0,
        message: "Ingest in progress (demo)",
      },
      {
        id: "opencorporates",
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
