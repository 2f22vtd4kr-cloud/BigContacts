import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeRuntimeBuildProvenance } from "./runtime-build-provenance";

describe("runtime build provenance", () => {
  it("prefers imported source provenance over unrelated starter-project Git metadata", () => {
    const buildSource = readFileSync(resolve(process.cwd(), "build.mjs"), "utf8");
    const bootSource = readFileSync(resolve(process.cwd(), "../../scripts/replit-boot.sh"), "utf8");
    expect(buildSource).toContain("APEX_SOURCE_REVISION");
    expect(buildSource).toContain('["APEX_SOURCE_REVISION", true]');
    expect(buildSource).toContain(".apex-source-revision");
    expect(buildSource).toContain('"remote", "get-url", "origin"');
    expect(buildSource).toContain("Never stamp an unrelated starter SHA as Apex");
    expect(bootSource).toContain("const expected=process.env.APEX_SOURCE_REVISION");
  });

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
