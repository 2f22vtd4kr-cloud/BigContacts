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

  it("redacts percent-encoded sensitive keys in route-style OAuth fragments", () => {
    const urls = [
      "https://example.com/#/callback?access%5Ftoken=encoded-underscore-secret&state=keep",
      "https://example.com/#/callback?%61ccess_token=encoded-leading-secret&state=keep",
    ];
    for (const rawUrl of urls) {
      const safe = sanitizeUrlForEvidence(rawUrl);
      expect(safe).toContain("/callback");
      expect(safe).toContain("state=keep");
      expect(safe).toContain("REDACTED");
      expect(safe).not.toContain("encoded-underscore-secret");
      expect(safe).not.toContain("encoded-leading-secret");
    }
  });

  it("redacts URL secrets from Right-hand and Boss-facing prompt context", () => {
    const secret = "oversight-objective-secret";
    const prompt = buildTargetActRightHandPrompt({
      targetName: "Example",
      targetType: "person",
      objective: "Check this redirect https://example.com/callback?access_token=" + secret,
      sharedContext: "Prior observation https://example.com/profile?token=" + secret,
      currentAct: { action: "visit", observation: "Observed https://example.com/?api_key=" + secret },
      recentActs: [],
    });
    expect(prompt).not.toContain(secret);
    expect(prompt).toContain("OBJECTIVE:");
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/target-act-oversight.ts"), "utf8");
    expect(source).toContain("const safePromptObjective=sanitizeUrlsInText(input.objective)");
    expect(source).toContain("${safePromptObjective}");
    expect(source).toContain("return sanitizeObservableValue(oversight)");
    expect(source).toContain('const prompt=sanitizeUrlsInText(`${apexOrientationCompact("boss")}\\n');
    expect(source).toContain("JSON.stringify(sanitizeObservableValue(input.currentAct))");
    expect(source).toContain("JSON.stringify(sanitizeObservableValue(input.recentActs))");
  });

  it("sanitizes target and discovery case projections before durable persistence", () => {
    const targetSource = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/target-act-oversight.ts"), "utf8");
    const discoverySource = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/bureau-agentic-pass.ts"), "utf8");
    expect(targetSource).toContain("caseFile:JSON.stringify(sanitizeObservableValue(caseFile))");
    expect(discoverySource).toContain("caseFile:JSON.stringify(sanitizeObservableValue({...current,evidenceState:durableEvidenceState");
    expect(discoverySource).toContain("JSON.stringify(sanitizeObservableValue({jobId:input.jobId??null,runId:input.runId");
  });

  it("sanitizes the immutable act event and control decision before persistence", () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), "src/src/lib/target-act-oversight.ts"), "utf8");
    expect(source).toContain("const safeAct=sanitizeObservableValue(act)");
    expect(source).toContain("const safeOversight=sanitizeObservableValue(oversight)");
    expect(source).toContain("actDigest(safeAct,runId,turn)");
    expect(source).toContain("buildActEvidenceGraphs(caseId,safeAct,eventId,runId)");
    expect(source).toContain("act:compactAct(safeAct),oversight:safeOversight");
    expect(source).toContain("legacyControlDigest");
  });
});
