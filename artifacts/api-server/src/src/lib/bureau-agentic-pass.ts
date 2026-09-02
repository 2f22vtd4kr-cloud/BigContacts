/**
 * Bureau-facing wrapper around the ReAct agentic web loop.
 * Used whenever Boss selects a web/contact/footprint action or discovery
 * runs a web lane — same body as Atlas secondary expansion.
 */

import { logger } from "./logger";
import { runAgenticWebResearch, type AgenticFinding } from "./agentic-web-research";
import { resolveResearchDepth } from "./research-depth";
import { persistSourceBackedBureauContactsForEntity, type BureauContactLike } from "./bureau-contact-persist-strict";
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
  /** Explicit terminal reason from the underlying ReAct loop when available. */
  stopReason?: string;
  error?: string;
};

const WEB_SPECIALISTS = new Set(["web", "contact", "footprint"]);

export function isWebSpecialistAction(specialistId: string | null | undefined): boolean {
  return WEB_SPECIALISTS.has(String(specialistId ?? "").toLowerCase());
}

/** Exact-source law: contact evidence without an actual public URL is not durable evidence. */
export function sourceBackedAgenticFindings(findings: AgenticFinding[]): AgenticFinding[] {
  return findings.filter((finding) =>
    Array.isArray(finding.sourceUrls)
    && finding.sourceUrls.some((url) => /^https?:\/\/\S+$/i.test(String(url))),
  );
}

export function findingsToContactEvidence(findings: AgenticFinding[]) {
  return sourceBackedAgenticFindings(findings).map((f) => ({
    vectorType: f.vectorType,
    value: f.value,
    // Unknown contact scope is deliberately conservative. It is not allowed to
    // become a personal route merely because a target name is already known.
    scope: f.scope === "candidate" ? "candidate" : "organization",
    personName: f.scope === "candidate" ? f.personName : null,
    role: f.role,
    sourceUrls: f.sourceUrls.filter((url) => /^https?:\/\/\S+$/i.test(String(url))),
    note: f.note,
  }));
}

export function findingsToBureauContacts(
  findings: AgenticFinding[],
  fallbackPersonName: string,
): BureauContactLike[] {
  return sourceBackedAgenticFindings(findings).map((f) => ({
    vectorType: f.vectorType,
    value: f.value,
    // Candidate findings may inherit the already-verified target name.
    // Organization and unknown findings must remain organization-scoped and
    // nameless; this prevents info@ / switchboards from becoming personal.
    scope: f.scope === "candidate" ? "candidate" : "organization",
    personName: f.scope === "candidate" ? (f.personName ?? fallbackPersonName) : null,
    role: f.role,
    sourceUrls: f.sourceUrls.filter((url) => /^https?:\/\/\S+$/i.test(String(url))),
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
  hardTimeoutMs?: number;
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
    const agentic = await runAgenticWebResearch({
      targetName: name,
      companyName: input.companyName ?? null,
      jobId: input.jobId ?? null,
      objective: input.objective
        ?? `Find publicly documented contact routes for ${name}${input.companyName ? ` related to ${input.companyName}` : ""}. Multi-hop. Visit primary pages. Never invent.`,
      maxIterations: input.maxIterations ?? resolveResearchDepth().agenticMaxIterations,
      hardTimeoutMs: input.hardTimeoutMs ?? resolveResearchDepth().agenticHardTimeoutMs,
      shouldCancel: input.shouldCancel,
      onLiveStep: (step) => {
        const kind =
          step.action === "web_search" ? "search"
          : step.action === "visit" || step.action === "browser_fetch" ? "page-fetch"
          : step.action === "registry_search" ? "registry"
          : step.action === "domain_lookup" ? "domain"
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

    const backedFindings = sourceBackedAgenticFindings(agentic.findings);
    const contactEvidence = findingsToContactEvidence(backedFindings);

    if (input.persist && input.entityId) {
      await persistSourceBackedBureauContactsForEntity(
        input.entityId,
        findingsToBureauContacts(backedFindings, name),
        "case-bureau-agentic",
        input.jobId,
      );
    }

    void publishBureauEvent({
      actor: "web",
      kind: "extract",
      title: `Agentic web · ${backedFindings.length} source-backed findings${agentic.findings.length !== backedFindings.length ? ` (${agentic.findings.length - backedFindings.length} ungrounded dropped)` : ""}${agentic.status === "timeout" ? " (timeout)" : ""}`,
      caseId: input.caseId != null ? String(input.caseId) : undefined,
      jobId: input.jobId,
      targetName: name,
      provider: agentic.model,
      why: `searches=${agentic.searches} visits=${agentic.visits} iters=${agentic.iterations}`,
      responseSummary: `OUT: ${agentic.status}; sourceBacked=${backedFindings.length}; raw=${agentic.findings.length}`,
      level: backedFindings.length ? "info" : "warn",
    });

    logger.info(
      {
        target: name,
        status: agentic.status,
        model: agentic.model,
        findings: backedFindings.length,
        rawFindings: agentic.findings.length,
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
      findings: backedFindings,
      contactEvidence,
      trajectory: agentic.trajectory,
      stopReason: agentic.stopReason,
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
