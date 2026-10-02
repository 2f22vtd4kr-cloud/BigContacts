import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Mistral Right-hand structured-output contract", () => {
  it("uses the canonical Mistral chat-completions boundary with strict JSON schema", () => {
    const source = readFileSync(resolve(process.cwd(), "src/src/lib/mistral-right-hand-reasoning.ts"), "utf8");
    expect(source).toContain("https://api.mistral.ai/v1/chat/completions");
    expect(source).toContain('type:"json_schema"');
    expect(source).toContain("strict:true");
    expect(source).not.toContain("generativelanguage.googleapis.com");
  });
});
