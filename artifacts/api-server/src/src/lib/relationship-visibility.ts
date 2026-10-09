import { sql } from "drizzle-orm";
import { relationshipsTable } from "@workspace/db";

/**
 * Hidden records must not leak through graph edges. A relationship is visible
 * only when its source and entity target are visible and an asset target is
 * not owned by a hidden entity. Reuse this predicate for lists and aggregates.
 */
export function visibleRelationshipScope() {
  return sql`EXISTS (
    SELECT 1 FROM entities AS visible_source
    WHERE visible_source.id = ${relationshipsTable.sourceEntityId}
      AND visible_source.is_hidden = false
  ) AND (
    ${relationshipsTable.targetType} <> 'Entity' OR EXISTS (
      SELECT 1 FROM entities AS visible_target
      WHERE visible_target.id = ${relationshipsTable.targetId}
        AND visible_target.is_hidden = false
    )
  ) AND (
    ${relationshipsTable.targetType} <> 'Asset' OR NOT EXISTS (
      SELECT 1
      FROM assets AS hidden_owner_asset
      JOIN entities AS hidden_asset_owner ON hidden_asset_owner.id = hidden_owner_asset.owner_entity_id
      WHERE hidden_owner_asset.id = ${relationshipsTable.targetId}
        AND hidden_asset_owner.is_hidden = true
    )
  )`;
}
