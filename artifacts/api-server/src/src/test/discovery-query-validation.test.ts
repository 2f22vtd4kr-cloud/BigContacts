import { describe, expect, it } from "vitest";

import { normalizeDiscoverySearchQuery, providerSearchExecutionStatus, validateDiscoverySearchQuery } from "../lib/agentic-web-research-core";

describe("discovery query input boundary", () => {
  it("leaves targetability, sector, wealth and ownership judgments to the Investigator", () => {
    for (const query of [
      "Elon Musk",
      "Elon Musk Tesla",
      "Jeff Bezos Amazon",
      "Tesla",
      "Tesla owner",
      "Amazon executive",
      "Coca-Cola Company founder",
      "Coca-Cola Slovenia independent bottler owner contact",
      "2023 venture capital investment biotech company CEO",
      "2023 private equity acquisition tech startup executive",
      "2023 funding round software company founder interview",
      "billionaires richest people Forbes",
      "Forbes billionaires Slovenia casino",
      "top 10 tech CEOs",
      "who is best",
      "Jordan Example Regional Holdings",
      "Slovenia casino owners",
      "Example Corp founder",
      "Casino Portorož beneficial owner concession holder Slovenia",
      "власник казино Порторож акціонери",
      "مالك كازينو بورتوروز استثمار",
      "赌场波尔托罗什主要股东",
      "カジノ ポルトロシュ 主要株主",
    ]) {
      expect(validateDiscoverySearchQuery(query), query).toMatchObject({ allowed: true });
    }
  });

  it("allows realistic operator/intermediary routes without prescribing them as the only route", () => {
    for (const query of [
      "Coca-Cola Slovenia independent bottler owner contact",
      "casino Slovenia coast ownership concession operator",
      "Casino Portorož owner contact",
      "Niri Philadelphia public relations contact",
      "CompanyName Ltd beneficial owner official",
      "example.com.au startup owners",
      'site:companywebsite.com "public relations" "Chief"',
      "Companies House director Kenya",
      "site:sec.gov 2024 Form 4 Jordan Example",
    ]) {
      expect(validateDiscoverySearchQuery(query), query).toMatchObject({ allowed: true });
    }
  });

  it("blocks only actual reserved/template placeholders, not arbitrary names or related domains", () => {
    for (const placeholder of [
      "casino owners site:example.com",
      '"Chief Public Relations Officer" site:example.com',
      "search [CompanyName] owner",
      "search {{companyName}} owner",
    ]) {
      expect(validateDiscoverySearchQuery(placeholder), placeholder).toMatchObject({
        allowed: false,
        reason: expect.stringContaining("placeholder"),
      });
    }

    expect(validateDiscoverySearchQuery("CompanyName Ltd beneficial owner official").allowed).toBe(true);
    expect(validateDiscoverySearchQuery("example.com.au startup owners").allowed).toBe(true);
  });

  it("blocks malformed bare-TLD site filters before a provider request", () => {
    for (const query of [
      'site:.org "about us" "leadership" "team"',
      'site:.com "Leadership" "Our Team" "Company"',
      "press contact public relations site:.org",
    ]) {
      expect(validateDiscoverySearchQuery(query), query).toMatchObject({
        allowed: false,
        reason: expect.stringContaining("bare site filter"),
      });
    }
  });

  it("blocks broad press-publisher-only searches but allows a quoted named business anchor", () => {
    for (const query of [
      'site:reuters.com "casino"',
      'site:reuters.com "赌场主要股东"',
      'site:reuters.com "مالك الكازينو"',
    ]) {
      expect(validateDiscoverySearchQuery(query), query).toMatchObject({
        allowed: false,
        reason: expect.stringContaining("broad press-publisher-only search without an exact named person/business anchor"),
      });
    }

    expect(validateDiscoverySearchQuery('site:reuters.com "Casino Portorož"')).toEqual({ allowed: true });
  });

  it("keeps repeated queries eligible for deliberate cross-checks and canonicalizes equivalent Unicode", () => {
    const result = validateDiscoverySearchQuery("Slovenia casino", ["slovenia   casino"]);
    expect(result).toMatchObject({ allowed: true });
    expect(result.allowed ? result.warning : undefined).toMatch(/repeat remains a valid research choice/i);

    expect(normalizeDiscoverySearchQuery("Cafe\u0301")).toBe(normalizeDiscoverySearchQuery("Café"));
    expect(normalizeDiscoverySearchQuery("КАЗИНО")).toBe("казино");
  });

  it("rejects empty input while classifying successful empty search responses as success", () => {
    expect(validateDiscoverySearchQuery("  \n  ")).toMatchObject({ allowed: false, reason: "Discovery search query is empty." });
    expect(providerSearchExecutionStatus({ status: "empty" })).toBe("success");
    expect(providerSearchExecutionStatus({ status: "error" })).toBe("error");
    expect(providerSearchExecutionStatus({ status: "success" })).toBe("success");
  });
});
