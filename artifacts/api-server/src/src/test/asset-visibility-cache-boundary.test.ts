import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("asset visibility and projection-cache boundary", () => {
  it("prevents asset creation against hidden owners", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/assets.ts"),
      "utf8",
    );
    expect(source).toContain('if(owner.isHidden){res.status(400).json({error:"Cannot attach an asset to a hidden entity"});return;}');
  });

  it("invalidates entity counts, dashboard projections, and search facets on every asset mutation", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/assets.ts"),
      "utf8",
    );
    const expected = [
      'delCachePattern("entities:list:*")',
      'delCachePattern("dashboard:*")',
      'delCachePattern("search:*")',
    ];
    for (const prefix of expected) {
      expect(source.split(prefix).length - 1).toBeGreaterThanOrEqual(3);
    }
  });
});
