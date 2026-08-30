import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Compatibility entry point only.
 *
 * The canonical Dig hardening lives in apply-agentic-concurrency-hardening.mjs.
 * Historically this script injected Gemini + NVIDIA into the Dig provider
 * chain, which was architecturally wrong: Gemini is Boss and NVIDIA is the
 * right-hand advisor; neither is a web-research provider.
 *
 * Keep this filename so old operator/CI commands remain safe, but delegate to
 * the canonical hardener instead of maintaining a second implementation.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = path.join(here, "apply-agentic-concurrency-hardening.mjs");
const result = spawnSync(process.execPath, [canonical], { stdio: "inherit" });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
