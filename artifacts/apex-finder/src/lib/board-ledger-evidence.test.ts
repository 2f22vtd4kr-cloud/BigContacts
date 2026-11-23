import { describe, expect, it } from "vitest";
import { resolveBoardEvidenceStatus } from "./board-ledger-evidence";

describe("Ledger evidence status", () => {
  it("maps the primary presented contact's canonical validation status", () => {
    expect(resolveBoardEvidenceStatus([{ validationStatus: "verified" }])).toBe("verified");
    expect(resolveBoardEvidenceStatus([{ validationStatus: "accepted" }])).toBe("verified");
    expect(resolveBoardEvidenceStatus([{ validationStatus: "corroborated" }])).toBe("corroborated");
    expect(resolveBoardEvidenceStatus([{ validationStatus: "review" }])).toBe("review");
    expect(resolveBoardEvidenceStatus([{ validationStatus: "disputed" }])).toBe("disputed");
    expect(resolveBoardEvidenceStatus([{ validationStatus: "rejected" }])).toBe("disputed");
  });

  it("uses the first API-presented route, not a stronger secondary route", () => {
    expect(resolveBoardEvidenceStatus([
      { validationStatus: "review" },
      { validationStatus: "verified" },
    ])).toBe("review");
  });

  it("fails closed to review when no presented contact status exists", () => {
    expect(resolveBoardEvidenceStatus([])).toBe("review");
    expect(resolveBoardEvidenceStatus(null)).toBe("review");
    expect(resolveBoardEvidenceStatus([{ validationStatus: "unknown" }])).toBe("review");
  });
});
