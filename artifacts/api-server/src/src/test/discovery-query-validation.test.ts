import { describe, expect, it } from "vitest";

import { validateDiscoverySearchQuery } from "../lib/agentic-web-research-core";

describe("discovery query quality rail", () => {
  it("blocks context-free two-token identity searches", () => {
    expect(validateDiscoverySearchQuery("Elon Musk").allowed).toBe(false);
  });

  it("allows a model-selected named identity plus contextual company token", () => {
    expect(validateDiscoverySearchQuery("Elon Musk Tesla").allowed).toBe(true);
  });

  it("blocks generic sector/role/source vocabulary without a concrete anchor", () => {
    expect(validateDiscoverySearchQuery("2023 venture capital investment biotech company CEO").allowed).toBe(false);
    expect(validateDiscoverySearchQuery("2023 private equity acquisition tech startup executive").allowed).toBe(false);
    expect(validateDiscoverySearchQuery("2023 funding round software company founder interview").allowed).toBe(false);
  });

  it("still allows concrete role and sector pivots", () => {
    expect(validateDiscoverySearchQuery("Slovenia casino owners").allowed).toBe(true);
    expect(validateDiscoverySearchQuery("Example Corp founder").allowed).toBe(true);
  });

  it("blocks exact duplicate queries", () => {
    expect(validateDiscoverySearchQuery("Slovenia casino", ["slovenia   casino"]).allowed).toBe(false);
  });

  it("keeps fame-list searches anchored to concrete context", () => {
    expect(validateDiscoverySearchQuery("billionaires richest people Forbes").allowed).toBe(false);
    expect(validateDiscoverySearchQuery("billionaires richest people Forbes casino").allowed).toBe(false);
    expect(validateDiscoverySearchQuery("Forbes billionaires Slovenia casino").allowed).toBe(true);
  });
});
