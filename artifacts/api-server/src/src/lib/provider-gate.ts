import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { logger } from "./logger";
export type ExternalProvider = "serper"|"tavily"|"exa"|"groq"|"mistral"|"gemini"|"scrapfly"|"zenrows"|"browserless"|"playwright"|"rdap"|"companies-house"|"whoisjson"|"whoxy"|"registry"|"search"|"osint"|"generic";
type BudgetClass="llm"|"search"|"scrape"|"registry"|"osint"|"generic";type ProviderConfig={budgetClass:BudgetClass;maxRequests:number;minIntervalMs:number;cacheTtlMs:number};type ProviderState={active:number;lastStartedAt:number;windowStartedAt:number;windowAttempts:number;cooldownUntil:number;lastUsedAt:number};type CacheEntry={expiresAt:number;status:number;statusText:string;headers:Array<[string,string]>;body:Uint8Array};type Waiter={provider:ExternalProvider;resolve:()=>void;reject:(error:Error)=>void;signal?:AbortSignal;onAbort?:()=>void};
export class ProviderQuotaError extends Error{readonly code:"budget_exhausted"|"cooldown";readonly provider:ExternalProvider;readonly retryAfterMs:number;constructor(code:"budget_exhausted"|"cooldown",provider:ExternalProvider,retryAfterMs:number){super(`${provider} ${code.replace("_"," ")}`);this.name="ProviderQuotaError";this.code=code;this.provider=provider;this.retryAfterMs=retryAfterMs;}}
const scopeStorage=new AsyncLocalStorage<string>();export type ProviderRetryOwner="gate"|"caller";const retryOwnerStorage=new AsyncLocalStorage<Partial<Record<ExternalProvider,ProviderRetryOwner>>>();const providerStates=new Map<string,ProviderState>();const scopeStates=new Map<string,ProviderState>();const waiters:Waiter[]=[];const responseCache=new Map<string,CacheEntry>();let responseCacheBytes=0;const inFlight=new Map<string,Promise<Response>>();const boundedEnv=(name:string,fallback:number,min:number,max:number):number=>{const parsed=Number(process.env[name]);if(!Number.isFinite(parsed))return fallback;return Math.min(max,Math.max(min,parsed));};const globalConcurrency=()=>boundedEnv("APEX_EXTERNAL_GLOBAL_CONCURRENCY",4,1,32);const perProviderConcurrency=(provider?:ExternalProvider)=>{const suffix=provider?`_${provider.replace(/[^a-z0-9]/gi,"_").toUpperCase()}`:"";const providerSpecific=provider?process.env[`APEX_EXTERNAL_PROVIDER_CONCURRENCY${suffix}`]:undefined;const fallback=provider==="gemini"?2:1;return boundedEnv(`APEX_EXTERNAL_PROVIDER_CONCURRENCY${suffix}`,providerSpecific?Number(providerSpecific):fallback,1,8);};const windowMs=()=>boundedEnv("APEX_EXTERNAL_WINDOW_MS",10*60_000,10_000,24*60*60_000);const perScopeMaxRequests=()=>{const scope=getScope();if(scope.startsWith("atlas-run:"))return boundedEnv("APEX_ATLAS_PROVIDER_MAX_REQUESTS_PER_SCOPE",80,1,80);return boundedEnv("APEX_EXTERNAL_MAX_REQUESTS_PER_SCOPE",40,1,10_000);};const maxWaiters=()=>boundedEnv("APEX_EXTERNAL_MAX_WAITERS",1024,1,10_000);const maxProviderStates=()=>boundedEnv("APEX_EXTERNAL_MAX_PROVIDER_STATES",4096,32,100_000);const maxResponseCacheEntries=()=>boundedEnv("APEX_EXTERNAL_MAX_RESPONSE_CACHE_ENTRIES",512,16,10_000);const maxResponseCacheBytes=()=>boundedEnv("APEX_EXTERNAL_MAX_RESPONSE_CACHE_BYTES",64*1024*1024,4*1024*1024,512*1024*1024);let activeGlobal=0;
const DEFAULTS:Record<BudgetClass,Omit<ProviderConfig,"budgetClass">>={llm:{maxRequests:90,minIntervalMs:250,cacheTtlMs:0},search:{maxRequests:120,minIntervalMs:125,cacheTtlMs:60_000},scrape:{maxRequests:30,minIntervalMs:250,cacheTtlMs:5*60_000},registry:{maxRequests:150,minIntervalMs:125,cacheTtlMs:2*60_000},osint:{maxRequests:90,minIntervalMs:150,cacheTtlMs:60_000},generic:{maxRequests:300,minIntervalMs:75,cacheTtlMs:30_000}};
const PROVIDER_CLASSES:Record<ExternalProvider,BudgetClass>={serper:"search",tavily:"search",exa:"search",groq:"llm",mistral:"llm",gemini:"llm",scrapfly:"scrape",zenrows:"scrape",browserless:"scrape",playwright:"scrape",rdap:"registry","companies-house":"registry",whoisjson:"registry",whoxy:"registry",registry:"registry",search:"search",osint:"osint",generic:"generic"};
function providerConfig(provider:ExternalProvider):ProviderConfig{const budgetClass=PROVIDER_CLASSES[provider],defaults=DEFAULTS[budgetClass],suffix=provider.replace(/[^a-z0-9]/gi,"_").toUpperCase();return{budgetClass,maxRequests:boundedEnv(`APEX_PROVIDER_MAX_REQUESTS_${suffix}`,defaults.maxRequests,1,100_000),minIntervalMs:boundedEnv(`APEX_PROVIDER_MIN_INTERVAL_MS_${suffix}`,defaults.minIntervalMs,0,60_000),cacheTtlMs:defaults.cacheTtlMs};}
function assertProviderBudgetAvailable(provider:ExternalProvider,state:ProviderState,scopeState:ProviderState,config:ProviderConfig):void{const now=Date.now();if(state.cooldownUntil>now)throw new ProviderQuotaError("cooldown",provider,state.cooldownUntil-now);if(now-state.windowStartedAt>=windowMs()){state.windowStartedAt=now;state.windowAttempts=0;}if(now-scopeState.windowStartedAt>=windowMs()){scopeState.windowStartedAt=now;scopeState.windowAttempts=0;}const providerLimited=state.windowAttempts>=config.maxRequests;const scopeLimited=scopeState.windowAttempts>=perScopeMaxRequests();if(providerLimited||scopeLimited){const expiresAt=Math.max(providerLimited?state.windowStartedAt+windowMs():now,scopeLimited?scopeState.windowStartedAt+windowMs():now);throw new ProviderQuotaError("budget_exhausted",provider,Math.max(1_000,Math.min(windowMs(),expiresAt-now)));}}
function newState():ProviderState{const now=Date.now();return{active:0,lastStartedAt:0,windowStartedAt:now,windowAttempts:0,cooldownUntil:0,lastUsedAt:now};}
function pruneProviderStates(now=Date.now()):void{const expiry=windowMs();for(const[key,state]of providerStates){if(state.active===0&&state.cooldownUntil<=now&&now-state.lastUsedAt>=expiry)providerStates.delete(key);}}
function getState(key:string):ProviderState{const existing=providerStates.get(key);if(existing){existing.lastUsedAt=Date.now();return existing;}if(providerStates.size>=maxProviderStates()){pruneProviderStates();if(providerStates.size>=maxProviderStates())throw new ProviderQuotaError("budget_exhausted","generic",Math.max(1_000,windowMs()));}const created=newState();providerStates.set(key,created);return created;}
function pruneScopeStates(now=Date.now()):void{const expiry=windowMs();for(const [key,state]of scopeStates)if(now-state.lastUsedAt>=expiry)scopeStates.delete(key);}
function getScopeState(key:string):ProviderState{const existing=scopeStates.get(key);if(existing){existing.lastUsedAt=Date.now();return existing;}pruneScopeStates();if(scopeStates.size>=maxProviderStates())throw new ProviderQuotaError("budget_exhausted","generic",Math.max(1_000,windowMs()));const created=newState();scopeStates.set(key,created);return created;}
function removeWaiter(waiter:Waiter):void{const index=waiters.indexOf(waiter);if(index>=0)waiters.splice(index,1);if(waiter.signal&&waiter.onAbort)waiter.signal.removeEventListener("abort",waiter.onAbort);}
async function abortableProviderDelay(ms:number,signal?:AbortSignal|null):Promise<void>{if(signal?.aborted)throw new Error("External provider call cancelled.");await new Promise<void>((resolve,reject)=>{let settled=false;let timer:ReturnType<typeof setTimeout>;const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener("abort",abort);};const finish=(error?:Error)=>{if(settled)return;settled=true;cleanup();if(error)reject(error);else resolve();};const abort=()=>finish(new Error("External provider call cancelled."));timer=setTimeout(()=>finish(),Math.max(0,ms));signal?.addEventListener("abort",abort,{once:true});if(signal?.aborted)abort();});}
function notifyWaiters():void{for(let i=0;i<waiters.length;i+=1){const waiter=waiters[i]!;if(waiter.signal?.aborted){removeWaiter(waiter);i-=1;waiter.reject(new Error("External provider concurrency wait cancelled."));continue;}const state=getState(waiter.provider);if(activeGlobal>=globalConcurrency()||state.active>=perProviderConcurrency(waiter.provider))continue;removeWaiter(waiter);activeGlobal+=1;state.active+=1;waiter.resolve();return;}}
async function acquireConcurrency(provider:ExternalProvider,signal?:AbortSignal|null):Promise<void>{const state=getState(provider);if(signal?.aborted)throw new Error("External provider concurrency wait cancelled.");if(activeGlobal<globalConcurrency()&&state.active<perProviderConcurrency(provider)){activeGlobal+=1;state.active+=1;return;}if(waiters.length>=maxWaiters())throw new ProviderQuotaError("budget_exhausted",provider,Math.max(1_000,windowMs()));await new Promise<void>((resolve,reject)=>{const waiter:Waiter={provider,resolve,reject,signal:signal??undefined};const onAbort=()=>{removeWaiter(waiter);reject(new Error("External provider concurrency wait cancelled."));};waiter.onAbort=onAbort;signal?.addEventListener("abort",onAbort,{once:true});waiters.push(waiter);});if(signal?.aborted){releaseConcurrency(provider);throw new Error("External provider concurrency wait cancelled.");}}
function releaseConcurrency(provider:ExternalProvider):void{activeGlobal=Math.max(0,activeGlobal-1);const state=getState(provider);state.active=Math.max(0,state.active-1);notifyWaiters();}
function getScope():string{return scopeStorage.getStore()??"process";}function scopeKey(provider:ExternalProvider):string{return `${getScope()}|${provider}`;}function providerStateKey(provider:ExternalProvider,account:string):string{return `${provider}|${account}`;}
const QUERY_CREDENTIAL_KEYS=new Set(["key","apikey","api_key","api-key","x-api-key","x-goog-api-key","token","api_token","api-token","x-api-token","access_token","access-token","x-access-token","access_key","access-key","accesskey","authorization","auth","x-auth-token","client_secret","client-secret","clientsecret","secret_key","secret-key","secret","password","passwd","credential","credentials","signature","sig","x-amz-signature","x-amz-credential"]);
function stripCredentialQueryParams(parsed:URL):void{for(const key of [...parsed.searchParams.keys()])if(QUERY_CREDENTIAL_KEYS.has(key.toLowerCase()))parsed.searchParams.delete(key);}function findQueryCredential(url:string):string{try{const parsed=new URL(url);for(const [key,value]of parsed.searchParams.entries())if(QUERY_CREDENTIAL_KEYS.has(key.toLowerCase())&&value)return value;}catch{}return "";}
function effectiveRequestHeaders(input:string|URL|Request,init?:RequestInit):Headers{return new Headers(init?.headers!==undefined?init.headers:input instanceof Request?input.headers:undefined);}
function accountFingerprint(input:string|URL|Request,init?:RequestInit):string{const headers=effectiveRequestHeaders(input,init);const credentials=[...headers.entries()].filter(([name])=>/^(authorization|proxy-authorization|x-api-key|x-goog-api-key|api-key|x-auth-token|x-access-token|x-client-secret|x-subscription-key)$/i.test(name)).map(([name,value])=>`${name.toLowerCase()}:${value}`).sort().join("\n");const url=typeof input==="string"?input:input instanceof URL?input.toString():input.url;const queryCredential=findQueryCredential(url);const material=credentials||queryCredential;let modelDiscriminator="";try{const parsed=new URL(url);if(parsed.hostname==="generativelanguage.googleapis.com"&&/^\/v1beta\/models\/[^/]+:generateContent$/i.test(parsed.pathname))modelDiscriminator=parsed.pathname;}catch{}if(!material){try{return createHash("sha256").update(`${new URL(url).host}\n${modelDiscriminator}`).digest("hex").slice(0,16);}catch{return "unknown";}}return createHash("sha256").update(`${material}\n${modelDiscriminator}`).digest("hex").slice(0,16);}
function parseRetryAfter(response:Response):number{const value=response.headers.get("retry-after");if(!value)return 0;const seconds=Number(value);if(Number.isFinite(seconds))return Math.min(5*60_000,Math.max(0,seconds*1000));const timestamp=Date.parse(value);return Number.isFinite(timestamp)?Math.min(5*60_000,Math.max(0,timestamp-Date.now())):0;}
 function isQuotaResponse(provider:ExternalProvider,response:Response):boolean{if(provider==="gemini"&&(response.status===403||response.status===429||response.status===503))return false;if(response.status===429||response.status===402)return true;return false;}function requestMethod(input:string|URL|Request,init?:RequestInit):string{return(init?.method??(input instanceof Request?input.method:"GET")).toUpperCase();}function requestUrl(input:string|URL|Request):string{return typeof input==="string"?input:input instanceof URL?input.toString():input.url;}function isLocalUrl(url:string):boolean{try{const host=new URL(url).hostname;return host==="localhost"||host==="127.0.0.1"||host==="::1"||host.endsWith(".local");}catch{return false;}}
function hostIsOrWithin(host: string, domain: string): boolean {
 return host === domain || host.endsWith("." + domain);
}
export function classifyExternalProvider(url:string):ExternalProvider{
 let host="";
 try{host=new URL(url).hostname.toLowerCase().replace(/\.$/,"");}catch{return "generic";}
 if(hostIsOrWithin(host,"serper.dev"))return "serper";
 if(hostIsOrWithin(host,"tavily.com"))return "tavily";
 if(hostIsOrWithin(host,"exa.ai"))return "exa";
 if(hostIsOrWithin(host,"groq.com"))return "groq";
 if(hostIsOrWithin(host,"mistral.ai"))return "mistral";
 if(hostIsOrWithin(host,"generativelanguage.googleapis.com")||hostIsOrWithin(host,"googleapis.com"))return "gemini";
 if(hostIsOrWithin(host,"scrapfly.io"))return "scrapfly";
 if(hostIsOrWithin(host,"zenrows.com"))return "zenrows";
 if(hostIsOrWithin(host,"browserless.io"))return "browserless";
 if(hostIsOrWithin(host,"companieshouse.gov.uk")||hostIsOrWithin(host,"company-information.service.gov.uk"))return "companies-house";
 if(hostIsOrWithin(host,"whoisjson.com"))return "whoisjson";
 if(hostIsOrWithin(host,"whoxy.com"))return "whoxy";
 if(["duckduckgo.com","google.com","bing.com"].some((domain)=>hostIsOrWithin(host,domain)))return "search";
 if(
   ["opencorporates.com","gleif.org","sec.gov","brreg.no","icij.org","occrp.org","offeneregister.de","allabolag.se","openkvk.nl","ares.gov.cz","prh.fi","boe.es","cvrapi.dk","economie.fgov.be","opendatasoft.com","zefix.ch","atoka.io"].some((domain)=>hostIsOrWithin(host,domain))
 )return "registry";
 if(hostIsOrWithin(host,"hunter.io"))return "osint";
 return "generic";
}
const CACHE_VARIANT_HEADERS=new Set(["accept","accept-language","user-agent"]);
function cacheKey(provider:ExternalProvider,input:string|URL|Request,init?:RequestInit):string|null{if(requestMethod(input,init)!=="GET")return null;const headers=effectiveRequestHeaders(input,init);for(const name of headers.keys())if(!CACHE_VARIANT_HEADERS.has(name.toLowerCase()))return null;const url=requestUrl(input);if(isLocalUrl(url)||findQueryCredential(url))return null;try{const parsed=new URL(url);if(parsed.username||parsed.password)return null;stripCredentialQueryParams(parsed);const variant=[headers.get("accept")??"",headers.get("accept-language")??"",headers.get("user-agent")??""].join("\n");const variantHash=createHash("sha256").update(variant).digest("hex").slice(0,16);return `${provider}|public|${variantHash}|${parsed.toString()}`;}catch{return null;}}
function cacheExpiry(response:Response,configuredTtlMs:number,now=Date.now()):number|null{if(!response.ok||response.status!==200||configuredTtlMs<=0||response.headers.has("set-cookie"))return null;const directives=(response.headers.get("cache-control")??"").split(",").map((part)=>part.trim().toLowerCase()).filter(Boolean);if(directives.some((part)=>/^(no-store|private|no-cache|must-revalidate|proxy-revalidate)(?:\s|=|$)/.test(part)))return null;const vary=(response.headers.get("vary")??"").split(",").map((part)=>part.trim().toLowerCase()).filter(Boolean);if(vary.some((name)=>name==="*"||!CACHE_VARIANT_HEADERS.has(name)))return null;let ttlMs=configuredTtlMs;const sharedMaxAge=directives.find((part)=>/^s-maxage\s*=/.test(part));const maxAge=sharedMaxAge??directives.find((part)=>/^max-age\s*=/.test(part));if(maxAge){const match=maxAge.match(/^(?:s-maxage|max-age)\s*=\s*"?([0-9]+)"?$/);if(!match)return null;const ageSeconds=Number(match[1]);if(!Number.isSafeInteger(ageSeconds)||ageSeconds<=0)return null;const responseAge=Number(response.headers.get("age")??"0");if(!Number.isFinite(responseAge)||responseAge<0)return null;ttlMs=Math.min(ttlMs,ageSeconds*1000-responseAge*1000);}const expiresHeader=response.headers.get("expires");if(expiresHeader){const expiresAt=Date.parse(expiresHeader);if(!Number.isFinite(expiresAt))return null;const dateHeader=response.headers.get("date");const baseTime=dateHeader?Date.parse(dateHeader):now;if(!Number.isFinite(baseTime))return null;const ageSeconds=Number(response.headers.get("age")??"0");ttlMs=Math.min(ttlMs,expiresAt-baseTime-Math.max(0,ageSeconds)*1000);}return ttlMs>0?now+ttlMs:null;}
function waitForSharedResponse(existing:Promise<Response>,signal?:AbortSignal|null):Promise<Response>{if(signal?.aborted)return Promise.reject(new Error("External provider call cancelled."));if(!signal)return existing.then((response)=>response.clone());return new Promise<Response>((resolve,reject)=>{let settled=false;const cleanup=()=>signal.removeEventListener("abort",abort);const finish=(error?:unknown,response?:Response)=>{if(settled)return;settled=true;cleanup();if(error!==undefined)reject(error);else if(response)resolve(response);else reject(new Error("Shared provider response was empty."));};const abort=()=>finish(new Error("External provider call cancelled."));signal.addEventListener("abort",abort,{once:true});existing.then((response)=>finish(undefined,response.clone()),(error)=>finish(error));if(signal.aborted)abort();});}
const cacheBodyCaptureTimeoutMs=()=>boundedEnv("APEX_EXTERNAL_CACHE_BODY_READ_TIMEOUT_MS",5_000,10,30_000);
async function readCacheBodyBounded(response:Response, maximumBytes:number, signal?:AbortSignal):Promise<Uint8Array|null>{
 if(!response.body)return new Uint8Array(0);
 if(maximumBytes<=0)return null;
 const reader=response.clone().body?.getReader();
 if(!reader)return new Uint8Array(0);
 const chunks:Uint8Array[]=[];
 let bytes=0;
 let timer:ReturnType<typeof setTimeout>|undefined;
 let onAbort:(()=>void)|undefined;
 const stopReading=new Promise<never>((_,reject)=>{
  timer=setTimeout(()=>reject(new Error("Provider response cache capture deadline exceeded")),cacheBodyCaptureTimeoutMs());
  if(signal){
   onAbort=()=>reject(new Error("Provider response cache capture cancelled"));
   if(signal.aborted)onAbort();
   else signal.addEventListener("abort",onAbort,{once:true});
  }
 });
 try{
  while(true){
   const result=await Promise.race([reader.read(),stopReading]);
   if(result.done)break;
   bytes+=result.value.byteLength;
   if(bytes>maximumBytes){void reader.cancel().catch(()=>undefined);return null;}
   chunks.push(result.value);
  }
  const body=new Uint8Array(bytes);
  let offset=0;
  for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
  return body;
 }catch{
  void reader.cancel().catch(()=>undefined);
  return null;
 }finally{
  if(timer)clearTimeout(timer);
  if(signal&&onAbort)signal.removeEventListener("abort",onAbort);
  reader.releaseLock();
 }
}
function responseFromCache(entry:CacheEntry):Response{return new Response(entry.body.slice(),{status:entry.status,statusText:entry.statusText,headers:entry.headers});}function removeResponseCacheEntry(key:string):void{const entry=responseCache.get(key);if(!entry)return;responseCache.delete(key);responseCacheBytes=Math.max(0,responseCacheBytes-entry.body.byteLength);}function pruneResponseCache(now:number):void{for(const[key,entry]of responseCache)if(entry.expiresAt<=now)removeResponseCacheEntry(key);while(responseCache.size>=maxResponseCacheEntries()||responseCacheBytes>=maxResponseCacheBytes()){const oldest=responseCache.keys().next().value as string|undefined;if(!oldest)break;removeResponseCacheEntry(oldest);}}function makeRoomForResponse(bytes:number):void{const limit=maxResponseCacheBytes();while(responseCache.size>=maxResponseCacheEntries()||responseCacheBytes+bytes>limit){const oldest=responseCache.keys().next().value as string|undefined;if(!oldest)break;removeResponseCacheEntry(oldest);}}
 async function runProviderFetch(provider:ExternalProvider,input:string|URL|Request,init:RequestInit|undefined,fetcher:()=>Promise<Response>):Promise<Response>{
 const requestSignal=init?.signal??(typeof Request!=="undefined"&&input instanceof Request?input.signal:undefined);
 if(requestSignal?.aborted)throw new Error("External provider call cancelled.");
 const key=cacheKey(provider,input,init);
 if(key){
  const cached=responseCache.get(key);
  if(cached&&cached.expiresAt>Date.now()){
   responseCache.delete(key);responseCache.set(key,cached);
   return responseFromCache(cached);
  }
  if(cached)removeResponseCacheEntry(key);
  const existing=inFlight.get(key);
  if(existing)return await waitForSharedResponse(existing,requestSignal);
 }
 const config=providerConfig(provider),account=accountFingerprint(input,init),state=getState(providerStateKey(provider,account)),now=Date.now();
 if(state.cooldownUntil>now){logger.warn({provider,block:"cooldown",retryAfterMs:state.cooldownUntil-now,accountDigest:account,scope:getScope()},"External provider call blocked by quota cooldown");throw new ProviderQuotaError("cooldown",provider,state.cooldownUntil-now);}
 if(now-state.windowStartedAt>=windowMs()){state.windowStartedAt=now;state.windowAttempts=0;}
 const scopeState=getScopeState(scopeKey(provider));
 if(now-scopeState.windowStartedAt>=windowMs()){scopeState.windowStartedAt=now;scopeState.windowAttempts=0;}
 if(state.windowAttempts>=config.maxRequests||scopeState.windowAttempts>=perScopeMaxRequests()){
  const retryAfterMs=Math.max(1_000,Math.min(windowMs(),state.windowStartedAt+windowMs()-now));
  logger.warn({provider,block:"budget_exhausted",retryAfterMs,accountDigest:account,scope:getScope(),providerAttempts:state.windowAttempts,scopeAttempts:scopeState.windowAttempts},"External provider call blocked by quota budget");
  throw new ProviderQuotaError("budget_exhausted",provider,retryAfterMs);
 }
 const task=(async()=>{
  await acquireConcurrency(provider,requestSignal);
  try{
   const current=Date.now(),waitMs=Math.max(0,config.minIntervalMs-(current-state.lastStartedAt));
   if(waitMs>0)await abortableProviderDelay(waitMs,requestSignal);
   if(requestSignal?.aborted)throw new Error("External provider call cancelled.");
   // Budgets can be consumed while this call waits for a concurrency slot or
   // rate-limit delay. Recheck synchronously immediately before the request.
   assertProviderBudgetAvailable(provider,state,scopeState,config);
   state.lastStartedAt=Date.now();state.windowAttempts+=1;scopeState.windowAttempts+=1;
   const response=await fetcher();
   const retryOwner=retryOwnerStorage.getStore()?.[provider]??"gate";
   if(isQuotaResponse(provider,response)){
    const retryMs=Math.max(parseRetryAfter(response),response.status===429?5_000:60_000);
    if(retryOwner==="gate"){
     state.cooldownUntil=Date.now()+retryMs;
     logger.warn({provider,httpStatus:response.status,retryAfterMs:retryMs,accountDigest:account,scope:getScope(),cooldownOwner:"quota_gate"},"External provider quota cooldown set");
    }else logger.info({provider,httpStatus:response.status,retryAfterMs:retryMs,accountDigest:account,scope:getScope(),cooldownOwner:"caller"},"Provider retry ownership delegated to caller");
   }
   const expiresAt=cacheExpiry(response,config.cacheTtlMs);
   if(key&&expiresAt!==null){
    const body=await readCacheBodyBounded(response,Math.min(1_500_000,maxResponseCacheBytes()),requestSignal);if(requestSignal?.aborted)throw new Error("External provider call cancelled.");
    if(body&&body.byteLength<=1_500_000&&body.byteLength<=maxResponseCacheBytes()){
     pruneResponseCache(Date.now());makeRoomForResponse(body.byteLength);
     responseCache.set(key,{expiresAt,status:response.status,statusText:response.statusText,headers:[...response.headers.entries()],body});
     responseCacheBytes+=body.byteLength;
    }
   }
   return response;
  }finally{releaseConcurrency(provider);}
 })();
 if(key)inFlight.set(key,task);
 try{return await task;}finally{if(key&&inFlight.get(key)===task)inFlight.delete(key);}
}
export async function runProviderCall<T>(options:{provider:ExternalProvider;account?:string;scope?:string;signal?:AbortSignal},fn:()=>Promise<T>):Promise<T>{
 const provider=options.provider,account=options.account??"operation",scope=options.scope??getScope();
 return scopeStorage.run(scope,async()=>{
  const config=providerConfig(provider),state=getState(providerStateKey(provider,account)),scopeState=getScopeState(scopeKey(provider)),now=Date.now();
  if(state.cooldownUntil>now)throw new ProviderQuotaError("cooldown",provider,state.cooldownUntil-now);
  if(now-state.windowStartedAt>=windowMs()){state.windowStartedAt=now;state.windowAttempts=0;}
  if(now-scopeState.windowStartedAt>=windowMs()){scopeState.windowStartedAt=now;scopeState.windowAttempts=0;}
  if(state.windowAttempts>=config.maxRequests||scopeState.windowAttempts>=perScopeMaxRequests())throw new ProviderQuotaError("budget_exhausted",provider,Math.max(1_000,state.windowStartedAt+windowMs()-now));
  await acquireConcurrency(provider,options.signal);
  try{
   const waitMs=Math.max(0,config.minIntervalMs-(Date.now()-state.lastStartedAt));
   if(waitMs>0)await abortableProviderDelay(waitMs,options.signal);
   if(options.signal?.aborted)throw new Error("External provider call cancelled.");
   // Queue and rate-limit waits yield to other calls; reserve budget only after
   // checking the live counters again, immediately before the actual operation.
   assertProviderBudgetAvailable(provider,state,scopeState,config);
   state.lastStartedAt=Date.now();state.windowAttempts+=1;scopeState.windowAttempts+=1;
   try{
    const result=await fn();
    if(result instanceof Response&&isQuotaResponse(provider,result)&&retryOwnerStorage.getStore()?.[provider]!=="caller"){
     const retryMs=parseRetryAfter(result);
     state.cooldownUntil=Date.now()+Math.max(retryMs,result.status===429?5_000:60_000);
    }
    return result;
   }catch(error){if(error instanceof ProviderQuotaError&&error.code==="cooldown")state.cooldownUntil=Date.now()+error.retryAfterMs;throw error;}
  }finally{releaseConcurrency(provider);}
 });
}
export function withProviderScope<T>(scope:string,fn:()=>Promise<T>):Promise<T>{return scopeStorage.run(scope,fn);}export function withProviderRetryOwnership<T>(provider:ExternalProvider,owner:ProviderRetryOwner,fn:()=>Promise<T>):Promise<T>{const inherited=retryOwnerStorage.getStore()??{};return retryOwnerStorage.run({...inherited,[provider]:owner},fn);}export function installExternalQuotaGuard():void{const current=globalThis.fetch;if(current&&(current as typeof fetch&{__apexQuotaGuard?:boolean}).__apexQuotaGuard)return;const original=current.bind(globalThis);const guarded=(async(input:string|URL|Request,init?:RequestInit)=>{const url=requestUrl(input);if(isLocalUrl(url))return original(input,init);const provider=classifyExternalProvider(url);return runProviderFetch(provider,input,init,()=>original(input,init));}) as typeof fetch&{__apexQuotaGuard?:boolean};guarded.__apexQuotaGuard=true;globalThis.fetch=guarded;logger.info({globalConcurrency:globalConcurrency(),providerConcurrency:perProviderConcurrency(),windowMs:windowMs(),perScopeMaxRequests:perScopeMaxRequests(),maxWaiters:maxWaiters(),maxProviderStates:maxProviderStates(),maxResponseCacheEntries:maxResponseCacheEntries(),maxResponseCacheBytes:maxResponseCacheBytes()},"External provider quota gate installed");}
export function getProviderGateSnapshot(){const now=Date.now(),byProvider=new Map<ExternalProvider,{active:number;windowAttempts:number;cooldownMs:number}>();for(const[key,state]of providerStates){const provider=key.split("|",1)[0] as ExternalProvider;const current=byProvider.get(provider)??{active:0,windowAttempts:0,cooldownMs:0};current.active+=state.active;current.windowAttempts=Math.max(current.windowAttempts,state.windowAttempts);current.cooldownMs=Math.max(current.cooldownMs,Math.max(0,state.cooldownUntil-now));byProvider.set(provider,current);}return{activeGlobal,providers:[...byProvider.entries()].map(([provider,state])=>({provider,...state}))};}
export function resetProviderGateForTests(){providerStates.clear();scopeStates.clear();responseCache.clear();responseCacheBytes=0;inFlight.clear();waiters.length=0;activeGlobal=0;}
