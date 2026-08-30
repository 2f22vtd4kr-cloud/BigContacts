import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(targetPath, "utf8");

if (s.includes("activeAgenticProviderDecisions") && s.includes("MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS")) {
  console.log("Agentic concurrency hardening already applied; leaving runtime unchanged");
  process.exit(0);
}

const llmStepRe = /let agenticProviderCircuitUntil = 0;\n\nasync function llmStep\(prompt: string\): Promise<\{ model: string; raw: string \} \| null> \{[\s\S]*?\n\}\n\nfunction formatFindingsBag/;

const replacement = `let activeAgenticProviderDecisions = 0;
const agenticProviderDecisionWaiters: Array<() => void> = [];
const MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS = Math.max(
  1,
  Number(process.env.APEX_AGENTIC_PROVIDER_CONCURRENCY || "2"),
);

async function acquireAgenticProviderDecisionSlot(): Promise<void> {
  if (activeAgenticProviderDecisions < MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS) {
    activeAgenticProviderDecisions += 1;
    return;
  }
  await new Promise<void>((resolve) => agenticProviderDecisionWaiters.push(resolve));
  activeAgenticProviderDecisions += 1;
}

function releaseAgenticProviderDecisionSlot(): void {
  activeAgenticProviderDecisions = Math.max(0, activeAgenticProviderDecisions - 1);
  const next = agenticProviderDecisionWaiters.shift();
  if (next) next();
}

async function llmStep(prompt: string): Promise<{ model: string; raw: string } | null> {
  await acquireAgenticProviderDecisionSlot();
  try {
    const stages: Array<Array<[string, () => Promise<{ model: string; raw: string } | null>]>> = [
      [["gemini", callGeminiJson], ["nvidia", callNvidiaJson]],
      [["groq", callGroqJson], ["mistral", callMistralJson]],
    ];
    const providerDecisionTimeoutMs = 55_000;
    const errors: string[] = [];
    for (const stage of stages) {
      const attempts = stage.map(async ([name, fn]) => {
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error(name + ":timeout")), providerDecisionTimeoutMs));
        try {
          const out = await Promise.race([fn(prompt), timeout]);
          if (!out?.raw) throw new Error(name + ":empty");
          return out;
        } catch (err: any) {
          throw new Error(name + ":" + (err?.message ?? "fail"));
        }
      });
      try {
        const out = await Promise.any(attempts);
        setAgenticLlmHealth(true, out.model, null);
        return out;
      } catch (err: any) {
        const reasons = Array.isArray(err?.errors) ? err.errors.map((e: unknown) => String(e)).join(";") : String(err?.message ?? "all_failed");
        errors.push(reasons.slice(0, 500));
      }
    }
    setAgenticLlmHealth(false, null, errors.join(";").slice(0, 1000));
    logger.warn({ errors }, "[agentic] all LLM providers failed for step");
    return null;
  } finally {
    releaseAgenticProviderDecisionSlot();
  }
}

function formatFindingsBag`;

if (!llmStepRe.test(s)) {
  throw new Error("agentic llmStep hardening anchor missing");
}

s = s.replace(llmStepRe, replacement);

fs.writeFileSync(targetPath, s);
console.log("Applied agentic concurrency hardening: bounded provider-decision concurrency, 55s provider deadline, and no global cross-target circuit");
