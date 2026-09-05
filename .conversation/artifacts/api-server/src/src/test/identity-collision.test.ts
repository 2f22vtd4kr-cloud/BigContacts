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
