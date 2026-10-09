import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const storePath = path.resolve(process.cwd(), "src/lib/reactor-live-store.ts");

function readStore(): string {
  return fs.readFileSync(storePath, "utf8");
}

describe("Reactor live telemetry source boundary", () => {
  it("uses canonical active-job status and trace, never the retired status route", () => {
    const source = readStore();

    expect(source).toContain("/api/ingest/job/active/atlas-run");
    expect(source).toContain("/api/ingest/atlas-trace/");
    expect(source).not.toContain("/api/ingest/atlas-status");
    expect(source).toContain('import { readApiJson } from "./api-json"');
    expect(source).not.toContain("activeResponse.json()");
    expect(source).not.toContain("traceResponse.json()");
    expect(source).not.toContain("emit(EMPTY)");
    expect(source).toContain("function sameActivity(a: LiveActivity, b: LiveActivity): boolean");
    expect(source).toContain("a.inputSummary === b.inputSummary");
    expect(source).toContain("a.tool === b.tool");
    expect(source).toContain("sameOptionalStrings(a.sourceUrls, b.sourceUrls)");
  });
});
