import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const routePath = path.resolve(process.cwd(), "src/src/routes/contact-research.ts");

describe("retired contact-research control plane", () => {
  it("quarantines POST, GET status, and cancel instead of exposing legacy job state", () => {
    const source = fs.readFileSync(routePath, "utf8");
    expect(source).toContain('router.post("/ingest/contact-research"');
    expect(source).toContain('res.status(410)');
    expect(source).toContain('router.get("/ingest/contact-research/status"');
    expect(source).toContain('router.post("/ingest/contact-research/cancel"');
    expect(source).not.toContain("getActiveJob(CONTACT_RESEARCH_JOB_TYPE)");
    expect(source).not.toContain("getLatestJob(CONTACT_RESEARCH_JOB_TYPE)");
  });
});
