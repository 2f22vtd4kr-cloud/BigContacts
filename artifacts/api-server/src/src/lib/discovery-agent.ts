/**
 * Discovery agent — free LLM loop to propose people with public basis.
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
  "security", "issues", "issue", "problem", "problems", "solutions", "services",
  "technology", "systems", "markets", "capital", "equity", "partners", "partner",
  "group", "fund", "funds", "holdings", "holding", "management", "ventures",
  "venture", "estate", "real", "private", "public", "wealth", "investment",
  "investments", "finance", "financial", "industries", "industry", "resources",
  "strategy", "strategies", "operations", "organization", "organizations",
  "foundation", "foundations", "billionaire", "billionaires", "millionaire", "millionaires",
]);

const INVALID_PERSON_NAME_PHRASES = [
  "security issues", "security issue", "private equity", "venture capital",
  "real estate", "wealth management", "financial services", "chief executive officer",
  "chief executive", "executive officer", "company founder", "billionaire founders",
  "billionaire founder", "forbes list", "forbes billionaires", "the billionaire", "the billionaires",
];

const LIST_ONLY_SOURCE_PATTERNS = [
  /forbes\.com\/billionaires(?:\/|\?|$)/i,
  /forbes\.com\/real-time-billionaires(?:\/|\?|$)/i,
  /forbes\.com\/lists\/[^\s/]*billionaires?/i,
  /forbes\.com\/lists\/[^\s/]*richest/i,
  /bloomberg\.com\/billionaires(?:\/|\?|$)/i,
];

function hasIndependentSource(sourceUrls: string[]): boolean {
  const urls = sourceUrls.filter((url) => /^https?:\/\/\S+$/i.test(String(url)));
  if (urls.length === 0) return false;
  return urls.some((url) => !LIST_ONLY_SOURCE_PATTERNS.some((pattern) => pattern.test(url)));
}

export function isWellFormedPersonCandidate(candidate: Pick<DiscoveryCandidate, "name" | "sourceUrls">): boolean {
  const name = String(candidate.name ?? "").trim().replace(/\s+/g, " ");
  const words = name.split(" ");
  const normalized = name.toLowerCase().replace(/[.'’\-]+/g, " ").replace(/\s+/g, " ").trim();
  if (words.length < 2 || words.length > 5) return false;
  if (!/^\p{L}[\p{L}.'’\-]*(?:\s+\p{L}[\p{L}.'’\-]*){1,4}$/u.test(name)) return false;
  if (words.some((word) => INVALID_PERSON_NAME_WORDS.has(word.toLowerCase().replace(/[.'’\-]/g, "")))) return false;
  if (INVALID_PERSON_NAME_PHRASES.some((phrase) => normalized === phrase || normalized.includes(` ${phrase} `) || normalized.startsWith(`${phrase} `) || normalized.endsWith(` ${phrase}`))) return false;
  if (!words.some((word) => /^\p{Lu}/u.test(word))) return false;
  const sourceUrls = (candidate.sourceUrls ?? []).map(String);
  if (!sourceUrls.some((url) => /^https?:\/\/\S+$/i.test(url))) return false;
  if (!hasIndependentSource(sourceUrls)) return false;
  return true;
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
    "YOUR TASK — DISCOVERY (breadth: identify people worth a later contact dig, not generic company leads):",
    "Work like a strong open-web researcher: invent your own searches and visits. The model owns the research lane, query wording, sources, pivots, and stopping point.",
    "Start with a concrete named person, company, ownership story, transaction, leadership page, filing, trade publication, regional business story, or other public source that can reveal a person's full name. Discover the NAME first; contact-route research comes after admission.",
    "Do not begin with generic contact-form hunting. Avoid searches such as 'contact founder', 'contact CEO', 'contact owner', or 'founder contact email' unless a specific company or person is already named. Those queries are high-noise and frequently return generic forms, agencies, and unrelated prose rather than people.",
    "If a company/contact page has no named person, treat it as an intermediate company lead and pivot to the named owner/founder/principal/CEO using that company's actual name. Do not treat a generic contact form as a person candidate.",
    "Prefer practical reachability over fame or maximum net worth. Good targets are often owners, founders, operators, principals, investors, family-office principals, or senior executives of substantial privately held or mid-market businesses where a public company page, office, assistant, family-office, foundation, IR, filing, or other legitimate intermediary route may exist.",
    "A concrete named person with a plausible operating-company or intermediary surface is more useful than a famous name with protected access. One strong person is better than many generic company pages.",
    "Do not equate wealth, press coverage, or a prestigious list position with usefulness. Do not estimate or fabricate wealth.",
    "Treat top billionaire/celebrity/household-name profiles as low expected-value unless the evidence itself reveals a concrete plausible route. Do not spend the discovery budget climbing a billionaire ranking merely because it is easy to enumerate.",
    "Do not use Forbes/Bloomberg-style billionaire or richest-person lists as a default discovery strategy. A list may support an already-identified person, but a list-only candidate is invalid discovery provenance.",
    "If a billionaire list appears naturally, pivot to the underlying operating company, named principals, regional owners, private-equity operating partners, family-office professionals, or another concrete public surface instead of continuing down the ranking.",
    "Do not turn a phrase, job title, organization, topic, product, sector, list label, contact-form title, or search-snippet fragment into a person. A candidate must be a named individual supported by an exact public source.",
    "Before finishing, ask yourself: do I have a full personal name, a real source URL, and a concrete reason this person is plausibly reachable? If not, continue the investigation or finish with no candidate rather than manufacturing one.",
    "Use personName or value form: person: Full Name | role | company when possible.",
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
