import { describe, expect, it } from "vitest";
import { emitModelPromptAudit } from "./model-prompt-audit";

const input = {
  provider: "groq",
  role: "groq_investigator" as const,
  model: "openai/gpt-oss-120b",
  attempt: 2,
  jobId: "job-1",
  caseId: 4,
  requestBody: {
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: "PRIVATE_SYSTEM_PROMPT_SENTINEL and schema instructions." },
      { role: "user", content: "PRIVATE_TARGET_SENTINEL source passage and contact person@example.org +1 (415) 555-0100." },
    ],
    include_reasoning: false,
    max_completion_tokens: 1024,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "apex_action",
        strict: true,
        schema: {
          type: "object",
          properties: { action: { type: "string" }, query: { type: ["string", "null"] } },
          required: ["action", "query"],
          additionalProperties: false,
        },
      },
    },
    tools: [
      { type: "function", function: { name: "safe_search", description: "PRIVATE_TOOL_DESCRIPTION_SENTINEL", parameters: { type: "object", properties: { query: { type: "string" } } } } },
    ],
    authorization: "PRIVATE_CREDENTIAL_SENTINEL",
  },
};

describe("model prompt audit", () => {
  it("is disabled unless explicitly enabled in development or test", () => {
    const writes: Array<{ path: string; contents: string }> = [];
    const write = (path: string, contents: string) => writes.push({ path, contents });

    expect(emitModelPromptAudit(input, {
      NODE_ENV: "development",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, write)).toBeNull();
    expect(emitModelPromptAudit(input, {
      NODE_ENV: "production",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, write)).toBeNull();
    expect(emitModelPromptAudit(input, {
      NODE_ENV: "preview",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, write)).toBeNull();
    expect(writes).toHaveLength(0);
  });

  it("records bounded request shape and sizing without serializing prompt or tool content", () => {
    const writes: Array<{ path: string; contents: string }> = [];
    const requestId = emitModelPromptAudit(input, {
      NODE_ENV: "development",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, (path, contents) => writes.push({ path, contents }));

    expect(requestId).toBeTruthy();
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toBe("/tmp/audit.md");
    const captured = writes[0]?.contents ?? "";
    for (const privateMarker of [
      "PRIVATE_SYSTEM_PROMPT_SENTINEL",
      "PRIVATE_TARGET_SENTINEL",
      "PRIVATE_TOOL_DESCRIPTION_SENTINEL",
      "person@example.org",
      "415) 555-0100",
      "PRIVATE_CREDENTIAL_SENTINEL",
      "source passage",
    ]) expect(captured).not.toContain(privateMarker);

    expect(captured).toContain('"messageCount": 2');
    expect(captured).toContain('"contentKind": "text"');
    expect(captured).toContain('"schemaName": "apex_action"');
    expect(captured).toContain('"schemaPropertyCount": 2');
    expect(captured).toContain('"requiredFieldCount": 2');
    expect(captured).toContain('"functionName": "safe_search"');
    expect(captured).toContain('"parameterCount": 1');
    expect(captured).toContain('"include_reasoning": false');
    expect(captured).toContain('"max_completion_tokens": 1024');
    expect(captured).not.toContain('"authorization"');
  });

  it("caps message and tool details rather than serializing unbounded collections", () => {
    const requestBody = {
      ...input.requestBody,
      messages: Array.from({ length: 18 }, () => ({ role: "user", content: "PRIVATE_LONG_MESSAGE_SENTINEL" })),
      tools: Array.from({ length: 18 }, (_, index) => ({ type: "function", function: { name: "tool_" + index, description: "PRIVATE_TOOL_SENTINEL" } })),
    };
    const writes: string[] = [];
    emitModelPromptAudit({ ...input, requestBody }, {
      NODE_ENV: "test",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, (_path, contents) => writes.push(contents));

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain('"messagesTruncated": true');
    expect(writes[0]).toContain('"toolsTruncated": true');
    expect(writes[0]).toContain('"messageCount": 18');
    expect(writes[0]).toContain('"toolCount": 18');
    expect(writes[0]).not.toContain("PRIVATE_LONG_MESSAGE_SENTINEL");
    expect(writes[0]).not.toContain("PRIVATE_TOOL_SENTINEL");
  });

  it("requires an audit destination even when prompt capture is enabled", () => {
    const writes: string[] = [];
    expect(emitModelPromptAudit(input, {
      NODE_ENV: "test",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
    }, (_path, contents) => writes.push(contents))).toBeNull();
    expect(writes).toHaveLength(0);
  });
});
