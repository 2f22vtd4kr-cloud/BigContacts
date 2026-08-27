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
    const n = name.trim();
    if (n.length < 3 || n.length > 120) return;
    const key = n.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const sourceUrls = (extra.sourceUrls ?? []).filter((u) => /^https?:\/\//i.test(u)).slice(0, 6);
    if (sourceUrls.length === 0 && !(extra.basis && extra.basis.length > 12)) return;
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
    "Return named people who look worth a later contact dig — with real http(s) sourceUrls.",
    "Use personName or value form: person: Full Name | role | company when possible.",
    "Do not invent people. A company without a named person is not a candidate.",
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
