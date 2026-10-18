import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { emitModelPromptAudit } from "./model-prompt-audit";

describe("private model audit destinations", () => {
  it("allows an ignored .local/audits destination without enabling visible workspace files", () => {
    const workspaceRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
    const apiPackageCwd = resolve(workspaceRoot, "artifacts/api-server");
    const writes: Array<{ path: string; contents: string }> = [];
    const requestId = emitModelPromptAudit({
      provider: "groq",
      role: "groq_investigator",
      model: "test-model",
      jobId: "job-test",
      caseId: 1,
      requestBody: {
        model: "test-model",
        messages: [{ role: "user", content: "safe test payload" }],
      },
    }, {
      NODE_ENV: "development",
      APEX_CAPTURE_MODEL_PROMPTS: "true",
      APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA: "false",
      APEX_MODEL_AUDIT_ALLOW_VISIBLE_FILE: "false",
      APEX_MODEL_AUDIT_FILE: ".local/audits/APEX_ATLAS_MODEL_AUDIT_TEST.jsonl",
    }, (path, contents) => writes.push({ path, contents }), apiPackageCwd);

    expect(requestId).toBeTruthy();
    expect(writes).toHaveLength(1);
    expect(writes[0]?.path).toBe(resolve(workspaceRoot, ".local/audits/APEX_ATLAS_MODEL_AUDIT_TEST.jsonl"));
  });
});
