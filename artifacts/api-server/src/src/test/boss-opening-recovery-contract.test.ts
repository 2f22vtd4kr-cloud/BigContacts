import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

function repoRoot(): string {
  let current = path.resolve(process.cwd());
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current;
    current = path.dirname(current);
  }
  throw new Error("Unable to locate Apex repository root from test working directory.");
}

describe("Gemini Boss opening recovery contract", () => {
  const root = repoRoot();
  const caseBureau = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/case-bureau.ts"), "utf8");
  const canonical = fs.readFileSync(path.join(root, "artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts"), "utf8");

  it("has a bounded same-role recovery path", () => {
    expect(caseBureau).toContain("buildBossOpeningRecoveryPrompt");
    expect(caseBureau).toContain("deadlineMs: 30_000");
    expect(caseBureau).toContain("requestTimeoutMs: 10_000");
    expect(caseBureau).toContain("maxModels: 2");
    expect(caseBureau).toContain("resolveGeminiBossModel(selection.keyName)");
  });

  it("never assigns Groq/Mistral directly from the recovery code", () => {
    const recoveryStart = caseBureau.indexOf("// Bounded same-role recovery:");
    const recoveryEnd = caseBureau.indexOf('return {\n      status: "unavailable"', recoveryStart);
    const recovery = caseBureau.slice(recoveryStart, recoveryEnd < 0 ? recoveryStart + 6000 : recoveryEnd);
    expect(recovery).toContain("recovered.investigatorLlm");
    expect(recovery).not.toContain('investigatorLlm: "groq"');
    expect(recovery).not.toContain('investigatorLlm: "mistral"');
  });

  it("reports recovery exhaustion rather than claiming no fallback was attempted", () => {
    expect(canonical).toContain("after bounded same-role recovery");
    expect(canonical).not.toContain("no fallback was attempted");
  });
});
