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
import { getGeminiBossLatencyConfig } from "../lib/case-bureau";
import { getGroqBossStatus, runGroqBossReadiness } from "../lib/groq-boss";
import { getMistralRightHandStatus, getMistralRightHandLatencyConfig, runMistralRightHandReadiness } from "../lib/mistral-right-hand-reasoning";
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
    const bureauReasoning=getMistralRightHandStatus();
    const mistralRightHandLatency=getMistralRightHandLatencyConfig();
    const groqBoss=getGroqBossStatus();
    const geminiBossLatency=getGeminiBossLatencyConfig();
    let pgStatus:"ok"|"error"="ok"; let pgLatencyMs:number|null=null;
    try{const t0=Date.now();await db.execute(sql`SELECT 1`);pgLatencyMs=Date.now()-t0;}catch{pgStatus="error";}
    const localInfo=getLocalRedisStatus(); const localLatencyMs=localInfo.status==="ready"?await pingRedis():null;
    const upstash=getPermanentClientStatuses(); const lanesHonesty=buildLanesHonestySnapshot();
    // The historical smolagents/HuggingFace/Serper Deep Research lane is retired.
    // Mistral web search is reported only through its canonical Bureau/provider
    // status; this payload must never advertise the retired endpoint as ready.
    const openResearch={state:"unavailable" as const,huggingFace:{configured:false},serper:{configured:false},adapter:{available:false,model:process.env.HF_DEEP_RESEARCH_MODEL||"Qwen/Qwen2.5-7B-Instruct"},mistral:getMistralWebSearchStatus()};
    const payload={ai,pythonTools,openResearch,groqBoss,geminiBoss:groqBoss,geminiBossLatency,bureauReasoning,mistralRightHand:mistralRightHandStatus,mistralRightHandLatency,lanesHonesty,bureauIntegrity:lanesHonesty.bureauIntegrity,bureauIntegrityReasons:lanesHonesty.bureauIntegrityReasons,databases:{postgres:{status:pgStatus,latencyMs:pgLatencyMs},localRedis:{...localInfo,latencyMs:localLatencyMs},upstash},generatedAt:new Date().toISOString(),cached:false,cachedAgoMs:0};
    _cached=payload;_cachedAt=Date.now();return res.json(payload);
  }catch(err:any){return res.status(500).json({error:err?.message??"Unknown error"});}
});router.post("/system/diagnostics/groq-readiness", async (_req,res) => {
  try {
    const result = await runGroqBossReadiness();
    return res.status(result.status === "ready" ? 200 : 503).json({ ...result, generatedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({
      provider: "groq",
      configured: Boolean(process.env.GROQ_API_KEY?.trim()),
      status: "unavailable",
      model: "groq-boss-pending",
      candidateModels: [],
      httpStatus: null,
      error: error instanceof Error ? error.message : "Groq readiness diagnostic failed.",
      generatedAt: new Date().toISOString(),
    });
  }
});

router.post("/system/diagnostics/mistral-readiness", async (_req,res) => {
  try {
    const result = await runMistralRightHandReadiness();
    return res.status(result.status === "ready" ? 200 : 503).json({ ...result, generatedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ provider: "mistral", configured: Boolean(process.env.MISTRAL_API_KEY?.trim()), status: "unavailable", model: "mistral-small-2603", candidateModels: [], httpStatus: null, error: error instanceof Error ? error.message : "Mistral readiness diagnostic failed.", generatedAt: new Date().toISOString() });
  }
});

export default router;
