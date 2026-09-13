/**
 * Provider / lane honesty snapshots for jobs and Bureau cases.
 * Counts only — never secret values. Fail-closed on missing web search.
 */
import { getAIKeyStatus } from "./ai-extractor";
import { getMistralWebSearchStatus } from "./mistral-web-search";
import { getDeepSeekCaseReasoningStatus } from "./deepseek-case-reasoning";
import { getAgenticLlmHealth } from "./agentic-llm-health";
export type BureauIntegrityLevel = "ok" | "degraded" | "critical";
export type LanesHonestySnapshot = { perplexity:number;tavily:number;exa:number;gemini:number;groq:number;mistral:number;nvidiaNim:number;companiesHouse:number;serper:number;webSearchActive:number;registryShallowRisk:boolean;groqAdmissionFallback:boolean;agenticLlmSlots:number;agenticLlmLastOk:boolean|null;agenticLlmLastModel:string|null;bureauIntegrity:BureauIntegrityLevel;bureauIntegrityReasons:string[];assessedAt:string };
function activeCount(slots:Array<{state:string}>|undefined):number{return(slots??[]).filter((s)=>s.state==="active").length}
export function buildLanesHonestySnapshot():LanesHonestySnapshot{const status=getAIKeyStatus(),mistral=getMistralWebSearchStatus(),nvidia=getDeepSeekCaseReasoningStatus(),perplexity=activeCount(status.perplexity),tavily=activeCount(status.tavily),exa=activeCount(status.exa),serper=[process.env.SERPER_API_KEY,process.env.SERPER_API_KEY_2,process.env.SERPER_API_KEY_3,process.env.SERPER_KEY].some((k)=>Boolean(k?.trim()))?1:0,webSearchActive=perplexity+tavily+exa+serper,groqKeys=[process.env.GROQ_API_KEY,...Array.from({length:10},(_,i)=>process.env[`GROQ_API_KEY_${i+1}`])].filter((k)=>typeof k==="string"&&k.trim().length>0),groq=groqKeys.length,gemini=activeCount(status.gemini),mistralN=mistral.configured?1:0,nvidiaN=nvidia.configured?1:0;
  // Gemini is the Boss/control-plane model and is intentionally NOT an Investigator capacity slot.
  const agenticLlmSlots=(groq>0?1:0)+mistralN+nvidiaN;
  const agenticHealth=getAgenticLlmHealth(),agenticLlmLastOk=agenticHealth.ok,agenticLlmLastModel=agenticHealth.model,reasons:string[]=[];
  if(webSearchActive===0)reasons.push("No live web-search providers (Serper/Tavily/Exa/Perplexity) — registry-only research cannot beat general agents.");
  if(agenticLlmSlots===0)reasons.push("No Investigator control LLM configured (Groq/Mistral/NVIDIA) — ReAct web loop cannot run.");
  if(agenticLlmLastOk===false)reasons.push("Last Investigator LLM step failed across all configured providers — bureau is underperforming.");
  if(groq===0&&agenticLlmSlots>0)reasons.push("Groq missing — admission/name gate and preferred ReAct lane run on fallbacks only.");
  let bureauIntegrity:BureauIntegrityLevel="ok";if(webSearchActive===0||agenticLlmSlots===0||agenticLlmLastOk===false)bureauIntegrity="critical";else if(reasons.length>0)bureauIntegrity="degraded";
  return{perplexity,tavily,exa,serper,gemini,groq,mistral:mistralN,nvidiaNim:nvidiaN,companiesHouse:process.env.COMPANIES_HOUSE_API_KEY?1:0,webSearchActive,registryShallowRisk:webSearchActive===0,groqAdmissionFallback:groq===0,agenticLlmSlots,agenticLlmLastOk,agenticLlmLastModel,bureauIntegrity,bureauIntegrityReasons:reasons,assessedAt:new Date().toISOString()};
}
