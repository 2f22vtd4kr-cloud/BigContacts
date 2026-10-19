import { describe, expect, it } from "vitest";
import { normalizeRuntimeBuildProvenance } from "./runtime-build-provenance";

describe("runtime build provenance", () => {
  it("preserves a valid source revision, worktree state, and build timestamp", () => {
    expect(normalizeRuntimeBuildProvenance({
      revision: "A".repeat(40),
      dirty: "clean",
      builtAt: "2026-10-19T05:00:00.000Z",
    })).toEqual({
      buildRevision: "a".repeat(40),
      buildDirty: "clean",
      buildTimestamp: "2026-10-19T05:00:00.000Z",
    });
  });

  it("preserves dirty builds instead of attributing them only to HEAD", () => {
    expect(normalizeRuntimeBuildProvenance({
      revision: "b".repeat(40),
      dirty: "dirty",
      builtAt: "2026-10-19T05:00:00Z",
    }).buildDirty).toBe("dirty");
  });

  it("labels absent or malformed metadata as unknown rather than inventing provenance", () => {
    expect(normalizeRuntimeBuildProvenance({
      revision: "local-branch",
      dirty: "maybe",
      builtAt: "not-a-date",
    })).toEqual({
      buildRevision: "unknown",
      buildDirty: "unknown",
      buildTimestamp: "unknown",
    });
  });
});
