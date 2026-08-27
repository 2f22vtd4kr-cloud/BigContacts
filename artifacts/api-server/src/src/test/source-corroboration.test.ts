import { describe, expect, it } from "vitest";
import {
  countIndependentSourceHosts,
  meetsTwoSourceRule,
  isAggregatorHost,
  hostnameOf,
} from "../lib/source-corroboration";

describe("source-corroboration", () => {
  it("parses hostname", () => {
    expect(hostnameOf("https://www.example.com/path")).toBe("example.com");
  });

  it("detects aggregator hosts", () => {
    expect(isAggregatorHost("zoominfo.com")).toBe(true);
    expect(isAggregatorHost("sec.gov")).toBe(false);
  });

  it("collapses multiple aggregator URLs to one bucket", () => {
    expect(
      countIndependentSourceHosts([
        "https://www.zoominfo.com/p/a",
        "https://rocketreach.co/b",
        "https://apollo.io/c",
      ]),
    ).toBe(1);
  });

  it("counts primary hosts separately (two-source rule)", () => {
    const urls = [
      "https://www.sec.gov/Archives/edgar/data/1/a.htm",
      "https://investor.example.com/contact",
    ];
    expect(countIndependentSourceHosts(urls)).toBe(2);
    expect(meetsTwoSourceRule(urls)).toBe(true);
  });

  it("one primary + aggregators still needs second primary for two-source", () => {
    expect(
      meetsTwoSourceRule([
        "https://investor.example.com/contact",
        "https://www.zoominfo.com/p/x",
      ]),
    ).toBe(true); // primary + aggregator bucket = 2
    expect(meetsTwoSourceRule(["https://www.zoominfo.com/p/x"])).toBe(false);
  });
});
