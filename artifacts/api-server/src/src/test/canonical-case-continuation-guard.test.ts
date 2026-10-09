import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ status: "cancelled", currentAction: "canonical-atlas-cancelled" }],
        }),
      }),
    }),
  },
  researchCasesTable: { id: "id", status: "status", currentAction: "currentAction" },
}));

describe("canonicalCaseContinuationGuard", () => {
  it("rejects a durably cancelled discovery continuation", async () => {
    const { canonicalCaseContinuationGuard } = await import("../middlewares/canonical-case-continuation-guard");
    const req = { method: "POST", path: "/research/bureau/cases/42/run-next-pass", params: { caseId: "42" } } as any;
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) } as any;
    const next = vi.fn();

    await canonicalCaseContinuationGuard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("durably cancelled") }));
    expect(next).not.toHaveBeenCalled();
  });
  it("rejects a durably completed discovery continuation", async () => {
    const { canonicalCaseContinuationGuard } = await import("../middlewares/canonical-case-continuation-guard");
    const req = { method: "POST", path: "/research/bureau/cases/42/run-next-pass", params: { caseId: "42" } } as any;
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) } as any;
    const next = vi.fn();
    const dbModule = await import("@workspace/db");
    vi.spyOn(dbModule.db, "select").mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: async () => [{ status: "complete", currentAction: "awaiting-human-review" }] }) }),
    } as any);
    await canonicalCaseContinuationGuard(req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining("durably complete") }));
    expect(next).not.toHaveBeenCalled();
  });
  it("rebuilds continuation control context from the row-locked durable case", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/routes/research/canonical-case-continuation.ts"), "utf8");
    expect(source).toContain("initialContext=contextOf(lockedFile)");
    expect(source).toContain("for(\"update\")");
    expect(source).toContain('active=await getActiveJobStrict("atlas-run")');
    expect(source).toContain('legacyActive=await getActiveJobStrict("case-bureau-discovery")');
    expect(source).toContain("existing=await getJobStrict(active)");
    expect(source).toContain("existing=await getJobStrict(legacyActive)");
    expect(source).toContain("Canonical active-job state is unknown; refusing continuation");
    expect(source).not.toContain('const active=await getActiveJob("atlas-run")');
    expect(source).not.toContain('const legacyActive=await getActiveJob("case-bureau-discovery")');
  });
});
