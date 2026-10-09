import { describe, expect, it } from "vitest";
import { ResearchIntelligenceEngine } from "../lib/research-intelligence-engine";

describe("Apex research intelligence", () => {
  it("keeps search-result leads out of evidence and source-coverage metrics", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "search-leads", target: "Example Target", objective: "discover attributable people" });
    engine.recordAction({
      turn: 1,
      action: "web_search",
      execution: "success",
      urls: ["https://linkedin.com/in/example", "https://example.org/profile"],
      observation: "Example Person - Founder at Example Org",
      findings: [],
    });
    const state = engine.buildContext();
    expect(state.evidenceCount).toBe(0);
    expect(state.sourceDiversity).toBe(0);
    expect(state.sourceFamilyDiversity).toBe(0);
    expect(state.facts).toHaveLength(0);
    expect(state.recentActions[0]?.useful).toBe(false);
    expect(state.recentActions[0]?.informationGain).toBeLessThanOrEqual(0.15);
  });


  it("keeps evidence, contradictions, negative findings, contacts, and provenance together", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "audit", target: "Alex Example", objective: "resolve identity and contact" });
    engine.recordAction({ turn: 1, action: "registry_search", execution: "success", urls: ["https://registry.example.gov/a"], observation: "Alex Example is director of Alpha", findings: [{ vectorType: "is", value: "director of Alpha", personName: "Alex Example", sourceUrls: ["https://registry.example.gov/a"] }] });
    engine.recordAction({ turn: 2, action: "visit", execution: "success", urls: ["https://news.example.com/b"], observation: "Alex Example is director of Beta", findings: [{ vectorType: "is", value: "director of Beta", personName: "Alex Example", sourceUrls: ["https://news.example.com/b"] }] });
    engine.recordAction({ turn: 3, action: "visit", execution: "http_error", urls: ["https://example.com/contact"], observation: "HTTP 404", findings: [] });
    const state = engine.buildContext();
    expect(state.evidenceCount).toBeGreaterThan(0);
    expect(state.sourceDiversity).toBeGreaterThanOrEqual(2);
    expect(state.contradictions.length).toBeGreaterThan(0);
    expect(state.negativeFindings.length).toBeGreaterThan(0);
    expect(state.provenanceDigest).toHaveLength(64);
    expect(state.missionBriefs.map((brief) => brief.mission)).toEqual(["identity", "organization", "contact", "disproof"]);
  });

  it("does not treat multiple attributable emails as contradictory and refreshes evidence timestamps", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "multi-contact", target: "Example Target", objective: "find public contacts" });
    engine.recordAction({ turn: 1, action: "visit", execution: "success", urls: ["https://example.com/a"], observation: "Example Target email one@example.com", findings: [{ vectorType: "email", value: "one@example.com", personName: "Example Target", sourceUrls: ["https://example.com/a"] }] });
    engine.recordAction({ turn: 2, action: "visit", execution: "success", urls: ["https://example.org/b"], observation: "Example Target email two@example.com", findings: [{ vectorType: "email", value: "two@example.com", personName: "Example Target", sourceUrls: ["https://example.org/b"] }] });
    const state = engine.buildContext();
    expect(state.contradictions).toHaveLength(0);
    expect(state.facts.some((fact) => fact.claim.includes("email one@example.com"))).toBe(true);
    expect(state.recentActions[0]?.informationGain).toBeGreaterThan(0.5);
  });

  it("records the Investigator's own hypothesis as epistemic state rather than a deterministic route", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "model-hypothesis", target: "Jordan Example", objective: "resolve identity" });
    engine.recordAction({
      turn: 1,
      action: "web_search",
      execution: "success",
      args: { hypothesis: "Jordan Example may be the director of Alpha", purpose: "Discriminate the Alpha affiliation from competing identities", expectedInformationGain: 0.8 },
      urls: ["https://registry.example.gov/jordan"],
      observation: "Jordan Example is director of Alpha",
      findings: [{ vectorType: "other", value: "director of Alpha", personName: "Jordan Example", sourceUrls: ["https://registry.example.gov/jordan"] }],
    });
    const state = engine.buildContext();
    expect(state.hypotheses.some((hypothesis) => hypothesis.label === "Jordan Example may be the director of Alpha")).toBe(true);
    expect(state.recentActions[0]?.args.hypothesis).toBe("Jordan Example may be the director of Alpha");
    expect(state.researchQuestions.some((question) => question.question.includes("Discriminate the Alpha affiliation"))).toBe(true);
  });

  it("restores durable epistemic state without selecting a new action", () => {
    const original = new ResearchIntelligenceEngine({ executionId: "resume-original", target: "Jordan Example", objective: "resume investigation" });
    original.recordAction({ turn: 1, action: "web_search", execution: "success", args: { hypothesis: "Jordan Example is tied to Alpha", purpose: "verify the affiliation" }, urls: ["https://registry.example.gov/jordan"], observation: "Jordan Example is director of Alpha", findings: [{ vectorType: "other", value: "director of Alpha", personName: "Jordan Example", sourceUrls: ["https://registry.example.gov/jordan"] }] });
    original.recordAction({ turn: 2, action: "web_search", execution: "success", urls: ["https://news.example.com/jordan"], observation: "Jordan Example is director of Beta", findings: [{ vectorType: "other", value: "director of Beta", personName: "Jordan Example", sourceUrls: ["https://news.example.com/jordan"] }] });
    const before = original.buildContext();

    const restored = new ResearchIntelligenceEngine({ executionId: "resume-new-process", target: "Jordan Example", objective: "resume investigation" });
    restored.restoreContext(before);
    const after = restored.buildContext();

    expect(after.evidenceCount).toBe(before.evidenceCount);
    expect(after.sourceDiversity).toBe(before.sourceDiversity);
    expect(after.independentSourceUnits).toBe(before.independentSourceUnits);
    expect(after.hypotheses.map((item) => item.label)).toEqual(before.hypotheses.map((item) => item.label));
    expect(after.contradictions.length).toBe(before.contradictions.length);
    expect(after.contacts.length).toBe(before.contacts.length);
    expect(after.atomicEvidence.map((item) => item.claim)).toEqual(before.atomicEvidence.map((item) => item.claim));
  });

  it("keeps competing identity hypotheses explicit", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "hypotheses", target: "Jordan Example", objective: "resolve identity" });
    engine.addHypothesis({ label: "H1", entity: "Jordan Example A", score: 0.9 });
    engine.addHypothesis({ label: "H2", entity: "Jordan Example B", score: 0.1 });
    const state = engine.buildContext();
    expect(state.hypotheses.find((h) => h.label === "H1")?.status).toBe("leading");
    expect(state.hypotheses.find((h) => h.label === "H2")?.status).toBe("rejected");
  });

  it("does not promote failed executions or failed URLs into positive evidence", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "failed", target: "Example Target", objective: "audit failed tools" });
    engine.recordAction({ turn: 1, action: "visit", execution: "http_error", urls: ["https://failed.example/page"], observation: "Jane Example — Founder — jane@example.com", findings: [{ vectorType: "email", value: "jane@example.com", personName: "Jane Example", sourceUrls: ["https://failed.example/page"] }] });
    const state = engine.buildContext();
    expect(state.facts.some((fact) => fact.claim.includes("jane@example.com"))).toBe(false);
    expect(state.evidenceCount).toBe(0);
    expect(state.negativeFindings.some((finding) => finding.includes("http_error"))).toBe(true);
  });

  it("preserves VERIFIED and STALE contact states when later sources corroborate the value", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "terminal-contact", target: "Example Target", objective: "preserve contact state" });
    engine.recordAction({ turn: 1, action: "visit", execution: "success", urls: ["https://one.example/contact"], observation: "Example Target email person@example.com", findings: [{ vectorType: "email", value: "person@example.com", personName: "Example Target", sourceUrls: ["https://one.example/contact"] }] });
    engine.recordFeedback({ outcome: "successful_outreach", value: "person@example.com" });
    engine.recordAction({ turn: 2, action: "visit", execution: "success", urls: ["https://two.example/contact"], observation: "Example Target email person@example.com", findings: [{ vectorType: "email", value: "person@example.com", personName: "Example Target", sourceUrls: ["https://two.example/contact"] }] });
    expect(engine.buildContext().contacts[0]?.state).toBe("VERIFIED");
    engine.recordFeedback({ outcome: "bounced", value: "person@example.com" });
    engine.recordAction({ turn: 3, action: "visit", execution: "success", urls: ["https://three.example/contact"], observation: "Example Target email person@example.com", findings: [{ vectorType: "email", value: "person@example.com", personName: "Example Target", sourceUrls: ["https://three.example/contact"] }] });
    expect(engine.buildContext().contacts[0]?.state).toBe("STALE");
  });

  it("moves contact evidence through outcome feedback without inventing proof", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "feedback", target: "Example Target", objective: "find a public contact" });
    engine.recordAction({ turn: 1, action: "done", execution: "success", findings: [{ vectorType: "email", value: "person@example.com", personName: "Example Target", sourceUrls: ["https://example.com/contact"] }] });
    engine.recordFeedback({ outcome: "bounced", value: "person@example.com" });
    expect(engine.buildContext().contacts[0]?.state).toBe("STALE");
    expect(engine.getFeedbackStats().bounced).toBe(1);
  });

  it("recomputes hypothesis confidence from a stable prior across repeated context reads", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "stable-posterior", target: "Jordan Example", objective: "resolve identity" });
    const url = "https://registry.example.gov/jordan";
    engine.recordAction({
      turn: 1, action: "visit", execution: "success", urls: [url],
      observation: "Jordan Example is director of Alpha",
      findings: [{ vectorType: "other", value: "director of Alpha", personName: "Jordan Example", sourceUrls: [url] }],
    });
    const evidenceId = engine.buildContext().atomicEvidence[0]?.evidenceId;
    expect(evidenceId).toBeTruthy();
    engine.addHypothesis({ label: "Jordan Example is director of Alpha", entity: "Jordan Example director Alpha", score: 0.5, supportingEvidenceIds: [evidenceId!] });
    const first = engine.buildContext().hypotheses.find((item) => item.label === "Jordan Example is director of Alpha")?.score;
    const second = engine.buildContext().hypotheses.find((item) => item.label === "Jordan Example is director of Alpha")?.score;
    expect(first).toBeDefined();
    expect(second).toBeCloseTo(first!, 12);
  });

  it("unions support and contradiction evidence when the same hypothesis is observed again", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "hypothesis-evidence-union", target: "Jordan Example", objective: "resolve identity" });
    const firstUrl = "https://registry.example.gov/jordan";
    const secondUrl = "https://news.example.com/jordan";
    engine.recordAction({
      turn: 1, action: "visit", execution: "success", urls: [firstUrl],
      observation: "Jordan Example is director of Alpha",
      findings: [{ vectorType: "other", value: "director of Alpha", personName: "Jordan Example", sourceUrls: [firstUrl] }],
    });
    engine.recordAction({
      turn: 2, action: "visit", execution: "success", urls: [secondUrl],
      observation: "Jordan Example is director of Alpha",
      findings: [{ vectorType: "other", value: "director of Alpha", personName: "Jordan Example", sourceUrls: [secondUrl] }],
    });
    const evidenceIds = engine.buildContext().atomicEvidence.filter((item) => item.kind === "finding" || item.kind === "claim").map((item) => item.evidenceId);
    expect(evidenceIds).toHaveLength(2);
    engine.addHypothesis({ label: "Jordan Example is director of Alpha", entity: "Jordan Example director Alpha", supportingEvidenceIds: [evidenceIds[0]!] });
    engine.addHypothesis({ label: "Jordan Example is director of Alpha", entity: "Jordan Example director Alpha", supportingEvidenceIds: [evidenceIds[1]!] });
    const hypothesis = engine.buildContext().hypotheses.find((item) => item.label === "Jordan Example is director of Alpha");
    expect(hypothesis?.supportingEvidenceIds).toEqual(expect.arrayContaining(evidenceIds));
  });


  it("keeps evidence fingerprints idempotent when a case is restored and the same source is revisited", () => {
    const url = "https://registry.example.gov/jordan";
    const input = { executionId: "restore-idempotence", target: "Jordan Example", objective: "resolve identity" };
    const original = new ResearchIntelligenceEngine(input);
    original.recordAction({
      turn: 1, action: "visit", execution: "success", urls: [url],
      observation: "Jordan Example other director of Alpha",
      findings: [{ vectorType: "other", value: "director of Alpha", personName: "Jordan Example", sourceUrls: [url] }],
    });
    const before = original.buildContext();
    const restored = new ResearchIntelligenceEngine(input);
    restored.restoreContext(before);
    restored.recordAction({
      turn: 2, action: "visit", execution: "success", urls: [url],
      observation: "Jordan Example other director of Alpha",
      findings: [{ vectorType: "other", value: "director of Alpha", personName: "Jordan Example", sourceUrls: [url] }],
    });
    const after = restored.buildContext();
    expect(after.evidenceCount).toBe(before.evidenceCount);
    expect(after.atomicEvidence.map((item) => item.evidenceId)).toEqual(before.atomicEvidence.map((item) => item.evidenceId));
  });


  it("does not treat an unrelated contact finding as support for a role hypothesis", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "hypothesis-relevance", target: "Jordan Example", objective: "verify role" });
    const url = "https://example.com/contact";
    engine.recordAction({
      turn: 1, action: "visit", execution: "success",
      args: { hypothesis: "Jordan Example is director of Alpha", purpose: "verify the director role" },
      urls: [url], observation: "Jordan Example email jordan@example.com",
      findings: [{ vectorType: "email", value: "jordan@example.com", personName: "Jordan Example", sourceUrls: [url] }],
    });
    const hypothesis = engine.buildContext().hypotheses.find((item) => item.label === "Jordan Example is director of Alpha");
    expect(hypothesis).toBeDefined();
    expect(hypothesis?.supportingEvidenceIds).toHaveLength(0);
  });

  it("lowers a hypothesis posterior when a linked observation contradicts its supported claim", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "hypothesis-contradiction", target: "Alex Example", objective: "verify directorship" });
    const alphaUrl = "https://registry.example.gov/alex";
    const betaUrl = "https://news.example.com/alex";
    engine.recordAction({
      turn: 1, action: "visit", execution: "success",
      args: { hypothesis: "Alex Example is director of Alpha", purpose: "verify the directorship" },
      urls: [alphaUrl], observation: "Alex Example is director of Alpha",
      findings: [{ vectorType: "is", value: "director of Alpha", personName: "Alex Example", sourceUrls: [alphaUrl] }],
    });
    const prior = engine.buildContext().hypotheses.find((item) => item.label === "Alex Example is director of Alpha")?.score;
    engine.recordAction({
      turn: 2, action: "visit", execution: "success",
      args: { hypothesis: "Alex Example is director of Alpha", purpose: "verify the director role" },
      urls: [betaUrl], observation: "Alex Example is director of Beta",
      findings: [{ vectorType: "is", value: "director of Beta", personName: "Alex Example", sourceUrls: [betaUrl] }],
    });
    const state = engine.buildContext();
    const updated = state.hypotheses.find((item) => item.label === "Alex Example is director of Alpha");
    const betaEvidenceId = state.atomicEvidence.find((item) => item.claim === "Alex Example is director of Beta")?.evidenceId;
    expect(prior).toBeDefined();
    expect(updated?.contradictingEvidenceIds.length).toBeGreaterThan(0);
    expect(updated?.supportingEvidenceIds).not.toContain(betaEvidenceId);
    expect(updated?.score).toBeLessThan(prior!);
  });


  it("does not score a directly conflicting predicate object as hypothesis support", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "hypothesis-object-mismatch", target: "Alex Example", objective: "verify directorship" });
    const url = "https://news.example.com/alex";
    engine.recordAction({
      turn: 1, action: "visit", execution: "success",
      args: { hypothesis: "Alex Example may be the director of Alpha", purpose: "verify the directorship" },
      urls: [url], observation: "Alex Example is director of Beta",
      findings: [{ vectorType: "is", value: "director of Beta", personName: "Alex Example", sourceUrls: [url] }],
    });
    const hypothesis = engine.buildContext().hypotheses.find((item) => item.label === "Alex Example may be the director of Alpha");
    expect(hypothesis).toBeDefined();
    expect(hypothesis?.supportingEvidenceIds).toHaveLength(0);
  });

});
