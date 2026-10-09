import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildTargetActRightHandPrompt, compactOversightAct } from "../lib/target-act-oversight";
import { sanitizeUrlForEvidence } from "../lib/url-privacy";

describe("target act URL privacy boundary", () => {
  it("sanitizes URL secrets from the Boss-facing act projection", () => {
    const secret = "boss-projection-secret";
    const rawUrl = "https://alice:password@example.com/profile?access_token=" + secret + "#/callback?X-Amz-Signature=fragment-secret";
    const compact = compactOversightAct({
      turn: 1,
      model: "groq:investigator",
      action: "visit",
      args: { url: rawUrl },
      execution: "success",
      observation: "PAGE " + rawUrl + "\nA redirect referenced https://example.com/callback?token=" + secret,
      observedUrls: [rawUrl],
      findings: [{
        vectorType: "email",
        value: "alice@example.com",
        personName: "Alice Example",
        role: "Director",
        scope: "candidate",
        sourceUrls: [rawUrl],
        note: "Public profile: " + rawUrl,
      }],
    });
    const serialized = JSON.stringify(compact);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain("fragment-secret");
    expect(serialized).not.toContain("alice:password");
    expect(serialized).toContain("Alice Example");
    expect(serialized).toContain("REDACTED");
  });

  it("redacts URL secrets from Right-hand and Boss-facing prompt context", () => {
    const secret = "oversight-objective-secret";
    const prompt = buildTargetActRightHandPrompt({
      targetName: "Example",
      targetType: "person",
      objective: "Check this redirect https://example.com/callback?access_token=" + secret,
      sharedContext: "Prior observation https://example.com/profile?token=" + secret,
      currentAct: { action: "visit", observation: "Observed https://example.com/?api_key=" + secret },
      recentActs: [{ action: "visit", observation: "Previously saw https://example.com/?token=" + secret }],
    });
    expect(prompt).not.toContain(secret);
    expect(prompt).toContain("OBJECTIVE:");
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/target-act-oversight.ts"), "utf8");
    expect(source).toContain('const prompt=sanitizeUrlsInText(`${apexOrientationCompact("boss")}');
    expect(source).toContain("return sanitizeObservableValue(oversight)");
  });

  it("sanitizes immutable act events and control decisions before persistence", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/target-act-oversight.ts"), "utf8");
    expect(source).toContain("const safeAct=sanitizeObservableValue(act)");
    expect(source).toContain("const safeOversight=sanitizeObservableValue(oversight)");
    expect(source).toContain("actDigest(safeAct,runId,turn)");
    expect(source).toContain("buildActEvidenceGraphs(caseId,safeAct,eventId,runId)");
    expect(source).toContain("act:compactAct(safeAct),oversight:safeOversight");
    expect(source).toContain("legacyControlDigest");
  });

  it("keeps public source identity when sanitizing a URL", () => {
    const safe = sanitizeUrlForEvidence("https://example.com/profile?access_token=secret&ref=public");
    expect(safe).toContain("example.com/profile");
    expect(safe).toContain("ref=public");
    expect(safe).not.toContain("secret");
  });
});
