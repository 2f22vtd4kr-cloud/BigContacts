import { describe, expect, it } from "vitest";
import { defaultTerminalContract } from "./research-terminal-gate";

describe("research-stage terminal contracts", () => {
  it("lets discovery hand off one source-backed review lead with unresolved questions", () => {
    expect(defaultTerminalContract("discovery")).toEqual({
      minEvidence: 1,
      minIndependentSourceUnits: 1,
      requireExactSpanForFindings: false,
      requireFalsification: false,
      allowOpenQuestions: 8,
      allowHighSeverityContradictions: 0,
    });
  });

  it("keeps stricter evidence, falsification, and exact-span requirements in target research", () => {
    expect(defaultTerminalContract("target")).toEqual({
      minEvidence: 3,
      minIndependentSourceUnits: 2,
      requireExactSpanForFindings: true,
      requireFalsification: true,
      allowOpenQuestions: 0,
      allowHighSeverityContradictions: 0,
    });
  });
});
