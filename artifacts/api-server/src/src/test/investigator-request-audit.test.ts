import { describe, expect, it } from "vitest";
import {
  buildInvestigatorProviderRequestAuditRecord,
  emitInvestigatorProviderRequestAudit,
  isInvestigatorProviderRequestAuditEnabled,
  redactModelThoughtFieldsForAudit,
} from "../lib/investigator-request-audit";

describe("opt-in Investigator request audit", () => {
  it("is disabled by default and cannot be enabled in production", () => {
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "production", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" })).toBe(false);
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "development", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" })).toBe(true);
  });
  it("redacts thought strings in the audit copy but preserves other fields", () => {
    const text = '{"thought":"private reasoning","query":"public query","thought":null}';
    const redacted = redactModelThoughtFieldsForAudit(text);
    expect(redacted).not.toContain("private reasoning");
    expect(redacted).toContain('"thought":"[REDACTED_MODEL_THOUGHT]"');
    expect(redacted).toContain('"query":"public query"');
    expect(redacted).toContain('"thought":null');
  });
  it("records outbound model/schema/request metadata without credentials or response body", () => {
    const record = buildInvestigatorProviderRequestAuditRecord({
      model: "openai/gpt-oss-120b",
      cognitiveTask: "identity_resolution",
      attempt: 2,
      jobId: "job-123",
      caseId: 7,
      requestBody: {
        model: "openai/gpt-oss-120b",
        response_format: { type: "json_schema", json_schema: { name: "action", strict: true } },
        messages: [{ role: "user", content: '{"thought":"secret","query":"public query"}' }],
      },
    });
    expect(record.event).toBe("atlas_investigator_provider_request");
    expect(record.requestBody).toEqual(expect.objectContaining({ model: "openai/gpt-oss-120b" }));
    expect(JSON.stringify(record)).toContain("public query");
    expect(JSON.stringify(record)).not.toContain('"secret"');
    expect(JSON.stringify(record)).not.toContain("Authorization");
    expect(JSON.stringify(record)).not.toContain("responseBody");
  });
  it("is silent by default and emits exactly one sanitized record when enabled", () => {
    const lines: string[] = [];
    const input = { model: "openai/gpt-oss-120b", cognitiveTask: "identity_resolution", attempt: 1, requestBody: { messages: [{ role: "user", content: '{"thought":"do not log"}' }] } };
    expect(emitInvestigatorProviderRequestAudit(input, { NODE_ENV: "development" }, line => lines.push(line))).toBe(false);
    expect(lines).toHaveLength(0);
    expect(emitInvestigatorProviderRequestAudit(input, { NODE_ENV: "development", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" }, line => lines.push(line))).toBe(true);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("[atlas_investigator_provider_request]");
    expect(lines[0]).not.toContain("do not log");
  });
});
