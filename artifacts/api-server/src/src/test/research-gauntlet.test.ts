import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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

type GroundTruth = {
  schemaVersion: string;
  status: string;
  cases: Array<{
    caseId: string;
    groundTruthStatus: string;
    reviewStatus: string;
    identities: Array<{ id: string }>;
    claims: Array<{
      id: string;
      subjectIdentityId: string;
      predicate: string;
      object: string;
      requiredSourceUrls: string[];
      requiredSourceClasses: string[];
    }>;
    contacts: unknown[];
    contradictions: unknown[];
    sources: Array<{ url: string; sourceClass: string }>;
  }>;
};

type ScoringOutput = {
  aggregate: Record<string, number | null>;
  bySystem: Record<string, { trials: number; systemFailures: number; metrics: Record<string, number | null> }>;
  cases: Array<Record<string, unknown>>;
};

const officialUrl = "https://official.example/profile";
const registryUrl = "https://registry.example/person";
const scorerPath = fileURLToPath(new URL("../../../../../scripts/evaluate-research-gauntlet.mjs", import.meta.url));

function groundTruth(): GroundTruth {
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
        { url: officialUrl, sourceClass: "official", independentReview: true },
        { url: registryUrl, sourceClass: "registry", independentReview: true },
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

function evaluateWithProductionScorer(
  run: RunArtifact,
  mutateGroundTruth?: (doc: GroundTruth) => void,
): ScoringOutput {
  const directory = mkdtempSync(join(tmpdir(), "apex-gauntlet-scorer-"));
  const gtFile = join(directory, "ground-truth.json");
  const runsFile = join(directory, "runs.json");
  try {
    const gt = groundTruth();
    mutateGroundTruth?.(gt);
    writeFileSync(gtFile, JSON.stringify(gt));
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

describe("production research Gauntlet scorer", () => {
  it("requires successful observations at the actual observed URL to support identities and claims", () => {
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

  it("uses the observed destination rather than the requested URL for source coverage", () => {
    const run = validRun();
    run.observations[0].observedUrl = "https://redirected.invalid/final";
    run.observations[1].observedUrl = "https://redirected.invalid/other";

    const output = evaluateWithProductionScorer(run);
    expect(output.cases[0].claimSupportCorrectness).toBe(0);
    expect(output.cases[0].unsupportedClaimRate).toBe(1);
  });

  it("fails closed when ground-truth claims omit required source URLs", () => {
    const output = evaluateWithProductionScorer(validRun(), (doc) => {
      doc.cases[0].claims[0].requiredSourceUrls = [];
    });
    expect(output.cases[0].claimSupportCorrectness).toBe(0);
    expect(output.cases[0].unsupportedClaimRate).toBe(1);
  });

  it("does not accept required URLs that are absent from the independently reviewed source registry", () => {
    const run = validRun();
    const unreviewedOfficial = "https://unreviewed.example/profile";
    const unreviewedRegistry = "https://unreviewed.example/person";
    run.observations[0].url = unreviewedOfficial;
    run.observations[0].observedUrl = unreviewedOfficial;
    run.observations[1].url = unreviewedRegistry;
    run.observations[1].observedUrl = unreviewedRegistry;

    const output = evaluateWithProductionScorer(run, (doc) => {
      doc.cases[0].claims[0].requiredSourceUrls = [unreviewedOfficial, unreviewedRegistry];
      doc.cases[0].claims[0].requiredSourceClasses = [];
    });
    expect(output.cases[0].claimSupportCorrectness).toBe(0);
    expect(output.cases[0].unsupportedClaimRate).toBe(1);
  });

  it("does not score system_failure as a research miss", () => {
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
