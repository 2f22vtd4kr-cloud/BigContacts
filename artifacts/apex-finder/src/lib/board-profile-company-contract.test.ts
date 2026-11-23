import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const profileSource = readFileSync(new URL("../pages/profile.tsx", import.meta.url), "utf8");
const boardProfileSource = readFileSync(new URL("../pages/board-profile.tsx", import.meta.url), "utf8");
const contactSurfaceSource = readFileSync(new URL("../components/contact-surface.tsx", import.meta.url), "utf8");
const boardModeStart = profileSource.lastIndexOf("if (boardMode)");
const boardModeEnd = profileSource.indexOf("\n  return (", boardModeStart);
const boardCardSource = profileSource.slice(boardModeStart, boardModeEnd);

describe("board card person/company distinction", () => {
  it("labels subject tabs from canonical entity types", () => {
    expect(boardProfileSource).toContain('import { normalizeEntityType } from "@/lib/entity-taxonomy"');
    expect(boardProfileSource).toContain('rawType === "company" ? "Corporation" : normalizeEntityType(entity.type)');
    expect(boardProfileSource).toContain('normalizedType === "Corporation" || normalizedType === "Trust" ? "Company"');
    expect(boardProfileSource).toContain('normalizedType === "Other" ? "Record" : "Person"');
  });

  it("keeps personal wealth exclusive to person cards", () => {
    const wealthHeading = boardCardSource.indexOf("<h3>Personal wealth</h3>");
    const personFactsStart = boardCardSource.lastIndexOf("{!isCompanyCard && (", wealthHeading);
    const personFactsEnd = boardCardSource.indexOf("\n          )}", personFactsStart);
    expect(personFactsStart).toBeGreaterThanOrEqual(0);
    expect(personFactsEnd).toBeGreaterThan(personFactsStart);
    expect(boardCardSource.slice(personFactsStart, personFactsEnd)).toContain("Personal wealth");
    expect(boardCardSource).toContain('entityMeta(entity.type).shortLabel === "Company"');
    expect(boardCardSource).toContain('const boardEntityType = String(entity.type ?? "").toLowerCase() === "company" ? "Corporation" : entity.type');
    expect(boardCardSource).toContain("<EntityTypeMark type={boardEntityType} />");
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

  it("uses persisted claim-level statuses and keeps contact-surface status semantics", () => {
    expect(profileSource).toContain("useListResearchEvidence");
    expect(boardCardSource).toContain("researchEvidence.filter((entry: any) => Number(entry.entityId) === entityId)");
    expect(boardCardSource).toContain('["supported", "corroborated", "review"].includes(rawStatus)');
    expect(boardCardSource).toContain('const disputed = rawStatus === "disputed" || rawStatus === "rejected"');
    expect(boardCardSource).toContain('const statusClass = disputed ? "is-disputed"');
    expect(boardCardSource).toContain('const label = rawStatus === "review" ? "In review"');
    expect(boardCardSource).toContain('replace(/^\\w/, (letter: string) => letter.toUpperCase())');
    expect(boardCardSource).toContain("Contact confidence");
    expect(boardCardSource).not.toContain("sources.length > 1 ? \"corroborated\"");
    expect(boardCardSource).not.toContain("const evidenceStatus = /verified/i.test(evidenceLabel)");
    expect(contactSurfaceSource).toContain("boardMode = false");
    expect(contactSurfaceSource).toContain('label: "Corroborated"');
    expect(contactSurfaceSource).toContain('label: "Verified"');
    expect(contactSurfaceSource).toContain('label: "In review"');
    expect(contactSurfaceSource).toContain("markColor(primary.mark, boardMode)");
    expect(contactSurfaceSource).toContain('label: "PUBLIC COMPANY"');
    expect(boardCardSource).toContain('density="card" boardMode evidenceCount={contactEvidence.length}');
  });

  it("renders relationship roles as readable labels", () => {
    expect(boardCardSource).toContain("rel.role ?? rel.relationshipType");
    expect(boardCardSource).toContain(".replace(/^co\\s+/i, \"co-\")");
  });
});
