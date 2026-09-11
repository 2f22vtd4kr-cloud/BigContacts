import { describe, expect, it } from "vitest";
import { sourceBackedFindings } from "../lib/target-contact-agent";

describe("target Investigator multi-source attribution", () => {
  it("accepts identity and contact value observed on separate pages when both are explicitly attributed", () => {
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
    expect(backed[0]?.sourceUrls).toHaveLength(2);
  });

  it("still rejects an unobserved attribution URL", () => {
    const findings = [{ vectorType: "email" as const, value: "john.smith@example.com", personName: "John Smith", role: "CFO", scope: "candidate" as const, sourceUrls: ["https://company.example/leadership", "https://unseen.example/contact"], note: "model claim", promotionDecision: "promote" as const }];
    const records = [{ turn: 1, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "John Smith is CFO of Example Corp. Contact: john.smith@example.com", observedUrls: ["https://company.example/leadership"], findings: [] }];
    const backed = sourceBackedFindings(findings, ["step1: visit https://company.example/leadership execution=success observed=https://company.example/leadership"], records);
    expect(backed).toHaveLength(0);
  });
});
