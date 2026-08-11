/**
 * Present every non-rejected contact for an entity on cards and profiles.
 * Only mark === "personal" means attributed person-level; org/candidate stay visible.
 */
import { and, desc, sql } from "drizzle-orm";
import { db, contactEvidenceTable } from "@workspace/db";
import { isTrashContactValue } from "./contact-validation";

export type PresentedContact = {
  vectorType: string;
  value: string;
  source: string;
  sourceUrl: string | null;
  validationStatus: string;
  mark: "personal" | "organization" | "candidate";
  label: string;
};

const ORGANIZATION_ENTITY_TYPES = new Set(["Corporation", "Corp", "Trust"]);

function parseEvidenceMeta(raw: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function markContact(args: {
  vectorType: string;
  value: string;
  validationStatus: string;
  metadata?: string | null;
  entityEmail?: string | null;
  entityPhone?: string | null;
  entityType?: string | null;
  phoneSource?: string | null;
  contactOutcome?: string | null;
}): "personal" | "organization" | "candidate" {
  if (args.validationStatus === "rejected") return "candidate";
  if (ORGANIZATION_ENTITY_TYPES.has(args.entityType ?? "")) return "organization";
  const meta = parseEvidenceMeta(args.metadata);
  const scope = String(meta.scope ?? meta.personScope ?? meta.routeScope ?? "").toLowerCase();
  if (scope === "organization" || scope === "org" || scope === "company") return "organization";
  // Fail-closed personal mark: only verified evidence (or entity columns promoted
  // through the contact pipeline to direct_contact_verified) may display as personal.
  // Manual import / discovery write email/phone onto the entity as candidates —
  // matching those columns must NOT auto-promote to personal.
  if (args.validationStatus === "verified") return "personal";
  const outcome = String(args.contactOutcome ?? "").toLowerCase();
  const verifiedRoute = outcome === "direct_contact_verified";
  if (verifiedRoute && args.vectorType === "email" && args.entityEmail && args.value === args.entityEmail) {
    return "personal";
  }
  if (verifiedRoute && args.vectorType === "phone" && args.entityPhone && args.value === args.entityPhone) {
    const ps = String(args.phoneSource ?? "").toLowerCase();
    if (ps.includes("org") || ps.includes("registry") || ps.includes("company")) return "organization";
    return "personal";
  }
  if (args.vectorType === "social") return "candidate";
  // Person-scoped but unverified remains visible as candidate — never mislabeled personal.
  return "candidate";
}

function contactLabel(
  vectorType: string,
  mark: string,
  value?: string,
  collisionRisk?: boolean,
): string {
  if (mark === "personal") return "Looks personal";
  if (mark === "organization") return "Company · related";
  if (value && /^linkedin:not-found:/i.test(value)) return "LinkedIn not found";
  if (value && /^related-person:/i.test(value)) return "Related · same filing/issuer";
  if (collisionRisk) return "Weak match · possible name collision";
  if (vectorType === "social") return "Still a lead";
  return "Still a lead";
}

export async function loadPresentedContactsForEntities(
  entities: Array<{
    id: number;
    type?: string | null;
    email?: string | null;
    phone?: string | null;
    phoneSource?: string | null;
    linkedinUrl?: string | null;
    twitterHandle?: string | null;
    instagramHandle?: string | null;
    telegramHandle?: string | null;
    contactOutcome?: string | null;
  }>,
): Promise<Record<number, PresentedContact[]>> {
  const out: Record<number, PresentedContact[]> = {};
  for (const e of entities) out[e.id] = [];
  if (entities.length === 0) return out;

  const ids = entities.map((e) => e.id);
  const rows = await db
    .select({
      entityId: contactEvidenceTable.entityId,
      vectorType: contactEvidenceTable.vectorType,
      value: contactEvidenceTable.value,
      source: contactEvidenceTable.source,
      sourceUrl: contactEvidenceTable.sourceUrl,
      validationStatus: contactEvidenceTable.validationStatus,
      metadata: contactEvidenceTable.metadata,
      observedAt: contactEvidenceTable.observedAt,
    })
    .from(contactEvidenceTable)
    .where(and(
      sql`${contactEvidenceTable.entityId} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]::int[]`)})`,
      sql`${contactEvidenceTable.validationStatus} <> 'rejected'`,
    ))
    .orderBy(desc(contactEvidenceTable.observedAt))
    .limit(Math.min(ids.length * 40, 2000));

  const byEntity = new Map(entities.map((e) => [e.id, e]));
  const seen = new Map<number, Set<string>>();

  for (const row of rows) {
    const entity = byEntity.get(row.entityId);
    if (!entity) continue;
    const value = String(row.value ?? "").trim();
    if (!value) continue;
    if (isTrashContactValue(row.vectorType, value)) continue;
    const key = `${row.vectorType}|${value.toLowerCase()}`;
    if (!seen.has(row.entityId)) seen.set(row.entityId, new Set());
    if (seen.get(row.entityId)!.has(key)) continue;
    seen.get(row.entityId)!.add(key);
    const meta = parseEvidenceMeta(row.metadata);
    const collisionRisk = meta.identityCollisionRisk === true;
    const mark = markContact({
      vectorType: row.vectorType,
      value,
      validationStatus: row.validationStatus,
      metadata: row.metadata,
      entityEmail: entity.email,
      entityPhone: entity.phone,
      entityType: entity.type,
      phoneSource: entity.phoneSource,
      contactOutcome: entity.contactOutcome,
    });
    // Collision-prone personal candidates never display as personal
    const safeMark = collisionRisk && mark === "personal" ? "candidate" : mark;
    out[row.entityId].push({
      vectorType: row.vectorType,
      value,
      source: row.source,
      sourceUrl: row.sourceUrl,
      validationStatus: row.validationStatus,
      mark: safeMark,
      label: contactLabel(row.vectorType, safeMark, value, collisionRisk),
      identityCollisionRisk: collisionRisk,
    });
  }

  for (const e of entities) {
    const add = (vectorType: string, value: string | null | undefined, source: string) => {
      const v = String(value ?? "").trim();
      if (!v) return;
      const key = `${vectorType}|${v.toLowerCase()}`;
      if (!seen.has(e.id)) seen.set(e.id, new Set());
      if (seen.get(e.id)!.has(key)) return;
      seen.get(e.id)!.add(key);
      const mark = markContact({
        vectorType,
        value: v,
        validationStatus: "candidate",
        entityEmail: e.email,
        entityPhone: e.phone,
        entityType: e.type,
        phoneSource: e.phoneSource,
        contactOutcome: e.contactOutcome,
      });
      out[e.id].push({
        vectorType,
        value: v,
        source,
        sourceUrl: vectorType === "social" && v.startsWith("http") ? v : null,
        validationStatus: "candidate",
        mark,
        label: contactLabel(vectorType, mark, v),
      });
    };
    add("email", e.email, "entity");
    add("phone", e.phone, "entity");
    add("social", e.linkedinUrl, "entity-linkedin");
    if (e.twitterHandle) add("social", e.twitterHandle.startsWith("http") ? e.twitterHandle : `@${e.twitterHandle.replace(/^@/, "")}`, "entity-twitter");
    if (e.instagramHandle) add("social", e.instagramHandle.startsWith("http") ? e.instagramHandle : `@${e.instagramHandle.replace(/^@/, "")}`, "entity-instagram");
    if (e.telegramHandle) add("social", e.telegramHandle.startsWith("http") ? e.telegramHandle : `@${e.telegramHandle.replace(/^@/, "")}`, "entity-telegram");
  }

  // Ranking law: Personal → Related/Org → Candidate → collision-weak candidates last
  const rank = (c: PresentedContact) => {
    if (c.mark === "personal") return 0;
    if (c.mark === "organization") return 1;
    if (c.identityCollisionRisk) return 3;
    return 2;
  };
  for (const id of ids) {
    out[id].sort((a, b) => rank(a) - rank(b) || a.vectorType.localeCompare(b.vectorType));
  }
  return out;
}
