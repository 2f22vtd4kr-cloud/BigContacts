import type { Entity } from "@workspace/db";

export type BureauSpecialist = {
  id: string;
  title: string;
  mission: string;
  tools: string[];
  status: "ready" | "waiting_for_key";
};

export type BureauAction = {
  id: string;
  title: string;
  purpose: string;
  specialistId: string;
  tools: string[];
  priority: number;
  status: "queued" | "active" | "complete" | "review";
  rationale: string;
};

export type BureauContactRoute = {
  rank: number;
  tier: string;
  tierLabel: string;
  value: string;
  vectorType: string;
  personName: string | null;
  role: string | null;
  relationship: string | null;
  score: number;
  state: string;
  sourceUrls: string[];
  sourceDomains: string[];
  rationale: string;
  humanReview: "use_judgment";
};

export type ResearchCaseFile = {
  version: 1;
  target: {
    name: string;
    type: string;
    nationality: string | null;
    knownResidences: string[];
    knownDomains: string[];
  };
  hypotheses: string[];
  evidenceSummary: {
    sourceRegistries: string[];
    discoveredPeople: string[];
    relatedOrganizations: string[];
    evidenceCount: number;
    searchGaps: string[];
    negativeFindings: string[];
  };
  specialistRoster: BureauSpecialist[];
  actionQueue: BureauAction[];
  contactRoutes: BureauContactRoute[];
  humanDirectives: string[];
  decisionLog: Array<{
    iteration: number;
    decision: string;
    reason: string;
    createdAt: string;
  }>;
  nextBestAction: BureauAction | null;
  lastUpdatedBy: string;
};

const SPECIALISTS: BureauSpecialist[] = [
  {
    id: "identity",
    title: "Identity Investigator",
    mission: "Resolve the exact person, company, aliases, jurisdiction, and target anchors.",
    tools: ["identity-resolver", "registry-client", "llm-name-validator"],
    status: "ready",
  },
  {
    id: "structure",
    title: "Ownership & Structure Investigator",
    mission: "Map operators, parent groups, directors, beneficial ownership, and named principals.",
    tools: ["GLEIF", "OpenOwnership", "Companies House", "EDGAR", "OCCRP Aleph"],
    status: "ready",
  },
  {
    id: "web",
    title: "Open-Web Investigator",
    mission: "Search official sites, press, biographies, venues, memberships, and public activity for useful leads.",
    tools: ["web-enricher", "Gemini", "Perplexity", "Tavily", "Exa"],
    status: "waiting_for_key",
  },
  {
    id: "footprint",
    title: "Digital Footprint Investigator",
    mission: "Expand public usernames and web presence, then return leads tied to the target context.",
    tools: ["Sherlock", "Maigret", "Holehe", "RDAP", "DNS", "certificate transparency"],
    status: "ready",
  },
  {
    id: "contact",
    title: "Contact Route Investigator",
    mission: "Collect direct, executive, operator, intermediary, social, and organization routes without collapsing them.",
    tools: ["contact-enrichment", "contact-attribution", "route-hierarchy", "graph-engine"],
    status: "ready",
  },
  {
    id: "skeptic",
    title: "Contradiction Investigator",
    mission: "Look for name collisions, stale pages, unrelated people, and evidence that weakens the current hypothesis.",
    tools: ["exact-page validation", "source-reliability", "evidence-ledger", "MCTS"],
    status: "ready",
  },
];

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function uniqueStrings(values: unknown[], limit = 20): string[] {
  const strings: string[] = [];
  for (const value of values) {
    if (typeof value === "string" && value.trim()) strings.push(value.trim());
  }
  return [...new Set(strings)].slice(0, limit);
}

function domainsFromUrls(urls: unknown[]): string[] {
  return uniqueStrings(urls.map((value) => {
    if (typeof value !== "string") return null;
    try {
      return new URL(value).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }).filter(Boolean));
}

function contactTier(route: Record<string, unknown>): { tier: string; label: string; score: number } {
  const relationship = String(route.relationship ?? route.scope ?? "").toLowerCase();
  const tier = String(route.tier ?? "").toLowerCase();
  const value = String(route.value ?? "");
  if (tier.includes("direct") || tier.includes("person") || relationship.includes("target_person")) {
    return { tier: "direct_person", label: "Direct person route", score: 100 };
  }
  if (tier.includes("executive") || relationship.includes("executive") || relationship.includes("director")) {
    return { tier: "executive", label: "Named executive route", score: 82 };
  }
  if (tier.includes("operator") || relationship.includes("operator") || relationship.includes("parent")) {
    return { tier: "operator", label: "Operator / parent route", score: 70 };
  }
  if (tier.includes("intermediary") || relationship.includes("friend") || relationship.includes("family") || relationship.includes("associate")) {
    return { tier: "intermediary", label: "Intermediary route", score: 58 };
  }
  if (/^(info|contact|office|press|hello|enquiries|sales|admin)@/i.test(value) || tier.includes("organization")) {
    return { tier: "organization", label: "Organization route", score: 38 };
  }
  return { tier: "context", label: "Contextual route", score: 24 };
}

function normalizeRoutes(metadata: Record<string, unknown>): BureauContactRoute[] {
  const raw = metadata.routeHierarchy;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((route): route is Record<string, unknown> => Boolean(route) && typeof route === "object")
    .map((route, index) => {
      const urls = uniqueStrings(Array.isArray(route.sourceUrls) ? route.sourceUrls : []);
      const tier = contactTier(route);
      const confidence = typeof route.score === "number" ? route.score : tier.score;
      return {
        rank: index + 1,
        tier: tier.tier,
        tierLabel: tier.label,
        value: String(route.value ?? ""),
        vectorType: String(route.vectorType ?? "route"),
        personName: typeof route.personName === "string" ? route.personName : null,
        role: typeof route.role === "string" ? route.role : null,
        relationship: typeof route.relationship === "string" ? route.relationship : null,
        score: Math.max(0, Math.min(100, Math.round(confidence))),
        state: String(route.state ?? "review"),
        sourceUrls: urls,
        sourceDomains: uniqueStrings(
          Array.isArray(route.sourceDomains) ? route.sourceDomains : domainsFromUrls(urls),
        ),
        rationale: String(route.note ?? "Public route retained for human review."),
        humanReview: "use_judgment",
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((route, index) => ({ ...route, rank: index + 1 }))
    .slice(0, 40);
}

function buildActions(file: Omit<ResearchCaseFile, "actionQueue" | "nextBestAction">): BureauAction[] {
  const actions: BureauAction[] = [];
  const { evidenceSummary, target } = file;
  if (evidenceSummary.discoveredPeople.length === 0) {
    actions.push({
      id: "discover-people",
      title: "Discover named people",
      purpose: "Find principals, executives, operators, staff, and relevant public people tied to the target.",
      specialistId: "web",
      tools: ["web-enricher", "Gemini", "Perplexity", "Tavily", "Exa"],
      priority: 100,
      status: "queued",
      rationale: "The case has no named people to follow yet.",
    });
  }
  if (target.knownDomains.length === 0) {
    actions.push({
      id: "resolve-official-domains",
      title: "Resolve official domains",
      purpose: "Identify the target's official site, operator site, parent group, and exact pages.",
      specialistId: "structure",
      tools: ["domain-resolver", "RDAP", "DNS", "certificate transparency"],
      priority: 96,
      status: "queued",
      rationale: "No trusted domain anchor is present in the case file.",
    });
  }
  if (evidenceSummary.relatedOrganizations.length === 0) {
    actions.push({
      id: "map-ownership-structure",
      title: "Map ownership and structure",
      purpose: "Trace operators, parent groups, entities, directors, and beneficial-owner hypotheses.",
      specialistId: "structure",
      tools: ["GLEIF", "OpenOwnership", "Companies House", "EDGAR", "OCCRP Aleph"],
      priority: 92,
      status: "queued",
      rationale: "Structure evidence is still sparse.",
    });
  }
  actions.push({
    id: "expand-contact-routes",
    title: "Expand the contact hierarchy",
    purpose: "Search direct person, executive, operator, intermediary, social, and organization routes.",
    specialistId: "contact",
    tools: ["contact-enrichment", "contact-attribution", "graph-engine", "route-hierarchy"],
    priority: evidenceSummary.discoveredPeople.length > 0 ? 98 : 80,
    status: "queued",
    rationale: "Every candidate route is retained and ranked for the human operator.",
  });
  actions.push({
    id: "run-digital-footprint",
    title: "Run digital footprint expansion",
    purpose: "Search public usernames and cross-platform traces tied to the target context.",
    specialistId: "footprint",
    tools: ["Sherlock", "Maigret", "Holehe"],
    priority: 72,
    status: "queued",
    rationale: "Digital traces can reveal routes that formal registries miss.",
  });
  actions.push({
    id: "challenge-case",
    title: "Challenge the leading hypothesis",
    purpose: "Search for collisions, stale evidence, unrelated names, and contradictory source material.",
    specialistId: "skeptic",
    tools: ["exact-page validation", "source-reliability", "evidence-ledger", "MCTS"],
    priority: 64,
    status: "queued",
    rationale: "The Head Investigator should actively test its own working theory.",
  });
  return actions.sort((a, b) => b.priority - a.priority);
}

export function buildInitialCaseFile(entity: Entity): ResearchCaseFile {
  const metadata = parseJson<Record<string, unknown>>(entity.metadata, {});
  const investigatorPlan = metadata.investigatorResearchPlan && typeof metadata.investigatorResearchPlan === "object"
    ? metadata.investigatorResearchPlan as Record<string, unknown>
    : {};
  const adaptive = metadata.adaptiveResearchTrace && typeof metadata.adaptiveResearchTrace === "object"
    ? metadata.adaptiveResearchTrace as Record<string, unknown>
    : {};
  const sourceRegistries = parseJson<unknown[]>(entity.sourceRegistries, []);
  const knownResidences = parseJson<unknown[]>(entity.knownResidences, []);
  const discoveredPeople = uniqueStrings([
    ...(Array.isArray(adaptive.discoveredPeople) ? adaptive.discoveredPeople : []),
    ...(Array.isArray(investigatorPlan.namedPeople) ? investigatorPlan.namedPeople : []),
  ]);
  const relatedOrganizations = uniqueStrings([
    ...(Array.isArray(adaptive.relatedOrganizations) ? adaptive.relatedOrganizations : []),
    ...(Array.isArray(investigatorPlan.relatedOrganizations) ? investigatorPlan.relatedOrganizations : []),
  ]);
  const knownDomains = uniqueStrings([
    entity.personalWebsite,
    ...(Array.isArray(adaptive.candidateDomains) ? adaptive.candidateDomains : []),
    ...domainsFromUrls(Array.isArray(adaptive.citations) ? adaptive.citations : []),
  ]);
  const evidenceSummary = {
    sourceRegistries: uniqueStrings(sourceRegistries),
    discoveredPeople,
    relatedOrganizations,
    evidenceCount: typeof adaptive.evidenceCount === "number" ? adaptive.evidenceCount : 0,
    searchGaps: uniqueStrings(Array.isArray(adaptive.searchGaps) ? adaptive.searchGaps : []),
    negativeFindings: uniqueStrings(Array.isArray(adaptive.negativeFindings) ? adaptive.negativeFindings : []),
  };
  const base = {
    version: 1 as const,
    target: {
      name: entity.name,
      type: entity.type,
      nationality: entity.nationality,
      knownResidences: uniqueStrings(knownResidences),
      knownDomains,
    },
    hypotheses: [
      `The target identity is ${entity.type.toLowerCase()} "${entity.name}" and should be resolved before trusting adjacent people.`,
      "Useful access may exist through a named person, operator, executive, intermediary, social presence, or organization.",
    ],
    evidenceSummary,
    specialistRoster: SPECIALISTS,
    contactRoutes: normalizeRoutes(metadata),
    humanDirectives: [],
    decisionLog: [],
    lastUpdatedBy: "local-head-investigator",
  };
  const actionQueue = buildActions(base);
  return {
    ...base,
    actionQueue,
    nextBestAction: actionQueue[0] ?? null,
  };
}

export function parseCaseFile(value: string): ResearchCaseFile | null {
  try {
    const parsed = JSON.parse(value) as ResearchCaseFile;
    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function advanceCaseFile(file: ResearchCaseFile, iteration: number, now = new Date().toISOString()): ResearchCaseFile {
  const next = file.actionQueue.find((action) => action.status === "queued") ?? null;
  const updatedQueue = file.actionQueue.map((action) =>
    action.id === next?.id ? { ...action, status: "active" as const } : action,
  );
  const decision = next
    ? `Assign ${next.title} to ${file.specialistRoster.find((specialist) => specialist.id === next.specialistId)?.title ?? next.specialistId}.`
    : "No queued action remains; keep the case open for a human directive or model-backed re-plan.";
  return {
    ...file,
    actionQueue: updatedQueue,
    nextBestAction: next ? { ...next, status: "active" } : null,
    decisionLog: [...file.decisionLog, { iteration, decision, reason: next?.rationale ?? "Action queue exhausted.", createdAt: now }].slice(-50),
    lastUpdatedBy: "local-head-investigator",
  };
}