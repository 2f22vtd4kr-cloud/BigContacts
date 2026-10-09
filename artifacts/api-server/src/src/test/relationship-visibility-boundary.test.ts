import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("relationship visibility boundary", () => {
  it("filters hidden sources, hidden entity targets, and assets owned by hidden entities", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/relationships.ts"),
      "utf8",
    );
    const scopeStart = source.indexOf("function visibleRelationshipScope()");
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
