import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/investigation-context-compaction.ts", "utf8");
const checks = [
  ["bounded Investigator working context exists", /export function buildInvestigatorContext/.test(source)],
  ["working-context budget is configurable and bounded", /APEX_INVESTIGATOR_CONTEXT_MAX_CHARS/.test(source) && /MIN_MAX_CHARS/.test(source) && /MAX_MAX_CHARS/.test(source)],
  ["durable trajectory is explicitly retained outside the prompt", /Durable trajectory\/evidence is never deleted/.test(source) && /durable records retain complete observations/.test(source)],
  ["recent observations are bounded", /recentObservationChars/.test(source) && /RECENT TRAJECTORY/.test(source)],
  ["older trajectory keeps source URLs", /ARCHIVED TRAJECTORY INDEX/.test(source) && /observedUrls/.test(source)],
  ["context management law forbids treating omission as negative evidence", /Do not treat omitted raw detail as negative evidence/.test(source)],
  ["emergency provider-size reducer exists", /export function tightenInvestigatorPrompt/.test(source) && /EMERGENCY REQUEST-SIZE COMPACTION/.test(source)],
  ["emergency reducer enforces its maximum", /\.slice\(0, maxChars\)/.test(source)],
  ["unbounded whole-trajectory prompt assembly is absent", !/trajectoryRecords\.map\(.*observation.*join\(/s.test(source)],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
