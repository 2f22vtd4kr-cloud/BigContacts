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
import { getGeminiRightHandStatus } from "../lib/gemini-right-hand-reasoning";
import { buildLanesHonestySnapshot } from "../lib/lanes-honesty";
const router: IRouter = Router();
const CACHE_TTL_MS = 15_000;
let _cached: unknown = null; let _cachedAt = 0;
router.get("/system/source-quality", async (_req,res) => {
  try {
    const [bySource, outcomeSummary] = await Promise.all([
      db.execute(sql`
        SELECT source,
          COUNT(*)::int AS total_evidence,
          COUNT(*) FILTER (WHERE validation_status = 'verified')::int AS verified_count,
          COUNT(*) FILTER (WHERE validation_status = 'candidate')::int AS candidate_count,
          COUNT(*) FILTER (WHERE validation_status = 'rejected')::int AS rejected_count,
          ROUND(AVG(source_reliability)::numeric, 3)::float AS avg_reliability,
          ROUND(AVG(directness_score)::numeric, 3)::float AS avg_directness,
          ROUND(AVG(independent_corroboration)::numeric, 2)::float AS avg_corroboration,
          COUNT(DISTINCT entity_id)::int AS entities_covered,
          COUNT(DISTINCT vector_type)::int AS vector_types
        FROM contact_evidence
        GROUP BY source
        ORDER BY verified_count DESC, total_evidence DESC
        LIMIT 30
      `),
      db.execute(sql`
        SELECT COALESCE(contact_outcome, 'none') AS outcome, COUNT(*)::int AS count,
          ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1)::float AS pct
        FROM entities GROUP BY contact_outcome ORDER BY count DESC
      `),
    ]);
    res.json({ bySource: bySource.rows, outcomeSummary: outcomeSummary.rows, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Source quality unavailable" });
  }
});

router.get("/system/status", async (_req,res) => {
  try {
    if (_cached && Date.now()-_cachedAt<CACHE_TTL_MS) return res.json({ ...(typeof _cached === "object" ? _cached : {}), cached:true, cachedAgoMs:Date.now()-_cachedAt });
    const ai=getAIKeyStatus();
    const pythonTools=await checkPythonToolsAvailability();
    const bureauReasoning=getGeminiRightHandStatus();
    const geminiBoss=await getGeminiBossStatus();
    let pgStatus:"ok"|"error"="ok"; let pgLatencyMs:number|null=null;
    try{const t0=Date.now();await db.execute(sql`SELECT 1`);pgLatencyMs=Date.now()-t0;}catch{pgStatus="error";}
    const localInfo=getLocalRedisStatus(); const localLatencyMs=localInfo.status==="ready"?await pingRedis():null;
    const upstash=getPermanentClientStatuses(); const lanesHonesty=buildLanesHonestySnapshot();
    // The historical smolagents/HuggingFace/Serper Deep Research lane is retired.
    // Mistral web search is reported only through its canonical Bureau/provider
    // status; this payload must never advertise the retired endpoint as ready.
    const openResearch={state:"unavailable" as const,huggingFace:{configured:false},serper:{configured:false},adapter:{available:false,model:process.env.HF_DEEP_RESEARCH_MODEL||"Qwen/Qwen2.5-7B-Instruct"},mistral:getMistralWebSearchStatus()};
    const payload={ai,pythonTools,openResearch,geminiBoss,bureauReasoning,lanesHonesty,bureauIntegrity:lanesHonesty.bureauIntegrity,bureauIntegrityReasons:lanesHonesty.bureauIntegrityReasons,databases:{postgres:{status:pgStatus,latencyMs:pgLatencyMs},localRedis:{...localInfo,latencyMs:localLatencyMs},upstash},generatedAt:new Date().toISOString(),cached:false,cachedAgoMs:0};
    _cached=payload;_cachedAt=Date.now();return res.json(payload);
  }catch(err:any){return res.status(500).json({error:err?.message??"Unknown error"});}
});
export default router;
