/**
 * Strict persistence boundary for model-led research.
 *
 * Canonical agentic research may persist source-backed evidence, but it must
 * never invoke the legacy projector that ranks candidates and mutates an
 * entity card. Card mutation is a separate operation that requires an
 * explicit investigator selection.
 */
import { db, contactEvidenceTable, entitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sanitizePublicEmail, sanitizePublicPhone, isTrashContactValue } from "./contact-validation";
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
  /** Set only by the investigator when it explicitly selects this value for the card. */
  promote?: boolean | null;
};

const HTTP_SOURCE = /^https?:\/\/\S+$/i;
const SEARCH_QUERY_URL = [
  /google\.[^/]+\/search(?:[/?]|$)/i,
  /bing\.com\/search(?:[/?]|$)/i,
  /search\.yahoo\.com\/search(?:[/?]|$)/i,
  /duckduckgo\.com\/(?:html\/)?\?(?:[^#]*&)?q=/i,
  /efts\.sec\.gov\/LATEST\/search-index(?:[/?]|$)/i,
];

function isClaimSourceUrl(url: string): boolean {
  return HTTP_SOURCE.test(url) && !SEARCH_QUERY_URL.some((pattern) => pattern.test(url));
}

function mapVectorType(raw: string, value: string): string {
  const t = raw.toLowerCase().trim();
  if (["email", "phone", "website", "domain", "address", "social", "linkedin", "twitter", "instagram", "telegram"].includes(t)) return t;
  if (value.includes("@")) return "email";
  if (/^\+?[\d\s().-]{7,}$/.test(value)) return "phone";
  if (/^https?:\/\//i.test(value)) return "website";
  return "other";
}

function sanitizeValue(vectorType: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (vectorType === "email") return sanitizePublicEmail(trimmed);
  if (vectorType === "phone") return sanitizePublicPhone(trimmed);
  if (vectorType === "domain" || vectorType === "website") {
    const v = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0] ?? "";
    if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(v)) return null;
    return v.toLowerCase().slice(0, 200);
  }
  return trimmed.slice(0, 500);
}

export function sourceBackedBureauContacts(
  items: readonly BureauContactLike[] | null | undefined,
): BureauContactLike[] {
  return (items ?? []).filter((item) =>
    Array.isArray(item.sourceUrls)
    && item.sourceUrls.some((url) => typeof url === "string" && isClaimSourceUrl(url)),
  ).map((item) => ({
    ...item,
    sourceUrls: (item.sourceUrls ?? []).filter((url) => typeof url === "string" && isClaimSourceUrl(url)),
  }));
}

/**
 * Persist candidate evidence only. This intentionally has no card projector,
 * ranking, best-phone/best-email selection, or automatic promotion.
 */
export async function persistSourceBackedBureauContactsForEntity(
  entityId: number,
  items: readonly BureauContactLike[] | null | undefined,
  source: string,
  _jobId?: string | null,
): Promise<number> {
  if (!entityId) return 0;
  const backed = sourceBackedBureauContacts(items);
  if (!backed.length) return 0;

  let targetName = "";
  let companyName: string | null = null;
  try {
    const rows = await db.select({ name: entitiesTable.name, metadata: entitiesTable.metadata })
      .from(entitiesTable).where(eq(entitiesTable.id, entityId)).limit(1);
    targetName = rows[0]?.name ?? "";
    if (rows[0]?.metadata) {
      try {
        const meta = JSON.parse(rows[0].metadata) as Record<string, unknown>;
        companyName = typeof meta.companyName === "string" ? meta.companyName : null;
      } catch { /* metadata is optional */ }
    }
  } catch { /* identity checks degrade conservatively */ }

  const values: Array<{
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
  for (const item of backed) {
    if (String(item.state ?? "").toLowerCase() === "rejected") continue;
    const raw = typeof item.value === "string" ? item.value.trim() : "";
    if (!raw) continue;
    const vectorType = mapVectorType(String(item.vectorType ?? "other"), raw);
    const value = sanitizeValue(vectorType, raw);
    if (!value || isTrashContactValue(vectorType, value)) continue;
    const urls = (item.sourceUrls ?? []).filter((u): u is string => typeof u === "string" && isClaimSourceUrl(u));
    if (!urls.length) continue;
    const key = `${vectorType}:${value.toLowerCase()}:${source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const collision = assessIdentityCollision({
      targetName,
      companyName,
      personName: item.personName ?? null,
      value,
      sourceUrls: urls,
      note: item.note ?? null,
    });
    const orgish = String(item.scope ?? item.tier ?? "").toLowerCase().includes("organization")
      || /^(info|contact|office|press|hello|admin|sales|support)@/i.test(value);
    values.push({
      entityId,
      vectorType,
      value,
      source,
      sourceUrl: urls[0] ?? null,
      extractionMethod: "agentic-model-finding",
      sourceReliability: collision.risk ? 0.28 : 0.55,
      identityMatch: orgish ? Math.min(0.35, collision.identityMatch) : collision.identityMatch,
      recencyScore: 0.7,
      directnessScore: orgish ? 0.3 : 0.5,
      independentCorroboration: countIndependentSourceHosts(urls),
      validationStatus: "candidate",
      rejectionReason: null,
      observedAt: new Date(),
      metadata: JSON.stringify({
        scope: orgish ? "organization" : (item.scope ?? item.tier ?? "unknown"),
        personName: item.personName ?? null,
        role: item.role ?? null,
        note: item.note ?? null,
        sourceUrls: urls.slice(0, 5),
        fromAgenticInvestigator: true,
        investigatorSelectedForCard: item.promote === true,
        identityCollisionRisk: collision.risk,
        identityCollisionReason: collision.reason,
      }),
    });
  }
  if (!values.length) return 0;
  await db.insert(contactEvidenceTable).values(values).onConflictDoNothing();
  return values.length;
}

/**
 * Apply exactly one investigator-selected value to the entity card.
 * This function validates provenance and identity but never chooses among
 * candidates. A caller must pass the exact finding the investigator selected.
 */
export async function applyInvestigatorSelectedContactToEntityCard(
  entityId: number,
  item: BureauContactLike | null | undefined,
): Promise<boolean> {
  if (!entityId || !item?.promote) return false;
  const backed = sourceBackedBureauContacts([item]);
  if (backed.length !== 1) return false;
  const candidate = backed[0]!;
  const value = typeof candidate.value === "string" ? candidate.value.trim() : "";
  if (!value) return false;
  const vectorType = mapVectorType(String(candidate.vectorType ?? "other"), value);
  const clean = sanitizeValue(vectorType, value);
  if (!clean || isTrashContactValue(vectorType, clean)) return false;

  const fieldByType: Record<string, "email" | "phone" | "linkedinUrl" | "twitterHandle" | "instagramHandle" | "telegramHandle" | "personalWebsite"> = {
    email: "email",
    phone: "phone",
    linkedin: "linkedinUrl",
    twitter: "twitterHandle",
    instagram: "instagramHandle",
    telegram: "telegramHandle",
    website: "personalWebsite",
  };
  const field = fieldByType[vectorType];
  if (!field) return false;
  await db.update(entitiesTable).set({ [field]: clean }).where(eq(entitiesTable.id, entityId));
  return true;
}
