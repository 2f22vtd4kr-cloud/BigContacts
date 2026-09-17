import type { BureauAction, DiscoveryCaseFile, ResearchCaseFile } from "./case-bureau";

export const DEEPSEEK_CASE_REASONING_MODEL = "deepseek-flash";
const DEEPSEEK_CHAT_API = "https://api.deepseek.com/chat/completions";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 2;

type DeepSeekMessage = { role: "system" | "user"; content: string };
type DeepSeekMessageResponse = { content?: string | null; reasoning_content?: string | null; reasoning?: string | null };
type DeepSeekResponse = { choices?: Array<{ message?: DeepSeekMessageResponse }> };

export type DeepSeekCaseReasoningStatus = { configured: boolean; model: string; endpoint: string; role: "right_hand_advisor"; capability: "case_file_reasoning_only" };
export type DeepSeekCaseReasoningResult = { status: "completed" | "unavailable"; model: string; actionId: string | null; decision: string | null; reason: string | null; confidence: number | null; error: string | null };
export type DeepSeekDiscoveryAdviceResult = { status: "completed" | "unavailable"; model: string; decision: string | null; reason: string | null; focusLanes: string[]; confidence: number | null; error: string | null };

function key(): string | null { return process.env.DEEPSEEK_API_KEY?.trim() || null; }
function textOf(message: DeepSeekMessageResponse | undefined): string { return (message?.content || message?.reasoning_content || message?.reasoning || "").trim(); }
function extractJson(raw: string): Record<string, unknown> | null { const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim(); const source = fenced || raw.trim(); const start = source.indexOf("{"), end = source.lastIndexOf("}"); if (start < 0 || end <= start) return null; try { const value = JSON.parse(source.slice(start, end + 1)); return value && typeof value === "object" ? value as Record<string, unknown> : null; } catch { return null; } }

async function request(messages: DeepSeekMessage[], responseFormat = false): Promise<{ raw: string; error: string | null }> {
  const apiKey = key();
  if (!apiKey) return { raw: "", error: "DEEPSEEK_API_KEY is not configured." };
  let lastError = "DeepSeek request failed.";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(DEEPSEEK_CHAT_API, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: DEEPSEEK_CASE_REASONING_MODEL, messages, temperature: 1, top_p: 0.95, max_tokens: 2048, thinking: { type: "enabled" }, reasoning_effort: "high", ...(responseFormat ? { response_format: { type: "json_object" } } : {}), stream: false }), signal: controller.signal });
      const body = await response.text();
      if (response.ok) { try { const payload = JSON.parse(body) as DeepSeekResponse; const raw = textOf(payload.choices?.[0]?.message); if (raw) return { raw, error: null }; lastError = "DeepSeek returned an empty response."; } catch { lastError = "DeepSeek returned invalid JSON."; } break; }
      lastError = `DeepSeek API ${DEEPSEEK_CASE_REASONING_MODEL} HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`;
      const transient = response.status === 408 || response.status === 429 || response.status >= 500;
      if (!transient || attempt >= MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    } catch (error) {
      lastError = error instanceof Error && error.name === "AbortError" ? `DeepSeek request timed out after ${REQUEST_TIMEOUT_MS}ms.` : error instanceof Error ? error.message : "DeepSeek request failed.";
      if (attempt >= MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    } finally { clearTimeout(timer); }
  }
  return { raw: "", error: lastError };
}

function compactCase(file: ResearchCaseFile): string { return JSON.stringify({ target: file.target, hypotheses: file.hypotheses?.slice(-12), evidenceSummary: file.evidenceSummary, specialistRoster: file.specialistRoster, actionQueue: file.actionQueue, contactRoutes: file.contactRoutes?.slice(-16), investigationProgress: file.investigationProgress, researchDepth: file.researchDepth, decisionLog: file.decisionLog?.slice(-8), rightHandAdvice: file.rightHandAdvice, bossPlan: file.bossPlan }, null, 2); }
function compactDiscovery(file: DiscoveryCaseFile): string { return JSON.stringify({ humanBrief: file.humanBrief, bossPremise: file.bossPremise, candidateLanes: file.candidateLanes, initialResearch: file.initialResearch, investigatorReports: file.investigatorReports?.slice(-10), currentProgress: file.currentProgress, discoveredCandidates: file.discoveredCandidates?.slice(-20), orgFootprint: file.orgFootprint, decisionLog: file.decisionLog?.slice(-8) }, null, 2); }
export function getDeepSeekCaseReasoningStatus(): DeepSeekCaseReasoningStatus { return { configured: Boolean(key()), model: DEEPSEEK_CASE_REASONING_MODEL, endpoint: DEEPSEEK_CHAT_API, role: "right_hand_advisor", capability: "case_file_reasoning_only" }; }

export async function runDeepSeekCaseReasoning(input: { file: ResearchCaseFile; iteration: number }): Promise<DeepSeekCaseReasoningResult> {
  const queued = input.file.actionQueue.filter((action) => action.status === "queued").slice(0, 16);
  const system = "You are Apex Atlas Right Hand. Reason only over the supplied case file. Never browse, invent evidence, contacts, people, URLs, or facts. Recommend exactly one existing queued action. Return JSON only.";
  const user = `${system}\n\nIteration ${input.iteration}. Identify what is newly unresolved, which contact vectors are still pending, and the highest-leverage complementary queued action.\nCASE:\n${compactCase(input.file)}\n\nQUEUED ACTIONS:\n${JSON.stringify(queued, null, 2)}\n\nReturn {\"actionId\":\"exact queued id\",\"decision\":\"short recommendation\",\"reason\":\"concrete evidence-gap reason\",\"confidence\":0.0}.`;
  const result = await request([{ role: "system", content: system }, { role: "user", content: user }], true);
  if (result.error) return { status: "unavailable", model: DEEPSEEK_CASE_REASONING_MODEL, actionId: null, decision: null, reason: null, confidence: null, error: result.error };
  const parsed = extractJson(result.raw); const actionId = typeof parsed?.actionId === "string" ? parsed.actionId.trim() : ""; const action = queued.find((candidate) => candidate.id === actionId); const decision = typeof parsed?.decision === "string" ? parsed.decision.trim() : ""; const reason = typeof parsed?.reason === "string" ? parsed.reason.trim() : ""; const confidence = typeof parsed?.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : null;
  if (!action || !decision || !reason) return { status: "unavailable", model: DEEPSEEK_CASE_REASONING_MODEL, actionId: null, decision: null, reason: null, confidence, error: "DeepSeek returned an invalid or non-queued recommendation." };
  return { status: "completed", model: DEEPSEEK_CASE_REASONING_MODEL, actionId: action.id, decision: decision.slice(0, 500), reason: reason.slice(0, 1000), confidence, error: null };
}

export async function runDeepSeekDiscoveryAdvice(input: { file: DiscoveryCaseFile; iteration: number }): Promise<DeepSeekDiscoveryAdviceResult> {
  const system = "You are Apex Atlas Right Hand for public-record discovery. Reason only over supplied evidence. Never invent people, contacts, relationships, or URLs. Return JSON only.";
  const user = `${system}\n\nIteration ${input.iteration}. Recommend the most useful next research direction from the existing discovery frontier.\nDISCOVERY CASE:\n${compactDiscovery(input.file)}\n\nReturn {\"decision\":\"...\",\"reason\":\"...\",\"focusLanes\":[\"...\"],\"confidence\":0.0}.`;
  const result = await request([{ role: "system", content: system }, { role: "user", content: user }], true);
  if (result.error) return { status: "unavailable", model: DEEPSEEK_CASE_REASONING_MODEL, decision: null, reason: null, focusLanes: [], confidence: null, error: result.error };
  const parsed = extractJson(result.raw); if (!parsed) return { status: "unavailable", model: DEEPSEEK_CASE_REASONING_MODEL, decision: null, reason: null, focusLanes: [], confidence: null, error: "DeepSeek returned invalid discovery JSON." };
  return { status: "completed", model: DEEPSEEK_CASE_REASONING_MODEL, decision: typeof parsed.decision === "string" ? parsed.decision.slice(0, 800) : null, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 1200) : null, focusLanes: Array.isArray(parsed.focusLanes) ? parsed.focusLanes.filter((v): v is string => typeof v === "string").slice(0, 8) : [], confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null, error: null };
}

export async function runDeepSeekFreeJson(userPrompt: string, systemExtra = "Reply with ONE JSON object only. Never invent contacts, people, or URLs."): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { const result = await request([{ role: "system", content: systemExtra }, { role: "user", content: userPrompt }], true); return result.raw ? { status: "completed", model: DEEPSEEK_CASE_REASONING_MODEL, raw: result.raw, error: null } : { status: "unavailable", model: DEEPSEEK_CASE_REASONING_MODEL, raw: null, error: result.error }; }
export async function runDeepSeekFinalReview(prompt: string): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { return runDeepSeekFreeJson(prompt, "You are the Apex Atlas Right Hand reviewing final public-contact evidence. Return ONE JSON object only. Never invent contacts, people, or URLs."); }
export type DeepSeekResultAction = BureauAction;
