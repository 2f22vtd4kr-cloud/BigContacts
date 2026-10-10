#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts", "utf8");
const browserSource = fs.readFileSync("artifacts/api-server/src/src/lib/browser-fetch-core.ts", "utf8");
const failures = [];
const pass = (name, ok) => { if (!ok) failures.push(name); };

pass("SSRF uses a cancellable DNS Resolver", /new Resolver\(\{\s*timeout: DNS_TIMEOUT_MS, tries: 1\s*\}\)/.test(source));
pass("DNS has an explicit timeout", /const DNS_TIMEOUT_MS = 10_000/.test(source));
pass("DNS abort cancels outstanding resolver work", /resolver\.cancel\(\);\s*finishError\(new Error\(\"Outbound DNS resolution aborted\"\)\)/.test(source));
pass("safe outbound fetch threads the scoped caller/deadline signal into DNS resolution", /resolveSafeAddress\(hostname, signal\)/.test(source));
pass("absolute fetch deadline starts before DNS and is cleared after all outbound work", /const deadlineTimer = setTimeout\(\(\) => controller\.abort\(new Error\("Outbound request deadline exceeded"\)\), REQUEST_DEADLINE_MS\)/.test(source) && /clearTimeout\(deadlineTimer\)/.test(source) && source.indexOf("const deadlineTimer = setTimeout(() => controller.abort") < source.indexOf("const address = await resolveSafeAddress(hostname, signal)"));
pass("pinned HTTP passes its abort signal into bounded request-body reads", /const signal = init\.signal(?: \?\? undefined)?; const body = await readRequestBodyCapped\(init\.body, signal\)/.test(source));
pass("streamed outbound request bodies abort while waiting for chunks", /readRequestBodyCapped\(init\.body, signal\)/.test(source) && /signal\.addEventListener\("abort", onAbort/.test(source) && /reader\.cancel\(\)/.test(source));
pass("redirects remain manual", /redirect: \"manual\"/.test(source));
pass("request and response byte caps remain enforced", /MAX_REQUEST_BYTES = 1_000_000/.test(source) && /MAX_RESPONSE_BYTES = 2_000_000/.test(source));
pass("browser escalation imports canonical URL validation and pinned outbound transport", /import \{ assertSafeOutboundUrl, safeOutboundFetch \} from \"\.\/ssrf-safe-fetch\";/.test(browserSource));
pass("browser escalation rejects unavailable providers before egress, then validates URL before proxy providers",
  browserSource.includes("throwIfAborted(options.signal);") &&
  browserSource.includes("if (!availableProviders.includes(options.provider))") &&
  browserSource.includes('return { html: "", provider: "provider_unavailable", observedUrl: null };') &&
  browserSource.indexOf("throwIfAborted(options.signal);") < browserSource.indexOf("if (!availableProviders.includes(options.provider))") &&
  browserSource.indexOf("if (!availableProviders.includes(options.provider))") < browserSource.indexOf("await assertSafeOutboundUrl(url);") &&
  browserSource.indexOf("await assertSafeOutboundUrl(url);") < browserSource.indexOf("const attempts:"));
pass("browser proxy providers use the pinned outbound transport", /runProviderCall\(\{ provider, account: new URL\(url\)\.hostname, signal \}, \(\) => safeOutboundFetch\(url, init\)\)/.test(browserSource));

if (failures.length) {
  console.error("SSRF CANCELLATION BOUNDARY: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SSRF CANCELLATION BOUNDARY: PASS — direct and browser-proxy egress share the bounded, cancellable SSRF safety path");