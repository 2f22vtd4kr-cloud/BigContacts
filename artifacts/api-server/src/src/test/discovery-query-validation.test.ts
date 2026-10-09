import { describe, expect, it } from "vitest";

import { providerSearchExecutionStatus, validateDiscoverySearchQuery } from "../lib/agentic-web-research-core";

describe("discovery query quality guidance", () => {
  it("allows exact-identity lookups while flagging that the query may be broad", () => {
    const result = validateDiscoverySearchQuery("Elon Musk");
    expect(result.allowed).toBe(true);
    expect(result.allowed ? result.warning : undefined).toMatch(/brief or context-light/i);
  });

  it("allows model-selected named identity plus contextual company token", () => {
    expect(validateDiscoverySearchQuery("Elon Musk Tesla").allowed).toBe(true);
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
