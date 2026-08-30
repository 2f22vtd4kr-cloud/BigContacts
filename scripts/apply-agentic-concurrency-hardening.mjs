import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetPath = path.join(repoRoot, "artifacts/api-server/src/src/lib/agentic-web-research.ts");
let s = fs.readFileSync(targetPath, "utf8");

const llmStepAlreadyCanonical =
  s.includes("DIG_INVESTIGATOR_FAILOVER_CHAIN") && s.includes("Groq -> Mistral");

if (!llmStepAlreadyCanonical) {
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
}

/**
 * Observation-only contact enrichment.
 *
 * Literal contact tokens are useful observation enrichment. Semantic person
 * identity is not. The page extractor must never manufacture PERSON findings
 * from title/name adjacency, capitalization, or prose patterns. The Dig model
 * receives the page text and decides whether a named person is actually the
 * target, while provenance/promotion code verifies the relationship.
 */
const observationBoundaryRe = /function extractContactFactsFromHtml\(html: string\): string \{[\s\S]*?\n\}\n\n(?=(?:async )?function )/;
const observationReplacement = `function extractContactFactsFromHtml(html: string): string {
  const facts: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const text = value.trim();
    if (text.length < 5 || text.length > 200 || seen.has(text.toLowerCase())) return;
    seen.add(text.toLowerCase());
    facts.push(text);
  };

  for (const match of html.matchAll(/href=["']mailto:([^"'?\\s]+)/gi)) {
    push(\`EMAIL: \${match[1]!.toLowerCase()}\`);
  }
  for (const match of html.matchAll(/(?:email-protection|cdn-cgi\\/l\\/email-protection)[#/]([a-fA-F0-9]{4,})/gi)) {
    const decoded = decodeCloudflareEmail(match[1]!);
    if (decoded) push(\`EMAIL: \${decoded}\`);
  }
  for (const match of html.matchAll(/data-cfemail=["']([a-fA-F0-9]+)["']/gi)) {
    const decoded = decodeCloudflareEmail(match[1]!);
    if (decoded) push(\`EMAIL: \${decoded}\`);
  }
  for (const match of html.matchAll(/\\b([a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,})\\b/gi)) {
    const address = match[1]!.toLowerCase();
    if (!/example\\.|sentry\\.|schema\\.|wixpress|cloudflare|wordpress|github\\.com|google\\.com/.test(address)) {
      push(\`EMAIL: \${address}\`);
    }
  }
  for (const match of html.matchAll(/href=["']tel:([^"']+)/gi)) {
    push(\`PHONE: \${match[1]!.replace(/\\s+/g, " ").trim()}\`);
  }

  return facts.join("\\n");
}

`;

if (observationBoundaryRe.test(s)) {
  s = s.replace(observationBoundaryRe, observationReplacement);
} else if (/function extractContactFactsFromHtml\(html: string\): string/.test(s)) {
  throw new Error("observation identity boundary anchor is ambiguous; refusing to mutate source");
} else {
  throw new Error("observation identity boundary anchor missing");
}

fs.writeFileSync(targetPath, s);
console.log(
  `Applied canonical Dig hardening: provider=${llmStepAlreadyCanonical ? "already Groq->Mistral" : "Groq->Mistral"}; observation boundary=literal contacts only; no Boss/right-hand Dig providers; no global cross-target circuit`,
);
