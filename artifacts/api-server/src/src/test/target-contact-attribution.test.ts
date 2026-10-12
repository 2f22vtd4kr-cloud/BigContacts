import { describe, expect, it } from "vitest";
import { buildTargetContactInvestigatorObjective, findingsToContacts, sourceBackedFindings } from "../lib/target-contact-agent";
import { supportsContactClaimAcrossObservations } from "../lib/bureau-contact-persist-strict";

describe("target Investigator objective follows realistic human research", () => {
  it("keeps the target objective bounded and preserves the source-attribution law under a huge reachability directive", () => {
    const objective = buildTargetContactInvestigatorObjective({
      targetName: "Jane Example",
      companyName: "Regional Coastal Casino",
      reachabilityControl: "REALISM / REACHABILITY CONTROL: " + "do not overrun context ".repeat(100),
    });
    expect(objective.length).toBeLessThanOrEqual(1_900);
    expect(objective).toContain("no fixed checklist");
    expect(objective).toContain("a public source directly documents a material business");
    expect(objective).toContain("Use the exact URL where observed");
    expect(objective).toContain("Do not promote when identity or person/value binding is uncertain");
  });

  it("preserves the actual reachability mode and score when compacting an oversized directive", () => {
    const objective = buildTargetContactInvestigatorObjective({
      targetName: "Jane Example",
      companyName: "Regional Coastal Casino",
      reachabilityControl: [
        "REALISM / REACHABILITY CONTROL:",
        "Status: TARGETED · practical access score 42/100.",
        "This is a TARGETED reachability pass. Prioritize one or two plausible intermediary routes before broad contact discovery.",
        "Positive evidence: a source-backed business relation.",
        "Known blockers: no validated person-level direct phone or email is present; no corroborated assistant or office route is stored.",
        "Extra diagnostic detail ".repeat(8),
      ].join("\n"),
    });
    expect(objective).toContain("Status TARGETED (access score 42/100).");
    expect(objective).toContain("This is a TARGETED reachability pass.");
    expect(objective).toContain("Prioritize one or two plausible intermediary routes");
    expect(objective.length).toBeLessThanOrEqual(1_900);
  });

  it("keeps the objective bounded with maximum identity labels and an oversized reachability directive", () => {
    const objective = buildTargetContactInvestigatorObjective({
      targetName: "Candidate Name ".repeat(30),
      companyName: "Regional Operating Business ".repeat(20),
      reachabilityControl: "REALISM / REACHABILITY CONTROL: " + "unbounded context ".repeat(500),
    });
    expect(objective.length).toBeLessThanOrEqual(1_900);
    expect(objective).toContain("a public source directly documents a material business");
    expect(objective).toContain("public, attributable profiles");
    expect(objective).toContain("the exact URL where observed");
    expect(objective).toContain("Do not promote when identity or person/value binding is uncertain");
  });

  it("carries reachability realism and target-specific public-source pivots without scripting a fixed route", () => {
    const objective = buildTargetContactInvestigatorObjective({
      targetName: "Jane Example",
      companyName: "Regional Coastal Casino",
      reachabilityControl: "REALISM / REACHABILITY CONTROL: Status BOUNDED; prioritize a corroborated intermediary route.",
    });
    expect(objective).toContain("Status BOUNDED");
    expect(objective).toContain("Investigate the person, not generic company contacts");
    expect(objective).toContain("beneficial-owner registries");
    expect(objective).toContain("local-language reporting");
    expect(objective).toContain("public professional/business profiles");
    expect(objective).toContain("WhatsApp/Telegram");
    expect(objective).toContain("directly documents a material business");
    expect(objective).toContain("no fixed checklist");
    expect(objective).toContain("exact URL where observed");
  });
});

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
  it("rejects split-page-only candidate attribution in the target research path", () => {
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
    expect(backed).toHaveLength(0);
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
