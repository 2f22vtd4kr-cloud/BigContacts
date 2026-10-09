import { describe, expect, it } from "vitest";
import { candidateIdentityObserved } from "../lib/identity-text-match";

describe("candidate identity text matching", () => {
  it("matches a normalized full name at token boundaries", () => {
    expect(candidateIdentityObserved("Ann Li", "Ann Li, chief executive officer")).toBe(true);
    expect(candidateIdentityObserved("José Núñez", "Profile: José Núñez — Founder")).toBe(true);
    expect(candidateIdentityObserved("Jane Doe", "JANE DOE")).toBe(true);
  });

  it("does not attribute a name found only as a substring of another name", () => {
    expect(candidateIdentityObserved("Ann Li", "Joann Li is a director")).toBe(false);
    expect(candidateIdentityObserved("John", "Johnathan Smith is the founder")).toBe(false);
    expect(candidateIdentityObserved("Li", "Li is listed here")).toBe(false);
  });

  it("fails closed when the observation is not text or the name is empty", () => {
    expect(candidateIdentityObserved("Ann Li", null)).toBe(false);
    expect(candidateIdentityObserved("", "Ann Li is the CEO")).toBe(false);
  });
});
