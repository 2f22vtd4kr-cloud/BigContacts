import {
  classifyRegistryRecordType,
  normalizeUnverifiedRegistryType,
  normalizeAresEntity,
  normalizeBodaccRecord,
  normalizeBrregEntity,
  REGISTRY_IDS,
  getRandomDiscoveryRegistries,
  normalizeRegistryId,
  formatRegistryResultLead,
  registryResultLeadUrls,
  normalizeOpenCorporatesCompany,
  normalizeCompaniesHouseCompany,
  normalizeCompaniesHouseOfficer,
  normalizeSecEdgarHit,
} from "../lib/registry-client";
import { describe, expect, it } from "vitest";

describe("registry candidate classification safety", () => {
  it("never labels a Companies House officer as an HNWI from office alone", () => {
    expect(classifyRegistryRecordType("companies-house-officers")).toBe("PersonCandidate");
  });

  it("demotes legacy HNWI and Gatekeeper registry labels until adjudicated", () => {
    expect(normalizeUnverifiedRegistryType("HNWI")).toBe("PersonCandidate");
    expect(normalizeUnverifiedRegistryType("Gatekeeper")).toBe("PersonCandidate");
    expect(normalizeUnverifiedRegistryType("Corporation")).toBe("Corporation");
    expect(normalizeUnverifiedRegistryType("PersonCandidate")).toBe("PersonCandidate");
  });

  it("keeps SEC beneficial-ownership filing subjects as review candidates pending verification", () => {
    expect(classifyRegistryRecordType("sec-edgar", "SC 13D")).toBe("PersonCandidate");
    expect(classifyRegistryRecordType("sec-edgar", "SC 13G/A")).toBe("PersonCandidate");
  });

  it("treats DEF 14A as a corporate proxy-statement filer, not a personal gatekeeper", () => {
    expect(classifyRegistryRecordType("sec-edgar", "DEF 14A")).toBe("Corporation");
  });

  it("does not infer a trusted class for unrecognized registry record kinds", () => {
    expect(classifyRegistryRecordType("unknown-registry", "unknown-form")).toBe("Corporation");
  });
});

describe("registry result requires a source-backed entity name", () => {
  it("drops OpenCorporates rows with missing or blank company names", () => {
    expect(normalizeOpenCorporatesCompany({ company: { company_number: "123" } })).toBeNull();
    expect(normalizeOpenCorporatesCompany({ company: { name: "   ", company_number: "123" } })).toBeNull();
  });

  it("trims actual OpenCorporates names without inventing placeholder entities", () => {
    const result = normalizeOpenCorporatesCompany({
      company: {
        name: "  Example Holdings  ",
        company_number: "123",
        jurisdiction_code: "dk",
        opencorporates_url: "https://opencorporates.com/companies/dk/123",
      },
    });
    expect(result?.name).toBe("Example Holdings");
    expect(result?.sourceRegistries).toContain("OpenCorporates");
    expect(result?.name).not.toMatch(/^Unknown(?: Company| Officer)?$/);
  });

  it("drops Companies House company and officer rows without real names", () => {
    expect(normalizeCompaniesHouseCompany({ company_number: "123" })).toBeNull();
    expect(normalizeCompaniesHouseCompany({ title: "  " })).toBeNull();
    expect(normalizeCompaniesHouseOfficer({ officer_role: "director" })).toBeNull();
    expect(normalizeCompaniesHouseOfficer({ title: "" })).toBeNull();
  });

  it("normalizes valid Companies House names and preserves officer review status", () => {
    expect(normalizeCompaniesHouseCompany({ title: "  Example Limited  ", company_number: "123" })?.name)
      .toBe("Example Limited");
    const officer = normalizeCompaniesHouseOfficer({ title: "  Alex Example  ", officer_role: "director" });
    expect(officer?.name).toBe("Alex Example");
    expect(officer?.type).toBe("PersonCandidate");
    expect(officer?.notes).toContain("personal wealth not established");
  });

  it("drops SEC hits without an entity name and falls through blank preferred fields", () => {
    expect(normalizeSecEdgarHit({ _source: { form_type: "SC 13D" } })).toBeNull();
    const result = normalizeSecEdgarHit({
      _source: {
        entity_name: "   ",
        display_names: [{ name: " Example Person " }],
        form_type: "SC 13D",
        entity_id: "0000123",
      },
    });
    expect(result?.name).toBe("Example Person");
    expect(result?.type).toBe("PersonCandidate");
    expect(normalizeSecEdgarHit({ _source: { entity_name: "", display_names: [{ name: "" }] } })).toBeNull();
  });
});

describe("Phase J2 registry normalization", () => {
  it("surfaces validated public record URLs as unvisited leads, not observed evidence", () => {
    const result = {
      name: "Example Corp",
      type: "Corporation" as const,
      sourceRegistries: "[]",
      notes: "Registration record",
      metadata: JSON.stringify({
        brregUrl: "https://data.brreg.no/enhetsregisteret/api/enheter/123",
        website: "https://example.com/",
        searchUrl: "https://example.com/search?q=example",
        insecureUrl: "http://example.com/record",
        credentialUrl: "https://user:password@example.com/record",
      }),
    };
    expect(registryResultLeadUrls(result)).toEqual([
      "https://data.brreg.no/enhetsregisteret/api/enheter/123",
      "https://example.com/",
    ]);
    expect(formatRegistryResultLead(result)).toContain("UNVISITED_RECORD_URLS (leads only)");
    expect(formatRegistryResultLead(result)).toContain("https://data.brreg.no/enhetsregisteret/api/enheter/123");
    expect(registryResultLeadUrls({ metadata: "not-json" })).toEqual([]);
  });

  it("normalizes a BRREG entity with stable provenance", () => {
    const result = normalizeBrregEntity({
      organisasjonsnummer: "923609016",
      navn: "EQUINOR ASA",
      organisasjonsform: { kode: "ASA", beskrivelse: "Allmennaksjeselskap" },
      hjemmeside: "www.equinor.com",
      telefon: "51 99 00 00",
      forretningsadresse: {
        adresse: ["Forusbeen 50"],
        postnummer: "4035",
        poststed: "STAVANGER",
        landkode: "NO",
      },
    });

    expect(result?.name).toBe("EQUINOR ASA");
    expect(result?.nationality).toBe("NO");
    expect(JSON.parse(result?.sourceRegistries ?? "[]")).toContain("BRREG Norway — Enhetsregisteret");
    expect(JSON.parse(result?.metadata ?? "{}")).toMatchObject({
      source: "brreg-norway",
      orgnr: "923609016",
      productionReviewStatus: "review_required",
    });
  });

  it("normalizes an ARES company and keeps IČO as the identifier", () => {
    const result = normalizeAresEntity({
      ico: "00177041",
      obchodniJmeno: "Škoda Auto a.s.",
      sidlo: { textovaAdresa: "tř. Václava Klementa 869, 29301 Mladá Boleslav" },
      pravniForma: "121",
      datumVzniku: "1990-11-20",
      datumAktualizace: "2026-07-10",
    });

    expect(result?.name).toBe("Škoda Auto a.s.");
    expect(result?.knownResidences).toContain("Mladá Boleslav");
    expect(result?.notes).toContain("IČO 00177041");
    expect(JSON.parse(result?.metadata ?? "{}")).toMatchObject({
      source: "ares-czechia",
      ico: "00177041",
    });
  });

  it("normalizes BODACC as announcement evidence, not ownership proof", () => {
    const result = normalizeBodaccRecord({
      id: "B20190161225",
      dateparution: "2019-08-22",
      familleavis: "modification",
      familleavis_lib: "Modifications diverses",
      registre: ["825 037 450"],
      listepersonnes: JSON.stringify({
        personne: {
          denomination: "QUINTESSENCE",
          adresseSiegeSocial: {
            codePostal: "14250",
            ville: "Saint-Vaast-sur-Seulles",
            pays: "france",
          },
        },
      }),
    });

    expect(result?.name).toBe("QUINTESSENCE");
    expect(result?.nationality).toBe("FR");
    expect(result?.knownResidences).toContain("Saint-Vaast-sur-Seulles");
    expect(JSON.parse(result?.metadata ?? "{}")).toMatchObject({
      source: "bodacc-france",
      evidenceKind: "commercial_announcement",
      announcementId: "B20190161225",
    });
  });

  it("does not emit records without a stable source identifier", () => {
    expect(normalizeBrregEntity({ navn: "Unknown" })).toBeNull();
    expect(normalizeAresEntity({ obchodniJmeno: "Unknown" })).toBeNull();
    expect(normalizeBodaccRecord({ commercant: "Unknown" })).toBeNull();
  });

  it("registers the three J2 jurisdictions in the shared dispatch list", () => {
    expect(REGISTRY_IDS).toEqual(expect.arrayContaining(["brreg", "ares-czechia", "bodacc-france"]));
    expect(REGISTRY_IDS).not.toContain("faa");
    expect(REGISTRY_IDS).not.toContain("hmlr-ppd");
  });

  it("keeps bulk-only matrix sources out of the randomized live mix", () => {
    const randomSources = getRandomDiscoveryRegistries();
    expect(randomSources).toEqual(expect.arrayContaining([
      "brreg",
      "ares-czechia",
      "bodacc-france",
      "atoka-italy",
      "borme-spain",
      "kvk-netherlands",
      "kbo-belgium",
    ]));
    expect(randomSources).not.toContain("faa");
    expect(randomSources).not.toContain("hmlr-ppd");
  });

  it("normalizes Investigator registry aliases before dispatch", () => {
    expect(normalizeRegistryId("sec edgar")).toBe("sec-edgar");
    expect(normalizeRegistryId("SEC_EDGAR")).toBe("sec-edgar");
    expect(normalizeRegistryId("companies house")).toBe("companies-house");
    expect(normalizeRegistryId("sec-edgar")).toBe("sec-edgar");
    expect(normalizeRegistryId("unknown-registry")).toBeNull();
  });
});
