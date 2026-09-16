import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.join(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
const orientationFile = path.join(root, "artifacts/api-server/src/src/lib/apex-bureau-orientation.ts");
const caseBureauFile = path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts");
const source = fs.readFileSync(file, "utf8");
const orientation = fs.readFileSync(orientationFile, "utf8");
let caseBureau = fs.readFileSync(caseBureauFile, "utf8");

// The canonical source is already installed by the preceding build transforms.
// This compatibility script verifies the explicit provider contract and applies
// one narrow capability-availability guard to the Boss opening prompt. The guard
// does not rank research providers or choose a research trajectory; it only tells
// Gemini which already-allowlisted Investigator adapters are actually configured.
const canonicalRouting =
  source.includes('provider?: "serper" | "tavily" | "exa"') &&
  /async function toolWebSearch\(query: string, requestedProvider\?: "serper" \| "tavily" \| "exa"\)/.test(source) &&
  source.includes("web_search requires an explicit provider selection") &&
  source.includes("if (!requestedProvider) return null;") &&
  orientation.includes("web_search — Investigator-selected Serper / Tavily / Exa") &&
  orientation.includes("there is no cross-provider research fallback");

if (!canonicalRouting) {
  throw new Error(
    "investigator provider routing: canonical explicit Investigator-selected provider contract is missing",
  );
}

if (/Serper\s*→\s*Tavily\s*→\s*Exa|Serper\s*->\s*Tavily\s*->\s*Exa/.test(orientation)) {
  throw new Error("investigator provider routing: obsolete ordered research route remains in orientation");
}

const openingAnchor = 'const prompt = `${buildBossOpeningPrompt(input)}';
const availabilityGuard = `const configuredInvestigatorProviders = [
    process.env.GROQ_API_KEY ? "groq" : null,
    process.env.MISTRAL_API_KEY ? "mistral" : null,
  ].filter((value): value is "groq" | "mistral" => value !== null);
  const investigatorAvailabilityInstruction = configuredInvestigatorProviders.length > 0
    ? \`\\n\\nCAPABILITY AVAILABILITY: only these Investigator adapters are configured and usable for this run: \${configuredInvestigatorProviders.join(", ")}. Gemini must select one of these already-allowlisted Investigator adapters. This is a transport/capability constraint, not a research preference; do not rank providers or choose a research trajectory from it.\`
    : "\\n\\nCAPABILITY AVAILABILITY: no Investigator adapter is configured. Return investigatorLlm=null and fail closed.";
  const prompt = \`\${buildBossOpeningPrompt(input)}\${investigatorAvailabilityInstruction}\`;
`;

if (!caseBureau.includes("const configuredInvestigatorProviders = [")) {
  if (!caseBureau.includes(openingAnchor)) {
    throw new Error("investigator provider routing: Boss discovery prompt anchor missing");
  }
  caseBureau = caseBureau.replace(openingAnchor, availabilityGuard.trimEnd());
  fs.writeFileSync(caseBureauFile, caseBureau);
}

if (!caseBureau.includes("CAPABILITY AVAILABILITY: only these Investigator adapters are configured and usable for this run")) {
  throw new Error("investigator provider routing: Boss capability-availability guard was not installed");
}

console.log("DONE apply-investigator-provider-routing: explicit provider contract and configured-Investigator availability guard verified");