import { describe, expect, it } from "vitest";
import {
  buildBrregCompanyEntity,
  buildBrregManagingDirectorCandidate,
  buildVirtualGlobetrottingLead,
  isEligibleBrregCompany,
  parseRegistryCsv,
} from "../lib/brreg-snapshot-ingestor";

describe("BRREG snapshot record parsing and realism", () => {
  it("parses quoted commas and escaped quotes in official registry fields", () => {
    const [row] = parseRegistryCsv('name,description\n"Example AS","Engineering, ""design"" services"\n');
    expect(row).toEqual({ name: "Example AS", description: 'Engineering, "design" services' });
  });

  it("screens active Norwegian AS entities in relevant sectors and modest operating scale", () => {
    expect(isEligibleBrregCompany({
      organization: "LOCAL HOTEL AS",
      organization_number: "123456789",
      legal_form: "AS",
      registered_in_business_register: "True",
      bankruptcy: "False",
      under_liquidation: "False",
      employees: "12",
      industry_codes: "55.100",
    })).toBe(true);
    expect(isEligibleBrregCompany({
      organization: "DORMANT HOLDING AS",
      organization_number: "123456789",
      legal_form: "AS",
      registered_in_business_register: "True",
      bankruptcy: "True",
      under_liquidation: "False",
      employees: "12",
      industry_codes: "68.200",
    })).toBe(false);
    expect(isEligibleBrregCompany({
      organization: "UNRELATED RETAIL AS",
      organization_number: "123456789",
      legal_form: "AS",
      registered_in_business_register: "True",
      bankruptcy: "False",
      under_liquidation: "False",
      employees: "12",
      industry_codes: "47.110",
    })).toBe(false);
  });

  it("stores registry jurisdiction without inventing company or director nationality", () => {
    const company = buildBrregCompanyEntity({
      organization: "LOCAL HOTEL AS",
      organization_number: "123456789",
      legal_form: "AS",
      business_email: "post@example.no",
      business_phone: "+47 12345678",
      country: "Norway",
    });
    expect(company.nationality).toBeNull();
    expect(JSON.parse(company.metadata ?? "{}").country).toBe("Norway");

    const person = buildBrregManagingDirectorCandidate({
      person_name: "Kari Example",
      organization: "LOCAL HOTEL AS",
      organization_number: "123456789",
      business_role: "Daglig leder",
      source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/123456789/roller",
    });
    expect(person.nationality).toBeNull();
    expect(JSON.parse(person.metadata ?? "{}").country).toBe("NO");
  });

  it("stores public business contacts on the company only and does not infer wealth", () => {
    const entity = buildBrregCompanyEntity({
      organization: "LOCAL HOTEL AS",
      organization_number: "123456789",
      legal_form: "AS",
      country: "Norway",
      business_city: "Bergen",
      employees: "12",
      industry_codes: "55.100",
      industry_descriptions: "Hotel operation",
      registered_share_capital_amount: "5000000",
      registered_share_capital_currency: "NOK",
      incorporation_date: "2010-01-01",
      business_email: "post@localhotel.no",
      business_phone: "+47 555 00 000",
      official_website: "www.localhotel.no",
      official_registry_url: "https://data.brreg.no/enhetsregisteret/api/enheter/123456789",
    });
    const metadata = JSON.parse(entity.metadata ?? "{}");
    expect(entity.type).toBe("Corporation");
    expect(entity.email).toBe("post@localhotel.no");
    expect(entity.phone).toBe("+47 555 00 000");
    expect(entity.contactOutcome).toBe("organization_contact");
    expect(entity.estimatedNetWorth).toBeNull();
    expect(entity.knownResidences).toBeNull();
    expect(metadata).toMatchObject({
      sourceRecordId: "brreg:123456789",
      organizationNumber: "123456789",
      contactScope: "organization_only",
      wealthStatus: "not_assessed",
      personalWealthEvidence: false,
    });
    expect(metadata).not.toHaveProperty("businessAddress");
  });

  it("keeps a managing director as a review-only person candidate with no person contact or ownership claim", () => {
    const entity = buildBrregManagingDirectorCandidate({
      person_name: "Kari Example",
      business_role: "Daglig leder",
      organization: "LOCAL HOTEL AS",
      organization_number: "123456789",
      source_url: "https://data.brreg.no/enhetsregisteret/api/enheter/123456789/roller",
      evidence_level: "Official business-role record only",
      contactability_status: "No person-level business contact assessed in registry",
    });
    const metadata = JSON.parse(entity.metadata ?? "{}");
    expect(entity.type).toBe("PersonCandidate");
    expect(entity.email).toBeNull();
    expect(entity.phone).toBeNull();
    expect(entity.contactOutcome).toBe("evidence_only");
    expect(entity.estimatedNetWorth).toBeNull();
    expect(entity.knownResidences).toBeNull();
    expect(entity.isHot).toBe(false);
    expect(metadata).toMatchObject({
      role: "Managing Director",
      roleOriginal: "Daglig leder",
      companyRegistryId: "123456789",
      reviewOnly: true,
      wealthStatus: "unverified",
      hnwiQualificationStatus: "unverified",
      contactScope: "no_person_contact",
      personalWealthEvidence: false,
    });
  });

  it("stores a visual property reference as an unresolved asset lead, never a person or owner link", () => {
    const asset = buildVirtualGlobetrottingLead({
      source_record_id: "virtualglobetrotting:michel-ducros-house",
      asset_type: "real_estate_visual_lead",
      source_url: "https://virtualglobetrotting.com/map/michel-ducros-house/",
      source_name: "Virtual Globetrotting (user-supplied visual lead)",
      evidence_status: "unverified_visual_reference",
      owner_status: "unresolved",
      description: "Public visual lead only; no verified owner or valuation.",
      source_snapshot_id: "user-supplied-2026-11-07",
    });
    const metadata = JSON.parse(asset.metadata ?? "{}");
    expect(asset.category).toBe("RealEstate");
    expect(asset.identifier).toBe("virtualglobetrotting:michel-ducros-house");
    expect(asset.ownerEntityId).toBeUndefined();
    expect(asset.address).toBeNull();
    expect(asset.estimatedValue).toBeNull();
    expect(metadata).toMatchObject({
      sourceClass: "unverified_visual_lead",
      ownerStatus: "unresolved",
      personalWealthEvidence: false,
      reviewOnly: true,
    });
  });
});
