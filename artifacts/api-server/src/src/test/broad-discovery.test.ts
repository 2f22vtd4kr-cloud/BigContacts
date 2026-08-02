import { describe, expect, it } from "vitest";
import {
  hasAttributableWealthEvidence,
  hasQualifyingWealthEvidence,
} from "../lib/enrichment/broad-discovery";

describe("broad discovery evidence gate", () => {
  it("rejects an employee or management-directory mention", () => {
    expect(hasQualifyingWealthEvidence(
      "The Casino management team includes Morgane Iapella, an Event Project Manager.",
      '"casino" owner director Monte Carlo',
    )).toBe(false);
  });

  it("accepts a person explicitly tied to ownership", () => {
    expect(hasQualifyingWealthEvidence(
      "Samih Sawiris is the owner and investor behind the resort group.",
      '"ski resort" owner investor Alps',
    )).toBe(true);
  });

  it("accepts a principal role with wealth context", () => {
    expect(hasQualifyingWealthEvidence(
      "The family office was founded by Ingrid Magnusson, its principal and investor.",
      '"family office" principal Switzerland',
    )).toBe(true);
  });

  it("requires the candidate name to be tied to the qualifying claim", () => {
    expect(hasAttributableWealthEvidence(
      "Armelle Falcy",
      "By Per-Henrik Mansson. The owner of the estate is another family.",
    )).toBe(false);
    expect(hasAttributableWealthEvidence(
      "Albada Jelgersma",
      "Albada Jelgersma is the owner of Château Giscours and acquired a Tuscan estate.",
    )).toBe(true);
  });

  it("rejects service-page names even when the page contains ownership language", () => {
    expect(hasAttributableWealthEvidence(
      "Victoria Meeke",
      "Victoria Meeke is our French Villa Specialist. We help owners manage luxury villas.",
    )).toBe(false);
  });
});