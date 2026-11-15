import { sql, type SQL } from "drizzle-orm";
import { entitiesTable } from "@workspace/db";

/**
 * Neutral, stable ordering for entity-list presentation only.
 *
 * Research investment and target priority are mission-specific semantic
 * decisions for Boss. Contact outcomes, wealth estimates, role seniority,
 * direct-channel presence and Bayesian scores must not silently become a
 * deterministic research-priority algorithm. The MCTS/research path must ask
 * its model-owned controller to choose among the current candidate set.
 *
 * Keep this helper only to make paginated UI lists stable and predictable.
 */
export function reachabilityOrderExpr(): SQL {
  return sql`${entitiesTable.id} DESC`;
}
