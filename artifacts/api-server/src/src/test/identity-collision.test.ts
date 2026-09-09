import { describe, it, expect } from "vitest";
import {
  assessIdentityCollision,
  assessGraphNamePairRisk,
} from "../lib/identity-collision";
import { evaluateIdentityGate } from "../lib/identity-gate";

describe("assessIdentityCollision", () => {
  it("flags missing surname for multi-token targets", () => {
    const r = assessIdentityCollision({
      targetName: "James C Czirr",
      companyName: null,
      personName: null,
      value: "+1 555 0100",
      sourceUrls: ["https://www.edwardjones.com/advisor/james"],
      note: "wealth advisor",
    });
    expect(r.risk).toBe(true);
  });

  it("flags unlabelled organization email as non-personal evidence", () => {
    const r = assessIdentityCollision({
      targetName: "Jane Smith",
      companyName: "Smith Holdings",
      personName: null,
      value: "info@smithholdings.com",
      sourceUrls: ["https://smithholdings.com/contact"],
    });
    expect(r.risk).toBe(true);
    expect(r.reason).toMatch(/no explicit person attribution/i);
  });

  it("flags unlabelled phone as non-personal evidence", () => {
    const r = assessIdentityCollision({
      targetName: "Jane Smith",
      companyName: "Smith Holdings",
      personName: null,
      value: "+1 212 555 0199",
      sourceUrls: ["https://smithholdings.com/contact"],
    });
    expect(r.risk).toBe(true);
    expect(r.reason).toMatch(/no explicit person attribution/i);
  });

  it("flags personName with different surname", () => {
    const r = assessIdentityCollision({
      targetName: "Robert W Philip",
      companyName: "Example Corp",
      personName: "Robert Brauser",
      value: "rbrauser@example.com",
      sourceUrls: ["https://example.com/team"],
      note: "officer",
    });
    expect(r.risk).toBe(true);
    expect(r.reason).toMatch(/surname/i);
  });

  it("rejects a wrong first name even when the surname and source URL overlap", () => {
    const r = assessIdentityCollision({
      targetName: "Robert Philip",
      companyName: "Philip Holdings",
      personName: "Michael Philip",
      value: "michael@philip.com",
      sourceUrls: ["https://philip.com/team/robert-philip"],
      note: "wrong person on a shared-surname page",
    });
    expect(r.risk).toBe(true);
    expect(r.identityMatch).toBeLessThan(0.65);
  });

  it("allows explicitly attributed matching contact evidence", () => {
    const r = assessIdentityCollision({
      targetName: "Robert W Philip",
      companyName: "Issuer Inc",
      personName: "Robert Philip",
      value: "rphilip@issuer.com",
      sourceUrls: ["https://issuer.com/team/robert-philip"],
      note: "reporting person",
    });
    expect(r.risk).toBe(false);
  });

  it("allows matching surname evidence", () => {
    const r = assessIdentityCollision({
      targetName: "Robert W Philip",
      companyName: "Issuer Inc",
      personName: "Robert Philip",
      value: "rphilip@issuer.com",
      sourceUrls: ["https://www.sec.gov/cgi-bin/browse-edgar"],
      note: "reporting person",
    });
    expect(r.risk).toBe(false);
  });

  it("flags school and district mailboxes even when a surname overlaps", () => {
    const r = assessIdentityCollision({
      targetName: "S Joseph Moore",
      companyName: "Nelson Thomas Inc",
      personName: "S Joseph Moore",
      value: "joseph.peake@nelson.kyschools.us",
      sourceUrls: ["https://www.facebook.com/ThomasNelsonHighSchool"],
      note: "public contact on school Facebook page",
    });
    expect(r.risk).toBe(true);
    expect(r.reason).toContain("school/district");
  });

  it("keeps a directly named person on a non-institutional source eligible for high-confidence binding", () => {
    const r = assessIdentityCollision({
      targetName: "Jane Example",
      companyName: "Example Holdings",
      personName: "Jane Example",
      value: "jane@exampleholdings.com",
      sourceUrls: ["https://exampleholdings.com/team/jane-example"],
      note: "Jane Example email listed on her company profile",
    });
    expect(r.risk).toBe(false);
    expect(r.identityMatch).toBeGreaterThanOrEqual(0.65);
  });
});

describe("assessGraphNamePairRisk", () => {
  it("rejects same given name different surname", () => {
    const r = assessGraphNamePairRisk("James Czirr", "James Mercer");
    expect(r.risk).toBe(true);
  });

  it("allows shared surname", () => {
    const r = assessGraphNamePairRisk("Robert Philip", "Robert W Philip");
    expect(r.risk).toBe(false);
  });
});

describe("evaluateIdentityGate name pair", () => {
  it("rejects same-first different-surname without stable id", () => {
    const r = evaluateIdentityGate({
      score: 0.8,
      signals: ["shared_affiliation", "cross_registry"],
      leftSources: ["SEC EDGAR"],
      rightSources: ["Companies House UK"],
      leftName: "James Czirr",
      rightName: "James Advisor",
    });
    expect(r.decision).toBe("rejected");
  });

  it("accepts with shared registry id despite name caution", () => {
    const r = evaluateIdentityGate({
      score: 0.9,
      signals: ["shared_registry_identifier", "cross_registry"],
      leftSources: ["SEC EDGAR"],
      rightSources: ["Companies House UK"],
      leftName: "James Czirr",
      rightName: "James Czirr Trust",
    });
    expect(r.decision).toBe("accepted");
  });
});