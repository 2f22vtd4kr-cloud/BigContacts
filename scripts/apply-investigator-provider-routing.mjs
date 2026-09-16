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
// two narrow runtime guards: actual Investigator capability availability is shown
// to Gemini, and transient Gemini Boss capacity errors are retried locally at the
// Boss call site. Neither guard chooses a research trajectory or ranks providers.
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
}

const retryInitAnchor = "  let lastError = `Gemini Boss ${selection.model} did not return text.`;";
const retryInitReplacement = `${retryInitAnchor}\n  let transientCapacityAttempts = 0;`;
if (!caseBureau.includes("let transientCapacityAttempts = 0;")) {
  if (!caseBureau.includes(retryInitAnchor)) {
    throw new Error("investigator provider routing: Gemini Boss retry anchor missing");
  }
  caseBureau = caseBureau.replace(retryInitAnchor, retryInitReplacement);
}

const transientBlock = `        if (response.status === 429 || response.status === 503) {
          const detail = (await response.text().catch(() => "")).slice(0, 300);
          lastError = \`Gemini Boss \${model} text-generation HTTP \${response.status}\${detail ? \`: \${detail}\` : ""}\`;
          logger.warn(
            { model, status: response.status, keyName: entry.name, detail, attempt: transientCapacityAttempts + 1 },
            "Gemini Boss text-generation capacity busy; retrying bounded Boss transport attempt",
          );
          if (transientCapacityAttempts < 3) {
            transientCapacityAttempts += 1;
            await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (transientCapacityAttempts - 1)));
            continue;
          }
          return { model, raw: null, error: lastError };
        }`;

const oldTransientBlock = `        if (response.status === 429 || response.status === 503) {
          const detail = (await response.text().catch(() => "")).slice(0, 300);
          lastError = \`Gemini Boss \${model} text-generation HTTP \${response.status}\${detail ? \`: \${detail}\` : ""}\`;
          logger.warn(
            { model, status: response.status, keyName: entry.name, detail },
            "Gemini Boss text-generation capacity busy; stopping this Boss attempt (not a web-search failure)",
          );
          // A 429/503 is commonly project/model capacity, not a model-local
          // failure. Do not fan out across the catalog and spend more quota.
          return { model, raw: null, error: lastError };
        }`;

if (!caseBureau.includes("retrying bounded Boss transport attempt")) {
  if (!caseBureau.includes(oldTransientBlock)) {
    throw new Error("investigator provider routing: Gemini Boss transient block anchor missing");
  }
  caseBureau = caseBureau.replace(oldTransientBlock, transientBlock);
}

fs.writeFileSync(caseBureauFile, caseBureau);

if (!caseBureau.includes("CAPABILITY AVAILABILITY: only these Investigator adapters are configured and usable for this run")) {
  throw new Error("investigator provider routing: Boss capability-availability guard was not installed");
}
if (!caseBureau.includes("retrying bounded Boss transport attempt")) {
  throw new Error("investigator provider routing: bounded Gemini Boss transient retry was not installed");
}

console.log("DONE apply-investigator-provider-routing: explicit provider contract, configured-Investigator availability, and bounded Boss retry verified");