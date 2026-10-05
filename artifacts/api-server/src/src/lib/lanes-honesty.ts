/**
 * Provider / lane honesty snapshots for jobs and Bureau cases.
 * Counts only — never secret values. Fail-closed on missing web search.
 */
import { getAIKeyStatus } from "./ai-extractor";
import { getAgenticLlmHealth } from "./agentic-llm-health";
import { getGroqRightHandStatus } from "./groq-right-hand-reasoning";
export type BureauIntegrityLevel = "ok" | "degraded" | "critical";
export type LanesHonestySnapshot = { perplexity:number;tavily:number;exa:number;groq:number;groqInvestigator:number;companiesHouse:number;serper:number;webSearchActive:number;registryShallowRisk:boolean;groqRightHand:number;groqAdmissionFallback:boolean;agenticLlmSlots:number;agenticLlmLastOk:boolean|null;agenticLlmLastModel:string|null;bureauIntegrity:BureauIntegrityLevel;bureauIntegrityReasons:string[];assessedAt:string };
function activeCount(slots:Array<{state:string}>|undefined):number{return(slots??[]).filter((s)=>s.state==="active").length}
export function buildLanesHonestySnapshot():LanesHonestySnapshot{const status=getAIKeyStatus(),perplexity=activeCount(status.perplexity),tavily=activeCount(status.tavily),exa=activeCount(status.exa),serper=[process.env.SERPER_API_KEY,process.env.SERPER_API_KEY_2,process.env.SERPER_API_KEY_3,process.env.SERPER_KEY].some((k)=>Boolean(k?.trim()))?1:0,webSearchActive=perplexity+tavily+exa+serper,groqKeys=[process.env.GROQ_INVESTIGATOR_API_KEY,...Array.from({length:5},(_,i)=>process.env[`GROQ_INVESTIGATOR_API_KEY_${i+1}`])].filter((k)=>typeof k==="string"&&k.trim().length>0),groq=groqKeys.length;
  // Gemini is Boss/control-plane and Right-hand oversight; it is intentionally NOT an Investigator capacity slot.
  const geminiRightHand= getGroqRightHandStatus().configured ? 1 : 0;
  const groqInvestigator=groq; const agenticLlmSlots=groqInvestigator>0?1:0;
  const agenticHealth=getAgenticLlmHealth(),agenticLlmLastOk=agenticHealth.ok,agenticLlmLastModel=agenticHealth.model,reasons:string[]=[];
  if(webSearchActive===0)reasons.push("No live web-search providers (Serper/Tavily/Exa/Perplexity) — registry-only research cannot beat general agents.");
  if(groqRightHand===0)reasons.push("Groq Right-hand is not configured — canonical Atlas oversight cannot proceed.");
  if(agenticLlmSlots===0)reasons.push("No Groq Investigator control LLM configured — ReAct web loop cannot run.");
  if(agenticLlmLastOk===false)reasons.push("Last Groq Investigator LLM step failed — bureau is underperforming.");
  if(groq===0&&agenticLlmSlots>0)reasons.push("Groq missing — admission/name gate and preferred ReAct lane run on fallbacks only.");
  let bureauIntegrity:BureauIntegrityLevel="ok";if(webSearchActive===0||groqRightHand===0||agenticLlmSlots===0||agenticLlmLastOk===false)bureauIntegrity="critical";else if(reasons.length>0)bureauIntegrity="degraded";
  return{perplexity,tavily,exa,serper,groqRightHand,groq,groqInvestigator,companiesHouse:process.env.COMPANIES_HOUSE_API_KEY?1:0,webSearchActive,registryShallowRisk:webSearchActive===0,groqAdmissionFallback:groq===0,agenticLlmSlots,agenticLlmLastOk,agenticLlmLastModel,bureauIntegrity,bureauIntegrityReasons:reasons,assessedAt:new Date().toISOString()};
}
