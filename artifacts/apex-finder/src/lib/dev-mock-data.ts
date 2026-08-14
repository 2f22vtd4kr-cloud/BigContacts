/**
 * DEV-ONLY mock entities for UI verification (no Postgres required).
 * Enable with ?mock=1 on any page. Not production data — Griffin-class shape only.
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

/** Griffin Tool–shaped demo set: personal emails, org inboxes, social, incomplete */
export const MOCK_ENTITIES: MockEntity[] = [
  {
    id: 9001,
    name: "James R. Griffin",
    type: "HNWI",
    nationality: "US",
    estimatedNetWorth: 85_000_000,
    email: "jgriffin@griffin-tool.com",
    phone: "+1-269-555-0142".replace("555", "429"), // personal-looking; not trash 555 in display — use real-shaped
    linkedinUrl: "https://www.linkedin.com/in/james-griffin-tool",
    twitterHandle: null,
    contactConfidence: 82,
    accessScore: 0.78,
    contactOutcome: "direct_contact_verified",
    sourceRegistries: '["Michigan SOS","Companies House"]',
    linkedinHeadline: "Owner · Griffin Tool · Stevensville, MI",
    isStarred: true,
    isHidden: false,
    cookedAt: "2026-08-01T12:00:00Z",
    bayesianScore: 0.81,
    assetCount: 3,
  },
  {
    id: 9002,
    name: "Griffin Tool, Inc.",
    type: "Corporation",
    nationality: "US",
    estimatedNetWorth: null,
    email: "info@griffintool.com",
    phone: "+12694298800",
    linkedinUrl: "https://www.linkedin.com/company/griffin-tool",
    twitterHandle: null,
    contactConfidence: 40,
    accessScore: 0.35,
    contactOutcome: "organization_contact",
    sourceRegistries: '["Michigan SOS"]',
    linkedinHeadline: null,
    isStarred: false,
    isHidden: false,
    cookedAt: null,
    bayesianScore: 0.55,
    assetCount: 1,
  },
  {
    id: 9003,
    name: "Elena Varga",
    type: "Gatekeeper",
    nationality: "UK",
    estimatedNetWorth: null,
    email: "elena.varga@meridian-family.office",
    phone: "+447700900123",
    linkedinUrl: "https://www.linkedin.com/in/elena-varga-fo",
    twitterHandle: "elenavarga_fo",
    contactConfidence: 71,
    accessScore: 0.66,
    contactOutcome: "direct_contact_candidate",
    sourceRegistries: '["Companies House"]',
    linkedinHeadline: "Principal · Meridian Family Office",
    isStarred: false,
    isHidden: false,
    cookedAt: "2026-07-20T09:00:00Z",
    bayesianScore: 0.69,
    assetCount: 0,
  },
  {
    id: 9004,
    name: "Meridian Holdings Ltd",
    type: "Corporation",
    nationality: "UK",
    estimatedNetWorth: null,
    email: "sales@meridianholdings.co.uk",
    phone: null,
    linkedinUrl: null,
    twitterHandle: null,
    contactConfidence: 25,
    accessScore: 0.22,
    contactOutcome: "organization_contact",
    sourceRegistries: '["Companies House"]',
    linkedinHeadline: null,
    isStarred: false,
    isHidden: false,
    cookedAt: null,
    bayesianScore: 0.41,
    assetCount: 5,
  },
  {
    id: 9005,
    name: "Thomas Hale",
    type: "HNWI",
    nationality: "US",
    estimatedNetWorth: 220_000_000,
    email: null,
    phone: null,
    linkedinUrl: "https://www.linkedin.com/in/thomashale",
    twitterHandle: "thale_aviation",
    contactConfidence: 35,
    accessScore: 0.28,
    contactOutcome: "social_only",
    sourceRegistries: '["FAA","EDGAR"]',
    linkedinHeadline: "Aviation investor · Private operator",
    isStarred: false,
    isHidden: false,
    cookedAt: null,
    bayesianScore: 0.62,
    assetCount: 8,
  },
  {
    id: 9006,
    name: "Apex Demo Trust",
    type: "Trust",
    nationality: "CH",
    estimatedNetWorth: null,
    email: null,
    phone: null,
    linkedinUrl: null,
    twitterHandle: null,
    contactConfidence: 0,
    accessScore: 0.05,
    contactOutcome: "evidence_only",
    sourceRegistries: '["OpenOwnership"]',
    linkedinHeadline: null,
    isStarred: false,
    isHidden: false,
    cookedAt: null,
    bayesianScore: 0.2,
    assetCount: 2,
  },
];

// Fix phone for entity 9001 to non-trash shape
MOCK_ENTITIES[0]!.phone = "+12694290142";

export function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mock") === "1"
    || new URLSearchParams(window.location.search).get("demo") === "1";
}

export function mockHotLeads() {
  return MOCK_ENTITIES.filter((e) => (e.accessScore ?? 0) >= 0.25).slice(0, 8).map((e) => ({
    entityId: e.id,
    entityName: e.name,
    entityType: e.type,
    nationality: e.nationality,
    estimatedNetWorth: e.estimatedNetWorth,
    accessScore: e.accessScore,
    contactConfidence: e.contactConfidence,
    assetCount: e.assetCount ?? 0,
    signalDate: "2026-08-10T00:00:00Z",
    contactOutcome: e.contactOutcome,
    email: e.email,
    phone: e.phone,
  }));
}

export function mockDashboardStats() {
  return {
    totalEntities: MOCK_ENTITIES.length,
    hotLeadsCount: MOCK_ENTITIES.filter((e) => (e.accessScore ?? 0) >= 0.55).length,
    totalAssets: MOCK_ENTITIES.reduce((n, e) => n + (e.assetCount ?? 0), 0),
    totalRelationships: 4,
  };
}

/** Mobile / reactor live-state mock for UI verification */
export function mockAtlasLiveState() {
  return {
    runStatus: "running" as const,
    phase: 4,
    phaseLabel: "AI EXTRACTION",
    phaseProgress: 4,
    phaseTotal: 7,
    sourceStep: 3,
    sourceTotal: 6,
    currentEntities: ["James R. Griffin"],
    entityProgress: 1,
    entityTotal: 3,
    detail: "Attributing personal contact vectors for Griffin Tool owner",
    atlasTelemetry: {
      stage: "Contact attribution",
      status: "active" as const,
      targetName: "James R. Griffin",
      targetType: "HNWI · Owner",
      toolIds: ["domain-surface", "tavily", "webdisc", "groq", "contact-facts", "contact-attribution"],
      activeToolId: "contact-attribution",
      prompt: undefined,
      inputSummary: "Stevensville MI · Griffin Tool filings + public web",
      resultSummary: "mailto:jgriffin@griffin-tool.com recovered from public source with attribution",
      sources: 4,
      evidence: 7,
      contacts: 1,
      nextAction: "Verify personal vs org inbox; preserve sourceUrls",
      disposition: "contact_route_found" as const,
      personaNames: undefined,
    },
    eventLog: [
      {
        timestamp: "2026-08-14T05:09:10Z",
        stage: "Domain surface",
        status: "complete",
        targetName: "James R. Griffin",
        activeToolId: "domain-surface",
        inputSummary: "griffin-tool.com WHOIS / RDAP",
        resultSummary: "Registrant org Griffin Tool · MI; admin contact pattern matches owner surname",
      },
      {
        timestamp: "2026-08-14T05:10:00Z",
        stage: "Open web search",
        status: "complete",
        targetName: "James R. Griffin",
        targetType: "HNWI · Owner",
        activeToolId: "tavily",
        inputSummary: "Query: James Griffin Griffin Tool Stevensville MI owner email",
        resultSummary: "https://griffintool.com/about — leadership page; Michigan SOS filing match",
      },
      {
        timestamp: "2026-08-14T05:11:20Z",
        stage: "Browser read",
        status: "complete",
        targetName: "James R. Griffin",
        activeToolId: "webdisc",
        inputSummary: "https://griffintool.com/about",
        resultSummary: "Page lists James R. Griffin as owner/operator · Stevensville, MI",
      },
      {
        timestamp: "2026-08-14T05:12:40Z",
        stage: "LLM extraction",
        status: "complete",
        targetName: "James R. Griffin",
        activeToolId: "groq",
        prompt: "Extract only attributable personal contact vectors for James R. Griffin at Griffin Tool. Never invent emails. Cite sourceUrls.",
        inputSummary: "Page text + SOS excerpt",
        resultSummary: "Candidate email jgriffin@griffin-tool.com cited on about page",
      },
      {
        timestamp: "2026-08-14T05:13:20Z",
        stage: "Contact facts",
        status: "complete",
        targetName: "James R. Griffin",
        activeToolId: "contact-facts",
        inputSummary: "Corroborate mailto vs org-inbox gate",
        resultSummary: "Not info@/sales@ — personal local-part; trash-phone gate N/A for email",
      },
      {
        timestamp: "2026-08-14T05:14:00Z",
        stage: "Contact attribution",
        status: "active",
        targetName: "James R. Griffin",
        activeToolId: "contact-attribution",
        inputSummary: "mailto candidate + public page corroboration",
        resultSummary: "mailto:jgriffin@griffin-tool.com — REACH personal vector · sourceUrls attached",
      },
      {
        timestamp: "2026-08-14T05:14:40Z",
        stage: "Evidence package",
        status: "complete",
        targetName: "James R. Griffin",
        activeToolId: "contact-attribution",
        inputSummary: "Package attributable vectors for analyst review",
        resultSummary: "1 personal email · sourceUrls attached · REACH closed",
      },
    ],

  };
}

export function mockLiveNodes(): Set<string> {
  return new Set(["tavily", "groq", "domain-surface", "contact-facts", "contact-attribution"]);
}
