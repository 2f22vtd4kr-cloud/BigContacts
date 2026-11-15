import { describe, expect, it } from "vitest";
import type { IntelligenceContext } from "./research-intelligence-engine";
import { defaultTerminalContract, evaluateResearchTerminal, hasSuccessfulExternalResearchAttempt, hasSuccessfulFalsificationAttempt } from "./research-terminal-gate";

function context(input: {
  evidenceCount?: number;
  independentSourceUnits?: number;
  openQuestions?: string[];
  contradictions?: Array<{ claim: string; evidenceIds: string[]; sources: string[] }>;
  recentActions?: Array<{ action: string; execution: string; args?: Record<string, unknown>; observation?: string; urls?: string[] }>;
} = {}): IntelligenceContext {
  return {
    evidenceCount: input.evidenceCount ?? 0,
    independentSourceUnits: input.independentSourceUnits ?? 0,
    openQuestions: input.openQuestions ?? [],
    contradictions: input.contradictions ?? [],
    recentActions: input.recentActions ?? [],
    atomicEvidence: [],
  } as unknown as IntelligenceContext;
}

describe("research-stage terminal contracts", () => {
  it("retains the single-source review-lead integrity requirement for discovery handoff", () => {
    expect(defaultTerminalContract("discovery")).toMatchObject({
      minEvidence: 1,
      minIndependentSourceUnits: 1,
      requireExactSpanForFindings: false,
      requireFalsification: false,
    });
    expect(defaultTerminalContract("discovery").allowOpenQuestions).toBe(Number.MAX_SAFE_INTEGER);
    expect(defaultTerminalContract("discovery").allowHighSeverityContradictions).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("requires independent sources and falsification without imposing an open-question quota on target research", () => {
    expect(defaultTerminalContract("target")).toEqual({
      minEvidence: 0,
      minIndependentSourceUnits: 0,
      requireExactSpanForFindings: false,
      requireFalsification: true,
      allowOpenQuestions: Number.MAX_SAFE_INTEGER,
      allowHighSeverityContradictions: Number.MAX_SAFE_INTEGER,
    });
  });

  it("requires an executed counterevidence attempt rather than treating any successful research as falsification", () => {
    expect(hasSuccessfulFalsificationAttempt(context({
      recentActions: [{ action: "web_search", execution: "success", args: { query: "Jane Smith current CFO official biography" } }],
    }))).toBe(false);
    expect(hasSuccessfulFalsificationAttempt(context({
      recentActions: [{ action: "web_search", execution: "success", args: { query: "find counterevidence to Jane Smith being current CFO" } }],
    }))).toBe(true);
  });

  it("does not count a failed nested parallel query as a successful falsification attempt", () => {
    expect(hasSuccessfulFalsificationAttempt(context({
      recentActions: [{
        action: "parallel_web_search",
        execution: "success",
        args: {
          searches: [{ query: "find counterevidence to Jane Smith being current CFO", provider: "serper" }],
          searchOutcomes: [{ query: "find counterevidence to Jane Smith being current CFO", status: "error" }],
        },
      }],
    }))).toBe(false);
  });

  it("rejects an empty first-turn done when no evidence or external research has occurred", () => {
    const result = evaluateResearchTerminal(context(), "target");
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain("no_existing_evidence_or_successful_external_research_action");
  });

  it("allows the Investigator to stop after a successful external research attempt even when no result was found", () => {
    const state = context({
      recentActions: [{ action: "web_search", execution: "success", args: { query: "find counterevidence to the current executive role" }, observation: "Search completed; no matching pages found.", urls: [] }],
    });
    expect(hasSuccessfulExternalResearchAttempt(state)).toBe(true);
    const result = evaluateResearchTerminal(state, "target");
    expect(result.allowed).toBe(true);
    expect(result.metrics.evidenceCount).toBe(0);
    expect(result.outcome).toBe("inconclusive");
  });

  it("allows completion when genuine evidence already exists in the current case", () => {
    const result = evaluateResearchTerminal(context({
      evidenceCount: 1,
      independentSourceUnits: 2,
      recentActions: [{ action: "visit", execution: "success", args: { purpose: "seek counterevidence and disprove the current executive role" } }],
    }), "target");
    expect(result.allowed).toBe(true);
  });

  it("does not force the Investigator to close every open question or erase contradictions before stopping", () => {
    const result = evaluateResearchTerminal(context({
      evidenceCount: 1,
      independentSourceUnits: 2,
      recentActions: [{ action: "visit", execution: "success", args: { purpose: "seek counterevidence and disprove the current executive role" } }],
      openQuestions: ["Beneficial ownership remains unresolved", "A historical role may have ended"],
      contradictions: [{
        claim: "The role is current",
        evidenceIds: ["ev-1", "ev-2"],
        sources: ["https://a.example", "https://b.example"],
      }],
    }), "target");
    expect(result.allowed).toBe(true);
    expect(result.metrics.openQuestions).toBe(2);
    expect(result.metrics.highSeverityContradictions).toBe(1);
  });

  it("keeps discovery handoff tied to an actual source-backed review lead", () => {
    expect(evaluateResearchTerminal(context(), "discovery").allowed).toBe(false);
    expect(evaluateResearchTerminal(context({ evidenceCount: 1 }), "discovery").allowed).toBe(false);
    expect(evaluateResearchTerminal(context({ evidenceCount: 1, independentSourceUnits: 1 }), "discovery").allowed).toBe(true);
  });

  it("does not mistake a failed provider attempt for successful research", () => {
    const state = context({
      recentActions: [{ action: "web_search", execution: "error" }],
    });
    expect(hasSuccessfulExternalResearchAttempt(state)).toBe(false);
    expect(evaluateResearchTerminal(state, "target").allowed).toBe(false);
  });
});
