describe("language-neutral registry query construction", () => {
  it("passes native-script Atoka queries unchanged and does not force English", () => {
    const queries = [
      "власник казино Порторож акціонери",
      "مالك كازينو بورتوروز استثمار",
      "赌场波尔托罗什主要股东",
      "カジノ ポルトロシュ 主要株主",
      "Portorož kaszinó tulajdonos koncesszió",
    ];
    for (const query of queries) {
      const url = new URL(buildAtokaStartupSearchUrl(query, 99));
      expect(url.searchParams.get("text")).toBe(query);
      expect(url.searchParams.get("lang")).toBeNull();
      expect(url.searchParams.get("size")).toBe("10");
    }
  });

  it("passes native-script BORME queries unchanged without forcing an API response language", () => {
    const queries = [
      "власник казино Порторож акціонери",
      "مالك كازينو بورتوروز استثمار",
      "赌场波尔托罗什主要股东",
      "カジノ ポルトロシュ 主要株主",
      "propietario de la empresa y concesionario",
    ];
    for (const query of queries) {
      const url = new URL(buildBormeSearchUrl(query, 99));
      expect(url.searchParams.get("q")).toBe(query);
      expect(url.searchParams.get("lang")).toBeNull();
      expect(url.searchParams.get("collection")).toBe("BORME");
      expect(url.searchParams.get("hits")).toBe("20");
    }
  });
});

describe("language-neutral KBO query construction", () => {
  it("preserves query text in every script and leaves the endpoint locale unforced", () => {
    const queries = [
      "власник казино Порторож акціонери",
      "مالك كازينو بورتوروز استثمار",
      "赌场波尔托罗什主要股东",
      "カジノ ポルトロシュ 主要株主",
      "카지노 소유주 및 운영자",
    ];
    for (const query of queries) {
      const url = new URL(buildKboBelgiumSearchUrl(query, 99));
      expect(url.searchParams.get("searchWord")).toBe(query);
      expect(url.searchParams.get("lang")).toBeNull();
      expect(url.searchParams.get("numberOfResults")).toBe("10");
    }
  });
});

describe("OffeneRegister SQL API request contract", () => {
  it("uses Datasette's custom-SQL JSON route, object rows and bound query parameter", () => {
    const url = new URL(buildOffeneregisterSearchUrl("GmbH' OR 1=1 --", 999));
    expect(url.origin + url.pathname).toBe("https://db.offeneregister.de/openregister-ef9e802/-/query.json");
    expect(url.searchParams.get("sql")).toContain("FROM company");
    expect(url.searchParams.get("sql")).toContain("company.name LIKE :p0");
    expect(url.searchParams.get("sql")).not.toContain("GmbH");
    expect(url.searchParams.get("sql")).toContain("company.name AS name");
    expect(url.searchParams.get("p0")).toBe("%GmbH' OR 1=1 --%");
    expect(url.searchParams.get("_shape")).toBe("objects");
    expect(url.searchParams.get("_extra")).toBe("columns");
    expect(url.searchParams.get("sql")).toContain("LIMIT 20");
  });

  it("bounds empty, overlong and non-finite requests before building the URL", () => {
    expect(new URL(buildOffeneregisterSearchUrl("   ", 0)).searchParams.get("p0")).toBe("%%");
    expect(new URL(buildOffeneregisterSearchUrl("A".repeat(300), Number.POSITIVE_INFINITY)).searchParams.get("p0")).toBe("%" + "A".repeat(180) + "%");
    expect(new URL(buildOffeneregisterSearchUrl("Test", Number.POSITIVE_INFINITY)).searchParams.get("sql")).toContain("LIMIT 10");
  });
});

import {
  classifyRegistryRecordType,
  normalizeUnverifiedRegistryType,
  normalizeAresEntity,
  normalizeBodaccRecord,
  normalizeBrregEntity,
  REGISTRY_IDS,
  getAvailableRegistryIds,
  isRegistryProviderAvailable,
  getRandomDiscoveryRegistries,
  normalizeRegistryId,
  formatRegistryResultLead,
  registryResultLeadUrls,
  normalizeOpenCorporatesCompany,
  normalizeCompaniesHouseCompany,
  normalizeCompaniesHouseOfficer,
  normalizeSecEdgarHit,
  buildOffeneregisterSearchUrl,
  buildAtokaStartupSearchUrl,
  buildBormeSearchUrl,
  buildKboBelgiumSearchUrl,
  buildFaaAircraftSearchUrl,
  normalizeFaaAircraftDetail,
} from "../lib/registry-client";
import { REGISTRY_COVERAGE_MATRIX } from "../lib/registry-matrix";
import { afterEach, describe, expect, it, vi } from "vitest";

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

  it("normalizes valid Companies House names and preserves official record URLs as unvisited leads", () => {
    const company = normalizeCompaniesHouseCompany({
      title: "  Example Limited  ",
      company_number: "12345678",
    });
    expect(company?.name).toBe("Example Limited");
    expect(registryResultLeadUrls(company!)).toContain(
      "https://find-and-update.company-information.service.gov.uk/company/12345678",
    );

    const officer = normalizeCompaniesHouseOfficer({
      title: "  Alex Example  ",
      officer_role: "director",
      links: { self: "/officers/abc123def456/appointments" },
    });
    expect(officer?.name).toBe("Alex Example");
    expect(officer?.type).toBe("PersonCandidate");
    expect(officer?.notes).toContain("personal wealth not established");
    expect(registryResultLeadUrls(officer!)).toContain(
      "https://find-and-update.company-information.service.gov.uk/officers/abc123def456/appointments",
    );
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
        tooLongUrl: "https://example.com/record?" + "q".repeat(600),
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


describe("registry capability availability", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not advertise key-gated registries when credentials are absent", () => {
    vi.stubEnv("OPENCORPORATES_API_TOKEN", "");
    vi.stubEnv("OPENCORPORATES_API_KEY", "");
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "");

    const available = getAvailableRegistryIds();
    expect(available).toContain("sec-edgar");
    expect(available).not.toContain("opencorporates");
    expect(available).not.toContain("companies-house");
    expect(isRegistryProviderAvailable("opencorporates")).toBe(false);
    expect(isRegistryProviderAvailable("companies-house")).toBe(false);
  });

  it("keeps the unsupported Swedish adapter out of runtime choices and labels its coverage honestly", () => {
    expect(getAvailableRegistryIds()).not.toContain("bolagsverket-sweden");
    expect(getRandomDiscoveryRegistries()).not.toContain("bolagsverket-sweden");
    expect(isRegistryProviderAvailable("bolagsverket-sweden")).toBe(false);
    const sweden = REGISTRY_COVERAGE_MATRIX.find((source) => source.id === "bolagsverket-sweden");
    expect(sweden?.runtimeAdapterImplemented).toBe(false);
    expect(sweden?.accessMethod).toMatch(/unavailable|no supported direct-search/i);
    expect(sweden?.freshness).toBe("Unavailable");
  });

  it("does not advertise the unverified Dutch OpenKvK mirror and labels coverage honestly", () => {
    expect(getAvailableRegistryIds()).not.toContain("kvk-netherlands");
    expect(getRandomDiscoveryRegistries()).not.toContain("kvk-netherlands");
    expect(isRegistryProviderAvailable("kvk-netherlands")).toBe(false);
    const dutch = REGISTRY_COVERAGE_MATRIX.find((source) => source.id === "kvk-netherlands");
    expect(dutch?.runtimeAdapterImplemented).toBe(false);
    expect(dutch?.accessMethod).toMatch(/unavailable|official KVK API/i);
    expect(dutch?.freshness).toBe("Unavailable");
  });

  it("keeps German Open Register gated until runtime verification and labels coverage honestly", () => {
    vi.stubEnv("APEX_ENABLE_OFFENEREGISTER_GERMANY", "");
    expect(getAvailableRegistryIds()).not.toContain("offeneregister-germany");
    expect(getRandomDiscoveryRegistries()).not.toContain("offeneregister-germany");
    expect(isRegistryProviderAvailable("offeneregister-germany")).toBe(false);
    const germany = REGISTRY_COVERAGE_MATRIX.find((source) => source.id === "offeneregister-germany");
    expect(germany?.runtimeAdapterImplemented).toBe(true);
    expect(germany?.accessMethod).toMatch(/disabled by default.*live runtime smoke test/i);
    expect(germany?.freshness).toMatch(/unverified/i);
  });

  it("advertises OpenCorporates only when a token is configured", () => {
    vi.stubEnv("OPENCORPORATES_API_TOKEN", "test-token");
    vi.stubEnv("OPENCORPORATES_API_KEY", "");
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "");

    expect(getAvailableRegistryIds()).toContain("opencorporates");
    expect(isRegistryProviderAvailable("opencorporates")).toBe(true);
  });
});


describe("FAA Aircraft Registry adapter", () => {
  it("uses official FAA HTTPS endpoints for grounded registrant names and N-numbers", () => {
    const byName = new URL(buildFaaAircraftSearchUrl("Example Aviation LLC"));
    expect(byName.origin).toBe("https://registry.faa.gov"); expect(byName.pathname).toBe("/AircraftInquiry/Search/NameResult");
    expect(byName.searchParams.get("nametxt")).toBe("Example Aviation LLC"); expect(byName.searchParams.get("sort_option")).toBe("4");
    const byNNumber = new URL(buildFaaAircraftSearchUrl("N123AB"));
    expect(byNNumber.pathname).toBe("/AircraftInquiry/Search/NNumberResult"); expect(byNNumber.searchParams.get("NNumbertxt")).toBe("N123AB");
    expect(() => buildFaaAircraftSearchUrl("  ")).toThrow(/cannot be empty/i);
  });
  it("normalizes registrant and aircraft fields without promoting a person to HNWI", () => {
    const sourceUrl = "https://registry.faa.gov/AircraftInquiry/Search/NNumberResult?NNumbertxt=N123AB";
    const html = "<html><body><table><tr><td>Serial Number</td><td>ABC-123</td><td>Status</td><td>Valid</td></tr>" +
      "<tr><td>Manufacturer Name</td><td>CESSNA</td><td>Model</td><td>510</td></tr><tr><td>Type Registration</td><td>LLC</td><td>Fractional Owner</td><td>No</td></tr></table>" +
      "<table><tr><td>Name</td><td>EXAMPLE AVIATION LLC</td></tr></table></body></html>";
    const result = normalizeFaaAircraftDetail(html, sourceUrl);
    expect(result?.name).toBe("EXAMPLE AVIATION LLC"); expect(result?.type).toBe("Corporation");
    expect(result?.sourceRegistries).toContain("FAA Aircraft Registry"); expect(result?.notes).toContain("does not establish beneficial ownership");
    expect(JSON.parse(result?.metadata ?? "{}")).toMatchObject({ nNumber: "N123AB", manufacturer: "CESSNA", model: "510", registrationStatus: "Valid", sourceUrl });
  });
  it("rejects unrelated, insecure, or registrant-withheld pages rather than inventing an entity", () => {
    expect(normalizeFaaAircraftDetail("<html><body>No records found</body></html>", "https://registry.faa.gov/AircraftInquiry/Search/NNumberResult?NNumbertxt=N123AB")).toBeNull();
    expect(normalizeFaaAircraftDetail("<table></table>", "http://registry.faa.gov/AircraftInquiry/Search/NNumberResult?NNumbertxt=N123AB")).toBeNull();
    expect(normalizeFaaAircraftDetail("<table></table>", "https://example.com/AircraftInquiry/Search/NNumberResult?NNumbertxt=N123AB")).toBeNull();
  });
  it("makes FAA a selectable registry and a mixed-source discovery option", () => {
    expect(REGISTRY_IDS).toContain("faa"); expect(getAvailableRegistryIds()).toContain("faa"); expect(getRandomDiscoveryRegistries()).toContain("faa");
    expect(REGISTRY_COVERAGE_MATRIX.find((entry) => entry.id === "faa")?.runtimeAdapterImplemented).toBe(true);
  });
});
