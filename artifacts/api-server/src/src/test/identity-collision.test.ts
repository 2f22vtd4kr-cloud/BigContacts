import { describe, it, expect } from "vitest";
import { assessIdentityCollision, assessGraphNamePairRisk, identityNameTokens, organizationNameTokens } from "../lib/identity-collision";
import { evaluateIdentityGate } from "../lib/identity-gate";

describe("model-authored identity adjudication", () => {
  const common = {
    targetName: "Robert W Philip",
    companyName: "Issuer Inc",
    personName: "Roberto Felipe",
    value: "rphilip@issuer.com",
    sourceUrls: ["https://issuer.com/team/roberto-felipe"],
  };

  it("keeps identity unresolved when the model has not made a decision", () => {
    const result = assessIdentityCollision(common);
    expect(result.assessment).toBe("unresolved");
    expect(result.risk).toBe(true);
  });

  it("accepts a model-assessed same person even when transliteration and spelling differ", () => {
    const result = assessIdentityCollision({
      ...common,
      identityAssessment: "same_person",
      identityRationale: "The fetched biography links Roberto Felipe to the target's documented former name and same board mandate.",
    });
    expect(result).toMatchObject({ assessment: "same_person", risk: false, identityMatch: 1 });
  });

  it("blocks an explicit different-person assessment", () => {
    const result = assessIdentityCollision({
      ...common,
      identityAssessment: "different_people",
      identityRationale: "The source documents a different individual with a distinct career history.",
    });
    expect(result.assessment).toBe("different_people");
    expect(result.risk).toBe(true);
  });

  it("does not accept a same-person assertion without a rationale", () => {
    const result = assessIdentityCollision({ ...common, identityAssessment: "same_person" });
    expect(result.assessment).toBe("unresolved");
    expect(result.risk).toBe(true);
  });

  it("keeps shared inboxes without person attribution unresolved", () => {
    const result = assessIdentityCollision({
      ...common,
      personName: null,
      value: "info@issuer.com",
      identityAssessment: "same_person",
      identityRationale: "The person is named elsewhere on the page.",
    });
    expect(result.risk).toBe(true);
    expect(result.assessment).toBe("unresolved");
  });

  it("continues to block aggregator-only sources even when the model says same person", () => {
    const result = assessIdentityCollision({
      ...common,
      sourceUrls: ["https://www.rocketreach.co/roberto-felipe_email_123"],
      identityAssessment: "same_person",
      identityRationale: "The person appears to match the subject.",
    });
    expect(result.risk).toBe(true);
    expect(result.reason).toMatch(/aggregator-only/i);
  });

  it("allows an independent public source alongside an aggregator lead", () => {
    const result = assessIdentityCollision({
      ...common,
      sourceUrls: ["https://www.rocketreach.co/roberto-felipe_email_123", "https://issuer.com/team/roberto-felipe"],
      identityAssessment: "same_person",
      identityRationale: "The official issuer profile links the same individual and role.",
    });
    expect(result.risk).toBe(false);
  });

  it("retains Unicode-aware name token utilities without using them as identity decisions", () => {
    expect(identityNameTokens("José Álvarez")).toEqual(["jose", "alvarez"]);
    expect(identityNameTokens("Володимир Зеленський")).toEqual(["володимир", "зеленський"]);
    expect(identityNameTokens("Xi Jinping")).toEqual(["xi", "jinping"]);
    expect(organizationNameTokens("Jane Doe Co")).toEqual(["jane", "doe"]);
  });
});

describe("name-pair similarity is not identity proof", () => {
  it("leaves different surnames unresolved rather than inferring different people", () => {
    const result = assessGraphNamePairRisk("James Czirr", "James Mercer");
    expect(result.risk).toBe(true);
    expect(result.assessment).toBe("unresolved");
  });

  it("leaves Cyrillic name pairs unresolved without model context", () => {
    const result = assessGraphNamePairRisk("Володимир Зеленський", "Володимир Путін");
    expect(result.risk).toBe(true);
    expect(result.assessment).toBe("unresolved");
  });

  it("allows exact normalized duplicates but not approximate aliases", () => {
    expect(assessGraphNamePairRisk("José Álvarez", "José Álvarez").risk).toBe(false);
    expect(assessGraphNamePairRisk("José Álvarez", "Jose Alvarez").assessment).toBe("unresolved");
  });
});

describe("model-guided graph identity gate", () => {
  const base = {
    score: 0.9,
    signals: ["shared_public_profile", "shared_affiliation"],
    leftSources: ["SEC EDGAR", "Companies House UK"],
    rightSources: ["Companies House UK", "official company profile"],
  };

  it("does not make a semantic identity decision from a numeric score or names alone", () => {
    const result = evaluateIdentityGate({ ...base, leftName: "James Czirr", rightName: "James Advisor" });
    expect(result.decision).toBe("review");
  });

  it("rejects an explicit different-person judgement", () => {
    const result = evaluateIdentityGate({
      ...base,
      semanticAssessment: "different_people",
      semanticRationale: "Distinct employment histories and dates establish separate people.",
    });
    expect(result.decision).toBe("rejected");
  });

  it("accepts a model-assessed same person only with independent corroboration", () => {
    const result = evaluateIdentityGate({
      ...base,
      semanticAssessment: "same_person",
      semanticRationale: "The same public director identifier and board appointment are attributed to both records.",
    });
    expect(result.decision).toBe("accepted");
  });

  it("keeps same-person judgements under review when sources are not independent", () => {
    const result = evaluateIdentityGate({
      ...base,
      rightSources: ["SEC EDGAR"],
      semanticAssessment: "same_person",
      semanticRationale: "Both entries refer to the same person.",
    });
    expect(result.decision).toBe("review");
  });
});
