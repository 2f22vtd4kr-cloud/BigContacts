import { describe, expect, it } from "vitest";
import { parseSc13NoticeContacts } from "../lib/in-house-enricher";
import { computeContactOutcome } from "../lib/contact-confidence";

describe("EDGAR SC13 notice phone vs issuer phone", () => {
  it("extracts notices-and-communications phone from SC13 text", () => {
    const sample = `
SECURITIES AND EXCHANGE COMMISSION
SCHEDULE 13D
Gordon Gund
14 Nassau Street
Princeton, NJ 08542-4523
609-921-3633
(Name, Address and Telephone Number of Person Authorized to Receive Notices and Communications)
August 13, 2024
(Date of Event Which Requires Filing of This Statement)
CUSIP Number
Item 1. Security and Issuer.
`;
    const parsed = parseSc13NoticeContacts(sample);
    expect(parsed.phone).toMatch(/609/);
    expect(parsed.phone).toMatch(/921/);
  });

  it("issuer EDGAR-Phone stays organization_contact", () => {
    expect(
      computeContactOutcome({
        phone: "267-757-8707",
        phoneSource: "EDGAR-Phone",
      }),
    ).toBe("organization_contact");
  });

  it("notice phone may be direct_contact_candidate", () => {
    expect(
      computeContactOutcome({
        phone: "609-921-3633",
        phoneSource: "EDGAR-Notice-Phone",
      }),
    ).toBe("direct_contact_candidate");
  });
});
