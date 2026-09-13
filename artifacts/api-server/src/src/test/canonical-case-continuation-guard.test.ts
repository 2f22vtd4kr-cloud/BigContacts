import { describe, expect, it, vi } from "vitest";

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
});
