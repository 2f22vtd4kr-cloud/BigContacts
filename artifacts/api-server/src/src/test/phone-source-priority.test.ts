import { describe, expect, it } from "vitest";
import {
  isAgenticPhoneSource,
  isIssuerSwitchboardSource,
  isNoticePhoneSource,
  isProtectedPhoneSource,
  shouldBlockIssuerOverwrite,
  resolveProtectedCardPhone,
  isAgenticEmailSource,
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
    expect(shouldBlockIssuerOverwrite("agentic-web", "web-osint")).toBe(true);
    expect(shouldBlockIssuerOverwrite("agentic-web", "ai-web-osint")).toBe(true);
    expect(shouldBlockIssuerOverwrite("agentic-web", "deep-web-osint")).toBe(true);
    expect(shouldBlockIssuerOverwrite("agentic-web", "in-house")).toBe(true);
    expect(shouldBlockIssuerOverwrite("agentic-web", "final-review")).toBe(true);
    expect(shouldBlockIssuerOverwrite("agentic-web", "contact-cache")).toBe(true);
  });

  it("classifies notice vs issuer", () => {
    expect(isNoticePhoneSource("EDGAR-Notice-Phone")).toBe(true);
    expect(isIssuerSwitchboardSource("EDGAR-Phone")).toBe(true);
    expect(isIssuerSwitchboardSource("EDGAR-Notice-Phone")).toBe(false);
    expect(isProtectedPhoneSource("agentic-web")).toBe(true);
    expect(isProtectedPhoneSource("EDGAR-Notice-Phone")).toBe(true);
    expect(isProtectedPhoneSource("web-osint")).toBe(false);
  });

  it("resolveProtectedCardPhone keeps dig phone over null final-review", () => {
    const r = resolveProtectedCardPhone({
      currentPhone: "+16099213633",
      currentSource: "agentic-web",
      incomingPhone: null,
      incomingSource: "final-review",
    });
    expect(r.phone).toBe("+16099213633");
    expect(r.phoneSource).toBe("agentic-web");
  });

  it("resolveProtectedCardPhone keeps notice over issuer", () => {
    const r = resolveProtectedCardPhone({
      currentPhone: "+12127024300",
      currentSource: "EDGAR-Notice-Phone",
      incomingPhone: "+15139773000",
      incomingSource: "EDGAR-Phone",
    });
    expect(r.phone).toBe("+12127024300");
    expect(r.phoneSource).toBe("EDGAR-Notice-Phone");
  });

  it("resolveProtectedCardPhone keeps agentic-web-org over web-osint", () => {
    const r = resolveProtectedCardPhone({
      currentPhone: "+12125550100",
      currentSource: "agentic-web-org",
      incomingPhone: "+18005550100",
      incomingSource: "web-osint",
    });
    expect(r.phone).toBe("+12125550100");
    expect(r.phoneSource).toBe("agentic-web-org");
  });

  it("resolveProtectedCardPhone allows empty card to take issuer when no dig", () => {
    const r = resolveProtectedCardPhone({
      currentPhone: null,
      currentSource: null,
      incomingPhone: "+15139773000",
      incomingSource: "EDGAR-Phone",
    });
    expect(r.phone).toBe("+15139773000");
    expect(r.phoneSource).toBe("EDGAR-Phone");
  });

  it("resolveProtectedCardPhone keeps current non-protected when incoming blocked path not used", () => {
    const r = resolveProtectedCardPhone({
      currentPhone: "+10001112222",
      currentSource: "EDGAR-Phone",
      incomingPhone: null,
      incomingSource: "final-review",
    });
    expect(r.phone).toBe("+10001112222");
  });

  it("detects agentic email source", () => {
    expect(isAgenticEmailSource("agentic-web")).toBe(true);
    expect(isAgenticEmailSource("pattern-generated")).toBe(false);
  });
});
