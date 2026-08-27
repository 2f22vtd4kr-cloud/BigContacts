/**
 * Target contact agent — one person, one job: put the best public contact on the card.
 *
 * Same shape as a chat agent: model chooses tools, ranks claims, stops when done.
 * Output is entities.phone / email / linkedin / contactOutcome — not only evidence rows.
 */
import { eq } from "drizzle-orm";
import { db, entitiesTable } from "@workspace/db";
import { logger } from "./logger";
import { delCachePattern } from "./redis";
import { runAgenticWebResearch } from "./agentic-web-research";
import {
  persistBureauContactsForEntity,
  rehydrateEntityCardFromEvidence,
  type BureauContactLike,
} from "./bureau-contact-persist";
import { resolveResearchDepth } from "./research-depth";
import { publishBureauEvent } from "./bureau-live-log";
import { computeContactOutcome } from "./contact-confidence";

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

function findingsToContacts(
  findings: Array<{
    vectorType: string;
    value: string;
    scope: string;
    personName: string | null;
    role: string | null;
    sourceUrls: string[];
    note: string;
  }>,
  personName: string,
): BureauContactLike[] {
  return findings.map((f) => ({
    vectorType: f.vectorType,
    value: f.value,
    scope: f.scope,
    personName: f.personName ?? personName,
    role: f.role,
    sourceUrls: f.sourceUrls,
    note: `target-agent:${f.note}`,
    tier: "candidate",
    state: "review_only",
  }));
}

/**
 * Run free ReAct dig for one target and force-promote the best claims onto the entity card.
 */
export async function runTargetContactAgent(input: {
  entityId: number;
  targetName: string;
  companyName?: string | null;
  jobId?: string;
  maxIterations?: number;
  hardTimeoutMs?: number;
}): Promise<TargetContactAgentResult> {
  const name = (input.targetName ?? "").trim();
  if (!input.entityId || name.length < 2) {
    return {
      status: "skipped",
      model: "none",
      findings: 0,
      searches: 0,
      visits: 0,
      phone: null,
      email: null,
      phoneSource: null,
      contactOutcome: null,
    };
  }

  const depth = resolveResearchDepth();
  const objective =
    `Research ${name}` +
    (input.companyName ? ` linked to ${input.companyName}` : "") +
    `. You are a free public-web researcher for a private desk.\n` +
    `Recover attributable public contact paths when they exist. Use any tools you need. ` +
    `Never invent. Cite source URLs. Put the best real findings on the record.`;

  void publishBureauEvent({
    actor: "web",
    kind: "search",
    title: `Target agent · ${name}`,
    targetName: name,
    jobId: input.jobId,
    why: "Model-owned dig; card is the answer",
    level: "info",
  });

  const agentic = await runAgenticWebResearch({
    targetName: name,
    companyName: input.companyName ?? null,
    objective,
    jobId: input.jobId ?? null,
    maxIterations: input.maxIterations ?? Math.max(depth.agenticMaxIterations, 16),
    hardTimeoutMs: input.hardTimeoutMs ?? 300_000,
    onLiveStep: (step) => {
      void publishBureauEvent({
        actor: "web",
        kind:
          step.action === "web_search"
            ? "search"
            : step.action === "visit" || step.action === "browser_fetch"
              ? "page-fetch"
              : "tool",
        title: `${step.action}${step.query ? ` · ${step.query}` : step.url ? ` · ${step.url}` : ""}`.slice(0, 120),
        targetName: name,
        provider: step.provider || step.action,
        why: step.summary?.slice(0, 240),
        jobId: input.jobId,
        level: "info",
      });
    },
  });

  const contacts = findingsToContacts(agentic.findings, name);
  await persistBureauContactsForEntity(input.entityId, contacts, "target-contact-agent");
  await rehydrateEntityCardFromEvidence(input.entityId);

  // Refresh outcome from card fields after promote
  const rows = await db
    .select({
      type: entitiesTable.type,
      email: entitiesTable.email,
      phone: entitiesTable.phone,
      phoneSource: entitiesTable.phoneSource,
      linkedinUrl: entitiesTable.linkedinUrl,
      twitterHandle: entitiesTable.twitterHandle,
      instagramHandle: entitiesTable.instagramHandle,
      telegramHandle: entitiesTable.telegramHandle,
      personalWebsite: entitiesTable.personalWebsite,
      metadata: entitiesTable.metadata,
    })
    .from(entitiesTable)
    .where(eq(entitiesTable.id, input.entityId))
    .limit(1);

  const ent = rows[0];
  let outcome: string | null = null;
  if (ent) {
    let meta: Record<string, unknown> = {};
    try {
      meta = ent.metadata ? (JSON.parse(ent.metadata) as Record<string, unknown>) : {};
    } catch {
      meta = {};
    }
    outcome = computeContactOutcome({
      type: ent.type,
      email: ent.email,
      phone: ent.phone,
      phoneSource: ent.phoneSource,
      emailSource: typeof meta.emailSource === "string" ? meta.emailSource : null,
      linkedinUrl: ent.linkedinUrl,
      twitterHandle: ent.twitterHandle,
      instagramHandle: ent.instagramHandle,
      telegramHandle: ent.telegramHandle,
      website: typeof meta.website === "string" ? meta.website : ent.personalWebsite,
      metadata: ent.metadata,
    });
    const methodParts: string[] = [];
    if (ent.phone) {
      methodParts.push(
        `Phone ${ent.phone} (${ent.phoneSource ?? "dig"}). Validate before outreach.`,
      );
    }
    if (ent.email) {
      methodParts.push(`Email ${ent.email}. Validate before outreach.`);
    }
    if (ent.linkedinUrl) {
      methodParts.push(`LinkedIn ${ent.linkedinUrl}`);
    }
    const confidence =
      outcome === "direct_contact_candidate"
        ? 70
        : outcome === "organization_contact"
          ? 55
          : outcome === "evidence_only"
            ? 35
            : 20;
    await db
      .update(entitiesTable)
      .set({
        contactOutcome: outcome,
        contactConfidence: confidence,
        ...(methodParts.length
          ? { contactMethod: methodParts.join(" · ").slice(0, 500) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(entitiesTable.id, input.entityId));
    void delCachePattern("entities:list:*");
    void delCachePattern("dashboard:*");
  }

  logger.info(
    {
      entityId: input.entityId,
      name,
      status: agentic.status,
      model: agentic.model,
      findings: agentic.findings.length,
      phone: ent?.phone ?? null,
      outcome,
    },
    "[TargetAgent] Card updated from free dig",
  );

  const mapped =
    agentic.status === "completed"
      ? "completed"
      : agentic.status === "timeout"
        ? "timeout"
        : agentic.status === "unavailable"
          ? "unavailable"
          : "error";

  return {
    status: mapped,
    model: agentic.model,
    findings: agentic.findings.length,
    searches: agentic.searches,
    visits: agentic.visits,
    phone: ent?.phone ?? null,
    email: ent?.email ?? null,
    phoneSource: ent?.phoneSource ?? null,
    contactOutcome: outcome,
  };
}
