import { describe, expect, it } from "vitest";
import {
  isAgenticPhoneSource,
  isIssuerSwitchboardSource,
  isNoticePhoneSource,
  shouldBlockIssuerOverwrite,
} from "../lib/phone-source-priority";

describe("phone-source-priority", () => {
  it("detects agentic sources", () => {
    expect(isAgenticPhoneSource("agentic-web")).toBe(true);
    expect(isAgenticPhoneSource("agentic-web-org")).toBe(true);
    expect(isAgenticPhoneSource("EDGAR-Phone")).toBe(false);
  });

  it("blocks issuer overwrite of agentic and notice", () => {
    expect(shouldBlockIssuerOverwrite("agentic-web", "EDGAR-Phone")).toBe(true);
    expect(shouldBlockIssuerOverwrite("agentic-web-org", "CompaniesHouse-Phone")).toBe(true);
    expect(shouldBlockIssuerOverwrite("EDGAR-Notice-Phone", "EDGAR-Phone")).toBe(true);
    expect(shouldBlockIssuerOverwrite("EDGAR-Phone", "EDGAR-Phone")).toBe(false);
    expect(shouldBlockIssuerOverwrite(null, "EDGAR-Phone")).toBe(false);
  });

  it("classifies notice vs issuer", () => {
    expect(isNoticePhoneSource("EDGAR-Notice-Phone")).toBe(true);
    expect(isIssuerSwitchboardSource("EDGAR-Phone")).toBe(true);
    expect(isIssuerSwitchboardSource("EDGAR-Notice-Phone")).toBe(false);
  });
});
