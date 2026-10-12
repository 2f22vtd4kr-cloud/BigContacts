const DIRECTIVE_TARGET = String.raw`(?:groq|mistral|serper|tavily|exa|scrapfly|zenrows|browserless|playwright|rdap|whoisjson|holehe|maigret|sherlock|theharvester|spiderfoot|web_search|parallel_web_search|visit|browser_fetch|registry_search|domain_lookup|harvest_domain|footprint_email|footprint_username_maigret|footprint_username_sherlock|footprint_spiderfoot|done)`;
const PROVIDER_OR_TOOL_DIRECTIVE = new RegExp(
  String.raw`\b(?:use|call|invoke|run|choose|select|switch\s+to)\s+(?:the\s+)?${DIRECTIVE_TARGET}\b|\b(?:search|query)\s+(?:with|using|via)\s+(?:the\s+)?${DIRECTIVE_TARGET}\b|\b(?:via|through)\s+(?:the\s+)?${DIRECTIVE_TARGET}\b`,
  "i",
);
const EXPLICIT_URL = /https?:\/\/|www\.[^\s]+/i;
const TOOL_DIRECTIVE = /\b(?:visit|open|fetch)\s+(?:https?:\/\/|www\.)/i;

export function validateResearchObjective(direction: string | null | undefined): { valid: true; direction: string } | { valid: false; reason: string } {
  const value = typeof direction === "string" ? direction.trim().slice(0, 1800) : "";
  if (!value) return { valid: false, reason: "Research redirect contained no research objective." };
  if (PROVIDER_OR_TOOL_DIRECTIVE.test(value)) return { valid: false, reason: "Research redirect attempted to prescribe an Investigator provider or tool." };
  if (EXPLICIT_URL.test(value) || TOOL_DIRECTIVE.test(value)) return { valid: false, reason: "Research redirect attempted to prescribe a concrete URL/tool destination." };
  return { valid: true, direction: value };
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
  const pivotPrefix = `${baseObjective}\\n\\nBOSS-DIRECTED RESEARCH QUESTION / PIVOT:\\n`;
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
