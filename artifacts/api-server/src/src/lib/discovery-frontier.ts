/**
 * Apex Atlas discovery frontier.
 *
 * This is advisory state around the model-owned Investigator. It does not select
 * tools, impose a search sequence, or promote evidence. It makes the remaining
 * search space explicit: dimensions, promising branches, bridge entities,
 * negative coverage, and exploration pressure.
 */

export type DiscoveryDimensionName =
  | "jurisdiction"
  | "sector"
  | "role"
  | "wealthMechanism"
  | "asset"
  | "sourceFamily"
  | "language";

export type DiscoveryDimension = {
  name: DiscoveryDimensionName;
  observed: string[];
  hypotheses: string[];
  uncovered: string[];
};

export type DiscoveryFrontierBranch = {
  id: string;
  label: string;
  dimensions: Partial<Record<DiscoveryDimensionName, string>>;
  score: number;
  mode: "exploit" | "explore" | "blind_spot";
  rationale: string;
};

export type DiscoveryBridgeEntity = {
  value: string;
  kind: "person" | "organization" | "asset_or_route";
  role: string | null;
  sourceCount: number;
  bridgeSignals: string[];
};

export type DiscoveryIntelligence = {
  version: 1;
  dimensions: DiscoveryDimension[];
  frontier: DiscoveryFrontierBranch[];
  bridgeEntities: DiscoveryBridgeEntity[];
  negativeCoverage: string[];
  queryTransformFamilies: string[];
  sourceFamilySaturation: string[];
  explorationPolicy: {
    exploitation: number;
    structuredExploration: number;
    blindSpotExploration: number;
    reason: string;
  };
};

type DiscoveryAction = {
  action: string;
  args: Record<string, unknown>;
  execution: string;
  urls: string[];
  findings: Array<{ personName?: string | null; role?: string | null; value?: string; vectorType?: string }>;
};

const DIMENSIONS: DiscoveryDimensionName[] = [
  "jurisdiction",
  "sector",
  "role",
  "wealthMechanism",
  "asset",
  "sourceFamily",
  "language",
];

const JURISDICTIONS = [
  "United States", "Canada", "United Kingdom", "Ireland", "Norway", "Sweden",
  "Denmark", "Finland", "Iceland", "Germany", "France", "Netherlands",
  "Belgium", "Luxembourg", "Switzerland", "Austria", "Italy", "Spain",
  "Portugal", "Poland", "Czech Republic", "Slovakia", "Slovenia", "Croatia",
  "Estonia", "Latvia", "Lithuania", "Australia", "New Zealand", "Japan",
  "South Korea", "Singapore", "United Arab Emirates",
];

const SECTORS = [
  "casino", "gaming", "hospitality", "hotel", "resort", "real estate",
  "private equity", "venture capital", "family office", "investment",
  "technology", "software", "finance", "banking", "shipping", "aviation",
  "yacht", "marina", "energy", "mining", "construction", "media", "sports",
  "luxury", "retail", "manufacturing",
];

const ROLES = [
  "owner", "beneficial owner", "shareholder", "founder", "co-founder",
  "director", "chairman", "chief executive officer", "ceo", "principal",
  "managing partner", "general partner", "partner", "investor", "operator",
];

const WEALTH = [
  "company ownership", "beneficial ownership", "private equity", "venture capital",
  "family office", "investment", "real estate", "asset ownership", "licence",
  "license", "concession", "holding company",
];

const ASSETS = [
  "casino", "hotel", "resort", "estate", "property", "aircraft", "private jet",
  "yacht", "marina", "company", "investment fund", "foundation", "club",
];

const LANGUAGE_HINTS: Record<string, string> = {
  Slovenia: "Slovenian", France: "French", Germany: "German", Italy: "Italian",
  Spain: "Spanish", Portugal: "Portuguese", Norway: "Norwegian", Sweden: "Swedish",
  Denmark: "Danish", Finland: "Finnish", Netherlands: "Dutch", Poland: "Polish",
  Czech: "Czech", Slovakia: "Slovak", Croatia: "Croatian", Japan: "Japanese",
  "South Korea": "Korean",
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function unique(values: string[], limit = 12): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}

function containsTerm(text: string, term: string): boolean {
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);
  return normalizedTerm.length > 1 && normalizedText.includes(normalizedTerm);
}

function observedTerms(texts: string[], vocabulary: string[]): string[] {
  const joined = texts.join("\n");
  return vocabulary.filter((term) => containsTerm(joined, term));
}

function sourceFamilyForAction(action: DiscoveryAction): string {
  if (action.action.includes("registry")) return "registry";
  if (action.action.includes("search")) return "web_search";
  if (action.action === "visit" || action.action === "browser_fetch") return "web_page";
  if (action.action.includes("domain")) return "domain";
  if (action.action.includes("footprint") || action.action.includes("harvest")) return "osint";
  return "agent";
}

function queryTransforms(actions: DiscoveryAction[]): string[] {
  const text = actions
    .map((action) => [
      typeof action.args.query === "string" ? action.args.query : "",
      typeof action.args.hypothesis === "string" ? action.args.hypothesis : "",
      typeof action.args.purpose === "string" ? action.args.purpose : "",
    ].join(" "))
    .join(" ");
  const transforms: string[] = [];
  if (/\\b(owner|ownership|shareholder|beneficial)\\b/i.test(text)) transforms.push("ownership/control terminology");
  if (/\\b(founder|director|chairman|ceo|principal|partner|operator)\\b/i.test(text)) transforms.push("leadership-role terminology");
  if (/\\b(company|holding|subsidiary|parent)\\b/i.test(text)) transforms.push("corporate-structure terminology");
  if (/\\b(property|estate|hotel|resort|yacht|aircraft)\\b/i.test(text)) transforms.push("asset-to-person bridge terminology");
  if (/\\b(licen[cs]e|concession|regulator|registry|filing)\\b/i.test(text)) transforms.push("regulatory/registry terminology");
  if (!transforms.length) transforms.push("objective-language reformulation");
  return unique(transforms, 8);
}

function makeBranch(
  label: string,
  dimensions: Partial<Record<DiscoveryDimensionName, string>>,
  mode: DiscoveryFrontierBranch["mode"],
  score: number,
  rationale: string,
): DiscoveryFrontierBranch {
  const seed = Object.entries(dimensions).map(([key, value]) => key + "=" + value).join("|");
  const id = normalize(label + "|" + seed).replace(/\s+/g, "-").slice(0, 96);
  return { id, label, dimensions, score: Math.max(0, Math.min(1, score)), mode, rationale };
}

export function buildDiscoveryIntelligence(input: {
  objective: string;
  facts?: Array<{ claim: string }>;
  hypotheses?: Array<{ label: string; entity: string; missingDiscriminators: string[] }>;
  negativeFindings?: string[];
  actions?: readonly DiscoveryAction[];
  sourceFamilyDiversity?: number;
  repeatedSourceFamilies?: string[];
}): DiscoveryIntelligence {
  const actions = [...(input.actions ?? [])];
  const textCorpus = [
    input.objective,
    ...(input.facts ?? []).map((fact) => fact.claim),
    ...(input.hypotheses ?? []).flatMap((item) => [item.label, item.entity, ...item.missingDiscriminators]),
    ...actions.flatMap((action) => [
      typeof action.args.query === "string" ? action.args.query : "",
      typeof action.args.hypothesis === "string" ? action.args.hypothesis : "",
      typeof action.args.purpose === "string" ? action.args.purpose : "",
      ...action.findings.map((finding) => [finding.personName, finding.role, finding.value].filter(Boolean).join(" ")),
    ]),
  ];
  const dimensions: DiscoveryDimension[] = DIMENSIONS.map((name) => {
    if (name === "jurisdiction") {
      const observed = observedTerms(textCorpus, JURISDICTIONS);
      return { name, observed, hypotheses: [], uncovered: observed.length ? [] : ["jurisdiction not yet resolved"] };
    }
    if (name === "sector") {
      const observed = observedTerms(textCorpus, SECTORS);
      return { name, observed, hypotheses: [], uncovered: observed.length ? [] : ["sector not yet resolved"] };
    }
    if (name === "role") {
      const observed = observedTerms(textCorpus, ROLES);
      return { name, observed, hypotheses: [], uncovered: observed.length ? [] : ["owner/founder/director/partner terminology remains unexplored"] };
    }
    if (name === "wealthMechanism") {
      const observed = observedTerms(textCorpus, WEALTH);
      return { name, observed, hypotheses: [], uncovered: observed.length ? [] : ["ownership/investment mechanism not yet resolved"] };
    }
    if (name === "asset") {
      const observed = observedTerms(textCorpus, ASSETS);
      return { name, observed, hypotheses: [], uncovered: observed.length ? [] : ["asset or business vehicle not yet resolved"] };
    }
    if (name === "sourceFamily") {
      const observed = unique(actions.map(sourceFamilyForAction));
      const allFamilies = ["registry", "web_search", "web_page", "government", "professional", "domain", "osint"];
      return { name, observed, hypotheses: [], uncovered: allFamilies.filter((family) => !observed.includes(family)).slice(0, 8) };
    }
    const observed = unique(Object.entries(LANGUAGE_HINTS).filter(([country]) => textCorpus.some((text) => containsTerm(text, country))).map(([, language]) => language));
    return { name, observed, hypotheses: [], uncovered: observed.length ? [] : ["local-language query is an untested hypothesis"] };
  });

  const observedFamilies = new Set(dimensions.find((d) => d.name === "sourceFamily")?.observed ?? []);
  const repeatedFamilies = unique(input.repeatedSourceFamilies ?? []);
  const bridgeMap = new Map<string, DiscoveryBridgeEntity>();
  for (const action of actions) {
    for (const finding of action.execution === "success" ? action.findings : []) {
      const value = (finding.personName ?? finding.value ?? "").trim();
      if (!value) continue;
      const key = normalize(value);
      const existing = bridgeMap.get(key);
      const signal = finding.role ? "role:" + finding.role : finding.vectorType ? "vector:" + finding.vectorType : "observed finding";
      if (existing) {
        existing.sourceCount += action.urls.length ? new Set(action.urls).size : 1;
        existing.bridgeSignals = unique([...existing.bridgeSignals, signal], 8);
      } else {
        bridgeMap.set(key, {
          value,
          kind: finding.personName ? "person" : finding.vectorType === "website" ? "organization" : "asset_or_route",
          role: finding.role ?? null,
          sourceCount: action.urls.length ? new Set(action.urls).size : 1,
          bridgeSignals: [signal],
        });
      }
    }
  }
  const bridgeEntities = [...bridgeMap.values()]
    .sort((a, b) => (b.bridgeSignals.length + b.sourceCount * 0.1) - (a.bridgeSignals.length + a.sourceCount * 0.1))
    .slice(0, 8);

  const observed = Object.fromEntries(dimensions.map((d) => [d.name, d.observed])) as Record<DiscoveryDimensionName, string[]>;
  const frontier: DiscoveryFrontierBranch[] = [];
  const jurisdiction = observed.jurisdiction[0];
  const sector = observed.sector[0];
  const role = observed.role[0];
  const wealthMechanism = observed.wealthMechanism[0];
  const asset = observed.asset[0];

  if (jurisdiction && sector) {
    frontier.push(makeBranch(
      jurisdiction + " " + sector + " ownership/control",
      { jurisdiction, sector, role: role ?? "owner / director / shareholder", wealthMechanism: wealthMechanism ?? "company ownership" },
      repeatedFamilies.length ? "explore" : "exploit",
      repeatedFamilies.length ? 0.78 : 0.86,
      repeatedFamilies.length ? "Core hypothesis is promising, but repeated source families create saturation pressure." : "Core objective dimensions are present; pursue the strongest attributable ownership/control route.",
    ));
  }
  if (sector) {
    frontier.push(makeBranch(
      sector + " asset/vehicle bridges",
      { sector, asset: asset ?? sector, role: "owner / operator / investor" },
      "explore",
      0.72,
      "Use the business or asset as a bridge to people instead of searching only for people directly.",
    ));
  }
  if (jurisdiction) {
    const language = LANGUAGE_HINTS[jurisdiction];
    frontier.push(makeBranch(
      jurisdiction + " local-language discovery",
      { jurisdiction, language: language ?? "local language", sourceFamily: "web_search" },
      "blind_spot",
      0.62,
      "Test whether English-only discovery is hiding local ownership, regulatory, or business sources. This is a query hypothesis, not evidence.",
    ));
  }
  if (role) {
    frontier.push(makeBranch(
      role + " synonym expansion",
      { role, sector: sector ?? "objective sector", sourceFamily: "web_search" },
      "explore",
      0.58,
      "Vary leadership/control terminology to avoid vocabulary lock-in.",
    ));
  }
  if (bridgeEntities.length) {
    const bridge = bridgeEntities[0]!;
    frontier.push(makeBranch(
      "bridge through " + bridge.value,
      { role: bridge.role ?? "identified person/route", sourceFamily: "web_page" },
      "exploit",
      Math.min(0.9, 0.68 + bridge.bridgeSignals.length * 0.05),
      "Observed entity has multiple signals and can open additional organization, ownership, asset, or contact branches.",
    ));
  }

  const uncoveredDimensions = dimensions.filter((dimension) => dimension.uncovered.length).map((dimension) => dimension.name);
  if (uncoveredDimensions.length) {
    frontier.push(makeBranch(
      "uncovered discovery dimensions",
      Object.fromEntries(uncoveredDimensions.slice(0, 4).map((dimension) => [dimension, "unknown"])) as Partial<Record<DiscoveryDimensionName, string>>,
      "blind_spot",
      0.5,
      "At least one important discovery dimension remains unresolved; deliberately test it before declaring the search space exhausted.",
    ));
  }

  const sourceFamilySaturation = repeatedFamilies.length
    ? repeatedFamilies.map((family) => family + " repeated/saturated")
    : observedFamilies.size >= 3 ? ["No major source-family saturation detected."] : ["Source-family diversity is still shallow."];

  const explorationPressure = Math.min(1, repeatedFamilies.length * 0.15 + (observedFamilies.size < 3 ? 0.25 : 0));
  const blindSpotPressure = Math.min(1, 0.1 + (uncoveredDimensions.length * 0.08) + (repeatedFamilies.length ? 0.12 : 0));
  const structuredExploration = Math.max(0.15, Math.min(0.35, 0.2 + explorationPressure * 0.15));
  const blindSpotExploration = Math.max(0.1, Math.min(0.25, blindSpotPressure));
  const exploitation = Math.max(0.4, 1 - structuredExploration - blindSpotExploration);

  return {
    version: 1,
    dimensions,
    frontier: frontier.sort((a, b) => b.score - a.score).slice(0, 8),
    bridgeEntities,
    negativeCoverage: unique((input.negativeFindings ?? []).slice(-12), 12),
    queryTransformFamilies: queryTransforms(actions),
    sourceFamilySaturation,
    explorationPolicy: {
      exploitation,
      structuredExploration,
      blindSpotExploration,
      reason: "Allocation is advisory: the Investigator still chooses the next action. Exploration prevents successful source families from monopolizing discovery.",
    },
  };
}

export function renderDiscoveryIntelligence(value: DiscoveryIntelligence, maxChars = 5_000): string {
  const bounded = {
    version: value.version,
    dimensions: value.dimensions,
    frontier: value.frontier.slice(0, 8),
    bridgeEntities: value.bridgeEntities.slice(0, 8),
    negativeCoverage: value.negativeCoverage.slice(-10),
    queryTransformFamilies: value.queryTransformFamilies,
    sourceFamilySaturation: value.sourceFamilySaturation,
    explorationPolicy: value.explorationPolicy,
  };
  const header = "DISCOVERY FRONTIER (advisory search-space state; not a scripted route):";
  const guidance = "Treat frontier branches as hypotheses, not facts. The Investigator owns the next action. Prefer information gain, bridge entities, independent source families, and explicit negative/disconfirming tests. Deliberately explore at least some uncovered or saturated dimensions when useful; never treat a branch score as permission or evidence.";
  const body = JSON.stringify(bounded);
  const budget = Math.max(1_500, Math.min(8_000, Math.floor(maxChars)));
  if ((header + body + guidance).length <= budget) return [header, body, guidance].join("\n");
  const available = Math.max(0, budget - header.length - guidance.length - 8);
  return [header, body.slice(0, Math.floor(available * 0.6)), "[DISCOVERY FRONTIER BOUND: durable state remains outside prompt]", body.slice(-Math.floor(available * 0.4)), guidance].join("\n").slice(0, budget);
}
