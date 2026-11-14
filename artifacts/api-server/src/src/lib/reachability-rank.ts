import { sql, type SQL } from "drizzle-orm";
import { entitiesTable } from "@workspace/db";

/**
 * Shared "reachability-first" ranking used everywhere entities are ordered for
 * human attention or research investment: the entities list, the dashboard
 * hot-leads panel, and the Atlas Phase 10 MCTS target selection.
 *
 * Philosophy (do not invert): contact confidence is the PRIMARY signal.
 * Wealth / registry evidence (bayesianScore, "Signal") is secondary context
 * and only ever breaks ties — it must never let an ultra-wealthy but
 * unreachable public figure ("Peter Thiel class") outrank someone who is
 * genuinely contactable.
 *
 * Order:
 *  1. Contact outcome tier (verified direct > candidate > org > social > evidence > none)
 *  2. Contact confidence (how trustworthy the contact data is, 0-100)
 *  3. Inline access weight (email/phone/LinkedIn presence → direct channels)
 *  4. Bayesian ("Signal") score as a final contextual tiebreaker.
 *
 * Wealth and public prominence are not deterministic reasons to demote a
 * target. Whether a target is worth further investigation is a mission-level
 * judgement; this expression orders already-qualified contact outcomes only.
 */
export function reachabilityOrderExpr(): SQL {
  return sql`
    CASE ${entitiesTable.contactOutcome}
      WHEN 'direct_contact_verified'   THEN 6
      WHEN 'direct_contact_candidate'  THEN 5
      WHEN 'organization_contact'      THEN 4
      WHEN 'social_only'               THEN 3
      WHEN 'evidence_only'             THEN 2
      ELSE 1
    END DESC,
    ${entitiesTable.contactConfidence} DESC NULLS LAST,
    (
      CASE WHEN ${entitiesTable.email}       IS NOT NULL AND btrim(${entitiesTable.email}::text)       <> '' THEN 55 ELSE 0 END +
      CASE WHEN ${entitiesTable.phone}       IS NOT NULL AND btrim(${entitiesTable.phone}::text)       <> '' THEN 45 ELSE 0 END +
      CASE WHEN ${entitiesTable.linkedinUrl} IS NOT NULL AND btrim(${entitiesTable.linkedinUrl}::text) <> '' THEN 12 ELSE 0 END
    ) DESC,
    ${entitiesTable.bayesianScore} DESC
  `;
}
