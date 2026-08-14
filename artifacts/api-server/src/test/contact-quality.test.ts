import { describe, expect, it } from "vitest";
import {
  isValidPublicEmail,
  sanitizePublicEmail,
  sanitizePublicSocialHandle,
  sanitizePublicSocialUrl,
  sanitizePublicPhone,
  normalizePhone,
  isTrashPhone,
  isGenericEmailPrefix,
} from "../lib/contact-validation";
import {
  computeContactConfidence,
  hasMeaningfulDirectContact,
  isPersonalContactOutcome,
  computeContactOutcome,
} from "../lib/contact-confidence";

describe("public contact quality guardrails", () => {
  it("rejects constructed and infrastructure emails", () => {
    expect(isValidPublicEmail("first.last@example.com")).toBe(false);
    expect(sanitizePublicEmail("owner@cloudflare.com")).toBeNull();
    expect(sanitizePublicEmail("first.last@domain.com")).toBeNull();
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
      phone: "+14155550100",
    })).toBe(0);
  });

  it("requires a meaningful personal email or phone for hot status", () => {
    expect(hasMeaningfulDirectContact({ email: "info@venue.example" })).toBe(false);
    // Real NANP-shaped number (not 555 exchange)
    expect(hasMeaningfulDirectContact({ phone: "415-621-8842" })).toBe(true);
    expect(hasMeaningfulDirectContact({ type: "Trust", phone: "+14156218842" })).toBe(false);
  });

  it("keeps organization evidence out of personal Phase J metrics", () => {
    expect(isPersonalContactOutcome("organization_contact")).toBe(false);
    expect(isPersonalContactOutcome("direct_contact_candidate")).toBe(true);
    expect(isPersonalContactOutcome("direct_contact_verified")).toBe(true);
  });

  it("trash-phone gate rejects Hollywood 555 and synthetic patterns", () => {
    expect(isTrashPhone("415-555-2671")).toBe(true);
    expect(isTrashPhone("+1 555 0100")).toBe(true);
    expect(isTrashPhone("0000000000")).toBe(true);
    expect(isTrashPhone("1234567890")).toBe(true);
    expect(isTrashPhone("415-621-8842")).toBe(false);
    expect(normalizePhone("415-555-2671")).toBeNull();
    expect(sanitizePublicPhone("555-0100")).toBeNull();
    expect(normalizePhone("415-621-8842")).toBe("+14156218842");
  });

  it("org inbox prefixes never become personal contact outcomes", () => {
    for (const local of ["info", "sales", "contact", "office", "support", "press", "hello", "team"]) {
      expect(isGenericEmailPrefix(local)).toBe(true);
      expect(computeContactOutcome({ email: `${local}@acme.example` })).toBe("organization_contact");
    }
    expect(computeContactOutcome({ email: "jane.founder@acme.example" })).toBe("direct_contact_candidate");
  });
});