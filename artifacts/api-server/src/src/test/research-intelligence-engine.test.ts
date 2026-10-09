import { describe, expect, it } from "vitest";
import { ResearchIntelligenceEngine } from "../lib/research-intelligence-engine";

describe("Apex research intelligence", () => {
  it("requires domain boundaries before assigning trusted source classes", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "government-host-boundary", target: "Alex Example", objective: "verify public role" });
    engine.recordAction({
      turn: 1, action: "visit", execution: "success",
      urls: ["https://fakegov.example.com/profile"],
      observation: "Alex Example is director of Alpha",
      findings: [{ vectorType: "other", value: "director of Alpha", personName: "Alex Example", sourceUrls: ["https://fakegov.example.com/profile"] }],
    });
    engine.recordAction({
      turn: 2, action: "visit", execution: "success",
      urls: ["https://agency.gov.uk/profile"],
      observation: "Alex Example is director of Beta",
      findings: [{ vectorType: "other", value: "director of Beta", personName: "Alex Example", sourceUrls: ["https://agency.gov.uk/profile"] }],
    });
    engine.recordAction({
      turn: 3, action: "visit", execution: "success",
      urls: ["https://fake-news.example.com/profile"],
      observation: "Alex Example is director of Gamma",
      findings: [{ vectorType: "other", value: "director of Gamma", personName: "Alex Example", sourceUrls: ["https://fake-news.example.com/profile"] }],
    });
    engine.recordAction({
      turn: 4, action: "visit", execution: "success",
      urls: ["https://notlinkedin.com/profile"],
      observation: "Alex Example is director of Delta",
      findings: [{ vectorType: "other", value: "director of Delta", personName: "Alex Example", sourceUrls: ["https://notlinkedin.com/profile"] }],
    });
    engine.recordAction({
      turn: 5, action: "visit", execution: "success",
      urls: ["https://www.linkedin.com/in/alex-example"],
      observation: "Alex Example profile",
      findings: [{ vectorType: "other", value: "Alex Example profile", personName: "Alex Example", sourceUrls: ["https://www.linkedin.com/in/alex-example"] }],
    });
    const quality = engine.buildContext().sourceQualitySummary;
    expect(quality.find((item) => item.sourceClass === "UNKNOWN")?.count).toBeGreaterThanOrEqual(3);
    expect(quality.find((item) => item.sourceClass === "OFFICIAL_GOVERNANCE")?.count).toBeGreaterThan(0);
    expect(quality.find((item) => item.sourceClass === "SOCIAL_PROFILE")?.count).toBeGreaterThan(0);
  });

  it("keeps cross-page identity and contact evidence review-only until one source binds them", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "multi-source-span-binding", target: "John Smith", objective: "verify identity and contact" });
    const identityUrl = "https://company.example/leadership";
    const contactUrl = "https://company.example/contact";
    const finding = { vectorType: "email", value: "john.smith@example.com", personName: "John Smith", role: "CFO", sourceUrls: [identityUrl, contactUrl] };
    const history = [
      { turn: 1, action: "visit", execution: "success", observation: "John Smith is CFO of Example Corp.", urls: [identityUrl] },
      { turn: 2, action: "visit", execution: "success", observation: "Contact: john.smith@example.com", urls: [contactUrl] },
    ];
    engine.recordAction({ ...history[0]!, args: {}, findings: [finding] });
    engine.recordAction({ ...history[1]!, args: {}, findings: [finding], sourceObservations: history });
    const state = engine.buildContext();
    const identityEvidence = state.atomicEvidence.find((item) => item.sourceUrl === identityUrl && item.spanBound === true && item.spanBindingKind === "identity");
    const valueEvidence = state.atomicEvidence.find((item) => item.sourceUrl === contactUrl && item.spanBound === true && item.spanBindingKind === "value");
    expect(identityEvidence?.kind).toBe("observation");
    expect(identityEvidence?.claim).not.toContain("john.smith@example.com");
    expect(valueEvidence?.kind).toBe("observation");
    expect(valueEvidence?.claim).not.toContain("John Smith email");
    expect(state.facts.some((fact) => fact.claim === "John Smith email john.smith@example.com")).toBe(false);
    expect(state.contacts).toContainEqual(expect.objectContaining({ personName: "John Smith", value: "john.smith@example.com", state: "DISCOVERED", sourceUrls: expect.arrayContaining([identityUrl, contactUrl]) }));
  });

  it("does not label a long-page co-occurrence as an exact identity/value binding", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "long-page-nonbinding", target: "John Smith", objective: "verify contact" });
    const sourceUrl = "https://company.example/directory";
    const longObservation = "John Smith is CFO of Example Corp. " + "Unrelated directory entry about another person. ".repeat(12) + "Contact: john.smith@example.com.";
    engine.recordAction({
      turn: 1,
      action: "visit",
      execution: "success",
      urls: [sourceUrl],
      observation: longObservation,
      findings: [{ vectorType: "email", value: "john.smith@example.com", personName: "John Smith", role: "CFO", sourceUrls: [sourceUrl] }],
    });
    const evidence = engine.buildContext().atomicEvidence.filter((item) => item.sourceUrl === sourceUrl && item.spanBound === true);
    expect(evidence.some((item) => item.kind === "finding" && item.spanBindingKind === "identity_and_value")).toBe(false);
    expect(evidence.some((item) => item.kind === "observation" && item.spanBindingKind === "value")).toBe(true);
  });

  it("upgrades deduplicated evidence when a later observation binds identity and value together", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "evidence-span-upgrade", target: "John Smith", objective: "verify contact" });
    const sourceUrl = "https://company.example/leadership";
    const finding = { vectorType: "email", value: "john.smith@example.com", personName: "John Smith", role: "CFO", sourceUrls: [sourceUrl] };
    engine.recordAction({
      turn: 1, action: "visit", execution: "success",
      urls: [sourceUrl], observation: "John Smith is CFO of Example Corp.",
      findings: [finding],
    });
    engine.recordAction({
      turn: 2, action: "visit", execution: "success",
      urls: [sourceUrl], observation: "John Smith is CFO of Example Corp. Contact: john.smith@example.com",
      findings: [finding],
    });
    const evidence = engine.buildContext().atomicEvidence.filter((item) => item.kind === "finding" && item.sourceUrl === sourceUrl);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]?.spanBound).toBe(true);
    expect(evidence[0]?.spanBindingKind).toBe("identity_and_value");
    expect(evidence[0]?.passage).toContain("john.smith@example.com");
  });

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


  it("does not treat subdomains of one publisher as independent planning source families", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "publisher-family-planning", target: "Jane Example", objective: "verify organization and role" });
    engine.recordAction({ turn: 1, action: "visit", execution: "success", urls: ["https://example.com/about"], observation: "Jane Example is founder of Example Inc.", findings: [{ vectorType: "other", value: "founder of Example Inc.", personName: "Jane Example", sourceUrls: ["https://example.com/about"] }] });
    engine.recordAction({ turn: 2, action: "visit", execution: "success", urls: ["https://investor.example.com/leadership"], observation: "Jane Example is president of Example Inc.", findings: [{ vectorType: "other", value: "president of Example Inc.", personName: "Jane Example", sourceUrls: ["https://investor.example.com/leadership"] }] });
    engine.recordAction({ turn: 3, action: "visit", execution: "success", urls: ["https://news.example.com/profile"], observation: "Jane Example joined Example Inc.", findings: [{ vectorType: "other", value: "joined Example Inc.", personName: "Jane Example", sourceUrls: ["https://news.example.com/profile"] }] });
    engine.recordAction({ turn: 4, action: "visit", execution: "success", urls: ["https://other-publisher.net/jane"], observation: "Jane Example is a director at another organization.", findings: [{ vectorType: "other", value: "director at another organization.", personName: "Jane Example", sourceUrls: ["https://other-publisher.net/jane"] }] });
    const state = engine.buildContext();
    expect(state.sourceDiversity).toBe(4);
    expect(state.sourceFamilyDiversity).toBe(2);
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
    engine.recordAction({ turn: 1, action: "visit", execution: "success", urls: ["https://example.com/contact"], observation: "Example Target email person@example.com", findings: [{ vectorType: "email", value: "person@example.com", personName: "Example Target", sourceUrls: ["https://example.com/contact"] }] });
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


  it("does not score a similar-name person's claim as support for the target hypothesis", () => {
    const engine = new ResearchIntelligenceEngine({ executionId: "hypothesis-wrong-subject", target: "Jordan Example", objective: "verify directorship" });
    const url = "https://news.example.com/jordan-jr";
    engine.recordAction({
      turn: 1, action: "visit", execution: "success",
      args: { hypothesis: "Jordan Example is director of Alpha", purpose: "verify the directorship" },
      urls: [url], observation: "Jordan Example Jr is director of Alpha",
      findings: [{ vectorType: "is", value: "director of Alpha", personName: "Jordan Example Jr", sourceUrls: [url] }],
    });
    const hypothesis = engine.buildContext().hypotheses.find((item) => item.label === "Jordan Example is director of Alpha");
    expect(hypothesis).toBeDefined();
    expect(hypothesis?.supportingEvidenceIds).toHaveLength(0);
  });

  it("re-derives source trust from canonical URLs when restoring older durable state", () => {
    const url = "https://fake-news.example.com/profile";
    const original = new ResearchIntelligenceEngine({ executionId: "stale-source-class", target: "Alex Example", objective: "verify public role" });
    original.recordAction({
      turn: 1,
      action: "visit",
      execution: "success",
      urls: [url],
      observation: "Alex Example is director of Alpha",
      findings: [{ vectorType: "other", value: "director of Alpha", personName: "Alex Example", sourceUrls: [url] }],
    });
    const persisted = original.buildContext();
    const staleProjection = {
      ...persisted,
      facts: persisted.facts.map((fact) => ({ ...fact, sources: ["reuters.com"] })),
      atomicEvidence: persisted.atomicEvidence.map((item) => item.sourceUrl === url
        ? { ...item, sourceHost: "reuters.com", sourceClass: "REPUTABLE_NEWS" as const }
        : item),
      sourceLineage: persisted.sourceLineage.map((node) => node.canonicalUrl.startsWith(url)
        ? { ...node, host: "reuters.com" }
        : node),
    };
    const restored = new ResearchIntelligenceEngine({ executionId: "stale-source-class-resumed", target: "Alex Example", objective: "verify public role" });
    restored.restoreContext(staleProjection);
    const state = restored.buildContext();
    const evidence = state.atomicEvidence.filter((item) => item.sourceUrl === url);
    const lineage = state.sourceLineage.filter((node) => node.canonicalUrl === url);

    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.every((item) => item.sourceHost === "fake-news.example.com" && item.sourceClass === "UNKNOWN")).toBe(true);
    expect(state.sourceQualitySummary.some((item) => item.sourceClass === "REPUTABLE_NEWS" && item.count > 0)).toBe(false);
    expect(state.facts.some((fact) => fact.sources.includes("fake-news.example.com"))).toBe(true);
    expect(state.facts.some((fact) => fact.sources.includes("reuters.com"))).toBe(false);
    expect(lineage.length).toBeGreaterThan(0);
    expect(lineage.every((node) => node.host === "fake-news.example.com")).toBe(true);
  });


    it("keeps multi-source split identity/value observations review-only in intelligence context", () => {
    const identityUrl = "https://example.test/team";
    const contactUrl = "https://example.test/contact";
    const engine = new ResearchIntelligenceEngine({ executionId: "multi-source-observation-binding", target: "Alex Example", objective: "verify public contact" });
    const history = [
      { turn: 1, action: "visit", execution: "success", observation: "Alex Example is a director at Example Labs.", urls: [identityUrl] },
      { turn: 2, action: "visit", execution: "success", observation: "Public contact: alex@example.test", urls: [contactUrl] },
    ];
    engine.recordAction({ ...history[0]!, args: {} });
    engine.recordAction({ ...history[1]!, args: {} });
    engine.recordAction({
      turn: 3, action: "done", execution: "success", observation: "", urls: [], args: {},
      findings: [{
        vectorType: "email", value: "alex@example.test", personName: "Alex Example", role: "director",
        sourceUrls: [identityUrl, contactUrl], note: "Identity and contact are suggested across two observed pages.",
      }],
      sourceObservations: history,
    });
    const state = engine.buildContext();
    const identity = state.atomicEvidence.find((item) => item.sourceUrl === identityUrl && item.spanBindingKind === "identity");
    const value = state.atomicEvidence.find((item) => item.sourceUrl === contactUrl && item.spanBindingKind === "value");
    expect(identity?.kind).toBe("observation");
    expect(identity?.claim).not.toContain("alex@example.test");
    expect(identity?.passage).toContain("Alex Example");
    expect(value?.kind).toBe("observation");
    expect(value?.claim).not.toContain("Alex Example email");
    expect(value?.passage).toContain("alex@example.test");
    expect(state.facts.some((fact) => fact.claim === "Alex Example email alex@example.test")).toBe(false);
    expect(state.contacts.find((item) => item.value === "alex@example.test")).toEqual(expect.objectContaining({
      personName: "Alex Example", state: "DISCOVERED", sourceUrls: expect.arrayContaining([identityUrl, contactUrl]),
    }));
  });

  it("accepts source-backed findings from successful registry and OSINT observations", () => {
    const registryUrl = "https://find-and-update.company-information.service.gov.uk/company/12345678";
    const engine = new ResearchIntelligenceEngine({ executionId: "registry-evidence", target: "Alex Example", objective: "verify public role" });
    engine.recordAction({
      turn: 1, action: "registry_search", execution: "success",
      observation: "Alex Example is listed as a director at Example Labs.",
      urls: [registryUrl], args: { query: "Alex Example Example Labs" },
      findings: [{
        vectorType: "other", value: "director at Example Labs", personName: "Alex Example", role: "director",
        sourceUrls: [registryUrl], note: "Official company register entry.",
      }],
    });
    const state = engine.buildContext();
    const evidence = state.atomicEvidence.find((item) => item.kind === "finding" && item.sourceUrl === registryUrl);
    expect(evidence?.sourceClass).toBe("REGULATORY");
    expect(evidence?.spanBindingKind).toBe("identity_and_value");
    expect(evidence?.passage).toContain("Alex Example");
  });


});
