import type { BureauAction, DiscoveryCaseFile, ResearchCaseFile } from "./case-bureau";
import { apexOrientationCompact } from "./apex-bureau-orientation";
import { logger } from "./logger";
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
const GROQ_RIGHT_HAND_KEY_NAMES = [GROQ_RIGHT_HAND_KEY_ENV, ...Array.from({ length: 4 }, (_, i) => `${GROQ_RIGHT_HAND_KEY_ENV}_${i + 2}`)];
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_OVERALL_TIMEOUT_MS = 120_000;
const MODEL_CATALOG_TIMEOUT_MS = 5_000;
const MAX_MODEL_ATTEMPTS = 4;
const MAX_503_RETRIES_PER_MODEL = 1;
const MAX_429_RETRIES_PER_MODEL = 1;
const MAX_PROMPT_CHARS = 20_000;
const GROQ_RIGHT_HAND_MIN_REQUEST_INTERVAL_MS = 250;
let nextGroqRightHandRequestAt = 0;
let groqRightHandRequestGate: Promise<void> = Promise.resolve();
async function waitForGroqRightHandRequestSlot(): Promise<void> {
 const previous = groqRightHandRequestGate; let release!: () => void;
 groqRightHandRequestGate = new Promise<void>((resolve) => { release = resolve; }); await previous;
 const waitMs = Math.max(0, nextGroqRightHandRequestAt - Date.now());
 if (waitMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
 nextGroqRightHandRequestAt = Date.now() + GROQ_RIGHT_HAND_MIN_REQUEST_INTERVAL_MS; release();
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

type CatalogEntry={id?:string;object?:string};
function catalogCandidates(payload:unknown):string[] {
 const models=payload&&typeof payload==="object"&&Array.isArray((payload as any).data)?(payload as any).data as CatalogEntry[]:[];
 const available=models.map(x=>typeof x.id==="string"?x.id:"").filter(Boolean);
 return [GROQ_RIGHT_HAND_MODEL,...GROQ_RIGHT_HAND_FALLBACK_MODELS].filter((m,i,a)=>available.includes(m)&&a.indexOf(m)===i);
}
const catalogCache=new Map<string,{expiresAt:number;models:string[]}>();
function fingerprint(key:string){let h=0;for(let i=0;i<key.length;i++)h=((h<<5)-h+key.charCodeAt(i))|0;return String(h>>>0);}
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
function hardRateLimit(response: Response): boolean {
 const rawLimit = response.headers.get("x-ratelimit-limit-req-minute")?.trim();
 const rawRemaining = response.headers.get("x-ratelimit-remaining-req-minute")?.trim();
 const limit = rawLimit === undefined || rawLimit === null || rawLimit === "" ? null : Number(rawLimit);
 const remaining = rawRemaining === undefined || rawRemaining === null || rawRemaining === "" ? null : Number(rawRemaining);
 return response.status === 429 && ((Number.isFinite(limit) && limit === 0) || (Number.isFinite(remaining) && remaining === 0 && Number.isFinite(limit) && limit !== null && limit <= 0));
}

type GroqAttemptDiagnostic = { keyName: string; keyFingerprint: string; model: string; httpStatus: number | null; providerCode: string | null; failureClass: string; retry429: number; retry503: number; retryAfterMs: number | null; retryAfterHeader: string | null; rateLimitHeaders: Record<string, string>; body: ReturnType<typeof summarizeProviderBody> | null; };
function formatAttemptDiagnostic(diagnostic: GroqAttemptDiagnostic): string { return JSON.stringify(diagnostic); }

async function request(system:string,user:string,format?:Record<string,unknown>):Promise<{raw:string;error:string|null;model:string}>{
 const entries=keyEntries(); if(!entries.length)return {raw:"",error:"GROQ_RIGHT_HAND_API_KEY is not configured.",model:GROQ_RIGHT_HAND_MODEL};
 const configRequest=requestTimeoutMs(), configOverall=overallTimeoutMs(), deadline=Date.now()+configOverall;
 const normalizedUser=user.trim(); if(normalizedUser.length>MAX_PROMPT_CHARS)return {raw:"",error:`Groq Right-hand prompt exceeds the bounded control-plane budget of ${MAX_PROMPT_CHARS} characters; upstream case-context compaction is required.`,model:GROQ_RIGHT_HAND_MODEL};
 const systemPrompt=`${apexOrientationCompact("right_hand")}\\n\\n${system}`;
 const attempts:Array<{entry:{name:string;key:string};model:string}>=[];
 for(const entry of entries){for(const model of await resolveModelChain(entry.key))attempts.push({entry,model});}
 if(!attempts.length)return {raw:"",error:"Groq Right-hand has no compatible configured model in the live catalog.",model:GROQ_RIGHT_HAND_MODEL};
 const failures: GroqAttemptDiagnostic[] = [];
 for(const candidate of attempts){
  if(Date.now()>=deadline)break;
  let retry503=0,retry429=0;
  let lastRetryAfterMs: number | null = null;
  let lastRetryAfterHeader: string | null = null;
  while(Date.now()<deadline){
   const body=JSON.stringify({model:candidate.model,messages:[{role:"system",content:systemPrompt},{role:"user",content:normalizedUser}],max_completion_tokens:768,temperature:0.1,stream:false,response_format:responseFormat(format), reasoning_effort:"medium", reasoning_format:"hidden"});
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),Math.min(configRequest,Math.max(1000,deadline-Date.now())));
   try{
    await waitForGroqRightHandRequestSlot();
    const response=await fetch(GROQ_RIGHT_HAND_CHAT_API,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",Authorization:`Bearer ${candidate.entry.key}`},body,signal:controller.signal});
    const responseBody=await response.text();
    if(response.status===503&&retry503<MAX_503_RETRIES_PER_MODEL&&Date.now()<deadline){const delay=retryAfterMs(response,750);lastRetryAfterMs=delay;lastRetryAfterHeader=response.headers.get("retry-after");retry503++;await new Promise(r=>setTimeout(r,Math.min(delay,Math.max(0,deadline-Date.now()))));continue;}
    if(response.status===429&&hardRateLimit(response)){const cls=classifyProviderHttpStatus(response.status);const code=providerErrorCode(responseBody);const diagnostic={keyName:candidate.entry.name,model:candidate.model,httpStatus:response.status,providerCode:code,retry429,retry503,retryAfterMs:null,retryAfterHeader:response.headers.get("retry-after"),body:summarizeProviderBody(responseBody),rateLimitHeaders:Object.fromEntries(Array.from(response.headers.entries()).filter(([name])=>name.toLowerCase().startsWith("x-ratelimit-"))),failureClass:cls,keyFingerprint:fingerprint(candidate.entry.key)};failures.push(diagnostic);break;}
    if(response.status===429&&retry429<MAX_429_RETRIES_PER_MODEL&&Date.now()<deadline){const retryHeader=response.headers.get("retry-after");const delay=retryHeader?retryAfterMs(response,GROQ_RIGHT_HAND_MIN_REQUEST_INTERVAL_MS):GROQ_RIGHT_HAND_MIN_REQUEST_INTERVAL_MS;lastRetryAfterMs=delay;lastRetryAfterHeader=retryHeader;if(delay<=2500){retry429++;await new Promise(r=>setTimeout(r,Math.min(delay,Math.max(0,deadline-Date.now()))));continue;}}
    if(!response.ok){const cls=classifyProviderHttpStatus(response.status);const code=providerErrorCode(responseBody);const diagnostic={keyName:candidate.entry.name,model:candidate.model,httpStatus:response.status,providerCode:code,retry429,retry503,retryAfterMs:lastRetryAfterMs,retryAfterHeader:lastRetryAfterHeader,body:summarizeProviderBody(responseBody),rateLimitHeaders:Object.fromEntries(Array.from(response.headers.entries()).filter(([name])=>name.toLowerCase().startsWith("x-ratelimit-"))),failureClass:cls,keyFingerprint:fingerprint(candidate.entry.key)};failures.push(diagnostic);if(response.status===401||response.status===403||response.status===404)break;if(response.status===429||response.status===500||response.status===502||response.status===503||response.status===504)break;return {raw:"",error:`Groq Right-hand ${candidate.model} ${cls} HTTP ${response.status}: ${formatAttemptDiagnostic(diagnostic)}`,model:candidate.model};}
    const raw=extractText(JSON.parse(responseBody)); if(raw)return {raw,error:null,model:candidate.model};
    failures.push({keyName:candidate.entry.name,model:candidate.model,httpStatus:response.status,providerCode:null,retry429,retry503,retryAfterMs:lastRetryAfterMs,retryAfterHeader:lastRetryAfterHeader,body:null,rateLimitHeaders:{},failureClass:"invalid_response",keyFingerprint:fingerprint(candidate.entry.key)});break;
   }catch(error){
    const cls=classifyThrownProviderError(error,error instanceof Error&&error.name==="AbortError");
    failures.push({keyName:candidate.entry.name,model:candidate.model,httpStatus:null,providerCode:null,retry429,retry503,retryAfterMs:lastRetryAfterMs,retryAfterHeader:lastRetryAfterHeader,body:null,rateLimitHeaders:{},failureClass:cls,keyFingerprint:fingerprint(candidate.entry.key)});
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
function clipStrings(values: readonly string[] | null | undefined, maxItems = 8, maxChars = 360): string[] {
  return (values ?? []).slice(0, maxItems).map((value) => clip(value, maxChars) ?? "");
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
  const routes = file.contactRoutes.slice(0, 12).map((route) => ({
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
        vectors: file.investigationProgress.vectors.map((vector) => ({
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
function compactDiscovery(file: DiscoveryCaseFile): string {
  return JSON.stringify({
    humanBrief: {
      objective: clip(file.humanBrief.objective, 420),
      motivation: clip(file.humanBrief.motivation, 280),
      geography: clip(file.humanBrief.geography, 220),
      exclusions: clipStrings(file.humanBrief.exclusions, 8, 180),
    },
    bossPremise: clip(file.bossPremise, 420),
    investigationRules: clipStrings(file.investigationRules, 8, 240),
    candidateLanes: clipStrings(file.candidateLanes, 10, 180),
    initialResearch: {
      status: file.initialResearch.status,
      researchResponse: clip(file.initialResearch.researchResponse, 900),
      bossCommentary: clip(file.initialResearch.bossCommentary, 500),
      sourceUrls: file.initialResearch.sourceUrls.slice(0, 8),
    },
    investigatorReports: file.investigatorReports.slice(-6).map((report) => ({
      id: report.id,
      lane: report.lane,
      provider: report.provider,
      status: report.status,
      iteration: report.iteration,
      summary: clip(report.summary, 420),
      findings: clipStrings(report.findings, 8, 240),
      candidateNames: clipStrings(report.candidateNames, 8, 160),
      sourceUrls: report.sourceUrls.slice(0, 6),
      nextQuestions: clipStrings(report.nextQuestions, 6, 220),
      error: clip(report.error, 240),
    })),
    currentProgress: {
      reportCount: file.currentProgress.reportCount,
      completedLanes: clipStrings(file.currentProgress.completedLanes, 10, 120),
      openQuestions: clipStrings(file.currentProgress.openQuestions, 8, 240),
      lastReviewedBy: file.currentProgress.lastReviewedBy,
    },
    discoveredCandidates: file.discoveredCandidates.slice(0, 12).map((candidate) => ({
      name: candidate.name,
      type: candidate.type,
      relevance: clip(candidate.relevance, 280),
      reachability: clip(candidate.reachability, 220),
      sourceUrls: candidate.sourceUrls.slice(0, 3),
      state: candidate.state,
    })),
    orgFootprint: file.orgFootprint,
    decisionLog: file.decisionLog.slice(-6).map((entry) => ({
      iteration: entry.iteration,
      decision: clip(entry.decision, 260),
      reason: clip(entry.reason, 320),
    })),
  }, null, 2);
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

export async function runGroqRightHandCaseReasoning(input: { file: ResearchCaseFile; iteration: number }): Promise<GroqRightHandCaseReasoningResult> { const queued = input.file.actionQueue.filter((action) => action.status === "queued"); const system = "You are Apex Atlas Right Hand. Reason only over the supplied case file. Never browse, use external research, or invent evidence, contacts, people, URLs, or facts. Recommend exactly one existing queued action. Return JSON only."; const user = `Iteration ${input.iteration}. Identify what is newly unresolved, which contact vectors are still pending, and the highest-leverage complementary queued action.\nCASE:\n${compactCase(input.file)}\n\nReturn {\"actionId\":\"exact queued action id\",\"decision\":\"short recommendation\",\"reason\":\"concrete case-file evidence-gap reason\",\"confidence\":0.0}.`; const result = await request(system, user, { type: "text", mime_type: "application/json", schema: { type: "object", properties: { actionId: { type: "string" }, decision: { type: "string" }, reason: { type: "string" }, confidence: { type: "number" } }, required: ["actionId", "decision", "reason", "confidence"] } }); if (result.error) return { status: "unavailable", model: result.model, actionId: null, decision: null, reason: null, confidence: null, error: result.error }; const parsed = extractJson(result.raw); const actionId = typeof parsed?.actionId === "string" ? parsed.actionId.trim() : ""; const action = queued.find((candidate) => candidate.id === actionId); const decision = typeof parsed?.decision === "string" ? parsed.decision.trim() : ""; const reason = typeof parsed?.reason === "string" ? parsed.reason.trim() : ""; const confidence = typeof parsed?.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : null; if (!action || !decision || !reason) return { status: "unavailable", model: result.model, actionId: null, decision: null, reason: null, confidence, error: `Groq Right-hand ${result.model} returned an invalid or non-queued recommendation.` }; return { status: "completed", model: result.model, actionId: action.id, decision, reason, confidence, error: null }; }
export async function runGroqRightHandDiscoveryAdvice(input: { file: DiscoveryCaseFile; iteration: number }): Promise<GroqRightHandDiscoveryAdviceResult> { const system = "You are Apex Atlas Right Hand for public-record discovery. Reason only over supplied discovery case evidence. Never browse, use external research, or invent people, contacts, relationships, or URLs. Return JSON only."; const user = `Iteration ${input.iteration}. Recommend the most useful next research direction from the existing discovery frontier.\nDISCOVERY CASE:\n${compactDiscovery(input.file)}\n\nReturn {\"decision\":\"...\",\"reason\":\"...\",\"focusLanes\":[\"...\"],\"confidence\":0.0}.`; const result = await request(system, user, { type: "text", mime_type: "application/json", schema: { type: "object", properties: { decision: { type: "string" }, reason: { type: "string" }, focusLanes: { type: "array", items: { type: "string" } }, confidence: { type: "number" } }, required: ["decision", "reason", "focusLanes", "confidence"] } }); if (result.error) return { status: "unavailable", model: result.model, decision: null, reason: null, focusLanes: [], confidence: null, error: result.error }; const parsed = extractJson(result.raw); if (!parsed) return { status: "unavailable", model: result.model, decision: null, reason: null, focusLanes: [], confidence: null, error: `Groq Right-hand ${result.model} returned invalid discovery JSON.` }; return { status: "completed", model: result.model, decision: typeof parsed.decision === "string" ? parsed.decision : null, reason: typeof parsed.reason === "string" ? parsed.reason : null, focusLanes: Array.isArray(parsed.focusLanes) ? parsed.focusLanes.filter((v): v is string => typeof v === "string") : [], confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null, error: null }; }
export async function runGroqRightHandFreeJson(userPrompt: string, systemExtra = "Reply with ONE JSON object only. Never invent contacts, people, or URLs.", responseFormat?: Record<string, unknown>): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { const result = await request("You are the Apex Atlas Right Hand. Advise the Boss only. Never browse or act as Investigator. Never invent evidence, contacts, people, relationships, or URLs. " + systemExtra, userPrompt, responseFormat ?? { type: "text", mime_type: "application/json", schema: { type: "object" } }); return result.raw ? { status: "completed", model: result.model, raw: result.raw, error: null } : { status: "unavailable", model: result.model, raw: null, error: result.error }; }
export async function runGroqRightHandFinalReview(prompt: string): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { return runGroqRightHandFreeJson(prompt, "You are the Apex Atlas Right Hand reviewing final public-contact evidence. Return ONE JSON object only. Never invent contacts, people, or URLs."); }
export type GeminiRightHandResultAction = BureauAction;
