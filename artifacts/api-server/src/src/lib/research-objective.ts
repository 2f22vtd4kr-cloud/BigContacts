const DIRECTIVE_TARGET = String.raw`(?:groq|mistral|serper|tavily|exa|scrapfly|zenrows|browserless|playwright|rdap|whoisjson|holehe|maigret|sherlock|theharvester|spiderfoot|web_search|parallel_web_search|visit|browser_fetch|registry_search|domain_lookup|harvest_domain|footprint_email|footprint_username_maigret|footprint_username_sherlock|footprint_spiderfoot|done)`;
const PROVIDER_OR_TOOL_DIRECTIVE = new RegExp(
  String.raw`\b(?:use|call|invoke|run|choose|select|switch\s+to)\s+(?:the\s+)?${DIRECTIVE_TARGET}\b|\b(?:search|query)\s+(?:with|using|via)\s+(?:the\s+)?${DIRECTIVE_TARGET}\b|\b(?:via|through)\s+(?:the\s+)?${DIRECTIVE_TARGET}\b`,
  "i",
);
const GENERIC_PROVIDER_OR_TOOL_DIRECTIVE = /\b(?:switch|change|move|fall\s+back)\s+to\s+(?:(?:a|an|the)\s+)?(?:(?:different|alternative|alternate|another)\s+)?(?:osint\s+)?(?:provider|tool|scraper|search\s+engine)\b/i;
const EXPLICIT_URL = /https?:\/\/|www\.[^\s]+/i;
const TOOL_DIRECTIVE = /\b(?:visit|open|fetch)\s+(?:https?:\/\/|www\.)/i;
const SEARCH_QUERY_OPERATOR = /\b(?:site|inurl|intitle|allinurl|allintitle|filetype|intext):\s*\S+/i;
const UNRESOLVED_TEMPLATE_PLACEHOLDER = /(?:\[\s*(?:country|country name|target country|city|state|province|region|location|geography|market|sector|industry|company(?: name)?|person(?: name)?|name|url|domain|query|search query|source)\s*\]|\{\{\s*(?:country|country name|target country|city|state|province|region|location|geography|market|sector|industry|company(?: name)?|person(?: name)?|name|url|domain|query|search query|source)\s*\}\}|\{\s*(?:country|country name|target country|city|state|province|region|location|geography|market|sector|industry|company(?: name)?|person(?: name)?|name|url|domain|query|search query|source)\s*\}|<\s*(?:country|country name|target country|city|state|province|region|location|geography|market|sector|industry|company(?: name)?|person(?: name)?|name|url|domain|query|search query|source)\s*>|\b(?:TODO|TBD|CHANGEME|REPLACE_ME|INSERT_[A-Z0-9_]+)\b)/i;

export function validateResearchObjective(direction: string | null | undefined): { valid: true; direction: string } | { valid: false; reason: string } {
  const value = typeof direction === "string" ? direction.trim().slice(0, 1800) : "";
  if (!value) return { valid: false, reason: "Research redirect contained no research objective." };
  if (UNRESOLVED_TEMPLATE_PLACEHOLDER.test(value)) return { valid: false, reason: "Research redirect contains an unresolved template placeholder." };
  if (PROVIDER_OR_TOOL_DIRECTIVE.test(value) || GENERIC_PROVIDER_OR_TOOL_DIRECTIVE.test(value)) return { valid: false, reason: "Research redirect attempted to prescribe an Investigator provider or tool." };
  if (SEARCH_QUERY_OPERATOR.test(value)) return { valid: false, reason: "Research redirect attempted to prescribe a search-engine query operator." };
  if (EXPLICIT_URL.test(value) || TOOL_DIRECTIVE.test(value)) return { valid: false, reason: "Research redirect attempted to prescribe a concrete URL/tool destination." };
  return { valid: true, direction: value };
}

/**
 * Resolve the opening Boss direction only when Right-hand explicitly approves it
 * and the direction satisfies the same runtime contract used for later pivots.
 * Approval activates a research scope; it does not turn a Boss hypothesis into
 * observed source evidence or give Right-hand authority over tool selection.
 */
export type ApprovedOpeningDirectionResolution =
  | { status: "approved"; direction: string; reason: null }
  | { status: "not_approved" | "missing" | "invalid"; direction: null; reason: string };

export function resolveApprovedOpeningDirection(input: {
  rightHandDecision: unknown;
  firstDirection: unknown;
}): ApprovedOpeningDirectionResolution {
  const decision = typeof input.rightHandDecision === "string" ? input.rightHandDecision.trim() : "";
  if (!/^approv(?:e|ed)\b/i.test(decision)) {
    return { status: "not_approved", direction: null, reason: "Right-hand did not approve the opening direction." };
  }

  if (typeof input.firstDirection !== "string" || !input.firstDirection.trim()) {
    return { status: "missing", direction: null, reason: "Right-hand approved the opening review, but Boss supplied no first research direction." };
  }
  const direction = input.firstDirection.trim();
  if (direction.length > 1_200) {
    return { status: "invalid", direction: null, reason: "The opening research direction exceeds the 1200-character control bound." };
  }

  const validated = validateResearchObjective(direction);
  if (!validated.valid) {
    return { status: "invalid", direction: null, reason: validated.reason };
  }
  return { status: "approved", direction: validated.direction, reason: null };
}

export function formatBossDirectedObjective(baseObjective: string, direction: string): string {
  return `${baseObjective.trim()}\n\nBOSS-DIRECTED RESEARCH QUESTION / PIVOT:\n${direction.trim()}`;
}

export type AtlasDiscoveryDirectionAction = "continue_discovery" | "pivot_discovery";
export type ResolvedAtlasDiscoveryObjective =
  | { valid: true; objective: string; direction: string; reusedCurrentObjective: boolean }
  | { valid: false; reason: string };

/**
 * A directionless continuation means "continue the accepted objective", not
 * "invent a generic redirect". A pivot, by contrast, must supply and pass
 * validation for a new direction before it can execute.
 */
export function resolveBossDirectedDiscoveryObjective(input: {
  action: AtlasDiscoveryDirectionAction;
  baseObjective: string;
  currentObjective: string;
  direction: string | null | undefined;
}): ResolvedAtlasDiscoveryObjective {
  const proposed = typeof input.direction === "string" ? input.direction.trim() : "";
  if (input.action === "continue_discovery" && !proposed) {
    const current = input.currentObjective.trim();
    if (!current) return { valid: false, reason: "Cannot continue discovery because no accepted active research objective exists." };
    return { valid: true, objective: current, direction: current, reusedCurrentObjective: true };
  }
  const validated = validateResearchObjective(proposed);
  if (!validated.valid) return validated;
  return {
    valid: true,
    direction: validated.direction,
    objective: formatBossDirectedObjective(input.baseObjective, validated.direction),
    reusedCurrentObjective: false,
  };
}


export type RestoredDiscoveryObjective = {
  baseObjective: string;
  activeObjective: string;
  restoredPivot: boolean;
};

/**
 * Recover the last accepted discovery objective from durable case state.
 * Only accept the exact base-objective + canonical pivot-marker format written
 * by formatBossDirectedObjective, and revalidate the persisted direction before
 * allowing it to steer a resumed investigation.
 */
export function restorePersistedDiscoveryObjective(input: {
  defaultBaseObjective: string;
  persistedBaseObjective?: unknown;
  persistedActiveObjective?: unknown;
}): RestoredDiscoveryObjective {
  const defaultBase = input.defaultBaseObjective.trim();
  const storedBase = typeof input.persistedBaseObjective === "string"
    ? input.persistedBaseObjective.trim()
    : "";
  const baseObjective = storedBase && storedBase.length <= 32_000
    ? storedBase
    : defaultBase;
  const storedActive = typeof input.persistedActiveObjective === "string"
    ? input.persistedActiveObjective.trim()
    : "";
  if (!baseObjective || baseObjective.length > 32_000) {
    return { baseObjective: defaultBase, activeObjective: defaultBase, restoredPivot: false };
  }
  if (!storedActive || storedActive === baseObjective) {
    return { baseObjective, activeObjective: baseObjective, restoredPivot: false };
  }
  const pivotPrefix = `${baseObjective}\n\nBOSS-DIRECTED RESEARCH QUESTION / PIVOT:\n`;
  if (!storedActive.startsWith(pivotPrefix) || storedActive.length > 34_000) {
    return { baseObjective, activeObjective: baseObjective, restoredPivot: false };
  }
  const persistedDirection = storedActive.slice(pivotPrefix.length).trim();
  const validated = validateResearchObjective(persistedDirection);
  if (!validated.valid || validated.direction !== persistedDirection) {
    return { baseObjective, activeObjective: baseObjective, restoredPivot: false };
  }
  return {
    baseObjective,
    activeObjective: formatBossDirectedObjective(baseObjective, persistedDirection),
    restoredPivot: true,
  };
}
