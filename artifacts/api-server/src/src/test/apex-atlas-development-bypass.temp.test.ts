import { afterEach, expect, it, vi } from "vitest";

vi.mock("../lib/case-bureau", async () => {
  const actual = await vi.importActual<typeof import("../lib/case-bureau")>("../lib/case-bureau");
  return {
    ...actual,
    runGeminiBossDiscovery: vi.fn(async () => ({
      status: "completed" as const,
      model: "development-test-boss",
      investigatorLlm: "groq" as const,
      report: "Development-only control-plane bypass; downstream research remains canonical.",
      candidates: [],
      citations: [],
      nextDirections: ["Start model-owned discovery with the selected Investigator."],
      uncertainties: ["Opening Gemini Boss reasoning was substituted for this development test."],
      error: null,
    })),
  };
});

vi.mock("../lib/gemini-right-hand-reasoning", async () => {
  const actual = await vi.importActual<typeof import("../lib/gemini-right-hand-reasoning")>("../lib/gemini-right-hand-reasoning");
  return {
    ...actual,
    runGeminiRightHandFreeJson: vi.fn(async () => ({
      status: "completed" as const,
      model: "development-test-right-hand",
      raw: JSON.stringify({
        decision: "continue",
        reason: "Development-only control-plane bypass; review completed without selecting tools or inventing evidence.",
        focusLanes: [],
        confidence: 0.75,
      }),
      error: null,
    })),
  };
});

import { runCanonicalAtlasPipeline } from "../lib/canonical-atlas-discovery";
import { clearActiveJobIfOwned, createJob, getJob, setActiveJob, updateJob } from "../lib/job-queue";
import { connectPermanentRedis } from "../lib/redis";

afterEach(() => {
  vi.restoreAllMocks();
});

it("runs the real canonical downstream pipeline with only Boss and Right-hand substituted", async () => {
  await connectPermanentRedis();
  const jobId = await createJob("atlas-run");
  await setActiveJob("atlas-run", jobId);
  await updateJob(jobId, {
    status: "running",
    progress: 0,
    total: 4,
    atlasPhase: 0,
    atlasPhaseTotal: 4,
    message: "Development-only control-plane bypass test started.",
  });

  try {
    const result = await runCanonicalAtlasPipeline(jobId, {
      targetCount: 3,
      targetTimeoutMs: 420_000,
    });
    const finalJob = await getJob(jobId);

    console.log(JSON.stringify({
      jobId,
      pipelineResult: result,
      finalJob,
      substitutedRoles: ["gemini_boss", "gemini_right_hand"],
      canonicalRolesKeptReal: ["groq_or_mistral_investigator", "web_tools", "evidence_persistence", "card_projection"],
    }));

    expect(finalJob?.status).toBe("done");
    expect(finalJob?.outcome).toBe("complete");
  } finally {
    await clearActiveJobIfOwned("atlas-run", jobId).catch(() => undefined);
  }
}, 30 * 60 * 1000);