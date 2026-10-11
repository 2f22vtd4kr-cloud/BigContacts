import { describe, expect, it } from "vitest";
import {
  buildInvestigatorProviderRequestAuditRecord,
  emitInvestigatorProviderRequestAudit,
  isInvestigatorProviderRequestAuditEnabled,
  redactModelThoughtFieldsForAudit,
} from "./investigator-request-audit";

describe("opt-in Investigator request audit", () => {
  it("is disabled by default and cannot be enabled in production", () => {
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isInvestigatorProviderRequestAuditEnabled({
      NODE_ENV: "production",
      APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true",
    })).toBe(false);
    expect(isInvestigatorProviderRequestAuditEnabled({
      NODE_ENV: "development",
      APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true",
    })).toBe(true);
  });

  it("redacts thought string values in the audit copy but leaves other prompt fields", () => {
    const prompt = '{"thought":"private reasoning text","query":"public search query","thought":null}';
    const redacted = redactModelThoughtFieldsForAudit(prompt);
    expect(redacted).not.toContain("private reasoning text");
    expect(redacted).toContain('"thought":"[REDACTED_MODEL_THOUGHT]"');
    expect(redacted).toContain('"query":"public search query"');
    expect(redacted).toContain('"thought":null');
  });

  it("retains request model/schema/prompt metadata without credentials or response content", () => {
    const record = buildInvestigatorProviderRequestAuditRecord({
      model: "openai/gpt-oss-120b",
      cognitiveTask: "identity_resolution",
      attempt: 2,
      jobId: "job-123",
      caseId: 7,
      requestBody: {
        model: "openai/gpt-oss-120b",
        response_format: { type: "json_schema", json_schema: { name: "action", strict: true } },
        messages: [
          { role: "system", content: "Follow the action schema." },
          { role: "user", content: 'Current evidence {"thought":"secret","query":"public query"}' },
        ],
      },
    });
    expect(record.event).toBe("atlas_investigator_provider_request");
    expect(record.attempt).toBe(2);
    expect(record.requestBody).toEqual(expect.objectContaining({
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_schema", json_schema: { name: "action", strict: true } },
    }));
    const serialized = JSON.stringify(record);
    expect(serialized).toContain("public query");
    expect(serialized).not.toContain('"secret"');
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("responseBody");
  });

  it("writes nothing unless explicitly enabled and emits one sanitized record when enabled", () => {
    const lines: string[] = [];
    const input = {
      model: "openai/gpt-oss-120b",
      cognitiveTask: "identity_resolution",
      attempt: 1,
      requestBody: { messages: [{ role: "user", content: '{"thought":"must not be logged"}' }] },
    };
    expect(emitInvestigatorProviderRequestAudit(input, { NODE_ENV: "development" }, (line) => lines.push(line))).toBe(false);
    expect(lines).toHaveLength(0);
    expect(emitInvestigatorProviderRequestAudit(
      input,
      { NODE_ENV: "development", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" },
      (line) => lines.push(line),
    )).toBe(true);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("[atlas_investigator_provider_request]");
    expect(lines[0]).not.toContain("must not be logged");
  });
});
