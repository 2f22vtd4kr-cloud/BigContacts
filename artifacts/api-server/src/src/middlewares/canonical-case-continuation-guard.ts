import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, researchCasesTable } from "@workspace/db";

const CANCELLED_ACTIONS = new Set(["canonical-atlas-cancelled", "canonical-lease-lost"]);

/**
 * A cancelled canonical case is terminal. The continuation handlers predate
 * the durable cancellation fence and could otherwise write status=active
 * directly from a cancelled row before the DB trigger was consulted.
 */
export async function canonicalCaseContinuationGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.method !== "POST" || !/^\/research\/bureau\/(?:cases|target-cases)\/\d+\/run-next-pass$/.test(req.path)) {
    next();
    return;
  }
  const caseId = Number(req.params.caseId);
  if (!Number.isSafeInteger(caseId) || caseId <= 0) {
    next();
    return;
  }
  const [current] = await db
    .select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction })
    .from(researchCasesTable)
    .where(eq(researchCasesTable.id, caseId))
    .limit(1);
  if (!current) {
    next();
    return;
  }
  if (current.status === "cancelled" || (current.status === "review" && CANCELLED_ACTIONS.has(String(current.currentAction ?? "")))) {
    res.status(409).json({ error: "This canonical case is durably cancelled and cannot be resumed. Start a new investigation instead." });
    return;
  }
  next();
}
