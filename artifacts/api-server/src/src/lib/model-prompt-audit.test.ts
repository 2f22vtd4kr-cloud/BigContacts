import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { emitModelPromptAudit, emitModelPromptAuditResponse } from "./model-prompt-audit";

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
       { role: "user", content: "PRIVATE_TARGET_SENTINEL source passage and contact person@example.org +1 (415) 555-0100. Test secret gsk_123456789012345678901234 and https://example.test/?api_token=private_token_value&x-api-key=query_secret_value. Also AIzaSyDUMMYKEYSTRING0123456789abcdefgh and GROQ_API_KEY=named_api_secret_value." },
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
  it("does not capture test-runner telemetry from a development environment without the separate test opt-in", () => {
    const writes: Array<{ path: string; contents: string }> = [];
    const testRunnerEnvironment = {
      NODE_ENV: "development",
      VITEST: "true",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    };

    expect(emitModelPromptAudit(input, testRunnerEnvironment, (path, contents) => writes.push({ path, contents }))).toBeNull();
    expect(writes).toHaveLength(0);

    const requestId = emitModelPromptAudit(input, {
      ...testRunnerEnvironment,
      APEX_CAPTURE_MODEL_PROMPTS_IN_TEST: "true",
    }, (path, contents) => writes.push({ path, contents }));
    expect(requestId).toBeTruthy();
    expect(writes).toHaveLength(1);
  });

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
    expect(emitModelPromptAudit(input, {
      NODE_ENV: "test",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, write)).toBeNull();
    expect(writes).toHaveLength(0);
  });

  it("records exact prompt, schema, and tool content while redacting credential values", () => {
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
    for (const observablePromptContent of [
      "PRIVATE_SYSTEM_PROMPT_SENTINEL",
      "PRIVATE_TARGET_SENTINEL",
      "PRIVATE_TOOL_DESCRIPTION_SENTINEL",
      "source passage",
    ]) expect(captured).toContain(observablePromptContent);
    for (const privateContactValue of ["person@example.org", "+1 (415) 555-0100", "415) 555-0100"]) {
      expect(captured).not.toContain(privateContactValue);
    }
    expect(captured).toContain("[REDACTED_EMAIL]");
    expect(captured).toContain("[REDACTED_PHONE]");
    for (const secretValue of [
      "PRIVATE_CREDENTIAL_SENTINEL",
      "gsk_123456789012345678901234",
      "private_token_value",
      "query_secret_value",
      "AIzaSyDUMMYKEYSTRING0123456789abcdefgh",
      "named_api_secret_value",
    ]) expect(captured).not.toContain(secretValue);
    expect(captured).toContain("[REDACTED_SECRET]");

    expect(captured).toContain('"jobId": "job-1"');
    expect(captured).toContain('"caseId": 4');
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

  it("bounds very large message collections while preserving their count and truncation markers", () => {
    const requestBody = {
      ...input.requestBody,
      messages: Array.from({ length: 140 }, () => ({ role: "user", content: "PRIVATE_LONG_MESSAGE_SENTINEL" })),
      tools: Array.from({ length: 18 }, (_, index) => ({ type: "function", function: { name: "tool_" + index, description: "PRIVATE_TOOL_SENTINEL" } })),
    };
    const writes: string[] = [];
    emitModelPromptAudit({ ...input, requestBody }, {
      NODE_ENV: "test",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_CAPTURE_MODEL_PROMPTS_IN_TEST: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, (_path, contents) => writes.push(contents));

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain('"messagesTruncated": true');
    expect(writes[0]).toContain('"messageSummaryTruncated": true');
    expect(writes[0]).toContain('"toolsTruncated": true');
    expect(writes[0]).toContain('"messageCount": 140');
    expect(writes[0]).toContain('"toolCount": 18');
    expect(writes[0]).toContain("PRIVATE_LONG_MESSAGE_SENTINEL");
    expect(writes[0]).toContain("PRIVATE_TOOL_SENTINEL");
  });

  it("records visible structured model output but omits separate provider reasoning fields", () => {
    const writes: Array<{ path: string; contents: string }> = [];
    emitModelPromptAuditResponse({
      requestId: "request-visible-output",
      provider: "groq",
      role: "groq_investigator",
      model: "openai/gpt-oss-120b",
      httpStatus: 200,
      responseBody: JSON.stringify({
        id: "completion-1",
        model: "openai/gpt-oss-120b",
        usage: { prompt_tokens: 12, completion_tokens: 8 },
        choices: [{
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: '{"action":"safe_search","query":"public company registry","thought":"PRIVATE_MODEL_THOUGHT_SENTINEL"}',
            reasoning_content: "PRIVATE_PROVIDER_REASONING_SENTINEL",
            analysis: "PRIVATE_ANALYSIS_SENTINEL",
          },
        }],
      }),
    }, {
      NODE_ENV: "test",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_CAPTURE_MODEL_PROMPTS_IN_TEST: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, (path, contents) => writes.push({ path, contents }));

    expect(writes).toHaveLength(1);
    expect(writes[0]?.contents).toContain("safe_search");
    expect(writes[0]?.contents).toContain("public company registry");
    expect(writes[0]?.contents).not.toContain("PRIVATE_MODEL_THOUGHT_SENTINEL");
    expect(writes[0]?.contents).not.toContain("PRIVATE_PROVIDER_REASONING_SENTINEL");
    expect(writes[0]?.contents).not.toContain("PRIVATE_ANALYSIS_SENTINEL");
  });


  it("redacts contact fields from visible structured findings without hiding action diagnostics", () => {
    const writes: Array<{ path: string; contents: string }> = [];
    emitModelPromptAuditResponse({
      requestId: "request-contact-redaction",
      provider: "groq",
      role: "groq_investigator",
      model: "openai/gpt-oss-120b",
      httpStatus: 200,
      responseBody: JSON.stringify({
        choices: [{
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: JSON.stringify({
              action: "done",
              findings: [
                { vectorType: "email", value: "jane.doe@example.org", personName: "Jane Doe", role: "Owner" },
                { vectorType: "phone", value: "4155550100", personName: "Jane Doe", role: "Owner" },
              ],
            }),
          },
        }],
      }),
    }, {
      NODE_ENV: "test",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_CAPTURE_MODEL_PROMPTS_IN_TEST: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, (path, contents) => writes.push({ path, contents }));

    expect(writes).toHaveLength(1);
    const captured = writes[0]?.contents ?? "";
    expect(captured).toContain("done");
    expect(captured).toContain("[REDACTED_CONTACT_DATA]");
    expect(captured).not.toContain("jane.doe@example.org");
    expect(captured).not.toContain("4155550100");
    expect(captured).toContain("Jane Doe");
  });

  it("resolves workspace-relative audit paths from the repository root when the API cwd is nested", () => {
    const workspaceRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
    const apiPackageCwd = resolve(workspaceRoot, "artifacts/api-server");
    const writes: Array<{ path: string; contents: string }> = [];

    const requestId = emitModelPromptAudit(input, {
      NODE_ENV: "development",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "private-audits/APEX_ATLAS_SEQUENTIAL_AUDIT_TEST.md",
    }, (path, contents) => writes.push({ path, contents }), apiPackageCwd);

    expect(requestId).toBeTruthy();
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toBe(resolve(workspaceRoot, "private-audits/APEX_ATLAS_SEQUENTIAL_AUDIT_TEST.md"));
    expect(writes[0]?.path).not.toBe(resolve(apiPackageCwd, "private-audits/APEX_ATLAS_SEQUENTIAL_AUDIT_TEST.md"));
  });

  it("refuses raw prompt capture to tracked paths inside the workspace", () => {
    const workspaceRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
    const apiPackageCwd = resolve(workspaceRoot, "artifacts/api-server");
    const writes: Array<{ path: string; contents: string }> = [];
    const requestId = emitModelPromptAudit(input, {
      NODE_ENV: "development",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA: "true",
      APEX_MODEL_AUDIT_FILE: "audits/APEX_ATLAS_SEQUENTIAL_AUDIT_TRACKED_PATH_REJECTION_TEST.md",
    }, (path, contents) => writes.push({ path, contents }), apiPackageCwd);
    expect(requestId).toBeNull();
    expect(writes).toHaveLength(0);
  });

  it("refuses raw prompt capture to visible workspace paths even when the legacy opt-in is set", () => {
    const workspaceRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
    const apiPackageCwd = resolve(workspaceRoot, "artifacts/api-server");
    const writes: Array<{ path: string; contents: string }> = [];
    const requestId = emitModelPromptAudit(input, {
      NODE_ENV: "development",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA: "false",
      APEX_MODEL_AUDIT_ALLOW_VISIBLE_FILE: "true",
      APEX_MODEL_AUDIT_FILE: "audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-18_NEW_PROJECT_IMPORT.md",
    }, (path, contents) => writes.push({ path, contents }), apiPackageCwd);

    expect(requestId).toBeNull();
    expect(writes).toHaveLength(0);
  });

  it("preserves visible unstructured model output for diagnosis with explicit contact-data opt-in", () => {
    const writes: Array<{ path: string; contents: string }> = [];
    emitModelPromptAuditResponse({
      requestId: "request-unstructured-visible-output",
      provider: "groq",
      role: "groq_investigator",
      model: "openai/gpt-oss-120b",
      httpStatus: 200,
      responseBody: JSON.stringify({
        id: "completion-unstructured",
        model: "openai/gpt-oss-120b",
        choices: [{
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: "The JSON action was malformed. Public contact: jane.doe@example.org, phone +1 (415) 555-0100. Key=gsk_123456789012345678901234.",
            reasoning_content: "PRIVATE_PROVIDER_REASONING_SENTINEL",
          },
        }],
      }),
    }, {
      NODE_ENV: "development",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, (path, contents) => writes.push({ path, contents }));

    expect(writes).toHaveLength(1);
    expect(writes[0]?.contents).toContain('"format": "unstructured"');
    expect(writes[0]?.contents).toContain("The JSON action was malformed.");
    expect(writes[0]?.contents).toContain("jane.doe@example.org");
    expect(writes[0]?.contents).toContain("+1 (415) 555-0100");
    expect(writes[0]?.contents).not.toContain("gsk_123456789012345678901234");
    expect(writes[0]?.contents).not.toContain("PRIVATE_PROVIDER_REASONING_SENTINEL");
  });

  it("does not persist provider failed_generation contents that may contain partial model output", () => {
    const writes: string[] = [];
    emitModelPromptAuditResponse({
      requestId: "request-failed-generation-redaction",
      provider: "groq",
      role: "groq_right_hand",
      model: "openai/gpt-oss-120b",
      httpStatus: 400,
      responseBody: JSON.stringify({
        error: {
          message: "Failed to generate JSON. Please adjust your prompt.",
          type: "invalid_request_error",
          code: "json_validate_failed",
          failed_generation: "max completion tokens reached before generating a valid document PRIVATE_FAILED_GENERATION_SENTINEL",
        },
      }),
    }, {
      NODE_ENV: "development",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, (_path, contents) => writes.push(contents));

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain('"failedGenerationPresent": true');
    expect(writes[0]).toContain('"failedGenerationBudgetExhausted": true');
    expect(writes[0]).not.toContain("PRIVATE_FAILED_GENERATION_SENTINEL");
    expect(writes[0]).not.toContain('"failed_generation"');
  });

  it("includes a bounded sanitized excerpt when the outer provider response is not JSON", () => {
    const writes: string[] = [];
    emitModelPromptAuditResponse({
      requestId: "request-invalid-provider-json",
      provider: "groq",
      role: "groq_investigator",
      model: "openai/gpt-oss-120b",
      httpStatus: 502,
      responseBody: "upstream gateway error; GROQ_API_KEY=gsk_123456789012345678901234",
    }, {
      NODE_ENV: "development",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, (_path, contents) => writes.push(contents));

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("upstream gateway error");
    expect(writes[0]).not.toContain("gsk_123456789012345678901234");
    expect(writes[0]).toContain('"responseExcerptTruncated": false');
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
