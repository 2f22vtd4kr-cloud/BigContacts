import { describe, expect, it } from "vitest";
import {
  discoveryTerminalGate,
  type AgenticFinding,
  type AgenticTrajectoryRecord,
} from "../lib/agentic-web-research-core";

const firstUrl = "https://company.example/team/jane";
const secondUrl = "https://company.example/contact";

function finding(overrides: Partial<AgenticFinding> = {}): AgenticFinding {
  return {
    vectorType: "email",
    value: "jane@example.com",
    personName: "Jane Example",
    role: "Founder",
    scope: "candidate",
    sourceUrls: [firstUrl],
    note: "Public-source candidate claim",
    promotionDecision: "promote",
    ...overrides,
  };
}

function observedPage(url: string, observation: string, turn = 1): AgenticTrajectoryRecord {
  return {
    turn,
    model: "openai/gpt-oss-20b",
    action: "visit",
    args: { url },
    execution: "success",
    observation,
    observedUrls: [url],
    findings: [],
  };
}

function doneWith(findings: AgenticFinding[]): AgenticTrajectoryRecord {
  return {
    turn: 3,
    model: "openai/gpt-oss-20b",
    action: "done",
    args: {},
    execution: "success",
    observation: "Investigator proposes stopping.",
    observedUrls: [],
    findings,
  };
}

describe("discovery terminal claim-evidence gate", () => {
  it("recognizes a successful parallel search as an external action when stopping without findings", () => {
    const parallelSearch: AgenticTrajectoryRecord = {
      turn: 1,
      model: "openai/gpt-oss-20b",
      action: "parallel_web_search",
      args: { searches: [{ query: "public leadership Jane Example", provider: "serper" }] },
      execution: "success",
      observation: "Search returned candidate leads for follow-up.",
      observedUrls: ["https://search.example/results?q=Jane"],
      findings: [],
    };
    expect(discoveryTerminalGate([parallelSearch, doneWith([])])).toEqual({ allowed: true, reason: null });
  });

  it("accepts a candidate claim with exact contact value and token-bounded identity on its visited page", () => {
    expect(discoveryTerminalGate([
      observedPage(firstUrl, "Jane Example — Founder — jane@example.com"),
      doneWith([finding()]),
    ])).toEqual({ allowed: true, reason: null });
  });

  it("rejects substring identity attribution such as Ann Li inside Joann Li", () => {
    expect(discoveryTerminalGate([
      observedPage(firstUrl, "Joann Li — ann@example.com"),
      doneWith([finding({ personName: "Ann Li" })]),
    ])).toMatchObject({ allowed: false });
  });

  it("rejects candidate-scoped contact claims that omit a person identity", () => {
    expect(discoveryTerminalGate([
      observedPage(firstUrl, "Public contact: jane@example.com"),
      doneWith([finding({ personName: null })]),
    ])).toMatchObject({ allowed: false });
  });

  it("requires every cited source URL to have a successful retrieval observation", () => {
    expect(discoveryTerminalGate([
      observedPage(firstUrl, "Jane Example — Founder — jane@example.com"),
      doneWith([finding({ sourceUrls: [firstUrl, secondUrl] })]),
    ])).toMatchObject({ allowed: false });
  });

  it("allows candidate identity and contact support to be split across cited pages", () => {
    expect(discoveryTerminalGate([
      observedPage(firstUrl, "Jane Example — Founder"),
      observedPage(secondUrl, "Public contact: jane@example.com", 2),
      doneWith([finding({ sourceUrls: [firstUrl, secondUrl] })]),
    ])).toEqual({ allowed: true, reason: null });
  });

  it("rejects an unrelated retrieved page cited for an organization-scoped claim", () => {
    expect(discoveryTerminalGate([
      observedPage(firstUrl, "Public contact: jane@example.com"),
      observedPage(secondUrl, "Our history and values", 2),
      doneWith([finding({
        personName: null,
        scope: "organization",
        sourceUrls: [firstUrl, secondUrl],
      })]),
    ])).toMatchObject({ allowed: false });
  });

  it("rejects a search-results URL as candidate source proof", () => {
    expect(discoveryTerminalGate([
      observedPage("https://www.google.com/search?q=Jane+Example", "Jane Example — jane@example.com"),
      doneWith([finding({ sourceUrls: ["https://www.google.com/search?q=Jane+Example"] })]),
    ])).toMatchObject({ allowed: false });
  });
});
