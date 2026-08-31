import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(targetPath, "utf8");

const start = s.indexOf("async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {");
const end = s.indexOf("\nfunction formatFindingsBag", start);
if (start < 0 || end < 0) throw new Error("provider gate v2: llmStep anchors missing");

const replacement = `const AGENTIC_PROVIDER_GATE_V2 = Symbol.for("apex.agentic.provider-gate.v2");
const providerGate = ((globalThis as typeof globalThis & { [key: symbol]: any })[AGENTIC_PROVIDER_GATE_V2] ??= {
  active: 0,
  waiters: [] as Array<() => void>,
  lastGroqAt: 0,
});
const MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS = Math.max(1, Number(process.env.APEX_AGENTIC_PROVIDER_CONCURRENCY || "1"));
const GROQ_AGENTIC_MIN_INTERVAL_MS = Math.max(0, Number(process.env.GROQ_AGENTIC_MIN_INTERVAL_MS || "20000"));

async function acquireProviderGate(): Promise<void> {
  if (providerGate.active < MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS) {
    providerGate.active += 1;
    return;
  }
  await new Promise<void>((resolve) => providerGate.waiters.push(resolve));
  providerGate.active += 1;
}

function releaseProviderGate(): void {
  providerGate.active = Math.max(0, providerGate.active - 1);
  providerGate.waiters.shift()?.();
}

async function paceGroq(): Promise<void> {
  const waitMs = Math.max(0, GROQ_AGENTIC_MIN_INTERVAL_MS - (Date.now() - providerGate.lastGroqAt));
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
  providerGate.lastGroqAt = Date.now();
}

async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {
  await acquireProviderGate();
  try {
    const providers: Array<[string, () => Promise<{ model: string; raw: string } | null>]> = [
      ["groq", callGroqJson],
      ["mistral", callMistralJson],
    ];
    const timeoutMs = 18_000;
    const errors: string[] = [];
    for (const [name, fn] of providers) {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(name + ":timeout")), timeoutMs));
      try {
        if (name === "groq") await paceGroq();
        const out = await Promise.race([fn(prompt), timeout]);
        if (!out?.raw) throw new Error(name + ":empty");
        setAgenticLlmHealth(true, out.model, null);
        return out;
      } catch (err: any) {
        errors.push(name + ":" + (err?.message ?? "fail"));
      }
    }
    setAgenticLlmHealth(false, null, errors.join(";").slice(0, 1000));
    logger.warn({ errors }, "[agentic] all Dig investigator LLM providers failed for step");
    return null;
  } finally {
    releaseProviderGate();
  }
}
`;

s = s.slice(0, start) + replacement + s.slice(end);
if (!s.includes("apex.agentic.provider-gate.v2") || !s.includes("GROQ_AGENTIC_MIN_INTERVAL_MS")) {
  throw new Error("provider gate v2: post-write verification failed");
}
fs.writeFileSync(targetPath, s);
console.log("[apex-provider-gate-v2] installed process-wide provider gate + Groq pacing");
