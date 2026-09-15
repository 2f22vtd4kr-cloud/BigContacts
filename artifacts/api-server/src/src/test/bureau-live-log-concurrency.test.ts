import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(process.cwd(), "src/lib/bureau-live-log.ts");

describe("Bureau live mirror concurrency contract", () => {
  it("keeps suppression and rate-limit state scoped per Atlas job", () => {
    const source = fs.readFileSync(sourcePath, "utf8");
    expect(source).toContain("const mirrorWindows = new Map<string, MirrorWindow>();");
    expect(source).toContain("const lastBossTitleByJob = new Map<string, string>();");
    expect(source).toContain("const window = mirrorState(jobId);");
    expect(source).not.toContain("let mirrorWindowStart = 0;");
    expect(source).not.toContain("let mirrorWindowCount = 0;");
    expect(source).not.toContain("let lastBossTitleMirror = \"\";");
  });
});
