import { isValidPublicEmail,normalizePhone,sanitizePublicSocialUrl,isValidPublicSocialHandle } from "./contact-validation";
const HEURISTIC_EMAIL_SOURCE_RE=/(emailpattern|pattern-generated|smtp|gravatar|emailpattern-mx|spf-|mx-)/i;
const ORG_PHONE_SOURCE_RE=/^(?:agentic-web-org|EDGAR-Phone|EDGAR-Issuer-Phone|CompaniesHouse-Phone)$/i;
function isOrgPhoneSource(source?:string|null):boolean{return Boolean(source&&ORG_PHONE_SOURCE_RE.test(source.trim()))||/issuer|switchboard|company.?main|hq.?phone/i.test(String(source??""));}
export function isHeuristicEmailEvidence(input:{email?:string|null;emailSource?:string|null;metadata?:string|Record<string,unknown>|null}):boolean{if(!input.email?.trim())return false;let meta:Record<string,unknown>={};if(typeof input.metadata==="string"){try{const parsed=JSON.parse(input.metadata);if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))meta=parsed;}catch{}}else if(input.metadata&&typeof input.metadata==="object")meta=input.metadata;const selected = meta.selectedContactProvenance;
if (selected && typeof selected === "object" && !Array.isArray(selected)) {
  const emailProvenance = (selected as Record<string, unknown>).email;
  if (emailProvenance && typeof emailProvenance === "object" && !Array.isArray(emailProvenance)) {
    const provenance = emailProvenance as Record<string, unknown>;
    const selectedValue = typeof provenance.value === "string" ? provenance.value.trim().toLowerCase() : "";
    if (selectedValue && selectedValue === input.email.trim().toLowerCase() && typeof provenance.heuristic === "boolean") {
      // This value-bound attribution overrides aggregate legacy metadata that may
      // contain source flags belonging to the unselected row in an entity merge.
      return provenance.heuristic;
    }
  }
}
if(input.emailSource&&HEURISTIC_EMAIL_SOURCE_RE.test(input.emailSource))return true;
const sources=[...(Array.isArray(meta.enrichmentSources)?meta.enrichmentSources.map(String):[]),...Object.entries(meta.sourceHits&&typeof meta.sourceHits==="object"?meta.sourceHits:{}).filter(([,hit])=>Boolean(hit)).map(([source])=>source)];return sources.some((source)=>HEURISTIC_EMAIL_SOURCE_RE.test(source));}
type PersistedInvestigatorContactAttribution = {
  value?: unknown;
  contactAttribution?: unknown;
  exactQuote?: unknown;
  identityAssessment?: unknown;
  identityRationale?: unknown;
  sourceUrls?: unknown;
  jobId?: unknown;
};
function parseContactMetadata(raw: string | Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
    } catch { return {}; }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}
function modelAttributionForCurrentContact(input: {
  email?: string | null; phone?: string | null; linkedinUrl?: string | null;
  twitterHandle?: string | null; instagramHandle?: string | null; telegramHandle?: string | null;
  personalWebsite?: string | null; metadata?: string | Record<string, unknown> | null;
}): PersistedInvestigatorContactAttribution | null {
  const metadata = parseContactMetadata(input.metadata);
  const persisted = metadata.agenticContactProvenance;
  if (!persisted || typeof persisted !== "object" || Array.isArray(persisted)) return null;
  const fields: Array<[string, string | null | undefined]> = [
    ["email", input.email], ["phone", input.phone], ["linkedinUrl", input.linkedinUrl],
    ["twitterHandle", input.twitterHandle], ["instagramHandle", input.instagramHandle],
    ["telegramHandle", input.telegramHandle], ["personalWebsite", input.personalWebsite],
  ];
  for (const [field, currentValue] of fields) {
    if (!currentValue?.trim()) continue;
    const record = (persisted as Record<string, unknown>)[field];
    if (!record || typeof record !== "object" || Array.isArray(record)) continue;
    const item = record as PersistedInvestigatorContactAttribution;
    if (typeof item.value === "string" && item.value.trim().toLowerCase() === currentValue.trim().toLowerCase()) return item;
  }
  return null;
}
function hasStrictPersonSpecificInvestigatorProvenance(input: {
  email?: string | null; phone?: string | null; linkedinUrl?: string | null;
  twitterHandle?: string | null; instagramHandle?: string | null; telegramHandle?: string | null;
  personalWebsite?: string | null; metadata?: string | Record<string, unknown> | null;
}): boolean {
  const attribution = modelAttributionForCurrentContact(input);
  return Boolean(
    attribution
    && ["person_specific","direct_personal","professional_person_specific"].includes(String(attribution.contactAttribution ?? ""))
    && typeof attribution.exactQuote === "string" && attribution.exactQuote.trim()
    && attribution.identityAssessment === "same_person"
    && typeof attribution.identityRationale === "string" && attribution.identityRationale.trim()
    && Array.isArray(attribution.sourceUrls) && attribution.sourceUrls.length > 0
    && typeof attribution.jobId === "string" && attribution.jobId.trim(),
  );
}
function hasExplicitOrganizationInvestigatorProvenance(input: {
  email?: string | null; phone?: string | null; linkedinUrl?: string | null;
  twitterHandle?: string | null; instagramHandle?: string | null; telegramHandle?: string | null;
  personalWebsite?: string | null; metadata?: string | Record<string, unknown> | null;
}): boolean {
  const attribution = modelAttributionForCurrentContact(input);
  return Boolean(attribution && (
    ["department","shared_inbox","assistant_intermediary","generic_contact_form","organization"].includes(String(attribution.contactAttribution ?? ""))
  ));
}
function hasCandidatePhone(entity:{type?:string|null;phone?:string|null;phoneSource?:string|null}):boolean{if(isOrgPhoneSource(entity.phoneSource))return false;const normalized=normalizePhone(entity.phone);if(normalized)return true;if(entity.type)return false;const digits=entity.phone?.replace(/[^\d]/g,"")??"";return digits.length>=8&&digits.length<=15&&Boolean(entity.phone?.trim());}
export function computeContactConfidence(entity:{type?:string|null;organizationContact?:boolean;email?:string|null;phone?:string|null;phoneSource?:string|null;linkedinUrl?:string|null;telegramHandle?:string|null;twitterHandle?:string|null;instagramHandle?:string|null;knownResidences?:string|null;emailSource?:string|null;metadata?:string|Record<string,unknown>|null}):number{if(entity.organizationContact||["Corporation","Corp","Trust"].includes(entity.type??""))return 0;if(hasStrictPersonSpecificInvestigatorProvenance(entity))return 100;let score=0;const emailOrg=entity.emailSource==="agentic-web-org"||/company|issuer|switchboard|hq/i.test(String(entity.emailSource??""));if(isValidPublicEmail(entity.email)&&!isHeuristicEmailEvidence(entity)&&!emailOrg)score+=35;if(hasCandidatePhone(entity))score+=25;if(sanitizePublicSocialUrl(entity.linkedinUrl,"linkedin","person"))score+=15;if(entity.telegramHandle?.trim()&&/^[a-zA-Z0-9_]{2,64}$/.test(entity.telegramHandle.replace(/^@/,"")))score+=12;if(isValidPublicSocialHandle(entity.twitterHandle,"twitter"))score+=8;if(isValidPublicSocialHandle(entity.instagramHandle,"instagram"))score+=5;if(entity.knownResidences&&entity.knownResidences!=="[]"&&entity.knownResidences!=="null"&&entity.knownResidences.trim().length>2)score+=5;return Math.min(score,100);}
export function hasMeaningfulDirectContact(entity:{type?:string|null;organizationContact?:boolean;email?:string|null;phone?:string|null;phoneSource?:string|null;contactOutcome?:string|null;emailSource?:string|null;metadata?:string|Record<string,unknown>|null}):boolean{if(entity.organizationContact||["Corporation","Corp","Trust"].includes(entity.type??""))return false;if(hasStrictPersonSpecificInvestigatorProvenance(entity))return true;const emailOrg=entity.emailSource==="agentic-web-org"||/company|issuer|switchboard|hq/i.test(String(entity.emailSource??""));const hasPersonalEmail=Boolean(entity.email?.trim())&&isValidPublicEmail(entity.email)&&!isHeuristicEmailEvidence(entity)&&!emailOrg;const hasPersonalPhone=Boolean(entity.phone?.trim())&&hasCandidatePhone(entity);return hasPersonalEmail||hasPersonalPhone;}
export type ContactOutcome="none"|"evidence_only"|"social_only"|"organization_contact"|"direct_contact_candidate"|"direct_contact_verified";
export function isPersonalContactOutcome(outcome:ContactOutcome):boolean{return outcome==="direct_contact_candidate"||outcome==="direct_contact_verified";}
export function computeContactState(entity:{type?:string|null;organizationContact?:boolean;email?:string|null;phone?:string|null;phoneSource?:string|null;linkedinUrl?:string|null;telegramHandle?:string|null;twitterHandle?:string|null;instagramHandle?:string|null;knownResidences?:string|null;website?:string|null;bizLocation?:string|null;emailSource?:string|null;metadata?:string|Record<string,unknown>|null;validatedDirectContact?:boolean;isGenericPrefix?:boolean}):{contactConfidence:number;contactOutcome:ContactOutcome;isHot:boolean}{const contactConfidence=computeContactConfidence(entity),contactOutcome=computeContactOutcome(entity),directTarget=entity.type==="HNWI"||entity.type==="Gatekeeper";return{contactConfidence,contactOutcome,isHot:directTarget&&contactOutcome==="direct_contact_verified"&&hasMeaningfulDirectContact(entity)};}
export function computeContactOutcome(entity:{type?:string|null;email?:string|null;phone?:string|null;linkedinUrl?:string|null;twitterHandle?:string|null;instagramHandle?:string|null;telegramHandle?:string|null;website?:string|null;bizLocation?:string|null;validatedDirectContact?:boolean;emailSource?:string|null;phoneSource?:string|null;isGenericPrefix?:boolean;metadata?:string|Record<string,unknown>|null}):ContactOutcome{const emailStr=entity.email?.trim()??"",phoneStr=entity.phone?.trim()??"",orgVehicle=["Corporation","Corp","Trust"].includes(entity.type??"");if(orgVehicle){if(emailStr||phoneStr)return"organization_contact";if(entity.linkedinUrl?.trim()||entity.twitterHandle?.trim()||entity.instagramHandle?.trim()||entity.telegramHandle?.trim())return"social_only";if(entity.website?.trim()||entity.bizLocation?.trim())return"evidence_only";return"none";}const provenanceInput={email:entity.email,phone:entity.phone,linkedinUrl:entity.linkedinUrl,twitterHandle:entity.twitterHandle,instagramHandle:entity.instagramHandle,telegramHandle:entity.telegramHandle,personalWebsite:entity.website,metadata:entity.metadata};if(hasStrictPersonSpecificInvestigatorProvenance(provenanceInput))return "direct_contact_verified";if(hasExplicitOrganizationInvestigatorProvenance(provenanceInput))return "organization_contact";if(emailStr||phoneStr)return"direct_contact_candidate";if(entity.linkedinUrl?.trim()||entity.twitterHandle?.trim()||entity.instagramHandle?.trim()||entity.telegramHandle?.trim())return"social_only";if(entity.website?.trim()||entity.bizLocation?.trim())return"evidence_only";return"none";}
