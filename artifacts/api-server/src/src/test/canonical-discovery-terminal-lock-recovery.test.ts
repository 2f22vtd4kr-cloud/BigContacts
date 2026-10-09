import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("canonical discovery terminal lock recovery", () => {
  it("releases only durable-terminal stale owners before launching replacement work", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/src/routes/research/canonical-case-discovery.ts"),
      "utf8",
    );
    const existingLane = source.indexOf('const existingJobId = await getActiveJobStrict("case-bureau-discovery");');
    const atlasLane = source.indexOf('const activeAtlasJobId = await getActiveJobStrict("atlas-run");');
    const createJob = source.indexOf('jobId = await createJob("case-bureau-discovery");');
    const claimAtlas = source.indexOf('atlasClaimed = await claimCanonicalJob("atlas-run", jobId!);');

    expect(existingLane).toBeGreaterThanOrEqual(0);
    expect(atlasLane).toBeGreaterThan(existingLane);
    expect(createJob).toBeGreaterThan(atlasLane);
    expect(claimAtlas).toBeGreaterThan(createJob);

    const laneCheck = source.slice(existingLane, atlasLane);
    expect(laneCheck).toContain('existing.status === "done"');
    expect(laneCheck).toContain('existing.status === "failed"');
    expect(laneCheck).toContain('existing.status === "cancelled"');
    expect(laneCheck).toContain('clearActiveJobIfOwned("case-bureau-discovery", existingJobId)');
    expect(laneCheck).toContain("no durable job state; refusing to replace it");
    expect(laneCheck).toContain("refusing to supersede a non-terminal or unknown job");

    const atlasCheck = source.slice(atlasLane, createJob);
    expect(atlasCheck).toContain('activeAtlasJob.status === "done"');
    expect(atlasCheck).toContain('activeAtlasJob.status === "failed"');
    expect(atlasCheck).toContain('activeAtlasJob.status === "cancelled"');
    expect(atlasCheck).toContain('releaseCanonicalJob("atlas-run", activeAtlasJobId)');
    expect(atlasCheck).toContain('const remainingOwner = await getActiveJob("atlas-run");');
    expect(atlasCheck).toContain("could not be cleared safely; refusing a new discovery launch");
  });
});
