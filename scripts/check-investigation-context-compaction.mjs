import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const core = fs.readFileSync("artifacts/api-server/src/src/lib/agentic-web-research-core.ts", "utf8");
const checks = [
  ["bounded Investigator working context exists", /export function buildInvestigatorContext/.test(source)],
  ["working-context budget is configurable and bounded", /APEX_INVESTIGATOR_CONTEXT_MAX_CHARS/.test(source) && /MIN_MAX_CHARS/.test(source) && /MAX_MAX_CHARS/.test(source)],
  ["durable trajectory is explicitly retained outside the prompt", /Durable trajectory\/evidence is never deleted/.test(source) && /durable (?:run\/evidence )?records retain complete observations/i.test(source)],
  ["recent observations are bounded", /recentObservationChars/.test(source) && /RECENT TRAJECTORY/.test(source)],
  ["older trajectory keeps source URLs", /ARCHIVED TRAJECTORY INDEX/.test(source) && /observedUrls/.test(source)],
  ["context management law forbids treating omission as negative evidence", /Do not treat omitted raw detail as negative evidence/.test(source)],
  ["emergency provider-size reducer exists", /export function tightenInvestigatorPrompt/.test(source) && /EMERGENCY REQUEST-SIZE COMPACTION/.test(source)],
  ["mounted durable context has its own bounded section", /priorContext\?: string/.test(source) && /PRIOR DURABLE CASE CONTEXT/.test(source) && /trim\(input\.priorContext, 1_000\)/.test(source)],
  ["explicit model-facing context budget override exists", /maxChars\?: number/.test(source) && /input\.maxChars/.test(source)],
  ["canonical Investigator prompt requests a bounded working-context layer", /maxChars: 3_900/.test(core)],
  ["canonical Investigator prompt reserves a bounded intelligence-state layer", /boundInvestigatorPromptSection\(\s*input\.intelligenceContext[\s\S]*?1_200/.test(core)],
  ["current findings retain both early and recent entries", /headTail\(input\.findings, 6\)/.test(source)],
  ["archived trajectory retains both early and recent entries", /headTail\(input\.trajectoryRecords \?\? \[\], 10\)/.test(source)],
  ["emergency reducer enforces its maximum", /\.slice\(0, maxChars\)/.test(source)],
  ["unbounded whole-trajectory prompt assembly is absent", !/trajectoryRecords\.map\(.*observation.*join\(/s.test(source)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
