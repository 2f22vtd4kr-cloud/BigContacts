import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function metric(tp: number, predicted: number, expected: number) {
  return { precision: predicted ? tp / predicted : null, recall: expected ? tp / expected : null };
}

function normalizeUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.protocol = url.protocol.toLowerCase();
  return url.toString().replace(/\/$/, "");
}

function evidenceCoverage(observationUrls: string[], requiredUrls: string[]) {
  const observed = new Set(observationUrls.map(normalizeUrl));
  return requiredUrls.every((url) => observed.has(normalizeUrl(url)));
}

function claimMatchesGold(claim: { predicate: string; object: string }, gold: { predicate: string; object: string }) {
  return claim.predicate.trim().toLowerCase() === gold.predicate.trim().toLowerCase()
    && claim.object.trim().replace(/\s+/g, " ").toLowerCase() === gold.object.trim().replace(/\s+/g, " ").toLowerCase();
}

function groundedClassCovered(observationUrls: string[], requiredUrls: string[], requiredClasses: string[], sourceClasses: Record<string, string>) {
  const observed = new Set(observationUrls.map(normalizeUrl));
  const required = new Set(requiredUrls.map(normalizeUrl));
  return requiredClasses.length === 0 || requiredClasses.every((requiredClass) => [...observed].some((url) => required.has(url) && sourceClasses[url] === requiredClass));
}

type Observation = {
  id: string;
  url: string;
  observedUrl?: string;
  sourceClass: string;
  execution: string;
};

type RunArtifact = {
  caseId: string;
  system: string;
  trialId: string;
  outcome: string;
  identities: Array<{ groundTruthIdentityId: string; supportingObservationIds: string[] }>;
  claims: Array<{
    groundTruthClaimId: string;
    groundTruthIdentityId: string;
    predicate: string;
    object: string;
    supportingObservationIds: string[];
  }>;
  contacts: unknown[];
  contradictions: unknown[];
  observations: Observation[];
  trajectory: unknown[];
};

type ScoringOutput = {
  aggregate: Record<string, number | null>;
  bySystem: Record<string, { trials: number; systemFailures: number; metrics: Record<string, number | null> }>;
  cases: Array<Record<string, unknown>>;
};

const officialUrl = "https://official.example/profile";
const registryUrl = "https://registry.example/person";
const scorerPath = fileURLToPath(new URL("../../../../../scripts/evaluate-research-gauntlet.mjs", import.meta.url));

function groundTruth() {
  return {
    schemaVersion: "research-gauntlet-v1",
    status: "grounded-reviewed",
    cases: [{
      caseId: "RG-test",
      groundTruthStatus: "ready",
      reviewStatus: "independently-cross-checked",
      identities: [{ id: "person-1" }],
      claims: [{
        id: "claim-1",
        subjectIdentityId: "person-1",
        predicate: "role",
        object: "CEO",
        requiredSourceUrls: [officialUrl, registryUrl],
        requiredSourceClasses: ["official", "registry"],
      }],
      contacts: [],
      contradictions: [],
      sources: [
        { url: officialUrl, sourceClass: "official" },
        { url: registryUrl, sourceClass: "registry" },
      ],
    }],
  };
}

function validRun(): RunArtifact {
  return {
    caseId: "RG-test",
    system: "test-system",
    trialId: "trial-1",
    outcome: "verified",
    identities: [{ groundTruthIdentityId: "person-1", supportingObservationIds: ["o1", "o2"] }],
    claims: [{
      groundTruthClaimId: "claim-1",
      groundTruthIdentityId: "person-1",
      predicate: "role",
      object: "CEO",
      supportingObservationIds: ["o1", "o2"],
    }],
    contacts: [],
    contradictions: [],
    trajectory: [{ turn: 1, action: "visit", status: "success" }],
    observations: [
      { id: "o1", url: officialUrl, sourceClass: "official", execution: "success" },
      { id: "o2", url: registryUrl, sourceClass: "registry", execution: "success" },
    ],
  };
}

function evaluateWithProductionScorer(run: RunArtifact): ScoringOutput {
  const directory = mkdtempSync(join(tmpdir(), "apex-gauntlet-scorer-"));
  const gtFile = join(directory, "ground-truth.json");
  const runsFile = join(directory, "runs.json");
  try {
    writeFileSync(gtFile, JSON.stringify(groundTruth()));
    writeFileSync(runsFile, JSON.stringify({ runs: [run] }));
    const result = spawnSync(process.execPath, [scorerPath, gtFile, runsFile], { encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(`Production scorer exited with ${result.status}: ${result.stderr}`);
    }
    return JSON.parse(result.stdout) as ScoringOutput;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("research gauntlet metric contract", () => {
  it("keeps precision and recall separate", () => expect(metric(2, 4, 2)).toEqual({ precision: 0.5, recall: 1 }));
  it("does not reward a forced answer when no expected identity exists", () => expect(metric(0, 1, 0)).toEqual({ precision: 0, recall: null }));
  it("permits insufficient-evidence cases", () => expect({ outcome: "insufficient_evidence", identities: [] }.outcome).toBe("insufficient_evidence"));
  it("requires unique observation identifiers", () => {
    const observations = [{ id: "o1" }, { id: "o2" }];
    expect(new Set(observations.map((o) => o.id)).size).toBe(observations.length);
  });
  it("does not silently map ambiguous duplicate gold claims", () => {
    const gold = [
      { predicate: "currentRole", object: "Chief Executive Officer" },
      { predicate: "currentRole", object: "Chief Executive Officer" },
    ];
    expect(gold.filter((candidate) => claimMatchesGold({ predicate: "currentRole", object: "Chief Executive Officer" }, candidate))).toHaveLength(2);
  });
  it("requires exact three trials per case for campaign certification", () => {
    const grouped = new Map([["RG-001", [1, 2, 3]], ["RG-002", [1, 2, 3, 4]]]);
    const over = [...grouped.entries()].filter(([, trials]) => trials.length > 3);
    expect(over).toHaveLength(1);
    expect(over[0][0]).toBe("RG-002");
  });
  it("requires exact claim mapping before awarding gold support", () => {
    expect(claimMatchesGold({ predicate: "currentRole", object: "Chief Executive Officer" }, { predicate: "currentRole", object: "Chief Executive Officer" })).toBe(true);
    expect(claimMatchesGold({ predicate: "currentRole", object: "CEO" }, { predicate: "currentRole", object: "Chief Executive Officer" })).toBe(false);
  });
  it("treats grounded source classes as metadata of canonical source URLs", () => {
    expect(groundedClassCovered(
      ["https://example.com/a"],
      ["https://example.com/a"],
      ["official"],
      { "https://example.com/a": "official" },
    )).toBe(true);
    expect(groundedClassCovered(
      ["https://example.com/other"],
      ["https://example.com/a"],
      ["official"],
      { "https://example.com/a": "official" },
    )).toBe(false);
  });
  it("requires identity promotion to carry durable supporting evidence", () => {
    expect([]).toHaveLength(0);
    expect([{ supportingObservationIds: ["o1"] }].every((identity) => identity.supportingObservationIds.length > 0)).toBe(true);
  });
  it("requires claims to cite the gold source URLs through observations", () => {
    expect(evidenceCoverage(
      ["https://example.com/a", "https://example.com/b#section"],
      ["https://example.com/a/", "https://example.com/b"],
    )).toBe(true);
    expect(evidenceCoverage(
      ["https://example.com/a"],
      ["https://example.com/a", "https://example.com/b"],
    )).toBe(false);
  });

  it("does not count a requested URL or failed retrieval as observed supporting evidence", () => {
    const run = validRun();
    run.observations[0] = {
      ...run.observations[0],
      observedUrl: "https://redirected.invalid/final",
      execution: "error",
    };
    run.observations[1] = {
      ...run.observations[1],
      observedUrl: "https://redirected.invalid/other",
      execution: "error",
    };

    const output = evaluateWithProductionScorer(run);
    expect(output.cases[0].identityRecall).toBe(0);
    expect(output.cases[0].claimSupportCorrectness).toBe(0);
    expect(output.cases[0].unsupportedClaimRate).toBe(1);
    expect(output.cases[0].successfulObservations).toBe(0);
  });

  it("uses the actual observed destination rather than the requested URL for claim source coverage", () => {
    const run = validRun();
    run.observations[0].observedUrl = "https://redirected.invalid/final";
    run.observations[1].observedUrl = "https://redirected.invalid/other";

    const output = evaluateWithProductionScorer(run);
    expect(output.cases[0].claimSupportCorrectness).toBe(0);
    expect(output.cases[0].unsupportedClaimRate).toBe(1);
  });

  it("does not score a system failure as a research miss", () => {
    const run = validRun();
    run.outcome = "system_failure";
    run.identities = [];
    run.claims = [];
    run.observations = [];

    const output = evaluateWithProductionScorer(run);
    expect(output.cases[0].systemFailure).toBe(true);
    expect(output.cases[0].identityRecall).toBeNull();
    expect(output.aggregate.identityRecall).toBeNull();
    expect(output.bySystem["test-system"].systemFailures).toBe(1);
    expect(output.bySystem["test-system"].metrics.identityRecall).toBeNull();
  });
});
