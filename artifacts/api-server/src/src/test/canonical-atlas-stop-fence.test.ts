import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const routePath = path.resolve(process.cwd(), "src/src/routes/research/canonical-atlas-launch.ts");

describe("canonical Atlas stop fence", () => {
  it("only transitions active durable cases to review so a late stop cannot downgrade completion", () => {
    const source = fs.readFileSync(routePath, "utf8");
    const stopBlock = source.slice(source.indexOf('router.post("/ingest/atlas-stop"'));
    expect(stopBlock).toContain('eq(researchCasesTable.status, "active")');
    expect(stopBlock).toContain('currentAction: "canonical-atlas-cancelled"');
    expect(stopBlock).toContain("researchCasesTable.caseFile");
  });
});
