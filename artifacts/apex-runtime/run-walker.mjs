/**
 * Minimal Apex Atlas agentic runtime — runs production runAgenticWebResearch.
 * Requires env: SERPER_API_KEY, GROQ_API_KEY, WHOISJSON_API_KEY (optional TAVILY_API_KEY).
 * Never commit secrets.
 */
import { writeFileSync } from "node:fs";

const required = ["SERPER_API_KEY", "GROQ_API_KEY"];
for (const k of required) {
  if (!process.env[k]) {
    console.error(`Missing env ${k}`);
    process.exit(1);
  }
}

const { runAgenticWebResearch } = await import("./lib/agentic-web-research.ts");

console.error("Starting Apex agentic research on Walker Tool & Die…");
const result = await runAgenticWebResearch({
  targetName: "Walker Tool & Die",
  companyName: "Walker Tool & Die, Inc.",
  objective:
    "Recover public contact surface for Walker Tool & Die, Grand Rapids MI: org email, phone, address, website, named officers/owners (Hendricks, Umlor), role emails with sourceUrls. Fail-closed; never invent contacts.",
  maxIterations: 12,
  hardTimeoutMs: 180_000,
});

const outPath = new URL("../../scripts/holdout-walker-agentic-result.json", import.meta.url);
writeFileSync(outPath, JSON.stringify(result, null, 2));
console.error("status:", result.status, "model:", result.model);
console.error("iterations:", result.iterations, "searches:", result.searches, "visits:", result.visits);
console.error("findings:", result.findings.length);
for (const f of result.findings) {
  console.error(`  [${f.vectorType}] ${f.value} | ${f.personName || ""} | ${f.role || ""} | ${f.scope}`);
}
if (result.error) console.error("error:", result.error);
console.error("wrote", outPath.pathname);
