/**
 * Discovery agent (plan Vol 219) — free LLM loop to propose people with public basis.
 * Does NOT promote contacts onto entity cards. Output is candidates for discovery-intake.
 */
import { logger } from "./logger";
import { apexOrientationFor } from "./apex-bureau-orientation";
import { publishDigSpan, completeDigSpan, spanFromLiveStep } from "./dig-span";
import { runAgenticWebResearch } from "./agentic-web-research";

export type DiscoveryCandidate = {
  name: string;
  role?: string;
  company?: string;
  basis: string;
  sourceUrls: string[];
  lane?: string;
  confidence?: number;
};

export type DiscoveryAgentResult = {
  candidates: DiscoveryCandidate[];
  model?: string;
  searches: number;
  visits: number;
  degraded: boolean;
  message: string;
};

const INVALID_PERSON_NAME_WORDS = new Set([
  "a", "an", "and", "as", "at", "behind", "been", "by", "chief", "ceo",
  "company", "executive", "from", "has", "in", "of", "officer", "on",
  "the", "to", "with",
  // Common noun/organization fragments that models can accidentally extract
  // from prose and SERP snippets as if they were a person's name.
  "security", "issues", "issue", "problem", "problems", "solutions", "services",
  "technology", "systems", "markets", "capital", "equity", "partners", "partner",
  "group", "fund", "funds", "holdings", "holding", "management", "ventures",
  "venture", "estate", "real", "private", "public", "wealth", "investment",
  "investments", "finance", "financial", "industries", "industry", "resources",
  "strategy", "strategies", "operations", "organization", "organizations",
  "foundation", "foundations", "billionaire", "billionaires", "millionaire", "millionaires",
]);

const INVALID_PERSON_NAME_PHRASES = [
  "security issues",
  "security issue",
  "private equity",
  "venture capital",
  "real estate",
  "wealth management",
  "financial services",
  "chief executive officer",
  "chief executive",
  "executive officer",
  "company founder",
  "billionaire founders",
  "billionaire founder",
  "forbes list",
  "forbes billionaires",
  "the billionaire",
  "the billionaires",
];

/**
 * Safety validation for model-selected discovery output.
 *
 * This is deliberately not a ranking or fitness score. The model still
 * chooses the candidate and its order; this only prevents sentence fragments,
 * titles, organizations, generic nouns, and source-free strings from becoming people.
 */
export function isWellFormedPersonCandidate(candidate: Pick<DiscoveryCandidate, "name" | "sourceUrls">): boolean {
  const name = String(candidate.name ?? "").trim().replace(/\s+/g, " ");
  const words = name.split(" ");
  const normalized = name.toLowerCase().replace(/[.'’\-]+/g, " ").replace(/\s+/g, " ").trim();
  if (words.length < 2 || words.length > 5) return false;
  if (!/^\p{L}[\p{L}.'’\-]*(?:\s+\p{L}[\p{L}.'’\-]*){1,4}$/u.test(name)) return false;
  if (words.some((word) => INVALID_PERSON_NAME_WORDS.has(word.toLowerCase().replace(/[.'’\-]/g, "")))) return false;
  if (INVALID_PERSON_NAME_PHRASES.some((phrase) => normalized === phrase || normalized.includes(` ${phrase} `) || normalized.startsWith(`${phrase} `) || normalized.endsWith(` ${phrase}`))) return false;
  // A real person's name normally has at least one capitalized name token.
  // This rejects lowercase prose fragments without imposing a fixed naming style.
  if (!words.some((word) => /^\p{Lu}/u.test(word))) return false;
  return (candidate.sourceUrls ?? []).some((url) => /^https?:\/\/\S+$/i.test(String(url)));
}

function parsePersonFindings(
  findings: Array<{
    vectorType?: string;
    value?: string;
    sourceUrls?: string[];
    role?: string | null;
    personName?: string | null;
    note?: string;
  }>,
): DiscoveryCandidate[] {
  const out: DiscoveryCandidate[] = [];
  const seen = new Set<string>();

  const add = (name: string, extra: Partial<DiscoveryCandidate>) => {
    const n = name.trim().replace(/\s+/g, " ");
    if (n.length < 3 || n.length > 120) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const sourceUrls = (extra.sourceUrls ?? []).filter((u) => /^https?:\/\//i.test(u)).slice(0, 6);
    if (!isWellFormedPersonCandidate({ name: n, sourceUrls })) return;
    out.push({
      name: n,
      role: extra.role,
      company: extra.company,
      basis: extra.basis || "Public web discovery",
      sourceUrls,
      lane: extra.lane || "discovery-agent",
      confidence: sourceUrls.length ? 0.55 : 0.35,
    });
  };

  for (const f of findings ?? []) {
    const urls = (f.sourceUrls ?? []).filter((u) => /^https?:\/\//i.test(String(u)));
    if (f.personName && String(f.personName).trim().length >= 3) {
      add(String(f.personName), {
        role: f.role ?? undefined,
        basis: f.note || f.role || "Named on visited public page",
        sourceUrls: urls,
      });
    }
    const value = String(f.value ?? "").trim();
    if (!value) continue;
    const m = value.match(/^person:\s*(.+?)(?:\s*\|\s*(.*?))?(?:\s*\|\s*(.*?))?$/i);
    if (m) {
      add(m[1]!, {
        role: (m[2] || f.role || "").trim() || undefined,
        company: (m[3] || "").trim() || undefined,
        basis: f.note || "person: finding from discovery dig",
        sourceUrls: urls,
      });
      continue;
    }
    if (/^related-person:/i.test(value)) {
      add(value.replace(/^related-person:/i, ""), {
        basis: "Related person from public filing/page",
        sourceUrls: urls,
      });
    }
  }
  return out.slice(0, 30);
}

/**
 * Run a short free dig oriented at discovering people (breadth), not filling one card (depth).
 */
export async function runDiscoveryAgent(input: {
  jobId?: string;
  depth?: "fast" | "standard" | "deep";
  laneHint?: string;
  hardTimeoutMs?: number;
  onLiveStep?: (step: {
    action: string;
    tool?: string;
    query?: string;
    url?: string;
    status: "ok" | "error" | "active";
    detail?: string;
  }) => void;
}): Promise<DiscoveryAgentResult> {
  const jobId = input.jobId ?? `discovery_${Date.now()}`;
  const depth = input.depth ?? "standard";
  const maxIterations = depth === "fast" ? 6 : depth === "deep" ? 14 : 10;
  const hardTimeoutMs = input.hardTimeoutMs ?? (depth === "fast" ? 60_000 : depth === "deep" ? 180_000 : 120_000);

  const span = publishDigSpan({
    jobId,
    spanType: "stage",
    name: "discovery_agent",
    status: "active",
    agentName: "discovery",
    inputSummary: `depth=${depth} lane=${input.laneHint ?? "model-choice"}`,
  });

  const objective = [
    apexOrientationFor("investigator"),
    "",
    "YOUR TASK — DISCOVERY (breadth: who to research later, not how to contact one known person):",
    "Work like a strong open-web researcher: invent your own searches and visits.",
    "Choose the lane yourself from the public evidence you encounter; there is no fixed source checklist.",
    "Return named real people who look worth a later contact dig — with real http(s) sourceUrls.",
    "Prefer principals, owners, operators, executives, investors, founders, family-office principals, and other high-value people for whom a plausible public or intermediary contact route could realistically exist.",
    "Do not equate wealth or fame with usefulness. Do not optimize for celebrity, billionaire, or headline-list status; very high-profile people often have extremely protected access and low practical outreach value.",
    "Do not use Forbes/Bloomberg-style billionaire lists as a default discovery strategy. If a high-profile person appears naturally while following a stronger lead, that is fine, but keep researching the more practically reachable opportunities instead of chasing fame.",
    "Do not turn a phrase, job title, organization, topic, product, sector, or search-snippet fragment into a person. A candidate must be a named individual supported by a visited or otherwise exact public source.",
    "If the evidence does not yield a real person's full name, do not manufacture one; continue the investigation or finish with no candidate.",
    "Use personName or value form: person: Full Name | role | company when possible.",
    "No fixed search checklist — choose a coherent public lane yourself.",
    input.laneHint ? `Operator lane hint (optional context, not a script): ${input.laneHint}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await runAgenticWebResearch({
      targetName: "Public principal discovery",
      companyName: null,
      objective,
      maxIterations,
      hardTimeoutMs,
      jobId,
      onLiveStep: (step) => {
        try {
          spanFromLiveStep({
            jobId,
            targetName: "discovery",
            tool: step.tool || step.action,
            label: step.query || step.url || step.action,
            detail: step.detail || step.query || step.url,
            status: step.status === "error" ? "error" : step.status === "active" ? "active" : "ok",
            agentName: "discovery",
          });
        } catch {
          /* spans best-effort */
        }
        input.onLiveStep?.(step);
      },
    });

    const candidates = parsePersonFindings(result.findings ?? []);
    try {
      completeDigSpan(span.id, {
        status: result.status === "completed" || candidates.length ? "ok" : "error",
        resultSummary: `candidates=${candidates.length} searches=${result.searches} visits=${result.visits} status=${result.status}`,
      });
    } catch {
      /* span complete is best-effort */
    }

    const degraded = result.status === "unavailable" || result.status === "error";
    return {
      candidates,
      model: result.model,
      searches: result.searches ?? 0,
      visits: result.visits ?? 0,
      degraded,
      message:
        candidates.length > 0
          ? `Discovery agent proposed ${candidates.length} people`
          : degraded
            ? `Discovery agent degraded: ${result.error || result.status}`
            : "Discovery agent finished with no source-backed person candidates",
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err: msg }, "[discovery-agent] failed");
    try {
      completeDigSpan(span.id, { status: "error", resultSummary: msg.slice(0, 200) });
    } catch {
      /* ignore */
    }
    return {
      candidates: [],
      searches: 0,
      visits: 0,
      degraded: true,
      message: `Discovery agent degraded: ${msg.slice(0, 180)}`,
    };
  }
}