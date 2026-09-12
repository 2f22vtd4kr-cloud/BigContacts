#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts", "utf8");
const browserSource = fs.readFileSync("artifacts/api-server/src/src/lib/browser-fetch-core.ts", "utf8");
const failures = [];
const pass = (name, ok) => { if (!ok) failures.push(name); };

pass("SSRF uses a cancellable DNS Resolver", /new Resolver\(\{\s*timeout: DNS_TIMEOUT_MS, tries: 1\s*\}\)/.test(source));
pass("DNS has an explicit timeout", /const DNS_TIMEOUT_MS = 10_000/.test(source));
pass("DNS abort cancels outstanding resolver work", /resolver\.cancel\(\);\s*finishError\(new Error\(\"Outbound DNS resolution aborted\"\)\)/.test(source));
pass("safe outbound fetch threads the caller signal into DNS resolution", /resolveSafeAddress\(hostname, init\.signal(?: \?\? undefined)?\)/.test(source));
pass("pinned HTTP still receives the caller signal", /const body = await readRequestBodyCapped\(init\.body\); const signal = init\.signal;/.test(source));
pass("redirects remain manual", /redirect: \"manual\"/.test(source));
pass("request and response byte caps remain enforced", /MAX_REQUEST_BYTES = 1_000_000/.test(source) && /MAX_RESPONSE_BYTES = 2_000_000/.test(source));
pass("browser escalation imports the canonical SSRF gate", /import \{ assertSafeOutboundUrl \} from \"\.\/ssrf-safe-fetch\";/.test(browserSource));
pass("browser escalation validates the target URL before proxy providers", /throwIfAborted\(options\.signal\); await assertSafeOutboundUrl\(url\);[\s\S]*const attempts:/.test(browserSource));

if (failures.length) {
  console.error("SSRF CANCELLATION BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SSRF CANCELLATION BOUNDARY: PASS — direct and browser-proxy egress share the bounded, cancellable SSRF safety path");