import { describe, expect, it, vi } from "vitest";

// Keep this focused unit test away from DB guards, job polling, and live research.
vi.mock("@workspace/db", () => ({
  db: {},
  contactEvidenceTable: {},
  entitiesTable: {},
  researchCaseEventsTable: {},
  researchCasesTable: {},
}));
vi.mock("../lib/agentic-web-research", () => ({ runAgenticWebResearch: vi.fn() }));
vi.mock("../lib/job-queue", () => ({ getJobStrict: vi.fn() }));
vi.mock("../lib/bureau-live-log", () => ({ publishBureauEvent: vi.fn() }));
vi.mock("../lib/dig-span", () => ({
  digSpanStatusFromExecutionStatus: vi.fn(),
  publishDigSpan: vi.fn(),
  spanFromLiveStep: vi.fn(),
}));
vi.mock("../lib/canonical-job-lock", () => ({ isCanonicalJobOwner: vi.fn() }));

import { buildEvidenceGraphs } from "../lib/target-contact-agent";
import { isClaimGradeObservationAction } from "../lib/bureau-contact-persist-strict";
import type { AgenticFinding, AgenticTrajectoryRecord } from "../lib/agentic-web-research";

const sourceUrl = "https://registry.example.org/company/123";
const value = "research@example.org";
const finding: AgenticFinding = {
  vectorType: "email",
  value,
  personName: null,
  role: null,
  scope: "organization",
  sourceUrls: [sourceUrl],
  note: "Email directly observed in a public source",
};

const claimGradeActions = [
  "visit",
  "browser_fetch",
  "registry_search",
  "domain_lookup",
  "harvest_domain",
  "footprint_email",
  "footprint_username_maigret",
  "footprint_username_sherlock",
  "footprint_spiderfoot",
] as const;

function observationRecord(action: string): AgenticTrajectoryRecord {
  return {
    turn: 1,
    model: "test-investigator",
    action,
    args: {},
    execution: "success",
    observation: `Public source record lists ${value}`,
    observedUrls: [sourceUrl],
    findings: [],
  };
}

describe("target contact evidence graph source-action parity", () => {
  it.each(claimGradeActions)(
    "builds a support graph for a grounded %s observation",
    (action) => {
      expect(isClaimGradeObservationAction(action)).toBe(true);

      const graphs = buildEvidenceGraphs(
        [finding],
        [observationRecord(action)],
        "run-evidence-graph-test",
      );

      expect(graphs).toHaveLength(1);
      expect(graphs[0]?.claims[0]?.object).toBe(value);
      expect(graphs[0]?.observations.map((observation) => observation.sourceUrl)).toEqual([sourceUrl]);
      expect(graphs[0]?.edges).toEqual([
        expect.objectContaining({
          from: graphs[0]?.claims[0]?.id,
          to: graphs[0]?.observations[0]?.id,
          kind: "supports",
        }),
      ]);
    },
  );

  it("does not treat a search-result action alone as claim-grade source observation", () => {
    expect(isClaimGradeObservationAction("web_search")).toBe(false);
    expect(buildEvidenceGraphs(
      [finding],
      [observationRecord("web_search")],
      "run-evidence-graph-test",
    )).toEqual([]);
  });
});
