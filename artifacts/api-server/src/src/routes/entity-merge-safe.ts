import { Router } from "express";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import {
  db,
  entitiesTable,
  assetsTable,
  relationshipsTable,
  contactEvidenceTable,
  enrichmentStateTable,
  improvementLogsTable,
  dedupReviewsTable,
  researchSessionsTable,
  researchEvidenceTable,
  researchCasesTable,
  identityBundlesTable,
  identityCandidatesTable,
} from "@workspace/db";
import {
  sanitizePublicEmail,
  sanitizePublicPhone,
  sanitizePublicSocialUrl,
  sanitizePublicSocialHandle,
} from "../lib/contact-validation";
import { computeContactConfidence, computeContactOutcome, hasMeaningfulDirectContact } from "../lib/contact-confidence";
import { delCachePattern } from "../lib/redis";

const router = Router();

/**
 * Transactional replacement for the historical merge route.
 *
 * The old route performed independent writes with Promise.all and then deleted
 * the target. That could leave assets/relationships half-reassigned, delete
 * contact evidence through ON DELETE CASCADE, or erase dedup/audit history.
 * This boundary locks both entities, preserves durable evidence, and refuses
 * merges whose target already owns immutable research/identity history.
 */
router.post("/entities/:id/merge/:targetId", async (req, res): Promise<void> => {
  const id = Number.parseInt(req.params.id, 10);
  const targetId = Number.parseInt(req.params.targetId, 10);
  if (!Number.isSafeInteger(id) || !Number.isSafeInteger(targetId) || id <= 0 || targetId <= 0 || id === targetId) {
    res.status(400).json({ error: "Invalid entity IDs" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      const firstId = Math.min(id, targetId);
      const secondId = Math.max(id, targetId);
      const lockedRows = await tx
        .select()
        .from(entitiesTable)
        .where(inArray(entitiesTable.id, [firstId, secondId]))
        .for("update");
      const primary = lockedRows.find((row) => row.id === id);
      const target = lockedRows.find((row) => row.id === targetId);
      if (!primary) throw Object.assign(new Error("Primary entity not found"), { statusCode: 404 });
      if (!target) throw Object.assign(new Error("Target entity not found"), { statusCode: 404 });

      const [researchSessions, researchEvidence, researchCases, identityBundles, identityCandidates] = await Promise.all([
        tx.select({ id: researchSessionsTable.id }).from(researchSessionsTable).where(eq(researchSessionsTable.targetEntityId, targetId)).limit(1),
        tx.select({ id: researchEvidenceTable.id }).from(researchEvidenceTable).where(eq(researchEvidenceTable.entityId, targetId)).limit(1),
        tx.select({ id: researchCasesTable.id }).from(researchCasesTable).where(eq(researchCasesTable.targetEntityId, targetId)).limit(1),
        tx.select({ id: identityBundlesTable.id }).from(identityBundlesTable).where(eq(identityBundlesTable.entityId, targetId)).limit(1),
        tx.select({ id: identityCandidatesTable.id }).from(identityCandidatesTable).where(or(eq(identityCandidatesTable.entityId, targetId), eq(identityCandidatesTable.candidateEntityId, targetId))).limit(1),
      ]);
      if (researchSessions.length || researchEvidence.length || researchCases.length || identityBundles.length || identityCandidates.length) {
        throw Object.assign(new Error("Target entity has durable research or identity history; merge is blocked to preserve provenance. Resolve the historical records before merging."), { statusCode: 409 });
      }

      const parseArray = (value: string | null): string[] => {
        try {
          const parsed = value ? JSON.parse(value) : [];
          return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
        } catch { return []; }
      };
      const parseObject = (value: string | null): Record<string, unknown> => {
        try {
          const parsed = value ? JSON.parse(value) : {};
          return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
        } catch { return {}; }
      };

      const mergedSources = [...new Set([...parseArray(primary.sourceRegistries), ...parseArray(target.sourceRegistries)])];
      const mergedMeta = { ...parseObject(target.metadata), ...parseObject(primary.metadata), mergedFrom: targetId, mergedAt: new Date().toISOString() };
      const mergedResidences = primary.knownResidences ?? target.knownResidences;
      const mergedNotes = [primary.notes, target.notes].filter(Boolean).join("\n\n---\n\n") || null;
      const mergedEmail = sanitizePublicEmail(primary.email) ?? sanitizePublicEmail(target.email);
      const mergedPhone = sanitizePublicPhone(primary.phone) ?? sanitizePublicPhone(target.phone);
      const mergedLinkedIn = sanitizePublicSocialUrl(primary.linkedinUrl, "linkedin", "person") ?? sanitizePublicSocialUrl(target.linkedinUrl, "linkedin", "person");
      const mergedTwitter = sanitizePublicSocialHandle(primary.twitterHandle, "twitter") ?? sanitizePublicSocialHandle(target.twitterHandle, "twitter");
      const mergedInstagram = sanitizePublicSocialHandle(primary.instagramHandle, "instagram") ?? sanitizePublicSocialHandle(target.instagramHandle, "instagram");
      const mergedTelegram = primary.telegramHandle ?? target.telegramHandle;
      const mergedPhoneSource = primary.phoneSource ?? target.phoneSource;
      const mergedConfidence = computeContactConfidence({ type: primary.type, email: mergedEmail, phone: mergedPhone, phoneSource: mergedPhoneSource, linkedinUrl: mergedLinkedIn, twitterHandle: mergedTwitter, instagramHandle: mergedInstagram, telegramHandle: mergedTelegram, knownResidences: mergedResidences });
      const mergedOutcome = computeContactOutcome({ type: primary.type, email: mergedEmail, phone: mergedPhone, phoneSource: mergedPhoneSource, linkedinUrl: mergedLinkedIn, twitterHandle: mergedTwitter, instagramHandle: mergedInstagram, telegramHandle: mergedTelegram, knownResidences: mergedResidences });
      const mergedHot = hasMeaningfulDirectContact({ type: primary.type, email: mergedEmail, phone: mergedPhone, phoneSource: mergedPhoneSource });

      await tx.update(assetsTable).set({ ownerEntityId: id }).where(eq(assetsTable.ownerEntityId, targetId));
      await tx.update(relationshipsTable).set({ sourceEntityId: id }).where(eq(relationshipsTable.sourceEntityId, targetId));
      await tx.update(relationshipsTable).set({ targetId: id }).where(and(eq(relationshipsTable.targetId, targetId), eq(relationshipsTable.targetType, "Entity")));
      await tx.update(contactEvidenceTable).set({ entityId: id }).where(eq(contactEvidenceTable.entityId, targetId));
      await tx.update(improvementLogsTable).set({ entityId: id, updatedAt: new Date() }).where(eq(improvementLogsTable.entityId, targetId));
      await tx.delete(enrichmentStateTable).where(eq(enrichmentStateTable.entityId, targetId));

      // Preserve all dedup decisions involving the target. Pairs that collapse
      // onto an existing primary pair are retained by the existing row.
      const reviews = await tx.select().from(dedupReviewsTable).where(or(eq(dedupReviewsTable.entityAId, targetId), eq(dedupReviewsTable.entityBId, targetId)));
      for (const review of reviews) {
        const a = review.entityAId === targetId ? id : review.entityAId;
        const b = review.entityBId === targetId ? id : review.entityBId;
        if (a === b) {
          await tx.delete(dedupReviewsTable).where(eq(dedupReviewsTable.id, review.id));
          continue;
        }
        const low = Math.min(a, b);
        const high = Math.max(a, b);
        const existing = await tx.select({ id: dedupReviewsTable.id }).from(dedupReviewsTable).where(and(eq(dedupReviewsTable.entityAId, low), eq(dedupReviewsTable.entityBId, high))).limit(1);
        if (existing[0]) {
          await tx.delete(dedupReviewsTable).where(eq(dedupReviewsTable.id, review.id));
        } else {
          await tx.update(dedupReviewsTable).set({ entityAId: low, entityBId: high, keepEntityId: review.keepEntityId === targetId ? id : review.keepEntityId }).where(eq(dedupReviewsTable.id, review.id));
        }
      }

      await tx.update(entitiesTable).set({
        sourceRegistries: JSON.stringify(mergedSources),
        metadata: JSON.stringify(mergedMeta),
        knownResidences: mergedResidences ?? null,
        notes: mergedNotes ?? primary.notes,
        estimatedNetWorth: primary.estimatedNetWorth ?? target.estimatedNetWorth,
        email: mergedEmail,
        phone: mergedPhone,
        phoneSource: mergedPhoneSource,
        linkedinUrl: mergedLinkedIn,
        twitterHandle: mergedTwitter,
        instagramHandle: mergedInstagram,
        telegramHandle: mergedTelegram,
        contactConfidence: mergedConfidence,
        contactOutcome: mergedOutcome,
        bayesianScore: Math.max(primary.bayesianScore ?? 0, target.bayesianScore ?? 0),
        isHot: mergedHot,
        updatedAt: new Date(),
      }).where(eq(entitiesTable.id, id));

      await tx.delete(entitiesTable).where(eq(entitiesTable.id, targetId));
    }, { isolationLevel: "serializable" });

    await Promise.all([delCachePattern("entities:list:*"), delCachePattern("dashboard:*")]);
    res.json({ merged: true, primaryId: id, deletedId: targetId, message: `Entity ${targetId} merged into ${id}` });
  } catch (err) {
    const statusCode = Number((err as { statusCode?: unknown })?.statusCode ?? 500);
    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
