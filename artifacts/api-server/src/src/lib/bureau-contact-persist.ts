/**
 * Materialize bureau / discovery contact evidence onto durable contact_evidence
 * rows so HNWI profile cards show related routes without waiting for a full
 * deep-web enrich pass.
 */
import { db, contactEvidenceTable, entitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sanitizePublicEmail, sanitizePublicPhone, isTrashContactValue } from "./contact-validation";
import { logger } from "./logger";
import { assessIdentityCollision } from "./identity-collision";
import { countIndependentSourceHosts } from "./source-corroboration";

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
  // Empty model output is evidence, too: do not manufacture a promotion from
  // unrelated durable rows. Card mapping runs when this pass actually supplied
  // evidence, or via the explicit rehydration path.
  if (!list.length) return 0;

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
    sourceReliability: number | null;
    identityMatch: number | null;
    recencyScore: number | null;
    directnessScore: number | null;
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
    let urls = Array.isArray(item.sourceUrls)
      ? item.sourceUrls.filter((u: unknown): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
      : [];

    // Claim-bearing contact vectors require an exact public source page.
    // A generated search URL is not provenance and must never substitute for
    // the page that actually supported the value.
    const needsClaimUrl = ["email", "phone", "linkedin", "twitter", "instagram", "telegram"].includes(vectorType);
    if (needsClaimUrl && urls.length === 0) continue;

    // Missing exact source pages are not provenance. Do not manufacture search URLs.

    const collision = assessIdentityCollision({
      targetName,
      companyName,
      personName: item.personName ?? null,
      value,
      sourceUrls: urls,
      note: item.note ?? null,
    });
    // This legacy path has no persisted model attribution contract. Preserve the supplied scope as context, but do not infer person/org routing or score it.
    rows.push({
      entityId,
      vectorType,
      value,
      source,
      sourceUrl: urls[0] ?? null,
      extractionMethod: "case-bureau-contact",
      sourceReliability: null,
      identityMatch: null,
      recencyScore: null,
      directnessScore: null,
      independentCorroboration: countIndependentSourceHosts(urls),
      validationStatus: "candidate",
      rejectionReason: null,
      observedAt: new Date(),
      metadata: JSON.stringify({
        scope: scope || "unknown",
        personName: item.personName ?? null,
        role: item.role ?? null,
        note: item.note ?? null,
        tier: item.tier ?? null,
        sourceUrls: urls.slice(0, 5),
        fromBureau: true,
        identityCollisionRisk: collision.risk,
        identityCollisionReason: collision.reason,
        sourceReliabilityAssessment: "unassessed",
        identityAssessment: "unresolved",
        recencyAssessment: "unassessed",
        directnessAssessment: "unassessed",
        verificationScope: "syntax_only",
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

  // Evidence persistence ends here. Card mutation belongs exclusively to the
  // explicit investigator-selected promotion boundary.
  return rows.length;
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
* Legacy rehydration is intentionally disabled.
* Durable evidence is not a promotion decision; only the canonical investigator
* promotion boundary may mutate an entity card.
*/
export async function rehydrateEntityCardFromEvidence(_entityId: number): Promise<boolean> {
  return false;
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
