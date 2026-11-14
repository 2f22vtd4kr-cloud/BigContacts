import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const assetsRoute = readFileSync(new URL("../routes/assets.ts", import.meta.url), "utf8");

describe("entity-linked asset listing", () => {
  it("includes REGISTERED_TO assets without converting the relationship into an owner foreign key", () => {
    expect(assetsRoute).toContain("const registeredAssetIds");
    expect(assetsRoute).toContain('eq(relationshipsTable.relationshipType,"REGISTERED_TO")');
    expect(assetsRoute).toContain('eq(relationshipsTable.targetType,"Asset")');
    expect(assetsRoute).toContain("inArray(assetsTable.id,registeredAssetIds)");
    expect(assetsRoute).toContain("eq(assetsTable.ownerEntityId,entityId)");
  });

  it("excludes registered-to asset links from hidden source entities", () => {
    expect(assetsRoute).toContain("innerJoin(entitiesTable,eq(relationshipsTable.sourceEntityId,entitiesTable.id))");
    expect(assetsRoute).toContain("eq(entitiesTable.isHidden,false)");
  });
});
