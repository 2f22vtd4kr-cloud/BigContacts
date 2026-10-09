import { describe, expect, it } from "vitest";
import { buildActEvidenceGraphs } from "../lib/target-act-oversight";

describe("target act evidence graph provenance", () => {
  it("rejects HTTP-only retrieved pages as claim-grade evidence", () => {
    const act = {
      turn: 1, model: "test", action: "react_episode", args: {}, execution: "success", observation: "profile page",
      observedUrls: ["http://example.com/team/jane"],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder", scope: "candidate", sourceUrls: ["http://example.com/team/jane"] }],
      sourceRecords: [{ turn: 1, action: "visit", execution: "success", observation: "Jane Example — Founder — jane@example.com", observedUrls: ["http://example.com/team/jane"], findings: [] }],
    };
    expect(buildActEvidenceGraphs(1, act, 1, "run-http-only", new Map())).toHaveLength(0);
  });
  it("rejects search-result records as claim-grade evidence", () => {
    const act = {
      turn: 1, model: "test", action: "react_episode", args: {}, execution: "success",
      observation: "search summary", observedUrls: ["https://example.com/team/jane"],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder", scope: "candidate", sourceUrls: ["https://example.com/team/jane"] }],
      sourceRecords: [{ turn: 1, action: "web_search", execution: "success", observation: "Jane Example — Founder — jane@example.com", observedUrls: ["https://example.com/team/jane"], findings: [] }],
    };
    expect(buildActEvidenceGraphs(1, act, 1, "run-search-only", new Map())).toHaveLength(0);
  });

  it("accepts the same claim when grounded in a retrieved source record", () => {
    const act = {
      turn: 2, model: "test", action: "react_episode", args: {}, execution: "success",
      observation: "retrieved source", observedUrls: ["https://example.com/team/jane"],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder", scope: "candidate", sourceUrls: ["https://example.com/team/jane"] }],
      sourceRecords: [{ turn: 2, action: "visit", execution: "success", observation: "Jane Example — Founder — jane@example.com", observedUrls: ["https://example.com/team/jane"], findings: [] }],
    };
    expect(buildActEvidenceGraphs(1, act, 2, "run-visited", new Map([[2, 202]]))).toHaveLength(1);
  });
  it("rejects a candidate contact graph when identity and value are only present on separate pages", () => {
    const contactUrl = "https://example.com/contact";
    const identityUrl = "https://example.com/team/jane";
    const act = {
      turn: 3, model: "test", action: "react_episode", args: {}, execution: "success",
      observation: "two separately retrieved pages", observedUrls: [contactUrl, identityUrl],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder", scope: "candidate", sourceUrls: [identityUrl, contactUrl] }],
      sourceRecords: [
        { turn: 3, action: "visit", execution: "success", observation: "Public contact: jane@example.com", observedUrls: [contactUrl], findings: [] },
        { turn: 3, action: "visit", execution: "success", observation: "Jane Example — Founder", observedUrls: [identityUrl], findings: [] },
      ],
    };
    expect(buildActEvidenceGraphs(1, act, 3, "run-split-page", new Map())).toHaveLength(0);
  });

  it("rejects an unknown action label as a source-evidence anchor", () => {
    const source = "https://example.com/team/jane";
    const act = {
      turn: 4, model: "test", action: "react_episode", args: {}, execution: "success",
      observation: "untrusted unknown-action payload", observedUrls: [source],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: "Jane Example", role: "Founder", scope: "candidate", sourceUrls: [source] }],
      sourceRecords: [{ turn: 4, action: "made_up_tool", execution: "success", observation: "Jane Example — Founder — jane@example.com", observedUrls: [source], findings: [] }],
    };
    expect(buildActEvidenceGraphs(1, act, 4, "run-unknown-action", new Map())).toHaveLength(0);
  });

  it("does not reinterpret an unnamed candidate contact as an organization claim", () => {
    const source = "https://example.com/contact";
    const act = {
      turn: 5, model: "test", action: "react_episode", args: {}, execution: "success",
      observation: "Public contact: jane@example.com", observedUrls: [source],
      findings: [{ vectorType: "email", value: "jane@example.com", personName: null, role: null, scope: "candidate", sourceUrls: [source] }],
      sourceRecords: [{ turn: 5, action: "visit", execution: "success", observation: "Public contact: jane@example.com", observedUrls: [source], findings: [] }],
    };
    expect(buildActEvidenceGraphs(1, act, 5, "run-unnamed-candidate", new Map())).toHaveLength(0);
  });

});
