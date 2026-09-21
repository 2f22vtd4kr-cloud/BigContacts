/**
 * Provider / lane honesty snapshots for jobs and Bureau cases.
 * Counts only — never secret values. Fail-closed on missing web search.
 */
import { getAIKeyStatus } from "./ai-extractor";
import { getMistralWebSearchStatus } from "./mistral-web-search";
import { getAgenticLlmHealth } from "./agentic-llm-health";
import { getGeminiRightHandStatus } from "./gemini-right-hand-reasoning";
export type BureauIntegrityLevel = "ok" | "degraded" | "critical";
export type LanesHonestySnapshot = { perplexity:number;tavily:number;exa:number;gemini:number;geminiRightHand:number;groq:number;mistral:number;companiesHouse:number;serper:number;webSearchActive:number;registryShallowRisk:boolean;groqAdmissionFallback:boolean;agenticLlmSlots:number;agenticLlmLastOk:boolean|null;agenticLlmLastModel:string|null;bureauIntegrity:BureauIntegrityLevel;bureauIntegrityReasons:string[];assessedAt:string };
function activeCount(slots:Array<{state:string}>|undefined):number{return(slots??[]).filter((s)=>s.state==="active").length}
export function buildLanesHonestySnapshot():LanesHonestySnapshot{const status=getAIKeyStatus(),mistral=getMistralWebSearchStatus(),perplexity=activeCount(status.perplexity),tavily=activeCount(status.tavily),exa=activeCount(status.exa),serper=[process.env.SERPER_API_KEY,process.env.SERPER_API_KEY_2,process.env.SERPER_API_KEY_3,process.env.SERPER_KEY].some((k)=>Boolean(k?.trim()))?1:0,webSearchActive=perplexity+tavily+exa+serper,groqKeys=[process.env.GROQ_API_KEY,...Array.from({length:10},(_,i)=>process.env[`GROQ_API_KEY_${i+1}`])].filter((k)=>typeof k==="string"&&k.trim().length>0),groq=groqKeys.length,gemini=activeCount(status.gemini),mistralN=mistral.configured?1:0;
  // Gemini is Boss/control-plane and Right-hand oversight; it is intentionally NOT an Investigator capacity slot.
  const geminiRightHand= getGeminiRightHandStatus().configured ? 1 : 0;
  const agenticLlmSlots=(groq>0?1:0)+mistralN;
  const agenticHealth=getAgenticLlmHealth(),agenticLlmLastOk=agenticHealth.ok,agenticLlmLastModel=agenticHealth.model,reasons:string[]=[];
  if(webSearchActive===0)reasons.push("No live web-search providers (Serper/Tavily/Exa/Perplexity) — registry-only research cannot beat general agents.");
  if(geminiRightHand===0)reasons.push("Gemini Right-hand is not configured — canonical Atlas oversight cannot proceed.");
  if(agenticLlmSlots===0)reasons.push("No Investigator control LLM configured (Groq/Mistral) — ReAct web loop cannot run.");
  if(agenticLlmLastOk===false)reasons.push("Last Investigator LLM step failed across all configured providers — bureau is underperforming.");
  if(groq===0&&agenticLlmSlots>0)reasons.push("Groq missing — admission/name gate and preferred ReAct lane run on fallbacks only.");
  let bureauIntegrity:BureauIntegrityLevel="ok";if(webSearchActive===0||geminiRightHand===0||agenticLlmSlots===0||agenticLlmLastOk===false)bureauIntegrity="critical";else if(reasons.length>0)bureauIntegrity="degraded";
  return{perplexity,tavily,exa,serper,gemini,geminiRightHand,groq,mistral:mistralN,companiesHouse:process.env.COMPANIES_HOUSE_API_KEY?1:0,webSearchActive,registryShallowRisk:webSearchActive===0,groqAdmissionFallback:groq===0,agenticLlmSlots,agenticLlmLastOk,agenticLlmLastModel,bureauIntegrity,bureauIntegrityReasons:reasons,assessedAt:new Date().toISOString()};
}
