import { describe, expect, it } from "vitest";
import { hasCredibleDiscoveryWealthPotentialSignal } from "../lib/candidate-source-url-union";
import { candidateRoleCorroborationSources, candidateSourceUrlsForIdentity, hasRealisticPersonRouteSource, isClaimGradeDiscoverySourceUrl, isRealisticPersonRouteSourceUrl, mergeDurablyAdmittedCandidateSources } from "../lib/candidate-source-url-union";

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

const isClaimGradeSourceUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https:\/\/\S+$/i.test(value);

describe("discovery wealth-potential targetability", () => {
  it("does not treat founder/owner job titles alone as wealth evidence", () => {
    expect(hasCredibleDiscoveryWealthPotentialSignal({
      personName: "Jane Example",
      role: "Founder and CEO",
      observations: [],
    })).toBe(false);
    expect(hasCredibleDiscoveryWealthPotentialSignal({
      personName: "Jane Example",
      role: "lastnik",
      observations: [],
    })).toBe(false);
  });

  it("does not admit an executive or ordinary small-business owner without observed materiality", () => {
    expect(hasCredibleDiscoveryWealthPotentialSignal({
      personName: "Jane Example",
      role: "Chief Executive Officer",
      observations: [
        { action: "visit", execution: "success", sourceUrl: "https://example.test/leadership", observation: "Jane Example is the Chief Executive Officer of a global corporation." },
        { action: "browser_fetch", execution: "success", sourceUrl: "https://independent.test/profile", observation: "Jane Example serves as Chief Executive Officer." },
      ],
    })).toBe(false);

    expect(hasCredibleDiscoveryWealthPotentialSignal({
      personName: "Jane Example",
      role: "Owner",
      observations: [
        { action: "visit", execution: "success", sourceUrl: "https://example.test/about", observation: "Jane Example owns a neighbourhood bakery." },
      ],
    })).toBe(false);
  });

  it("requires the ownership/investment fact and material business/asset signal near the exact person", () => {
    expect(hasCredibleDiscoveryWealthPotentialSignal({
      personName: "Jane Example",
      role: "Chief Executive Officer",
      observations: [
        { action: "visit", execution: "success", sourceUrl: "https://example.test/team", observation: "Jane Example is CEO. Unrelated text says another person is the owner of a casino." },
      ],
    })).toBe(false);

    expect(hasCredibleDiscoveryWealthPotentialSignal({
      personName: "Jane Example",
      role: "Chief Executive Officer",
      observations: [
        { action: "visit", execution: "success", sourceUrl: "https://example.test/team", observation: "Jane Example founded and owns the regional casino operator." },
      ],
    })).toBe(true);

    expect(hasCredibleDiscoveryWealthPotentialSignal({
      personName: "Jane Example",
      role: "Founder",
      observations: [
        { action: "browser_fetch", execution: "success", sourceUrl: "https://example.test/business", observation: "Jane Example founded the regional construction business with EUR 18 million in annual revenue." },
      ],
    })).toBe(true);
  });

  it("does not use search snippets, failed fetches, or non-HTTPS pages as wealth evidence", () => {
    const observations = [
      { action: "web_search", execution: "success", sourceUrl: "https://example.test/search", observation: "Jane Example is the founder and owner of a casino." },
      { action: "visit", execution: "error", sourceUrl: "https://example.test/team", observation: "Jane Example is the owner of a casino." },
      { action: "visit", execution: "success", sourceUrl: "http://example.test/team", observation: "Jane Example is the owner of a casino." },
    ];
    expect(hasCredibleDiscoveryWealthPotentialSignal({
      personName: "Jane Example",
      role: "Chief Executive Officer",
      observations,
    })).toBe(false);
  });
});

describe("media evidence versus realistic person route", () => {
  it("allows CNBC as supporting evidence but never treats a news story alone as a reachability route", () => {
    const cnbcStory = "https://www.cnbc.com/2026/08/06/family-offices-sustainability-startups-july-deal";
    const companyPage = "https://regional-operator.example/about/leadership";
    const secondNewsStory = "https://other-publication.example/articles/family-office-investors";

    expect(isClaimGradeDiscoverySourceUrl(cnbcStory)).toBe(true);
    expect(isRealisticPersonRouteSourceUrl(cnbcStory)).toBe(false);
    expect(isRealisticPersonRouteSourceUrl(companyPage)).toBe(true);
    expect(hasRealisticPersonRouteSource([cnbcStory, secondNewsStory])).toBe(false);
    expect(hasRealisticPersonRouteSource([cnbcStory, companyPage])).toBe(true);
  });

  it("does not confuse a public ownership filing with a practical person-level route", () => {
    expect(isClaimGradeDiscoverySourceUrl("https://www.sec.gov/Archives/edgar/data/123/filing.htm")).toBe(true);
    expect(isRealisticPersonRouteSourceUrl("https://www.sec.gov/Archives/edgar/data/123/filing.htm")).toBe(false);
    expect(hasRealisticPersonRouteSource(["https://www.sec.gov/Archives/edgar/data/123/filing.htm"])).toBe(false);
  });
});

describe("candidate source URL union", () => {
  it("retains a later matching finding's observed source instead of using only the first finding", () => {
    const sourceUrls = candidateSourceUrlsForIdentity({
      personName: "Jane Example",
      isClaimGradeSourceUrl,
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

describe("discovery source evidence policy", () => {
  it("requires the same candidate role on two independent direct source observations", () => {
    const findings = [{
      personName: "Jane Example", role: "Chief Executive Officer",
      promotionDecision: "promote" as const, scope: "candidate" as const,
      sourceUrls: ["https://leadership.alpha.test/jane", "https://profiles.alpha.test/jane", "https://mirror-copy.test/jane", "https://company-beta.test/team", "https://directory-gamma.test/jane"],
    }];
    const normalize = (raw: string) => {
      try { const url = new URL(raw); if (url.protocol !== "https:") return null; url.hash = ""; return url.href.endsWith("/") ? url.href.slice(0,-1) : url.href; }
      catch { return null; }
    };
    const observations = [
      { action: "visit", execution: "success", sourceUrl: "https://leadership.alpha.test/jane", observation: "Jane Example is the Chief Executive Officer of Alpha.", eventId: 10 },
      { action: "browser_fetch", execution: "success", sourceUrl: "https://profiles.alpha.test/jane", observation: "Jane Example is the Chief Executive Officer of Alpha.", eventId: 11 },
      { action: "visit", execution: "success", sourceUrl: "https://mirror-copy.test/jane", observation: "Jane Example is the Chief Executive Officer of Alpha.", eventId: 15 },
      { action: "visit", execution: "success", sourceUrl: "https://company-beta.test/team", observation: "Jane Example is the Chief Executive Officer of Beta.", eventId: 12 },
      { action: "visit", execution: "success", sourceUrl: "https://directory-gamma.test/jane", observation: "Jane Example appears here, but no role is stated.", eventId: 13 },
      { action: "web_search", execution: "success", sourceUrl: "https://search-delta.test/jane", observation: "Jane Example is the Chief Executive Officer.", eventId: 14 },
    ];
    expect(candidateRoleCorroborationSources({
      personName: "Jane Example", role: "Chief Executive Officer", findings, observations,
      isClaimGradeSourceUrl: isClaimGradeDiscoverySourceUrl, normalizeSourceUrl: normalize,
    })).toEqual([
      { sourceUrl: "https://leadership.alpha.test/jane", publisher: "alpha.test", eventId: 10 },
      { sourceUrl: "https://company-beta.test/team", publisher: "company-beta.test", eventId: 12 },
    ]);
  });

  it("rejects a name-only second source and does not let search actions corroborate", () => {
    const findings = [{
      personName: "Jane Example", role: "Chief Executive Officer",
      promotionDecision: "promote" as const, scope: "candidate" as const,
      sourceUrls: ["https://leadership.alpha.test/jane", "https://company-beta.test/team"],
    }];
    const normalize = (raw: string) => { try { const url = new URL(raw); url.hash = ""; return url.href.endsWith("/") ? url.href.slice(0,-1) : url.href; } catch { return null; } };
    expect(candidateRoleCorroborationSources({
      personName: "Jane Example", role: "Chief Executive Officer", findings,
      observations: [
        { action: "visit", execution: "success", sourceUrl: "https://leadership.alpha.test/jane", observation: "Jane Example is Chief Executive Officer.", eventId: 1 },
        { action: "visit", execution: "success", sourceUrl: "https://company-beta.test/team", observation: "Jane Example is mentioned here.", eventId: 2 },
      ],
      isClaimGradeSourceUrl: isClaimGradeDiscoverySourceUrl, normalizeSourceUrl: normalize,
    })).toHaveLength(1);
  });


  it("requires HTTPS and rejects search-result endpoints as candidate claim evidence", () => {
    expect(isClaimGradeDiscoverySourceUrl("http://example.test/team/jane")).toBe(false);
    expect(isClaimGradeDiscoverySourceUrl("https://example.test/team/jane")).toBe(true);
    for (const url of [
      "https://www.google.com/search?q=Jane+Example",
      "https://www.bing.com/search?q=Jane",
      "https://search.yahoo.com/search?p=Jane",
      "https://duckduckgo.com/?q=Jane",
      "https://efts.sec.gov/LATEST/search-index?q=Jane",
      "https://example.test/search?q=Jane",
      "https://www.rocketreach.co/jane-example_email_123",
      "https://theorg.com/org/example/people/alex-lee",
      "https://apollo.io/people/jane-example",
      "https://s.jina.ai/search?q=Jane+Example",
      "https://r.jina.ai/https://publisher.example/team/jane",
    ]) expect(isClaimGradeDiscoverySourceUrl(url)).toBe(false);
    expect(isClaimGradeDiscoverySourceUrl("https://example.test/team/jane")).toBe(true);
    expect(isClaimGradeDiscoverySourceUrl("https://www.sec.gov/Archives/edgar/data/123/filing.htm")).toBe(true);
  });

  it("rejects DuckDuckGo Instant Answer API URLs, including trailing-dot host aliases", () => {
    expect(isClaimGradeDiscoverySourceUrl("https://api.duckduckgo.com/?q=Jane+Example&format=json")).toBe(false);
    expect(isClaimGradeDiscoverySourceUrl("https://api.duckduckgo.com./?q=Jane+Example&format=json")).toBe(false);
  });

  it("merges only durable supporting page URLs across continuations", () => {
    expect(mergeDurablyAdmittedCandidateSources([
      [{ name: "Jane Example", sourceUrls: ["https://example.test/team/jane#bio"] }],
      [{ name: "JANE   EXAMPLE", sourceUrls: ["https://example.test/about/", "https://google.com/search?q=Jane"] }],
    ])).toEqual([{
      name: "Jane Example",
      sourceUrls: ["https://example.test/team/jane", "https://example.test/about"],
    }]);
  });
});
