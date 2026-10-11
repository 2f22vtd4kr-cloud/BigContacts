import { describe, expect, it } from "vitest";
import { validateValueBoundContactRevocation } from "../lib/contact-revocation";

const provenance = {
  value: "jane@example.org",
  personName: "Jane Example",
  sourceUrls: ["https://company.example/team"],
  observedSourceUrls: ["https://company.example/team"],
  claimEventId: 12,
  observationEventIds: [13],
  jobId: "job-abc",
  recordedAt: "2026-10-11T06:00:00.000Z",
};

describe("value-bound contact revocation", () => {
  it("accepts the exact current value with complete promotion provenance", () => {
    expect(validateValueBoundContactRevocation({
      field: "email", currentValue: "jane@example.org", expectedValue: "jane@example.org",
      provenance, requireCanonicalProvenance: true,
    })).toMatchObject({ ok: true });
  });

  it("refuses a stale expected value before mutating the field", () => {
    expect(validateValueBoundContactRevocation({
      field: "email", currentValue: "jane@example.org", expectedValue: "old@example.org",
      provenance, requireCanonicalProvenance: true,
    })).toMatchObject({ ok: false, reason: "The displayed value is stale or no longer matches the current field." });
  });

  it("refuses provenance for a different value or missing observed binding", () => {
    expect(validateValueBoundContactRevocation({
      field: "email", currentValue: "jane@example.org", expectedValue: "jane@example.org",
      provenance: { ...provenance, value: "someone-else@example.org" }, requireCanonicalProvenance: true,
    })).toMatchObject({ ok: false, reason: "The contact provenance does not match the current field value." });
    expect(validateValueBoundContactRevocation({
      field: "email", currentValue: "jane@example.org", expectedValue: "jane@example.org",
      provenance: { ...provenance, observationEventIds: [] }, requireCanonicalProvenance: true,
    })).toMatchObject({ ok: false, reason: "The contact provenance has no complete observed-source binding." });
  });

  it("does not allow protected person cards to revoke legacy values without provenance", () => {
    expect(validateValueBoundContactRevocation({
      field: "phone", currentValue: "+1 212 555 0100", expectedValue: "+1 212 555 0100",
      provenance: null, requireCanonicalProvenance: true,
    })).toMatchObject({ ok: false, reason: "Protected person contacts require active immutable promotion provenance." });
  });

  it("allows an operator-confirmed exact field value on non-protected entities when no canonical provenance exists", () => {
    expect(validateValueBoundContactRevocation({
      field: "email", currentValue: "support@example.org", expectedValue: "support@example.org",
      provenance: null, requireCanonicalProvenance: false,
    })).toMatchObject({ ok: true, provenance: null });
  });

  it("rejects fields outside the direct-contact promotion contract", () => {
    expect(validateValueBoundContactRevocation({
      field: "foundationName", currentValue: "Example Foundation", expectedValue: "Example Foundation",
      provenance, requireCanonicalProvenance: false,
    })).toMatchObject({ ok: false, reason: "This field is not a supported contact value." });
  });
});
