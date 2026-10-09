/** Strict persistence boundary for model-led research. */
import { db, contactEvidenceTable, entitiesTable, researchCaseEventsTable, researchCasesTable } from "@workspace/db";
import { and, eq, isNull, like, or, sql } from "drizzle-orm";
import { sanitizePublicEmail, sanitizePublicPhone, isTrashContactValue } from "./contact-validation";
import { assessIdentityCollision } from "./identity-collision";
import { countIndependentSourceHosts } from "./source-corroboration";
import { isCanonicalJobOwner } from "./canonical-job-lock";
import { bindExactSourceSpan } from "./research-epistemic-vnext";
export type BureauContactLike = { vectorType?: string | null; value?: string | null; scope?: string | null; personName?: string | null; role?: string | null; sourceUrls?: string[] | null; note?: string | null; tier?: string | null; state?: string | null; promote?: boolean | null };
export type InvestigatorPromotionProvenance = { caseId: number; runId: string; jobId?: string | null };

/** Trusted contact promotion is always scoped to a live canonical Atlas job. */
export function hasCanonicalPromotionJobBinding(
  provenance: InvestigatorPromotionProvenance | null | undefined,
): provenance is InvestigatorPromotionProvenance & { jobId: string } {
  return Boolean(
    provenance &&
    Number.isInteger(provenance.caseId) &&
    provenance.caseId > 0 &&
    typeof provenance.runId === "string" &&
    provenance.runId.trim().length > 0 &&
    typeof provenance.jobId === "string" &&
    provenance.jobId.trim().length > 0
  );
}
const HTTPS_SOURCE=/^https:\/\/\S+$/i; const SEARCH_QUERY_URL=[/google\.[^/]+\/search(?:[/?]|$)/i,/bing\.com\/search(?:[/?]|$)/i,/search\.yahoo\.com\/search(?:[/?]|$)/i,/duckduckgo\.com\/(?:html\/)?\?(?:[^#]*&)?q=/i,/efts\.sec\.gov\/LATEST\/search-index(?:[/?]|$)/i];
function isClaimSourceUrl(url:string):boolean{return HTTPS_SOURCE.test(url)&&!SEARCH_QUERY_URL.some((pattern)=>pattern.test(url));}
export function hasExactObservedToken(text:string,value:string):boolean{
 const source=text.toLowerCase(),needle=value.trim().toLowerCase();
 if(!needle)return false;
 const continues=(character:string)=>Boolean(character)&&/[\p{L}\p{N}_@+-]/u.test(character);
 let index=source.indexOf(needle);
 while(index>=0){
  const afterIndex=index+needle.length,before=source[index-1]??"",after=source[afterIndex]??"";
  if(!continues(before)&&!continues(after)&&!(after==="."&&/[\p{L}\p{N}]/u.test(source[afterIndex+1]??""))&&!(needle.includes("@")&&before==="."))return true;
  index=source.indexOf(needle,index+1);
 }
 return false;
}
function exactTokenOffsets(text:string,value:string):number[]{
 const source=text.toLowerCase(),needle=value.trim().toLowerCase();
 if(!needle)return[];
 const continues=(character:string)=>Boolean(character)&&/[\p{L}\p{N}_@+-]/u.test(character);
 const offsets:number[]=[];let index=source.indexOf(needle);
 while(index>=0){
  const afterIndex=index+needle.length,before=source[index-1]??"",after=source[afterIndex]??"";
  if(!continues(before)&&!continues(after)&&!(after==="."&&/[\p{L}\p{N}]/u.test(source[afterIndex+1]??""))&&!(needle.includes("@")&&before==="."))offsets.push(index);
  index=source.indexOf(needle,index+1);
 }
 return offsets;
}
function hasBoundPhoneAndIdentity(observationText:string,personName:string,cleanValue:string,maxDistance=320):boolean{
 const digits=cleanValue.replace(/\D/g,"");
 if(digits.length<7)return false;
 const identityOffsets=exactTokenOffsets(observationText,personName);
 if(!identityOffsets.length)return false;
 const phonePattern=/\+?\d[\d\s().-]{5,}\d/g;
 for(const match of observationText.matchAll(phonePattern)){
  if((match[0]??"").replace(/\D/g,"")!==digits)continue;
  const valueStart=match.index??-1,valueEnd=valueStart+match[0].length;
  if(identityOffsets.some((identityStart)=>Math.max(0,Math.max(identityStart-valueEnd,valueStart-(identityStart+personName.length)))<=maxDistance))return true;
 }
 return false;
}
function hasBoundIdentityAndValue(observationText:string,personName:string,cleanValue:string,vectorType:string):boolean{
 if(!observationText.trim()||!personName.trim()||!cleanValue.trim())return false;
 if(vectorType==="phone")return hasBoundPhoneAndIdentity(observationText,personName,cleanValue);
 return Boolean(bindExactSourceSpan(observationText,cleanValue,personName,320)?.exact);
}
export function supportsCandidateContactOnSameObservation(observationText:string,item:BureauContactLike,cleanValue:string,vectorType:string):boolean{
 if(!observationText.trim()||!cleanValue.trim())return false;
 if(String(item.scope??"").toLowerCase()==="candidate"){
  const name=typeof item.personName==="string"?item.personName.trim():"";
  return Boolean(name&&hasBoundIdentityAndValue(observationText,name,cleanValue,vectorType));
 }
 if(vectorType==="phone"){
  const digits=cleanValue.replace(/\D/g,"");
  const phoneTokens:string[]=observationText.match(/\+?\d[\d\s().-]{5,}\d/g)??[];
  return digits.length>=7&&phoneTokens.some(token=>token.replace(/\D/g,"")===digits);
 }
 return hasExactObservedToken(observationText,cleanValue);
}
export type ObservedClaimMaterial = { observationText: string; sourceUrls: readonly string[] };
export function supportsContactClaimAcrossObservations(observations: readonly ObservedClaimMaterial[], item: BureauContactLike, cleanValue: string, vectorType: string): boolean {
 const cited = new Set((item.sourceUrls ?? []).map((url) => normalizeSourceUrl(String(url))).filter((url): url is string => Boolean(url)));
 if (!cited.size || !cleanValue.trim()) return false;
 const candidate = String(item.scope ?? "").toLowerCase() === "candidate";
 const personName = typeof item.personName === "string" ? item.personName.trim() : "";
 if (candidate && !personName) return false;
 let identityObserved = !candidate;
 let valueObserved = false;
 let identityAndValueBoundTogether = !candidate;
 const supportingUrls = new Set<string>();
 for (const observation of observations) {
  const urls = observation.sourceUrls.map((url) => normalizeSourceUrl(String(url))).filter((url): url is string => url !== null && cited.has(url));
  if (!urls.length || !observation.observationText.trim()) continue;
  const identity = candidate && hasExactObservedToken(observation.observationText, personName);
  const value = vectorType === "phone"
   ? (() => { const digits = cleanValue.replace(/\D/g, ""); const tokens = observation.observationText.match(/\+?\d[\d\s().-]{5,}\d/g) ?? []; return digits.length >= 7 && tokens.some((token) => token.replace(/\D/g, "") === digits); })()
   : hasExactObservedToken(observation.observationText, cleanValue);
  if (identity) identityObserved = true;
  if (value) valueObserved = true;
  // Same-page token presence is insufficient: a large directory can mention many
  // people and contact points. Require a bounded local co-binding passage.
  if (candidate && hasBoundIdentityAndValue(observation.observationText,personName,cleanValue,vectorType)) identityAndValueBoundTogether = true;
  if (candidate ? identity || value : value) for (const url of urls) supportingUrls.add(url);
 }
 return identityObserved && valueObserved && identityAndValueBoundTogether && [...cited].every((url) => supportingUrls.has(url));
}
/**
 * Review-only attribution may combine independently observed sources, but
 * each cited URL must contribute exact identity or value evidence. This is
 * intentionally weaker than supportsContactClaimAcrossObservations: trusted
 * candidate promotion still requires identity and value to be locally bound
 * in the same observation.
 */
export function supportsReviewableClaimAcrossObservations(
 observations: readonly ObservedClaimMaterial[],
 item: BureauContactLike,
 cleanValue: string,
 vectorType: string,
): boolean {
 const cited = new Set((item.sourceUrls ?? []).map((url) => normalizeSourceUrl(String(url))).filter((url): url is string => Boolean(url)));
 if (!cited.size || !cleanValue.trim()) return false;
 const candidate = String(item.scope ?? "").toLowerCase() === "candidate";
 const personName = typeof item.personName === "string" ? item.personName.trim() : "";
 if (candidate && !personName) return false;
 let identityObserved = !candidate;
 let valueObserved = false;
 const supportingUrls = new Set<string>();
 for (const observation of observations) {
  const urls = observation.sourceUrls
   .map((url) => normalizeSourceUrl(String(url)))
   .filter((url): url is string => url !== null && cited.has(url));
  if (!urls.length || !observation.observationText.trim()) continue;
  const identity = candidate && hasExactObservedToken(observation.observationText, personName);
  const value = vectorType === "phone"
   ? (() => {
      const digits = cleanValue.replace(/\D/g, "");
      const tokens = observation.observationText.match(/\+?\d[\d\s().-]{5,}\d/g) ?? [];
      return digits.length >= 7 && tokens.some((token) => token.replace(/\D/g, "") === digits);
     })()
   : hasExactObservedToken(observation.observationText, cleanValue);
  if (identity) identityObserved = true;
  if (value) valueObserved = true;
  if (candidate ? identity || value : value) for (const url of urls) supportingUrls.add(url);
 }
 return identityObserved && valueObserved && [...cited].every((url) => supportingUrls.has(url));
}

const CLAIM_GRADE_OBSERVATION_ACTIONS = new Set([
  "visit",
  "browser_fetch",
  "registry_search",
  "domain_lookup",
  "harvest_domain",
  "footprint_email",
  "footprint_username_maigret",
  "footprint_username_sherlock",
  "footprint_spiderfoot",
]);

export function isClaimGradeObservationAction(action: unknown): boolean {
  // Only known, implemented retrieval/enrichment capabilities can anchor
  // claim-grade source observations. Unknown and legacy action labels fail
  // closed; source URL, successful execution and exact claim grounding remain
  // separately required by the immutable promotion boundary.
  return typeof action === "string" && CLAIM_GRADE_OBSERVATION_ACTIONS.has(action.trim());
}
function normalizeSourceUrl(raw:string):string|null{try{const url=new URL(raw);if(url.protocol!=="https:")return null;url.hash="";url.hostname=url.hostname.toLowerCase();return url.href.endsWith("/")?url.href.slice(0,-1):url.href;}catch{return null;}}
function normalizeObservedUrls(urls:readonly string[]|null|undefined):Set<string>{const observed=new Set<string>();for(const raw of urls??[]){if(typeof raw!=="string")continue;const url=normalizeSourceUrl(raw);if(url&&isClaimSourceUrl(url))observed.add(url);}return observed;}
function mapVectorType(raw:string,value:string):string{const t=raw.toLowerCase().trim();if(["email","phone","website","domain","address","social","linkedin","twitter","instagram","telegram"].includes(t))return t;if(value.includes("@"))return "email";if(/^\+?[\d\s().-]{7,}$/.test(value))return "phone";if(/^https?:\/\//i.test(value))return "website";return "other";}
function sanitizeValue(vectorType:string,value:string):string|null{const trimmed=value.trim();if(!trimmed)return null;if(vectorType==="other"&&/^person:/i.test(trimmed))return null;if(vectorType==="email")return sanitizePublicEmail(trimmed);if(vectorType==="phone")return sanitizePublicPhone(trimmed);if(vectorType==="domain"||vectorType==="website"){const v=trimmed.replace(/^https?:\/\//i,"").replace(/^www\./i,"").split("/")[0]??"";if(!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(v))return null;return v.toLowerCase();}return trimmed;}
export function sourceBackedBureauContacts(items:readonly BureauContactLike[]|null|undefined):BureauContactLike[]{return(items??[]).filter((item)=>Array.isArray(item.sourceUrls)&&item.sourceUrls.some((url)=>typeof url==="string"&&isClaimSourceUrl(url))).map((item)=>({...item,sourceUrls:(item.sourceUrls??[]).filter((url)=>typeof url==="string"&&isClaimSourceUrl(url))}));}
export function observedSourceBackedBureauContacts(items:readonly BureauContactLike[]|null|undefined,observedSourceUrls:readonly string[]|null|undefined):BureauContactLike[]{const observed=normalizeObservedUrls(observedSourceUrls);if(!observed.size)return[];return sourceBackedBureauContacts(items).map((item)=>({...item,sourceUrls:(item.sourceUrls??[]).map((url)=>normalizeSourceUrl(url)).filter((url):url is string=>url!==null&&observed.has(url))})).filter((item)=>(item.sourceUrls?.length??0)>0);}
export function isAcceptedImmutablePromotionControlRole(actorRole:string):boolean{return actorRole==="groq_boss"||actorRole==="gemini_boss";}
export function isImmutablePromotionObservationEventType(eventType:string):boolean{return eventType==="tool_observation"||eventType==="observation";}
function normalizedClaimMatches(claim:Record<string,unknown>,item:BureauContactLike,cleanValue:string,vectorType:string):boolean{const claimType=String(claim.vectorType??claim.predicate??"").toLowerCase().trim();const claimValue=String(claim.value??claim.object??"").trim().toLowerCase();const claimPerson=String(claim.personName??claim.subject??"").trim().toLowerCase();return claimType===vectorType.toLowerCase()&&claimValue===cleanValue.toLowerCase()&&(!item.personName||claimPerson===item.personName.trim().toLowerCase());}
async function resolveImmutablePromotionSupport(provenance:InvestigatorPromotionProvenance,item:BureauContactLike,cleanValue:string,vectorType:string,expectedEntityId?:number):Promise<{claimEventId:number;observationEventIds:number[]}|null>{if(!hasCanonicalPromotionJobBinding(provenance))return null;const promotionJobId=provenance.jobId.trim();if(expectedEntityId!=null){const [caseRow]=await db.select({targetEntityId:researchCasesTable.targetEntityId,caseType:researchCasesTable.caseType,status:researchCasesTable.status,currentAction:researchCasesTable.currentAction,caseFile:researchCasesTable.caseFile}).from(researchCasesTable).where(eq(researchCasesTable.id,provenance.caseId)).limit(1);if(!caseRow||caseRow.caseType!=="target"||caseRow.targetEntityId!==expectedEntityId||caseRow.status==="cancelled"||(caseRow.status==="review"&&["canonical-atlas-cancelled","canonical-lease-lost","canonical-continuation-cancelled"].includes(String(caseRow.currentAction??""))))return null;let caseFile:Record<string,unknown>;try{caseFile=JSON.parse(caseRow.caseFile??"{}") as Record<string,unknown>;}catch{return null;}if(String(caseFile.atlasJobId??caseFile.jobId??"")!==promotionJobId)return null;}const rows=await db.select({id:researchCaseEventsTable.id,eventType:researchCaseEventsTable.eventType,actorRole:researchCaseEventsTable.actorRole,status:researchCaseEventsTable.status,payload:researchCaseEventsTable.payload,correlationKey:researchCaseEventsTable.correlationKey}).from(researchCaseEventsTable).where(and(eq(researchCaseEventsTable.caseId,provenance.caseId),like(researchCaseEventsTable.correlationKey,`%${provenance.runId}%`)));for(const row of rows){let payload:Record<string,unknown>;try{payload=JSON.parse(row.payload??"{}") as Record<string,unknown>;}catch{continue;}if(String(payload.runId??"").trim()!==provenance.runId)continue;if(String(payload.jobId??"").trim()!==promotionJobId)continue;let claim:Record<string,unknown>|null=null;let observationIds:number[]=[];if(row.eventType==="claim"&&row.actorRole==="head_investigator"&&normalizedClaimMatches((payload.claim&&typeof payload.claim==="object"?payload.claim:{}) as Record<string,unknown>,item,cleanValue,vectorType)){claim=payload.claim as Record<string,unknown>;observationIds=Array.isArray(payload.observationEventIds)?payload.observationEventIds.filter((v):v is number=>Number.isInteger(v)&&v>0):[];}if(row.eventType==="control_decision"&&isAcceptedImmutablePromotionControlRole(row.actorRole)&&Array.isArray(payload.evidenceGraphs))for(const graph of payload.evidenceGraphs){const g=graph&&typeof graph==="object"?graph as Record<string,unknown>:null;const c=g?.claim&&typeof g.claim==="object"?g.claim as Record<string,unknown>:null;if(c&&normalizedClaimMatches(c,item,cleanValue,vectorType)){claim=c;const observations=Array.isArray(g?.observations)?g.observations as unknown[]:[];observationIds=observations.map((o)=>o&&typeof o==="object"?Number((o as Record<string,unknown>).eventId):0).filter((v)=>Number.isInteger(v)&&v>0);break;}}if(!claim||!observationIds.length)continue;const validObservationIds:number[]=[];const observedClaimMaterials:ObservedClaimMaterial[]=[];for(const observationId of observationIds){const [obs]=await db.select({id:researchCaseEventsTable.id,actorRole:researchCaseEventsTable.actorRole,eventType:researchCaseEventsTable.eventType,status:researchCaseEventsTable.status,payload:researchCaseEventsTable.payload}).from(researchCaseEventsTable).where(and(eq(researchCaseEventsTable.id,observationId),eq(researchCaseEventsTable.caseId,provenance.caseId))).limit(1);if(!obs?.payload||obs.actorRole!=="head_investigator"||!isImmutablePromotionObservationEventType(obs.eventType)||obs.status!=="success")continue;let observationPayload:Record<string,unknown>;try{observationPayload=JSON.parse(obs.payload) as Record<string,unknown>;}catch{continue;}if(String(observationPayload.runId??"").trim()!==provenance.runId)continue;if(String(observationPayload.jobId??"").trim()!==promotionJobId)continue;if (!isClaimGradeObservationAction(observationPayload.action)) continue;
const observationText=typeof observationPayload.observation==="string"?observationPayload.observation:"";const claimedSources=new Set((item.sourceUrls??[]).map((url)=>normalizeSourceUrl(String(url))).filter((url):url is string=>url!==null));const observedSources=new Set((Array.isArray(observationPayload.observedUrls)?observationPayload.observedUrls:[]).map((url)=>normalizeSourceUrl(String(url))).filter((url):url is string=>url!==null));const observationSource=normalizeSourceUrl(typeof observationPayload.sourceUrl==="string"?observationPayload.sourceUrl:"");const matchedSources=[...new Set([...observedSources,...(observationSource?[observationSource]:[])])].filter((url)=>claimedSources.has(url));if(!matchedSources.length)continue;observedClaimMaterials.push({observationText,sourceUrls:matchedSources});validObservationIds.push(obs.id);}if(validObservationIds.length&&supportsContactClaimAcrossObservations(observedClaimMaterials,item,cleanValue,vectorType))return{claimEventId:row.id,observationEventIds:validObservationIds};}return null;}
export async function persistSourceBackedBureauContactsForEntity(entityId:number,items:readonly BureauContactLike[]|null|undefined,source:string,jobId?:string|null,observedSourceUrls?:readonly string[]|null,provenance?:InvestigatorPromotionProvenance):Promise<number>{if(!entityId)return 0;const agenticSource=/agentic/i.test(source);const backed=agenticSource?observedSourceBackedBureauContacts(items,observedSourceUrls):sourceBackedBureauContacts(items);if(!backed.length)return 0;let targetName="",companyName:string|null=null;try{const rows=await db.select({name:entitiesTable.name,metadata:entitiesTable.metadata}).from(entitiesTable).where(eq(entitiesTable.id,entityId)).limit(1);targetName=rows[0]?.name??"";if(rows[0]?.metadata){try{const meta=JSON.parse(rows[0].metadata) as Record<string,unknown>;companyName=typeof meta.companyName==="string"?meta.companyName:null;}catch{}}}catch{}const values:Array<any>=[];const normalized:Array<{item:BureauContactLike;vectorType:string;value:string;sourceUrls:string[]}>=[];const seen=new Set<string>();for(const item of backed){if(String(item.state??"").toLowerCase()==="rejected")continue;const raw=typeof item.value==="string"?item.value.trim():"";if(!raw)continue;const vectorType=mapVectorType(String(item.vectorType??"other"),raw);const value=sanitizeValue(vectorType,raw);if(!value||isTrashContactValue(vectorType,value))continue;const sourceUrls=(item.sourceUrls??[]).filter((u):u is string=>typeof u==="string"&&isClaimSourceUrl(u));if(!sourceUrls.length)continue;const key=`${vectorType}:${value.toLowerCase()}:${source}`;if(seen.has(key))continue;seen.add(key);normalized.push({item,vectorType,value,sourceUrls});const collision=assessIdentityCollision({targetName,companyName,personName:item.personName??null,value,sourceUrls,note:item.note??null});const orgish=String(item.scope??item.tier??"").toLowerCase().includes("organization")||/^(info|contact|office|press|hello|admin|sales|support)@/i.test(value);values.push({entityId,vectorType,value,source,sourceUrl:sourceUrls[0]??null,extractionMethod:"agentic-model-finding",sourceReliability:collision.risk?.28:.55,identityMatch:orgish?Math.min(.35,collision.identityMatch):collision.identityMatch,recencyScore:.7,directnessScore:orgish?.3:.5,independentCorroboration:countIndependentSourceHosts(sourceUrls),validationStatus:"candidate",rejectionReason:null,observedAt:new Date(),metadata:JSON.stringify({scope:orgish?"organization":(item.scope??item.tier??"unknown"),personName:item.personName??null,role:item.role??null,note:item.note??null,sourceUrls,fromAgenticInvestigator:agenticSource,investigatorSelectedForCard:item.promote===true,identityCollisionRisk:collision.risk,identityCollisionReason:collision.reason,jobId:jobId??null})});}if(!values.length)return 0;
  if (provenance?.jobId) {
    await db.transaction(async (tx) => {
      const [ownedCase] = await tx.select({ status: researchCasesTable.status, currentAction: researchCasesTable.currentAction, caseFile: researchCasesTable.caseFile })
        .from(researchCasesTable)
        .where(and(
          eq(researchCasesTable.id, provenance.caseId),
          eq(researchCasesTable.status, "active"),
          sql`${researchCasesTable.caseFile}::jsonb ->> 'atlasJobId' = ${provenance.jobId}`,
          sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost','canonical-continuation-cancelled')`,
        ))
        .for("update")
        .limit(1);
      if (!ownedCase) throw new Error("Contact evidence persistence lost durable Atlas job ownership; refusing stale evidence mutation.");
      await tx.insert(contactEvidenceTable).values(values).onConflictDoNothing();
    }, { isolationLevel: "serializable" });
  } else {
    await db.insert(contactEvidenceTable).values(values).onConflictDoNothing();
  }
  if(agenticSource){const fieldByType:Record<string,string>={email:"email",phone:"phone",linkedin:"linkedinUrl",twitter:"twitterHandle",instagram:"instagramHandle",telegram:"telegramHandle",website:"personalWebsite"};const grouped=new Map<string,typeof normalized>();for(const row of normalized){if(row.item.promote!==true)continue;const field=fieldByType[row.vectorType];if(!field)continue;if(String(row.item.scope??"").toLowerCase()!=="candidate")continue;const personName=typeof row.item.personName==="string"?row.item.personName.trim():"";if(!personName)continue;if(!provenance)continue;const support=await resolveImmutablePromotionSupport(provenance,row.item,row.value,row.vectorType,entityId);if(!support)continue;const bucket=grouped.get(field)??[];bucket.push(row);grouped.set(field,bucket);}for(const [field,bucket] of grouped){if(bucket.length!==1)continue;const selected=bucket[0]!;await applyInvestigatorSelectedContactToEntityCard(entityId,{...selected.item,vectorType:selected.vectorType,value:selected.value,sourceUrls:selected.sourceUrls,promote:true},observedSourceUrls??[],jobId,provenance);}}return values.length;}
/**
 * PersonCandidate describes unverified wealth, not an unowned contact field.
 * Candidate contacts can be stored only after this function's target-case,
 * same-page identity/value, immutable provenance, collision and transaction
 * checks all pass. Wealth classification remains independent.
 */
export function isContactPromotionEligibleEntityType(type: unknown): boolean {
  return type === "HNWI" || type === "Gatekeeper" || type === "PersonCandidate";
}

export async function applyInvestigatorSelectedContactToEntityCard(entityId:number,item:BureauContactLike|null|undefined,observedSourceUrls:readonly string[]|null|undefined,jobId?:string|null,provenance?:InvestigatorPromotionProvenance):Promise<boolean>{if(!entityId||!item?.promote||!hasCanonicalPromotionJobBinding(provenance))return false;const promotionJobId=provenance.jobId.trim();if(jobId&&jobId.trim()!==promotionJobId)return false;if(String(item.scope??"").toLowerCase()!=="candidate")return false;const personName=typeof item.personName==="string"?item.personName.trim():"";if(!personName)return false;const backed=observedSourceBackedBureauContacts([item],observedSourceUrls);if(backed.length!==1)return false;const candidate=backed[0]!;const candidateSourceUrls=Array.isArray(candidate.sourceUrls)?candidate.sourceUrls:[];if(!candidateSourceUrls.length)return false;const value=typeof candidate.value==="string"?candidate.value.trim():"";if(!value)return false;const vectorType=mapVectorType(String(candidate.vectorType??"other"),value);const clean=sanitizeValue(vectorType,value);if(!clean||isTrashContactValue(vectorType,clean))return false;const fieldByType:Record<string,"email"|"phone"|"linkedinUrl"|"twitterHandle"|"instagramHandle"|"telegramHandle"|"personalWebsite">={email:"email",phone:"phone",linkedin:"linkedinUrl",twitter:"twitterHandle",instagram:"instagramHandle",telegram:"telegramHandle",website:"personalWebsite"};const field=fieldByType[vectorType];if(!field)return false;const support=await resolveImmutablePromotionSupport(provenance,candidate,clean,vectorType,entityId);if(!support)return false;const rows=await db.select({name:entitiesTable.name,type:entitiesTable.type,metadata:entitiesTable.metadata}).from(entitiesTable).where(eq(entitiesTable.id,entityId)).limit(1);const entity=rows[0];if(!entity)return false;if(entity.name.trim().toLowerCase()!==personName.toLowerCase())return false;if(!isContactPromotionEligibleEntityType(entity.type))return false;let companyName:string|null=null;try{const meta=entity.metadata?JSON.parse(entity.metadata) as Record<string,unknown>:{};companyName=typeof meta.companyName==="string"?meta.companyName:null;}catch{return false;}const collision=assessIdentityCollision({targetName:entity.name,companyName,personName:candidate.personName??null,value:clean,sourceUrls:candidateSourceUrls,note:candidate.note??null});if(collision.risk||collision.identityMatch<.65)return false;const fieldColumn=entitiesTable[field];const promotionMetadata={value:clean,personName,sourceUrls:candidateSourceUrls,observedSourceUrls:candidateSourceUrls,claimEventId:support.claimEventId,observationEventIds:support.observationEventIds,jobId:promotionJobId,recordedAt:new Date().toISOString()};const metadataExpression=sql`jsonb_set(CASE WHEN ${entitiesTable.metadata} IS NULL OR btrim(${entitiesTable.metadata}) = '' THEN '{}'::jsonb ELSE ${entitiesTable.metadata}::jsonb END, ARRAY['agenticContactProvenance', ${field}], ${JSON.stringify(promotionMetadata)}::jsonb, true)::text`;const promoted=await db.transaction(async(tx)=>{const [ownedCase]=await tx.select({status:researchCasesTable.status,currentAction:researchCasesTable.currentAction,caseFile:researchCasesTable.caseFile}).from(researchCasesTable).where(and(eq(researchCasesTable.id,provenance.caseId),eq(researchCasesTable.caseType,"target"),eq(researchCasesTable.status,"active"),sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost','canonical-continuation-cancelled')`)).for("update").limit(1);if(!ownedCase)return false;let boundFile:Record<string,unknown>;try{boundFile=JSON.parse(ownedCase.caseFile??"{}") as Record<string,unknown>;}catch{return false;}if(String(boundFile.atlasJobId??boundFile.jobId??"")!==promotionJobId)return false;if(!(await isCanonicalJobOwner("atlas-run",promotionJobId)))return false;const [lockedEntity]=await tx.select({name:entitiesTable.name,type:entitiesTable.type,metadata:entitiesTable.metadata}).from(entitiesTable).where(eq(entitiesTable.id,entityId)).for("update").limit(1);if(!lockedEntity||lockedEntity.name.trim().toLowerCase()!==personName.toLowerCase()||!isContactPromotionEligibleEntityType(lockedEntity.type))return false;let lockedCompanyName:string|null=null;try{const currentMetadata=lockedEntity.metadata?JSON.parse(lockedEntity.metadata) as Record<string,unknown>:{};lockedCompanyName=typeof currentMetadata.companyName==="string"?currentMetadata.companyName:null;}catch{return false;}const lockedCollision=assessIdentityCollision({targetName:lockedEntity.name,companyName:lockedCompanyName,personName:candidate.personName??null,value:clean,sourceUrls:candidateSourceUrls,note:candidate.note??null});if(lockedCollision.risk||lockedCollision.identityMatch<.65)return false;const [updated]=await tx.update(entitiesTable).set({[field]:clean,metadata:metadataExpression}).where(and(eq(entitiesTable.id,entityId),eq(entitiesTable.name,lockedEntity.name),or(isNull(fieldColumn),eq(fieldColumn,"")))).returning({id:entitiesTable.id});return Boolean(updated);});return promoted;}
