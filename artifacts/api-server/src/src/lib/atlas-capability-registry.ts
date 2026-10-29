/**
 * Apex Atlas capability registry.
 *
 * The Investigator should reason about capabilities by PURPOSE, INFORMATION VALUE,
 * prerequisites, and complementary sources — not merely by function name.
 *
 * This registry is intentionally data-only so it can be rendered into model context,
 * tested deterministically, and evolved without coupling provider code to strategy.
 */

export type AtlasCapability = {
  id: string;
  action: string;
  /** False means the adapter is deliberately not selectable by models in this deployment. */
  investigatorSelectable?: boolean;
  purpose: string;
  reveals: string[];
  usefulWhen: string[];
  prerequisites: string[];
  complements: string[];
  limitations: string[];
  evidenceClass: "primary" | "secondary" | "discovery" | "enrichment";
  typicalCost: "low" | "medium" | "high";
  /** Concise, curated model-facing summary; detailed fields remain the audit/source-of-truth metadata. */
  decisionGuidance?: string;
};

export const ATLAS_CAPABILITIES: readonly AtlasCapability[] = [
  { id:"search.serper", action:"web_search", purpose:"Broad web discovery and query-oriented corroboration.", decisionGuidance:"provider=serper; broad discovery; snippets are leads; syndication duplicates.", reveals:["candidate pages","company pages","press","public contact pages"], usefulWhen:["initial discovery","finding independent corroboration","testing identity hypotheses"], prerequisites:[], complements:["search.exa","search.tavily","visit","registry.search"], limitations:["search results are leads, not proof","duplicate syndication is common"], evidenceClass:"discovery", typicalCost:"low" },
  { id:"search.tavily", action:"web_search", purpose:"Research-oriented retrieval useful for multi-source questions.", decisionGuidance:"provider=tavily; multi-source synthesis; answers are leads, not primary evidence.", reveals:["research pages","press","public web context"], usefulWhen:["question requires synthesis","broad search has weak recall","cross-checking another search provider"], prerequisites:[], complements:["search.serper","search.exa","visit"], limitations:["answer text is not primary evidence","source quality varies"], evidenceClass:"discovery", typicalCost:"medium" },
  { id:"search.exa", action:"web_search", purpose:"Semantic/related-web discovery to reach pages conventional queries may miss.", decisionGuidance:"provider=exa; semantic discovery after query variants; relevance is not identity.", reveals:["conceptually related pages","profiles","company references"], usefulWhen:["query variants are exhausted","discovering adjacent organizations","finding semantically related evidence"], prerequisites:[], complements:["search.serper","visit","registry.search"], limitations:["semantic relevance does not establish identity"], evidenceClass:"discovery", typicalCost:"medium" },
  { id:"web.visit", action:"visit", purpose:"Inspect a concrete public source and verify important claims, including text extraction from public PDF filings and reports.", decisionGuidance:"inspect source/contact wording; PDF text bounded to 8 MB/50 pages/16k chars; scanned PDFs need OCR (unavailable); JS/challenge pages may fail.", reveals:["HTML/text page content","extractable PDF text with page markers","mailto/tel links","social links","source wording"], usefulWhen:["a search result contains a promising claim","a primary source needs verification","a PDF filing/report is the primary source","contact scope needs inspection"], prerequisites:["a URL"], complements:["web.browser_fetch","domain.harvest","registry.search"], limitations:["bounded PDF text only; no OCR or embedded document actions","ordinary HTTP may fail on JS/challenge pages"], evidenceClass:"secondary", typicalCost:"low" },
  { id:"web.browser_fetch", action:"browser_fetch", purpose:"Escalated page retrieval when ordinary HTTP is insufficient.", decisionGuidance:"providers=scrapfly|zenrows|browserless|playwright; escalate when HTTP fails; high cost.", reveals:["rendered/challenge-gated page content"], usefulWhen:["ordinary visit fails due to rendering/challenge","a page is known to require browser execution"], prerequisites:["a URL","failed or insufficient ordinary retrieval"], complements:["web.visit"], limitations:["higher cost; use only when justified"], evidenceClass:"secondary", typicalCost:"high" },
  { id:"registry.search", action:"registry_search", purpose:"Authoritative or structured corporate/legal-entity relationship discovery.", decisionGuidance:"Choose the most relevant enabled jurisdictional source from the action schema; US options include SEC EDGAR filings and FAA Aircraft Registry (registrant name or N-number). FAA registrant ≠ beneficial owner and registration ≠ wealth proof. Registry roles/records are leads; legal role ≠ personal contact.", reveals:["officers","directors","PSC/shareholder signals","issuer/principal records","legal-entity anchors"], usefulWhen:["company or officer hypothesis exists","identity discrimination is needed","ownership/role must be corroborated"], prerequisites:["person/company/query anchor"], complements:["web.visit","search.serper","domain.lookup"], limitations:["registry scope varies by jurisdiction","legal role does not prove personal contact"], evidenceClass:"primary", typicalCost:"medium" },
  { id:"registry.search.batch", action:"parallel_registry_search", purpose:"Compare complementary public registries for one research hypothesis.", decisionGuidance:"Compare 2–4 complementary enabled registries for one live hypothesis; include non-company asset registries such as FAA aircraft records when evidence warrants; fetch/verify returned leads; no blind sweeps or fixed registry order.", reveals:["cross-registry company/officer leads"], usefulWhen:["a firm/sector/geography hypothesis spans jurisdictions"], prerequisites:["a concrete company, sector or person hypothesis"], complements:["registry.search","search.serper","web.visit"], limitations:["one batch is bounded to 2–4 queries; returned URLs require fetching"], evidenceClass:"discovery", typicalCost:"medium" },
  { id:"domain.lookup", action:"domain_lookup", purpose:"Resolve domain ownership/registration infrastructure around an organization.", decisionGuidance:"rdap/whoisjson signals; needs known domain; privacy/proxy may obscure owner.", reveals:["domain metadata","registrant/infrastructure clues where public","domain relationships"], usefulWhen:["a company domain is known","organization identity is established"], prerequisites:["domain"], complements:["domain.harvest","web.visit"], limitations:["privacy/proxy data may obscure ownership"], evidenceClass:"enrichment", typicalCost:"low" },
  { id:"domain.harvest", investigatorSelectable:false, action:"harvest_domain", purpose:"Extract public organization-domain surfaces useful for contact discovery.", decisionGuidance:"Use only after a verified organization domain when public domain-associated emails, subdomains, hosts or IPs could answer an open contact/infrastructure question; medium cost. Complements observed-source visits and domain lookup. Outputs are unverified leads; independently verify and attribute before evidence admission; never generate speculative addresses.", reveals:["emails","subdomains","linked public resources","domain-associated contacts"], usefulWhen:["organization domain is verified","contact route is the objective"], prerequisites:["verified domain"], complements:["domain.lookup","web.visit","footprint.email"], limitations:["outputs are observations requiring attribution"], evidenceClass:"enrichment", typicalCost:"medium" },
  { id:"contact.email", investigatorSelectable:false, action:"footprint_email", purpose:"Investigate a publicly observed email without guessing new addresses.", decisionGuidance:"Use only on a real, publicly observed email when service footprint could disambiguate a contact hypothesis; medium cost. Complements source-page verification and domain harvest. Service positives do not prove ownership or identity; rate limits/errors yield partial results, and empty output is not proof of absence.", reveals:["public footprint","source associations","reuse signals"], usefulWhen:["a real public email was observed","email identity needs corroboration"], prerequisites:["observed public email"], complements:["web.visit","domain.harvest"], limitations:["footprint does not prove ownership","never generate speculative addresses"], evidenceClass:"enrichment", typicalCost:"medium" },
  { id:"identity.maigret", investigatorSelectable:false, action:"footprint_username_maigret", purpose:"Cross-site username footprinting for an observed or strongly grounded username.", decisionGuidance:"Use on an observed or strongly grounded username when cross-site account candidates could distinguish identity hypotheses; medium cost. May complement Sherlock or direct page fetch according to expected information gain; no fixed sequence. Username collisions and profile matches do not prove person identity; per-site errors make results partial.", reveals:["public account candidates","cross-site reuse"], usefulWhen:["a username is observed","identity disambiguation needs additional independent surfaces"], prerequisites:["observed username"], complements:["identity.sherlock","web.visit"], limitations:["username collision is common"], evidenceClass:"enrichment", typicalCost:"medium" },
  { id:"identity.sherlock", investigatorSelectable:false, action:"footprint_username_sherlock", purpose:"Independent username footprinting to test cross-site identity hypotheses.", decisionGuidance:"Use on an observed username when cross-site profile candidates add identity-discrimination value; medium cost. Choose instead of or alongside Maigret based on evidence gaps and cost; no fixed sequence. Matches are account leads only, not person-identity proof; partial results and rate limits are not negative evidence.", reveals:["public account candidates"], usefulWhen:["a username is observed","independent footprint corroboration is valuable"], prerequisites:["observed username"], complements:["identity.maigret","web.visit"], limitations:["account existence does not prove person identity"], evidenceClass:"enrichment", typicalCost:"medium" },
  { id:"osint.spiderfoot", investigatorSelectable:false, action:"footprint_spiderfoot", purpose:"Broad OSINT expansion across infrastructure, identity and public-source relationships.", decisionGuidance:"Use on a grounded public seed when broad expansion may reveal missing infrastructure, identity or source pivots; high cost/event volume, so compare expected gain with targeted tools. Match the observed identifier: email, phone, username, full person name, domain, hostname, public IP or ASN, using a compatible target type/profile. Never run every tool by default. Correlated modules are not independent evidence; event values/URLs are leads; partial scans stay partial.", reveals:["domains","subdomains","IPs","DNS/infrastructure relationships","public account candidates","metadata and source pivots"], usefulWhen:["a grounded seed needs broad expansion","a public email/phone/name needs identity or contact-adjacent exploration","research has plateaued","infrastructure or cross-entity pivots are missing"], prerequisites:["grounded public target and supported target type"], complements:["identity.sherlock","identity.maigret","search.serper","web.visit","registry.search","domain.lookup"], limitations:["high event volume","derived events are not independent corroboration","source quality varies","requires attested network-capable Python sandbox"], evidenceClass:"discovery", typicalCost:"high" },
] as const;

const BY_ID = new Map(ATLAS_CAPABILITIES.map((x) => [x.id, x]));

export function getAtlasCapability(id: string): AtlasCapability | undefined {
  return BY_ID.get(id);
}

export function renderAtlasCapabilityGuidance(capabilities: readonly AtlasCapability[] = ATLAS_CAPABILITIES): string {
  return capabilities.map((c) => [
    `CAPABILITY ${c.id}`,
    `action=${c.action}`,
    `purpose=${c.purpose}`,
    `reveals=${c.reveals.join(", ")}`,
    `usefulWhen=${c.usefulWhen.join(" | ")}`,
    `prerequisites=${c.prerequisites.join(" | ") || "none"}`,
    `complements=${c.complements.join(", ")}`,
    `limitations=${c.limitations.join(" | ")}`,
    `evidenceClass=${c.evidenceClass}; cost=${c.typicalCost}; modelSelectable=${c.investigatorSelectable !== false}`,
  ].join("\n")).join("\n\n");
}

export function capabilityForAction(action: string): AtlasCapability[] {
  return ATLAS_CAPABILITIES.filter((c) => c.action === action);
}

/**
 * Compact per-turn rendering for Investigator prompts. Keep the full guidance
 * for every enabled action within the existing prompt section budget. This is
 * presentation-only guidance; it does not select or order the research strategy.
 */
const COMPACT_CAPABILITY_GUIDANCE: Record<string, string> = {
  "search.serper": "provider=serper; snippets are leads; duplicates happen",
  "search.tavily": "provider=tavily; answers are leads, not primary evidence",
  "search.exa": "provider=exa; semantic discovery; relevance is not identity",
  "web.visit": "inspect source; PDFs bounded; JS/challenge pages may fail",
  "web.browser_fetch": "browser retrieval when HTTP fails; high cost",
  "registry.search": "FAA name/N-number; registrant ≠ owner; legal role ≠ personal contact",
  "registry.search.batch": "2–4 complementary registries; no blind sweeps/fixed order",
  "domain.lookup": "RDAP/WHOIS; privacy/proxy may obscure owner",
  "domain.harvest": "verified domain only; public contact/infrastructure leads",
  "contact.email": "observed public email only; service hits need corroboration",
  "identity.maigret": "grounded username; account candidates need corroboration",
  "identity.sherlock": "observed username; profiles are candidates, not identity",
  "osint.spiderfoot": "grounded seed; match targetType/profile to hypothesis; high cost; correlated events/URLs are leads, not independent proof",
};

export function renderAtlasCapabilityGuidanceCompact(capabilities: readonly AtlasCapability[] = ATLAS_CAPABILITIES): string {
  return capabilities
    .filter((c) => c.investigatorSelectable !== false)
    .map((c) => `- ${c.id} (${c.action}): ${COMPACT_CAPABILITY_GUIDANCE[c.id] ?? (c.decisionGuidance ?? c.purpose).slice(0, 60)}`)
    .join("\n");
}
