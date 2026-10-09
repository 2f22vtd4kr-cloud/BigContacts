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
});
