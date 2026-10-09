import { describe, expect, it, vi } from "vitest";

// These tests exercise the pure provenance validators only. The production persistence module
// installs a database immutability guard at import time, so isolate that side effect here.
vi.mock("@workspace/db", () => ({
  db: {},
  contactEvidenceTable: {},
  entitiesTable: {},
  researchCaseEventsTable: {},
  researchCasesTable: {},
}));

import { isAcceptedImmutablePromotionControlRole, isClaimGradeObservationAction, observedSourceBackedBureauContacts, sourceBackedBureauContacts, supportsCandidateContactOnSameObservation, supportsContactClaimAcrossObservations } from "../lib/bureau-contact-persist-strict";

describe("canonical immutable promotion control role", () => {
  it("accepts canonical Groq oversight and retains legacy Gemini compatibility", () => {
    expect(isAcceptedImmutablePromotionControlRole("groq_boss")).toBe(true);
    expect(isAcceptedImmutablePromotionControlRole("gemini_boss")).toBe(true);
    expect(isAcceptedImmutablePromotionControlRole("right_hand")).toBe(false);
  });
});

describe("strict bureau contact persistence boundary", () => {
  it("drops findings with no source URL", () => {
    expect(sourceBackedBureauContacts([
      { vectorType: "email", value: "jane@example.com", scope: "candidate", sourceUrls: [] },
    ])).toEqual([]);
  });

  it("drops synthetic search and registry-query URLs", () => {
    expect(sourceBackedBureauContacts([
      {
        vectorType: "email",
        value: "jane@example.com",
        scope: "candidate",
        sourceUrls: [
          "https://www.google.com/search?q=%22Jane%20Example%22%20jane%40example.com",
          "https://efts.sec.gov/LATEST/search-index?q=%22Example%20Co%22&forms=SC%2013D",
        ],
      },
    ])).toEqual([]);
  });

  it("keeps an actual claim page and strips only non-claim URLs", () => {
    expect(sourceBackedBureauContacts([
      {
        vectorType: "email",
        value: "jane@example.com",
        scope: "candidate",
        sourceUrls: [
          "https://www.google.com/search?q=Jane",
          "https://example.com/team/jane",
        ],
      },
    ])).toEqual([
      expect.objectContaining({
        sourceUrls: ["https://example.com/team/jane"],
      }),
    ]);
  });
});

describe("run-scoped Investigator provenance", () => {
  const claim = {
    vectorType: "email",
    value: "jane@example.com",
    scope: "candidate",
    personName: "Jane Example",
    sourceUrls: ["https://example.com/team/jane", "https://example.com/about"],
    promote: true,
  };

  it("rejects a plausible HTTPS claim page that was not observed by the run", () => {
    expect(observedSourceBackedBureauContacts([claim], ["https://example.com/about"])).toEqual([
      expect.objectContaining({ sourceUrls: ["https://example.com/about"] }),
    ]);
  });

  it("rejects all agentic provenance when the Investigator observed no pages", () => {
    expect(observedSourceBackedBureauContacts([claim], [])).toEqual([]);
  });

  it("accepts only claim URLs actually present in the observed trajectory", () => {
    expect(observedSourceBackedBureauContacts([claim], [
      "https://example.com/team/jane",
      "https://example.com/about",
    ])).toEqual([claim]);
  });
});

describe("Batch 44 provenance regressions", () => {
  it("rejects a generated Google query even when another field looks agentic", () => {
    expect(sourceBackedBureauContacts([
      {
        vectorType: "phone",
        value: "+1 555 0100",
        scope: "candidate",
        note: "bureau-agentic",
        sourceUrls: ["https://www.google.com/search?q=Jane%20Example%20%2B1%20555%200100"],
      },
    ])).toEqual([]);
  });

  it("requires a real claim page, not merely an HTTPS URL", () => {
    expect(sourceBackedBureauContacts([
      {
        vectorType: "email",
        value: "jane@example.com",
        scope: "candidate",
        sourceUrls: ["https://bing.com/search?q=jane%40example.com"],
      },
    ])).toEqual([]);
  });
});


describe("claim-grade observation boundary", () => {
  it("accepts only source-page observation actions", () => {
    expect(isClaimGradeObservationAction("visit")).toBe(true);
    expect(isClaimGradeObservationAction("browser_fetch")).toBe(true);
    expect(isClaimGradeObservationAction("web_search")).toBe(false);
    expect(isClaimGradeObservationAction("parallel_web_search")).toBe(false);
    expect(isClaimGradeObservationAction("done")).toBe(false);
  });
});


describe("same-source identity binding for candidate contact promotion", () => {
  const candidate = { scope: "candidate", personName: "Jane Example" };

  it("accepts an exact person identity and contact value in the same source observation", () => {
    expect(supportsCandidateContactOnSameObservation(
      "Our team: Jane Example — jane@example.com",
      candidate,
      "jane@example.com",
      "email",
    )).toBe(true);
  });

  it("rejects identity and contact details when each appears only on a different source", () => {
    expect(supportsCandidateContactOnSameObservation(
      "Our team: Jane Example",
      candidate,
      "jane@example.com",
      "email",
    )).toBe(false);
    expect(supportsCandidateContactOnSameObservation(
      "General contact: jane@example.com",
      candidate,
      "jane@example.com",
      "email",
    )).toBe(false);
  });

  it("requires exact identity and contact token boundaries", () => {
    expect(supportsCandidateContactOnSameObservation(
      "Jane Exampleton — jane@example.com",
      candidate,
      "jane@example.com",
      "email",
    )).toBe(false);
    expect(supportsCandidateContactOnSameObservation(
      "Jane Example — jane@example.com.extra",
      candidate,
      "jane@example.com",
      "email",
    )).toBe(false);
  });

  it("also binds phone promotions to the same identity-bearing observation", () => {
    expect(supportsCandidateContactOnSameObservation(
      "Jane Example, direct line +1 (212) 555-0199",
      candidate,
      "+1 212 555 0199",
      "phone",
    )).toBe(true);
    expect(supportsCandidateContactOnSameObservation(
      "Jane Example, direct line not provided",
      candidate,
      "+1 212 555 0199",
      "phone",
    )).toBe(false);
  });
});


describe("multi-source candidate contact attribution", () => {
  const item = {
    vectorType: "email",
    value: "jane@example.com",
    scope: "candidate",
    personName: "Jane Example",
    sourceUrls: ["https://example.com/team/jane", "https://example.com/contact"],
  };

  it("rejects identity and contact value split across separate pages at the trusted promotion boundary", () => {
    expect(supportsContactClaimAcrossObservations([
      { observationText: "Jane Example — Founder", sourceUrls: ["https://example.com/team/jane"] },
      { observationText: "Public contact: jane@example.com", sourceUrls: ["https://example.com/contact"] },
    ], item, "jane@example.com", "email")).toBe(false);
  });

  it("accepts a candidate contact when one observed page binds identity and value exactly", () => {
    expect(supportsContactClaimAcrossObservations([
      { observationText: "Jane Example — Founder — jane@example.com", sourceUrls: ["https://example.com/team/jane"] },
      { observationText: "Contact: jane@example.com", sourceUrls: ["https://example.com/contact"] },
    ], item, "jane@example.com", "email")).toBe(true);
  });

  it("rejects a contact-only cited source when the identity page is omitted", () => {
    expect(supportsContactClaimAcrossObservations([
      { observationText: "Jane Example — Founder", sourceUrls: ["https://example.com/team/jane"] },
      { observationText: "Public contact: jane@example.com", sourceUrls: ["https://example.com/contact"] },
    ], { ...item, sourceUrls: ["https://example.com/contact"] }, "jane@example.com", "email")).toBe(false);
  });

  it("rejects a cited page that contributes neither identity nor the exact contact value", () => {
    expect(supportsContactClaimAcrossObservations([
      { observationText: "Jane Example — Founder", sourceUrls: ["https://example.com/team/jane"] },
      { observationText: "Public contact: jane@example.com", sourceUrls: ["https://example.com/contact"] },
      { observationText: "About our company", sourceUrls: ["https://example.com/about"] },
    ], { ...item, sourceUrls: [...item.sourceUrls, "https://example.com/about"] }, "jane@example.com", "email")).toBe(false);
  });
});
