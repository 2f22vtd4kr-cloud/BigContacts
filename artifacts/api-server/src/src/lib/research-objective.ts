const PROVIDER_OR_TOOL_NAMES = String.raw\`(?:groq|mistral|serper|tavily|exa|maigret|sherlock|web_search|browser_fetch|registry_search|domain_lookup|harvest_domain|footprint_email|footprint_username_maigret|footprint_username_sherlock)\`;
const PROVIDER_OR_TOOL_DIRECTIVE = new RegExp(
  String.raw\`\b(?:use|call|invoke|run|choose|select|switch\s+to)\s+(?:the\s+)?\${PROVIDER_OR_TOOL_NAMES}\b|\b(?:search|query)\s+(?:with|using|via)\s+(?:the\s+)?\${PROVIDER_OR_TOOL_NAMES}\b|\b(?:via|through)\s+(?:the\s+)?\${PROVIDER_OR_TOOL_NAMES}\b\`,
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
