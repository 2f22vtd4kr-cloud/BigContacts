/**
 * Materialize bureau / discovery contact evidence onto durable contact_evidence
 * rows so HNWI profile cards show related routes without waiting for a full
 * deep-web enrich pass.
 */
import { db, contactEvidenceTable } from "@workspace/db";
import { sanitizePublicEmail, sanitizePublicPhone } from "./contact-validation";
import { logger } from "./logger";

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
): Promise<number> {
  if (!entityId || !items?.length) return 0;

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
  for (const item of items) {
    if (String(item.state ?? "").toLowerCase() === "rejected") continue;
    const rawValue = typeof item.value === "string" ? item.value.trim() : "";
    if (!rawValue) continue;
    const vectorType = mapVectorType(String(item.vectorType ?? "other"), rawValue);
    const value = sanitizeValue(vectorType, rawValue);
    if (!value) continue;
    const key = `${vectorType}:${value.toLowerCase()}:${source}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const scope = String(item.scope ?? item.tier ?? "unknown").toLowerCase();
    const orgish = scope.includes("organization") || scope.includes("org")
      || /^(info|contact|office|press|hello|admin|sales)@/i.test(value);
    const urls = Array.isArray(item.sourceUrls)
      ? item.sourceUrls.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
      : [];

    rows.push({
      entityId,
      vectorType,
      value,
      source,
      sourceUrl: urls[0] ?? null,
      extractionMethod: "case-bureau-contact",
      sourceReliability: 0.55,
      identityMatch: orgish ? 0.35 : 0.5,
      recencyScore: 0.7,
      directnessScore: orgish ? 0.35 : (vectorType === "email" || vectorType === "phone" ? 0.5 : 0.4),
      independentCorroboration: urls.length > 0 ? 1 : 0,
      validationStatus: "candidate",
      rejectionReason: null,
      observedAt: new Date(),
      metadata: JSON.stringify({
        scope: orgish ? "organization" : (scope || "unknown"),
        personName: item.personName ?? null,
        role: item.role ?? null,
        note: item.note ?? null,
        tier: item.tier ?? null,
        sourceUrls: urls.slice(0, 5),
        fromBureau: true,
      }),
    });
  }

  if (!rows.length) return 0;
  try {
    await db.insert(contactEvidenceTable).values(rows).onConflictDoNothing();
    return rows.length;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), entityId, count: rows.length },
      "Failed to persist bureau contact evidence",
    );
    return 0;
  }
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
