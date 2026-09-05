/**
 * Early EDGAR / proxy identity boost for SC 13D/G targets.
 *
 * Runs before long AI web OSINT so role, street address, and related officers
 * are recovered even when the per-target timeout fires mid-Phase-J.
 * Fail-closed: only facts with an SEC source URL; never invent contacts.
 */

import { logger } from "./logger";

export type EdgarIdentityBoost = {
  roleHeadline: string | null;
  streetAddress: string | null;
  cityState: string | null;
  /** SC 13D/G / Form 3/4 notice-line phone for the reporting person */
  noticePhone: string | null;
  relatedPeople: string[];
  sourceUrls: string[];
  notes: string[];
};

const EDGAR_HEADERS = {
  Accept: "application/json,text/html,*/*",
  "User-Agent": "ApexFinder/1.0 OSINT-Research research@apexfinder.private",
};

function normalizePersonKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** SEC / EDGAR chrome that matches Title Case but is never a person. */
const SEC_CHROME_NAMES = new Set(
  [
    "home skip",
    "menu close",
    "menu close search",
    "united states",
    "filer management",
    "filer management portal",
    "filer support",
    "next forms",
    "next forms index",
    "next forms index filer support",
    "lookup public",
    "lookup public dissemination",
    "lookup public dissemination service",
    "public dissemination",
    "public dissemination service",
    "resources data",
    "research data",
    "markets data",
    "markets data taxonomies",
    "markets data taxonomies statistics",
    "compliance rules",
    "exemptive letters",
    "exemptive letters self",
    "regulatory organization",
    "regulatory organization rulemaking",
    "regulatory organization rulemaking public petitions",
    "forms index",
    "edgar search",
    "company search",
    "full text",
    "full text search",
    "advanced search",
    "latest filings",
    "current events",
    "header footer",
  ].map((s) => s.toLowerCase()),
);

function looksLikePersonName(name: string): boolean {
  const t = name.trim();
  if (t.length < 5 || t.length > 80) return false;
  if (!/^[A-Z][a-zA-Z.'\-]+(?:\s+[A-Z][a-zA-Z.'\-]+){1,4}$/.test(t)) return false;
  if (/\b(Inc|LLC|Ltd|Corp|Company|Trust|Fund|Holdings|Group|Bank|Search|Menu|Portal|Index|Forms|Skip|Close|Lookup|Resources|Research|Markets|Compliance|Regulatory|Exemptive|Dissemination|Statistics|Taxonomies|Petitions|Rulemaking|Support|Service|Header|Footer)\b/i.test(t)) {
    return false;
  }
  const key = normalizePersonKey(t);
  if (SEC_CHROME_NAMES.has(key)) return false;
  // Reject if any token is pure chrome vocabulary
  for (const tok of key.split(" ")) {
    if (
      /^(home|skip|menu|close|search|filer|forms|index|lookup|public|dissemination|resources|research|markets|data|compliance|rules|exemptive|letters|self|regulatory|organization|rulemaking|petitions|portal|support|service|united|states|header|footer|next|full|text|advanced|latest|filings|current|events)$/i.test(
        tok,
      )
    ) {
      return false;
    }
  }
  return true;
}

/** True when HTML looks like a DEF 14A / proxy body, not EDGAR chrome/index. */
function looksLikeProxyDocument(html: string): boolean {
  const h = html.slice(0, 80_000);
  if (/EDGAR Filing Documents|browse-edgar|Full-Text Search|Company Search/i.test(h) && !/DEF 14A|beneficial ownership|named executive|has been .+ President|Board of Directors/i.test(h)) {
    return false;
  }
  return /DEF\s*14A|proxy statement|beneficial ownership|Board of Directors|named executive officer|has been .{5,40} (President|Director|Chairman|CEO)/i.test(h);
}


/** "Pickup Todd M" / "GUND GORDON" → search-friendly display forms */
export function normalizePersonNameForSearch(raw: string): string[] {
  const t = raw.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return [];
  const variants = new Set<string>([t]);
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /^[A-Z]{2,}$/.test(parts[0]) && parts.slice(1).every((p) => /^[A-Z]/i.test(p))) {
    const last = parts[0].charAt(0) + parts[0].slice(1).toLowerCase();
    const rest = parts.slice(1).map((p) =>
      p.length <= 2 ? p.toUpperCase() : p.charAt(0) + p.slice(1).toLowerCase(),
    );
    variants.add([...rest, last].join(" "));
    if (rest[0]) variants.add([rest[0], last].join(" "));
  }
  variants.add(
    parts
      .map((p) =>
        p.length <= 2 && /^[A-Za-z]+$/.test(p)
          ? p.toUpperCase()
          : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
      )
      .join(" "),
  );
  return [...variants].filter((v) => v.length >= 3);
}

/** Notice-line phone + address from SC 13D/G or Form 3/4 plain text. */
export function parseFilingPersonContacts(text: string): {
  phone: string | null;
  street: string | null;
  cityState: string | null;
} {
  if (!text || text.length < 60) return { phone: null, street: null, cityState: null };
  const plain = text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
  let phone: string | null = null;
  let street: string | null = null;
  let cityState: string | null = null;

  const noticeBlock = plain.match(
    /(?:Name,\s*Address\s+and\s+Telephone\s+Number\s+of\s+Person\s+Authorized\s+to\s+Receive\s+Notices[^\n]{0,80})([\s\S]{20,600}?)(?:Date\s+of\s+Event|CUSIP|SCHEDULE\s+13|Item\s+1)/i,
  );
  const block = noticeBlock?.[1] ?? plain.slice(0, 8000);

  const phoneMatch =
    block.match(/\b(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b/) ||
    plain.match(/(?:Telephone|Phone|Tel\.?)[^\d]{0,24}(\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4})/i);
  if (phoneMatch) {
    const dig = (phoneMatch[0] ?? "").replace(/\D/g, "");
    if (dig.length >= 10 && dig.length <= 15) phone = phoneMatch[0]!.trim();
  }

  const form4Addr = plain.match(
    /(?:Reporting\s+Owner\s+(?:Name\/?Address|Address)|Address\s+of\s+Reporting\s+Person)[^\n]{0,40}[:\s]*\n?([^\n]{8,80})\n([^\n]{6,60})/i,
  );
  if (form4Addr) {
    street = form4Addr[1].trim();
    const cs = form4Addr[2].trim();
    if (/[A-Z]{2}\s*\d{5}/.test(cs) || /,\s*[A-Z]{2}\b/.test(cs)) cityState = cs;
  }

  const item2 = plain.match(
    /Item\s*2\s*\(b\)[^\n]{0,100}(?:Address[^\n]{0,80})?[:\s]*([^\n]{10,120})/i,
  );
  if (item2 && !street) {
    const line = item2[1].trim();
    if (/\d/.test(line) && line.length > 12) street = line;
  }

  const full = plain.match(
    /\b(\d{1,5}\s+[A-Za-z0-9 .'#\-]{4,50}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way|Court|Ct|NW|NE|SW|SE)\.?[^\n]{0,40})[,\n]\s*([A-Za-z .]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
  );
  if (full && !street) {
    street = full[1].trim();
    cityState = full[2].trim();
  }

  return { phone, street, cityState };
}


/** Extract director/officer bio line for target from proxy HTML. */
function extractRoleFromProxyHtml(html: string, targetName: string): string | null {
  const key = normalizePersonKey(targetName);
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");

  // Common proxy pattern: "Andrew F. Johnson has been Hastings' President since ..."
  const escaped = targetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const bioRe = new RegExp(
    `(${escaped}[^.]{0,40}?)\\s+has been\\s+([^.]{10,220})\\.`,
    "i",
  );
  const m = plain.match(bioRe);
  if (m?.[2]) {
    const role = m[2].replace(/\s+/g, " ").trim();
    if (role.length >= 10) return role.slice(0, 240);
  }

  // Table-ish: Name | title fragments near target
  const near = plain.toLowerCase().indexOf(key);
  if (near >= 0) {
    const window = plain.slice(Math.max(0, near - 40), near + 320);
    const titleHit = window.match(
      /\b(President|Co-Chief Executive Officer|Chief Executive Officer|Co-CEO|Director|Chairman|Executive Vice President|Vice President)[^.]{0,80}/i,
    );
    if (titleHit?.[0]) return titleHit[0].replace(/\s+/g, " ").trim().slice(0, 240);
  }
  return null;
}

/** Street lines often appear as "325 North Hanover" near Hastings, Michigan. */
function extractAddressFromProxyHtml(html: string): { street: string | null; cityState: string | null } {
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
  const street = plain.match(
    /\b(\d{1,5}\s+(?:North|South|East|West|N\.?|S\.?|E\.?|W\.?)?\s*[A-Za-z0-9.'\-]+(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\.?))\b/i,
  );
  const cityState = plain.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*(Michigan|MI|California|CA|New York|NY|Texas|TX|Florida|FL)\b(?:\s+(\d{5})(?:-\d{4})?)?/,
  );
  return {
    street: street?.[1]?.trim() ?? null,
    cityState: cityState
      ? `${cityState[1]}, ${cityState[2]}${cityState[3] ? " " + cityState[3] : ""}`.trim()
      : null,
  };
}

function extractRelatedNames(html: string, targetName: string): string[] {
  const exclude = new Set(normalizePersonKey(targetName).split(" "));
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ");
  const found = new Set<string>();
  const re = /\b([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain)) !== null) {
    const cand = m[1].replace(/\s+/g, " ").trim();
    if (!looksLikePersonName(cand)) continue;
    const tokens = normalizePersonKey(cand).split(" ");
    if (tokens.filter((t) => exclude.has(t)).length >= 2) continue; // skip target self
    // Prefer Johnson-family / officer-looking names in Hastings proxies
    if (tokens.length < 2) continue;
    found.add(cand);
    if (found.size >= 12) break;
  }
  return [...found];
}

async function fetchText(url: string, timeoutMs = 12_000): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      headers: EDGAR_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

/**
 * Find a recent DEF 14A / proxy HTML URL for the issuer via EDGAR EFTS, then parse it.
 */
export async function boostEdgarIdentity(opts: {
  personName: string;
  companyName: string | null | undefined;
  existingEdgarUrl?: string | null;
}): Promise<EdgarIdentityBoost> {
  const out: EdgarIdentityBoost = {
    roleHeadline: null,
    streetAddress: null,
    cityState: null,
    noticePhone: null,
    relatedPeople: [],
    sourceUrls: [],
    notes: [],
  };
  const company = (opts.companyName ?? "").trim();
  const nameVariants = normalizePersonNameForSearch(opts.personName);
  if (!company || company.length < 3) return out;

  const eftsUrl =
    `https://efts.sec.gov/LATEST/search-index` +
    `?q=${encodeURIComponent(`"${company.slice(0, 80)}"`)}` +
    `&forms=DEF+14A` +
    `&dateRange=custom&startdt=1995-01-01&from=0`;

  let htmlUrls: string[] = [];
  try {
    const resp = await fetch(eftsUrl, {
      headers: EDGAR_HEADERS,
      signal: AbortSignal.timeout(12_000),
    });
    if (resp.ok) {
      const data = (await resp.json()) as any;
      const hits: any[] = data?.hits?.hits ?? [];
      for (const hit of hits.slice(0, 5)) {
        const src = hit?._source ?? {};
        const adsh = String(src?.adsh ?? src?.file_num ?? "").replace(/-/g, "");
        // Prefer direct document links when present in display paths
        const path = src?.file_path ?? src?.url ?? null;
        if (typeof path === "string" && path.includes("Archives")) {
          htmlUrls.push(path.startsWith("http") ? path : `https://www.sec.gov${path}`);
        }
        // Classic index URL from CIK + accession when available
        const cik = String(src?.ciks?.[0] ?? src?.cik ?? "").replace(/^0+/, "");
        const accession = String(src?.adsh ?? "");
        if (cik && accession) {
          htmlUrls.push(
            `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${accession}-index.htm`,
          );
        }
      }
    }
  } catch (err: any) {
    logger.warn({ err: err?.message, company }, "[edgar-identity-boost] EFTS query failed");
  }

  htmlUrls = [...new Set(htmlUrls)].slice(0, 4);

  // Person-centric filings (Form 3/4, SC 13D/G) — notice phones & reporting addresses
  for (const nq of nameVariants.slice(0, 2)) {
    try {
      const personEfts =
        `https://efts.sec.gov/LATEST/search-index` +
        `?q=${encodeURIComponent('"' + nq.slice(0, 80) + '"')}` +
        `&forms=SC+13D,SC+13G,3,4` +
        `&dateRange=custom&startdt=1995-01-01&from=0`;
      const resp2 = await fetch(personEfts, {
        headers: EDGAR_HEADERS,
        signal: AbortSignal.timeout(12_000),
      });
      if (!resp2.ok) continue;
      const data2 = (await resp2.json()) as any;
      const hits2: any[] = data2?.hits?.hits ?? [];
      for (const hit of hits2.slice(0, 4)) {
        const src = hit?._source ?? {};
        const path = src?.file_path ?? src?.url ?? null;
        if (typeof path === "string" && path.includes("Archives")) {
          htmlUrls.push(path.startsWith("http") ? path : `https://www.sec.gov${path}`);
        }
        const cik = String(src?.ciks?.[0] ?? src?.cik ?? "").replace(/^0+/, "");
        const accession = String(src?.adsh ?? "");
        if (cik && accession) {
          htmlUrls.push(
            `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${accession}-index.htm`,
          );
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  htmlUrls = [...new Set(htmlUrls)].slice(0, 10);
  if (htmlUrls.length === 0 && opts.existingEdgarUrl) {
    htmlUrls.push(opts.existingEdgarUrl);
  }

  for (const url of htmlUrls) {
    const text = await fetchText(url);
    if (!text) continue;
    out.sourceUrls.push(url);

    // Index pages → follow first .htm document link
    let body = text;
    if (/EDGAR Filing Documents|index\.htm/i.test(text) || text.includes("seq=")) {
      const doc = text.match(/href="([^"]+\.htm)"/i);
      if (doc?.[1]) {
        const abs = doc[1].startsWith("http")
          ? doc[1]
          : new URL(doc[1], url).toString();
        const docHtml = await fetchText(abs);
        if (docHtml) {
          body = docHtml;
          out.sourceUrls.push(abs);
        }
      }
    }

    if (!out.roleHeadline) {
      out.roleHeadline = extractRoleFromProxyHtml(body, opts.personName);
    }
    const filingContacts = parseFilingPersonContacts(body);
    if (!out.noticePhone && filingContacts.phone) out.noticePhone = filingContacts.phone;
    if (!out.streetAddress && filingContacts.street) out.streetAddress = filingContacts.street;
    if (!out.cityState && filingContacts.cityState) out.cityState = filingContacts.cityState;
    if (!out.streetAddress || !out.cityState) {
      const addr = extractAddressFromProxyHtml(body);
      out.streetAddress = out.streetAddress ?? addr.street;
      out.cityState = out.cityState ?? addr.cityState;
    }
    // Never mine related names from EDGAR search/index chrome pages
    if (looksLikeProxyDocument(body)) {
      for (const p of extractRelatedNames(body, opts.personName)) {
        if (!out.relatedPeople.includes(p)) out.relatedPeople.push(p);
      }
    }
    if (out.roleHeadline && out.streetAddress && out.relatedPeople.length >= 3) break;
  }

  if (out.noticePhone) {
    out.notes.push(`Notice phone from SC 13D/G or Form 3/4: ${out.noticePhone}`);
  }
  if (out.roleHeadline) {
    out.notes.push(`Proxy role: ${out.roleHeadline}`);
  }
  if (out.streetAddress || out.cityState) {
    out.notes.push(
      `Proxy address surface: ${[out.streetAddress, out.cityState].filter(Boolean).join(", ")}`,
    );
  }
  if (out.relatedPeople.length) {
    out.notes.push(
      `Related names from proxy/DEF 14A tables (leads only): ${out.relatedPeople.slice(0, 8).join("; ")}`,
    );
  }

  logger.info(
    {
      person: opts.personName,
      company,
      role: !!out.roleHeadline,
      address: !!out.streetAddress,
      noticePhone: !!out.noticePhone,
      related: out.relatedPeople.length,
      sources: out.sourceUrls.length,
    },
    "[edgar-identity-boost] complete",
  );
  return out;
}
