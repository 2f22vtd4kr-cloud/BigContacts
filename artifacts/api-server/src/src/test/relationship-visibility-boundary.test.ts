import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("relationship visibility boundary", () => {
  it("filters hidden sources, hidden entity targets, and assets owned by hidden entities", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/lib/relationship-visibility.ts"),
      "utf8",
    );
    const scopeStart = source.indexOf("export function visibleRelationshipScope()");
    const scopeEnd = source.indexOf("\n}", scopeStart);
    expect(scopeStart).toBeGreaterThanOrEqual(0);
    expect(scopeEnd).toBeGreaterThan(scopeStart);
    const scope = source.slice(scopeStart, scopeEnd);

    expect(scope).toContain("visible_source.is_hidden = false");
    expect(scope).toContain("visible_target.is_hidden = false");
    expect(scope).toContain("hidden_asset_owner.is_hidden = true");
    expect(scope).toContain("hidden_owner_asset.owner_entity_id");
  });

  it("applies the same visibility fence to global and entity-scoped relationship lists", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/relationships.ts"),
      "utf8",
    );
    expect(source).toContain("const visibilityScope = visibleRelationshipScope();");
    expect(source).toContain("            visibilityScope,");
    expect(source).toContain(".where(visibilityScope)");
  });
});


describe("visibility-safe aggregate counts", () => {
  it("uses relationship visibility in dashboard relationship totals and hides sessions for hidden targets", () => {
    const dashboard = fs.readFileSync(path.resolve(process.cwd(), "src/src/routes/dashboard.ts"), "utf8");
    expect(dashboard).toContain("const visibleRelationship = visibleRelationshipScope();");
    expect(dashboard).toContain(".from(relationshipsTable).where(visibleRelationship)");
    expect(dashboard).toContain(".innerJoin(entitiesTable, eq(researchSessionsTable.targetEntityId, entitiesTable.id)).where(visibleEntity)");
  });

  it("counts identity review rows and bundles only when all participating entities are visible", () => {
    const identity = fs.readFileSync(path.resolve(process.cwd(), "src/src/routes/identity.ts"), "utf8");
    expect(identity).toContain("visible_identity_source.is_hidden = false");
    expect(identity).toContain("visible_identity_candidate.is_hidden = false");
    expect(identity).toContain(".innerJoin(entitiesTable, eq(identityBundlesTable.entityId, entitiesTable.id))");
    expect(identity).toContain(".where(eq(entitiesTable.isHidden, false))");
  });
});
