import type { BureauAction, DiscoveryCaseFile, ResearchCaseFile } from "./case-bureau";
import { apexOrientationCompact } from "./apex-bureau-orientation";
import { installGeminiTransientRetry } from "./gemini-transient-retry";
import { logger } from "./logger";

installGeminiTransientRetry();

/**
 * Right-hand model selection is capability-driven. We deliberately do not encode
 * a chronological Gemini fallback ladder here: Google's live model catalog is
 * the source of truth for what this credential can currently use.
 */
export const GEMINI_RIGHT_HAND_MODEL = "auto";
export const GEMINI_RIGHT_HAND_FALLBACK_MODELS: readonly string[] = [];
const GEMINI_CHAT_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const DEFAULT_OVERALL_TIMEOUT_MS = 45_000;
const MIN_REQUEST_TIMEOUT_MS = 10_000;
const MAX_REQUEST_TIMEOUT_MS = 60_000;
const MIN_OVERALL_TIMEOUT_MS = 20_000;
const MAX_OVERALL_TIMEOUT_MS = 120_000;
const MAX_MODEL_ATTEMPTS = 4;
const MODEL_CATALOG_TIMEOUT_MS = 6_000;
const MODEL_CATALOG_CACHE_MS = 60_000;

type GeminiCatalogEntry = { name?: string; supportedGenerationMethods?: string[] };
let cachedModelChain: { expiresAt: number; models: string[] } | null = null;

function boundedTimeoutEnv(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function requestTimeoutMs(): number {
  return boundedTimeoutEnv("APEX_GEMINI_RIGHT_HAND_REQUEST_TIMEOUT_MS", DEFAULT_REQUEST_TIMEOUT_MS, MIN_REQUEST_TIMEOUT_MS, MAX_REQUEST_TIMEOUT_MS);
}

function overallTimeoutMs(): number {
  const requestMs = requestTimeoutMs();
  return boundedTimeoutEnv("APEX_GEMINI_RIGHT_HAND_OVERALL_TIMEOUT_MS", DEFAULT_OVERALL_TIMEOUT_MS, Math.max(MIN_OVERALL_TIMEOUT_MS, requestMs), MAX_OVERALL_TIMEOUT_MS);
}

export function getGeminiRightHandLatencyConfig(): { requestTimeoutMs: number; overallTimeoutMs: number } {
  return { requestTimeoutMs: requestTimeoutMs(), overallTimeoutMs: overallTimeoutMs() };
}

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string | null }> } }> };
type GeminiRequestResult = { raw: string; error: string | null; model: string };
export type GeminiRightHandStatus = { configured: boolean; model: string; fallbackModels: string[]; endpoint: string; role: "right_hand_advisor"; capability: "case_file_reasoning_only" };
export type GeminiRightHandCaseReasoningResult = { status: "completed" | "unavailable"; model: string; actionId: string | null; decision: string | null; reason: string | null; confidence: number | null; error: string | null };
export type GeminiRightHandDiscoveryAdviceResult = { status: "completed" | "unavailable"; model: string; decision: string | null; reason: string | null; focusLanes: string[]; confidence: number | null; error: string | null };
const RIGHT_HAND_KEY_ENV = "GEMINI_RIGHT_HAND_API_KEY";
function key(): string | null { return process.env[RIGHT_HAND_KEY_ENV]?.trim() || null; }

function modelVersion(name: string): [number, number] {
  const match = name.match(/gemini-(\d+)(?:\.(\d+))?/i);
  return [Number(match?.[1] ?? 0), Number(match?.[2] ?? 0)];
}

function modelRank(name: string): [number, number, number, number, string] {
  const normalized = name.toLowerCase();
  const [major, minor] = modelVersion(normalized);
  const family = normalized.includes("flash") && !normalized.includes("flash-lite") ? 0 : normalized.includes("flash-lite") ? 1 : 2;
  const lifecycle = normalized.includes("preview") || normalized.includes("experimental") ? 1 : 0;
  const specialized = /image|audio|embedding|tts|live|transcribe|deep-research|robotics|aqa/i.test(normalized) ? 1 : 0;
  return [family, specialized, lifecycle, major * 100 + minor, normalized];
}

function chooseRightHandModels(entries: GeminiCatalogEntry[]): string[] {
  return [...new Set(entries
    .filter((entry) => entry.name && entry.supportedGenerationMethods?.includes("generateContent"))
    .map((entry) => entry.name!.replace(/^models\//, ""))
    .filter((name) => /^gemini-/i.test(name))
    .filter((name) => /flash/i.test(name))
    .filter((name) => /^gemini-\d+(?:\.\d+)?-flash(?:-lite)?(?:-[a-z0-9.]+)?$/i.test(name))
    .filter((name) => !/image|audio|embedding|tts|live|transcribe|deep-research|robotics|aqa/i.test(name))
    .sort((a, b) => {
      const left = modelRank(a); const right = modelRank(b);
      return left[0] - right[0] || left[1] - right[1] || left[2] - right[2] || right[3] - left[3] || left[4].localeCompare(right[4]);
    }))].slice(0, MAX_MODEL_ATTEMPTS);
}

async function resolveModelChain(): Promise<string[]> {
  const apiKey = key();
  if (!apiKey) return [];
  const configured = process.env.GEMINI_RIGHT_HAND_MODEL_CHAIN?.split(",").map((value) => value.trim()).filter(Boolean) ?? [];
  if (cachedModelChain && cachedModelChain.expiresAt > Date.now()) {
    return Array.from(new Set([...configured, ...cachedModelChain.models])).slice(0, MAX_MODEL_ATTEMPTS);
  }
  try {
    const response = await fetch(`${GEMINI_CHAT_API_BASE}?key=${encodeURIComponent(apiKey)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(MODEL_CATALOG_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn({ role: "gemini_right_hand", phase: "model_catalog_failed", httpStatus: response.status }, "Gemini Right-hand model catalog unavailable");
      return configured.slice(0, MAX_MODEL_ATTEMPTS);
    }
    const payload = await response.json() as { models?: GeminiCatalogEntry[] };
    const catalogModels = chooseRightHandModels(Array.isArray(payload.models) ? payload.models : []);
    const models = Array.from(new Set([...configured, ...catalogModels])).slice(0, MAX_MODEL_ATTEMPTS);
    if (models.length) cachedModelChain = { expiresAt: Date.now() + MODEL_CATALOG_CACHE_MS, models: catalogModels };
    logger.info({ role: "gemini_right_hand", phase: "model_catalog_resolved", candidateCount: catalogModels.length, models }, "Gemini Right-hand model catalog resolved");
    return models;
  } catch (error) {
    logger.warn({ role: "gemini_right_hand", phase: "model_catalog_rejected", errorName: error instanceof Error ? error.name : "unknown" }, "Gemini Right-hand model catalog request failed");
    return configured.slice(0, MAX_MODEL_ATTEMPTS);
  }
}

function textOf(response: GeminiResponse | null): string { return (response?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join(" ").trim(); }
function extractJson(raw: string): Record<string, unknown> | null { const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim(); const source = fenced || raw.trim(); const start = source.indexOf("{"), end = source.lastIndexOf("}"); if (start < 0 || end <= start) return null; try { const value = JSON.parse(source.slice(start, end + 1)); return value && typeof value === "object" ? value as Record<string, unknown> : null; } catch { return null; } }
function shouldFallback(status: number): boolean { return status === 404 || status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504; }
function isGemini3Model(model: string): boolean { return /^gemini-3(?:\.\d+)?-/i.test(model); }

async function request(system: string, user: string): Promise<GeminiRequestResult> {
  const apiKey = key();
  if (!apiKey) return { raw: "", error: "GEMINI_RIGHT_HAND_API_KEY is not configured.", model: GEMINI_RIGHT_HAND_MODEL };
  let chain = await resolveModelChain();
  const failures: string[] = [];
  const configuredRequestTimeoutMs = requestTimeoutMs();
  const configuredOverallTimeoutMs = overallTimeoutMs();
  const deadline = Date.now() + configuredOverallTimeoutMs;
  const systemPrompt = `${apexOrientationCompact("right_hand")}\n\n${system}`;
  const requestPayload = (modelName: string, userPrompt: string) => ({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: userPrompt }] }], generationConfig: { maxOutputTokens: 768, responseMimeType: "application/json", ...(isGemini3Model(modelName) ? { thinkingConfig: { thinkingLevel: "low" } } : {}) } });
  for (const model of chain) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return { raw: "", error: `Gemini Right-hand deadline exceeded after ${configuredOverallTimeoutMs}ms.`, model: chain[chain.length - 1] ?? GEMINI_RIGHT_HAND_MODEL };
    const body = JSON.stringify(requestPayload(model, user)); const requestPayloadBytes = Buffer.byteLength(body); const systemPromptBytes = Buffer.byteLength(systemPrompt); const userPromptBytes = Buffer.byteLength(user); const attemptStartedAt = Date.now(); const attemptTimeoutMs = Math.min(configuredRequestTimeoutMs, remainingMs); let requestDeadlineFired = false; let overallDeadlineFired = false; const controller = new AbortController(); const timer = setTimeout(() => { if (remainingMs <= configuredRequestTimeoutMs) overallDeadlineFired = true; else requestDeadlineFired = true; controller.abort(); }, attemptTimeoutMs);
    try {
      const response = await fetch(`${GEMINI_CHAT_API_BASE}/${model}:generateContent`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "x-goog-api-key": apiKey }, body, signal: controller.signal });
      const fetchElapsedMs = Date.now() - attemptStartedAt; const responseBody = await response.text(); const totalElapsedMs = Date.now() - attemptStartedAt;
      logger.info({ role: "gemini_right_hand", phase: "request_resolved", model, requestPayloadBytes, systemPromptBytes, userPromptBytes, configuredRequestTimeoutMs, configuredOverallTimeoutMs, attemptTimeoutMs, remainingMs, fetchElapsedMs, totalElapsedMs, httpStatus: response.status, responseBytes: Buffer.byteLength(responseBody), requestDeadlineFired, overallDeadlineFired }, "Gemini Right-hand request resolved");
      if (response.ok) { try { const raw = textOf(JSON.parse(responseBody) as GeminiResponse); if (raw) return { raw, error: null, model }; return { raw: "", error: `Gemini Right-hand ${model} returned an empty response.`, model }; } catch { return { raw: "", error: `Gemini Right-hand ${model} returned invalid JSON.`, model }; }
      }
      const detail = responseBody ? `: ${responseBody.slice(0, 300)}` : ""; failures.push(`${model} HTTP ${response.status}`); if (!shouldFallback(response.status)) return { raw: "", error: `Gemini API ${model} HTTP ${response.status}${detail}`, model };
      if (response.status === 404) cachedModelChain = null;
    } catch (error) {
      const fetchElapsedMs = Date.now() - attemptStartedAt; const isAbort = error instanceof Error && error.name === "AbortError"; const message = isAbort ? `request timed out after ${attemptTimeoutMs}ms` : error instanceof Error ? error.message : "request failed"; logger.warn({ role: "gemini_right_hand", phase: "request_rejected", model, requestPayloadBytes, systemPromptBytes, userPromptBytes, configuredRequestTimeoutMs, configuredOverallTimeoutMs, attemptTimeoutMs, remainingMs, fetchElapsedMs, httpStatus: null, responseBytes: 0, requestDeadlineFired, overallDeadlineFired, abortReason: requestDeadlineFired ? "per_request_deadline" : overallDeadlineFired ? "overall_deadline" : null, errorName: error instanceof Error ? error.name : "unknown" }, "Gemini Right-hand request rejected"); failures.push(`${model} ${message}`); if (!isAbort) return { raw: "", error: `Gemini Right-hand ${model} ${message}.`, model }; }
    finally { clearTimeout(timer); }
  }
  // If a catalog cache contained models that have all become unavailable, perform
  // one fresh catalog resolution inside the same role boundary before failing closed.
  if (chain.length && cachedModelChain) {
    cachedModelChain = null;
    chain = await resolveModelChain();
    for (const model of chain) {
      if (failures.some((failure) => failure.startsWith(`${model} `))) continue;
      if (Date.now() >= deadline) break;
      const retry = await requestWithResolvedModel(model, systemPrompt, user, deadline, configuredRequestTimeoutMs);
      if (retry.raw || retry.error?.startsWith("Gemini Right-hand deadline")) return retry;
      failures.push(`${model} ${retry.error ?? "retry failed"}`);
    }
  }
  return { raw: "", error: `Gemini Right-hand exhausted bounded same-role model attempts: ${failures.join("; ")}`, model: chain[chain.length - 1] ?? GEMINI_RIGHT_HAND_MODEL };
}

async function requestWithResolvedModel(model: string, systemPrompt: string, user: string, deadline: number, configuredRequestTimeoutMs: number): Promise<GeminiRequestResult> {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) return { raw: "", error: "Gemini Right-hand deadline exceeded after bounded model refresh.", model };
  const body = JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { maxOutputTokens: 768, responseMimeType: "application/json", ...(isGemini3Model(model) ? { thinkingConfig: { thinkingLevel: "low" } } : {}) } });
  const controller = new AbortController(); const timeoutMs = Math.min(configuredRequestTimeoutMs, remainingMs); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const apiKey = key(); if (!apiKey) return { raw: "", error: "GEMINI_RIGHT_HAND_API_KEY is not configured.", model };
    const response = await fetch(`${GEMINI_CHAT_API_BASE}/${model}:generateContent`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "x-goog-api-key": apiKey }, body, signal: controller.signal });
    const responseBody = await response.text();
    if (!response.ok) return { raw: "", error: `Gemini Right-hand ${model} HTTP ${response.status}${responseBody ? `: ${responseBody.slice(0, 300)}` : ""}`, model };
    try { const raw = textOf(JSON.parse(responseBody) as GeminiResponse); return raw ? { raw, error: null, model } : { raw: "", error: `Gemini Right-hand ${model} returned an empty response.`, model }; } catch { return { raw: "", error: `Gemini Right-hand ${model} returned invalid JSON.`, model }; }
  } catch (error) { return { raw: "", error: error instanceof Error ? `Gemini Right-hand ${model} ${error.message}.` : `Gemini Right-hand ${model} request failed.`, model }; }
  finally { clearTimeout(timer); }
}

function compactCase(file: ResearchCaseFile): string { return JSON.stringify({ target: file.target, hypotheses: file.hypotheses, evidenceSummary: file.evidenceSummary, specialistRoster: file.specialistRoster, actionQueue: file.actionQueue, contactRoutes: file.contactRoutes, investigationProgress: file.investigationProgress, researchDepth: file.researchDepth, decisionLog: file.decisionLog, rightHandAdvice: file.rightHandAdvice, bossPlan: file.bossPlan }, null, 2); }
function compactDiscovery(file: DiscoveryCaseFile): string { return JSON.stringify({ humanBrief: file.humanBrief, bossPremise: file.bossPremise, candidateLanes: file.candidateLanes, initialResearch: file.initialResearch, investigatorReports: file.investigatorReports, currentProgress: file.currentProgress, discoveredCandidates: file.discoveredCandidates, orgFootprint: file.orgFootprint, decisionLog: file.decisionLog }, null, 2); }
export function getGeminiRightHandStatus(): GeminiRightHandStatus { return { configured: Boolean(key()), model: GEMINI_RIGHT_HAND_MODEL, fallbackModels: [...GEMINI_RIGHT_HAND_FALLBACK_MODELS], endpoint: `${GEMINI_CHAT_API_BASE}/<resolved>:generateContent`, role: "right_hand_advisor", capability: "case_file_reasoning_only" }; }
export async function runGeminiRightHandCaseReasoning(input: { file: ResearchCaseFile; iteration: number }): Promise<GeminiRightHandCaseReasoningResult> { const queued = input.file.actionQueue.filter((action) => action.status === "queued"); const system = "You are Apex Atlas Right Hand. Reason only over the supplied case file. Never browse, use external research, or invent evidence, contacts, people, URLs, or facts. Recommend exactly one existing queued action. Return JSON only."; const user = `Iteration ${input.iteration}. Identify what is newly unresolved, which contact vectors are still pending, and the highest-leverage complementary queued action.\nCASE:\n${compactCase(input.file)}\n\nQUEUED ACTIONS:\n${JSON.stringify(queued, null, 2)}\n\nReturn {\"actionId\":\"exact queued action id\",\"decision\":\"short recommendation\",\"reason\":\"concrete case-file evidence-gap reason\",\"confidence\":0.0}.`; const result = await request(system, user); if (result.error) return { status: "unavailable", model: result.model, actionId: null, decision: null, reason: null, confidence: null, error: result.error }; const parsed = extractJson(result.raw); const actionId = typeof parsed?.actionId === "string" ? parsed.actionId.trim() : ""; const action = queued.find((candidate) => candidate.id === actionId); const decision = typeof parsed?.decision === "string" ? parsed.decision.trim() : ""; const reason = typeof parsed?.reason === "string" ? parsed.reason.trim() : ""; const confidence = typeof parsed?.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : null; if (!action || !decision || !reason) return { status: "unavailable", model: result.model, actionId: null, decision: null, reason: null, confidence, error: `Gemini Right-hand ${result.model} returned an invalid or non-queued recommendation.` }; return { status: "completed", model: result.model, actionId: action.id, decision, reason, confidence, error: null }; }
export async function runGeminiRightHandDiscoveryAdvice(input: { file: DiscoveryCaseFile; iteration: number }): Promise<GeminiRightHandDiscoveryAdviceResult> { const system = "You are Apex Atlas Right Hand for public-record discovery. Reason only over supplied discovery case evidence. Never browse, use external research, or invent people, contacts, relationships, or URLs. Return JSON only."; const user = `Iteration ${input.iteration}. Recommend the most useful next research direction from the existing discovery frontier.\nDISCOVERY CASE:\n${compactDiscovery(input.file)}\n\nReturn {\"decision\":\"...\",\"reason\":\"...\",\"focusLanes\":[\"...\"],\"confidence\":0.0}.`; const result = await request(system, user); if (result.error) return { status: "unavailable", model: result.model, decision: null, reason: null, focusLanes: [], confidence: null, error: result.error }; const parsed = extractJson(result.raw); if (!parsed) return { status: "unavailable", model: result.model, decision: null, reason: null, focusLanes: [], confidence: null, error: `Gemini Right-hand ${result.model} returned invalid discovery JSON.` }; return { status: "completed", model: result.model, decision: typeof parsed.decision === "string" ? parsed.decision : null, reason: typeof parsed.reason === "string" ? parsed.reason : null, focusLanes: Array.isArray(parsed.focusLanes) ? parsed.focusLanes.filter((v): v is string => typeof v === "string") : [], confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null, error: null }; }
export async function runGeminiRightHandFreeJson(userPrompt: string, systemExtra = "Reply with ONE JSON object only. Never invent contacts, people, or URLs."): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { const result = await request("You are the Apex Atlas Right Hand. Advise the Boss only. Never browse or act as Investigator. Never invent evidence, contacts, people, relationships, or URLs. " + systemExtra, userPrompt); return result.raw ? { status: "completed", model: result.model, raw: result.raw, error: null } : { status: "unavailable", model: result.model, raw: null, error: result.error }; }
export async function runGeminiRightHandFinalReview(prompt: string): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { return runGeminiRightHandFreeJson(prompt, "You are the Apex Atlas Right Hand reviewing final public-contact evidence. Return ONE JSON object only. Never invent contacts, people, or URLs."); }
export type GeminiRightHandResultAction = BureauAction;
