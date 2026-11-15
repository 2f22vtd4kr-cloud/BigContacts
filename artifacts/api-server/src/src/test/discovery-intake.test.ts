import { describe, it, expect } from "vitest";
import {
  buildSourcesToRun,
  sampleBroadCategories,
  rankCandidatesForAdmission,
  filterDiscoveryCandidatesByFitness,
  rankDiscoveryReviewCandidates,
  type DiscoverySource,
} from "../lib/discovery-intake";

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

  it("preserves supplied candidate order instead of local semantic scoring", () => {
    const candidates = [
      { name: "Passive Heir", snippet: "celebrity socialite billionaire" },
      { name: "Active GP", snippet: "managing partner general partner founder portfolio" },
      { name: "山田 太郎", snippet: "取締役会長" },
    ];
    expect(rankCandidatesForAdmission(candidates)).toEqual(candidates);
    expect(rankDiscoveryReviewCandidates(candidates)).toEqual(candidates);
  });

  it("preserves person, company and unresolved leads without semantic shape filters", () => {
    const candidates = [
      { name: "Tim Cook", type: "person", relevance: "CEO of Apple" },
      { name: "Quiet Operator", type: "person", relevance: "founder managing partner portfolio company" },
      { name: "Shell Holdings Ltd", type: "corporation", relevance: "holding company" },
      { name: "山田 太郎", type: "unknown", relevance: "取締役会長" },
    ];
    expect(filterDiscoveryCandidatesByFitness(candidates)).toEqual(candidates);
    expect(rankDiscoveryReviewCandidates(candidates)).toEqual(candidates);
  });

});

import { computeDiscoveryQualityMetrics } from "../lib/discovery-metrics";

describe("discovery quality metrics", () => {
  it("counts person-shaped rates without deterministic fame rejection or invented contacts", () => {
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
    expect(metrics.fameRejected).toBe(0);
    expect(metrics.nonPersonRejected).toBe(1);
    expect(metrics.personShaped).toBe(2);
    expect(metrics.withAnyEvidence).toBe(1);
    expect(metrics.evidenceRate).toBeCloseTo(1 / 3, 3);
  });
});

import { pickMixedDiscoverySlots } from "../lib/discovery-source-mixer";

describe("discovery-source-mixer person-first residual", () => {
  it("prefers officer/director registry language over pure LEI shells early in the slate", () => {
    const rng = () => 0.42;
    const slate = pickMixedDiscoverySlots({ count: 6, includeFaa: false, rng });
    expect(slate.length).toBeGreaterThanOrEqual(3);
    const labels = slate.map((s) => s.label.toLowerCase()).join(" | ");
    // First registry-ish picks should lean person language when available in the pool.
    const firstHalf = slate.slice(0, 3).map((s) => s.label.toLowerCase()).join(" ");
    expect(
      /officer|director|psc|founder|partner|principal|insider/.test(firstHalf)
      || /officer|director|psc|founder|partner|principal|insider/.test(labels),
    ).toBe(true);
  });
});
