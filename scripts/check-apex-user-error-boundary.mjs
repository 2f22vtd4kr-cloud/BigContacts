#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const api = read("artifacts/apex-finder/src/lib/api-json.ts");
const errors = read("artifacts/apex-finder/src/lib/apex-errors.ts");
const notice = read("artifacts/apex-finder/src/components/apex-error-notice.tsx");

const checks = [
  ["failed API fetches emit a user-facing classified error", api.includes("res = await fetch(input, init)") && api.includes('emitApexError(classifyApexError(error instanceof Error ? error.message : "Network request failed"))')],
  ["intentional API cancellation does not create a false error notice", api.includes("init?.signal?.aborted") && api.includes('error.name === "AbortError"')],
  ["failed response-body reads emit an error while respecting aborts", api.includes("text = await res.text()") && api.includes("Network response could not be read")],
  ["malformed or empty API bodies are surfaced instead of silently thrown", api.includes("API returned non-JSON") && api.includes("Empty response from API")],
  ["structured server error payloads are validated before display", api.includes("isApexUserError(data?.userError)") && errors.includes("export function isApexUserError(value: unknown)")],
  ["Gemini outage classification does not swallow quota or credential failures", errors.includes("GEMINI_BOSS_UNAVAILABLE") && /quota|rate limit|too many requests|missing/.test(errors)],
  ["the notice exposes why and actionable next steps", notice.includes("Why:") && notice.includes("Next steps") && notice.includes('role="alert"')],
];

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
for (const [name, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + name);
if (failures.length) {
  console.error("Apex user-error boundary failed: " + failures.join(", "));
  process.exit(1);
}
console.log("Apex user-error boundary: " + checks.length + "/" + checks.length + " checks passed");
