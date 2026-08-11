/**
 * Materialize bureau / discovery contact evidence onto durable contact_evidence
 * rows so HNWI profile cards show related routes without waiting for a full
 * deep-web enrich pass.
 */
import { db, contactEvidenceTable, entitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sanitizePublicEmail, sanitizePublicPhone, isTrashContactValue } from "./contact-validation";
import { logger } from "./logger";

export type BureauContactLike = {
  vectorType?: string | null;
  value?: string | null;
  scope?: string | null;
  personName?: string | null;
  role?: string | null;
  sourceUrls?: string[] | null;
  note?: string | null;
  tier?: string | null;
  state?: string | null;
};

function mapVectorType(raw: string, value: string): string {
  const t = raw.toLowerCase().trim();
  if (t === "email" || t === "phone" || t === "website" || t === "domain" || t === "address" || t === "social") {
    return t;
  }
  if (t === "linkedin" || t === "twitter" || t === "instagram" || t === "telegram") return "social";
  if (t === "organization_contact" || t === "other") {
    if (value.includes("@")) return "email";
    if (/^https?:\/\//i.test(value)) return "website";
    if (/^\+?[\d\s().-]{7,}$/.test(value)) return "phone";
    return "domain";
  }
  if (value.includes("@")) return "email";
  if (/^https?:\/\//i.test(value)) return "website";
  return "domain";
}

function sanitizeValue(vectorType: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (vectorType === "email") return sanitizePublicEmail(trimmed);
  if (vectorType === "phone") return sanitizePublicPhone(trimmed);
  return trimmed.slice(0, 500);
}

/**
 * Persist related bureau contacts as candidate evidence. Never marks them
 * verified_direct — fail-closed promotion stays elsewhere.
 */

function nameTokens(value: string | null | undefined): string[] {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !["the", "and", "for", "inc", "llc", "ltd", "company", "corp"].includes(t));
}

/** True when source URL/host or note likely refers to a different person/org than the target. */
function assessIdentityCollision(input: {
  targetName: string;
  companyName?: string | null;
  personName?: string | null;
  value: string;
  sourceUrls: string[];
  note?: string | null;
}): { risk: boolean; identityMatch: number; reason: string | null } {
  const targetToks = nameTokens(input.targetName);
  const companyToks = nameTokens(input.companyName);
  const blob = [
    input.personName ?? "",
    input.value,
    input.note ?? "",
    ...input.sourceUrls,
  ].join(" ").toLowerCase();

  // Strong org/company alignment → not a collision for org-scoped vectors
  if (companyToks.length && companyToks.some((t) => blob.includes(t))) {
    return { risk: false, identityMatch: 0.55, reason: null };
  }

  const overlap = targetToks.filter((t) => blob.includes(t));
  // Common false friends: finance advisors, banks, unrelated filings with same first+last
  const collisionHosts = [
    "edwardjones", "edward-jones", "immunovant", "alvarezandmarsal", "alvarez-marsal",
    "fidelity", "vanguard", "schwab", "morganstanley", "goldmansachs",
    "andrewjohnsonbank", "bankofamerica", "wellsfargo", "jpmorgan", "citigroup",
    "raymondjames", "ameriprise", "northwesternmutual", "prudential",
  ];
  const hostHit = collisionHosts.some((h) => blob.includes(h));
  if (hostHit && companyToks.length && !companyToks.some((t) => blob.includes(t))) {
    return {
      risk: true,
      identityMatch: 0.15,
      reason: "source host/org does not match target issuer; likely name collision",
    };
  }
  if (targetToks.length >= 2 && overlap.length === 0) {
    return {
      risk: true,
      identityMatch: 0.2,
      reason: "no name-token overlap between target and evidence blob",
    };
  }
  if (targetToks.length >= 2 && overlap.length === 1 && hostHit) {
    return {
      risk: true,
      identityMatch: 0.25,
      reason: "weak name overlap with collision-prone host",
    };
  }
  return {
    risk: false,
    identityMatch: overlap.length >= 2 ? 0.65 : 0.45,
    reason: null,
  };
}

export async function persistBureauContactsForEntity(
  entityId: number,
  items: readonly BureauContactLike[] | null | undefined,
  source = "case-bureau",
): Promise<number> {
  if (!entityId || !items?.length) return 0;

  let targetName = "";
  let companyName: string | null = null;
  try {
    const ent = await db.select({
      name: entitiesTable.name,
      metadata: entitiesTable.metadata,
    }).from(entitiesTable).where(eq(entitiesTable.id, entityId)).limit(1);
    targetName = ent[0]?.name ?? "";
    try {
      const meta = ent[0]?.metadata ? JSON.parse(ent[0].metadata) as Record<string, unknown> : {};
      companyName = typeof meta.companyName === "string" ? meta.companyName : null;
    } catch { companyName = null; }
  } catch {
    // non-fatal — collision assessment degrades to token-only on item fields
  }

  const rows: Array<{
    entityId: number;
    vectorType: string;
    value: string;
    source: string;
    sourceUrl: string | null;
    extractionMethod: string;
    sourceReliability: number;
    identityMatch: number;
    recencyScore: number;
    directnessScore: number;
    independentCorroboration: number;
    validationStatus: "candidate";
    rejectionReason: null;
    observedAt: Date;
    metadata: string;
  }> = [];

  const seen = new Set<string>();
  for (const item of items) {
    if (String(item.state ?? "").toLowerCase() === "rejected") continue;
    const rawValue = typeof item.value === "string" ? item.value.trim() : "";
    if (!rawValue) continue;
    const vectorType = mapVectorType(String(item.vectorType ?? "other"), rawValue);
    const value = sanitizeValue(vectorType, rawValue);
    if (!value) continue;
    if (isTrashContactValue(vectorType, value)) continue;
    const key = `${vectorType}:${value.toLowerCase()}:${source}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const scope = String(item.scope ?? item.tier ?? "unknown").toLowerCase();
    const orgish = scope.includes("organization") || scope.includes("org")
      || /^(info|contact|office|press|hello|admin|sales)@/i.test(value);
    const urls = Array.isArray(item.sourceUrls)
      ? item.sourceUrls.filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
      : [];

    const collision = assessIdentityCollision({
      targetName,
      companyName,
      personName: item.personName ?? null,
      value,
      sourceUrls: urls,
      note: item.note ?? null,
    });
    // Org-scoped vectors stay orgish; collision-prone personal vectors get demoted not dropped
    // (visibility law: show as weak candidate, never hide silently, never promote).
    const identityMatch = orgish ? Math.min(0.35, collision.identityMatch) : collision.identityMatch;
    rows.push({
      entityId,
      vectorType,
      value,
      source,
      sourceUrl: urls[0] ?? null,
      extractionMethod: "case-bureau-contact",
      sourceReliability: collision.risk ? 0.35 : 0.55,
      identityMatch,
      recencyScore: 0.7,
      directnessScore: orgish ? 0.35 : (vectorType === "email" || vectorType === "phone" ? 0.5 : 0.4),
      independentCorroboration: urls.length > 0 ? 1 : 0,
      validationStatus: "candidate",
      rejectionReason: null,
      observedAt: new Date(),
      metadata: JSON.stringify({
        scope: orgish ? "organization" : (scope || "unknown"),
        personName: item.personName ?? null,
        role: item.role ?? null,
        note: item.note ?? null,
        tier: item.tier ?? null,
        sourceUrls: urls.slice(0, 5),
        fromBureau: true,
        identityCollisionRisk: collision.risk,
        identityCollisionReason: collision.reason,
      }),
    });
  }

  if (!rows.length) return 0;
  try {
    await db.insert(contactEvidenceTable).values(rows).onConflictDoNothing();
    return rows.length;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), entityId, count: rows.length },
      "Failed to persist bureau contact evidence",
    );
    return 0;
  }
}

type DiscoveryCandidateContactSource = {
  name: string;
  contactEvidence?: BureauContactLike[] | null;
};

/**
 * Collect non-trash contact vectors for a target from the discovery deck.
 * Includes the matched candidate plus any evidence rows that name the same person.
 * Never invents values — only copies public evidence already on the case.
 */
export function collectDiscoveryContactsForTarget(
  targetName: string,
  candidates: readonly DiscoveryCandidateContactSource[] | null | undefined,
): BureauContactLike[] {
  const normalized = targetName.trim().toLowerCase();
  if (!normalized || !candidates?.length) return [];
  const out: BureauContactLike[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const candidateName = candidate.name.trim().toLowerCase();
    const isMatch = candidateName === normalized;
    for (const item of candidate.contactEvidence ?? []) {
      const value = typeof item.value === "string" ? item.value.trim() : "";
      if (!value) continue;
      const person = String(item.personName ?? "").trim().toLowerCase();
      const personMatches = Boolean(person) && (person === normalized || person.includes(normalized) || normalized.includes(person));
      if (!isMatch && !personMatches) continue;
      const key = `${String(item.vectorType ?? "other").toLowerCase()}|${value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        ...item,
        value,
        personName: item.personName ?? (isMatch ? targetName : item.personName ?? null),
      });
    }
  }
  return out;
}

/**
 * Phase B — bounded secondary public surface for person-shaped review entities.
 * Runs after materialization: public LinkedIn, Signal.nfx-style investor profiles,
 * official/leadership-ish websites, and any claimed email/phone from the free
 * OSINT lane are stored as candidate/lead only. Never Personal.
 * When LinkedIn is not found, an explicit "not found" candidate note is stored
 * so missing secondary surface is visible honesty, not silent gap.
 */
export async function expandSecondaryPublicSurface(input: {
  entityId: number;
  name: string;
  entityType?: string | null;
  companyName?: string | null;
}): Promise<{ linkedin: boolean; email: boolean; phone: boolean; signal: boolean; website: boolean; relatedPeople: number }> {
  const out = { linkedin: false, email: false, phone: false, signal: false, website: false, relatedPeople: 0 };
  const name = String(input.name ?? "").trim();
  if (!input.entityId || name.length < 3) return out;

  try {
    const { enrichEntityOsint } = await import("./web-enricher");
    const result = await enrichEntityOsint({
      name,
      type: input.entityType ?? "HNWI",
    } as any);

    const vectors: BureauContactLike[] = [];
    const isOrgEntity = /corp|company|organization|trust/i.test(String(input.entityType ?? ""));
    const defaultScope = isOrgEntity ? "organization" : "candidate";
    if (result.linkedinUrl) {
      vectors.push({
        vectorType: "linkedin",
        value: result.linkedinUrl,
        scope: defaultScope,
        personName: name,
        role: null,
        sourceUrls: [result.linkedinUrl],
        note: `Public LinkedIn from secondary expansion (${(result.sources ?? []).join(", ") || "osint"})`,
        tier: "candidate",
        state: "review_only",
      });
      out.linkedin = true;
    } else if (!isOrgEntity) {
      // Explicit not-found for persons only — company-name expands must not spam not-found noise.
      vectors.push({
        vectorType: "social",
        value: `linkedin:not-found:${name}`,
        scope: "candidate",
        personName: name,
        role: null,
        sourceUrls: [],
        note: "LinkedIn public profile not found in secondary expansion — gap recorded, not invented",
        tier: "candidate",
        state: "review_only",
      });
    }
    if (result.email) {
      vectors.push({
        vectorType: "email",
        value: result.email,
        scope: isOrgEntity || /^(info|contact|office|press|hello|admin|sales|support)@/i.test(result.email)
          ? "organization"
          : "candidate",
        personName: name,
        role: null,
        sourceUrls: [],
        note: isOrgEntity
          ? "Company email from secondary expansion — org route, not Personal"
          : "Claimed email from secondary expansion — lead only, not Personal",
        tier: "candidate",
        state: "review_only",
      });
      out.email = true;
    }
    if (result.phone) {
      vectors.push({
        vectorType: "phone",
        value: result.phone,
        scope: isOrgEntity ? "organization" : "candidate",
        personName: name,
        role: null,
        sourceUrls: [],
        note: isOrgEntity
          ? "Company phone from secondary expansion — org route, not Personal"
          : "Claimed phone from secondary expansion — lead only, not Personal",
        tier: "candidate",
        state: "review_only",
      });
      out.phone = true;
    }
    if (result.website) {
      vectors.push({
        vectorType: "website",
        value: result.website,
        scope: "candidate",
        personName: name,
        role: null,
        sourceUrls: [result.website],
        note: "Website / domain from secondary expansion — org/public surface",
        scope: "organization",
        tier: "candidate",
        state: "review_only",
      });
      out.website = true;
    }

    // Signal.nfx / OpenVC / Angel / First Round public directory surface.
    try {
      const directoryHits = await lookupPublicInvestorDirectories(name);
      for (const hit of directoryHits) {
        vectors.push({
          vectorType: "website",
          value: hit.url,
          scope: "candidate",
          personName: name,
          role: null,
          sourceUrls: [hit.url],
          note: `Public ${hit.directory} profile from secondary expansion — lead only`,
          tier: "candidate",
          state: "review_only",
        });
        out.signal = true;
      }
    } catch {
      // non-fatal
    }

    // Official domain leadership / about / team pages when a website is known.
    if (result.website) {
      try {
        const leadership = await lookupLeadershipPages(result.website, name);
        for (const page of leadership) {
          vectors.push({
            vectorType: "website",
            value: page,
            scope: "organization",
            personName: name,
            role: null,
            sourceUrls: [page],
            note: "Official leadership/about/team page from secondary expansion",
            tier: "candidate",
            state: "review_only",
          });
          out.website = true;
        }
      } catch {
        // non-fatal
      }

      // Certificate transparency (crt.sh) — claimed emails from cert SANs as leads only.
      try {
        const domain = result.website.replace(/^https?:\/\//i, "").split("/")[0]?.replace(/^www\./i, "");
        if (domain && domain.includes(".")) {
          const ctEmails = await lookupCrtShEmails(domain);
          for (const email of ctEmails) {
            vectors.push({
              vectorType: "email",
              value: email,
              scope: /^(info|contact|office|press|hello|admin|sales|support|webmaster)@/i.test(email)
                ? "organization"
                : "candidate",
              personName: name,
              role: null,
              sourceUrls: [`https://crt.sh/?q=${encodeURIComponent(domain)}`],
              note: `crt.sh certificate transparency claim on ${domain} — lead only, not Personal`,
              tier: "candidate",
              state: "review_only",
            });
            out.email = true;
          }
        }
      } catch {
        // non-fatal
      }
    }

    // Public web claims that look like emails with a source URL — always candidate/lead.
    try {
      const claimed = await lookupPublicEmailClaims(name);
      for (const claim of claimed) {
        vectors.push({
          vectorType: "email",
          value: claim.email,
          scope: /^(info|contact|office|press|hello|admin|sales|support)@/i.test(claim.email)
            ? "organization"
            : "candidate",
          personName: name,
          role: null,
          sourceUrls: claim.sourceUrl ? [claim.sourceUrl] : [],
          note: "Public aggregator/web claim — lead only with source; never Personal",
          tier: "candidate",
          state: "review_only",
        });
        out.email = true;
      }
    } catch {
      // non-fatal
    }

    // Public X/Twitter identity surface when relevant.
    try {
      const xHit = await lookupPublicXProfile(name);
      if (xHit) {
        vectors.push({
          vectorType: "social",
          value: xHit,
          scope: "candidate",
          personName: name,
          role: null,
          sourceUrls: [xHit],
          note: "Public X/Twitter profile from secondary expansion — lead only",
          tier: "candidate",
          state: "review_only",
        });
      }
    } catch {
      // non-fatal
    }

    // Wayback archived contact/about pages when domain known.
    if (result.website) {
      try {
        const domain = result.website.replace(/^https?:\/\//i, "").split("/")[0]?.replace(/^www\./i, "");
        if (domain) {
          const wb = await lookupWaybackContactPages(domain);
          for (const page of wb) {
            vectors.push({
              vectorType: "website",
              value: page,
              scope: "organization",
              personName: name,
              role: null,
              sourceUrls: [page],
              note: "Wayback archived contact/about page — attribution lead only",
              tier: "candidate",
              state: "review_only",
            });
            out.website = true;
          }
        }
      } catch {
        // non-fatal
      }
    }

    // G7 live: SC 13D/G co-display names for issuer — related people, review-only.
    const issuer = String(input.companyName ?? "").trim();
    if (issuer.length >= 3) {
      try {
        const related = await lookupEdgarRelatedPeople(issuer, name);
        for (const person of related) {
          vectors.push({
            vectorType: "other",
            value: `related-person:${person}`,
            scope: "candidate",
            personName: person,
            role: "sc13_co_filer",
            sourceUrls: [`https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(issuer)}&forms=SC+13D,SC+13G`],
            note: `EDGAR SC 13D/G co-display name for issuer "${issuer}" — related lead only, not Personal`,
            tier: "candidate",
            state: "review_only",
          });
          out.relatedPeople++;
        }
      } catch {
        // non-fatal
      }
    }

    if (vectors.length) {
      await persistBureauContactsForEntity(input.entityId, vectors, "secondary-public-surface");
    }
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), entityId: input.entityId, name },
      "Secondary public surface expansion failed (non-fatal)",
    );
  }
  return out;
}

/** Bounded EDGAR EFTS lookup: other person-like display names on same issuer. Never invents. */
async function lookupEdgarRelatedPeople(issuer: string, excludeName: string): Promise<string[]> {
  // Deep history: many SC 13D/G co-filer groups for legacy issuers (e.g. Hastings) are 2001–2005.
  // 2010+ window returns zero hits for those cases. enddt kept current.
  const url =
    `https://efts.sec.gov/LATEST/search-index` +
    `?q=${encodeURIComponent('"' + issuer.slice(0, 80) + '"')}` +
    `&forms=SC+13D,SC+13G&dateRange=custom&startdt=1995-01-01&enddt=2026-12-31&from=0`;
  try {
    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ApexAtlas/1.0 OSINT-Research research@apexfinder.private",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) return [];
    const data = await resp.json() as { hits?: { hits?: Array<{ _source?: { display_names?: string[] } }> } };
    const hits = data?.hits?.hits ?? [];
    // Token-overlap self-exclude: EDGAR display_names are often LAST FIRST
    // ("JOHNSON ANDREW F") while entity.name is "Andrew F. Johnson".
    const excludeTokens = new Set(
      excludeName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2),
    );
    const found = new Set<string>();
    // Broader corp denylist so "HASTINGS MANUFACTURING CO" etc. never pass person-like filter.
    const corpRe =
      /\b(inc|llc|ltd|corp|corporation|company|co|mfg|manufacturing|holdings|holding|group|trust|lp|llp|plc|ag|sa|nv|bv|gmbh|pty|partners?|capital|fund|management|advisors?|associates?)\b/i;
    for (const hit of hits.slice(0, 20)) {
      const names = hit?._source?.display_names ?? [];
      for (const raw of names) {
        const clean = String(raw).replace(/\s*\(CIK\s*\d+\)\s*$/i, "").trim();
        if (clean.length < 5 || clean.length > 80) continue;
        if (clean.toLowerCase() === issuer.toLowerCase()) continue;
        if (corpRe.test(clean)) continue;
        const words = clean.split(/\s+/);
        if (words.length < 2 || words.length > 5) continue;
        // Prefer title-case / initial-capital person shapes; allow all-caps LAST FIRST from EDGAR.
        const looksPerson =
          words.every((w) => /^[A-ZÀ-ÖØ-Ü]/.test(w)) ||
          words.every((w) => /^[A-Z0-9.&'-]+$/.test(w));
        if (!looksPerson) continue;
        // Token-overlap self-exclude (≥2 shared tokens of length ≥2, or single strong last-name match when both short).
        const tokens = clean
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((t) => t.length >= 2);
        const overlap = tokens.filter((t) => excludeTokens.has(t)).length;
        if (overlap >= 2) continue;
        if (overlap === 1 && tokens.length <= 3 && excludeTokens.size <= 3) continue;
        found.add(clean);
        if (found.size >= 8) break;
      }
      if (found.size >= 8) break;
    }
    return [...found];
  } catch {
    return [];
  }
}

/** Probe common leadership/about/team paths on an official domain. Never invents contacts. */
async function lookupLeadershipPages(website: string, personName: string): Promise<string[]> {
  let host = website.trim();
  if (!/^https?:\/\//i.test(host)) host = `https://${host}`;
  let origin: string;
  try {
    origin = new URL(host).origin;
  } catch {
    return [];
  }
  const paths = ["/about", "/about-us", "/team", "/leadership", "/our-team", "/people", "/company"];
  const found: string[] = [];
  for (const path of paths) {
    if (found.length >= 3) break;
    const url = `${origin}${path}`;
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ApexAtlas/1.0)",
          Accept: "text/html",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(5_000),
      });
      if (!resp.ok) continue;
      const ct = resp.headers.get("content-type") ?? "";
      if (!/html/i.test(ct)) continue;
      const html = (await resp.text()).slice(0, 80_000);
      // Keep page if it mentions the person or looks like a team/leadership page.
      const mentionsPerson = personName.split(/\s+/).filter((p) => p.length > 2)
        .some((part) => new RegExp(part, "i").test(html));
      const teamish = /leadership|our team|about us|board of directors|management team/i.test(html);
      if (mentionsPerson || teamish) found.push(url);
    } catch {
      // try next path
    }
  }
  return found;
}

/** Public investor/angel directory hits (Signal, OpenVC, AngelList, First Round). Never invents. */
async function lookupPublicInvestorDirectories(
  name: string,
): Promise<Array<{ url: string; directory: string }>> {
  const queries = [
    { q: `"${name}" site:signal.nfx.com`, dir: "Signal.nfx" },
    { q: `"${name}" site:openvc.app`, dir: "OpenVC" },
    { q: `"${name}" site:angel.co OR site:wellfound.com`, dir: "AngelList/Wellfound" },
    { q: `"${name}" site:firstround.com`, dir: "First Round" },
    { q: `"${name}" site:techcoastangels.com`, dir: "Tech Coast Angels" },
    { q: `"${name}" site:bandangels.com OR site:bandofangels.com`, dir: "Band of Angels" },
    { q: `"${name}" site:eban.org`, dir: "EBAN" },
    { q: `"${name}" "angel investor" OR "seed investor"`, dir: "angel-web" },
  ];
  const hits: Array<{ url: string; directory: string }> = [];
  const seen = new Set<string>();
  for (const { q, dir } of queries) {
    if (hits.length >= 8) break;
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=wt-wt`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ApexAtlas/1.0; +https://github.com/2f22vtd4kr-cloud/BigContacts)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      const patterns: Array<{ re: RegExp; directory: string }> = [
        { re: /https?:\/\/(?:www\.)?signal\.nfx\.com\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "Signal.nfx" },
        { re: /https?:\/\/(?:www\.)?openvc\.app\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "OpenVC" },
        { re: /https?:\/\/(?:www\.)?(?:angel\.co|wellfound\.com)\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "AngelList/Wellfound" },
        { re: /https?:\/\/(?:www\.)?firstround\.com\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "First Round" },
        { re: /https?:\/\/(?:www\.)?techcoastangels\.com\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "Tech Coast Angels" },
        { re: /https?:\/\/(?:www\.)?band(?:of)?angels\.com\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "Band of Angels" },
        { re: /https?:\/\/(?:www\.)?eban\.org\/[a-zA-Z0-9\-._/?=&%]+/gi, directory: "EBAN" },
      ];
      for (const { re, directory } of patterns) {
        const matches = html.match(re) ?? [];
        for (const raw of matches) {
          const clean = raw.replace(/&amp;/g, "&").split("&")[0] ?? raw;
          const key = clean.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          hits.push({ url: clean, directory: directory || dir });
          if (hits.length >= 8) break;
        }
        if (hits.length >= 8) break;
      }
    } catch {
      // try next
    }
  }
  return hits;
}

/** crt.sh certificate transparency — emails from cert SANs only. Never invents. */
async function lookupCrtShEmails(domain: string): Promise<string[]> {
  try {
    const url = `https://crt.sh/?q=${encodeURIComponent("%." + domain)}&output=json`;
    const resp = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "ApexAtlas/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!resp.ok) return [];
    const certs = (await resp.json()) as Array<{ name_value?: string; common_name?: string }>;
    if (!Array.isArray(certs)) return [];
    const emails = new Set<string>();
    for (const cert of certs.slice(0, 40)) {
      const blob = `${cert?.name_value ?? ""}\n${cert?.common_name ?? ""}`;
      for (const m of blob.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)) {
        const email = m[0].toLowerCase();
        if (email.endsWith(`.${domain}`) || email.includes(`@${domain}`) || email.includes(domain)) {
          emails.add(email);
        }
      }
    }
    return [...emails].slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Public web claims that look like emails near the person name.
 * Stores only with a source URL; never promotes to Personal.
 */
async function lookupPublicEmailClaims(
  name: string,
): Promise<Array<{ email: string; sourceUrl: string | null }>> {
  const queries = [
    `"${name}" email OR contact OR "@"`,
    `"${name}" "@" (gmail.com OR outlook.com OR proton.me OR company)`,
  ];
  const out: Array<{ email: string; sourceUrl: string | null }> = [];
  const seen = new Set<string>();
  const generic = /^(info|contact|office|press|hello|admin|sales|support|noreply|no-reply)@/i;
  for (const q of queries) {
    if (out.length >= 5) break;
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=wt-wt`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ApexAtlas/1.0)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      // Capture emails and nearby http links as weak source attribution.
      const emailMatches = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) ?? [];
      const linkMatches = html.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
      for (const raw of emailMatches) {
        const email = raw.toLowerCase();
        if (seen.has(email)) continue;
        if (generic.test(email) && !name.split(/\s+/).some((p) => p.length > 2 && email.includes(p.toLowerCase()))) {
          // Keep org emails but mark them; still visible as related.
        }
        // Skip obvious trash
        if (/example\.com|domain\.com|email\.com|sentry\.io|wixpress|schema\.org/i.test(email)) continue;
        seen.add(email);
        const sourceUrl = linkMatches.find((l) => /linkedin|about|contact|team|company|profile/i.test(l))
          ?? linkMatches[0]
          ?? null;
        out.push({
          email,
          sourceUrl: sourceUrl ? sourceUrl.replace(/&amp;/g, "&").split("&")[0] ?? sourceUrl : null,
        });
        if (out.length >= 5) break;
      }
    } catch {
      // try next
    }
  }
  return out;
}

/** Public X/Twitter profile URL when identity-relevant. Never invents. */
async function lookupPublicXProfile(name: string): Promise<string | null> {
  const queries = [
    `"${name}" (site:x.com OR site:twitter.com)`,
    `"${name}" twitter OR "x.com"`,
  ];
  for (const q of queries) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=wt-wt`;
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ApexAtlas/1.0)",
          Accept: "text/html",
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!resp.ok) continue;
      const html = await resp.text();
      const m = html.match(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{2,30})(?:\/|\s|"|'|<|$)/i);
      if (m?.[0] && m[1] && !/^(search|home|explore|i|intent|share|hashtag)$/i.test(m[1])) {
        return `https://x.com/${m[1]}`;
      }
    } catch {
      // try next
    }
  }
  return null;
}

/** Wayback CDX archived contact/about/team pages for a domain. Never invents contacts. */
async function lookupWaybackContactPages(domain: string): Promise<string[]> {
  const paths = ["contact", "about", "team", "contact-us", "about-us", "leadership"];
  const found: string[] = [];
  for (const path of paths) {
    if (found.length >= 3) break;
    try {
      const cdxUrl =
        `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/${path}` +
        `*&output=json&fl=original,timestamp&limit=2&filter=statuscode:200&collapse=urlkey`;
      const resp = await fetch(cdxUrl, {
        headers: { "User-Agent": "ApexAtlas/1.0" },
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) continue;
      const data = (await resp.json()) as string[][];
      if (!Array.isArray(data) || data.length < 2) continue;
      for (const row of data.slice(1)) {
        const orig = row?.[0];
        const ts = row?.[1];
        if (!orig || !ts) continue;
        found.push(`https://web.archive.org/web/${ts}/${orig}`);
        if (found.length >= 3) break;
      }
    } catch {
      // try next path
    }
  }
  return found;
}
