import { describe, expect, it } from "vitest";
import { safeThrownErrorSummary } from "./provider-error-diagnostics";

describe("safe thrown-error summaries", () => {
  it("includes a bounded allowlisted JavaScript runtime preview", () => {
    const summary = safeThrownErrorSummary("Atlas failure", new Error("Cannot read properties of undefined (reading 'caseFile')"));
    expect(summary).toContain("runtime=Cannot read properties of undefined (reading 'caseFile')");
  });

  it("preserves nested SQLSTATE without exposing the underlying database message", () => {
    const cause = Object.assign(new Error("database detail contains private row data"), { code: "40P01" });
    const error = Object.assign(new Error("transaction aborted with a sensitive internal detail"), { cause });
    const summary = safeThrownErrorSummary("Atlas failure", error);
    expect(summary).toContain("code=40P01");
    expect(summary).not.toContain("private row data");
    expect(summary).not.toContain("sensitive internal detail");
  });

  it("never copies an arbitrary provider or database error message", () => {
    const summary = safeThrownErrorSummary("Atlas failure", new Error("provider response included a secret value"));
    expect(summary).not.toContain("secret value");
    expect(summary).toContain("digest=");
  });
});
