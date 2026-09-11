import { describe, expect, it } from "vitest";
import { sourceBackedAgenticFindings } from "../lib/bureau-agentic-pass";

describe("Bureau multi-source attribution", () => {
  it("accepts a model claim when identity and value are observed on separate cited pages", () => {
    const finding = { vectorType: "email" as const, value: "jane@example.com", personName: "Jane Smith", role: "CFO", scope: "candidate" as const, sourceUrls: ["https://company.example/leadership", "https://company.example/contact"], note: "multi-source", promotionDecision: "promote" as const };
    const records = [
      { turn: 1, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "Jane Smith is CFO.", observedUrls: ["https://company.example/leadership"], findings: [] },
      { turn: 2, model: "groq", action: "visit", args: {}, execution: "success" as const, observation: "Email jane@example.com", observedUrls: ["https://company.example/contact"], findings: [] },
    ];
    const result = sourceBackedAgenticFindings([finding], [
      "step1: visit https://company.example/leadership execution=success observed=https://company.example/leadership",
      "step2: visit https://company.example/contact execution=success observed=https://company.example/contact",
    ], records);
    expect(result).toHaveLength(1);
  });
});
