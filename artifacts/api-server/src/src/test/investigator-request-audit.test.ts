import { describe, expect, it } from "vitest";
import {
  buildInvestigatorProviderRequestAuditRecord,
  emitInvestigatorProviderRequestAudit,
  isInvestigatorProviderRequestAuditEnabled,
} from "../lib/investigator-request-audit";

function requestInput() {
  return {
    model: "openai/gpt-oss-120b",
    cognitiveTask: "identity_resolution",
    attempt: 2,
    jobId: "job-123",
    caseId: 7,
    requestBody: {
      model: "openai/gpt-oss-120b",
      response_format: { type: "json_schema", json_schema: { name: "action", strict: true, schema: { type: "object" } } },
      messages: [
        { role: "system", content: "PRIVATE_SYSTEM_PROMPT_MARKER find Alice Example" },
        { role: "user", content: "CONTACT_MARKER alice@example.com SOURCE_MARKER https://example.org/profile?access_token=TOP_SECRET_TOKEN THOUGHT_MARKER secret reasoning" },
      ],
      internal_notes: "PRIVATE_NOTES_MARKER",
    },
  };
}

describe("opt-in Investigator request-shape audit", () => {
  it("fails closed unless the opt-in is true in a development or test environment", () => {
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "test" })).toBe(false);
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "production", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" })).toBe(false);
    expect(isInvestigatorProviderRequestAuditEnabled({ APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" })).toBe(false);
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "staging", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" })).toBe(false);
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "preview", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" })).toBe(false);
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "development", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" })).toBe(true);
    expect(isInvestigatorProviderRequestAuditEnabled({ NODE_ENV: "test", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" })).toBe(true);
  });

  it("records request shape without emitting messages, prompts, contacts, sources, notes, or reasoning", () => {
    const record = buildInvestigatorProviderRequestAuditRecord(requestInput());
    const serialized = JSON.stringify(record);
    for (const sensitive of [
      "PRIVATE_SYSTEM_PROMPT_MARKER",
      "CONTACT_MARKER",
      "alice@example.com",
      "SOURCE_MARKER",
      "example.org/profile",
      "TOP_SECRET_TOKEN",
      "THOUGHT_MARKER",
      "secret reasoning",
      "PRIVATE_NOTES_MARKER",
    ]) {
      expect(serialized).not.toContain(sensitive);
    }
    expect(record).not.toHaveProperty("requestBody");
    expect(record).toHaveProperty("requestSummary");
    const summary = record.requestSummary as {
      requestKeys: string[];
      messageCount: number;
      messages: Array<{ role: string; contentKind: string; contentChars: number | null; itemCount: number | null }>;
      responseFormat: { type: string; hasSchema: boolean; strict: boolean | null } | null;
    };
    expect(summary.requestKeys).toContain("messages");
    expect(summary.requestKeys).toContain("response_format");
    expect(summary.requestKeys).not.toContain("internal_notes");
    expect(summary.messageCount).toBe(2);
    expect(summary.messages).toEqual([
      { role: "system", contentKind: "text", contentChars: "PRIVATE_SYSTEM_PROMPT_MARKER find Alice Example".length, itemCount: null },
      { role: "user", contentKind: "text", contentChars: "CONTACT_MARKER alice@example.com SOURCE_MARKER https://example.org/profile?access_token=TOP_SECRET_TOKEN THOUGHT_MARKER secret reasoning".length, itemCount: null },
    ]);
    expect(summary.responseFormat).toEqual({ type: "json_schema", hasSchema: true, strict: true });
  });

  it("emits exactly one metadata-only record when enabled, and no record in unsafe environments", () => {
    const lines: string[] = [];
    const input = requestInput();
    expect(emitInvestigatorProviderRequestAudit(input, { NODE_ENV: "development" }, (line) => lines.push(line))).toBe(false);
    expect(lines).toHaveLength(0);
    expect(emitInvestigatorProviderRequestAudit(input, { NODE_ENV: "staging", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" }, (line) => lines.push(line))).toBe(false);
    expect(lines).toHaveLength(0);
    expect(emitInvestigatorProviderRequestAudit(input, { NODE_ENV: "development", APEX_CAPTURE_INVESTIGATOR_REQUESTS: "true" }, (line) => lines.push(line))).toBe(true);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("[atlas_investigator_provider_request]");
    expect(lines[0]).not.toContain("alice@example.com");
    expect(lines[0]).not.toContain("TOP_SECRET_TOKEN");
  });
});
