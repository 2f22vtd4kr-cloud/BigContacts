import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const profileSource = readFileSync(new URL("../pages/profile.tsx", import.meta.url), "utf8");
const narrativeSource = readFileSync(new URL("../lib/utils.tsx", import.meta.url), "utf8");
const dataSourcesSource = readFileSync(new URL("../pages/data-sources.tsx", import.meta.url), "utf8");

describe("registry profile evidence semantics", () => {
  it("does not promote FAA registrants or HMLR transaction parties into owners or wealthy people", () => {
    expect(profileSource).toContain("FAA registrant record");
    expect(profileSource).toContain("registration is not proof of beneficial ownership");
    expect(profileSource).toContain("does not establish beneficial ownership, an ownership percentage, control, current possession, or personal wealth");
    expect(profileSource).toContain("UK HM Land Registry Price Paid Data transaction record(s)");
    expect(profileSource).toContain("does not identify the purchaser or establish current title, continuing ownership, or personal wealth");
    expect(profileSource).toContain("UK Land Registry OCOD · overseas entity property record");
    expect(profileSource).not.toContain("FAA aircraft owner");
    expect(profileSource).not.toContain("FAA ownership is one of our strongest wealth signals");
    expect(profileSource).not.toContain("registered owner of");
  });

  it("renders separate FAA registrant, registration, fractional, beneficial ownership, wealth and HNWI states", () => {
    for (const label of [
      "Registrant type",
      "Registration status",
      "Fractional ownership",
      "Beneficial ownership",
      "Wealth assessment",
      "HNWI qualification",
    ]) {
      expect(profileSource).toContain(label);
    }
    expect(profileSource).toContain('data-testid="faa-registrant-evidence"');
    expect(profileSource).toContain("const profileWorkSummary = entityWorkSummary({");
    expect(profileSource).toContain("assetCategories: (assets as any[]).map");
    expect(profileSource).toContain("Review only");
  });

  it("preserves and labels the additional FAA co-registrant names as unverified", () => {
    expect(profileSource).toContain("additional names on this registration");
    expect(profileSource).toContain("faaLinkedAssets");
    expect(profileSource).toContain("const faaLinkedAssetsToDisplay = faaLinkedAssets.slice(0, 20)");
    expect(profileSource).toContain("assetMetadata.additionalRegistrantNames");
    expect(profileSource).toContain("unverified");
    expect(profileSource).toContain("not independently verified identities or proof of beneficial ownership");
  });

  it("documents the FAA additional-name fields and their unverified asset-level scope on the source card", () => {
    expect(dataSourcesSource).toContain("published Other Name 1–5 fields");
    expect(dataSourcesSource).toContain("Other Name 1–5 are preserved per aircraft as unverified additional names");
  });

  it("does not display FAA-only legacy registrants as HNWI before the importer migration runs", () => {
    expect(profileSource).toContain("function profileDisplayEntityType(entity: any)");
    expect(profileSource).toContain('if (registrantType === "1") return "PersonCandidate"');
    expect(profileSource).toContain('if (["2", "3", "7", "8"].includes(registrantType)) return "Corporation"');
    expect(profileSource).toContain("const displayType = profileDisplayEntityType(entity)");
    expect(profileSource).toContain('{ key: "type",        label: "Type",         done: !!displayType }');
    expect(profileSource).toContain('displayType === "HNWI"');
    expect(profileSource).toContain("<EntityTypeMark type={displayType} compact />");
    expect(profileSource).toContain("const hasFaaSource = metadata.source === \"faa-aircraft-registry\"");
    expect(profileSource).toContain("const lacksIndependentWealthAssessment = metadata.personalWealthEvidence !== true");
    expect(profileSource).toContain('metadata.typeRegistrant ?? metadata.registrantTypeCode ?? ""');
  });

  it("keeps the registry confidence badge from presenting source confidence as proof of wealth", () => {
    expect(narrativeSource).toContain("does not prove beneficial ownership or personal wealth");
    expect(narrativeSource).not.toContain("confirm this person's wealth profile");
  });

  it("keeps shared narrative helpers from turning registry records into wealth or ownership claims", () => {
    expect(narrativeSource).toContain("registrant is not necessarily the beneficial owner");
    expect(narrativeSource).toContain("not proof of personal wealth or HNWI status");
    expect(narrativeSource).toContain("A transaction is not proof of current title, continuing ownership or personal wealth");
    expect(narrativeSource).toContain("company-level property record");
    expect(narrativeSource).not.toContain("FAA register shows aircraft ownership");
    expect(narrativeSource).not.toContain("clean wealth signal");
    expect(narrativeSource).not.toContain("durable wealth marker");
    expect(narrativeSource).toContain("sourceDisclaimsPersonalWealth");
  });

  it("suppresses estimated net worth when source metadata says personal wealth is not evidenced", () => {
    expect(profileSource).toContain("metadata?.personalWealthEvidence === false");
    expect(profileSource).toContain("entityMetadata.wealthStatus === \"not_assessed\"");
    expect(profileSource).toContain("hasPersonalWealthEvidence(entity)");
    expect(profileSource).toContain("const displayableEstimatedNetWorth = hasPersonalWealthEvidence(entity)");
    expect(profileSource).toContain('displayableEstimatedNetWorth != null ? entityMeta(entity.type).metricLabel : "Primary source"');
  });
});
