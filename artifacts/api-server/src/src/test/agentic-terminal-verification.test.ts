import { describe, expect, it } from "vitest";
import { discoveryTerminalGate } from "../lib/agentic-web-research-core";
import { groundedFindingsForTrajectory, type AgenticFinding, type AgenticTrajectoryRecord } from "../lib/agentic-web-research";

const finding = (overrides: Partial<AgenticFinding> = {}): AgenticFinding => ({
  vectorType: "email",
  value: "jane@example.com",
  personName: "Jane Example",
  role: "Founder",
  scope: "candidate",
  sourceUrls: ["https://example.com/team/jane"],
  note: "claimed contact",
  ...overrides,
});

const visit = (observation: string): AgenticTrajectoryRecord => ({
  turn: 1,
  model: "groq",
  action: "visit",
  args: { url: "https://example.com/team/jane" },
  execution: "success",
  observation,
  observedUrls: ["https://example.com/team/jane"],
  findings: [],
});

describe("agentic terminal verification", () => {
  it("blocks a discovery stop when a terminal claim is not grounded in observed cited material", () => {
    const result = discoveryTerminalGate([
      visit("Jane Example is Founder."),
      {
        turn: 2,
        model: "groq",
        action: "done",
        args: {},
        execution: "success",
        observation: "Investigator summary only",
        observedUrls: [],
        findings: [finding()],
      },
    ]);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("not grounded");
  });

  it("allows a discovery stop when each terminal claim is grounded by a successful cited observation", () => {
    const result = discoveryTerminalGate([
      visit("Jane Example is Founder and jane@example.com is the public contact."),
      {
        turn: 2,
        model: "groq",
        action: "done",
        args: {},
        execution: "success",
        observation: "Terminal summary",
        observedUrls: [],
        findings: [finding()],
      },
    ]);
    expect(result.allowed).toBe(true);
  });

  it("never treats a failed source as grounding even when the text contains the claimed value", () => {
    const result = discoveryTerminalGate([
      {
        ...visit("Jane Example — Founder — jane@example.com"),
        execution: "http_error",
      },
      {
        turn: 2,
        model: "groq",
        action: "done",
        args: {},
        execution: "success",
        observation: "Terminal summary",
        observedUrls: [],
        findings: [finding()],
      },
    ]);
    expect(result.allowed).toBe(false);
  });

  it("keeps only grounded findings when a model mixes supported and unsupported terminal claims", () => {
    const records = [visit("Jane Example is Founder and jane@example.com is the public contact.")];
    const grounded = groundedFindingsForTrajectory([
      finding(),
      finding({ value: "other@example.com", sourceUrls: ["https://example.com/team/jane"] }),
    ], records);
    expect(grounded).toHaveLength(1);
    expect(grounded[0]?.value).toBe("jane@example.com");
  });
});
