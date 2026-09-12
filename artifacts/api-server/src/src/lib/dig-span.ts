/**
 * DigSpan — Honeycomb / OTel GenAI–style live spans for Apex free-ReAct dig.
 *
 * Design references (observability patterns, not product deps):
 * - Honeycomb Agent Timeline:
 *   https://www.honeycomb.io/platform/agent-timeline
 * - Instrumenting agents for Agent Timeline (OTel GenAI attrs):
 *   https://www.honeycomb.io/blog/instrumenting-ai-agents-agent-timeline-opentelemetry-guide
 * - OpenTelemetry GenAI observability:
 *   https://opentelemetry.io/blog/2026/genai-observability/
 * - OTel GenAI semantic conventions mental model:
 *   invoke_agent → chat (LLM) → execute_tool (tools)
 * - LangSmith traces / trajectory Messages view:
 *   https://docs.langchain.com/langsmith/view-traces
 *   https://docs.langchain.com/langsmith/observability-concepts
 * - AgentPrism (span tree UI concepts):
 *   https://github.com/evilmartians/agent-prism
 * - Sentry AI agent observability: https://blog.sentry.io/ai-agent-observability-developers-guide-to-agent-monitoring/
 *
 * Contract: in-memory ring buffer only (status plane must stay fast under dig load).
 * Redis optional mirror is intentionally NOT required for /atlas-status.
 */

export type DigSpanType = "llm" | "tool" | "promote" | "error" | "stage";
export type DigSpanStatus = "active" | "ok" | "error" | "cancelled";
export interface DigSpan { id:string; jobId:string; targetName?:string; spanType:DigSpanType; name:string; status:DigSpanStatus; startedAt:string; endedAt?:string; inputSummary?:string; resultSummary?:string; modelId?:string; parentSpanId?:string; operationName?:string; agentName?:string; toolName?:string; conversationId?:string; }
const CAP=80;
const byJob=new Map<string,DigSpan[]>();
let globalRing:DigSpan[]=[];
function uid():string{return`sp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;}
function pushRing(list:DigSpan[],span:DigSpan,cap:number):DigSpan[]{const next=[span,...list.filter((s)=>s.id!==span.id)];return next.slice(0,cap);}
export function publishDigSpan(input:Omit<DigSpan,"id"|"startedAt">&{id?:string;startedAt?:string}):DigSpan{const startedAt=input.startedAt??new Date().toISOString();const span:DigSpan={id:input.id??uid(),jobId:input.jobId||"unknown",targetName:input.targetName,spanType:input.spanType,name:input.name,status:input.status,startedAt,endedAt:input.endedAt,inputSummary:input.inputSummary?.slice(0,400),resultSummary:input.resultSummary?.slice(0,500),modelId:input.modelId,parentSpanId:input.parentSpanId,operationName:input.operationName??(input.spanType==="llm"?"chat":input.spanType==="tool"?"execute_tool":input.spanType==="stage"?"invoke_agent":input.spanType),agentName:input.agentName,toolName:input.toolName??(input.spanType==="tool"?input.name:undefined),conversationId:input.conversationId??input.jobId};const jobList=byJob.get(span.jobId)??[];byJob.set(span.jobId,pushRing(jobList,span,CAP));globalRing=pushRing(globalRing,span,CAP);if(byJob.size>40){const keys=[...byJob.keys()];for(const k of keys.slice(0,keys.length-20))byJob.delete(k);}return span;}
export function completeDigSpan(jobId:string,spanId:string,patch?:Partial<Pick<DigSpan,"status"|"resultSummary"|"endedAt">>):DigSpan|null{const list=byJob.get(jobId);if(!list)return null;const idx=list.findIndex((s)=>s.id===spanId);if(idx<0)return null;const prev=list[idx];const next:DigSpan={...prev,status:patch?.status??"ok",resultSummary:patch?.resultSummary??prev.resultSummary,endedAt:patch?.endedAt??new Date().toISOString()};list[idx]=next;byJob.set(jobId,[...list]);globalRing=pushRing(globalRing,next,CAP);return next;}
/** Job-scoped queries are strictly isolated: an absent job key means zero spans, never a global fallback. */
export function getRecentDigSpans(jobId?:string|null,limit=50):DigSpan[]{const n=Math.max(1,Math.min(80,limit));if(jobId!=null&&jobId!=="")return(byJob.get(jobId)??[]).slice(0,n);return globalRing.slice(0,n);}
export function clearDigSpansForJob(jobId:string):void{const list=byJob.get(jobId)??[];const endedAt=new Date().toISOString();for(const span of list){if(span.status!=="active")continue;globalRing=pushRing(globalRing,{...span,status:"error",endedAt,resultSummary:span.resultSummary??"job stopped before tool completed"},CAP);}byJob.delete(jobId);}
export function spanFromLiveStep(step:{jobId?:string|null;targetName?:string|null;tool?:string|null;label?:string|null;detail?:string|null;status?:"active"|"ok"|"error"|string;modelId?:string|null;agentName?:string|null;}):DigSpan|null{try{const tool=(step.tool||step.label||"step").toString();const lower=tool.toLowerCase();let spanType:DigSpanType="tool";if(/llm|model|groq|mistral|gemini|nvidia|boss|reason/.test(lower))spanType="llm";if(/promote|card|persist|phone|email|linkedin/.test(lower)&&/promot|card|writ|save/.test(lower))spanType="promote";if(/error|fail|timeout|rate.?limit/.test(`${tool} ${step.detail||""}`.toLowerCase()))spanType="error";const status:DigSpanStatus=step.status==="cancelled"?"cancelled":step.status==="error"?"error":step.status==="active"?"active":"ok";return publishDigSpan({jobId:step.jobId||"unknown",targetName:step.targetName||undefined,spanType,name:tool.slice(0,80),status,inputSummary:step.label||undefined,resultSummary:step.detail||undefined,modelId:step.modelId||undefined,agentName:step.agentName||"investigator",endedAt:status==="active"?undefined:new Date().toISOString()});}catch{return null;}}
export function toOtelGenAiAttributes(span:DigSpan):Record<string,string>{const out:Record<string,string>={"gen_ai.conversation.id":span.conversationId||span.jobId,"gen_ai.operation.name":span.operationName||(span.spanType==="llm"?"chat":span.spanType==="tool"?"execute_tool":"invoke_agent")};if(span.agentName)out["gen_ai.agent.name"]=span.agentName;if(span.toolName||(span.spanType==="tool"&&span.name))out["gen_ai.tool.name"]=span.toolName||span.name;if(span.modelId)out["gen_ai.request.model"]=span.modelId;if(span.inputSummary)out["gen_ai.tool.call.arguments"]=span.inputSummary.slice(0,400);if(span.resultSummary)out["gen_ai.tool.call.result"]=span.resultSummary.slice(0,500);return out;}
