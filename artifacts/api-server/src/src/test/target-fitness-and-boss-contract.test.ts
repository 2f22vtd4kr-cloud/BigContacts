import { describe, expect, it } from "vitest";
import { evaluateTargetFitness, shouldRejectTarget, suggestReframe } from "../lib/target-fitness";
import { applyGeminiBossPlan, type ResearchCaseFile } from "../lib/case-bureau";
import { computeInvestigationProgress, evaluateInvestigationStop } from "../lib/investigation-progress";

describe("target fitness contract", () => {
  it("rejects fame-only household names with reframe guidance", () => {
    const fit = evaluateTargetFitness({ name: "Elon Musk", personScoped: true });
    expect(fit.fit).toBe("reject_fame_only");
    expect(shouldRejectTarget(fit)).toBe(true);
    expect(suggestReframe({ name: "Elon Musk", fit: fit.fit })).toMatch(/reachable officer|operator/i);
  });

  it("rejects pure corp shells under person-scoped budget", () => {
    const fit = evaluateTargetFitness({
      name: "Acme Holdings Ltd",
      type: "Corporation",
      personScoped: true,
    });
    expect(fit.fit).toBe("reject_non_person");
    expect(shouldRejectTarget(fit)).toBe(true);
  });

  it("does not reject a quiet operator-shaped person", () => {
    const fit = evaluateTargetFitness({
      name: "Helen Vargas",
      role: "founder and managing partner",
      snippet: "private equity operator, portfolio company board",
      personScoped: true,
    });
    expect(shouldRejectTarget(fit)).toBe(false);
    expect(["strong", "weak", "review"]).toContain(fit.fit);
  });
});

describe("Boss control-loop contract", () => {
  function minimalFile(): ResearchCaseFile {
    return {
      version: 1,
      target: {
        name: "Helen Vargas",
        type: "HNWI",
        nationality: null,
        knownResidences: [],
        knownDomains: ["example.com"],
      },
      hypotheses: ["operator path"],
      evidenceSummary: {
        sourceRegistries: [],
        discoveredPeople: ["Helen Vargas"],
        relatedOrganizations: [],
        evidenceCount: 0,
        searchGaps: ["linkedin"],
        negativeFindings: [],
      },
      specialistRoster: [],
      actionQueue: [
        {
          id: "expand-contact-routes",
          title: "Expand contacts",
          purpose: "routes",
          specialistId: "contact",
          tools: ["contact-enrichment"],
          priority: 90,
          status: "queued",
          rationale: "need routes",
        },
        {
          id: "run-digital-footprint",
          title: "Footprint",
          purpose: "handles",
          specialistId: "footprint",
          tools: ["Sherlock"],
          priority: 70,
          status: "queued",
          rationale: "handles",
        },
        {
          id: "challenge-case",
          title: "Challenge",
          purpose: "skeptic",
          specialistId: "skeptic",
          tools: ["evidence-ledger"],
          priority: 60,
          status: "queued",
          rationale: "challenge",
        },
      ],
      contactRoutes: [],
      humanDirectives: [],
      decisionLog: [],
      nextBestAction: null,
      lastUpdatedBy: "test",
      investigationProgress: computeInvestigationProgress({
        routes: [],
        sourceRegistries: [],
        searchGaps: ["linkedin"],
        negativeFindings: [],
        completedActionIds: [],
      }),
      noProgressStreak: 0,
    };
  }

  it("applies allowlist reprioritize without inventing action ids", () => {
    const file = minimalFile();
    const next = applyGeminiBossPlan(file, {
      outcome: "proceed",
      actionId: "expand-contact-routes",
      decision: "expand routes first",
      reason: "pending social and contact vectors",
      progressAssessment: "pending linkedin/phone; contact expansion addresses gaps",
      reprioritize: ["challenge-case", "run-digital-footprint", "invented-action"],
      iteration: 1,
    });
    expect(next).not.toBeNull();
    expect(next!.nextBestAction?.id).toBe("expand-contact-routes");
    expect(next!.nextBestAction?.status).toBe("active");
    const queued = next!.actionQueue.filter((a) => a.status === "queued");
    expect(queued.map((a) => a.id)).toEqual(["challenge-case", "run-digital-footprint"]);
    expect(queued.some((a) => a.id === "invented-action")).toBe(false);
    expect(next!.decisionLog.at(-1)?.reason).toMatch(/progress:/);
    expect(next!.decisionLog.at(-1)?.reason).toMatch(/reprioritize:/);
  });

  it("records reject_target without activating an action", () => {
    const file = minimalFile();
    const next = applyGeminiBossPlan(file, {
      outcome: "reject_target",
      actionId: null,
      decision: "reject fame trophy",
      reason: "household name with no realistic direct path",
      progressAssessment: "fitness fail — no further budget",
      iteration: 1,
    });
    expect(next).not.toBeNull();
    expect(next!.nextBestAction).toBeNull();
    expect(next!.decisionLog.at(-1)?.decision).toMatch(/reject_target/);
  });

  it("stop gate fires on fitness reject without requiring more provider burn", () => {
    const progress = computeInvestigationProgress({
      routes: [],
      sourceRegistries: [],
      searchGaps: [],
      negativeFindings: [],
      completedActionIds: [],
    });
    const stop = evaluateInvestigationStop({
      progress,
      iteration: 1,
      maxActions: 6,
      noProgressStreak: 0,
      noProgressLimit: 3,
      fitnessReject: true,
      queuedActionCount: 3,
    });
    expect(stop.stop).toBe(true);
    expect(stop.reason).toMatch(/fitness/i);
  });
});

import { collectDiscoveryContactsForTarget } from "../lib/bureau-contact-persist";

describe("discovery contact collect for cards", () => {
  it("pulls person-named vectors from the whole deck", () => {
    const contacts = collectDiscoveryContactsForTarget("Helen Vargas", [
      {
        name: "Helen Vargas",
        contactEvidence: [
          { vectorType: "email", value: "helen@example.com", personName: "Helen Vargas", scope: "person" },
        ],
      },
      {
        name: "Vargas Capital Ltd",
        contactEvidence: [
          { vectorType: "email", value: "info@vargas.example", personName: null, scope: "organization" },
          { vectorType: "linkedin", value: "https://linkedin.com/in/helen-vargas", personName: "Helen Vargas", scope: "person" },
        ],
      },
      {
        name: "Unrelated Person",
        contactEvidence: [
          { vectorType: "email", value: "other@example.com", personName: "Other", scope: "person" },
        ],
      },
    ]);
    const values = contacts.map((c) => c.value).sort();
    expect(values).toContain("helen@example.com");
    expect(values).toContain("https://linkedin.com/in/helen-vargas");
    expect(values).not.toContain("other@example.com");
    // Org shell email on a different candidate without personName match is not pulled.
    expect(values).not.toContain("info@vargas.example");
  });
});
