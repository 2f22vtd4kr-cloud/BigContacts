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

function looksLikePersonName(name: string): boolean {
  const t = name.trim();
  if (t.length < 5 || t.length > 80) return false;
  if (!/^[A-Z][a-zA-Z.'\-]+(?:\s+[A-Z][a-zA-Z.'\-]+){1,4}$/.test(t)) return false;
  if (/\b(Inc|LLC|Ltd|Corp|Company|Trust|Fund|Holdings|Group|Bank)\b/i.test(t)) return false;
  return true;
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
    relatedPeople: [],
    sourceUrls: [],
    notes: [],
  };
  const company = (opts.companyName ?? "").trim();
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

  htmlUrls = [...new Set(htmlUrls)].slice(0, 6);
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
    if (!out.streetAddress || !out.cityState) {
      const addr = extractAddressFromProxyHtml(body);
      out.streetAddress = out.streetAddress ?? addr.street;
      out.cityState = out.cityState ?? addr.cityState;
    }
    for (const p of extractRelatedNames(body, opts.personName)) {
      if (!out.relatedPeople.includes(p)) out.relatedPeople.push(p);
    }
    if (out.roleHeadline && out.streetAddress && out.relatedPeople.length >= 3) break;
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
      related: out.relatedPeople.length,
      sources: out.sourceUrls.length,
    },
    "[edgar-identity-boost] complete",
  );
  return out;
}
