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
  purpose: string;
  reveals: string[];
  usefulWhen: string[];
  prerequisites: string[];
  complements: string[];
  limitations: string[];
  evidenceClass: "primary" | "secondary" | "discovery" | "enrichment";
  typicalCost: "low" | "medium" | "high";
};

export const ATLAS_CAPABILITIES: readonly AtlasCapability[] = [
  { id:"search.serper", action:"web_search", purpose:"Broad web discovery and query-oriented corroboration.", reveals:["candidate pages","company pages","press","public contact pages"], usefulWhen:["initial discovery","finding independent corroboration","testing identity hypotheses"], prerequisites:[], complements:["search.exa","search.tavily","visit","registry.search"], limitations:["search results are leads, not proof","duplicate syndication is common"], evidenceClass:"discovery", typicalCost:"low" },
  { id:"search.tavily", action:"web_search", purpose:"Research-oriented retrieval useful for multi-source questions.", reveals:["research pages","press","public web context"], usefulWhen:["question requires synthesis","broad search has weak recall","cross-checking another search provider"], prerequisites:[], complements:["search.serper","search.exa","visit"], limitations:["answer text is not primary evidence","source quality varies"], evidenceClass:"discovery", typicalCost:"medium" },
  { id:"search.exa", action:"web_search", purpose:"Semantic/related-web discovery to reach pages conventional queries may miss.", reveals:["conceptually related pages","profiles","company references"], usefulWhen:["query variants are exhausted","discovering adjacent organizations","finding semantically related evidence"], prerequisites:[], complements:["search.serper","visit","registry.search"], limitations:["semantic relevance does not establish identity"], evidenceClass:"discovery", typicalCost:"medium" },
  { id:"web.visit", action:"visit", purpose:"Inspect a concrete public source and verify important claims.", reveals:["page text","mailto/tel links","social links","source wording"], usefulWhen:["a search result contains a promising claim","a primary source needs verification","contact scope needs inspection"], prerequisites:["a URL"], complements:["web.browser_fetch","domain.harvest","registry.search"], limitations:["ordinary HTTP may fail on JS/challenge pages"], evidenceClass:"secondary", typicalCost:"low" },
  { id:"web.browser_fetch", action:"browser_fetch", purpose:"Escalated page retrieval when ordinary HTTP is insufficient.", reveals:["rendered/challenge-gated page content"], usefulWhen:["ordinary visit fails due to rendering/challenge","a page is known to require browser execution"], prerequisites:["a URL","failed or insufficient ordinary retrieval"], complements:["web.visit"], limitations:["higher cost; use only when justified"], evidenceClass:"secondary", typicalCost:"high" },
  { id:"registry.search", action:"registry_search", purpose:"Authoritative or structured corporate/legal-entity relationship discovery.", reveals:["officers","directors","PSC/shareholder signals","issuer/principal records","legal-entity anchors"], usefulWhen:["company or officer hypothesis exists","identity discrimination is needed","ownership/role must be corroborated"], prerequisites:["person/company/query anchor"], complements:["web.visit","search.serper","domain.lookup"], limitations:["registry scope varies by jurisdiction","legal role does not prove personal contact"], evidenceClass:"primary", typicalCost:"medium" },
  { id:"domain.lookup", action:"domain_lookup", purpose:"Resolve domain ownership/registration infrastructure around an organization.", reveals:["domain metadata","registrant/infrastructure clues where public","domain relationships"], usefulWhen:["a company domain is known","organization identity is established"], prerequisites:["domain"], complements:["domain.harvest","web.visit"], limitations:["privacy/proxy data may obscure ownership"], evidenceClass:"enrichment", typicalCost:"low" },
  { id:"domain.harvest", action:"harvest_domain", purpose:"Extract public organization-domain surfaces useful for contact discovery.", reveals:["emails","subdomains","linked public resources","domain-associated contacts"], usefulWhen:["organization domain is verified","contact route is the objective"], prerequisites:["verified domain"], complements:["domain.lookup","web.visit","footprint.email"], limitations:["outputs are observations requiring attribution"], evidenceClass:"enrichment", typicalCost:"medium" },
  { id:"contact.email", action:"footprint_email", purpose:"Investigate a publicly observed email without guessing new addresses.", reveals:["public footprint","source associations","reuse signals"], usefulWhen:["a real public email was observed","email identity needs corroboration"], prerequisites:["observed public email"], complements:["web.visit","domain.harvest"], limitations:["footprint does not prove ownership","never generate speculative addresses"], evidenceClass:"enrichment", typicalCost:"medium" },
  { id:"identity.maigret", action:"footprint_username_maigret", purpose:"Cross-site username footprinting for an observed or strongly grounded username.", reveals:["public account candidates","cross-site reuse"], usefulWhen:["a username is observed","identity disambiguation needs additional independent surfaces"], prerequisites:["observed username"], complements:["identity.sherlock","web.visit"], limitations:["username collision is common"], evidenceClass:"enrichment", typicalCost:"medium" },
  { id:"identity.sherlock", action:"footprint_username_sherlock", purpose:"Independent username footprinting to test cross-site identity hypotheses.", reveals:["public account candidates"], usefulWhen:["a username is observed","independent footprint corroboration is valuable"], prerequisites:["observed username"], complements:["identity.maigret","web.visit"], limitations:["account existence does not prove person identity"], evidenceClass:"enrichment", typicalCost:"medium" },
  { id:"osint.spiderfoot", action:"footprint_spiderfoot", purpose:"Broad OSINT expansion across infrastructure, identity and public-source relationships.", reveals:["domains","subdomains","IPs","DNS/infrastructure relationships","public account candidates","metadata and source pivots"], usefulWhen:["a grounded seed needs broad expansion","research has plateaued","infrastructure or cross-entity pivots are missing"], prerequisites:["grounded target"], complements:["identity.sherlock","identity.maigret","search.serper","web.visit","registry.search","domain.lookup"], limitations:["high event volume","derived events are not independent corroboration","source quality varies","requires attested network-capable Python sandbox"], evidenceClass:"discovery", typicalCost:"high" },
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
    `evidenceClass=${c.evidenceClass}; cost=${c.typicalCost}`,
  ].join("\n")).join("\n\n");
}

export function capabilityForAction(action: string): AtlasCapability[] {
  return ATLAS_CAPABILITIES.filter((c) => c.action === action);
}
