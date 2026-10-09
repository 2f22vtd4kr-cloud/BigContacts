import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("graph hidden-asset visibility boundary", () => {
  it("removes edges to assets owned by hidden entities from neighborhood and path graphs", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/lib/graph-load.ts"),
      "utf8",
    );
    const start = source.indexOf("async function filterVisibleRelationships");
    const end = source.indexOf("\n\nexport async function loadNeighborhood", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const filter = source.slice(start, end);

    expect(filter).toContain('if (row.targetType === "Asset") assetIds.add(row.targetId)');
    expect(filter).toContain("hiddenOwnedAssetRows");
    expect(filter).toContain("eq(entitiesTable.isHidden, true)");
    expect(filter).toContain('row.targetType !== "Asset" || !hiddenOwnedAssets.has(row.targetId)');
  });
});
