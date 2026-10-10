import { randomUUID } from "crypto";
import { getPermanentClient, withPermanentClient, permSismember, permScard } from "./redis";
import { logger } from "./logger";
import { canApplyJobPatch, canApplyJobPatchWithoutRedis, classifyActiveJobRead, classifyJobCreationVerification } from "./job-queue-terminal-policy";
async function safeRedis<T>(fn:(rc:import("ioredis").Redis)=>Promise<T>,fallback:T):Promise<T>{return withPermanentClient(fn,fallback);}
export type JobStatus="queued"|"running"|"paused"|"done"|"failed"|"cancelled";
export interface JobState{jobId:string;type:string;status:JobStatus;progress:number;inserted:number;skipped:number;errors:number;total:number;startedAt:string;finishedAt?:string;atlasPhase?:number;atlasPhaseTotal?:number;entityProgress?:number;entityTotal?:number;entityNames?:string;atlasTelemetry?:string;outcome?:"complete"|"incomplete";resumable?:string;targetIds?:string;targetIndex?:number;targetTotal?:number;currentTargetId?:number;currentPhase?:string;completedTargetIds?:string;failedTargetIds?:string;retryCounts?:string;result?:string;message:string;}
export type AutoPipelineSchedulerStatus={enabled:boolean;active:boolean;activatedAt?:string;lastTriggerAt?:string;nextTriggerAt?:string;lastLabel?:string;lastStatus?:"triggered"|"completed"|"skipped_lock"|"no_targets"|"error";lastJobId?:string;lastMessage?:string;cycles:number;skippedDueToLock:number;providerNoTarget:number;};
const JOB_TTL=60*60*24*7;const MAX_MEMORY_JOBS=256;const memoryOnlyJobs=new Set<string>();const memoryJobs=new Map<string,JobState>();const memoryLogs=new Map<string,string[]>();const memoryLatestByType=new Map<string,string>();const memoryActiveByType=new Map<string,string>();const LOG_CAP=200;const AUTO_PIPELINE_SCHEDULER_KEY="apex:autopipeline:scheduler";function jk(id:string){return`apex:job:${id}`;}function lk(id:string){return`apex:job:${id}:log`;}function trimMemoryJobs(){while(memoryJobs.size>MAX_MEMORY_JOBS){const first=memoryJobs.keys().next().value as string|undefined;if(!first)break;memoryJobs.delete(first);memoryLogs.delete(first);memoryOnlyJobs.delete(first);}}
export async function createJob(type:string):Promise<string>{
  const jobId=randomUUID();
  const state:JobState={jobId,type,status:"queued",progress:0,inserted:0,skipped:0,errors:0,total:0,startedAt:new Date().toISOString(),message:"Queued"};
  memoryJobs.set(jobId,{...state});
  memoryLatestByType.set(type,jobId);
  trimMemoryJobs();

  // If the canonical Redis store is already unavailable, this is an explicitly
  // memory-only job. Canonical lease acquisition separately requires a durable
  // queued job hash, so this path can never start canonical Atlas research.
  if(!getPermanentClient()){
    memoryOnlyJobs.add(jobId);
    logger.warn({jobId,type},"createJob: canonical Redis unavailable before write — using isolated in-memory job state");
    return jobId;
  }

  const fieldArgs:string[]=[];
  for(const [key,value] of Object.entries(state)) if(value!==undefined) fieldArgs.push(key,String(value));
  const createLua="local k=KEYS[1]; if redis.call('exists',k)==1 then return -1 end; for i=1,#ARGV-2,2 do redis.call('hset',k,ARGV[i],ARGV[i+1]); end; local ttl=tonumber(ARGV[#ARGV-1]); redis.call('expire',k,ttl); redis.call('set',KEYS[2],ARGV[#ARGV],'EX',ttl); return 1";
  const wrote=await safeRedis(async rc=>Number(await rc.eval(createLua,2,jk(jobId),`apex:latestjob:${type}`,...fieldArgs,String(JOB_TTL),jobId)),null as number|null);
  if(wrote===1)return jobId;

  // Redis may have committed the atomic script before a connection error hid
  // its response. Reconcile against the canonical store before returning any
  // job ID; an indeterminate write must never be launched as memory-only.
  const persisted=await safeRedis(rc=>rc.hgetall(jk(jobId)),null as Record<string,string>|null);
  const verification=classifyJobCreationVerification(jobId,type,persisted);
  if(verification==="durable")return jobId;

  memoryJobs.delete(jobId);
  memoryOnlyJobs.delete(jobId);
  if(memoryLatestByType.get(type)===jobId) memoryLatestByType.delete(type);
  trimMemoryJobs();
  logger.error({jobId,type,verification,wrote}, "createJob: failed to confirm durable job creation; refusing to launch");
  throw new Error("Canonical job creation was not durably confirmed; refusing to launch.");
}
export async function updateJob(jobId:string,patch:Partial<JobState>):Promise<void>{
  const prev=memoryJobs.get(jobId);
  if(prev&&!canApplyJobPatch(prev.status))return;
  if(memoryOnlyJobs.has(jobId)){
    if(prev&&canApplyJobPatchWithoutRedis(prev.status,true))memoryJobs.set(jobId,{...prev,...patch});
    trimMemoryJobs();
    return;
  }

  const flat:Record<string,string>={};
  for(const[k,v]of Object.entries(patch))if(v!==undefined)flat[k]=String(v);
  const redisResult=await safeRedis(async rc=>{
    const args:string[]=[];
    for(const[k,v]of Object.entries(flat)){args.push(k,v);}
    return Number(await rc.eval(
      "local k=KEYS[1]; local current=redis.call('hget',k,'status'); local incoming=ARGV[1]; if current~='queued' and current~='running' and current~='paused' then return 0 end; for i=2,#ARGV,2 do redis.call('hset',k,ARGV[i],ARGV[i+1]); end; return 1",
      1,jk(jobId),patch.status===undefined?"":String(patch.status),...args
    ));
  },null as number|null);
  if(redisResult===0||redisResult===null)return;
  if(prev)memoryJobs.set(jobId,{...prev,...patch});
  else if(patch.jobId||patch.type)memoryJobs.set(jobId,{jobId,type:String(patch.type??"unknown"),status:(patch.status as JobStatus)??"running",progress:Number(patch.progress??0),inserted:Number(patch.inserted??0),skipped:Number(patch.skipped??0),errors:Number(patch.errors??0),total:Number(patch.total??0),startedAt:String(patch.startedAt??new Date().toISOString()),message:String(patch.message??""),...patch}as JobState);
  trimMemoryJobs();
}
export async function clearJobFields(jobId:string,fields:string[]):Promise<void>{if(!fields.length)return;await safeRedis(async rc=>{await rc.hdel(jk(jobId),...fields);await rc.expire(jk(jobId),JOB_TTL);},undefined);}
export async function appendJobLog(jobId:string,line:string,opts?:{dedupeKey?:string}):Promise<void>{if(opts?.dedupeKey){const ok=await safeRedis(async rc=>{const set=await rc.set(`apex:joblog:dedupe:${jobId}:${opts.dedupeKey}`,"1","EX",86400,"NX");return set==="OK"||set===true;},true);if(!ok)return;}const memCheck=memoryLogs.get(jobId)??[];if(memCheck[0]&&memCheck[0].includes(line.slice(0,120)))return;const ts=`${new Date().toISOString()} ${line}`;const mem=memoryLogs.get(jobId)??[];mem.unshift(ts);memoryLogs.set(jobId,mem.slice(0,LOG_CAP));trimMemoryJobs();await safeRedis(async rc=>{await rc.lpush(lk(jobId),ts);await rc.ltrim(lk(jobId),0,LOG_CAP-1);await rc.expire(lk(jobId),JOB_TTL);},undefined);void import("./bureau-live-log").then(m=>m.mirrorJobLogLine(jobId,line)).catch(()=>undefined);}
function parsePersistedJobState(jobId:string,raw:Record<string,string>):JobState{
  return{jobId:raw.jobId??jobId,type:raw.type??"unknown",status:(raw.status??"queued")as JobStatus,progress:Number(raw.progress??0),inserted:Number(raw.inserted??0),skipped:Number(raw.skipped??0),errors:Number(raw.errors??0),total:Number(raw.total??0),startedAt:raw.startedAt??"",finishedAt:raw.finishedAt,message:raw.message??"",atlasPhase:raw.atlasPhase!==undefined?Number(raw.atlasPhase):undefined,atlasPhaseTotal:raw.atlasPhaseTotal!==undefined?Number(raw.atlasPhaseTotal):undefined,entityProgress:raw.entityProgress!==undefined?Number(raw.entityProgress):undefined,entityTotal:raw.entityTotal!==undefined?Number(raw.entityTotal):undefined,entityNames:raw.entityNames,atlasTelemetry:raw.atlasTelemetry,outcome:raw.outcome==="incomplete"||raw.outcome==="complete"?raw.outcome:undefined,resumable:raw.resumable,targetIds:raw.targetIds,targetIndex:raw.targetIndex!==undefined?Number(raw.targetIndex):undefined,targetTotal:raw.targetTotal!==undefined?Number(raw.targetTotal):undefined,currentTargetId:raw.currentTargetId!==undefined?Number(raw.currentTargetId):undefined,currentPhase:raw.currentPhase,completedTargetIds:raw.completedTargetIds,failedTargetIds:raw.failedTargetIds,retryCounts:raw.retryCounts,result:raw.result};
}
export async function getJob(jobId:string):Promise<JobState|null>{
  if(memoryOnlyJobs.has(jobId))return memoryJobs.get(jobId)??null;
  let redisOk=false;
  const raw=await safeRedis(async rc=>{const value=await rc.hgetall(jk(jobId));redisOk=true;return value;},null);
  if(!redisOk)return null;
  if(!raw||Object.keys(raw).length===0)return memoryOnlyJobs.has(jobId)?(memoryJobs.get(jobId)??null):null;
  return parsePersistedJobState(jobId,raw);
}
export async function getJobStrict(jobId:string):Promise<JobState|null>{
  if(memoryOnlyJobs.has(jobId))return memoryJobs.get(jobId)??null;
  let redisOk=false;
  const raw=await safeRedis(async rc=>{const value=await rc.hgetall(jk(jobId));redisOk=true;return value;},null);
  if(!redisOk)throw new Error("Permanent Redis job-state read failed; job record state is unknown.");
  if(!raw||Object.keys(raw).length===0)return null;
  return parsePersistedJobState(jobId,raw);
}

export async function getJobLog(jobId:string):Promise<string[]>{const r=await safeRedis(rc=>rc.lrange(lk(jobId),0,LOG_CAP-1),null as string[]|null);return r&&r.length?r:memoryLogs.get(jobId)??[];}
const DEDUP_KEY="apex:dedup:hnwi";export async function isDuplicate(k:string){return permSismember(DEDUP_KEY,k);}export async function markSeen(k:string){await withPermanentClient(async rc=>{await rc.sadd(DEDUP_KEY,k);await rc.expire(DEDUP_KEY,JOB_TTL);},undefined);}export async function getDedupCount(){return permScard(DEDUP_KEY);}export async function clearDedup(){await withPermanentClient(async rc=>{await rc.del(DEDUP_KEY);logger.info({key:DEDUP_KEY},"Dedup set cleared");},undefined);}export async function preloadDedupPrefix(prefix:string){const seen=new Set<string>();await withPermanentClient(async rc=>{let c="0";do{const[n,m]=await rc.sscan(DEDUP_KEY,c,"MATCH",`${prefix}*`,`COUNT`,2000);c=n;for(const x of m)seen.add(x);}while(c!=="0");logger.info({prefix,count:seen.size},"Dedup prefix pre-loaded");},undefined);return seen;}export async function batchMarkSeen(keys:string[]){if(!keys.length)return;await withPermanentClient(async rc=>{await rc.sadd(DEDUP_KEY,...keys);await rc.expire(DEDUP_KEY,JOB_TTL);},undefined);}
const ACTIVE_JOB_TTL_SECONDS=15*60;const ACTIVE_JOB_RENEW_INTERVAL_MS=5*60*1000;const ACTIVE_JOB_READ_CACHE=new Map<string,{at:number;id:string|null}>();const ACTIVE_JOB_RENEWERS=new Map<string,ReturnType<typeof setInterval>>();const ACTIVE_JOB_READ_TTL_MS=8000;
function stopActiveJobRenewal(type:string,jobId?:string):void{const timer=ACTIVE_JOB_RENEWERS.get(type);if(timer)clearInterval(timer);ACTIVE_JOB_RENEWERS.delete(type);if(jobId&&memoryActiveByType.get(type)===jobId)memoryActiveByType.delete(type);}
async function renewActiveJob(type:string,jobId:string):Promise<boolean>{const renewed=await safeRedis(async rc=>Number(await rc.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end",1,`apex:activejob:${type}`,jobId,String(ACTIVE_JOB_TTL_SECONDS)))===1,null as boolean|null);if(renewed!==true){stopActiveJobRenewal(type,jobId);invalidateActiveJobCache(type);return false;}return true;}
function startActiveJobRenewal(type:string,jobId:string):void{stopActiveJobRenewal(type);const timer=setInterval(()=>{void renewActiveJob(type,jobId).catch(()=>{stopActiveJobRenewal(type,jobId);invalidateActiveJobCache(type);});},ACTIVE_JOB_RENEW_INTERVAL_MS);timer.unref?.();ACTIVE_JOB_RENEWERS.set(type,timer);}
export async function setActiveJob(type:string,jobId:string):Promise<boolean>{if(!type||!jobId)throw new Error("Active job type and jobId are required");const result=await safeRedis(async rc=>Number(await rc.eval("local k=KEYS[1]; local current=redis.call('get',k); if current and current~=ARGV[1] then return 0 end; redis.call('set',k,ARGV[1],'EX',ARGV[2]); return 1",1,`apex:activejob:${type}`,jobId,String(ACTIVE_JOB_TTL_SECONDS)))===1,null as boolean|null);if(result!==true)throw new Error(`Cannot claim active job lane '${type}': permanent Redis lock service unavailable or lane already owned`);memoryActiveByType.set(type,jobId);memoryLatestByType.set(type,jobId);ACTIVE_JOB_READ_CACHE.set(type,{at:Date.now(),id:jobId});startActiveJobRenewal(type,jobId);return true;}
export async function getActiveJobStrict(type:string):Promise<string|null>{
  let readSucceeded=false;
  const jobId=await safeRedis(async rc=>{
    const value=await rc.get(`apex:activejob:${type}`);
    readSucceeded=true;
    return value;
  },null as string|null);
  const classified=classifyActiveJobRead(readSucceeded,jobId);
  if(classified.state==="unavailable"){ACTIVE_JOB_READ_CACHE.delete(type);throw new Error("Permanent Redis job-state read failed; active job state is unknown.");}
  if(classified.state==="active"){
    memoryActiveByType.set(type,classified.jobId);
    ACTIVE_JOB_READ_CACHE.set(type,{at:Date.now(),id:classified.jobId});
    return classified.jobId;
  }
  memoryActiveByType.delete(type);
  stopActiveJobRenewal(type);
  ACTIVE_JOB_READ_CACHE.set(type,{at:Date.now(),id:null});
  return null;
}
/** Legacy best-effort accessor for non-authoritative enrichment callers. */
export async function getActiveJob(type:string){
  try{return await getActiveJobStrict(type);}catch{return null;}
}
export async function getActiveJobs(types:string[]){
  const out=new Map<string,string|null>();
  const ts=[...new Set(types)].filter(Boolean);
  if(!ts.length)return out;
  const now=Date.now();
  let readSucceeded=false;
  const vals=await safeRedis(async rc=>{
    const values=await rc.mget(...ts.map(t=>`apex:activejob:${t}`));
    readSucceeded=true;
    return values;
  },null as Array<string|null>|null);
  if(!readSucceeded||!vals) throw new Error("Permanent Redis job-state read failed; active job state is unknown.");
  ts.forEach((t,i)=>{
    const id=vals[i]??null;
    out.set(t,id);
    if(id)memoryActiveByType.set(t,id);else{memoryActiveByType.delete(t);stopActiveJobRenewal(t);}
    ACTIVE_JOB_READ_CACHE.set(t,{at:now,id});
  });
  return out;
}
export function invalidateActiveJobCache(type?:string){if(type)ACTIVE_JOB_READ_CACHE.delete(type);else ACTIVE_JOB_READ_CACHE.clear();}
export async function getLatestJob(type:string){let ok=false;const r=await safeRedis(async rc=>{ok=true;const id=await rc.get(`apex:latestjob:${type}`);return id?getJob(id):null;},null);if(!ok)return null;return r;}
export async function updateAutoPipelineScheduler(patch:Partial<AutoPipelineSchedulerStatus>){const flat:Record<string,string>={};for(const[k,v]of Object.entries(patch))if(v!==undefined)flat[k]=String(v);if(!Object.keys(flat).length)return;await safeRedis(async rc=>{await rc.hset(AUTO_PIPELINE_SCHEDULER_KEY,flat);await rc.expire(AUTO_PIPELINE_SCHEDULER_KEY,JOB_TTL);},undefined);}
export async function getAutoPipelineScheduler(){const r=await safeRedis(rc=>rc.hgetall(AUTO_PIPELINE_SCHEDULER_KEY),{});return{enabled:r.enabled==="true",active:r.active==="true",activatedAt:r.activatedAt,lastTriggerAt:r.lastTriggerAt,nextTriggerAt:r.nextTriggerAt,lastLabel:r.lastLabel,lastStatus:["triggered","completed","skipped_lock","no_targets","error"].includes(r.lastStatus??"")?r.lastStatus as AutoPipelineSchedulerStatus["lastStatus"]:undefined,lastJobId:r.lastJobId,lastMessage:r.lastMessage,cycles:Number(r.cycles??0),skippedDueToLock:Number(r.skippedDueToLock??0),providerNoTarget:Number(r.providerNoTarget??0)};}
export async function clearActiveJob(type:string){const result=await safeRedis(async rc=>Number(await rc.eval("local k=KEYS[1]; local id=redis.call('get',k); if not id then return 0 end; local s=redis.call('hget',ARGV[1]..id,'status'); if s=='done' or s=='failed' or s=='cancelled' then redis.call('del',k); return 1 end; return 0",1,`apex:activejob:${type}`,"apex:job:"))===1,null as boolean|null);if(result!==true)throw new Error(`Cannot clear active job lane '${type}': distributed lock service unavailable or job is still active`);invalidateActiveJobCache(type);memoryActiveByType.delete(type);stopActiveJobRenewal(type);return true;}
export async function forceClearActiveJob(type:string){return clearActiveJob(type);}
export async function clearActiveJobIfMatches(type:string,jobId:string):Promise<boolean>{if(type==="atlas-run"){try{const {releaseCanonicalJob}=await import("./canonical-job-lock");const released=await releaseCanonicalJob(type,jobId);if(released){memoryActiveByType.delete(type);ACTIVE_JOB_READ_CACHE.set(type,{at:Date.now(),id:null});}return released;}catch{return false;}}invalidateActiveJobCache(type);let ok=false;const outcome=await safeRedis(async rc=>{ok=true;return Number(await rc.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",1,`apex:activejob:${type}`,jobId))===1;},null as boolean|null);if(!ok)return false;if(outcome===true){memoryActiveByType.delete(type);ACTIVE_JOB_READ_CACHE.set(type,{at:Date.now(),id:null});stopActiveJobRenewal(type,jobId);}return outcome === true;}
export async function ownsActiveJob(type:string,jobId:string){return(await getActiveJob(type))===jobId;}
export async function clearActiveJobIfOwned(type:string,jobId:string){return clearActiveJobIfMatches(type,jobId);}
