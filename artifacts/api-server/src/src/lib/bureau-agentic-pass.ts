/** Bureau-facing wrapper around the canonical model-owned ReAct Investigator. */
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, researchCasesTable, researchCaseEventsTable } from "@workspace/db";
import { logger } from "./logger";
import { runAgenticWebResearch, type AgenticFinding, type AgenticTrajectoryRecord } from "./agentic-web-research";
import type { InvestigatorCapability } from "./investigator-capability-registry";
import { resolveResearchDepth } from "./research-depth";
import { isClaimGradeObservationAction, persistSourceBackedBureauContactsForEntity, supportsReviewableClaimAcrossObservations } from "./bureau-contact-persist-strict";
import { publishBureauEvent } from "./bureau-live-log";
import { recordDiscoveryTrace } from "./investigator-trace";
import { spanFromLiveStep } from "./dig-span";
import { sanitizeObservableValue, sanitizeUrlForEvidence } from "./url-privacy";

export type BureauAgenticPassResult = { status:"completed"|"unavailable"|"error"|"skipped"|"timeout"|"cancelled"; model:string; iterations:number; searches:number; visits:number; findings:AgenticFinding[]; modelFindings?:AgenticFinding[]; contactEvidence:Array<{vectorType:string;value:string;scope:string;personName:string|null;role:string|null;sourceUrls:string[];note:string}>; trajectory:string[]; trajectoryRecords?:AgenticTrajectoryRecord[]; caseId?:number; runId?:string; stopReason?:string; error?:string };
const WEB_SPECIALISTS=new Set(["web","contact","footprint"]);
export function isWebSpecialistAction(specialistId:string|null|undefined):boolean{return WEB_SPECIALISTS.has(String(specialistId??"").toLowerCase());}
function normalizeObservedUrl(raw:string):string|null{try{const safe=sanitizeUrlForEvidence(raw);if(safe.startsWith("["))return null;const url=new URL(safe);if(!/^https?:$/i.test(url.protocol))return null;url.hash="";url.hostname=url.hostname.toLowerCase();return url.href.endsWith("/")?url.href.slice(0,-1):url.href;}catch{return null;}}
function observedUrlsFromTrajectory(trajectory:string[], records:AgenticTrajectoryRecord[]=[]):Set<string>{
  const observed=new Set<string>();
  for(const record of records){
    if(record.execution!=="success") continue;
    for(const raw of record.observedUrls??[]){const normalized=normalizeObservedUrl(raw);if(normalized)observed.add(normalized);}
  }
  if(observed.size===0){
    for(const line of trajectory){
      const match=String(line).match(/step\d+:\s+(?:visit|browser_fetch)\s+https?:\/\/\S+\s+execution=success(?:\s+observed=(https?:\/\/\S+))?/i);
      if(match?.[1]){const normalized=normalizeObservedUrl(match[1]);if(normalized)observed.add(normalized);}
    }
  }
  return observed;
}
function isReviewableObservation(record: AgenticTrajectoryRecord): boolean {
  return record.execution === "success"
    && isClaimGradeObservationAction(record.action)
    && typeof record.observation === "string"
    && record.observation.trim().length > 0;
}
function claimGradeSourceUrlsFromTrajectory(records: AgenticTrajectoryRecord[] = []): Set<string> {
  const observed = new Set<string>();
  for (const record of records) {
    if (!isReviewableObservation(record)) continue;
    for (const raw of record.observedUrls ?? []) {
      const normalized = normalizeObservedUrl(raw);
      if (normalized) observed.add(normalized);
    }
  }
  return observed;
}
function claimAppearsInObservedMaterial(finding: AgenticFinding, records: AgenticTrajectoryRecord[]): boolean {
  const sources = new Set(finding.sourceUrls.map(normalizeObservedUrl).filter((url): url is string => Boolean(url)));
  if (!sources.size || !finding.value.trim()) return false;
  const observations = records
    .filter((record) => isReviewableObservation(record))
    .map((record) => ({
      observationText: record.observation ?? "",
      sourceUrls: (record.observedUrls ?? []).map(normalizeObservedUrl).filter((url): url is string => url !== null && sources.has(url)),
    }))
    .filter((record) => record.sourceUrls.length > 0);
  // Reviewable output may join complementary sources, but every cited URL must
  // support exact identity or value text. Trusted promotion uses the stricter
  // same-observation co-binding gate in bureau-contact-persist-strict.ts.
  return supportsReviewableClaimAcrossObservations(observations, finding, finding.value, finding.vectorType);
}
export function sourceBackedAgenticFindings(findings:AgenticFinding[],trajectory:string[]=[],records:AgenticTrajectoryRecord[]=[]):AgenticFinding[]{const observed=claimGradeSourceUrlsFromTrajectory(records);return findings.filter((f)=>Array.isArray(f.sourceUrls)).map((f)=>({...f,sourceUrls:[...new Set(f.sourceUrls.map(normalizeObservedUrl).filter((url):url is string=>Boolean(url)))]})).filter((f)=>f.sourceUrls.length>0&&f.sourceUrls.every((url)=>observed.has(url))&&claimAppearsInObservedMaterial(f,records));}
export function findingsToContactEvidence(findings:AgenticFinding[],trajectory:string[]=[],records:AgenticTrajectoryRecord[]=[]){return sourceBackedAgenticFindings(findings,trajectory,records).map((f)=>({vectorType:f.vectorType,value:f.value,scope:f.scope==="candidate"?"candidate":"organization",personName:f.scope==="candidate"?f.personName:null,role:f.role,sourceUrls:f.sourceUrls.filter((u)=>/^https?:\/\/\S+$/i.test(String(u))),note:f.note}));}
export function findingsToBureauContacts(findings:AgenticFinding[],_fallbackPersonName:string,trajectory:string[]=[],records:AgenticTrajectoryRecord[]=[]){return sourceBackedAgenticFindings(findings,trajectory,records).map((f)=>{const person=typeof f.personName==="string"?f.personName.trim():"";const candidate=f.scope==="candidate"&&person.length>0;return{vectorType:f.vectorType,value:f.value,scope:candidate?"candidate":"organization",personName:candidate?person:null,role:f.role,sourceUrls:f.sourceUrls.filter((u)=>/^https?:\/\/\S+$/i.test(String(u))),note:`bureau-agentic:${f.note}`,tier:"candidate",state:"review_only",promote:candidate&&f.promotionDecision==="promote"};});}
async function loadDurableSearchQueries(caseId:number|null):Promise<string[]>{if(caseId==null)return[];const rows=await db.select({payload:researchCaseEventsTable.payload,status:researchCaseEventsTable.status}).from(researchCaseEventsTable).where(eq(researchCaseEventsTable.caseId,caseId));const queries:string[]=[];for(const row of rows){if((row.status!=="success"&&row.status!=="error")||typeof row.payload!=="string")continue;try{const payload=JSON.parse(row.payload) as Record<string,unknown>;const action=typeof payload.action==="string"?payload.action:"";const args=payload.args&&typeof payload.args==="object"?payload.args as Record<string,unknown>:{};if(action==="web_search"&&typeof args.query==="string")queries.push(args.query);if(action==="parallel_web_search"&&Array.isArray(args.searches))for(const search of args.searches){if(search&&typeof search==="object"&&typeof (search as Record<string,unknown>).query==="string")queries.push((search as Record<string,unknown>).query as string);}}catch{}}return[...new Set(queries.map((query)=>query.trim()).filter(Boolean))];}
async function loadMountedCaseContext(caseId:number|undefined,mode:"target"|"discovery",jobId:string|undefined,runId:string):Promise<string|null>{if(caseId==null)return null;const[row]=await db.select({caseFile:researchCasesTable.caseFile,caseType:researchCasesTable.caseType}).from(researchCasesTable).where(and(eq(researchCasesTable.id,caseId),eq(researchCasesTable.caseType,mode))).limit(1);if(!row?.caseFile)throw new Error(`Investigation case ${caseId} has no durable case file of type ${mode}.`);let parsed:Record<string,unknown>;try{parsed=JSON.parse(row.caseFile) as Record<string,unknown>;}catch{throw new Error(`Investigation case ${caseId} has unreadable durable state.`);}const storedJob=typeof parsed.jobId==="string"?parsed.jobId:typeof parsed.atlasJobId==="string"?parsed.atlasJobId:null;const storedRun=typeof parsed.runId==="string"?parsed.runId:null;if(jobId&&storedJob!==jobId)throw new Error(`Investigation case ${caseId} is not bound to Atlas job ${jobId}.`);if(mode==="target"&&storedRun&&storedRun!==runId)throw new Error(`Investigation case ${caseId} is bound to a different execution run.`);const document=typeof parsed.contextDocument==="string"?parsed.contextDocument.trim():"";if(!document)throw new Error(`Investigation case ${caseId} has no durable context document.`);return document;}
async function ensureDiscoveryCaseContext(input:{mode?:"target"|"discovery";objective?:string;investigatorLlm?:InvestigatorCapability;jobId?:string;runId:string}):Promise<number|null>{if(input.mode!=="discovery"||!input.jobId)return null;const [created]=await db.insert(researchCasesTable).values({caseType:"discovery",status:"active",directorMode:"groq_boss",directorProvider:"groq",directorModel:"pending",objective:input.objective??"Canonical Atlas model-owned discovery",motivation:"Durable memory for canonical Atlas Investigator discovery.",openingPrompt:"Investigator chooses every research action. This case is memory/state, not a deterministic research plan.",caseFile:JSON.stringify({caseType:"discovery",contextDocument:["CANONICAL ATLAS DISCOVERY CASE",`JOB: ${input.jobId}`,`RUN: ${input.runId}`,`INVESTIGATOR: ${input.investigatorLlm??"unassigned"}`,`OBJECTIVE: ${input.objective??""}`,"STATE: Discovery mode; no person target is implied."].join("\n"),investigationTimeline:[],investigatorTrajectory:[],investigatorTrajectoryRecords:[],jobId:input.jobId,runId:input.runId}),currentAction:"canonical-investigator-discovery",iteration:0}).returning({id:researchCasesTable.id});const caseId=created?.id??null;if(caseId)await db.insert(researchCaseEventsTable).values({caseId,iteration:0,actorRole:"head_investigator",eventType:"assignment",status:"recorded",summary:"Atlas discovery Investigator mounted into durable discovery state.",correlationKey:`${input.runId}:assignment`,payload:JSON.stringify({jobId:input.jobId,runId:input.runId,investigatorLlm:input.investigatorLlm,architecture:"free-react",mode:"discovery"})});return caseId;}
function compactDurableDiscoveryRecords(records:AgenticTrajectoryRecord[]): AgenticTrajectoryRecord[] {
  // The immutable research_case_events ledger retains the complete observations.
  // caseFile is a bounded working projection and must stay below the 1 MiB DB fence.
  return records.slice(Math.max(0, records.length - 64)).map((record) => ({
    ...record,
    args: Object.fromEntries(Object.entries(record.args ?? {}).slice(0, 24).map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 800) : value])),
    thought: record.thought?.slice(0, 600),
    observation: record.observation?.slice(0, 2_000),
    observedUrls: [...new Set(record.observedUrls ?? [])].slice(0, 24),
    findings: (record.findings ?? []).slice(0, 24).map((finding) => ({
      ...finding,
      value: finding.value?.slice(0, 500),
      personName: finding.personName?.slice(0, 160) ?? null,
      role: finding.role?.slice(0, 160) ?? null,
      sourceUrls: [...new Set(finding.sourceUrls ?? [])].slice(0, 24),
      note: finding.note?.slice(0, 500),
      promotionReason: finding.promotionReason?.slice(0, 500),
    })),
  }));
}

async function persistDiscoveryTrajectory(caseId:number,input:{objective?:string;investigatorLlm?:InvestigatorCapability;jobId?:string;runId:string;baseIteration?:number;finalize?:boolean},result:{trajectory:string[];trajectoryRecords:AgenticTrajectoryRecord[];groundingTrajectoryRecords?:AgenticTrajectoryRecord[];model:string;iterations:number;searches:number;visits:number;stopReason?:string}):Promise<void>{
  const [row]=await db.select({caseFile:researchCasesTable.caseFile,iteration:researchCasesTable.iteration}).from(researchCasesTable).where(eq(researchCasesTable.id,caseId)).limit(1);
  if(!row?.caseFile)throw new Error(`Discovery case ${caseId} disappeared before trajectory persistence.`);
  let current:Record<string,any>;
  try{current=JSON.parse(row.caseFile) as Record<string,any>;}catch{throw new Error(`Discovery case ${caseId} has unreadable durable state.`);}
  const existingRunIds=Array.isArray(current.runIds)?current.runIds.filter((value):value is string=>typeof value==="string"):[];
  if(existingRunIds.includes(input.runId) && !input.finalize)return;
  const priorIteration=Math.max(0,Number(row.iteration??0)||0);
  const baseIteration=Math.max(0,Number.isFinite(input.baseIteration) ? Number(input.baseIteration) : priorIteration);
  const rawTrajectory=Array.isArray(result.trajectory)?result.trajectory:[];
  const rawRecords=Array.isArray(result.trajectoryRecords)?result.trajectoryRecords:[];
  const offsetRecords=rawRecords.map((record)=>({...record,turn:baseIteration+Math.max(1,Number(record.turn)||1)}));const groundingRecords=result.groundingTrajectoryRecords??result.trajectoryRecords;
  const renumberedTrajectory=rawTrajectory.map((line)=>{
    if(typeof line!=="string")return line;
    return line.replace(/^step(\d+):/i,(_match:string,numberString:string)=>`step${baseIteration+Number(numberString)}:`);
  });
  let durableEvidenceState=current.evidenceState;
  const intelligenceLine=[...rawTrajectory].reverse().find((line)=>typeof line==="string"&&line.startsWith("INTELLIGENCE_STATE:"));
  if(intelligenceLine){try{durableEvidenceState=JSON.parse(intelligenceLine.slice("INTELLIGENCE_STATE:".length));}catch{logger.warn({caseId,runId:input.runId},"Ignoring malformed Investigator intelligence state during persistence.");}}
  const priorTrajectory=Array.isArray(current.investigatorTrajectory)?current.investigatorTrajectory.filter((value):value is string=>typeof value==="string"):[];
  const priorRecords=Array.isArray(current.investigatorTrajectoryRecords)?current.investigatorTrajectoryRecords as AgenticTrajectoryRecord[]:[];
  const existingTrajectoryEvents=await db.select({correlationKey:researchCaseEventsTable.correlationKey}).from(researchCaseEventsTable).where(eq(researchCaseEventsTable.caseId,caseId));
  const existingTrajectoryKeys=new Set(existingTrajectoryEvents.map((event)=>String(event.correlationKey)));
  const newOffsetRecords=offsetRecords.filter((record)=>!existingTrajectoryKeys.has(`${input.runId}:turn:${record.turn}:trajectory`));
  const newTrajectoryLines=renumberedTrajectory.slice(Math.max(0,renumberedTrajectory.length-newOffsetRecords.length));
  const accumulatedTrajectory=[...priorTrajectory,...newTrajectoryLines];
  const accumulatedRecords=[...priorRecords,...newOffsetRecords];
  const durableProjectionRecords=compactDurableDiscoveryRecords(accumulatedRecords);
  const incrementalSearches=newOffsetRecords.reduce((total,record)=>total+(record.action==="web_search"?1:record.action==="parallel_web_search"&&Array.isArray(record.args?.searches)?record.args.searches.length:0),0);
  const incrementalVisits=newOffsetRecords.reduce((total,record)=>total+(record.action==="visit"?1:record.action==="browser_fetch"&&record.execution==="success"?1:0),0);
  const nextIteration=Math.max(priorIteration,...newOffsetRecords.map((record)=>record.turn));
  const nextRunIds=input.finalize?[...new Set([...existingRunIds,input.runId])]:existingRunIds;
  const memoryProjection={caseType:current.caseType,jobId:current.jobId,runId:input.runId,runIds:nextRunIds,atlasControlDecisions:current.atlasControlDecisions,admittedCandidates:current.admittedCandidates,openQuestions:current.openQuestions,evidenceState:durableEvidenceState,bossState:current.bossState,rightHandState:current.rightHandState,investigatorLlm:input.investigatorLlm??result.model,iterations:nextIteration,searches:(Number(current.searches)||0)+incrementalSearches,visits:(Number(current.visits)||0)+incrementalVisits,stopReason:input.finalize?result.stopReason:current.stopReason};
  const contextDocument=["CANONICAL ATLAS DISCOVERY CASE",`INVESTIGATOR: ${input.investigatorLlm??result.model}`,`JOB: ${input.jobId??"none"}`,`RUN: ${input.runId}`,`OBJECTIVE: ${input.objective??""}`,"DURABLE CASE MEMORY PROJECTION:",JSON.stringify(memoryProjection),"BOUNDED TRAJECTORY PROJECTION (complete observations remain in research_case_events):",JSON.stringify(durableProjectionRecords)].join("\n");
  await db.transaction(async(tx)=>{
    const [locked] = await tx.select({ caseFile: researchCasesTable.caseFile, iteration: researchCasesTable.iteration }).from(researchCasesTable).where(eq(researchCasesTable.id, caseId)).for("update").limit(1);
    if (!locked?.caseFile) throw new Error(`Discovery case ${caseId} disappeared during trajectory persistence.`);
    let lockedCase: Record<string, any>;
    try { lockedCase = JSON.parse(locked.caseFile) as Record<string, any>; } catch { throw new Error(`Discovery case ${caseId} has unreadable durable state during trajectory persistence.`); }
    const lockedRunIds = Array.isArray(lockedCase.runIds) ? lockedCase.runIds.filter((value): value is string => typeof value === "string") : [];
    if (lockedRunIds.includes(input.runId)) return;
    if (locked.caseFile !== row.caseFile || Number(locked.iteration ?? 0) !== Number(row.iteration ?? 0)) {
      throw new Error(`Discovery trajectory persistence detected a stale case snapshot for run ${input.runId}; retry from the latest durable case state.`);
    }
    const [projected] = await tx.update(researchCasesTable).set({caseFile:JSON.stringify(sanitizeObservableValue({...current,evidenceState:durableEvidenceState,contextDocument,investigatorTrajectory:accumulatedTrajectory,investigatorTrajectoryRecords:durableProjectionRecords,trajectoryPersistedAt:new Date().toISOString(),investigatorLlm:input.investigatorLlm??result.model,runId:input.runId,runIds:nextRunIds,searches:memoryProjection.searches,visits:memoryProjection.visits})),iteration:nextIteration,currentAction:result.stopReason==="MODEL_DECIDED_DONE"?"review":"investigator-completed",updatedAt:new Date()}).where(and(eq(researchCasesTable.id,caseId),eq(researchCasesTable.status,"active"),sql`${researchCasesTable.caseFile}::jsonb ->> 'jobId' = ${input.jobId ?? ""}`,sql`${researchCasesTable.currentAction} NOT IN ('canonical-atlas-cancelled','canonical-lease-lost')`)).returning({id:researchCasesTable.id}); if(!projected?.id) throw new Error("Discovery trajectory projection rejected by the durable cancellation/ownership fence.");
    for(const record of newOffsetRecords){
      const eventType=record.action==="done"?"decision":record.action==="investigator_provider_error"?"provider_error":"tool_observation";
      const correlationKey=`${input.runId}:turn:${record.turn}:trajectory`;
      const payload=JSON.stringify(sanitizeObservableValue({jobId:input.jobId??null,runId:input.runId,runModel:input.investigatorLlm??result.model,turn:record.turn,action:record.action,args:record.args,thought:record.thought??null,execution:record.execution,observation:record.observation??null,observedUrls:record.observedUrls,findings:record.findings,providerFallback:record.providerFallback??[],stopReason:record.stopReason??null,failureDomain:record.failureDomain??null,failureKind:record.failureKind??null}));
      const inserted=await tx.insert(researchCaseEventsTable).values({caseId,iteration:record.turn,actorRole:"head_investigator",eventType,status:record.execution,summary:record.action==="done"?`Investigator ended ReAct run; findings=${record.findings.length}.`:`Investigator turn ${record.turn}: ${record.action}; execution=${record.execution}.`,correlationKey,payload}).onConflictDoNothing({target:[researchCaseEventsTable.caseId,researchCaseEventsTable.correlationKey]}).returning({id:researchCaseEventsTable.id});
      if(!inserted[0]?.id){const[existing]=await tx.select({id:researchCaseEventsTable.id,payload:researchCaseEventsTable.payload,eventType:researchCaseEventsTable.eventType,actorRole:researchCaseEventsTable.actorRole}).from(researchCaseEventsTable).where(and(eq(researchCaseEventsTable.caseId,caseId),eq(researchCaseEventsTable.correlationKey,correlationKey))).limit(1);if(!existing||existing.eventType!==eventType||existing.actorRole!=="head_investigator"||existing.payload!==payload)throw new Error(`Discovery trajectory replay mismatch for ${correlationKey}`);}
    }
    for(const record of offsetRecords.filter((candidate)=>input.finalize===true&&candidate.action==="done"&&candidate.execution==="success")){
      for(const[findingIndex,finding]of record.findings.entries()){
        if(!claimAppearsInObservedMaterial(finding,groundingRecords))continue;
        const observationTurns=offsetRecords.filter((candidate)=>isReviewableObservation(candidate)&&candidate.observedUrls.some((url)=>finding.sourceUrls.some((source)=>normalizeObservedUrl(url)===normalizeObservedUrl(source)))).map((candidate)=>candidate.turn).filter((turn,index,turns)=>turns.indexOf(turn)===index);
        const citedUrls=new Set(finding.sourceUrls.map(normalizeObservedUrl).filter((url):url is string=>Boolean(url)));
        const observationEventIds:number[] = groundingRecords
          .filter((candidate)=>candidate.durableEventId!=null&&isReviewableObservation(candidate)&&candidate.observedUrls.some((url)=>{const normalized=normalizeObservedUrl(url);return normalized!==null&&citedUrls.has(normalized);}))
          .map((candidate)=>candidate.durableEventId!);
        for(const turn of observationTurns){const key=`${input.runId}:turn:${turn}:trajectory`;const id=(await tx.select({id:researchCaseEventsTable.id}).from(researchCaseEventsTable).where(and(eq(researchCaseEventsTable.caseId,caseId),eq(researchCaseEventsTable.correlationKey,key))).limit(1))[0]?.id;if(id)observationEventIds.push(id);}
        const uniqueObservationEventIds=[...new Set(observationEventIds)].sort((a,b)=>a-b);
        if(!uniqueObservationEventIds.length)continue;
        const claimKey=`${input.runId}:turn:${record.turn}:claim:${findingIndex}:${finding.vectorType}:${finding.value.trim().toLowerCase()}`;
        const claimPayload=JSON.stringify({jobId:input.jobId??null,runId:input.runId,claim:finding,observationEventIds:uniqueObservationEventIds});
        const claimInserted=await tx.insert(researchCaseEventsTable).values({caseId,iteration:record.turn,actorRole:"head_investigator",eventType:"claim",status:"recorded",summary:`Investigator authored claim ${finding.vectorType}.`,correlationKey:claimKey,payload:claimPayload}).onConflictDoNothing({target:[researchCaseEventsTable.caseId,researchCaseEventsTable.correlationKey]}).returning({id:researchCaseEventsTable.id});
        let claimEventId=claimInserted[0]?.id ?? null;
        if(!claimEventId){const[existingClaim]=await tx.select({id:researchCaseEventsTable.id,payload:researchCaseEventsTable.payload,eventType:researchCaseEventsTable.eventType,actorRole:researchCaseEventsTable.actorRole}).from(researchCaseEventsTable).where(and(eq(researchCaseEventsTable.caseId,caseId),eq(researchCaseEventsTable.correlationKey,claimKey))).limit(1);if(!existingClaim||existingClaim.eventType!=="claim"||existingClaim.actorRole!=="head_investigator"||existingClaim.payload!==claimPayload)throw new Error(`Discovery claim replay mismatch for ${claimKey}`);claimEventId=existingClaim.id;}
        if(!finding.promotionDecision)continue;
        const promotionKey=`${claimKey}:promotion`;const promotionPayload=JSON.stringify({jobId:input.jobId??null,runId:input.runId,claimEventId,decision:finding.promotionDecision,reason:finding.promotionReason??null});
        const promotionInserted=await tx.insert(researchCaseEventsTable).values({caseId,iteration:record.turn,actorRole:"head_investigator",eventType:"promotion",status:finding.promotionDecision,summary:`Investigator explicitly ${finding.promotionDecision}d claim.`,correlationKey:promotionKey,payload:promotionPayload}).onConflictDoNothing({target:[researchCaseEventsTable.caseId,researchCaseEventsTable.correlationKey]}).returning({id:researchCaseEventsTable.id});
        if(!promotionInserted[0]?.id){const[existingPromotion]=await tx.select({payload:researchCaseEventsTable.payload,eventType:researchCaseEventsTable.eventType,actorRole:researchCaseEventsTable.actorRole}).from(researchCaseEventsTable).where(and(eq(researchCaseEventsTable.caseId,caseId),eq(researchCaseEventsTable.correlationKey,promotionKey))).limit(1);if(!existingPromotion||existingPromotion.eventType!=="promotion"||existingPromotion.actorRole!=="head_investigator"||existingPromotion.payload!==promotionPayload)throw new Error(`Discovery promotion replay mismatch for ${promotionKey}`);}
      }
    }
  });
}
export async function runBureauAgenticWebPass(input:{mode?:"target"|"discovery";targetName:string;companyName?:string|null;objective?:string;investigatorLlm?:InvestigatorCapability;caseId?:string|number;jobId?:string;runId?:string;maxIterations?:number;hardTimeoutMs?:number;entityId?:number;persist?:boolean;priorTrajectoryRecords?:readonly AgenticTrajectoryRecord[];shouldCancel?:()=>boolean|Promise<boolean>;onInvestigationAct?: (step:{action:string;provider?:string;query?:string;url?:string;summary?:string})=>void|Promise<void>}):Promise<BureauAgenticPassResult>{const mode=input.mode??"target";const name=(input.targetName??"").trim();if(mode==="target"&&name.length<2)return{status:"skipped",model:"none",iterations:0,searches:0,visits:0,findings:[],contactEvidence:[],trajectory:[],modelFindings:[],error:"empty target"};const runId=input.runId?.trim()||randomUUID();try{let durableCaseId=input.caseId!=null?Number(input.caseId):null;if(durableCaseId==null)durableCaseId=await ensureDiscoveryCaseContext({...input,mode,runId});const mountedContext=await loadMountedCaseContext(durableCaseId??undefined,mode,input.jobId,runId);const priorSearchQueries=await loadDurableSearchQueries(durableCaseId);const [discoveryCaseRow]=mode==="discovery"&&durableCaseId!=null?await db.select({iteration:researchCasesTable.iteration}).from(researchCasesTable).where(eq(researchCasesTable.id,durableCaseId)).limit(1):[null];const discoveryBaseIteration=Math.max(0,Number(discoveryCaseRow?.iteration??0)||0);const objective=input.objective??(mode==="discovery"?"Discover evidence-backed public people and research leads. Choose the research path yourself; no person target is implied.":`Find publicly documented contact routes for ${name}${input.companyName?` related to ${input.companyName}`:""}. Use your own research judgment; never invent.`);let eventChain=Promise.resolve();let discoveryTrajectoryRecords:AgenticTrajectoryRecord[]=[];const agentic=await runAgenticWebResearch({targetName:mode==="discovery"?"":name,companyName:input.companyName??null,jobId:input.jobId??null,objective,priorContext:mountedContext ?? undefined,priorTrajectoryRecords:input.priorTrajectoryRecords,investigatorLlm:input.investigatorLlm,mode,caseId:durableCaseId??undefined,priorSearchQueries,maxIterations:input.maxIterations??resolveResearchDepth().agenticMaxIterations,hardTimeoutMs:input.hardTimeoutMs??resolveResearchDepth().agenticHardTimeoutMs,shouldCancel:input.shouldCancel,onTrajectoryRecord:mode==="discovery"&&durableCaseId!=null?async(record)=>{discoveryTrajectoryRecords=[...discoveryTrajectoryRecords.filter((prior)=>prior.turn!==record.turn),record].sort((a,b)=>a.turn-b.turn);await persistDiscoveryTrajectory(durableCaseId!,{...input,jobId:input.jobId,runId,baseIteration:discoveryBaseIteration,finalize:false},{trajectory:discoveryTrajectoryRecords.map((item)=>`step${item.turn}: ${item.action} execution=${item.execution}`),trajectoryRecords:discoveryTrajectoryRecords,model:input.investigatorLlm??"none",iterations:discoveryTrajectoryRecords.length,searches:0,visits:0,stopReason:undefined});}:undefined,onLiveStep:(step)=>{if(step.action!=="llm_wait"&&step.action!=="done"){try{spanFromLiveStep({jobId:input.jobId,targetName:mode==="discovery"?"discovery":name,tool:step.action,label:step.query||step.url||step.action,detail:step.summary,status:step.status??(step.action==="provider_error"||step.action==="parse_failure_terminal"?"error":undefined),agentName:"investigator"});}catch{}}eventChain=eventChain.then(async()=>{await input.onInvestigationAct?.({action:step.action,provider:step.provider,query:step.query,url:step.url,summary:step.summary});});void publishBureauEvent({actor:step.action==="registry_search"?"registry":"web",kind:step.action==="web_search"?"search":step.action==="visit"||step.action==="browser_fetch"?"page-fetch":"tool",jobId:input.jobId,title:`${step.action}${step.query?` · ${step.query}`:step.url?` · ${step.url}`:""}`,caseId:durableCaseId!=null?String(durableCaseId):undefined,targetName:mode==="discovery"?"discovery":name,provider:step.provider||step.action,why:step.summary,level:"info"});}});await eventChain;if(durableCaseId!=null&&mode==="discovery")await persistDiscoveryTrajectory(durableCaseId,{...input,jobId:input.jobId,runId,baseIteration:discoveryBaseIteration,finalize:true},agentic);const modelFindings=agentic.modelFindings??[];const groundingRecords=agentic.groundingTrajectoryRecords??agentic.trajectoryRecords;const backedFindings=sourceBackedAgenticFindings(modelFindings,agentic.trajectory,groundingRecords);const scopedFindings=mode==="discovery"?backedFindings.filter((f)=>f.scope==="candidate"&&typeof f.personName==="string"&&f.personName.trim().length>=2):backedFindings.filter((f)=>f.scope==="candidate"?(typeof f.personName==="string"&&f.personName.trim().length>=2):f.scope==="organization"?Boolean(input.companyName?.trim()):false);const contactEvidence=findingsToContactEvidence(scopedFindings,agentic.trajectory,groundingRecords);if(mode==="discovery"&&input.jobId){void recordDiscoveryTrace(input.jobId,{slot:-1,recordedAt:new Date().toISOString(),executionId:agentic.executionId,caseId:durableCaseId??undefined,model:agentic.model,status:agentic.status,searches:agentic.searches,visits:agentic.visits,stopReason:agentic.stopReason,error:agentic.error,modelFindings:agentic.modelFindings??[],parsedCandidates:scopedFindings.map((finding)=>({name:finding.personName,role:finding.role,sourceUrls:finding.sourceUrls,promotionDecision:finding.promotionDecision,promotionReason:finding.promotionReason,basis:finding.note})),trajectory:agentic.trajectory,resultUrls:groundingRecords.flatMap((record)=>record.observedUrls??[])}).catch(()=>undefined);}if(input.persist&&input.entityId){if(durableCaseId==null)throw new Error("Agentic contact persistence requires a durable case provenance boundary.");await persistSourceBackedBureauContactsForEntity(input.entityId,findingsToBureauContacts(scopedFindings,name,agentic.trajectory,groundingRecords),"case-bureau-agentic",input.jobId,[...observedUrlsFromTrajectory(agentic.trajectory,groundingRecords)],{caseId:durableCaseId,runId:agentic.runId??runId,jobId:input.jobId??null});}const mappedStatus=agentic.status==="unavailable"?"unavailable":agentic.status==="error"?"error":agentic.status==="timeout"?"timeout":agentic.status==="cancelled"?"cancelled":"completed";return{status:mappedStatus,model:agentic.model,findings:scopedFindings,searches:agentic.searches,visits:agentic.visits,iterations:agentic.iterations,contactEvidence,trajectory:agentic.trajectory,trajectoryRecords:agentic.trajectoryRecords,caseId:durableCaseId??undefined,runId,stopReason:agentic.stopReason,error:agentic.error,modelFindings};}catch(err:any){logger.warn({err:err?.message,target:name,mode,runId},"[Bureau] Agentic web pass failed");return{status:"error",model:"none",findings:[],searches:0,visits:0,iterations:0,contactEvidence:[],trajectory:[],runId,modelFindings:[],error:err?.message??"agentic pass failed"};}}
