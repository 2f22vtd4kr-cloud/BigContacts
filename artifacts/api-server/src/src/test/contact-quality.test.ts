import { describe, expect, it } from "vitest";
import {
  isValidPublicEmail,
  sanitizePublicEmail,
  sanitizePublicPhone,
  sanitizePublicSocialHandle,
  sanitizePublicSocialUrl,
} from "../lib/contact-validation";
import {
  computeContactConfidence,
  hasMeaningfulDirectContact,
  isPersonalContactOutcome,
} from "../lib/contact-confidence";

describe("public contact quality guardrails", () => {
  it("rejects constructed and infrastructure emails", () => {
    expect(isValidPublicEmail("first.last@example.com")).toBe(false);
    expect(sanitizePublicEmail("owner@cloudflare.com")).toBeNull();
    expect(sanitizePublicEmail("first.last@domain.com")).toBeNull();
  });

  it("rejects registry identifiers that look like phone numbers", () => {
    expect(sanitizePublicPhone("0001738758")).toBeNull();
    expect(sanitizePublicPhone("0123456789")).toBeNull();
    expect(sanitizePublicPhone("+8613810355988")).toBe("+8613810355988");
  });

  it("accepts only real social profile handles", () => {
    expect(sanitizePublicSocialHandle("https://instagram.com/alice", "instagram")).toBe("alice");
    expect(sanitizePublicSocialHandle("@alice_x", "twitter")).toBe("alice_x");
    expect(sanitizePublicSocialHandle("https://twitter.com/search", "twitter")).toBeNull();
    expect(sanitizePublicSocialUrl("https://linkedin.com/company/acme", "linkedin", "person")).toBeNull();
  });

  it("does not let invalid or organisational contacts inflate personal access", () => {
    expect(computeContactConfidence({
      email: "info@person.example",
      twitterHandle: "search",
      instagramHandle: "p",
    })).toBe(0);
    expect(computeContactConfidence({
      type: "Corporation",
      email: "founder@company.example",
      phone: "+14155552671",
    })).toBe(0);
  });

  it("requires a meaningful personal email or phone for hot status", () => {
    expect(hasMeaningfulDirectContact({ email: "info@venue.example" })).toBe(false);
    expect(hasMeaningfulDirectContact({ phone: "415-555-2671" })).toBe(true);
    expect(hasMeaningfulDirectContact({ phone: "415-555-2671", phoneSource: "EDGAR-Phone" })).toBe(false);
    expect(hasMeaningfulDirectContact({ phone: "415-555-2671", phoneSource: "CompaniesHouse-Phone" })).toBe(false);
    expect(hasMeaningfulDirectContact({ type: "Trust", phone: "+14155552671" })).toBe(false);
  });

  it("keeps legacy registry phones out of Atlas hot status", () => {
    expect(hasMeaningfulDirectContact({
      type: "HNWI",
      phone: "+15166087000",
      phoneSource: "EDGAR-Phone",
      contactOutcome: "direct_contact_candidate",
    })).toBe(false);
  });

  it("classifies registry phones as organization contact, never verified personal contact", async () => {
    const { computeContactOutcome } = await import("../lib/contact-confidence");
    expect(computeContactOutcome({
      phone: "+14155552671",
      phoneSource: "EDGAR-Phone",
      email: "owner@example.org",
      validatedDirectContact: true,
    })).toBe("organization_contact");
    expect(computeContactOutcome({
      phone: "+14155552671",
      phoneSource: "CompaniesHouse-Phone",
      validatedDirectContact: true,
    })).toBe("organization_contact");
    expect(computeContactOutcome({
      phone: "+14155552671",
      validatedDirectContact: true,
    })).toBe("direct_contact_verified");
  });

  it("does not count registry phones toward personal confidence", () => {
    expect(computeContactConfidence({
      phone: "+14155552671",
      phoneSource: "EDGAR-Phone",
    })).toBe(0);
    expect(computeContactConfidence({
      phone: "+14155552671",
    })).toBe(25);
  });

  it("keeps organization evidence out of personal Phase J metrics", () => {
    expect(isPersonalContactOutcome("organization_contact")).toBe(false);
    expect(isPersonalContactOutcome("direct_contact_candidate")).toBe(true);
    expect(isPersonalContactOutcome("direct_contact_verified")).toBe(true);
  });
});