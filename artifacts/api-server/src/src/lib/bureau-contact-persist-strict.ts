/**
 * Strict persistence boundary for model-led research.
 *
 * Canonical agentic research may persist source-backed evidence, but it must
 * never invoke the legacy projector that ranks candidates and mutates an
 * entity card. Card mutation is a separate operation that requires an
 * investigator-selected finding whose source was actually observed by the run.
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
  /** Explicit model decision when a caller wants to apply a single finding. */
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

function normalizeObservedUrls(urls: readonly string[] | null | undefined): Set<string> {
  const observed = new Set<string>();
  for (const raw of urls ?? []) {
    if (typeof raw !== "string") continue;
    try {
      const url = new URL(raw).href;
      if (isClaimSourceUrl(url)) observed.add(url);
    } catch { /* malformed observed URL is not provenance */ }
  }
  return observed;
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
  if (vectorType === "other" && /^person:/i.test(trimmed)) return null;
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

export function observedSourceBackedBureauContacts(
  items: readonly BureauContactLike[] | null | undefined,
  observedSourceUrls: readonly string[] | null | undefined,
): BureauContactLike[] {
  const observed = normalizeObservedUrls(observedSourceUrls);
  if (!observed.size) return [];
  return sourceBackedBureauContacts(items)
    .map((item) => ({
      ...item,
      sourceUrls: (item.sourceUrls ?? []).filter((url) => {
        try { return observed.has(new URL(url).href); } catch { return false; }
      }),
    }))
    .filter((item) => (item.sourceUrls?.length ?? 0) > 0);
}

export async function persistSourceBackedBureauContactsForEntity(
  entityId: number,
  items: readonly BureauContactLike[] | null | undefined,
  source: string,
  jobId?: string | null,
  observedSourceUrls?: readonly string[] | null,
): Promise<number> {
  if (!entityId) return 0;
  const agenticSource = /agentic/i.test(source);
  const backed = agenticSource
    ? observedSourceBackedBureauContacts(items, observedSourceUrls)
    : sourceBackedBureauContacts(items);
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

  const normalized: Array<{ item: BureauContactLike; vectorType: string; value: string; sourceUrls: string[] }> = [];
  const seen = new Set<string>();
  for (const item of backed) {
    if (String(item.state ?? "").toLowerCase() === "rejected") continue;
    const raw = typeof item.value === "string" ? item.value.trim() : "";
    if (!raw) continue;
    const vectorType = mapVectorType(String(item.vectorType ?? "other"), raw);
    const value = sanitizeValue(vectorType, raw);
    if (!value || isTrashContactValue(vectorType, value)) continue;
    const sourceUrls = (item.sourceUrls ?? []).filter((u): u is string => typeof u === "string" && isClaimSourceUrl(u));
    if (!sourceUrls.length) continue;
    const key = `${vectorType}:${value.toLowerCase()}:${source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ item, vectorType, value, sourceUrls });
    const collision = assessIdentityCollision({
      targetName,
      companyName,
      personName: item.personName ?? null,
      value,
      sourceUrls,
      note: item.note ?? null,
    });
    const orgish = String(item.scope ?? item.tier ?? "").toLowerCase().includes("organization")
      || /^(info|contact|office|press|hello|admin|sales|support)@/i.test(value);
    values.push({
      entityId,
      vectorType,
      value,
      source,
      sourceUrl: sourceUrls[0] ?? null,
      extractionMethod: "agentic-model-finding",
      sourceReliability: collision.risk ? 0.28 : 0.55,
      identityMatch: orgish ? Math.min(0.35, collision.identityMatch) : collision.identityMatch,
      recencyScore: 0.7,
      directnessScore: orgish ? 0.3 : 0.5,
      independentCorroboration: countIndependentSourceHosts(sourceUrls),
      validationStatus: "candidate",
      rejectionReason: null,
      observedAt: new Date(),
      metadata: JSON.stringify({
        scope: orgish ? "organization" : (item.scope ?? item.tier ?? "unknown"),
        personName: item.personName ?? null,
        role: item.role ?? null,
        note: item.note ?? null,
        sourceUrls: sourceUrls.slice(0, 5),
        fromAgenticInvestigator: agenticSource,
        investigatorSelectedForCard: item.promote === true,
        identityCollisionRisk: collision.risk,
        identityCollisionReason: collision.reason,
        jobId: jobId ?? null,
      }),
    });
  }
  if (!values.length) return 0;
  await db.insert(contactEvidenceTable).values(values).onConflictDoNothing();

  if (agenticSource) {
    const fieldByType: Record<string, string> = {
      email: "email",
      phone: "phone",
      linkedin: "linkedinUrl",
      twitter: "twitterHandle",
      instagram: "instagramHandle",
      telegram: "telegramHandle",
      website: "personalWebsite",
    };
    const grouped = new Map<string, typeof normalized>();
    for (const row of normalized) {
      if (row.item.promote !== true) continue;
      const field = fieldByType[row.vectorType];
      if (!field) continue;
      if (String(row.item.scope ?? "").toLowerCase() !== "candidate") continue;
      const personName = typeof row.item.personName === "string" ? row.item.personName.trim() : "";
      if (!personName) continue;
      const bucket = grouped.get(field) ?? [];
      bucket.push(row);
      grouped.set(field, bucket);
    }
    for (const [field, bucket] of grouped) {
      if (bucket.length !== 1) continue;
      const selected = bucket[0]!;
      await applyInvestigatorSelectedContactToEntityCard(entityId, {
        ...selected.item,
        vectorType: selected.vectorType,
        value: selected.value,
        sourceUrls: selected.sourceUrls,
        promote: true,
      }, observedSourceUrls ?? []);
    }
  }
  return values.length;
}

/**
 * Apply exactly one investigator-selected value to the entity card.
 * Candidate-scope promotion is only legal when the destination entity itself
 * is the named person. Discovery/organization entities cannot receive a
 * candidate person's contact vector merely because a caller supplied their id.
 */
export async function applyInvestigatorSelectedContactToEntityCard(
  entityId: number,
  item: BureauContactLike | null | undefined,
  observedSourceUrls: readonly string[] | null | undefined,
): Promise<boolean> {
  if (!entityId || !item?.promote) return false;
  if (String(item.scope ?? "").toLowerCase() !== "candidate") return false;
  const personName = typeof item.personName === "string" ? item.personName.trim() : "";
  if (!personName) return false;
  const backed = observedSourceBackedBureauContacts([item], observedSourceUrls);
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

  const rows = await db.select({ name: entitiesTable.name, type: entitiesTable.type, metadata: entitiesTable.metadata })
    .from(entitiesTable).where(eq(entitiesTable.id, entityId)).limit(1);
  const entity = rows[0];
  if (!entity) return false;
  if (entity.name.trim().toLowerCase() !== personName.toLowerCase()) return false;
  if (!["HNWI", "Gatekeeper"].includes(entity.type)) return false;

  let companyName: string | null = null;
  try {
    const meta = entity.metadata ? JSON.parse(entity.metadata) as Record<string, unknown> : {};
    companyName = typeof meta.companyName === "string" ? meta.companyName : null;
  } catch { /* malformed metadata is handled conservatively below */ }

  const collision = assessIdentityCollision({
    targetName: entity.name,
    companyName,
    personName: candidate.personName ?? null,
    value: clean,
    sourceUrls: candidate.sourceUrls ?? [],
    note: candidate.note ?? null,
  });
  if (collision.risk || collision.identityMatch < 0.65) return false;

  const nextMetadata: Record<string, unknown> = entity.metadata
    ? (() => { try { return JSON.parse(entity.metadata!) as Record<string, unknown>; } catch { return {}; } })()
    : {};
  const existingProvenance = nextMetadata.agenticContactProvenance && typeof nextMetadata.agenticContactProvenance === "object"
    ? nextMetadata.agenticContactProvenance as Record<string, unknown>
    : {};
  nextMetadata.agenticContactProvenance = {
    ...existingProvenance,
    [field]: {
      value: clean,
      personName,
      sourceUrls: candidate.sourceUrls.slice(0, 8),
      observedSourceUrls: (observedSourceUrls ?? []).slice(0, 16),
      note: candidate.note ?? null,
      jobId: typeof nextMetadata.jobId === "string" ? nextMetadata.jobId : null,
      recordedAt: new Date().toISOString(),
    },
  };

  await db.update(entitiesTable).set({ [field]: clean, metadata: JSON.stringify(nextMetadata) }).where(eq(entitiesTable.id, entityId));
  return true;
}
