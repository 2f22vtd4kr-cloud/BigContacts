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
  });
});
