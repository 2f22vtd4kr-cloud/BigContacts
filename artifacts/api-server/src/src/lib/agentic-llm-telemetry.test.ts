import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { recordAgenticLlmAttempt, resetAgenticLlmTelemetry } from "./agentic-llm-telemetry";

afterEach(() => {
  vi.restoreAllMocks();
  resetAgenticLlmTelemetry();
});

describe("Investigator LLM telemetry privacy", () => {
  it("attributes each physical attempt without logging target names", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    recordAgenticLlmAttempt({
      provider: "groq",
      role: "investigator",
      capability: "groq-investigator-2",
      jobId: "job-123",
      caseId: 456,
      targetDigest: "0123456789abcdef",
      iteration: 7,
      decisionId: "fedcba9876543210",
      cognitiveTask: "ownership_research",
      model: "openai/gpt-oss-120b",
      promptChars: 120,
      status: 200,
      success: true,
      retryIndex: 1,
    });
    const line = String(output.mock.calls[0]?.[0]);
    const record = JSON.parse(line);
    expect(record).toMatchObject({
      role: "investigator",
      capability: "groq-investigator-2",
      jobId: "job-123",
      caseId: 456,
      targetDigest: "0123456789abcdef",
      iteration: 7,
      decisionId: "fedcba9876543210",
      cognitiveTask: "ownership_research",
    });
    expect(line).not.toContain("Alice Example");
  });

  it("instruments all three model roles with job, case, target-set and decision context", () => {
    const investigator = readFileSync(new URL("./agentic-web-research-core.ts", import.meta.url), "utf8");
    const boss = readFileSync(new URL("./groq-boss.ts", import.meta.url), "utf8");
    const rightHand = readFileSync(new URL("./groq-right-hand-reasoning.ts", import.meta.url), "utf8");
    const control = readFileSync(new URL("./atlas-control-decision.ts", import.meta.url), "utf8");
    expect(investigator).toContain("targetDigest: normalizedTarget");
    expect(investigator).toContain("priorTurnOffset + i + 1");
    expect(boss).toContain('role: "boss" as const');
    expect(boss).toContain("...telemetryContext");
    expect(rightHand).toContain('role: "right_hand" as const');
    expect(rightHand).toContain("...telemetryContext");
    expect(control).toContain("targetDigest, iteration: input.controlTurn, decisionId");
  });

  it("preserves allowlisted generic provider diagnostics", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    recordAgenticLlmAttempt({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      promptChars: 120,
      status: 400,
      success: false,
      retryIndex: 1,
      providerErrorCode: "json_validate_failed",
      providerErrorType: "tokens",
    });
    const record = JSON.parse(String(output.mock.calls[0]?.[0]));
    expect(record.providerErrorCode).toBe("json_validate_failed");
    expect(record.providerErrorType).toBe("tokens");
  });

  it("hashes provider-controlled diagnostic text instead of writing it to logs", () => {
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    const secretCode = "alice@example.com Authorization: Bearer PRIVATE_PROVIDER_DETAIL";
    const secretType = "contact notes and confidential research context";
    const longUntrustedLabel = "provider-private-field-".repeat(500);
    recordAgenticLlmAttempt({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      promptChars: 2400,
      status: 400,
      success: false,
      retryIndex: 1,
      providerErrorCode: secretCode,
      providerErrorType: secretType,
      reason: longUntrustedLabel,
    });
    const line = String(output.mock.calls[0]?.[0]);
    const record = JSON.parse(line);
    for (const secret of ["alice@example.com", "PRIVATE_PROVIDER_DETAIL", "confidential research context", "provider-private-field-"]) {
      expect(line).not.toContain(secret);
    }
    expect(record.providerErrorCode).toMatch(/^opaque:[a-f0-9]{16}$/);
    expect(record.providerErrorType).toMatch(/^opaque:[a-f0-9]{16}$/);
    expect(record.reason).toMatch(/^opaque:[a-f0-9]{16}$/);
    expect(line.length).toBeLessThan(2000);
  });
});
