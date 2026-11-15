import { describe, expect, it } from "vitest";
import {
  candidateRoleCorroborationSources,
  isClaimGradeDiscoverySourceUrl,
} from "./candidate-source-url-union";

function normalizeSourceUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href;
  } catch {
    return null;
  }
}

describe("model-owned candidate semantics and deterministic source integrity", () => {
  it("accepts a model-selected non-Latin role without an English vocabulary gate", () => {
    const personName = "山田 太郎";
    const role = "取締役会長";
    const sourceUrl = "https://registry.example.jp/company/123";
    const exactQuote = "山田 太郎は北星株式会社の取締役会長です。";

    const result = candidateRoleCorroborationSources({
      personName,
      role,
      findings: [{
        personName,
        role,
        promotionDecision: "promote",
        scope: "candidate",
        sourceUrls: [sourceUrl],
        exactQuote,
      }],
      observations: [{
        action: "visit",
        execution: "success",
        sourceUrl,
        observation: exactQuote + " 登記情報。",
        eventId: 73,
      }],
      isClaimGradeSourceUrl: isClaimGradeDiscoverySourceUrl,
      normalizeSourceUrl,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ sourceUrl, eventId: 73 });
  });

  it("requires the model-selected quotation to exist verbatim in the matching fetched source", () => {
    const sourceUrl = "https://registry.example.test/company/123";
    const result = candidateRoleCorroborationSources({
      personName: "Jane Example",
      role: "Head of Operations",
      findings: [{
        personName: "Jane Example",
        role: "Head of Operations",
        promotionDecision: "promote",
        scope: "candidate",
        sourceUrls: [sourceUrl],
        exactQuote: "Jane Example leads operations.",
      }],
      observations: [{
        action: "visit",
        execution: "success",
        sourceUrl,
        observation: "Jane Example appears in the company directory.",
        eventId: 74,
      }],
      isClaimGradeSourceUrl: isClaimGradeDiscoverySourceUrl,
      normalizeSourceUrl,
    });
    expect(result).toEqual([]);
  });
});
