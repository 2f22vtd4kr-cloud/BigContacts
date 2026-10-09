import { describe, expect, it } from "vitest";
import { findingsToContacts, sourceBackedFindings } from "../lib/target-contact-agent";
import { supportsContactClaimAcrossObservations } from "../lib/bureau-contact-persist-strict";

describe("target Investigator multi-source attribution", () => {
  it("does not turn an HTTP-only finding into a contact candidate", () => {
    expect(findingsToContacts([{
      vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder",
      scope: "candidate", sourceUrls: ["http://company.example/team"], note: "http source", promotionDecision: "promote",
    }], "Jane Example")).toEqual([]);
  });

  it("does not treat an HTTP page as claim-grade provenance", () => {
    const findings = [{ vectorType: "email" as const, value: "jane@example.com", personName: "Jane Example", role: "Founder", scope: "candidate" as const, sourceUrls: ["http://company.example/team"], note: "http source", promotionDecision: "promote" as const }];
    const records = [{ turn: 1, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "Jane Example email jane@example.com", observedUrls: ["http://company.example/team"], findings: [] }];
    expect(sourceBackedFindings(findings, [], records)).toEqual([]);
  });
  it("keeps split-page attribution reviewable but ineligible for trusted contact promotion", () => {
    const findings = [{
      vectorType: "email" as const,
      value: "john.smith@example.com",
      personName: "John Smith",
      role: "CFO",
      scope: "candidate" as const,
      sourceUrls: ["https://company.example/leadership", "https://company.example/contact"],
      note: "model attributed the email to the named CFO across two observed pages",
      promotionDecision: "promote" as const,
    }];
    const records = [
      { turn: 1, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "John Smith is CFO of Example Corp.", observedUrls: ["https://company.example/leadership"], findings: [] },
      { turn: 2, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "Contact: john.smith@example.com", observedUrls: ["https://company.example/contact"], findings: [] },
    ];
    const backed = sourceBackedFindings(findings, [
      "step1: visit https://company.example/leadership execution=success observed=https://company.example/leadership",
      "step2: visit https://company.example/contact execution=success observed=https://company.example/contact",
    ], records);
    expect(backed).toHaveLength(1);
    expect(supportsContactClaimAcrossObservations(
      records.map((record) => ({ observationText: record.observation, sourceUrls: record.observedUrls })),
      findings[0]!,
      findings[0]!.value,
      findings[0]!.vectorType,
    )).toBe(false);
  });

  it("accepts multiple cited pages when at least one binds exact identity and contact together", () => {
    const findings = [{
      vectorType: "email" as const,
      value: "john.smith@example.com",
      personName: "John Smith",
      role: "CFO",
      scope: "candidate" as const,
      sourceUrls: ["https://company.example/leadership", "https://company.example/contact"],
      note: "one source co-binds the candidate and contact; another corroborates the value",
      promotionDecision: "promote" as const,
    }];
    const records = [
      { turn: 1, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "John Smith is CFO of Example Corp. Contact: john.smith@example.com", observedUrls: ["https://company.example/leadership"], findings: [] },
      { turn: 2, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "Contact: john.smith@example.com", observedUrls: ["https://company.example/contact"], findings: [] },
    ];
    const backed = sourceBackedFindings(findings, [
      "step1: visit https://company.example/leadership execution=success observed=https://company.example/leadership",
      "step2: visit https://company.example/contact execution=success observed=https://company.example/contact",
    ], records);
    expect(backed).toHaveLength(1);
    expect(backed[0]?.sourceUrls).toHaveLength(2);
  });

  it("rejects a claim when any cited attribution URL was not observed", () => {
    const findings = [{ vectorType: "email" as const, value: "john.smith@example.com", personName: "John Smith", role: "CFO", scope: "candidate" as const, sourceUrls: ["https://company.example/leadership", "https://unseen.example/contact"], note: "model claim", promotionDecision: "promote" as const }];
    const records = [{ turn: 1, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "John Smith is CFO of Example Corp. Contact: john.smith@example.com", observedUrls: ["https://company.example/leadership"], findings: [] }];
    const backed = sourceBackedFindings(findings, ["step1: visit https://company.example/leadership execution=success observed=https://company.example/leadership"], records);
    expect(backed).toHaveLength(0);
  });
});
