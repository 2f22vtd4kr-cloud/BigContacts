import { describe, it, expect } from "vitest";
import {
  buildSourcesToRun,
  sampleBroadCategories,
  scoreApproachableCandidate,
  rankCandidatesForAdmission,
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
});
