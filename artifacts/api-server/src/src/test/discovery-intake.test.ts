import { describe, it, expect } from "vitest";
import {
  buildSourcesToRun,
  sampleBroadCategories,
  scoreApproachableCandidate,
  rankCandidatesForAdmission,
  filterDiscoveryCandidatesByFitness,
  rankDiscoveryReviewCandidates,
  type DiscoverySource,
} from "../lib/discovery-intake";
import { evaluateTargetFitness, shouldRejectTarget } from "../lib/target-fitness";

const SOURCES: DiscoverySource[] = [
  { kind: "broad", category: 1, label: "FO" },
  { kind: "broad", category: 2, label: "Lux" },
  { kind: "broad", category: 3, label: "SEC" },
  { kind: "broad", category: 4, label: "Phil" },
  { kind: "registry", label: "reg-1" },
  { kind: "registry", label: "reg-2" },
  { kind: "faa", label: "faa" },
];

describe("discovery-intake", () => {
  it("samples broad categories without fixed first-N bias when RNG is controlled", () => {
    let i = 0;
    const seq = [0.9, 0.1, 0.5, 0.2, 0.8];
    const random = () => seq[i++ % seq.length]!;
    const set = sampleBroadCategories(SOURCES, 2, random);
    expect(set.size).toBe(2);
    for (const c of set) expect([1, 2, 3, 4]).toContain(c);
  });

  it("buildSourcesToRun interleaves and respects broadCategories bound", () => {
    const random = () => 0.5;
    const out = buildSourcesToRun({
      sources: SOURCES,
      discoveryFirst: true,
      broadCategories: 2,
      includeFaa: false,
      random,
    });
    const broad = out.filter((s) => s.kind === "broad");
    const registry = out.filter((s) => s.kind === "registry");
    expect(broad.length).toBe(2);
    expect(registry.length).toBe(2);
    expect(out.some((s) => s.kind === "faa")).toBe(false);
  });

  it("includes FAA when enabled", () => {
    const out = buildSourcesToRun({
      sources: SOURCES,
      discoveryFirst: true,
      broadCategories: 1,
      includeFaa: true,
      random: () => 0.3,
    });
    expect(out.some((s) => s.kind === "faa")).toBe(true);
  });

  it("scores operators higher than trophy-only names", () => {
    const founder = scoreApproachableCandidate({
      name: "Jane Founder",
      snippet: "Co-founder and CEO of a growth equity firm; interview at summit",
    });
    const trophy = scoreApproachableCandidate({
      name: "Famous Heir",
      snippet: "Billionaire socialite and royalty figure; undisclosed owner",
    });
    expect(founder).toBeGreaterThan(trophy);
  });

  it("ranks candidates best-first for admission", () => {
    const ranked = rankCandidatesForAdmission([
      { name: "Passive Heir", snippet: "celebrity socialite billionaire" },
      { name: "Active GP", snippet: "managing partner general partner founder portfolio" },
    ]);
    expect(ranked[0]!.name).toBe("Active GP");
  });

  it("hard-rejects Cook-class fame-only names and scores them zero", () => {
    for (const name of ["Tim Cook", "Bernard Arnault", "Jensen Huang", "Warren Buffett"]) {
      const fit = evaluateTargetFitness({ name, personScoped: true });
      expect(shouldRejectTarget(fit)).toBe(true);
      expect(fit.fit).toBe("reject_fame_only");
      expect(scoreApproachableCandidate({ name, snippet: "CEO billionaire" })).toBe(0);
    }
  });

  it("drops fame-only from discovery review deck and ranks quiet principals first", () => {
    const filtered = filterDiscoveryCandidatesByFitness([
      { name: "Tim Cook", type: "person", relevance: "CEO of Apple" },
      { name: "Quiet Operator", type: "person", relevance: "founder managing partner portfolio company" },
      { name: "Shell Holdings Ltd", type: "corporation", relevance: "holding company" },
    ]);
    expect(filtered.some((c) => /tim cook/i.test(c.name))).toBe(false);
    expect(filtered.some((c) => /quiet operator/i.test(c.name))).toBe(true);
    expect(filtered.some((c) => /shell holdings/i.test(c.name))).toBe(true);
    const ranked = rankDiscoveryReviewCandidates(filtered);
    expect(ranked[0]!.name).toMatch(/quiet operator/i);
  });

  it("keeps quiet person-shaped officers above zero score", () => {
    const score = scoreApproachableCandidate({
      name: "Marta Ellison",
      snippet: "Managing director and founder of a regional family office; LinkedIn and team page",
    });
    expect(score).toBeGreaterThan(0.4);
  });
});

import { computeDiscoveryQualityMetrics } from "../lib/discovery-metrics";

describe("discovery quality metrics", () => {
  it("counts fame rejects and person-shaped rates without inventing contacts", () => {
    const metrics = computeDiscoveryQualityMetrics([
      { name: "Tim Cook", type: "person", relevance: "CEO" },
      {
        name: "Quiet Operator",
        type: "person",
        relevance: "founder managing partner",
        contactEvidence: [{ value: "ops@example.com" }],
      },
      { name: "Shell Holdings Ltd", type: "corporation", relevance: "holding company" },
    ]);
    expect(metrics.total).toBe(3);
    expect(metrics.fameRejected).toBe(1);
    expect(metrics.nonPersonRejected).toBe(1);
    expect(metrics.personShaped).toBe(1);
    expect(metrics.withAnyEvidence).toBe(1);
    expect(metrics.evidenceRate).toBeCloseTo(1 / 3, 3);
  });
});
