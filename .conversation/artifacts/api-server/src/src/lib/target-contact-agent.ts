/**
 * Target contact agent — one person, one job: investigate public contact
 * surfaces. The investigator owns what is emitted as a finding; deterministic
 * code validates provenance/schema and persists that evidence.
 */
import { eq } from "drizzle-orm";
import { db, entitiesTable } from "@workspace/db";
import { logger } from "./logger";
import { delCachePattern } from "./redis";
import { runAgenticWebResearch, type AgenticFinding } from "./agentic-web-research";
import { persistSourceBackedBureauContactsForEntity, type BureauContactLike } from "./bureau-contact-persist-strict";
import { resolveResearchDepth, describeResearchDepth } from "./research-depth";
import { publishBureauEvent } from "./bureau-live-log";
import { computeContactOutcome } from "./contact-confidence";
import { publishDigSpan, spanFromLiveStep } from "./dig-span";

export type TargetContactAgentResult = {
  status: "completed" | "timeout" | "unavailable" | "error" | "skipped";
  model: string;
  findings: number;
  searches: number;
  visits: number;
  phone: string | null;
  email: string | null;
  phoneSource: string | null;
  contactOutcome: string | null;
};

/** Exact-source law: a contact claim without its actual public source URL is not durable evidence. */
export function sourceBackedFindings(findings: AgenticFinding[]): AgenticFinding[] {
  return findings.filter((finding) =>
    Array.isArray(finding.sourceUrls)
    && finding.sourceUrls.some((url) => /^https?:\/\/\S+$/i.test(String(url))),
  );
}

/** Preserve model scope and never turn an organization route into a personal one. */
export function findingsToContacts(
  findings: Array<{ vectorType: string; value: string; scope: string; personName: string | null; role: string | null; sourceUrls: string[]; note: string }>,
  personName: string,
): BureauContactLike[] {
  return findings
    .filter((f) => Array.isArray(f.sourceUrls) && f.sourceUrls.some((url) => /^https?:\/\/\S+$/i.test(String(url))))
    .map((f) => ({
      vectorType: f.vectorType,
      value: f.value,
      scope: String(f.scope).toLowerCase() === "candidate" ? "candidate" : "organization",
      personName: String(f.scope).toLowerCase() === "candidate" ? (f.personName ?? personName) : null,
      role: f.role,
      sourceUrls: f.sourceUrls.filter((url) => /^https?:\/\/\S+$/i.test(String(url))),
      note: `target-agent:${f.note}`,
      tier: "candidate",
      state: "review_only",
    }));
}

/** Run free ReAct Dig for one target. No legacy evidence rehydration is allowed here. */
export async function runTargetContactAgent(input: { entityId: number; targetName: string; companyName?: string | null; jobId?: string; maxIterations?: number; hardTimeoutMs?: number }): Promise<TargetContactAgentResult> {
  const name = (input.targetName ?? "").trim();
  if (!input.entityId || name.length < 2) return { status: "skipped", model: "none", findings: 0, searches: 0, visits: 0, phone: null, email: null, phoneSource: null, contactOutcome: null };

  const depth = resolveResearchDepth();
  logger.info({ entityId: input.entityId, depth: describeResearchDepth(depth) }, "[target-agent] dig depth");
  const objective = [
    `Research the public identity and contact surface for ${name}${input.companyName ? ` linked to ${input.companyName}` : ""}.`,
    "Act like a strong human public-web researcher with a bounded execution budget. The goal is an attributable, realistic route to this person, not fame, wealth ranking, or generic company contact information.",
    "Start from the known identity and use evidence to choose the next query or tool. Prefer primary company pages, filings, leadership pages, interviews, operating-company sources, public office/intermediary surfaces, or other concrete evidence that can actually connect to the named person.",
    "Do not waste the budget on Forbes/Bloomberg/richest-person lists or celebrity/fame enumeration. If such a result appears, treat it as incidental context and pivot to the person's operating company, office, principal/intermediary surface, filing, foundation, transaction, or another concrete route.",
    "Do not begin with generic 'contact CEO/founder' or contact-form hunting. If a page gives you a concrete lead, inspect it and pivot from evidence rather than issuing repetitive broad searches.",
    "You choose every action and stopping point. There is no fixed search checklist or mandatory hop order. Use non-LLM OSINT tools only when they are useful to the evidence you have.",
    "Never invent a contact, relationship, person, or URL. Every contact finding must carry the exact public URL where that value was observed. A search-engine query URL is not evidence of the claim. Keep organization inboxes and switchboards in organization scope, never as personal contacts.",
    "A source-backed result may still be wrong-person evidence. Use the identity, role, company, page context and source quality to decide whether a claim belongs to this person. If identity is ambiguous, preserve it as uncertain evidence rather than promoting it.",
    "Stop when the evidence is exhausted or you have a sufficiently attributable route; do not keep searching merely to increase the number of findings.",
  ].join("\n");

  void publishBureauEvent({ actor: "web", kind: "search", title: `Target agent · ${name}`, targetName: name, jobId: input.jobId, why: "Model-owned Dig; card updates only from its emitted source-backed findings", level: "info" });
  try { publishDigSpan({ jobId: input.jobId || "dig", targetName: name, spanType: "stage", name: "target_contact_agent_start", status: "active", agentName: "investigator", inputSummary: `depth=${depth.depth} maxIter=${input.maxIterations ?? depth.agenticMaxIterations}` }); } catch { /* non-fatal */ }

  const agentic = await runAgenticWebResearch({
    targetName: name,
    companyName: input.companyName ?? null,
    objective,
    jobId: input.jobId ?? null,
    maxIterations: input.maxIterations ?? depth.agenticMaxIterations,
    hardTimeoutMs: input.hardTimeoutMs ?? depth.agenticHardTimeoutMs,
    onLiveStep: (step) => {
      try { spanFromLiveStep({ jobId: input.jobId, targetName: name, tool: step.action, label: step.query || step.url || step.action, detail: step.summary, status: "ok", agentName: "investigator" }); } catch { /* spans best-effort */ }
      void publishBureauEvent({ actor: "web", kind: step.action === "web_search" ? "search" : step.action === "visit" || step.action === "browser_fetch" ? "page-fetch" : "tool", title: `${step.action}${step.query ? ` · ${step.query}` : step.url ? ` · ${step.url}` : ""}`.slice(0, 120), targetName: name, provider: step.provider || step.action, why: step.summary?.slice(0, 240), jobId: input.jobId, level: "info" });
    },
  });

  try { publishDigSpan({ jobId: input.jobId || "dig", targetName: name, spanType: "stage", name: "target_contact_agent_done", status: agentic.status === "timeout" ? "error" : "ok", agentName: "investigator", inputSummary: `model=${agentic.model}`, resultSummary: `status=${agentic.status} findings=${agentic.findings.length} searches=${agentic.searches} visits=${agentic.visits} stop=${agentic.stopReason}`, endedAt: new Date().toISOString() }); } catch { /* non-fatal */ }

  const backedFindings = sourceBackedFindings(agentic.findings);
  const contacts = findingsToContacts(backedFindings, name);
  // Canonical boundary: persist only this Dig's source-backed output. The strict
  // persistence boundary may map an unambiguous investigator-emitted value, but
  // this agent never calls legacy rehydrate/ranking over unrelated evidence.
  await persistSourceBackedBureauContactsForEntity(input.entityId, contacts, "target-contact-agentic", input.jobId);

  const rows = await db.select({ type: entitiesTable.type, email: entitiesTable.email, phone: entitiesTable.phone, phoneSource: entitiesTable.phoneSource, linkedinUrl: entitiesTable.linkedinUrl, twitterHandle: entitiesTable.twitterHandle, instagramHandle: entitiesTable.instagramHandle, telegramHandle: entitiesTable.telegramHandle, personalWebsite: entitiesTable.personalWebsite, metadata: entitiesTable.metadata }).from(entitiesTable).where(eq(entitiesTable.id, input.entityId)).limit(1);
  const ent = rows[0];
  let outcome: string | null = null;
  if (ent) {
    let meta: Record<string, unknown> = {};
    try { meta = ent.metadata ? (JSON.parse(ent.metadata) as Record<string, unknown>) : {}; } catch { meta = {}; }
    outcome = computeContactOutcome({ type: ent.type, email: ent.email, phone: ent.phone, phoneSource: ent.phoneSource, emailSource: typeof meta.emailSource === "string" ? meta.emailSource : null, linkedinUrl: ent.linkedinUrl, twitterHandle: ent.twitterHandle, instagramHandle: ent.instagramHandle, telegramHandle: ent.telegramHandle, website: typeof meta.website === "string" ? meta.website : ent.personalWebsite, metadata: ent.metadata });
    const methodParts: string[] = [];
    if (ent.phone) methodParts.push(`Phone ${ent.phone} (${ent.phoneSource ?? "dig"}). Validate before outreach.`);
    if (ent.email) methodParts.push(`Email ${ent.email}. Validate before outreach.`);
    if (ent.linkedinUrl) methodParts.push(`LinkedIn ${ent.linkedinUrl}`);
    const confidence = outcome === "direct_contact_candidate" ? 70 : outcome === "organization_contact" ? 55 : outcome === "evidence_only" ? 35 : 20;
    await db.update(entitiesTable).set({ contactOutcome: outcome, contactConfidence: confidence, ...(methodParts.length ? { contactMethod: methodParts.join(" · ").slice(0, 500) } : {}), updatedAt: new Date() }).where(eq(entitiesTable.id, input.entityId));
    void delCachePattern("entities:list:*");
    void delCachePattern("dashboard:*");
  }

  logger.info({ entityId: input.entityId, name, status: agentic.status, model: agentic.model, findings: backedFindings.length, rawFindings: agentic.findings.length, stopReason: agentic.stopReason, phone: ent?.phone ?? null, outcome }, "[TargetAgent] free Dig finished");
  const mapped = agentic.status === "completed" ? "completed" : agentic.status === "timeout" ? "timeout" : agentic.status === "unavailable" ? "unavailable" : "error";
  return { status: mapped, model: agentic.model, findings: backedFindings.length, searches: agentic.searches, visits: agentic.visits, phone: ent?.phone ?? null, email: ent?.email ?? null, phoneSource: ent?.phoneSource ?? null, contactOutcome: outcome };
}
