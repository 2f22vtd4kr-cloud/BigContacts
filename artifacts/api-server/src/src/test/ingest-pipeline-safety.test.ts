import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeSource = readFileSync(new URL("../routes/ingest-pipeline.ts", import.meta.url), "utf8");
const launchRoute = routeSource.slice(
  routeSource.indexOf('router.post("/ingest/compute-embeddings"'),
  routeSource.indexOf('router.get("/ingest/semantic-engine-status"'),
);
const releaseRoute = routeSource.slice(
  routeSource.indexOf('router.delete("/ingest/compute-embeddings-lock"'),
  routeSource.indexOf('router.get("/ingest/semantic-engine-status"'),
);

describe("semantic embedding job lifecycle safety", () => {
  it("uses rebuild only for cache semantics and never as an active-lock bypass", () => {
    expect(launchRoute).toContain("const rebuild = body.rebuild === true");
    expect(launchRoute).not.toContain("body.force");
    expect(launchRoute).toContain("getActiveJobStrict(\"compute-embeddings\")");
    expect(launchRoute).toContain("classifyActiveJobLaneStatus(existingJob.status)");
    expect(launchRoute).toContain('laneStatus === "active"');
    expect(launchRoute).toContain('laneStatus === "unknown"');
    expect(launchRoute).toContain('clearActiveJobIfMatches("compute-embeddings", existing)');
  });

  it("does not label a running job cancelled or clear its lock", () => {
    expect(releaseRoute).toContain('laneStatus === "active"');
    expect(releaseRoute).toContain("res.status(409)");
    expect(releaseRoute).toContain("releases terminal locks only");
    expect(releaseRoute).not.toContain('updateJob(jobId, { status: "cancelled"');
    expect(releaseRoute).not.toContain('clearActiveJobIfOwned("compute-embeddings", jobId)');
  });

  it("returns the accepted job before model warmup and performs work under the claimed id", () => {
    expect(launchRoute.indexOf('res.status(202).json')).toBeLessThan(launchRoute.indexOf("loadEmbeddingsFromRedis"));
    expect(launchRoute).toContain("ownsActiveJob(\"compute-embeddings\", claimedJobId)");
    expect(launchRoute).toContain("clearActiveJobIfOwned(\"compute-embeddings\", claimedJobId)");
  });
});
