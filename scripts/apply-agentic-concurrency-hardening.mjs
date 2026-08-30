import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(targetPath, "utf8");

if (s.includes("DIG_INVESTIGATOR_FAILOVER_CHAIN") && s.includes("Groq -> Mistral")) {
  console.log("Dig investigator provider hardening already applied; leaving runtime unchanged");
  process.exit(0);
}

const llmStepRe = /let agenticProviderCircuitUntil = 0;\n\nasync function llmStep\(prompt: string\): Promise<\{ model: string; raw: string \} \| null> \{[\s\S]*?\n\}\n\nfunction formatFindingsBag/;

const replacement = `/**
 * DIG_INVESTIGATOR_FAILOVER_CHAIN: Groq -> Mistral.
 *
 * This is the actual web-research LLM lane. Boss and right-hand are NOT dig
 * providers: Boss=Gemini, right-hand=NVIDIA. They reason over the case and
 * advise the investigator; they do not execute web research themselves.
 *
 * No provider in this lane is given a scripted research sequence. The model
 * still owns every search, visit, OSINT choice, pivot, and stopping decision.
 */
let activeAgenticProviderDecisions = 0;
const agenticProviderDecisionWaiters: Array<() => void> = [];
const MAX_CONCURRENT_AGENTIC_PROVIDER_DECISIONS = Math.max(
  1,
  Number(process.env.APEX_AGENTIC_PROVIDER_CONCURRENCY || "4"),
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
    const providers: Array<[string, () => Promise<{ model: string; raw: string } | null>]> = [
      ["groq", callGroqJson],
      ["mistral", callMistralJson],
    ];
    const providerDecisionTimeoutMs = 18_000;
    const errors: string[] = [];

    for (const [name, fn] of providers) {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(name + ":timeout")), providerDecisionTimeoutMs),
      );
      try {
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
    releaseAgenticProviderDecisionSlot();
  }
}

function formatFindingsBag`;

if (!llmStepRe.test(s)) {
  throw new Error("agentic llmStep hardening anchor missing");
}

s = s.replace(llmStepRe, replacement);

fs.writeFileSync(targetPath, s);
console.log("Applied Dig investigator hardening: bounded concurrency=4, 18s per-provider deadline, Groq->Mistral failover, no Boss/right-hand providers, and no global cross-target circuit");
