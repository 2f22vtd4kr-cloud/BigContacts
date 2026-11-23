import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ledgerSource = readFileSync(new URL("../pages/board-ledger.tsx", import.meta.url), "utf8");

describe("board Ledger people register", () => {
  it("keeps organization and asset records out of the people register", () => {
    expect(ledgerSource).toContain('normalizeEntityType(displayEntityType(entity))');
    expect(ledgerSource).toContain('["HNWI", "PersonCandidate", "Gatekeeper"]');
    expect(ledgerSource).toContain('<th>Person</th>');
  });

  it("keeps the register strongest-first and evidence-backed", () => {
    expect(ledgerSource).toContain('.sort((a: any, b: any) => Number(b.bayesianScore ?? 0) - Number(a.bayesianScore ?? 0))');
    expect(ledgerSource).toContain('entity.boardEvidenceStatus');
    expect(ledgerSource).toContain('sourceList(entity.sourceRegistries)');
  });
});
