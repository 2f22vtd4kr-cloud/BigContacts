import { describe, expect, it } from "vitest";
import {
  buildBrregCompanyEntity,
  buildBrregManagingDirectorCandidate,
  buildApexIntermediaryEntity,
  buildVirtualGlobetrottingLead,
  isEligibleBrregCompany,
  parseRegistryCsv,
} from "../lib/brreg-snapshot-ingestor";

describe("Apex proximal intermediary seed semantics", () => {
  it("keeps published assistant and adviser routes on Gatekeeper people, not on organization cards", () => {
    const person = buildApexIntermediaryEntity({
      record_type: "person",
      source_record_id: "apex-intermediary:oslo-family-office:example",
      entity_type: "Gatekeeper",
      entity_name: "Example Office Manager",
      organization_source_record_id: "apex-intermediary:oslo-family-office",
      organization_name: "Oslo Family Office",
      role: "Office Manager",
      professional_email: "office.manager@example.org",
      professional_phone: "+47 22 22 22 22",
      source_url: "https://www.example.org/team",
      source_name: "Example — official team page",
      evidence_note: "Official page lists the role and professional contact.",
    });
    const metadata = JSON.parse(person.metadata ?? "{}");
    expect(person.type).toBe("Gatekeeper");
    expect(person.email).toBe("office.manager@example.org");
    expect(person.phone).toBe("+47 22 22 22 22");
    expect(person.contactOutcome).toBe("direct_contact_candidate");
    expect(person.contactConfidence).toBe(60);
    expect(person.phoneSource).toContain("published professional route");
    expect(person.estimatedNetWorth).toBeNull();
    expect(person.knownResidences).toBeNull();
    expect(person.isHot).toBe(false);
    expect(metadata).toMatchObject({
      sourceRecordId: "apex-intermediary:oslo-family-office:example",
      scope: "person_candidate",
      role: "Office Manager",
      contactScope: "professional_person",
      contactabilityStatus: "official_professional_route_published",
      principalRelationshipStatus: "not_established",
      clientRelationshipStatus: "not_observed",
      reviewOnly: true,
      wealthStatus: "not_assessed",
      hnwiQualificationStatus: "unverified",
      personalWealthEvidence: false,
    });
  });

  it("keeps assistant role evidence even when the official team page publishes no person-specific contact", () => {
    const person = buildApexIntermediaryEntity({
      record_type: "person",
      source_record_id: "apex-intermediary:canica:example",
      entity_type: "Gatekeeper",
      entity_name: "Example Executive Assistant",
      organization_source_record_id: "apex-intermediary:canica",
      organization_name: "Canica",
      role: "Senior Executive Assistant to the CEO",
      source_url: "https://www.canica.no/our-team",
      source_name: "Canica — official team page",
      evidence_note: "Official page lists the role only.",
    });
    const metadata = JSON.parse(person.metadata ?? "{}");
    expect(person.type).toBe("Gatekeeper");
    expect(person.email).toBeNull();
    expect(person.phone).toBeNull();
    expect(person.contactOutcome).toBe("evidence_only");
    expect(person.contactConfidence).toBe(0);
    expect(person.isHot).toBe(false);
    expect(metadata).toMatchObject({
      role: "Senior Executive Assistant to the CEO",
      contactScope: "no_person_contact",
      contactabilityStatus: "no_person_specific_contact_published",
      personalWealthEvidence: false,
      reviewOnly: true,
    });
  });

  it("keeps generic office routes organization-scoped and records service lines honestly", () => {
    const organization = buildApexIntermediaryEntity({
      record_type: "organization",
      source_record_id: "apex-intermediary:dnb-private-banking",
      entity_type: "Other",
      entity_name: "DNB Private Banking",
      role: "Private banking service line",
      country: "Norway",
      organization_email: "private.banking@dnb.no",
      source_url: "https://www.dnb.no/en/personal/savings-and-investments/private-banking.html",
      source_name: "DNB — official Private Banking page",
      entity_nature: "Service line within DNB; not a separate legal entity.",
      evidence_note: "Official page describes the service and publishes the service mailbox.",
    });
    const metadata = JSON.parse(organization.metadata ?? "{}");
    // DNB Private Banking is explicitly modeled as a service line, not a separate legal entity.
    expect(organization.type).toBe("Other");
    expect(organization.email).toBe("private.banking@dnb.no");
    expect(organization.contactOutcome).toBe("organization_contact");
    expect(organization.isHot).toBe(false);
    expect(metadata).toMatchObject({
      sourceRecordId: "apex-intermediary:dnb-private-banking",
      scope: "organization",
      contactScope: "organization_only",
      contactabilityStatus: "official_organization_route_published",
      entityNature: "Service line within DNB; not a separate legal entity.",
      personalWealthEvidence: false,
      reviewOnly: true,
    });
  });
});

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
