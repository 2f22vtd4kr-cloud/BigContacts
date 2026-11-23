import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const profileSource = readFileSync(new URL("../pages/profile.tsx", import.meta.url), "utf8");
const boardProfileSource = readFileSync(new URL("../pages/board-profile.tsx", import.meta.url), "utf8");
const boardModeStart = profileSource.lastIndexOf("if (boardMode)");
const boardModeEnd = profileSource.indexOf("\n  return (", boardModeStart);
const boardCardSource = profileSource.slice(boardModeStart, boardModeEnd);

describe("board card person/company distinction", () => {
  it("labels subject tabs from canonical entity types", () => {
    expect(boardProfileSource).toContain('import { normalizeEntityType } from "@/lib/entity-taxonomy"');
    expect(boardProfileSource).toContain('normalizedType === "Corporation" || normalizedType === "Trust" ? "Company"');
    expect(boardProfileSource).toContain('normalizedType === "Other" ? "Record" : "Person"');
  });

  it("keeps personal wealth exclusive to person cards", () => {
    const personFactsStart = boardCardSource.indexOf("{!isCompanyCard && (");
    const personFactsEnd = boardCardSource.indexOf("\n          )}", personFactsStart);
    expect(personFactsStart).toBeGreaterThanOrEqual(0);
    expect(personFactsEnd).toBeGreaterThan(personFactsStart);
    expect(boardCardSource.slice(personFactsStart, personFactsEnd)).toContain("Personal wealth");
    expect(boardCardSource).toContain('entityMeta(entity.type).shortLabel === "Company"');
  });

  it("shows company ownership and people without inventing shareholder data", () => {
    expect(boardCardSource).toContain("{isCompanyCard && (");
    expect(boardCardSource).toContain("<h3>Ownership</h3>");
    expect(boardCardSource).toContain("No shareholder record yet. Atlas does not infer ownership from a title.");
    expect(boardCardSource).toContain("People on this card");
    expect(boardCardSource).toContain("{!isCompanyCard && e.nationality && <span>{e.nationality}</span>}");
    expect(boardCardSource).toContain("hasOwnershipEvidence");
  });

  it("restricts company contact presentation to attributable organization routes", () => {
    expect(boardCardSource).toContain('String(route?.mark ?? "").toLowerCase() === "organization"');
    expect(boardCardSource).toContain('renderContactGroup("Personal", personalContacts)');
    expect(boardCardSource).toContain('!isCompanyCard && renderContactGroup("Personal", personalContacts)');
    expect(boardCardSource).toContain('renderContactGroup("Organisation", companyContacts, companyPhone, companyPhoneSource)');
    expect(boardCardSource).toContain('renderContactGroup("Needs review", reviewContacts, reviewPhone, companyPhoneSource)');
    expect(boardCardSource).toContain("(reviewContacts.length > 0 || reviewPhone)");
    expect(boardCardSource).toContain("None recorded.");
  });

  it("renders relationship roles as readable labels", () => {
    expect(boardCardSource).toContain("rel.role ?? rel.relationshipType");
    expect(boardCardSource).toContain(".replace(/^co\\s+/i, \"co-\")");
  });
});
