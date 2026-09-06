import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
const orientationFile = path.join(root, "artifacts/api-server/src/src/lib/apex-bureau-orientation.ts");
let s = fs.readFileSync(file, "utf8");
let orientation = fs.readFileSync(orientationFile, "utf8");

// The Investigator must explicitly choose the research provider. This script
// removes the legacy Serper -> Tavily -> Exa -> DDG trajectory from the active
// runtime while preserving provider-specific transport/key retry inside each
// selected adapter.
s = s.replace(
  '| { action: "web_search"; query: string; thought?: string }',
  '| { action: "web_search"; query: string; provider: "serper" | "tavily" | "exa"; thought?: string }',
);

const start = s.indexOf('async function toolWebSearch(query: string, requestedProvider?: "serper" | "tavily" | "exa")');
const marker = '/** Deterministic contact-surface extractor';
const end = start >= 0 ? s.indexOf(marker, start) : -1;
if (start < 0 || end < 0) throw new Error("investigator provider routing: toolWebSearch block not found");

const replacement = `async function toolWebSearch(query: string, requestedProvider: "serper" | "tavily" | "exa"): Promise<{ text: string; urls: string[]; provider: "serper" | "tavily" | "exa" }> {
  if (requestedProvider === "serper") {
    const r = await toolWebSearchSerper(query);
    return r && r.urls.length ? { ...r, provider: "serper" } : { text: "SERPER requested but unavailable/no results", urls: [], provider: "serper" };
  }
  if (requestedProvider === "tavily") {
    const r = await toolWebSearchTavily(query);
    return r && (r.urls.length || r.text.length > 40) ? { ...r, provider: "tavily" } : { text: "TAVILY requested but unavailable/no results", urls: [], provider: "tavily" };
  }
  const r = await toolWebSearchExa(query);
  return r && (r.urls.length || r.text.length > 40) ? { ...r, provider: "exa" } : { text: "EXA requested but unavailable/no results", urls: [], provider: "exa" };
}

`;
s = s.slice(0, start) + replacement + s.slice(end);

// The promotion-contract transform currently passes an optional provider.
// Narrow that value before invoking the now-explicit capability contract.
s = s.replace(
  '      const sr = await toolWebSearch(action.query, requestedProvider);',
  '      if (!requestedProvider) throw new Error("web_search requires an explicit Investigator-selected provider");\n      const sr = await toolWebSearch(action.query, requestedProvider);',
);

// Make the action parser fail closed if the model omitted the provider choice.
const providerLine = 'const requestedProvider = ["serper", "tavily", "exa"].includes(String(o.provider)) ? (String(o.provider) as "serper" | "tavily" | "exa") : undefined;';
if (s.includes(providerLine) && !s.includes('if (!requestedProvider) return null;')) {
  s = s.replace(providerLine, `${providerLine}\n      if (!requestedProvider) return null;`, 1);
}

// The prompt surface must describe search providers as capabilities selected by
// the Investigator, never as a ranked route. DDG is no longer a research fallback.
orientation = orientation.replace(
  '- web_search — Serper / Tavily / Exa / DDG\nSEARCH/BROWSE TOOLS (not promotion authorities): web_search routes Serper → Tavily → Exa → DDG; visit/browser_fetch may use HTTP then Scrapfly/ZenRows/Browserless. Specialist: domain_lookup, registry_search, footprint_*, harvest_domain. The investigator chooses tools; providers only execute.',
  '- web_search — Investigator-selected Serper / Tavily / Exa\nSEARCH/BROWSE TOOLS (not promotion authorities): web_search executes only the provider explicitly selected by the Investigator; there is no cross-provider research fallback. Provider-specific key/transport retries are execution mechanics only. visit/browser_fetch may use HTTP then Scrapfly/ZenRows/Browserless. Specialist: domain_lookup, registry_search, footprint_*, harvest_domain. The investigator chooses tools; providers only execute.',
);

fs.writeFileSync(file, s);
fs.writeFileSync(orientationFile, orientation);
console.log("DONE apply-investigator-provider-routing");
