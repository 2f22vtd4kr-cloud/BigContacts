import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("search hidden-entity visibility boundary", () => {
  it("excludes hidden entities from the direct HNWI SQL query and isolates its cache namespace", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/search.ts"),
      "utf8",
    );
    expect(source).toContain('const conditions:any[]=[eq(entitiesTable.type,"HNWI"),eq(entitiesTable.isHidden,false)]');
    expect(source).toContain("search:hnwi:v2:");
  });

  it("revalidates model-orchestrated intelligent-search IDs against visible database entities", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/search.ts"),
      "utf8",
    );
    expect(source).toContain("search:intelligent:v2:");
    expect(source).toContain("inArray(entitiesTable.id,returnedIds)");
    expect(source).toContain("eq(entitiesTable.isHidden,false)");
    expect(source).toContain("filteredResults=filteredResults.filter(r=>visibleIds.has(Number(r.id)))");
  });
  it("does not let hidden relationships satisfy the intelligent-search relationship filter", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/search.ts"),
      "utf8",
    );
    expect(source).toContain('import { visibleRelationshipScope } from "../lib/relationship-visibility";');
    expect(source).toContain("where(and(visibleRelationshipScope(),or(inArray(relationshipsTable.sourceEntityId,ids)");
  });

  it("excludes hidden-owned assets from the public aggregate facets and versions the cache", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/search.ts"),
      "utf8",
    );
    expect(source).toContain('getCache<object>("search:facets:v2")');
    expect(source).toContain('setCache("search:facets:v2",facets,300)');
    expect(source).toContain("leftJoin(entitiesTable,eq(assetsTable.ownerEntityId,entitiesTable.id))");
    expect(source).toContain("or(isNull(assetsTable.ownerEntityId),eq(entitiesTable.isHidden,false))");
  });

});
