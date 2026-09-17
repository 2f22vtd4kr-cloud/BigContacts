import type { BureauAction, DiscoveryCaseFile, ResearchCaseFile } from "./case-bureau";
import { installGeminiTransientRetry } from "./gemini-transient-retry";

installGeminiTransientRetry();

export const GEMINI_RIGHT_HAND_MODEL = "gemini-3.8-flash";
const GEMINI_CHAT_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_RIGHT_HAND_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 45_000;

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string | null }> } }> };
export type GeminiRightHandStatus = { configured: boolean; model: string; endpoint: string; role: "right_hand_advisor"; capability: "case_file_reasoning_only" };
export type GeminiRightHandCaseReasoningResult = { status: "completed" | "unavailable"; model: string; actionId: string | null; decision: string | null; reason: string | null; confidence: number | null; error: string | null };
export type GeminiRightHandDiscoveryAdviceResult = { status: "completed" | "unavailable"; model: string; decision: string | null; reason: string | null; focusLanes: string[]; confidence: number | null; error: string | null };

function key(): string | null { return process.env.GEMINI_API_KEY?.trim() || null; }
function textOf(response: GeminiResponse | null): string { return (response?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join(" ").trim(); }
function extractJson(raw: string): Record<string, unknown> | null { const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim(); const source = fenced || raw.trim(); const start = source.indexOf("{"), end = source.lastIndexOf("}"); if (start < 0 || end <= start) return null; try { const value = JSON.parse(source.slice(start, end + 1)); return value && typeof value === "object" ? value as Record<string, unknown> : null; } catch { return null; } }

async function request(system: string, user: string): Promise<{ raw: string; error: string | null }> {
  const apiKey = key();
  if (!apiKey) return { raw: "", error: "GEMINI_API_KEY is not configured." };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(GEMINI_CHAT_API, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "high" } },
      }),
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) return { raw: "", error: `Gemini API ${GEMINI_RIGHT_HAND_MODEL} HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}` };
    try {
      const raw = textOf(JSON.parse(body) as GeminiResponse);
      return raw ? { raw, error: null } : { raw: "", error: "Gemini Right-hand returned an empty response." };
    } catch {
      return { raw: "", error: "Gemini Right-hand returned invalid JSON." };
    }
  } catch (error) {
    return { raw: "", error: error instanceof Error && error.name === "AbortError" ? `Gemini Right-hand request timed out after ${REQUEST_TIMEOUT_MS}ms.` : error instanceof Error ? error.message : "Gemini Right-hand request failed." };
  } finally { clearTimeout(timer); }
}

function compactCase(file: ResearchCaseFile): string { return JSON.stringify({ target: file.target, hypotheses: file.hypotheses?.slice(-12), evidenceSummary: file.evidenceSummary, specialistRoster: file.specialistRoster, actionQueue: file.actionQueue, contactRoutes: file.contactRoutes?.slice(-16), investigationProgress: file.investigationProgress, researchDepth: file.researchDepth, decisionLog: file.decisionLog?.slice(-8), rightHandAdvice: file.rightHandAdvice, bossPlan: file.bossPlan }, null, 2); }
function compactDiscovery(file: DiscoveryCaseFile): string { return JSON.stringify({ humanBrief: file.humanBrief, bossPremise: file.bossPremise, candidateLanes: file.candidateLanes, initialResearch: file.initialResearch, investigatorReports: file.investigatorReports?.slice(-10), currentProgress: file.currentProgress, discoveredCandidates: file.discoveredCandidates?.slice(-20), orgFootprint: file.orgFootprint, decisionLog: file.decisionLog?.slice(-8) }, null, 2); }

export function getGeminiRightHandStatus(): GeminiRightHandStatus { return { configured: Boolean(key()), model: GEMINI_RIGHT_HAND_MODEL, endpoint: GEMINI_CHAT_API, role: "right_hand_advisor", capability: "case_file_reasoning_only" }; }

export async function runGeminiRightHandCaseReasoning(input: { file: ResearchCaseFile; iteration: number }): Promise<GeminiRightHandCaseReasoningResult> {
  const queued = input.file.actionQueue.filter((action) => action.status === "queued").slice(0, 16);
  const system = "You are Apex Atlas Right Hand. Reason only over the supplied case file. Never browse, use external research, or invent evidence, contacts, people, URLs, or facts. Recommend exactly one existing queued action. Return JSON only.";
  const user = `Iteration ${input.iteration}. Identify what is newly unresolved, which contact vectors are still pending, and the highest-leverage complementary queued action.\nCASE:\n${compactCase(input.file)}\n\nQUEUED ACTIONS:\n${JSON.stringify(queued, null, 2)}\n\nReturn {\"actionId\":\"exact queued action id\",\"decision\":\"short recommendation\",\"reason\":\"concrete case-file evidence-gap reason\",\"confidence\":0.0}.`;
  const result = await request(system, user);
  if (result.error) return { status: "unavailable", model: GEMINI_RIGHT_HAND_MODEL, actionId: null, decision: null, reason: null, confidence: null, error: result.error };
  const parsed = extractJson(result.raw);
  const actionId = typeof parsed?.actionId === "string" ? parsed.actionId.trim() : "";
  const action = queued.find((candidate) => candidate.id === actionId);
  const decision = typeof parsed?.decision === "string" ? parsed.decision.trim() : "";
  const reason = typeof parsed?.reason === "string" ? parsed.reason.trim() : "";
  const confidence = typeof parsed?.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : null;
  if (!action || !decision || !reason) return { status: "unavailable", model: GEMINI_RIGHT_HAND_MODEL, actionId: null, decision: null, reason: null, confidence, error: "Gemini Right-hand returned an invalid or non-queued recommendation." };
  return { status: "completed", model: GEMINI_RIGHT_HAND_MODEL, actionId: action.id, decision: decision.slice(0, 500), reason: reason.slice(0, 1000), confidence, error: null };
}

export async function runGeminiRightHandDiscoveryAdvice(input: { file: DiscoveryCaseFile; iteration: number }): Promise<GeminiRightHandDiscoveryAdviceResult> {
  const system = "You are Apex Atlas Right Hand for public-record discovery. Reason only over supplied case evidence. Never browse, use external research, or invent people, contacts, relationships, or URLs. Return JSON only.";
  const user = `Iteration ${input.iteration}. Recommend the most useful next research direction from the existing discovery frontier.\nDISCOVERY CASE:\n${compactDiscovery(input.file)}\n\nReturn {\"decision\":\"...\",\"reason\":\"...\",\"focusLanes\":[\"...\"],\"confidence\":0.0}.`;
  const result = await request(system, user);
  if (result.error) return { status: "unavailable", model: GEMINI_RIGHT_HAND_MODEL, decision: null, reason: null, focusLanes: [], confidence: null, error: result.error };
  const parsed = extractJson(result.raw);
  if (!parsed) return { status: "unavailable", model: GEMINI_RIGHT_HAND_MODEL, decision: null, reason: null, focusLanes: [], confidence: null, error: "Gemini Right-hand returned invalid discovery JSON." };
  return { status: "completed", model: GEMINI_RIGHT_HAND_MODEL, decision: typeof parsed.decision === "string" ? parsed.decision.slice(0, 800) : null, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 1200) : null, focusLanes: Array.isArray(parsed.focusLanes) ? parsed.focusLanes.filter((v): v is string => typeof v === "string").slice(0, 8) : [], confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null, error: null };
}

export async function runGeminiRightHandFreeJson(userPrompt: string, systemExtra = "Reply with ONE JSON object only. Never invent contacts, people, or URLs."): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> {
  const result = await request("You are the Apex Atlas Right Hand. Advise the Boss only. Never browse or act as Investigator. Never invent evidence, contacts, people, relationships, or URLs. " + systemExtra, userPrompt);
  return result.raw ? { status: "completed", model: GEMINI_RIGHT_HAND_MODEL, raw: result.raw, error: null } : { status: "unavailable", model: GEMINI_RIGHT_HAND_MODEL, raw: null, error: result.error };
}
export async function runGeminiRightHandFinalReview(prompt: string): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { return runGeminiRightHandFreeJson(prompt, "You are the Apex Atlas Right Hand reviewing final public-contact evidence. Return ONE JSON object only. Never invent contacts, people, or URLs."); }
export type GeminiRightHandResultAction = BureauAction;
