/**
 * Filing notice-line extraction — reporting person phone/address, not issuer HQ.
 */
import { describe, expect, it } from "vitest";
import { parseFilingPersonContacts } from "../lib/edgar-identity-boost";

const GUND_NOTICE = `
SCHEDULE 13D
Name, Address and Telephone Number of Person
Authorized to Receive Notices and Communications
Gordon Gund
14 Nassau Street
Princeton, NJ 08542
(609) 921-3633
Date of Event Which Requires Filing of this Statement
CUSIP No. 123456789
`;

const ISSUER_ONLY = `
Company Telephone Number: (847) 498-7070
Principal Executive Offices
3100 Sanders Road, Suite 301
Northbrook, IL 60062
`;

describe("parseFilingPersonContacts", () => {
  it("extracts SC 13 notices-and-communications phone", () => {
    const r = parseFilingPersonContacts(GUND_NOTICE);
    expect(r.phone).toBeTruthy();
    expect(r.phone).toContain("609");
  });

  it("does not invent a phone from issuer HQ block alone without notice header", () => {
    parseFilingPersonContacts(ISSUER_ONLY);
    const withNotice = parseFilingPersonContacts(GUND_NOTICE + "\n" + ISSUER_ONLY);
    expect(withNotice.phone).toBeTruthy();
    expect(withNotice.phone).toContain("609");
  });
});
