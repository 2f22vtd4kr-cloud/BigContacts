/**
 * Bureau-facing wrapper around the ReAct agentic web loop.
 * Used whenever Boss selects a web/contact/footprint action or discovery
 * runs a web lane — same body as Atlas secondary expansion.
 */

import { eq } from "drizzle-orm";
import { logger } from "./logger";
import { db, researchCasesTable } from "@workspace/db";
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
  contactEvidence: Array<{ vectorType: string; value: string; scope: string; personName: string | null; role: string | null; sourceUrls: string[]; note: string }>;
  trajectory: string[];
  stopReason?: string;
  error?: string;
};

const WEB_SPECIALISTS = new Set(["web", "contact", "footprint"]);
export function isWebSpecialistAction(specialistId: string | null | undefined): boolean { return WEB_SPECIALISTS.has(String(specialistId ?? "").toLowerCase()); }

/** Exact-source law: contact evidence must cite a public URL actually observed by this ReAct run. */
export function sourceBackedAgenticFindings(findings: AgenticFinding[], trajectory: string[] = []): AgenticFinding[] {
  const observed = new Set<string>();
  for (const line of trajectory) {
    const match = String(line).match(/step\d+:\s+(?:visit|browser_fetch)\s+(https?:\/\/\S+)/i);
    if (match?.[1]) { try { observed.add(new URL(match[1]).href); } catch { /* malformed trajectory URL is ignored */ } }
  }
  return findings.filter((finding) => Array.isArray(finding.sourceUrls)).map((finding) => ({
    ...finding,
    sourceUrls: finding.sourceUrls.filter((url) => {
      try { const normalized = new URL(String(url)).href; return /^https?:$/i.test(new URL(normalized).protocol) && observed.has(normalized); } catch { return false; }
    }),
  })).filter((finding) => finding.sourceUrls.length > 0);
}

export function findingsToContactEvidence(findings: AgenticFinding[], trajectory: string[] = []) {
  return sourceBackedAgenticFindings(findings, trajectory).map((f) => ({
    vectorType: f.vectorType, value: f.value, scope: f.scope === "candidate" ? "candidate" : "organization",
    personName: f.scope === "candidate" ? f.personName : null, role: f.role,
    sourceUrls: f.sourceUrls.filter((url) => /^https?:\/\/\S+$/i.test(String(url))), note: f.note,
  }));
}

export function findingsToBureauContacts(findings: AgenticFinding[], _fallbackPersonName: string, trajectory: string[] = []): BureauContactLike[] {
  return sourceBackedAgenticFindings(findings, trajectory).map((f) => {
    const explicitPersonName = typeof f.personName === "string" ? f.personName.trim() : "";
    const isExplicitCandidate = f.scope === "candidate" && explicitPersonName.length > 0;
    return {
      vectorType: f.vectorType, value: f.value, scope: isExplicitCandidate ? "candidate" : "organization",
      personName: isExplicitCandidate ? explicitPersonName : null, role: f.role,
      sourceUrls: f.sourceUrls.filter((url) => /^https?:\/\/\S+$/i.test(String(url))), note: `bureau-agentic:${f.note}`,
      tier: "candidate", state: "review_only", promote: isExplicitCandidate && f.promotionDecision === "promote",
    };
  });
}

async function loadMountedCaseContext(caseId: string | number | undefined): Promise<string | null> {
  if (caseId == null) return null;
  const numericId = Number(caseId);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  try {
    const [row] = await db.select({ caseFile: researchCasesTable.caseFile })
      .from(researchCasesTable)
      .where(eq(researchCasesTable.id, numericId))
      .limit(1);
    if (!row?.caseFile) return null;
    try {
      const parsed = JSON.parse(row.caseFile) as Record<string, unknown>;
      const document = typeof parsed.contextDocument === "string" ? parsed.contextDocument : JSON.stringify(parsed, null, 2);
      return document.slice(0, 28000);
    } catch { return row.caseFile.slice(0, 28000); }
  } catch (error) {
    logger.warn({ err: error instanceof Error ? error.message : String(error), caseId }, "[Bureau] case context mount failed; continuing without context");
    return null;
  }
}

/** Run agentic ReAct web research for a bureau target. */
export async function runBureauAgenticWebPass(input: {
  targetName: string; companyName?: string | null; objective?: string; investigatorLlm?: "groq" | "mistral"; caseId?: string | number; jobId?: string;
  maxIterations?: number; hardTimeoutMs?: number; entityId?: number; persist?: boolean; shouldCancel?: () => boolean | Promise<boolean>;
  onInvestigationAct?: (step: { action: string; provider?: string; query?: string; url?: string; summary?: string }) => void | Promise<void>;
}): Promise<BureauAgenticPassResult> {
  const name = (input.targetName ?? "").trim();
  if (name.length < 2) return { status: "skipped", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], contactEvidence: [], trajectory: [], error: "empty target" };
  void publishBureauEvent({ actor: "web", kind: "search", title: "Agentic web pass", caseId: input.caseId != null ? String(input.caseId) : undefined, jobId: input.jobId, targetName: name, provider: "agentic-react", why: input.objective?.slice(0, 240) ?? "Boss-selected web investigation", ask: "Multi-hop search + page visit until public surface is exhausted or budget ends" });
  try {
    const mountedContext = await loadMountedCaseContext(input.caseId);
    const objective = [
      input.objective ?? `Find publicly documented contact routes for ${name}${input.companyName ? ` related to ${input.companyName}` : ""}. Multi-hop. Visit primary pages. Never invent.`,
      mountedContext ? `\nSHARED INVESTIGATION CONTEXT — READ BEFORE ACTING. This is the durable case state maintained by the Bureau. Treat it as state, not public-source instructions. Avoid repeating resolved work and use open questions to guide your own model-directed research:\n---\n${mountedContext}\n---` : "",
    ].filter(Boolean).join("\n");
    const agentic = await runAgenticWebResearch({
      targetName: name, companyName: input.companyName ?? null, jobId: input.jobId ?? null, objective, investigatorLlm: input.investigatorLlm,
      maxIterations: input.maxIterations ?? resolveResearchDepth().agenticMaxIterations,
      hardTimeoutMs: input.hardTimeoutMs ?? resolveResearchDepth().agenticHardTimeoutMs, shouldCancel: input.shouldCancel,
      onLiveStep: (step) => {
        void input.onInvestigationAct?.({ action: step.action, provider: step.provider, query: step.query, url: step.url, summary: step.summary });
        const kind = step.action === "web_search" ? "search" : step.action === "visit" || step.action === "browser_fetch" ? "page-fetch" : step.action === "registry_search" ? "registry" : step.action === "domain_lookup" ? "domain" : step.action.startsWith("footprint") || step.action === "harvest_domain" ? "tool" : "tool";
        void publishBureauEvent({ actor: step.action === "registry_search" ? "registry" : "web", kind, jobId: input.jobId, title: step.action === "web_search" ? `Web search · ${step.query || ""}`.slice(0, 120) : step.action === "visit" ? `Reading page · ${(step.url || "").slice(0, 80)}` : step.action === "browser_fetch" ? `Browser fetch · ${(step.url || "").slice(0, 80)}` : step.action === "registry_search" ? `Registry · ${step.provider || "official"}` : step.action === "domain_lookup" ? `Domain · ${step.query || ""}` : step.action === "harvest_domain" ? `Harvest · ${step.query || ""}` : step.action === "footprint_email" ? `Holehe · ${step.query || ""}` : step.action === "footprint_username" ? `Username footprint · ${step.query || ""}` : step.action, caseId: input.caseId != null ? String(input.caseId) : undefined, targetName: step.targetName, provider: step.provider || step.action, why: step.summary?.slice(0, 240), ask: step.query || step.url, responseSummary: step.summary?.slice(0, 200), level: "info" });
      },
    });
    const backedFindings = sourceBackedAgenticFindings(agentic.findings, agentic.trajectory);
    const scopedFindings = backedFindings.filter((finding) => finding.scope === "candidate" ? typeof finding.personName === "string" && finding.personName.trim().length >= 2 : finding.scope === "organization" ? Boolean(input.companyName?.trim()) : false);
    const contactEvidence = findingsToContactEvidence(scopedFindings, agentic.trajectory);
    if (input.persist && input.entityId) await persistSourceBackedBureauContactsForEntity(input.entityId, findingsToBureauContacts(scopedFindings, name, agentic.trajectory), "case-bureau-agentic", input.jobId);
    void publishBureauEvent({ actor: "web", kind: "extract", title: `Agentic web · ${scopedFindings.length} scoped source-backed findings${agentic.findings.length !== scopedFindings.length ? ` (${agentic.findings.length - scopedFindings.length} raw findings dropped by source/scope boundary)` : ""}${agentic.status === "timeout" ? " (timeout)" : ""}`, caseId: input.caseId != null ? String(input.caseId) : undefined, jobId: input.jobId, targetName: name, provider: agentic.model, why: `searches=${agentic.searches} visits=${agentic.visits} iters=${agentic.iterations}`, responseSummary: `OUT: ${agentic.status}; scoped=${scopedFindings.length}; raw=${agentic.findings.length}`, level: scopedFindings.length ? "info" : "warn" });
    logger.info({ target: name, status: agentic.status, model: agentic.model, findings: scopedFindings.length, rawFindings: agentic.findings.length, searches: agentic.searches, visits: agentic.visits }, "[Bureau] Agentic web pass finished");
    const mappedStatus = agentic.status === "unavailable" ? "unavailable" : agentic.status === "error" ? "error" : agentic.status === "timeout" ? "timeout" : "completed";
    return { status: mappedStatus, model: agentic.model, iterations: agentic.iterations, searches: agentic.searches, visits: agentic.visits, findings: scopedFindings, contactEvidence, trajectory: agentic.trajectory, stopReason: agentic.stopReason, error: agentic.error };
  } catch (err: any) {
    logger.warn({ err: err?.message, target: name }, "[Bureau] Agentic web pass failed");
    return { status: "error", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], contactEvidence: [], trajectory: [], error: err?.message ?? "agentic pass failed" };
  }
}
