import { sql } from "drizzle-orm";
import { entitiesTable } from "@workspace/db";

/**
 * HNWI records sourced from FAA registration alone are not qualified wealth
 * records. Keep them out of HNWI-specific surfaces unless a separate,
 * explicit positive personal-wealth assessment exists.
 */
export function qualifiedHnwiCondition() {
  return sql`(
    ${entitiesTable.type} = 'HNWI'
    AND COALESCE(${entitiesTable.metadata}::jsonb ->> 'personalWealthEvidence', 'true') <> 'false'
    AND COALESCE(${entitiesTable.metadata}::jsonb ->> 'wealthStatus', '') <> 'not_assessed'
    AND (
      NOT (
        COALESCE(${entitiesTable.metadata}::jsonb ->> 'source', '') = 'faa-aircraft-registry'
        OR COALESCE(${entitiesTable.sourceRegistries}, '') LIKE '%FAA Releasable Aircraft Database%'
      )
      OR COALESCE(${entitiesTable.metadata}::jsonb ->> 'personalWealthEvidence', 'false') = 'true'
      OR COALESCE(${entitiesTable.metadata}::jsonb ->> 'wealthStatus', '') IN ('qualified', 'verified', 'assessed')
      OR COALESCE(${entitiesTable.metadata}::jsonb ->> 'hnwiQualificationStatus', '') = 'qualified'
    )
  )`;
}
