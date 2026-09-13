import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ status: "cancelled", currentAction: "canonical-atlas-cancelled" }] }) }) }),
  },
  researchCasesTable: { id: "id", status: "status", currentAction: "currentAction" },
}));

describe("canonicalCaseContinuationGuard", () => {
  it("exists as the durable cancellation boundary", async () => {
    const mod = await import("../middlewares/canonical-case-continuation-guard");
    expect(typeof mod.canonicalCaseContinuationGuard).toBe("function");
  });
});
