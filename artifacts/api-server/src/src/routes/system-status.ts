/**
 * GET /api/system/status
 * Unified operational snapshot for provider pools, databases and canonical Bureau integrity.
 */
import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { getAIKeyStatus } from "../lib/ai-extractor";
import { checkPythonToolsAvailability } from "../lib/python-tools";
import { getLocalRedisStatus, getPermanentClientStatuses, pingRedis } from "../lib/redis";
import { getMistralWebSearchStatus } from "../lib/mistral-web-search";
import { getGeminiBossStatus } from "../lib/case-bureau";
import { getDeepSeekCaseReasoningStatus } from "../lib/deepseek-case-reasoning";
import { buildLanesHonestySnapshot } from "../lib/lanes-honesty";
const router: IRouter = Router();
const CACHE_TTL_MS = 15_000;
let _cached: unknown = null; let _cachedAt = 0;
router.get("/system/status", async (_req,res) => {
  try {
    if (_cached && Date.now()-_cachedAt<CACHE_TTL_MS) return res.json({ ...(typeof _cached === "object" ? _cached : {}), cached:true, cachedAgoMs:Date.now()-_cachedAt });
    const ai=getAIKeyStatus();
    const pythonTools=await checkPythonToolsAvailability();
    const bureauReasoning=getDeepSeekCaseReasoningStatus();
    const geminiBoss=await getGeminiBossStatus();
    let pgStatus:"ok"|"error"="ok"; let pgLatencyMs:number|null=null;
    try{const t0=Date.now();await db.execute(sql`SELECT 1`);pgLatencyMs=Date.now()-t0;}catch{pgStatus="error";}
    const localInfo=getLocalRedisStatus(); const localLatencyMs=localInfo.status==="ready"?await pingRedis():null;
    const upstash=getPermanentClientStatuses(); const lanesHonesty=buildLanesHonestySnapshot();
    // The historical smolagents/HuggingFace/Serper Deep Research lane is retired.
    // Mistral web search is reported only through its canonical Bureau/provider
    // status; this payload must never advertise the retired endpoint as ready.
    const openResearch={state:"unavailable" as const,huggingFace:{configured:false},serper:{configured:false},adapter:{available:false,model:process.env.HF_DEEP_RESEARCH_MODEL||"Qwen/Qwen2.5-7B-Instruct"},mistral:getMistralWebSearchStatus()};
    const payload={ai,openResearch,geminiBoss,bureauReasoning,lanesHonesty,bureauIntegrity:lanesHonesty.bureauIntegrity,bureauIntegrityReasons:lanesHonesty.bureauIntegrityReasons,databases:{postgres:{status:pgStatus,latencyMs:pgLatencyMs},localRedis:{...localInfo,latencyMs:localLatencyMs},upstash},generatedAt:new Date().toISOString(),cached:false,cachedAgoMs:0};
    _cached=payload;_cachedAt=Date.now();return res.json(payload);
  }catch(err:any){return res.status(500).json({error:err?.message??"Unknown error"});}
});
export default router;
