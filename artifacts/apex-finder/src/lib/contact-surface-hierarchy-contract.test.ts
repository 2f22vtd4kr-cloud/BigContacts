import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = readFileSync(new URL("../components/contact-surface.tsx", import.meta.url), "utf8");
describe("contact route hierarchy", () => {
  it("distinguishes generic company routes from direct professional routes", () => {
    expect(source).toContain("PUBLIC COMPANY");
    expect(source).toContain("DIRECT PROFESSIONAL");
    expect(source).toContain("Source context or attribution needs review");
  });
  it("does not display routes explicitly marked as restricted context", () => {
    expect(source).toContain('routeTier(r).label === "NOT A ROUTE"');
  });
});
