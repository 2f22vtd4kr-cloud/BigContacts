import { describe, expect, it } from "vitest";

import { providerSearchExecutionStatus, validateDiscoverySearchQuery } from "../lib/agentic-web-research-core";

describe("discovery query quality guidance", () => {
  it("rejects globally prominent people as discovery targets", () => {
    for (const query of ["Elon Musk", "Elon Musk Tesla", "Jeff Bezos", "Jeff Bezos Amazon"]) {
      const result = validateDiscoverySearchQuery(query);
      expect(result.allowed).toBe(false);
      expect(result.allowed ? "" : result.reason).toMatch(/globally prominent person|global-household-brand/i);
    }
  });

  it("allows a model-selected named identity with a realistic private-business context", () => {
    expect(validateDiscoverySearchQuery("Jordan Example Regional Holdings").allowed).toBe(true);
  });

  it("requires a local operator or intermediary route for global household brands", () => {
    for (const query of ["Tesla", "Tesla owner", "Amazon executive", "Coca-Cola Company founder"]) {
      expect(validateDiscoverySearchQuery(query).allowed, query).toBe(false);
    }
    expect(validateDiscoverySearchQuery("Coca-Cola Slovenia independent bottler owner contact").allowed).toBe(true);
    expect(validateDiscoverySearchQuery("casino Slovenia coast ownership concession operator").allowed).toBe(true);
  });

  it("blocks generic research hypotheses until the model supplies a concrete anchor", () => {
    for (const query of [
      "2023 venture capital investment biotech company CEO",
      "2023 private equity acquisition tech startup executive",
      "2023 funding round software company founder interview",
    ]) {
      const result = validateDiscoverySearchQuery(query);
      expect(result.allowed).toBe(false);
      expect(result.allowed ? "" : result.reason).toMatch(/concrete anchor/i);
    }
  });

  it("allows concrete role and sector pivots", () => {
    expect(validateDiscoverySearchQuery("Slovenia casino owners").allowed).toBe(true);
    expect(validateDiscoverySearchQuery("Example Corp founder").allowed).toBe(true);
  });

  it("does not hard-block a deliberate repeat that may cross-check a source or market", () => {
    const result = validateDiscoverySearchQuery("Slovenia casino", ["slovenia   casino"]);
    expect(result.allowed).toBe(true);
    expect(result.allowed ? result.warning : undefined).toMatch(/repeat was allowed/i);
  });

  it("blocks unanchored fame-list searches but allows a contextualized pivot", () => {
    const broad = validateDiscoverySearchQuery("billionaires richest people Forbes");
    expect(broad.allowed).toBe(false);
    expect(broad.allowed ? "" : broad.reason).toMatch(/fame\/list-oriented|concrete anchor/i);

    const contextual = validateDiscoverySearchQuery("Forbes billionaires Slovenia casino");
    expect(contextual.allowed).toBe(true);
  });

  it("recognizes whitespace-separated tokens and explicit source anchors for accurate advisory scoring", () => {
    const result = validateDiscoverySearchQuery("site:sec.gov 2024 Form 4 Jordan Example");
    expect(result.allowed).toBe(true);
    expect(result.allowed ? result.warning ?? "" : "").not.toMatch(/brief or context-light/i);
    expect(result.allowed ? result.warning ?? "" : "").not.toMatch(/no explicit person, organization, geography, registry, domain/i);
  });

  it("does not mistake list counts and interrogative filler for a concrete anchor", () => {
    expect(validateDiscoverySearchQuery("top 10 tech CEOs").allowed).toBe(false);
    expect(validateDiscoverySearchQuery("who is best").allowed).toBe(false);
  });

  it("only hard-rejects an empty query at this quality-heuristic boundary", () => {
    expect(validateDiscoverySearchQuery("  \n  ").allowed).toBe(false);
  });
});

describe("agentic provider search outcome semantics", () => {
  it("treats a successful zero-result search as a completed tool call", () => {
    expect(providerSearchExecutionStatus({ status: "empty" })).toBe("success");
  });

  it("keeps actual provider failures visible as errors", () => {
    expect(providerSearchExecutionStatus({ status: "error" })).toBe("error");
  });

  it("treats a search that returns valid sources as successful", () => {
    expect(providerSearchExecutionStatus({ status: "success" })).toBe("success");
  });
});
