/**
 * Materialize bureau / discovery contact evidence onto durable contact_evidence
 * rows so HNWI profile cards show related routes without waiting for a full
 * deep-web enrich pass.
 */
import { db, contactEvidenceTable, entitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sanitizePublicEmail, sanitizePublicPhone, isTrashContactValue } from "./contact-validation";
import { logger } from "./logger";
import { invalidateBM25Index } from "./bm25";
import { invalidateTFIDFCorpus } from "./tfidf-embedder";
import { resolveResearchDepth } from "./research-depth";
import { publishBureauEvent } from "./bureau-live-log";
import { computeContactOutcome } from "./contact-confidence";
import { assessIdentityCollision } from "./identity-collision";
import { publishDigSpan } from "./dig-span";
import { delCachePattern } from "./redis";
import { isProtectedPhoneSource, isIssuerSwitchboardSource, isAgenticEmailSource } from "./phone-source-priority";
import { countIndependentSourceHosts, meetsTwoSourceRule, isAggregatorHost, hostnameOf } from "./source-corroboration";
import { apexOrientationCompact } from "./apex-bureau-orientation";

export type BureauContactLike = {
  vectorType?: string | null;
  value?: string | null;
  scope?: string | null;
  personName?: string | null;
  role?: string | null;
  sourceUrls?: string[] | null;
  note?: string | null;
  tier?: string | null;
  state?: string | null;
};

function mapVectorType(raw: string, value: string): string {
  const t = raw.toLowerCase().trim();
  if (t === "email" || t === "phone" || t === "website" || t === "domain" || t === "address" || t === "social") {
    return t;
  }
  if (t === "linkedin" || t === "twitter" || t === "instagram" || t === "telegram") return "social";
  if (t === "organization_contact" || t === "other") {
    if (value.includes("@")) return "email";
    if (/^https?:\/\//i.test(value)) return "website";
    if (/^\+?[\d\s().-]{7,}$/.test(value)) return "phone";
    return "domain";
  }
  if (value.includes("@")) return "email";
  if (/^https?:\/\//i.test(value)) return "website";
  return "domain";
}

function sanitizeValue(vectorType: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (vectorType === "email") return sanitizePublicEmail(trimmed);
  if (vectorType === "phone") return sanitizePublicPhone(trimmed);
  if (vectorType === "domain" || vectorType === "website") {
    // Reject page chrome / person names / marketing fragments mis-typed as domains.
    const v = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] ?? "";
    if (!v || v.length < 4 || v.length > 120) return null;
    if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(v)) return null;
    if (/directory-cta|srcset|cdn-www|wixpress|example\.com|schema\.org/i.test(v)) return null;
    if (/\s/.test(trimmed) && !trimmed.includes("://")) return null;
    return v.toLowerCase().slice(0, 200);
  }
  if (vectorType === "other" && /directory-cta|srcset|cdn-www|Directory Search/i.test(trimmed)) {
    return null;
  }
  // Person names must not be stored as free-text domain values.
  if (vectorType === "domain" && /^[A-Z][a-z]+(?:\s+[A-Z][a-z.]+)+$/.test(trimmed)) return null;
  return trimmed.slice(0, 500);
}

/**
 * Persist related bureau contacts as candidate evidence. Never marks them
 * verified_direct — fail-closed promotion stays elsewhere.
 */


export async function persistBureauContactsForEntity(
  entityId: number,
  items: readonly BureauContactLike[] | null | undefined,
  source = "case-bureau",
  jobId?: string | null,
): Promise<number> {
  if (!entityId) return 0;
  const list = Array.isArray(items) ? items : [];
  // Empty list still runs card promotion from durable contact_evidence (rehydrate path).
  if (!list.length) {
    try {
      await promoteBureauContactsToEntityCard(entityId, [], source, jobId);
    } catch {
      /* non-fatal */
    }
    return 0;
  }

  let targetName = "";
  let companyName: string | null = null;
  try {
    const ent = await db.select({
      name: entitiesTable.name,
      metadata: entitiesTable.metadata,
    }).from(entitiesTable).where(eq(entitiesTable.id, entityId)).limit(1);
    targetName = ent[0]?.name ?? "";
    try {
      const meta = ent[0]?.metadata ? JSON.parse(ent[0].metadata) as Record<string, unknown> : {};
      companyName = typeof meta.companyName === "string" ? meta.companyName : null;
    } catch { companyName = null; }
  } catch {
    // non-fatal — collision assessment degrades to token-only on item fields
  }

  const rows: Array<{
    entityId: number;
    vectorType: string;
    value: string;
    source: string;
    sourceUrl: string | null;
    extractionMethod: string;
    sourceReliability: number;
    identityMatch: number;
    recencyScore: number;
    directnessScore: number;
    independentCorroboration: number;
    validationStatus: "candidate";
    rejectionReason: null;
    observedAt: Date;
    metadata: string;
  }> = [];

  const seen = new Set<string>();
  for (const item of list) {
    if (String(item.state ?? "").toLowerCase() === "rejected") continue;
    const rawValue = typeof item.value === "string" ? item.value.trim() : "";
    if (!rawValue) continue;
    const vectorType = mapVectorType(String(item.vectorType ?? "other"), rawValue);
    const value = sanitizeValue(vectorType, rawValue);
    if (!value) continue;
    if (isTrashContactValue(vectorType, value)) continue;
    const key = `${vectorType}:${value.toLowerCase()}:${source}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const scope = String(item.scope ?? item.tier ?? "unknown").toLowerCase();
    const orgish = scope.includes("organization") || scope.includes("org")
      || /^(info|contact|office|press|hello|admin|sales)@/i.test(value);
    let urls = Array.isArray(item.sourceUrls)
      ? item.sourceUrls.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
      : [];

    // Prefer source URLs. For model dig findings without a page URL, attach a
    // deterministic public search URL so the claim is reviewable — do not silently drop.
    const needsClaimUrl = ["email", "phone", "linkedin", "twitter", "instagram", "telegram"].includes(vectorType);
    if (needsClaimUrl && urls.length === 0) {
      const fromAgent =
        source.includes("agent") ||
        source.includes("target-contact") ||
        source.includes("secondary") ||
        String(item.note ?? "").includes("agentic") ||
        String(item.note ?? "").includes("target-agent");
      if (fromAgent && targetName) {
        urls = [
          `https://www.google.com/search?q=${encodeURIComponent(`"${targetName}" ${value}`)}`,
        ];
      } else {
        continue;
      }
    }

    // related-person without URL: attach issuer EDGAR search when company known; else drop
    if (urls.length === 0 && /^related-person:/i.test(value)) {
      if (!companyName) continue;
      urls = [
        `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent('"' + companyName.slice(0, 80) + '"')}&forms=SC+13D,SC+13G`,
      ];
    }
    // Org issuer name anchor without URL: attach EDGAR search, never a fake contact
    if (urls.length === 0 && (vectorType === "domain" || vectorType === "organization" || vectorType === "other")
        && orgish && companyName) {
      urls = [
        `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent('"' + companyName.slice(0, 80) + '"')}&forms=SC+13D,SC+13G`,
      ];
    }

    const collision = assessIdentityCollision({
      targetName,
      companyName,
      personName: item.personName ?? null,
      value,
      sourceUrls: urls,
      note: item.note ?? null,
    });
    // Org-scoped vectors stay orgish; collision-prone personal vectors get demoted not dropped
    // (visibility law: show as weak candidate, never hide silently, never promote as personal).
    const forceOrg =
      collision.risk && (vectorType === "email" || vectorType === "phone" || vectorType === "linkedin");
    const scopeOrgish = orgish || forceOrg;
    const identityMatch = scopeOrgish ? Math.min(0.35, collision.identityMatch) : collision.identityMatch;
    rows.push({
      entityId,
      vectorType,
      value,
      source,
      sourceUrl: urls[0] ?? null,
      extractionMethod: "case-bureau-contact",
      sourceReliability: collision.risk ? 0.28 : 0.55,
      identityMatch,
      recencyScore: 0.7,
      directnessScore: scopeOrgish ? 0.3 : (vectorType === "email" || vectorType === "phone" ? 0.5 : 0.4),
      independentCorroboration: countIndependentSourceHosts(urls),
      validationStatus: "candidate",
      rejectionReason: null,
      observedAt: new Date(),
      metadata: JSON.stringify({
        scope: scopeOrgish ? "organization" : (scope || "unknown"),
        personName: item.personName ?? null,
        role: item.role ?? null,
        note: item.note ?? null,
        tier: item.tier ?? null,
        sourceUrls: urls.slice(0, 5),
        fromBureau: true,
        identityCollisionRisk: collision.risk,
        identityCollisionReason: collision.reason,
        forcedOrgDueToCollision: forceOrg || undefined,
      }),
    });
  }

  if (!rows.length) return 0;
  try {
    await db.insert(contactEvidenceTable).values(rows).onConflictDoNothing();
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), entityId, count: rows.length },
      "Failed to persist bureau contact evidence",
    );
    return 0;
  }

  // Dig bag → card: promote best non-issuer phone/email onto the entity so
  // free agentic findings are not stranded as evidence_only while EDGAR-Phone stays.
  try {
    await promoteBureauContactsToEntityCard(entityId, items, source, jobId);
  } catch (err) {
    logger.debug(
      { err: err instanceof Error ? err.message : String(err), entityId },
      "promoteBureauContactsToEntityCard skipped",
    );
  }
  return rows.length;
}

function isGenericLocal(email: string): boolean {
  const local = (email.split("@")[0] ?? "").toLowerCase();
  return /^(info|contact|office|press|hello|admin|sales|support|enquir(?:y|ies)|ir|media)$/i.test(local);
}

/**
 * Promote the best dig-sourced phone/email onto entities.* when better than
 * issuer switchboard (EDGAR-Phone) or empty. Never invents — only values in items.
 */
async function promoteBureauContactsToEntityCard(
  entityId: number,
  items: readonly BureauContactLike[],
  source: string,
  jobId?: string | null,
): Promise<void> {
  const entRows = await db
    .select({
      id: entitiesTable.id,
      name: entitiesTable.name,
      type: entitiesTable.type,
      email: entitiesTable.email,
      phone: entitiesTable.phone,
      phoneSource: entitiesTable.phoneSource,
      contactOutcome: entitiesTable.contactOutcome,
      linkedinUrl: entitiesTable.linkedinUrl,
      twitterHandle: entitiesTable.twitterHandle,
      instagramHandle: entitiesTable.instagramHandle,
      telegramHandle: entitiesTable.telegramHandle,
      personalWebsite: entitiesTable.personalWebsite,
      metadata: entitiesTable.metadata,
    })
    .from(entitiesTable)
    .where(eq(entitiesTable.id, entityId))
    .limit(1);
  const ent = entRows[0];
  if (!ent) return;


  // Merge live dig items with durable contact_evidence so a prior agentic pass
  // still upgrades the card even if this call's items array is thin.
  let evidenceItems: BureauContactLike[] = [];
  try {
    const ev = await db
      .select({
        vectorType: contactEvidenceTable.vectorType,
        value: contactEvidenceTable.value,
        source: contactEvidenceTable.source,
        sourceUrl: contactEvidenceTable.sourceUrl,
        validationStatus: contactEvidenceTable.validationStatus,
        metadata: contactEvidenceTable.metadata,
      })
      .from(contactEvidenceTable)
      .where(eq(contactEvidenceTable.entityId, entityId))
      .limit(80);
    evidenceItems = ev
      .filter((r) => String(r.validationStatus ?? "") !== "rejected")
      .map((r) => {
        let scope = "unknown";
        try {
          const m = r.metadata ? JSON.parse(r.metadata) as Record<string, unknown> : {};
          if (typeof m.tier === "string") scope = m.tier;
          if (typeof m.scope === "string") scope = m.scope;
        } catch { /* ignore */ }
        const src = String(r.source ?? "");
        if (src.includes("agentic") || src.includes("secondary")) {
          /* keep */
        }
        return {
          vectorType: r.vectorType,
          value: r.value,
          scope,
          sourceUrls: r.sourceUrl ? [r.sourceUrl] : [],
          state: "review_only",
          note: src,
        } satisfies BureauContactLike;
      });
  } catch {
    evidenceItems = [];
  }

  const merged: BureauContactLike[] = [...items, ...evidenceItems];

  let bestPhone: { value: string; source: string; score: number } | null = null;
  let bestEmail: { value: string; source: string; score: number } | null = null;
  let bestLinkedin: string | null = null;
  let bestWebsite: string | null = null;

  const urlHostScore = (urls: string[]): number => {
    let s = 0;
    for (const u of urls) {
      const h = u.toLowerCase();
      const host = hostnameOf(u) ?? "";
      // Primary public registries — professional OSINT preference for filings
      if (h.includes("sec.gov") || h.includes("edgar")) s += 6;
      else if (h.includes("companieshouse") || h.includes("opencorporates")) s += 4;
      // Data-broker / people-search hosts — weak attribution (two-source discipline)
      else if (isAggregatorHost(host) || h.includes("leadiq")) s -= 4;
      else if (/^https?:\/\//i.test(u)) s += 1;
    }
    // Pure aggregator-only sets stay weak even with many mirrored URLs
    if (urls.length && countIndependentSourceHosts(urls) <= 1 && urls.every((u) => isAggregatorHost(hostnameOf(u)))) {
      s = Math.min(s, -3);
    }
    return s;
  };

  for (const item of merged) {
    if (String(item.state ?? "").toLowerCase() === "rejected") continue;
    const vt = String(item.vectorType ?? "").toLowerCase();
    const value = typeof item.value === "string" ? item.value.trim() : "";
    if (!value) continue;
    // Skip placeholder / extraction garbage
    if (/^(linkedin:not-found|n\/a|none|null)$/i.test(value)) continue;
    if (/^[a-z]@/i.test(value) && value.split("@")[0].length <= 1) continue; // y@gnty.com style noise
    const scope = String(item.scope ?? item.tier ?? "").toLowerCase();
    const note = String(item.note ?? "").toLowerCase();
    let orgish =
      scope.includes("organization") ||
      scope.includes("org") ||
      scope.includes("issuer") ||
      note.includes("org");
    const urls = Array.isArray(item.sourceUrls)
      ? item.sourceUrls.filter((u) => typeof u === "string" && /^https?:\/\//i.test(u))
      : [];
    const hostScore = urlHostScore(urls);
    if (hostScore <= -3) continue; // directory / wrong-issuer trash
    const collision = assessIdentityCollision({
      targetName: ent.name,
      companyName: null,
      personName: item.personName ?? null,
      value,
      sourceUrls: urls,
      note: item.note ?? null,
    });
    if (collision.risk) orgish = true; // never promote collision-prone vectors as personal
    // Aggregator-only phones: keep as org/lead surface, not personal direct (OSINT two-source)
    if (!orgish && urls.length > 0 && !meetsTwoSourceRule(urls) && urls.every((u) => isAggregatorHost(hostnameOf(u)))) {
      orgish = true;
    }
    const srcLabel =
      source.includes("agentic") || source.includes("secondary") || note.includes("secondary") || note.includes("agentic")
        ? "agentic-web"
        : source.slice(0, 40);

    if (vt === "phone" || vt === "tel") {
      const score = (orgish ? 2 : 5) + hostScore + (urls.length ? 1 : 0) - (collision.risk ? 3 : 0);
      if (!bestPhone || score > bestPhone.score) {
        bestPhone = { value, source: orgish || hostScore >= 4 ? `${srcLabel}-org` : srcLabel, score };
      }
    } else if (vt === "email") {
      // Generic local-parts on company hosts are valid *organization* routes.
      // Only skip generics when host is weak (directories) — never skip orgish switchboard.
      if (isGenericLocal(value) && !orgish && hostScore < 3) continue;
      const score = (isGenericLocal(value) || orgish ? 2 : 5) + hostScore + (orgish && isGenericLocal(value) ? 1 : 0);
      if (!bestEmail || score > bestEmail.score) {
        bestEmail = { value, source: orgish || isGenericLocal(value) ? `${srcLabel}-org` : srcLabel, score };
      }
    } else if (vt === "linkedin" && value.includes("linkedin.com") && !bestLinkedin) {
      bestLinkedin = value.startsWith("http") ? value : `https://${value.replace(/^\/+/, "")}`;
    } else if ((vt === "website" || vt === "domain") && !bestWebsite && hostScore >= 0) {
      if (value.includes("sec.gov")) continue;
      bestWebsite = value.startsWith("http") ? value : `https://${value.replace(/^\/+/, "")}`;
    }
  }

  const curPhoneSrc = String(ent.phoneSource ?? "");
  const issuerLocked = isIssuerSwitchboardSource(curPhoneSrc);
  const outcomeNow = String((ent as { contactOutcome?: string | null }).contactOutcome ?? "");
  const weakOutcome =
    !outcomeNow ||
    outcomeNow === "none" ||
    outcomeNow === "evidence_only" ||
    outcomeNow === "organization_contact";
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  let changed = false;

  if (bestPhone) {
    // Never demote a protected dig/notice phone to a weaker pipeline value.
    const protectedCurrent = isProtectedPhoneSource(curPhoneSrc) && Boolean(ent.phone);
    const incomingOrg = bestPhone.source.endsWith("-org");
    const allowPhone =
      !protectedCurrent &&
      (
        !ent.phone ||
        issuerLocked ||
        isIssuerSwitchboardSource(curPhoneSrc) ||
        weakOutcome ||
        curPhoneSrc === "" ||
        (curPhoneSrc.endsWith("-org") && !incomingOrg)
      );
    // Upgrade org dig → personal dig only
    const upgradeOrgToPersonal =
      protectedCurrent &&
      curPhoneSrc.endsWith("-org") &&
      !incomingOrg &&
      bestPhone.source.startsWith("agentic");
    if ((allowPhone || upgradeOrgToPersonal) && bestPhone.value !== ent.phone) {
      patch.phone = bestPhone.value;
      patch.phoneSource = incomingOrg ? "agentic-web-org" : "agentic-web";
      patch.contactMethod =
        `Phone ${bestPhone.value} (${patch.phoneSource}). Validate before outreach.`;
      changed = true;
    }
  }

  if (bestEmail) {
    const curLocal = (ent.email ?? "").split("@")[0]?.toLowerCase() ?? "";
    const curGeneric = /^(info|contact|office|press|hello|admin|sales|support|ir|media)$/i.test(curLocal);
    let curEmailSrc = "";
    try {
      const m = ent.metadata ? (JSON.parse(ent.metadata) as Record<string, unknown>) : {};
      curEmailSrc = typeof m.emailSource === "string" ? m.emailSource : "";
    } catch { /* */ }
    const protectEmail = isAgenticEmailSource(curEmailSrc) && Boolean(ent.email) && !curEmailSrc.endsWith("-org");
    const allowEmail =
      !protectEmail &&
      (
        !ent.email ||
        issuerLocked ||
        weakOutcome ||
        (curGeneric && !bestEmail.source.endsWith("-org"))
      );
    if (allowEmail && bestEmail.value !== ent.email) {
      patch.email = bestEmail.value;
      changed = true;
    }
  }

  if (bestLinkedin && !ent.linkedinUrl) {
    patch.linkedinUrl = bestLinkedin;
    changed = true;
  }

  let meta: Record<string, unknown> = {};
  try {
    meta = ent.metadata ? (JSON.parse(ent.metadata) as Record<string, unknown>) : {};
  } catch {
    meta = {};
  }
  if (bestEmail) {
    meta.emailSource = bestEmail.source.endsWith("-org") ? "agentic-web-org" : "agentic-web";
  }
  if (bestWebsite && !meta.website && !ent.personalWebsite) {
    meta.website = bestWebsite;
    patch.personalWebsite = bestWebsite;
  }
  if (bestWebsite || bestEmail) {
    patch.metadata = JSON.stringify(meta);
    changed = true;
  }

  // Always recompute outcome for honesty even when vectors unchanged (e.g. org source labeled direct_*).
  let outcome = computeContactOutcome({
    type: ent.type,
    email: (patch.email as string) ?? ent.email,
    phone: (patch.phone as string) ?? ent.phone,
    phoneSource: (patch.phoneSource as string) ?? ent.phoneSource,
    emailSource: typeof meta.emailSource === "string" ? meta.emailSource : null,
    linkedinUrl: (patch.linkedinUrl as string) ?? ent.linkedinUrl,
    twitterHandle: ent.twitterHandle,
    instagramHandle: ent.instagramHandle,
    telegramHandle: ent.telegramHandle,
    website: typeof meta.website === "string" ? meta.website : ent.personalWebsite,
    metadata: (patch.metadata as string) ?? ent.metadata,
  });
  // Identity / source honesty: direct_* requires non-org source class (URL bind is evidence-layer).
  const phoneSrc = String((patch.phoneSource as string) ?? ent.phoneSource ?? "");
  const emailSrc = typeof meta.emailSource === "string" ? meta.emailSource : "";
  if (
    (outcome === "direct_contact_candidate" || outcome === "direct_contact_verified") &&
    (phoneSrc === "agentic-web-org" || emailSrc === "agentic-web-org" || phoneSrc.endsWith("-org"))
  ) {
    outcome = "organization_contact";
  }
  const prevOutcome = String((ent as { contactOutcome?: string | null }).contactOutcome ?? "");
  if (outcome !== prevOutcome) {
    patch.contactOutcome = outcome;
    changed = true;
  } else if (changed) {
    patch.contactOutcome = outcome;
  }
  if (!changed) return;

  await db.update(entitiesTable).set(patch).where(eq(entitiesTable.id, entityId));
  try {
    invalidateBM25Index();
    invalidateTFIDFCorpus();
  } catch { /* non-fatal */ }
  logger.info(
    {
      entityId,
      phone: patch.phone,
      email: patch.email,
      phoneSource: patch.phoneSource,
      contactOutcome: outcome,
      source,
    },
    "[Bureau] Promoted dig contacts onto entity card",
  );
  try {
    publishDigSpan({
      jobId: jobId || "promote",
      targetName: ent.name,
      spanType: "promote",
      name: "card_promote",
      status: "ok",
      inputSummary: [patch.phone, patch.email].filter(Boolean).join(" · ") || outcome,
      resultSummary: `outcome=${outcome} source=${source}`,
      agentName: "investigator",
    });
  } catch { /* non-fatal */ }
  void delCachePattern("entities:list:*");
  void delCachePattern("dashboard:*");
  void delCachePattern("scoreboard:*");
}

type DiscoveryCandidateContactSource = {
  name: string;
  contactEvidence?: BureauContactLike[] | null;
};

/**
 * Collect non-trash contact vectors for a target from the discovery deck.
 * Includes the matched candidate plus any evidence rows that name the same person.
 * Never invents values — only copies public evidence already on the case.
 */
export function collectDiscoveryContactsForTarget(
  targetName: string,
  candidates: readonly DiscoveryCandidateContactSource[] | null | undefined,
): BureauContactLike[] {
  const normalized = targetName.trim().toLowerCase();
  if (!normalized || !candidates?.length) return [];
  const out: BureauContactLike[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const candidateName = candidate.name.trim().toLowerCase();
    const isMatch = candidateName === normalized;
    for (const item of candidate.contactEvidence ?? []) {
      const value = typeof item.value === "string" ? item.value.trim() : "";
      if (!value) continue;
      const person = String(item.personName ?? "").trim().toLowerCase();
      const personMatches = Boolean(person) && (person === normalized || person.includes(normalized) || normalized.includes(person));
      if (!isMatch && !personMatches) continue;
      const key = `${String(item.vectorType ?? "other").toLowerCase()}|${value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        ...item,
        value,
        personName: item.personName ?? (isMatch ? targetName : item.personName ?? null),
      });
    }
  }
  return out;
}

/**
 * Phase B — bounded secondary public surface for person-shaped review entities.
 * Runs after materialization: public LinkedIn, Signal.nfx-style investor profiles,
 * official/leadership-ish websites, and any claimed email/phone from the free
 * OSINT lane are stored as candidate/lead only. Never Personal.
 * When LinkedIn is not found, an explicit "not found" candidate note is stored
 * so missing secondary surface is visible honesty, not silent gap.
 */
export async function expandSecondaryPublicSurface(input: {
  entityId: number;
  name: string;
  entityType?: string | null;
  companyName?: string | null;
  /** Atlas job id — live dig steps → Reactor job log */
  jobId?: string;
}): Promise<{ linkedin: boolean; email: boolean; phone: boolean; signal: boolean; website: boolean; relatedPeople: number }> {
  const out = { linkedin: false, email: false, phone: false, signal: false, website: false, relatedPeople: 0 };
  const name = String(input.name ?? "").trim();
  if (!input.entityId || name.length < 3) return out;

  try {
    const { enrichEntityOsint } = await import("./web-enricher");
    const result = await enrichEntityOsint({
      name,
      type: input.entityType ?? "HNWI",
      metadata: input.companyName
        ? JSON.stringify({ companyName: input.companyName })
        : null,
    } as any);

    const vectors: BureauContactLike[] = [];
    const isOrgEntity = /corp|company|organization|trust/i.test(String(input.entityType ?? ""));
    const defaultScope = isOrgEntity ? "organization" : "candidate";
    if (result.linkedinUrl) {
      vectors.push({
        vectorType: "linkedin",
        value: result.linkedinUrl,
        scope: defaultScope,
        personName: name,
        role: null,
        sourceUrls: [result.linkedinUrl],
        note: `Public LinkedIn from secondary expansion (${(result.sources ?? []).join(", ") || "osint"})`,
        tier: "candidate",
        state: "review_only",
      });
      out.linkedin = true;
    } else if (!isOrgEntity) {
      // Explicit not-found for persons only — company-name expands must not spam not-found noise.
      vectors.push({
        vectorType: "social",
        value: `linkedin:not-found:${name}`,
        scope: "candidate",
        personName: name,
        role: null,
        sourceUrls: [],
        note: "LinkedIn public profile not found in secondary expansion — gap recorded, not invented",
        tier: "candidate",
        state: "review_only",
      });
    }
    // Only persist email/phone when we have a concrete public page URL (fail-closed).
    // Website, crt.sh, and public claim lookups below carry real sourceUrls.
    if (result.email && result.website) {
      vectors.push({
        vectorType: "email",
        value: result.email,
        scope: isOrgEntity || /^(info|contact|office|press|hello|admin|sales|support)@/i.test(result.email)
          ? "organization"
          : "candidate",
        personName: name,
        role: null,
        sourceUrls: [result.website],
        note: isOrgEntity
          ? "Company email from secondary expansion — org route, not Personal"
          : "Claimed email from secondary expansion — lead only, not Personal",
        tier: "candidate",
        state: "review_only",
      });
      out.email = true;
    }
    if (result.phone && result.website) {
      vectors.push({
        vectorType: "phone",
        value: result.phone,
        scope: isOrgEntity ? "organization" : "candidate",
        personName: name,
        role: null,
        sourceUrls: [result.website],
        note: isOrgEntity
          ? "Company phone from secondary expansion — org route, not Personal"
          : "Claimed phone from secondary expansion — lead only, not Personal",
        tier: "candidate",
        state: "review_only",
      });
      out.phone = true;
    }
    if (result.website) {
      vectors.push({
        vectorType: "website",
        value: result.website,
        scope: "organization",
        personName: name,
        role: null,
        sourceUrls: [result.website],
        note: "Website / domain from secondary expansion — org/public surface",
        tier: "candidate",
        state: "review_only",
      });
      out.website = true;
    }

    // Signal.nfx / OpenVC / Angel / First Round public directory surface.
    try {
      const directoryHits = await lookupPublicInvestorDirectories(name);
      for (const hit of directoryHits) {
        vectors.push({
          vectorType: "website",
          value: hit.url,
          scope: "candidate",
          personName: name,
          role: null,
          sourceUrls: [hit.url],
          note: `Public ${hit.directory} profile from secondary expansion — lead only`,
          tier: "candidate",
          state: "review_only",
        });
        out.signal = true;
      }
    } catch {
      // non-fatal
    }

    // Official domain leadership / about / team pages when a website is known.
    if (result.website) {
      try {
        const leadership = await lookupLeadershipPages(result.website, name);
        for (const page of leadership) {
          vectors.push({
            vectorType: "website",
            value: page,
            scope: "organization",
            personName: name,
            role: null,
            sourceUrls: [page],
            note: "Official leadership/about/team/contact page from secondary expansion",
            tier: "candidate",
            state: "review_only",
          });
          out.website = true;
          // Scrape page for published mailto/tel (org surface) — fail-closed with page URL
          try {
            const resp = await fetch(page, {
              headers: { "User-Agent": "Mozilla/5.0 (compatible; ApexAtlas/1.0)", Accept: "text/html" },
              signal: AbortSignal.timeout(6_000),
              redirect: "follow",
            });
            if (resp.ok) {
              const html = (await resp.text()).slice(0, 100_000);
              const mailto = [...html.matchAll(/href=["']mailto:([^"'?\s]+)/gi)].map((m) => m[1]!.toLowerCase());
              for (const addr of mailto.slice(0, 3)) {
                if (!addr.includes("@") || addr.length > 80) continue;
                vectors.push({
                  vectorType: "email",
                  value: addr,
                  scope: /^(info|contact|office|press|hello|admin|sales|support|webmaster)@/i.test(addr)
                    ? "organization"
                    : "candidate",
                  personName: name,
                  role: null,
                  sourceUrls: [page],
                  note: `mailto on official page ${page} — lead/org only, not Personal`,
                  tier: "candidate",
                  state: "review_only",
                });
                out.email = true;
              }
              const tel = html.match(/href=["']tel:([^"']+)/i)?.[1]
                || html.match(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/)?.[0];
              if (tel) {
                vectors.push({
                  vectorType: "phone",
                  value: tel.replace(/^tel:/i, "").trim(),
                  scope: "organization",
                  personName: name,
                  role: null,
                  sourceUrls: [page],
                  note: `Phone on official page ${page} — org route, not Personal`,
                  tier: "candidate",
                  state: "review_only",
                });
                out.phone = true;
              }
            }
          } catch { /* non-fatal */ }
        }
      } catch {
        // non-fatal
      }

      // Certificate transparency (crt.sh) — claimed emails from cert SANs as leads only.
      try {
        const domain = result.website.replace(/^https?:\/\//i, "").split("/")[0]?.replace(/^www\./i, "");
        if (domain && domain.includes(".")) {
          const ctEmails = await lookupCrtShEmails(domain);
          for (const email of ctEmails) {
            vectors.push({
              vectorType: "email",
              value: email,
              scope: /^(info|contact|office|press|hello|admin|sales|support|webmaster)@/i.test(email)
                ? "organization"
                : "candidate",
              personName: name,
              role: null,
              sourceUrls: [`https://crt.sh/?q=${encodeURIComponent(domain)}`],
              note: `crt.sh certificate transparency claim on ${domain} — lead only, not Personal`,
              tier: "candidate",
              state: "review_only",
            });
            out.email = true;
          }
        }
      } catch {
        // non-fatal
      }
    }

    // Public web claims that look like emails with a source URL — always candidate/lead.
    try {
      const claimed = await lookupPublicEmailClaims(name);
      for (const claim of claimed) {
        vectors.push({
          vectorType: "email",
          value: claim.email,
          scope: /^(info|contact|office|press|hello|admin|sales|support)@/i.test(claim.email)
            ? "organization"
            : "candidate",
          personName: name,
          role: null,
          sourceUrls: claim.sourceUrl ? [claim.sourceUrl] : [],
          note: "Public aggregator/web claim — lead only with source; never Personal",
          tier: "candidate",
          state: "review_only",
        });
        out.email = true;
      }
    } catch {
      // non-fatal
    }

    // Public X/Twitter identity surface when relevant.
    try {
      const xHit = await lookupPublicXProfile(name);
      if (xHit) {
        vectors.push({
          vectorType: "social",
          value: xHit,
          scope: "candidate",
          personName: name,
          role: null,
          sourceUrls: [xHit],
          note: "Public X/Twitter profile from secondary expansion — lead only",
          tier: "candidate",
          state: "review_only",
        });
      }
    } catch {
      // non-fatal
    }

    // Wayback archived contact/about pages when domain known.
    if (result.website) {
      try {
        const domain = result.website.replace(/^https?:\/\//i, "").split("/")[0]?.replace(/^www\./i, "");
        if (domain) {
          const wb = await lookupWaybackContactPages(domain);
          for (const page of wb) {
            vectors.push({
              vectorType: "website",
              value: page,
              scope: "organization",
              personName: name,
              role: null,
              sourceUrls: [page],
              note: "Wayback archived contact/about page — attribution lead only",
              tier: "candidate",
              state: "review_only",
            });
            out.website = true;
          }
        }
      } catch {
        // non-fatal
      }
    }

    // G7 live: SC 13D/G + DEF 14A display names for issuer — related people, review-only.
    const issuer = String(input.companyName ?? "").trim();
    if (issuer.length >= 3) {
      try {
        const related = await lookupEdgarRelatedPeople(issuer, name);
        for (const person of related) {
          vectors.push({
            vectorType: "other",
            value: `related-person:${person}`,
            scope: "candidate",
            personName: person,
            role: "sc13_co_filer",
            sourceUrls: [
              `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(issuer)}&forms=SC+13D,SC+13G,DEF+14A&dateRange=custom&startdt=1995-01-01`,
            ],
            note: `EDGAR SC 13D/G or DEF 14A co-display / officer name for issuer "${issuer}" — related lead only, not Personal`,
            tier: "candidate",
            state: "review_only",
          });
          out.relatedPeople++;
        }
      } catch {
        // non-fatal
      }
    }

    // Agentic ReAct loop — LLM invents queries/visits (not a playbook). Same model class as
    // Live search/visit tools. Fail-closed: findings need sourceUrls.
    // Deterministic secondary tools only here — free dig is runTargetContactAgent in enrichEntityFullCircle.
    // Always persist + promote (empty vectors still rehydrate from contact_evidence)
    await persistBureauContactsForEntity(
      input.entityId,
      vectors,
      "secondary-public-surface",
    );
    try {
      await rehydrateEntityCardFromEvidence(input.entityId);
    } catch {
      /* non-fatal */
    }
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), entityId: input.entityId, name },
      "Secondary public surface expansion failed (non-fatal)",
    );
    // Last chance: still try card promotion from any durable evidence
    try {
      await rehydrateEntityCardFromEvidence(input.entityId);
    } catch {
      /* non-fatal */
    }
  }
  return out;
}

/** Bounded EDGAR EFTS lookup: other person-like display names on same issuer. Never invents. */
async function lookupEdgarRelatedPeople(issuer: string, excludeName: string): Promise<string[]> {
  // Deep history: many SC 13D/G co-filer groups for legacy issuers (e.g. Hastings) are 2001–2005.
  // 2010+ window returns zero hits for those cases. enddt kept current.
  // Also include DEF 14A so officer/director tables surface related names.
  const url =
    `https://efts.sec.gov/LATEST/search-index` +
    `?q=${encodeURIComponent('"' + issuer.slice(0, 80) + '"')}` +
    `&forms=SC+13D,SC+13G,DEF+14A&dateRange=custom&startdt=1995-01-01&enddt=2026-12-31&from=0`;
  try {
    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ApexAtlas/1.0 OSINT-Research research@apexfinder.private",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as { hits?: { hits?: Array<{ _source?: { display_names?: string[] } }> } };
    const hits = data?.hits?.hits ?? [];
    // Token-overlap self-exclude: EDGAR display_names are often LAST FIRST
    // ("JOHNSON ANDREW F") while entity.name is "Andrew F. Johnson".
    const excludeTokens = new Set(
      excludeName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2),
    );
    const found = new Set<string>();
    // Broader corp denylist so "HASTINGS MANUFACTURING CO" etc. never pass person-like filter.
    const corpRe =
      /\b(inc|llc|ltd|corp|corporation|company|co|mfg|manufacturing|holdings|holding|group|trust|lp|llp|plc|ag|sa|nv|bv|gmbh|pty|partners?|capital|fund|management|advisors?|associates?)\b/i;
    for (const hit of hits.slice(0, 20)) {
      const names = hit?._source?.display_names ?? [];
      for (const raw of names) {
        const clean = String(raw).replace(/\s*\(CIK\s*\d+\)\s*$/i, "").trim();
        if (clean.length < 5 || clean.length > 80) continue;
        if (clean.toLowerCase() === issuer.toLowerCase()) continue;
        if (corpRe.test(clean)) continue;
        const words = clean.split(/\s+/);
        if (words.length < 2 || words.length > 5) continue;
        // Prefer title-case / initial-capital person shapes; allow all-caps LAST FIRST from EDGAR.
        const looksPerson =
          words.every((w) => /^[A-ZÀ-ÖØ-Ü]/.test(w)) ||
          words.every((w) => /^[A-Z0-9.&'-]+$/.test(w));
        if (!looksPerson) continue;
        // Token-overlap self-exclude (≥2 shared tokens of length ≥2, or single strong last-name match when both short).
        const tokens = clean
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((t) => t.length >= 2);
        const overlap = tokens.filter((t) => excludeTokens.has(t)).length;
        if (overlap >= 2) continue;
        if (overlap === 1 && tokens.length <= 3 && excludeTokens.size <= 3) continue;
        found.add(clean);
        if (found.size >= 8) break;
      }
      if (found.size >= 8) break;
    }
    return [...found];
  } catch {
    return [];
  }
}

/** Probe common leadership/about/team paths on an official domain. Never invents contacts. */
async function lookupLeadershipPages(website: string, personName: string): Promise<string[]> {
  let host = website.trim();
  if (!/^https?:\/\//i.test(host)) host = `https://${host}`;
  let origin: string;
  try {
    origin = new URL(host).origin;
  } catch {
    return [];
  }
  const paths = ["/contact", "/about", "/team"];
  const found: string[] = [];
  for (const path of paths) {
    if (found.length >= 8) break;
    const url = `${origin}${path}`;
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ApexAtlas/1.0)",
          Accept: "text/html",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(5_000),
      });
      if (!resp.ok) continue;
      const ct = resp.headers.get("content-type") ?? "";
      if (!/html/i.test(ct)) continue;
      const html = (await resp.text()).slice(0, 80_000);
      // Keep page if it mentions the person, looks like team/leadership, or publishes contact vectors.
      const mentionsPerson = personName.split(/\s+/).filter((p) => p.length > 2)
        .some((part) => new RegExp(part, "i").test(html));
      const teamish = /leadership|our team|about us|board of directors|management team/i.test(html);
      const hasContactSurface =
        /mailto:|info@|contact@|office@|press@|\(\d{3}\)|\+1[-.\s]?\d{3}/i.test(html);
      if (mentionsPerson || teamish || hasContactSurface) found.push(url);
    } catch {
      // try next path
    }
  }
  return found;
}

/** Public investor/angel directory hits (Signal, OpenVC, AngelList, First Round). Never invents. */
async function lookupPublicInvestorDirectories(
  name: string,
): Promise<Array<{ url: string; directory: string }>> {
  const queries = [
    { q: `"${name}"`, dir: "web" },
  ];
  const hits: Array<{ url: string; directory: string }> = [];
  const seen = new Set<string>();
  for (const { q, dir } of queries) {
    if (hits.length >= 8) break;
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=wt-wt`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ApexAtlas/1.0; +https://github.com/2f22vtd4kr-cloud/BigContacts)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      const patterns: Array<{ re: RegExp; directory: string }> = [
        { re: /https?:\/\/(?:www\.)?signal\.nfx\.com\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "Signal.nfx" },
        { re: /https?:\/\/(?:www\.)?openvc\.app\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "OpenVC" },
        { re: /https?:\/\/(?:www\.)?(?:angel\.co|wellfound\.com)\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "AngelList/Wellfound" },
        { re: /https?:\/\/(?:www\.)?firstround\.com\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "First Round" },
        { re: /https?:\/\/(?:www\.)?techcoastangels\.com\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "Tech Coast Angels" },
        { re: /https?:\/\/(?:www\.)?band(?:of)?angels\.com\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "Band of Angels" },
        { re: /https?:\/\/(?:www\.)?eban\.org\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "EBAN" },
      ];
      for (const { re, directory } of patterns) {
        const matches = html.match(re) ?? [];
        for (const raw of matches) {
          const clean = raw.replace(/&amp;/g, "&").split("&")[0] ?? raw;
          const key = clean.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          hits.push({ url: clean, directory: directory || dir });
          if (hits.length >= 8) break;
        }
        if (hits.length >= 8) break;
      }
    } catch {
      // try next
    }
  }
  return hits;
}

/** crt.sh certificate transparency — emails from cert SANs only. Never invents. */
async function lookupCrtShEmails(domain: string): Promise<string[]> {
  try {
    const url = `https://crt.sh/?q=${encodeURIComponent("%." + domain)}&output=json`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "ApexAtlas/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) return [];
    const certs = (await resp.json()) as Array<{ name_value?: string; common_name?: string }>;
    if (!Array.isArray(certs)) return [];
    const emails = new Set<string>();
    for (const cert of certs.slice(0, 40)) {
      const blob = `${cert?.name_value ?? ""}\n${cert?.common_name ?? ""}`;
      for (const m of blob.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)) {
        const email = m[0].toLowerCase();
        if (email.endsWith(`.${domain}`) || email.includes(`@${domain}`) || email.includes(domain)) {
          emails.add(email);
        }
      }
    }
    return [...emails].slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Public web claims that look like emails near the person name.
 * Stores only with a source URL; never promotes to Personal.
 */
async function lookupPublicEmailClaims(
  name: string,
): Promise<Array<{ email: string; sourceUrl: string | null }>> {
  const queries = [
    `"${name}"`,
  ];
  const out: Array<{ email: string; sourceUrl: string | null }> = [];
  const seen = new Set<string>();
  const generic = /^(info|contact|office|press|hello|admin|sales|support|noreply|no-reply)@/i;
  for (const q of queries) {
    if (out.length >= 5) break;
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=wt-wt`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ApexAtlas/1.0)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      // Capture emails and nearby http links as weak source attribution.
      const emailMatches = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
      const linkMatches = html.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
      for (const raw of emailMatches) {
        const email = raw.toLowerCase();
        if (seen.has(email)) continue;
        if (generic.test(email) && !name.split(/\s+/).some((p) => p.length > 2 && email.includes(p.toLowerCase()))) {
          // Keep org emails but mark them; still visible as related.
        }
        // Skip obvious trash
        if (/example\.com|domain\.com|email\.com|sentry\.io|wixpress|schema\.org/i.test(email)) continue;
        seen.add(email);
        const sourceUrl = linkMatches.find((l) => /linkedin|about|contact|team|company|profile/i.test(l))
          ?? linkMatches[0]
          ?? null;
        out.push({
          email,
          sourceUrl: sourceUrl ? sourceUrl.replace(/&amp;/g, "&").split("&")[0] ?? sourceUrl : null,
        });
        if (out.length >= 5) break;
      }
    } catch {
      // try next
    }
  }
  return out;
}

/** Public X/Twitter profile URL when identity-relevant. Never invents. */
async function lookupPublicXProfile(name: string): Promise<string | null> {
  const queries = [
    `"${name}"`,
  ];
  for (const q of queries) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=wt-wt`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ApexAtlas/1.0)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      const m = html.match(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{2,30})(?:\/|\s|"|'|<|$)/i);
      if (m?.[0] && m[1] && !/^(search|home|explore|i|intent|share|hashtag)$/i.test(m[1])) {
        return `https://x.com/${m[1]}`;
      }
    } catch {
      // try next
    }
  }
  return null;
}

/** Wayback CDX archived contact/about/team pages for a domain. Never invents contacts. */
async function lookupWaybackContactPages(domain: string): Promise<string[]> {
  const paths = ["contact", "about", "team"];
  const found: string[] = [];
  for (const path of paths) {
    if (found.length >= 3) break;
    try {
      const cdxUrl =
        `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/${path}` +
        `*&output=json&fl=original,timestamp&limit=2&filter=statuscode:200&collapse=urlkey`;
      const resp = await fetch(cdxUrl, {
        headers: { "User-Agent": "ApexAtlas/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) continue;
      const data = (await resp.json()) as string[][];
      if (!Array.isArray(data) || data.length < 2) continue;
      for (const row of data.slice(1)) {
        const orig = row?.[0];
        const ts = row?.[1];
        if (!orig || !ts) continue;
        found.push(`https://web.archive.org/web/${ts}/${orig}`);
        if (found.length >= 3) break;
      }
    } catch {
      // try next path
    }
  }
  return found;
}


/** Rehydrate entity cards from durable contact_evidence (no new dig). */
export async function rehydrateEntityCardFromEvidence(entityId: number): Promise<boolean> {
  try {
    await promoteBureauContactsToEntityCard(entityId, [], "evidence-rehydrate");
    return true;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), entityId },
      "rehydrateEntityCardFromEvidence failed",
    );
    return false;
  }
}

export async function rehydrateAllEntityCardsFromEvidence(limit = 50): Promise<{ scanned: number; ok: number }> {
  const rows = await db
    .select({ id: entitiesTable.id })
    .from(entitiesTable)
    .limit(Math.min(200, Math.max(1, limit)));
  let ok = 0;
  for (const row of rows) {
    if (await rehydrateEntityCardFromEvidence(row.id)) ok += 1;
  }
  return { scanned: rows.length, ok };
}
