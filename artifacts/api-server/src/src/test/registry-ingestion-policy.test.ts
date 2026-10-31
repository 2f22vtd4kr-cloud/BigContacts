import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { deriveRegistryIngestionAssessment, filterRegistryIngestionBatchRows, registryPersonCandidateNames } from "../lib/registry-ingestion-policy";

function requireRegistryIngestionSource(): string {
  return fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/western-hnwi-ingestion.ts"), "utf8");
}

describe("public-registry evidence remains a low-confidence lead", () => {
  it("does not turn a filing/officer record into a strong person prior or reachability claim", () => {
    expect(deriveRegistryIngestionAssessment("PersonCandidate", new Date("2026-10-09T07:30:00.000Z"))).toEqual({
      prior: 0.15,
      hasRecentActivity: false,
      hasGatekeeperConnection: false,
      recentActivityDays: 400,
      proximityScore: 3,
      confidence: "LOW",
      lastObservedAt: "2026-10-09T07:30:00.000Z",
      reviewOnly: true,
      wealthStatus: "unverified",
    });
  });

  it("defensively neutralizes legacy HNWI/Gatekeeper labels in registry ingestion", () => {
    for (const type of ["HNWI", "Gatekeeper"]) {
      const assessment = deriveRegistryIngestionAssessment(type);
      expect(assessment.prior).toBe(0.15);
      expect(assessment.hasRecentActivity).toBe(false);
      expect(assessment.proximityScore).toBe(3);
      expect(assessment.confidence).toBe("LOW");
      expect(assessment.reviewOnly).toBe(true);
      expect(assessment.wealthStatus).toBe("unverified");
    }
  });

  it("raw metadata cannot override registry assessment fields", () => {
    const source = requireRegistryIngestionSource();
    expect(source).toContain("...person.rawMetadata");
    expect(source).toContain("proximityScore: registryAssessment.proximityScore");
    expect(source).toContain("confidence: registryAssessment.confidence");
    expect(source).toContain("lastObservedAt: registryAssessment.lastObservedAt");
    expect(source.indexOf("...person.rawMetadata")).toBeLessThan(source.indexOf("proximityScore: registryAssessment.proximityScore"));
    expect(source.match(/proximityScore: registryAssessment\.proximityScore/g)).toHaveLength(2);
    expect(source.match(/confidence: registryAssessment\.confidence/g)).toHaveLength(2);
    expect(source.match(/lastVerified: undefined/g)).toHaveLength(2);
    expect(source).toContain("hasGatekeeperConnection: registryAssessment.hasGatekeeperConnection");
    expect(source).toContain("contactMethod = \"Board-role registry lead — direct contact path not observed\"");
  });

  it("a legacy gatekeeper classification is not a gatekeeper connection", () => {
    const assessment = deriveRegistryIngestionAssessment("Gatekeeper");
    expect(assessment.hasGatekeeperConnection).toBe(false);
    expect(assessment.prior).toBe(0.15);
    expect(assessment.proximityScore).toBe(3);
    expect(assessment.reviewOnly).toBe(true);
    expect(assessment.wealthStatus).toBe("unverified");
  });

  it("keeps the historical correction limited to pending, explicitly sourced legacy rows", () => {
    const migration = fs.readFileSync(
      path.resolve(process.cwd(), "../../lib/db/migrations/004-registry-candidate-truth.sql"),
      "utf8",
    );
    expect(migration).toContain("COALESCE(parsed_metadata->>'needsEnrichment', 'false') <> 'true'");
    expect(migration).toContain("candidate.estimated_net_worth IS NOT NULL");
    expect(migration).toContain("source_name = 'companies-house-officers'");
    expect(migration).toContain("source_name = 'sec-edgar'");
    expect(migration).toContain("parsed_metadata->>'admission' = 'investigator-explicit-promotion'");
    expect(migration).toContain("normalized_form LIKE 'SC13D%'");
    expect(migration).toContain("normalized_form LIKE 'SC13G%'");
    expect(migration).toContain("normalized_form LIKE 'DEF14A%'");
  });

  it("does not treat a registry fetch as recent underlying activity", () => {
    const assessment = deriveRegistryIngestionAssessment("Corporation");
    expect(assessment.hasRecentActivity).toBe(false);
    expect(assessment.recentActivityDays).toBe(400);
    expect(assessment.lastObservedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(assessment.wealthStatus).toBe("not_assessed");
  });
});


describe("registry ingestion batch preserves normalized person candidates", () => {
  it("collects PersonCandidate names after registry types are normalized", () => {
    const rows = [
      { name: "Ada Lovelace", type: "PersonCandidate" },
      { name: "Grace Hopper", type: "HNWI" },
      { name: "Katherine Johnson", type: "Gatekeeper" },
      { name: "Northstar Holdings", type: "Corporation" },
      { name: "Northstar Family Trust", type: "Trust" },
      { name: null, type: "PersonCandidate" },
    ];

    expect(registryPersonCandidateNames(rows)).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
      "Katherine Johnson",
    ]);
  });

  it("retains validated PersonCandidate rows in broad registry seeding without promoting them", () => {
    const rows = [
      { id: 1, name: "Ada Lovelace", type: "PersonCandidate" },
      { id: 2, name: "Unvalidated Candidate", type: "PersonCandidate" },
      { id: 3, name: "Northstar Holdings", type: "Corporation" },
      { id: 4, name: "Northstar Family Trust", type: "Trust" },
    ];
    const retained = filterRegistryIngestionBatchRows(
      rows,
      new Set(["Ada Lovelace"]),
      false,
    );

    expect(retained).toEqual([
      rows[0],
      rows[2],
      rows[3],
    ]);
    expect(retained[0]?.type).toBe("PersonCandidate");
    expect(deriveRegistryIngestionAssessment(retained[0]!.type)).toMatchObject({
      reviewOnly: true,
      wealthStatus: "unverified",
      confidence: "LOW",
      hasGatekeeperConnection: false,
    });
  });

  it("preserves person-only admission while keeping company/trust rows out of that budget", () => {
    const rows = [
      { name: "Ada Lovelace", type: "PersonCandidate" },
      { name: "Northstar Holdings", type: "Corporation" },
      { name: "Northstar Family Trust", type: "Trust" },
    ];

    expect(filterRegistryIngestionBatchRows(rows, new Set(["Ada Lovelace"]), true))
      .toEqual([rows[0]]);
  });

  it("wires normalized candidate collection and the tested filter into the real batch flush", () => {
    const source = requireRegistryIngestionSource();
    expect(source).toContain("registryPersonCandidateNames(entityBatch)");
    expect(source).toContain("filterRegistryIngestionBatchRows(entityBatch, validNames, preferPersons)");
  });
});
