/**
 * Bureau-facing wrapper around the ReAct agentic web loop.
 * Used whenever Boss selects a web/contact/footprint action or discovery
 * runs a web lane — same body as Atlas secondary expansion.
 */

import { logger } from "./logger";
import { runAgenticWebResearch, type AgenticFinding } from "./agentic-web-research";
import { resolveResearchDepth } from "./research-depth";
import { persistBureauContactsForEntity, type BureauContactLike } from "./bureau-contact-persist";
import { publishBureauEvent } from "./bureau-live-log";

export type BureauAgenticPassResult = {
  status: "completed" | "unavailable" | "error" | "skipped" | "timeout";
  model: string;
  iterations: number;
  searches: number;
  visits: number;
  findings: AgenticFinding[];
  contactEvidence: Array<{
    vectorType: string;
    value: string;
    scope: string;
    personName: string | null;
    role: string | null;
    sourceUrls: string[];
    note: string;
  }>;
  trajectory: string[];
  error?: string;
};

const WEB_SPECIALISTS = new Set(["web", "contact", "footprint"]);

export function isWebSpecialistAction(specialistId: string | null | undefined): boolean {
  return WEB_SPECIALISTS.has(String(specialistId ?? "").toLowerCase());
}

export function findingsToContactEvidence(findings: AgenticFinding[]) {
  return findings.map((f) => ({
    vectorType: f.vectorType,
    value: f.value,
    scope: f.scope,
    personName: f.personName,
    role: f.role,
    sourceUrls: f.sourceUrls,
    note: f.note,
  }));
}

export function findingsToBureauContacts(
  findings: AgenticFinding[],
  fallbackPersonName: string,
): BureauContactLike[] {
  return findings.map((f) => ({
    vectorType: f.vectorType,
    value: f.value,
    scope: f.scope,
    personName: f.personName ?? fallbackPersonName,
    role: f.role,
    sourceUrls: f.sourceUrls,
    note: `bureau-agentic:${f.note}`,
    tier: "candidate",
    state: "review_only",
  }));
}

/**
 * Run agentic ReAct web research for a bureau target.
 */
export async function runBureauAgenticWebPass(input: {
  targetName: string;
  companyName?: string | null;
  objective?: string;
  caseId?: string | number;
  /** Atlas job id — mirrors live steps into job log for Reactor */
  jobId?: string;
  maxIterations?: number;
  entityId?: number;
  persist?: boolean;
  shouldCancel?: () => boolean | Promise<boolean>;
}): Promise<BureauAgenticPassResult> {
  const name = (input.targetName ?? "").trim();
  if (name.length < 2) {
    return {
      status: "skipped",
      model: "none",
      iterations: 0,
      searches: 0,
      visits: 0,
      findings: [],
      contactEvidence: [],
      trajectory: [],
      error: "empty target",
    };
  }

  void publishBureauEvent({
    actor: "web",
    kind: "search",
    title: "Agentic web pass",
    caseId: input.caseId != null ? String(input.caseId) : undefined,
    jobId: input.jobId,
    targetName: name,
    provider: "agentic-react",
    why: input.objective?.slice(0, 240) ?? "Boss-selected web investigation",
    ask: "Multi-hop search + page visit until public surface is exhausted or budget ends",
  });

  try {
    // Promote agentic findings immediately after ReAct (including on hard timeout).
    // Do not wait for any mixed-source tail — that was discarding Rayco-class partial wins.
    const agentic = await runAgenticWebResearch({
      targetName: name,
      companyName: input.companyName ?? null,
      jobId: input.jobId ?? null,
      objective: input.objective
        ?? `Find publicly documented contact routes for ${name}${input.companyName ? ` related to ${input.companyName}` : ""}. Multi-hop. Visit primary pages. Never invent.`,
      maxIterations: input.maxIterations ?? resolveResearchDepth().agenticMaxIterations,
      hardTimeoutMs: 210_000,
      shouldCancel: input.shouldCancel,
      onLiveStep: (step) => {
        const kind =
          step.action === "web_search" ? "search"
          : step.action === "visit" || step.action === "browser_fetch" ? "page-fetch"
          : step.action === "registry_search" ? "registry"
          : step.action === "domain_lookup" || step.action === "reverse_whois" ? "domain"
          : step.action.startsWith("footprint") || step.action === "harvest_domain" ? "tool"
          : "tool";
        void publishBureauEvent({
          actor: step.action === "registry_search" ? "registry" : "web",
          kind,
          jobId: input.jobId,
          title:
            step.action === "web_search" ? `Web search · ${step.query || ""}`.slice(0, 120)
            : step.action === "visit" ? `Reading page · ${(step.url || "").slice(0, 80)}`
            : step.action === "browser_fetch" ? `Browser fetch · ${(step.url || "").slice(0, 80)}`
            : step.action === "registry_search" ? `Registry · ${step.provider || "official"}`
            : step.action === "domain_lookup" ? `Domain · ${step.query || ""}`
            : step.action === "harvest_domain" ? `Harvest · ${step.query || ""}`
            : step.action === "footprint_email" ? `Holehe · ${step.query || ""}`
            : step.action === "footprint_username" ? `Username footprint · ${step.query || ""}`
            : step.action === "reverse_whois" ? `Reverse WHOIS · ${step.query || ""}`
            : step.action,
          caseId: input.caseId != null ? String(input.caseId) : undefined,
          targetName: step.targetName,
          provider: step.provider || step.action,
          why: step.summary?.slice(0, 240),
          ask: step.query || step.url,
          responseSummary: step.summary?.slice(0, 200),
          level: "info",
        });
      },
    });

    const contactEvidence = findingsToContactEvidence(agentic.findings);

    // Persist as soon as ReAct returns (completed OR timeout). Partial findings must hit the ledger.
    if (input.persist && input.entityId) {
      await persistBureauContactsForEntity(
        input.entityId,
        agentic.findings.length
          ? findingsToBureauContacts(agentic.findings, name)
          : [],
        "case-bureau-agentic",
      );
    }

    void publishBureauEvent({
      actor: "web",
      kind: "extract",
      title: `Agentic web · ${agentic.findings.length} findings${agentic.status === "timeout" ? " (timeout)" : ""}`,
      caseId: input.caseId != null ? String(input.caseId) : undefined,
      jobId: input.jobId,
      targetName: name,
      provider: agentic.model,
      why: `searches=${agentic.searches} visits=${agentic.visits} iters=${agentic.iterations}`,
      responseSummary: `OUT: ${agentic.status}; findings=${agentic.findings.length}`,
      level: agentic.findings.length ? "info" : "warn",
    });

    logger.info(
      {
        target: name,
        status: agentic.status,
        model: agentic.model,
        findings: agentic.findings.length,
        searches: agentic.searches,
        visits: agentic.visits,
      },
      "[Bureau] Agentic web pass finished",
    );

    const mappedStatus =
      agentic.status === "unavailable" ? "unavailable"
      : agentic.status === "error" ? "error"
      : agentic.status === "timeout" ? "timeout"
      : "completed";

    return {
      status: mappedStatus,
      model: agentic.model,
      iterations: agentic.iterations,
      searches: agentic.searches,
      visits: agentic.visits,
      findings: agentic.findings,
      contactEvidence,
      trajectory: agentic.trajectory,
      error: agentic.error,
    };
  } catch (err: any) {
    logger.warn({ err: err?.message, target: name }, "[Bureau] Agentic web pass failed");
    return {
      status: "error",
      model: "none",
      iterations: 0,
      searches: 0,
      visits: 0,
      findings: [],
      contactEvidence: [],
      trajectory: [],
      error: err?.message ?? "agentic pass failed",
    };
  }
}
