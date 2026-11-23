import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ledgerSource = readFileSync(new URL("../pages/board-ledger.tsx", import.meta.url), "utf8");

describe("board Ledger people register", () => {
  it("imports the entity classifier used to keep organization and asset records out of the people register", () => {
    expect(ledgerSource).toContain('import { displayEntityType, entityEvidenceLabel, entityWorkSummary } from "@/lib/utils";');
    expect(ledgerSource).toContain('normalizeEntityType(displayEntityType(entity))');
    expect(ledgerSource).toContain('["HNWI", "PersonCandidate", "Gatekeeper"]');
    expect(ledgerSource).toContain('<th>Person</th>');
  });

  it("preserves the backend reachability-first ordering and does not re-rank by wealth locally", () => {
    expect(ledgerSource).toContain("Preserve the API's reachability-first order");
    expect(ledgerSource).toContain("Atlas API order · contact reachability first");
    expect(ledgerSource).not.toContain('.sort((a: any, b: any) => Number(b.bayesianScore');
  });

  it("uses real backend contact outcomes instead of inventing evidence verification states", () => {
    expect(ledgerSource).toContain("entity.contactOutcome");
    expect(ledgerSource).toContain("direct_contact_verified");
    expect(ledgerSource).toContain("direct_contact_candidate");
    expect(ledgerSource).toContain("organization_contact");
    expect(ledgerSource).toContain("social_only");
    expect(ledgerSource).toContain("evidence_only");
    expect(ledgerSource).toContain('<th>Contact outcome</th>');
    expect(ledgerSource).not.toContain("boardEvidenceStatus");
    expect(ledgerSource).not.toContain("is-verified");
    expect(ledgerSource).not.toContain("is-corroborated");
    expect(ledgerSource).not.toContain("is-review");
  });

  it("retains the source attribution shown on each register row", () => {
    expect(ledgerSource).toContain("sourceList(entity.sourceRegistries)");
    expect(ledgerSource).toContain("entityEvidenceLabel(entity)");
  });
});
