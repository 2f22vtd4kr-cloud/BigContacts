import { describe, expect, it } from "vitest";
import { extractSerpContactTokens, formatSerpContactTokenBlock } from "../lib/serp-contact-tokens";

describe("serp-contact-tokens", () => {
  it("extracts phone and email from snippet text", () => {
    const t = "Gordon Gund Princeton 609-921-3633 contact gund@example.com filings";
    const { phones, emails } = extractSerpContactTokens(t);
    expect(phones.some((p) => p.includes("609"))).toBe(true);
    expect(emails).toContain("gund@example.com");
  });

  it("format block asks model to verify via visit", () => {
    const block = formatSerpContactTokenBlock("Call (212) 555-0100 or ir@issuer.com");
    expect(block).toMatch(/verify via visit/i);
    expect(block).toMatch(/212/);
  });
});
