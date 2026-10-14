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
      { role: "system", content: "Exact system prompt." },
      { role: "user", content: "Exact user prompt with `code`." },
    ],
    include_reasoning: false,
    max_completion_tokens: 1024,
    authorization: "must not be captured",
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
    expect(writes).toHaveLength(0);
  });

  it("captures prompt text while excluding non-allowlisted request fields", () => {
    const writes: Array<{ path: string; contents: string }> = [];
    const requestId = emitModelPromptAudit(input, {
      NODE_ENV: "development",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, (path, contents) => writes.push({ path, contents }));

    expect(requestId).toBeTruthy();
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toBe("/tmp/audit.md");
    expect(writes[0]?.contents).toContain("Exact system prompt.");
    expect(writes[0]?.contents).toContain("Exact user prompt with `code`.");
    expect(writes[0]?.contents).toContain('"include_reasoning": false');
    expect(writes[0]?.contents).not.toContain("must not be captured");
    expect(writes[0]?.contents.match(/`{3}json/)).toBeTruthy();
  });

  it("redacts email addresses and labeled or international phone numbers", () => {
    const writes: Array<{ path: string; contents: string }> = [];
    const contactInput = {
      ...input,
      requestBody: {
        ...input.requestBody,
        messages: [
          { role: "user", content: "Lead email: person@example.org; phone: +1 (415) 555-0100; direct: +442079460958." },
        ],
      },
    };

    emitModelPromptAudit(contactInput, {
      NODE_ENV: "development",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_FILE: "/tmp/audit.md",
    }, (path, contents) => writes.push({ path, contents }));

    expect(writes).toHaveLength(1);
    expect(writes[0]?.contents).toContain("[REDACTED_EMAIL]");
    expect(writes[0]?.contents).toContain("[REDACTED_PHONE]");
    expect(writes[0]?.contents).not.toContain("person@example.org");
    expect(writes[0]?.contents).not.toContain("415) 555-0100");
    expect(writes[0]?.contents).not.toContain("+442079460958");
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
