import { describe, expect, it } from "vitest";
import { candidateSourceUrlsForIdentity } from "../lib/candidate-source-url-union";

function normalizeSourceUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href;
  } catch {
    return null;
  }
}

const isObservedHttpSource = (value: unknown): value is string =>
  typeof value === "string" && /^https?:\/\/\S+$/i.test(value);

describe("candidate source URL union", () => {
  it("retains a later matching finding's observed source instead of using only the first finding", () => {
    const sourceUrls = candidateSourceUrlsForIdentity({
      personName: "Jane Example",
      isObservedHttpSource,
      normalizeSourceUrl,
      findings: [
        { personName: "Jane Example", promotionDecision: "promote", scope: "candidate", sourceUrls: ["https://example.test/unvisited"] },
        { personName: "JANE   EXAMPLE", promotionDecision: "promote", scope: "candidate", sourceUrls: ["https://example.test/visited#bio", "https://example.test/visited"] },
        { personName: "Jane Example", promotionDecision: "reject", scope: "candidate", sourceUrls: ["https://example.test/rejected"] },
        { personName: "Jane Example", promotionDecision: "promote", scope: "organization", sourceUrls: ["https://example.test/org-only"] },
      ],
    });

    expect(sourceUrls).toEqual([
      "https://example.test/unvisited",
      "https://example.test/visited",
    ]);
  });
});
