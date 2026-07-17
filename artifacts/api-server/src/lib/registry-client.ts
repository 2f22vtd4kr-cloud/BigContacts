/**
 * Live Registry Client — fetches real entity data from public OSINT registries.
 *
 * Supported registries:
 *   - OpenCorporates  (free, no key, ~50 req/day)
 *   - Companies House UK (free API key required: COMPANIES_HOUSE_API_KEY)
 *
 * Returns normalised RegistryResult[] ready to be inserted as EntityInput.
 */

export interface RegistryResult {
  name: string;
  type: "Corporation" | "HNWI" | "Gatekeeper";
  nationality?: string;
  knownResidences?: string;
  sourceRegistries: string; // JSON array string
  notes?: string;
  metadata?: string; // JSON object string — raw registry payload
}

export interface RegistrySearchParams {
  query: string;
  registry: "opencorporates" | "companies-house";
  limit?: number;
}

// ─── OpenCorporates ──────────────────────────────────────────────────────────
// Free tier, no API key, rate-limited at 50 requests/day.
// Docs: https://api.opencorporates.com/v0.4/

async function searchOpenCorporates(
  query: string,
  limit: number,
): Promise<RegistryResult[]> {
  const url =
    `https://api.opencorporates.com/v0.4/companies/search` +
    `?q=${encodeURIComponent(query)}` +
    `&per_page=${Math.min(limit, 20)}` +
    `&order=score`;

  const resp = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ApexFinder/1.0 OSINT-Intelligence-Platform",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(
      `OpenCorporates ${resp.status}: ${body.slice(0, 200) || resp.statusText}`,
    );
  }

  const data = (await resp.json()) as any;
  const companies: any[] = data?.results?.companies ?? [];

  return companies.map((item: any) => {
    const co = item?.company ?? {};
    const jcode: string = co?.jurisdiction_code ?? "";
    const jurisdiction = (jcode.split("_")[0]?.toUpperCase() ?? jcode.toUpperCase()) || "Unknown";

    const addr = co?.registered_address;
    const addrStr = addr
      ? [addr.street_address, addr.locality, addr.country]
          .filter(Boolean)
          .join(", ")
      : undefined;

    return {
      name: co?.name ?? "Unknown Company",
      type: "Corporation" as const,
      nationality: jurisdiction || undefined,
      knownResidences: addrStr,
      sourceRegistries: JSON.stringify(["OpenCorporates", `${jurisdiction} Registry`]),
      notes: [
        `Reg #${co?.company_number ?? "—"}`,
        co?.company_type ? `Type: ${co.company_type}` : null,
        co?.current_status ? `Status: ${co.current_status}` : null,
        co?.incorporation_date ? `Inc: ${co.incorporation_date}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
      metadata: JSON.stringify({
        source: "opencorporates",
        companyNumber: co?.company_number,
        jurisdictionCode: co?.jurisdiction_code,
        companyType: co?.company_type,
        currentStatus: co?.current_status,
        incorporationDate: co?.incorporation_date,
        openCorporatesUrl: co?.opencorporates_url,
      }),
    };
  });
}

// ─── Companies House UK ───────────────────────────────────────────────────────
// Free API key: https://developer.company-information.service.gov.uk/
// Key is used as HTTP Basic Auth username (empty password).
// Searches both companies AND officers (people) — officers become HNWI candidates.

async function searchCompaniesHouse(
  query: string,
  apiKey: string,
  limit: number,
): Promise<RegistryResult[]> {
  const auth = `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
  const headers = { Authorization: auth, Accept: "application/json" };
  const signal = AbortSignal.timeout(10_000);
  const n = Math.min(limit, 20);

  const [companiesResp, officersResp] = await Promise.all([
    fetch(
      `https://api.company-information.service.gov.uk/search/companies` +
        `?q=${encodeURIComponent(query)}&items_per_page=${n}`,
      { headers, signal },
    ),
    fetch(
      `https://api.company-information.service.gov.uk/search/officers` +
        `?q=${encodeURIComponent(query)}&items_per_page=${Math.min(limit, 10)}`,
      { headers, signal },
    ),
  ]);

  const results: RegistryResult[] = [];

  // Companies
  if (companiesResp.ok) {
    const data = (await companiesResp.json()) as any;
    for (const item of data?.items ?? []) {
      const addr = item?.registered_office_address;
      const addrStr = addr
        ? [addr.premises, addr.address_line_1, addr.locality, addr.postal_code, addr.country]
            .filter(Boolean)
            .join(", ")
        : undefined;

      results.push({
        name: item?.title ?? "Unknown Company",
        type: "Corporation",
        nationality: "GB",
        knownResidences: addrStr,
        sourceRegistries: JSON.stringify(["Companies House UK"]),
        notes: [
          `Reg #${item?.company_number ?? "—"}`,
          item?.company_type ? `Type: ${item.company_type}` : null,
          item?.company_status ? `Status: ${item.company_status}` : null,
          item?.date_of_creation ? `Created: ${item.date_of_creation}` : null,
          item?.sic_codes?.length ? `SIC: ${item.sic_codes.join(", ")}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
        metadata: JSON.stringify({
          source: "companies-house",
          companyNumber: item?.company_number,
          companyType: item?.company_type,
          companyStatus: item?.company_status,
          dateOfCreation: item?.date_of_creation,
          sicCodes: item?.sic_codes,
        }),
      });
    }
  }

  // Officers (people) — high-value contacts / potential HNWIs
  if (officersResp.ok) {
    const data = (await officersResp.json()) as any;
    for (const item of data?.items ?? []) {
      const addr = item?.address;
      const addrStr = addr
        ? [addr.premises, addr.address_line_1, addr.locality, addr.postal_code, addr.country]
            .filter(Boolean)
            .join(", ")
        : undefined;

      const dob = item?.date_of_birth;
      const dobStr = dob ? `${dob.month}/${dob.year}` : null;

      results.push({
        name: item?.title ?? "Unknown Officer",
        type: "HNWI",
        nationality: item?.nationality ?? undefined,
        knownResidences: addrStr,
        sourceRegistries: JSON.stringify(["Companies House UK (Officers)"]),
        notes: [
          item?.officer_role ? `Role: ${item.officer_role}` : null,
          dobStr ? `DOB: ${dobStr}` : null,
          item?.occupation ? `Occupation: ${item.occupation}` : null,
          item?.appointed_on ? `Appointed: ${item.appointed_on}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
        metadata: JSON.stringify({
          source: "companies-house-officers",
          officerRole: item?.officer_role,
          dateOfBirth: item?.date_of_birth,
          nationality: item?.nationality,
          occupation: item?.occupation,
          appointedOn: item?.appointed_on,
        }),
      });
    }
  }

  return results;
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function searchRegistry(
  params: RegistrySearchParams,
): Promise<RegistryResult[]> {
  const { query, registry, limit = 10 } = params;

  if (!query.trim()) throw new Error("Search query cannot be empty.");

  if (registry === "opencorporates") {
    return searchOpenCorporates(query.trim(), limit);
  }

  if (registry === "companies-house") {
    const apiKey = process.env["COMPANIES_HOUSE_API_KEY"];
    if (!apiKey) {
      throw new Error(
        "COMPANIES_HOUSE_API_KEY is not configured. " +
          "Register for a free key at https://developer.company-information.service.gov.uk/ " +
          "and set it as an environment variable.",
      );
    }
    return searchCompaniesHouse(query.trim(), apiKey, limit);
  }

  throw new Error(`Unknown registry: "${registry}". Use "opencorporates" or "companies-house".`);
}
