import { createHash } from "node:crypto";
import type { DiscoveryCaseFile, ResearchCaseFile } from "./case-bureau";
import { apexOrientationCompact } from "./apex-bureau-orientation";
import { logger } from "./logger";
import { withProviderRetryOwnership } from "./provider-gate";
import {
  classifyProviderHttpStatus,
  classifyThrownProviderError,
  describeThrownProviderError,
  summarizeProviderBody,
  providerErrorCode,
} from "./provider-error-diagnostics";

// Canonical Right-hand model for the Groq control-plane role.
export const GROQ_RIGHT_HAND_MODEL = "openai/gpt-oss-120b";
export const GROQ_RIGHT_HAND_FALLBACK_MODELS: readonly string[] = [
  "openai/gpt-oss-20b",
];
const GROQ_RIGHT_HAND_MODELS_API = "https://api.groq.com/openai/v1/models";
const GROQ_RIGHT_HAND_CHAT_API = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_RIGHT_HAND_KEY_ENV = "GROQ_RIGHT_HAND_API_KEY";
const GROQ_RIGHT_HAND_KEY_NAMES = [GROQ_RIGHT_HAND_KEY_ENV, ...Array.from({ length: 5 }, (_, i) => `${GROQ_RIGHT_HAND_KEY_ENV}_${i + 1}`)];
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_OVERALL_TIMEOUT_MS = 120_000;
const MODEL_CATALOG_TIMEOUT_MS = 5_000;
const MAX_MODEL_ATTEMPTS = 4;
const MAX_503_RETRIES_PER_MODEL = 1;
const MAX_429_RETRIES_PER_MODEL = 1;
const MAX_TOKEN_RATE_LIMIT_RETRIES_PER_MODEL = 1;
const MAX_TOKEN_RATE_LIMIT_WAIT_MS = 60_000;
const MAX_PROMPT_CHARS = 20_000;
const GROQ_RIGHT_HAND_MIN_REQUEST_INTERVAL_MS = 250;
let nextGroqRightHandRequestAt = 0;
let groqRightHandRequestGate: Promise<void> = Promise.resolve();
export function resetGroqRightHandRequestGateForTests(): void { nextGroqRightHandRequestAt = 0; groqRightHandRequestGate = Promise.resolve(); }
function waitForGroqRightHandAbortable<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T> {
 if (!signal) return pending;
 if (signal.aborted) return Promise.reject(new Error("Groq Right-hand request slot cancelled."));
 return new Promise<T>((resolve, reject) => {
  let settled = false;
  const cleanup = () => signal.removeEventListener("abort", onAbort);
  const finish = (error?: unknown, value?: T) => {
   if (settled) return;
   settled = true;
   cleanup();
   if (error !== undefined) reject(error);
   else resolve(value as T);
  };
  const onAbort = () => finish(new Error("Groq Right-hand request slot cancelled."));
  signal.addEventListener("abort", onAbort, { once: true });
  pending.then((value) => finish(undefined, value), (error) => finish(error));
  if (signal.aborted) onAbort();
 });
}
function waitForGroqRightHandPacingDelay(waitMs: number, signal?: AbortSignal): Promise<void> {
 return new Promise<void>((resolve, reject) => {
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
   if (timer !== undefined) clearTimeout(timer);
   signal?.removeEventListener("abort", onAbort);
  };
  const finish = (error?: Error) => {
   if (settled) return;
   settled = true;
   cleanup();
   if (error) reject(error);
   else resolve();
  };
  const onAbort = () => finish(new Error("Groq Right-hand request slot cancelled."));
  timer = setTimeout(() => finish(), waitMs);
  signal?.addEventListener("abort", onAbort, { once: true });
  if (signal?.aborted) onAbort();
 });
}
export async function waitForGroqRightHandRequestSlot(signal?: AbortSignal): Promise<void> {
 const previous = groqRightHandRequestGate; let release!: () => void;
 groqRightHandRequestGate = new Promise<void>((resolve) => { release = resolve; });
 try {
  if (signal?.aborted) throw new Error("Groq Right-hand request slot cancelled.");
  await waitForGroqRightHandAbortable(previous, signal);
  const waitMs = Math.max(0, nextGroqRightHandRequestAt - Date.now());
  if (waitMs > 0) await waitForGroqRightHandPacingDelay(waitMs, signal);
  if (signal?.aborted) throw new Error("Groq Right-hand request slot cancelled.");
  nextGroqRightHandRequestAt = Date.now() + GROQ_RIGHT_HAND_MIN_REQUEST_INTERVAL_MS;
 } finally {
  release();
 }
}
function keyEntries(): Array<{name:string;key:string}> {
  return GROQ_RIGHT_HAND_KEY_NAMES.map(name=>({name,key:process.env[name]?.trim()||""})).filter(x=>x.key);
}
function key(){ return keyEntries()[0]?.key || null; }
function boundedEnv(name:string,fallback:number,min:number,max:number):number {
  const n=Number(process.env[name]); return Number.isFinite(n)?Math.min(max,Math.max(min,Math.floor(n))):fallback;
}
function requestTimeoutMs(){ return boundedEnv("APEX_GROQ_RIGHT_HAND_REQUEST_TIMEOUT_MS",DEFAULT_REQUEST_TIMEOUT_MS,5_000,60_000); }
function overallTimeoutMs(){ return boundedEnv("APEX_GROQ_RIGHT_HAND_OVERALL_TIMEOUT_MS",DEFAULT_OVERALL_TIMEOUT_MS,requestTimeoutMs(),180_000); }

export type GroqRightHandLatencyConfig={requestTimeoutMs:number;overallTimeoutMs:number;minimumOverallTimeoutMs:number;overallTimeoutClamped:boolean};
export function getGroqRightHandLatencyConfig():GroqRightHandLatencyConfig {
 const requestMs=requestTimeoutMs(); const raw=Number(process.env.APEX_GROQ_RIGHT_HAND_OVERALL_TIMEOUT_MS); const overall=overallTimeoutMs();
 return {requestTimeoutMs:requestMs,overallTimeoutMs:overall,minimumOverallTimeoutMs:requestMs,overallTimeoutClamped:Number.isFinite(raw)&&Math.floor(raw)!==overall};
}
export type GroqRightHandStatus={configured:boolean;model:string;fallbackModels:string[];endpoint:string;role:"right_hand_advisor";capability:"case_file_reasoning_only";provider:"groq"};
export type GroqRightHandCaseReasoningResult={status:"completed"|"unavailable";model:string;actionId:string|null;decision:string|null;reason:string|null;confidence:number|null;error:string|null};
export type GroqRightHandDiscoveryAdviceResult={status:"completed"|"unavailable";model:string;decision:string|null;reason:string|null;focusLanes:string[];confidence:number|null;error:string|null};
export function normalizeGroqRightHandCaseReasoning(parsed: Record<string, unknown> | null, queuedActionIds: readonly string[], model: string): GroqRightHandCaseReasoningResult {
  const expected = ["actionId", "decision", "reason", "confidence"];
  const exact = parsed !== null && Object.keys(parsed).length === expected.length && expected.every((key) => Object.prototype.hasOwnProperty.call(parsed, key));
  const actionId = typeof parsed?.actionId === "string" ? parsed.actionId.trim() : "";
  const decision = typeof parsed?.decision === "string" ? parsed.decision.trim() : "";
  const reason = typeof parsed?.reason === "string" ? parsed.reason.trim() : "";
  const confidence = typeof parsed?.confidence === "number" && Number.isFinite(parsed.confidence) && parsed.confidence >= 0 && parsed.confidence <= 1 ? parsed.confidence : null;
  if (!exact || !queuedActionIds.includes(actionId) || !decision || decision.length > 300 || !reason || reason.length > 1_200 || confidence === null) {
    return { status: "unavailable", model, actionId: null, decision: null, reason: null, confidence: null, error: "Groq Right-hand returned an invalid or non-queued recommendation." };
  }
  return { status: "completed", model, actionId, decision, reason, confidence, error: null };
}

export function normalizeGroqRightHandDiscoveryAdvice(parsed: Record<string, unknown> | null, model: string): GroqRightHandDiscoveryAdviceResult {
  const expected = ["decision", "reason", "focusLanes", "confidence"];
  const exact = parsed !== null && Object.keys(parsed).length === expected.length && expected.every((key) => Object.prototype.hasOwnProperty.call(parsed, key));
  const decision = typeof parsed?.decision === "string" ? parsed.decision.trim() : "";
  const reason = typeof parsed?.reason === "string" ? parsed.reason.trim() : "";
  const focusLanes = Array.isArray(parsed?.focusLanes) && parsed.focusLanes.every((value) => typeof value === "string")
    ? parsed.focusLanes.map((value) => value.trim())
    : null;
  const confidence = typeof parsed?.confidence === "number" && Number.isFinite(parsed.confidence) && parsed.confidence >= 0 && parsed.confidence <= 1 ? parsed.confidence : null;
  if (!exact || !decision || decision.length > 300 || !reason || reason.length > 1_200 || focusLanes === null
    || focusLanes.length > 8 || focusLanes.some((lane) => !lane || lane.length > 160) || confidence === null) {
    return { status: "unavailable", model, decision: null, reason: null, focusLanes: [], confidence: null, error: "Groq Right-hand returned an invalid discovery control contract." };
  }
  return { status: "completed", model, decision, reason, focusLanes, confidence, error: null };
}


type CatalogEntry={id?:string;object?:string};
function catalogCandidates(payload:unknown):string[] {
 const models=payload&&typeof payload==="object"&&Array.isArray((payload as any).data)?(payload as any).data as CatalogEntry[]:[];
 const available=models.map(x=>typeof x.id==="string"?x.id:"").filter(Boolean);
 return [GROQ_RIGHT_HAND_MODEL,...GROQ_RIGHT_HAND_FALLBACK_MODELS].filter((m,i,a)=>available.includes(m)&&a.indexOf(m)===i);
}
const catalogCache=new Map<string,{expiresAt:number;models:string[]}>();
export function resetGroqRightHandModelCatalogCacheForTests(): void { catalogCache.clear(); }
function fingerprint(key:string){return createHash("sha256").update(key,"utf8").digest("hex");}
async function resolveModelChain(apiKeyOverride?:string):Promise<string[]> {
 const apiKey=apiKeyOverride?.trim()||key(); if(!apiKey)return [];
 const fp=fingerprint(apiKey); const cached=catalogCache.get(fp);
 if(cached&&cached.expiresAt>Date.now())return cached.models.slice(0,MAX_MODEL_ATTEMPTS);
 try {
  const response=await fetch(GROQ_RIGHT_HAND_MODELS_API,{headers:{Accept:"application/json",Authorization:`Bearer ${apiKey}`},signal:AbortSignal.timeout(MODEL_CATALOG_TIMEOUT_MS)});
  if(!response.ok){logger.warn({role:"groq_right_hand",phase:"model_catalog_failed",httpStatus:response.status},"Groq Right-hand model catalog unavailable");return [];}
  const candidates=catalogCandidates(await response.json());
  if(!candidates.length)return [];
  catalogCache.set(fp,{expiresAt:Date.now()+5*60_000,models:candidates});
  return candidates.slice(0,MAX_MODEL_ATTEMPTS);
 }catch(error){logger.warn({role:"groq_right_hand",phase:"model_catalog_rejected",errorName:error instanceof Error?error.name:"unknown"},"Groq Right-hand model catalog request failed");return [];}
}
function extractJson(raw:string):Record<string,unknown>|null{const fenced=raw.match(/\`\`\`(?:json)?\\s*([\\s\\S]*?)\`\`\`/i)?.[1]?.trim();const source=fenced||raw.trim();const start=source.indexOf("{"),end=source.lastIndexOf("}");if(start<0||end<=start)return null;try{const v=JSON.parse(source.slice(start,end+1));return v&&typeof v==="object"?v as Record<string,unknown>:null;}catch{return null;}}
function normalizeStrictSchema(value: unknown): Record<string, unknown> {
 if (!value || typeof value !== "object" || Array.isArray(value)) return { type: "object", properties: {}, required: [], additionalProperties: false };
 const node = { ...(value as Record<string, unknown>) };
 if (node.type === "object" && node.properties && typeof node.properties === "object" && !Array.isArray(node.properties)) {
   const properties = Object.fromEntries(Object.entries(node.properties as Record<string, unknown>).map(([key, child]) => [key, normalizeStrictSchema(child)]));
   node.properties = properties;
   node.required = Object.keys(properties);
   node.additionalProperties = false;
 }
 if (node.type === "array" && node.items) node.items = normalizeStrictSchema(node.items);
 return node;
}
function responseFormat(input?:Record<string,unknown>):Record<string,unknown>|undefined{
 if(!input)return {type:"json_object"};
 const schema=input.schema;
 if(!schema||typeof schema!=="object")return {type:"json_object"};
 const schemaRecord=schema as Record<string,unknown>;
 if(!schemaRecord.properties || typeof schemaRecord.properties!=="object") return {type:"json_object"};
 return {type:"json_schema",json_schema:{name:"apex_atlas_right_hand",strict:true,schema:normalizeStrictSchema(schema)}};
}
function extractText(payload:unknown):string{
 if(!payload||typeof payload!=="object")return "";
 const c=(payload as any).choices?.[0]?.message?.content;
 if(typeof c==="string") return c.trim();
 if(Array.isArray(c)) return c.map((part:any)=>typeof part?.text==="string"?part.text:"").join("").trim();
 return "";
}
function retryAfterMs(response:Response,fallback:number){const raw=response.headers.get("retry-after")?.trim();if(!raw)return fallback;const n=Number(raw);if(Number.isFinite(n)&&n>=0)return Math.min(5000,Math.floor(n*1000));return fallback;}
function parseRateLimitResetMs(raw:string|null):number|null {
 const value=raw?.trim(); if(!value) return null;
 const numeric=Number(value); if(Number.isFinite(numeric)&&numeric>=0) { const milliseconds = Math.floor(numeric*1000); return Number.isFinite(milliseconds) ? milliseconds : null; }
 const match=value.match(/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?$/i); if(!match) return null;
 const hours=Number(match[1]??0), minutes=Number(match[2]??0), seconds=Number(match[3]??0);
 const milliseconds = Math.floor((hours*3600+minutes*60+seconds)*1000); return Number.isFinite(milliseconds) ? milliseconds : null;
}
type RateLimitKind = "requests" | "tokens" | "unknown" | null;
function rateLimitKind(response:Response, body:string):RateLimitKind {
 if(response.status!==429) return null;
 if(providerErrorCode(body)==="quota_exceeded") return "requests";
 try {
  const parsed = JSON.parse(body) as { error?: { type?: unknown } };
  if (parsed.error?.type === "tokens") return "tokens";
 } catch {}
 const remainingTokens=Number(response.headers.get("x-ratelimit-remaining-tokens")?.trim() ?? "NaN");
 if(Number.isFinite(remainingTokens)&&remainingTokens===0) return "tokens";
 const remainingRequests=Number(response.headers.get("x-ratelimit-remaining-requests")?.trim() ?? "NaN");
 if(Number.isFinite(remainingRequests)&&remainingRequests===0) return "requests";
 return "unknown";
}
function hardRateLimit(response: Response, body: string): boolean { const kind = rateLimitKind(response, body); return kind === "requests" || kind === "tokens"; }
function tokenRateLimitWaitMs(response:Response):number|null {
 const reset=parseRateLimitResetMs(response.headers.get("x-ratelimit-reset-tokens"));
 if(reset!==null) return reset;
 const retry=retryAfterMs(response,0);
 return retry>0?retry:null;
}

type GroqAttemptDiagnostic = { keyName: string; keyFingerprint: string; model: string; httpStatus: number | null; providerCode: string | null; failureClass: string; retry429: number; retry503: number; retryTokenRateLimit: number; retryAfterMs: number | null; retryAfterHeader: string | null; rateLimitKind: RateLimitKind; rateLimitHeaders: Record<string, string>; body: ReturnType<typeof summarizeProviderBody> | null; };
function formatAttemptDiagnostic(diagnostic: GroqAttemptDiagnostic): string { return JSON.stringify(diagnostic); }

async function request(system:string,user:string,format?:Record<string,unknown>):Promise<{raw:string;error:string|null;model:string}>{
 const entry=keyEntries()[0];
 if(!entry)return {raw:"",error:"GROQ_RIGHT_HAND_API_KEY is not configured.",model:GROQ_RIGHT_HAND_MODEL};
 const configRequest=requestTimeoutMs(), configOverall=overallTimeoutMs(), deadline=Date.now()+configOverall;
 const normalizedUser=user.trim(); if(normalizedUser.length>MAX_PROMPT_CHARS)return {raw:"",error:`Groq Right-hand prompt exceeds the bounded control-plane budget of ${MAX_PROMPT_CHARS} characters; upstream case-context compaction is required.`,model:GROQ_RIGHT_HAND_MODEL};
 const systemPrompt=`${apexOrientationCompact("right_hand")}\n\n${system}`;
 // Credential slots are independent credentials, not an implicit failover ladder.
 // This request uses one configured slot and only the documented same-role model fallback.
 // Recovery through another credential must be explicit rather than a side effect of retries.
 const attempts:Array<{entry:{name:string;key:string};model:string}>=[];
 for(const model of await resolveModelChain(entry.key))attempts.push({entry,model});
 if(!attempts.length)return {raw:"",error:"Groq Right-hand has no compatible configured model in the live catalog.",model:GROQ_RIGHT_HAND_MODEL};
  const structuredResponseFormat=responseFormat(format);
 const failures: GroqAttemptDiagnostic[] = [];
 for(const candidate of attempts){
  if(Date.now()>=deadline)break;
  let retry503=0,retry429=0,retryTokenRateLimit=0;
   let useJsonObjectFallback=false;
  let lastRetryAfterMs: number | null = null;
  let lastRetryAfterHeader: string | null = null;
  while(Date.now()<deadline){
    const body=JSON.stringify({model:candidate.model,messages:[{role:"system",content:systemPrompt},{role:"user",content:normalizedUser}],max_completion_tokens:768,temperature:0.1,stream:false,response_format:useJsonObjectFallback?{type:"json_object"}:structuredResponseFormat, reasoning_effort:"medium", include_reasoning:false});
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Math.min(configRequest,Math.max(1000,deadline-Date.now())));
   try{
    await waitForGroqRightHandRequestSlot(controller.signal);
    const response=await withProviderRetryOwnership("groq","caller",()=>fetch(GROQ_RIGHT_HAND_CHAT_API,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",Authorization:`Bearer ${candidate.entry.key}`},body,signal:controller.signal}));
    const responseBody=await response.text();
    if(response.status===503&&retry503<MAX_503_RETRIES_PER_MODEL&&Date.now()<deadline){const delay=retryAfterMs(response,750);lastRetryAfterMs=delay;lastRetryAfterHeader=response.headers.get("retry-after");retry503++;await new Promise(r=>setTimeout(r,Math.min(delay,Math.max(0,deadline-Date.now()))));continue;}
    if(response.status===429&&hardRateLimit(response,responseBody)){const cls=classifyProviderHttpStatus(response.status);const code=providerErrorCode(responseBody);const kind=rateLimitKind(response,responseBody);const waitMs=kind==="tokens"?tokenRateLimitWaitMs(response):null;if(kind==="tokens"&&waitMs!==null&&waitMs<=MAX_TOKEN_RATE_LIMIT_WAIT_MS&&retryTokenRateLimit<MAX_TOKEN_RATE_LIMIT_RETRIES_PER_MODEL&&Date.now()+waitMs<deadline){retryTokenRateLimit++;lastRetryAfterMs=waitMs;lastRetryAfterHeader=response.headers.get("retry-after");await new Promise(r=>setTimeout(r,Math.min(waitMs,Math.max(0,deadline-Date.now()))));continue;}const diagnostic={keyName:candidate.entry.name,model:candidate.model,httpStatus:response.status,providerCode:code,retry429,retry503,retryTokenRateLimit,retryAfterMs:waitMs??null,retryAfterHeader:response.headers.get("retry-after"),rateLimitKind:kind,body:summarizeProviderBody(responseBody),rateLimitHeaders:Object.fromEntries(Array.from(response.headers.entries()).filter(([name])=>name.toLowerCase().startsWith("x-ratelimit-"))),failureClass:cls,keyFingerprint:fingerprint(candidate.entry.key)};failures.push(diagnostic);break;}
    if(response.status===429&&retry429<MAX_429_RETRIES_PER_MODEL&&Date.now()<deadline){const retryHeader=response.headers.get("retry-after");const delay=retryHeader?retryAfterMs(response,GROQ_RIGHT_HAND_MIN_REQUEST_INTERVAL_MS):GROQ_RIGHT_HAND_MIN_REQUEST_INTERVAL_MS;lastRetryAfterMs=delay;lastRetryAfterHeader=retryHeader;if(delay<=2500){retry429++;await new Promise(r=>setTimeout(r,Math.min(delay,Math.max(0,deadline-Date.now()))));continue;}}
     if(!response.ok){const cls=classifyProviderHttpStatus(response.status);const code=providerErrorCode(responseBody);const diagnostic={keyName:candidate.entry.name,model:candidate.model,httpStatus:response.status,providerCode:code,retry429,retry503,retryTokenRateLimit,retryAfterMs:lastRetryAfterMs,retryAfterHeader:lastRetryAfterHeader,rateLimitKind:rateLimitKind(response,responseBody),body:summarizeProviderBody(responseBody),rateLimitHeaders:Object.fromEntries(Array.from(response.headers.entries()).filter(([name])=>name.toLowerCase().startsWith("x-ratelimit-"))),failureClass:cls,keyFingerprint:fingerprint(candidate.entry.key)};failures.push(diagnostic);if(response.status===400&&code==="json_validate_failed"&&!useJsonObjectFallback&&structuredResponseFormat?.type==="json_schema"){useJsonObjectFallback=true;continue;}if(response.status===400&&code==="json_validate_failed"&&useJsonObjectFallback)break;if(response.status===401||response.status===403||response.status===404)break;if(response.status===429)break; if(response.status===500||response.status===502||response.status===503||response.status===504)break;return {raw:"",error:`Groq Right-hand ${candidate.model} ${cls} HTTP ${response.status}: ${formatAttemptDiagnostic(diagnostic)}`,model:candidate.model};}
    const raw=extractText(JSON.parse(responseBody)); if(raw)return {raw,error:null,model:candidate.model};
    failures.push({keyName:candidate.entry.name,model:candidate.model,httpStatus:response.status,providerCode:null,retry429,retry503,retryTokenRateLimit,retryAfterMs:lastRetryAfterMs,retryAfterHeader:lastRetryAfterHeader,rateLimitKind:null,body:null,rateLimitHeaders:{},failureClass:"invalid_response",keyFingerprint:fingerprint(candidate.entry.key)});break;
   }catch(error){
    const cls=classifyThrownProviderError(error,error instanceof Error&&error.name==="AbortError");
    failures.push({keyName:candidate.entry.name,model:candidate.model,httpStatus:null,providerCode:cls==="rate_limited"&&error instanceof Error&&error.name==="ProviderQuotaError"?(error as any).code:null,retry429,retry503,retryTokenRateLimit,retryAfterMs:cls==="rate_limited"&&error instanceof Error&&error.name==="ProviderQuotaError"&&typeof (error as any).retryAfterMs==="number"?(error as any).retryAfterMs:lastRetryAfterMs,retryAfterHeader:lastRetryAfterHeader,rateLimitKind:cls==="rate_limited"?"unknown":null,body:null,rateLimitHeaders:{},failureClass:cls,keyFingerprint:fingerprint(candidate.entry.key)});
    if(cls!=="network_error"&&cls!=="timeout")return {raw:"",error:`Groq Right-hand ${candidate.model} ${cls}: ${JSON.stringify(describeThrownProviderError(error))}`,model:candidate.model};
    break;
   }finally{clearTimeout(timer);}
  }
 }
 return {raw:"",error:`Groq Right-hand exhausted bounded attempts: ${failures.map(formatAttemptDiagnostic).join(" | ")}`,model:attempts.at(-1)?.model??GROQ_RIGHT_HAND_MODEL};
}

function clip(value: string | null | undefined, maxChars = 360): string | null {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length <= maxChars ? trimmed : `${trimmed.slice(0, Math.max(0, maxChars - 1))}…`;
}
function headTail<T>(values: readonly T[] | null | undefined, maxItems: number): T[] {
  const source = values ?? [];
  if (source.length <= maxItems) return [...source];
  if (maxItems <= 1) return source.slice(-1);
  const head = Math.ceil(maxItems / 2);
  return [...source.slice(0, head), ...source.slice(-(maxItems - head))];
}
function clipStrings(values: readonly string[] | null | undefined, maxItems = 8, maxChars = 360): string[] {
  return headTail(values, maxItems).map((value) => clip(value, maxChars) ?? "");
}
function compactCase(file: ResearchCaseFile): string {
  const queued = file.actionQueue
    .filter((action) => action.status === "queued")
    .map((action) => ({
      id: action.id,
      title: action.title,
      purpose: clip(action.purpose, 280),
      specialistId: action.specialistId,
      priority: action.priority,
      rationale: clip(action.rationale, 280),
    }));
  const routes = headTail(file.contactRoutes, 12).map((route) => ({
    rank: route.rank,
    vectorType: route.vectorType,
    value: clip(route.value, 180),
    personName: clip(route.personName, 120),
    role: clip(route.role, 120),
    state: route.state,
    sourceUrls: route.sourceUrls.slice(0, 2),
  }));
  const progress = file.investigationProgress
    ? {
        pendingVectors: file.investigationProgress.pendingVectors,
        foundPersonalCount: file.investigationProgress.foundPersonalCount,
        foundAnyCount: file.investigationProgress.foundAnyCount,
        coverageRatio: file.investigationProgress.coverageRatio,
        vectors: headTail(file.investigationProgress.vectors, 12).map((vector) => ({
          id: vector.id,
          status: vector.status,
          values: vector.values.slice(0, 2).map((value) => clip(value, 140)),
          note: clip(vector.note, 180),
        })),
      }
    : null;
  const bossPlan = file.bossPlan
    ? {
        model: file.bossPlan.model,
        status: file.bossPlan.status,
        outcome: file.bossPlan.outcome,
        actionId: file.bossPlan.actionId,
        decision: clip(file.bossPlan.decision, 300),
        reason: clip(file.bossPlan.reason, 360),
        progressAssessment: clip(file.bossPlan.progressAssessment, 240),
        rightHandDisposition: file.bossPlan.rightHandDisposition,
        rightHandNote: clip(file.bossPlan.rightHandNote, 240),
      }
    : null;
  return JSON.stringify({
    target: file.target,
    hypotheses: clipStrings(file.hypotheses, 6),
    evidenceSummary: {
      sourceRegistries: clipStrings(file.evidenceSummary.sourceRegistries, 8, 180),
      discoveredPeople: clipStrings(file.evidenceSummary.discoveredPeople, 12, 180),
      relatedOrganizations: clipStrings(file.evidenceSummary.relatedOrganizations, 12, 180),
      evidenceCount: file.evidenceSummary.evidenceCount,
      searchGaps: clipStrings(file.evidenceSummary.searchGaps, 8),
      negativeFindings: clipStrings(file.evidenceSummary.negativeFindings, 8),
    },
    specialistRoster: file.specialistRoster.map((specialist) => ({
      id: specialist.id,
      title: specialist.title,
      status: specialist.status,
    })),
    actionQueue: queued,
    contactRoutes: routes,
    investigationProgress: progress,
    researchDepth: file.researchDepth,
    decisionLog: file.decisionLog.slice(-6).map((entry) => ({
      iteration: entry.iteration,
      decision: clip(entry.decision, 260),
      reason: clip(entry.reason, 320),
    })),
    rightHandAdvice: file.rightHandAdvice
      ? {
          status: file.rightHandAdvice.status,
          actionId: file.rightHandAdvice.actionId,
          decision: clip(file.rightHandAdvice.decision, 240),
          reason: clip(file.rightHandAdvice.reason, 300),
        }
      : null,
    bossPlan,
  }, null, 2);
}
type DiscoveryCompactProfile = {
  reportCount: number; candidateCount: number; candidateRelevanceChars: number;
  reportSummaryChars: number; reportFindingCount: number; reportFindingChars: number;
  reportCandidateCount: number; reportCandidateChars: number; reportSourceCount: number;
  reportSourceChars: number; reportQuestionCount: number; reportQuestionChars: number;
  openQuestionCount: number; openQuestionChars: number; decisionCount: number; decisionChars: number;
};

const DISCOVERY_COMPACT_PROFILES: readonly DiscoveryCompactProfile[] = [
  { reportCount: 6, candidateCount: 12, candidateRelevanceChars: 280, reportSummaryChars: 420, reportFindingCount: 8, reportFindingChars: 240, reportCandidateCount: 8, reportCandidateChars: 160, reportSourceCount: 6, reportSourceChars: 320, reportQuestionCount: 6, reportQuestionChars: 220, openQuestionCount: 8, openQuestionChars: 240, decisionCount: 6, decisionChars: 320 },
  { reportCount: 4, candidateCount: 8, candidateRelevanceChars: 220, reportSummaryChars: 300, reportFindingCount: 5, reportFindingChars: 180, reportCandidateCount: 5, reportCandidateChars: 140, reportSourceCount: 4, reportSourceChars: 260, reportQuestionCount: 4, reportQuestionChars: 180, openQuestionCount: 6, openQuestionChars: 180, decisionCount: 4, decisionChars: 240 },
  { reportCount: 2, candidateCount: 5, candidateRelevanceChars: 160, reportSummaryChars: 220, reportFindingCount: 3, reportFindingChars: 140, reportCandidateCount: 4, reportCandidateChars: 120, reportSourceCount: 3, reportSourceChars: 220, reportQuestionCount: 3, reportQuestionChars: 160, openQuestionCount: 4, openQuestionChars: 160, decisionCount: 3, decisionChars: 200 },
];

function compactOrgFootprint(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const compacted: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
    if (typeof raw === "boolean" || typeof raw === "number") compacted[key] = raw;
    else if (typeof raw === "string") compacted[key] = clip(raw, 180);
  }
  return compacted;
}

function compactDiscovery(file: DiscoveryCaseFile, profile: DiscoveryCompactProfile = DISCOVERY_COMPACT_PROFILES[0]!): string {
  const reports = file.investigatorReports.slice(-profile.reportCount).map((report) => ({
    id: report.id, lane: report.lane, provider: report.provider, status: report.status, iteration: report.iteration,
    summary: clip(report.summary, profile.reportSummaryChars),
    findings: clipStrings(report.findings, profile.reportFindingCount, profile.reportFindingChars),
    candidateNames: clipStrings(report.candidateNames, profile.reportCandidateCount, profile.reportCandidateChars),
    sourceUrls: clipStrings(report.sourceUrls, profile.reportSourceCount, profile.reportSourceChars),
    nextQuestions: clipStrings(report.nextQuestions, profile.reportQuestionCount, profile.reportQuestionChars),
    error: clip(report.error, 180),
  }));
  return JSON.stringify({
    humanBrief: { objective: clip(file.humanBrief.objective, 420), motivation: clip(file.humanBrief.motivation, 220), geography: clip(file.humanBrief.geography, 180), exclusions: clipStrings(file.humanBrief.exclusions, 6, 160) },
    bossPremise: clip(file.bossPremise, 360),
    investigationRules: clipStrings(file.investigationRules, 6, 200),
    candidateLanes: clipStrings(file.candidateLanes, 8, 160),
    initialResearch: { status: file.initialResearch.status, researchResponse: clip(file.initialResearch.researchResponse, 700), bossCommentary: clip(file.initialResearch.bossCommentary, 360), sourceUrls: clipStrings(file.initialResearch.sourceUrls, 6, 280) },
    investigatorReports: reports,
    currentProgress: { reportCount: file.currentProgress.reportCount, completedLanes: clipStrings(file.currentProgress.completedLanes, 8, 120), openQuestions: clipStrings(file.currentProgress.openQuestions, profile.openQuestionCount, profile.openQuestionChars), lastReviewedBy: file.currentProgress.lastReviewedBy },
    discoveredCandidates: headTail(file.discoveredCandidates, profile.candidateCount).map((candidate) => ({ name: clip(candidate.name, 140), type: candidate.type, relevance: clip(candidate.relevance, profile.candidateRelevanceChars), reachability: clip(candidate.reachability, 180), sourceUrls: clipStrings(candidate.sourceUrls, 3, 280), state: candidate.state })),
    orgFootprint: compactOrgFootprint(file.orgFootprint),
    decisionLog: file.decisionLog.slice(-profile.decisionCount).map((entry) => ({ iteration: entry.iteration, decision: clip(entry.decision, profile.decisionChars), reason: clip(entry.reason, profile.decisionChars) })),
  }, null, 2);
}

function compactDiscoveryEmergency(file: DiscoveryCaseFile): string {
  const newestReport = file.investigatorReports.at(-1);
  return JSON.stringify({
    humanBrief: { objective: clip(file.humanBrief.objective, 500), geography: clip(file.humanBrief.geography, 160) },
    bossPremise: clip(file.bossPremise, 320),
    currentProgress: { reportCount: file.currentProgress.reportCount, completedLanes: clipStrings(file.currentProgress.completedLanes, 6, 100), openQuestions: clipStrings(file.currentProgress.openQuestions, 4, 140), lastReviewedBy: file.currentProgress.lastReviewedBy },
    latestInvestigatorReport: newestReport ? { id: newestReport.id, lane: newestReport.lane, iteration: newestReport.iteration, summary: clip(newestReport.summary, 260), findings: clipStrings(newestReport.findings, 4, 150), candidateNames: clipStrings(newestReport.candidateNames, 5, 120), sourceUrls: clipStrings(newestReport.sourceUrls, 3, 220), nextQuestions: clipStrings(newestReport.nextQuestions, 3, 140) } : null,
    discoveredCandidates: headTail(file.discoveredCandidates, 5).map((candidate) => ({ name: clip(candidate.name, 120), type: candidate.type, relevance: clip(candidate.relevance, 160), state: candidate.state })),
  }, null, 2);
}

function boundedDiscoveryPrompt(file: DiscoveryCaseFile, iteration: number): string {
  const prefix = `Iteration ${iteration}. Recommend the most useful next research direction from the existing discovery frontier.\nDISCOVERY CASE:\n`;
  const suffix = `\n\nReturn {"decision":"...","reason":"...","focusLanes":["..."],"confidence":0.0}.`;
  const budget = MAX_PROMPT_CHARS - 1024;
  for (const profile of DISCOVERY_COMPACT_PROFILES) {
    const prompt = prefix + compactDiscovery(file, profile) + suffix;
    if (prompt.length <= budget) return prompt;
  }
  const emergency = prefix + compactDiscoveryEmergency(file) + suffix;
  if (emergency.length <= budget) return emergency;

  // Never truncate serialized JSON: choose the smallest valid discovery control
  // document instead. The durable case remains complete outside this prompt.
  const minimal = prefix + JSON.stringify({
    humanBrief: {
      objective: clip(file.humanBrief.objective, 320),
      geography: clip(file.humanBrief.geography, 120),
    },
    currentProgress: {
      reportCount: file.currentProgress.reportCount,
      completedLanes: clipStrings(file.currentProgress.completedLanes, 2, 80),
      openQuestions: clipStrings(file.currentProgress.openQuestions, 2, 100),
    },
    latestInvestigatorReport: file.investigatorReports.at(-1)
      ? {
          id: file.investigatorReports.at(-1)!.id,
          summary: clip(file.investigatorReports.at(-1)!.summary, 180),
          findings: clipStrings(file.investigatorReports.at(-1)!.findings, 2, 100),
        }
      : null,
  }) + suffix;
  return minimal; 
}
export function getGroqRightHandStatus(): GroqRightHandStatus { return { configured: keyEntries().length > 0, model: GROQ_RIGHT_HAND_MODEL, fallbackModels: [...GROQ_RIGHT_HAND_FALLBACK_MODELS], endpoint: GROQ_RIGHT_HAND_CHAT_API, role: "right_hand_advisor", capability: "case_file_reasoning_only", provider: "groq" }; }
type GroqReadinessAttemptDiagnostic = {
  keyName: string;
  keyFingerprint: string;
  httpStatus: number | null;
  providerCode: string | null;
  failureClass: string | null;
  retryAfterMs: number | null;
  retryAfterHeader: string | null;
  rateLimitHeaders: Record<string, string>;
  candidateModels: string[];
  body: ReturnType<typeof summarizeProviderBody> | null;
  thrownError: ReturnType<typeof describeThrownProviderError> | null;
  error: string | null;
};

export async function runGroqRightHandReadiness(): Promise<{
  provider: "groq";
  configured: boolean;
  status: "ready" | "pending" | "unavailable";
  model: string;
  candidateModels: string[];
  httpStatus: number | null;
  attempts: GroqReadinessAttemptDiagnostic[];
  error: string | null;
}> {
  const entries = keyEntries();
  if (!entries.length) {
    return {
      provider: "groq",
      configured: false,
      status: "pending",
      model: GROQ_RIGHT_HAND_MODEL,
      candidateModels: [],
      httpStatus: null,
      attempts: [],
      error: "GROQ_RIGHT_HAND_API_KEY is not configured.",
    };
  }

  const attempts: GroqReadinessAttemptDiagnostic[] = [];
  for (const entry of entries) {
    try {
      const response = await fetch(GROQ_RIGHT_HAND_MODELS_API, {
        headers: { Accept: "application/json", Authorization: `Bearer ${entry.key}` },
        signal: AbortSignal.timeout(MODEL_CATALOG_TIMEOUT_MS),
      });
      const body = await response.text();
      const retryAfterHeader = response.headers.get("retry-after");
      const rateLimitHeaders = Object.fromEntries(
        Array.from(response.headers.entries()).filter(([name]) => name.toLowerCase().startsWith("x-ratelimit-")),
      );
      const shared = {
        keyName: entry.name,
        keyFingerprint: fingerprint(entry.key),
        httpStatus: response.status,
        providerCode: providerErrorCode(body),
        retryAfterMs: retryAfterHeader ? retryAfterMs(response, 0) : null,
        retryAfterHeader,
        rateLimitHeaders,
        body: summarizeProviderBody(body),
        thrownError: null,
      };

      if (!response.ok) {
        attempts.push({
          ...shared,
          failureClass: classifyProviderHttpStatus(response.status),
          candidateModels: [],
          error: "model_catalog_http_error",
        });
        continue;
      }

      let candidates: string[];
      try {
        candidates = catalogCandidates(JSON.parse(body));
      } catch {
        candidates = [];
      }
      if (candidates.length) {
        attempts.push({
          ...shared,
          failureClass: null,
          candidateModels: candidates,
          error: null,
        });
        return {
          provider: "groq",
          configured: true,
          status: "ready",
          model: candidates[0]!,
          candidateModels: candidates,
          httpStatus: response.status,
          attempts,
          error: null,
        };
      }
      attempts.push({
        ...shared,
        failureClass: "invalid_response",
        candidateModels: [],
        error: "catalog_reachable_but_no_configured_model",
      });
    } catch (error) {
      attempts.push({
        keyName: entry.name,
        keyFingerprint: fingerprint(entry.key),
        httpStatus: null,
        providerCode: null,
        failureClass: classifyThrownProviderError(error, error instanceof Error && error.name === "AbortError"),
        retryAfterMs: null,
        retryAfterHeader: null,
        rateLimitHeaders: {},
        candidateModels: [],
        body: null,
        thrownError: describeThrownProviderError(error),
        error: "model_catalog_request_failed",
      });
    }
  }

  return {
    provider: "groq",
    configured: true,
    status: "unavailable",
    model: GROQ_RIGHT_HAND_MODEL,
    candidateModels: [],
    httpStatus: attempts.at(-1)?.httpStatus ?? null,
    attempts,
    error: `No configured Groq credential produced a usable model catalog: ${JSON.stringify(attempts)}`,
  };
}

export async function runGroqRightHandCaseReasoning(input: { file: ResearchCaseFile; iteration: number }): Promise<GroqRightHandCaseReasoningResult> {
  const queued = input.file.actionQueue.filter((action) => action.status === "queued");
  const system = "You are Apex Atlas Right Hand. Reason only over the supplied case file. Never browse, use external research, or invent evidence, contacts, people, URLs, or facts. Recommend exactly one existing queued action. Return JSON only.";
  const user = `Iteration ${input.iteration}. Identify what is newly unresolved, which contact vectors are still pending, and the highest-leverage complementary queued action.
CASE:
${compactCase(input.file)}

Return {"actionId":"exact queued action id","decision":"short recommendation","reason":"concrete case-file evidence-gap reason","confidence":0.0}.`;
  const result = await request(system, user, { type: "text", mime_type: "application/json", schema: { type: "object", properties: { actionId: { type: "string" }, decision: { type: "string" }, reason: { type: "string" }, confidence: { type: "number" } }, required: ["actionId", "decision", "reason", "confidence"], additionalProperties: false } });
  if (result.error) return { status: "unavailable", model: result.model, actionId: null, decision: null, reason: null, confidence: null, error: result.error };
  return normalizeGroqRightHandCaseReasoning(extractJson(result.raw), queued.map((action) => action.id), result.model);
}
export async function runGroqRightHandDiscoveryAdvice(input: { file: DiscoveryCaseFile; iteration: number }): Promise<GroqRightHandDiscoveryAdviceResult> {
  const system = "You are Apex Atlas Right Hand for public-record discovery. Reason only over supplied discovery case evidence. Never browse, use external research, or invent people, contacts, relationships, or URLs. Return JSON only.";
  const user = boundedDiscoveryPrompt(input.file, input.iteration);
  const result = await request(system, user, { type: "text", mime_type: "application/json", schema: { type: "object", properties: { decision: { type: "string" }, reason: { type: "string" }, focusLanes: { type: "array", items: { type: "string" } }, confidence: { type: "number" } }, required: ["decision", "reason", "focusLanes", "confidence"], additionalProperties: false } });
  if (result.error) return { status: "unavailable", model: result.model, decision: null, reason: null, focusLanes: [], confidence: null, error: result.error };
  return normalizeGroqRightHandDiscoveryAdvice(extractJson(result.raw), result.model);
}
export async function runGroqRightHandFreeJson(userPrompt: string, systemExtra = "Reply with ONE JSON object only. Never invent contacts, people, or URLs.", responseFormat?: Record<string, unknown>): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { const result = await request("You are the Apex Atlas Right Hand. Advise the Boss only. Never browse or act as Investigator. Never invent evidence, contacts, people, relationships, or URLs. " + systemExtra, userPrompt, responseFormat ?? { type: "text", mime_type: "application/json", schema: { type: "object" } }); return result.raw ? { status: "completed", model: result.model, raw: result.raw, error: null } : { status: "unavailable", model: result.model, raw: null, error: result.error }; }
export async function runGroqRightHandFinalReview(prompt: string): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { return runGroqRightHandFreeJson(prompt, "You are the Apex Atlas Right Hand reviewing final public-contact evidence. Return ONE JSON object only. Never invent contacts, people, or URLs."); }
