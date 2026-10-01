/**
 * Bounded Gemini Evidence Probe.
 *
 * This is a specialist verification capability, not a replacement Investigator.
 * It uses Gemini's Google Search grounding only for a narrowly specified claim
 * or contradiction and returns citations as observed source candidates. Apex
 * still owns evidence admission and must not promote model prose by itself.
 */
import { safeOutboundFetch } from "./ssrf-safe-fetch";
import { runProviderCall } from "./provider-gate";
import { providerErrorCode, classifyProviderHttpStatus } from "./provider-error-diagnostics";
import { chooseGeminiControlModels, getGeminiThinkingLevel } from "./gemini-model-pool";
import { selectGeminiThinkingLevel } from "./gemini-thinking-policy";

const GEMINI_GENERATE_CONTENT = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiEvidenceProbeCitation = {
  url: string;
  title: string | null;
  text: string | null;
};

export type GeminiEvidenceProbeResult = {
  status: "completed" | "unavailable";
  model: string | null;
  claim: string;
  answer: string | null;
  citations: GeminiEvidenceProbeCitation[];
  searchedQueries: string[];
  error: string | null;
};

type GeminiCatalogEntry = { name?: string; supportedGenerationMethods?: string[] };

function keys(): Array<{ name: string; key: string }> {
  return ["GEMINI_API_KEY", "GEMINI_KEY", ...Array.from({ length: 13 }, (_, i) => `GEMINI_API_KEY_${i + 1}`)]
    .map((name) => ({ name, key: (process.env[name] ?? "").trim() }))
    .filter((entry) => Boolean(entry.key));
}

function normalizeModel(name: string): string {
  return name.replace(/^models\//, "");
}

async function resolveModels(apiKey: string): Promise<string[]> {
  const response = await safeOutboundFetch(`${GEMINI_GENERATE_CONTENT}`, {
    headers: { "x-goog-api-key": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Gemini evidence-probe model catalog HTTP ${response.status} ${providerErrorCode(body) ?? classifyProviderHttpStatus(response.status)}`);
  const payload = JSON.parse(body) as { models?: GeminiCatalogEntry[] };
  const catalog = (payload.models ?? [])
    .filter((entry) => entry.supportedGenerationMethods?.includes("generateContent"))
    .map((entry) => normalizeModel(entry.name ?? ""));
  return chooseGeminiControlModels("boss", catalog).slice(0, 2);
}

function extractOutput(payload: any): { answer: string; citations: GeminiEvidenceProbeCitation[]; queries: string[] } {
  const candidate = payload?.candidates?.[0];
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const answer = parts.map((part: any) => typeof part?.text === "string" ? part.text : "").filter(Boolean).join("\n").trim();
  const metadata = candidate?.groundingMetadata ?? {};
  const chunks = Array.isArray(metadata.groundingChunks) ? metadata.groundingChunks : [];
  const citations = chunks.map((chunk: any) => {
    const web = chunk?.web;
    return web && typeof web.uri === "string" ? { url: web.uri, title: typeof web.title === "string" ? web.title : null, text: typeof web.snippet === "string" ? web.snippet : null } : null;
  }).filter(Boolean) as GeminiEvidenceProbeCitation[];
  const queries = Array.isArray(metadata.webSearchQueries) ? metadata.webSearchQueries.filter((q: any): q is string => typeof q === "string") : [];
  return { answer, citations, queries };
}

export async function runGeminiEvidenceProbe(input: {
  claim: string;
  subject?: string | null;
  context?: string | null;
  signal?: AbortSignal;
}): Promise<GeminiEvidenceProbeResult> {
  const claim = input.claim.trim().slice(0, 1_200);
  if (!claim) return { status: "unavailable", model: null, claim: "", answer: null, citations: [], searchedQueries: [], error: "Empty probe claim." };
  const entries = keys();
  if (!entries.length) return { status: "unavailable", model: null, claim, answer: null, citations: [], searchedQueries: [], error: "Gemini evidence probe key unavailable." };

  for (const entry of entries) {
    if (input.signal?.aborted) throw new Error("cancelled");
    let models: string[];
    try { models = await resolveModels(entry.key); } catch (error) {
      continue;
    }
    for (const model of models) {
      if (input.signal?.aborted) throw new Error("cancelled");
      const prompt = [
        "Apex Atlas bounded evidence verification task.",
        "Verify ONE public-web claim. Do not infer identity from name similarity. Do not invent a source.",
        `SUBJECT: ${(input.subject ?? "").trim().slice(0, 300)}`,
        `CLAIM TO VERIFY: ${claim}`,
        input.context ? `CASE CONTEXT: ${input.context.trim().slice(0, 2_000)}` : "",
        "Return a concise evidence-oriented answer. Distinguish supported, contradicted, and unresolved. Prefer primary/official sources.",
      ].filter(Boolean).join("\n");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await runProviderCall(
          { provider: "gemini", account: entry.key, signal: input.signal },
          () => safeOutboundFetch(`${GEMINI_GENERATE_CONTENT}/${encodeURIComponent(model)}:generateContent`, {
            method: "POST",
            headers: { "x-goog-api-key": entry.key, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              tools: [{ google_search: {} }],
              generationConfig: { maxOutputTokens: 900, thinkingConfig: { thinkingLevel: getGeminiThinkingLevel(model) } },
            }),
            signal: controller.signal,
          }),
        );
        const body = await response.text();
        if (!response.ok) continue;
        const payload = JSON.parse(body);
        const output = extractOutput(payload);
        return { status: "completed", model, claim, answer: output.answer || null, citations: output.citations, searchedQueries: output.queries, error: null };
      } catch (error) {
        if (input.signal?.aborted) throw new Error("cancelled");
      } finally { clearTimeout(timer); }
    }
  }
  return { status: "unavailable", model: null, claim, answer: null, citations: [], searchedQueries: [], error: "Gemini evidence probe exhausted bounded model/key attempts." };
}


export type GeminiVerificationEpisodeResult = {
  status: "completed" | "unavailable";
  model: string | null;
  claims: Array<{ claim: string; status: "supported" | "contradicted" | "unresolved"; rationale: string }>;
  citations: GeminiEvidenceProbeCitation[];
  searchedQueries: string[];
  inspectedUrls: string[];
  answer: string | null;
  error: string | null;
};

/**
 * Multi-tool specialist verification. Search discovers missing corroboration;
 * URL Context inspects investigator-selected URLs. The returned prose is advisory
 * and is never itself admitted as evidence by Apex.
 */
export async function runGeminiEvidenceVerificationEpisode(input: {
  claims: string[];
  urls?: string[];
  subject?: string | null;
  context?: string | null;
  signal?: AbortSignal;
}): Promise<GeminiVerificationEpisodeResult> {
  const claims = input.claims.map((claim) => claim.trim().slice(0, 900)).filter(Boolean).slice(0, 8);
  const urls = [...new Set((input.urls ?? []).map((url) => url.trim()).filter((url) => /^https?:\\/\\//i.test(url)))].slice(0, 20);
  if (!claims.length) return { status: "unavailable", model: null, claims: [], citations: [], searchedQueries: [], inspectedUrls: urls, answer: null, error: "Empty verification episode." };
  const entries = keys();
  for (const entry of entries) {
    let models: string[] = [];
    try { models = await resolveModels(entry.key); } catch { continue; }
    for (const model of models) {
      if (input.signal?.aborted) throw new Error("cancelled");
      const prompt = [
        "Apex Atlas verification episode. Verify the listed claims against public sources.",
        "Use Google Search for missing corroboration and URL Context for the supplied URLs.",
        "Do not infer identity from name similarity. For each claim classify only supported, contradicted, or unresolved.",
        "Return JSON with claims:[{claim,status,rationale}], plus a concise answer. Cite the exact source URLs used.",
        "SUBJECT: " + (input.subject ?? "").trim().slice(0, 300),
        "CLAIMS: " + JSON.stringify(claims),
        "SUPPLIED URLS: " + JSON.stringify(urls),
        input.context ? "CASE CONTEXT: " + input.context.trim().slice(0, 3000) : "",
      ].filter(Boolean).join("\\n");
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 45_000);
      try {
        const response = await runProviderCall(
          { provider: "gemini", account: entry.key, signal: input.signal },
          () => safeOutboundFetch(GEMINI_GENERATE_CONTENT + "/" + encodeURIComponent(model) + ":generateContent", {
            method: "POST",
            headers: { "x-goog-api-key": entry.key, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              tools: [{ google_search: {} }, { url_context: {} }],
              generationConfig: {
                maxOutputTokens: 1400,
                thinkingConfig: { thinkingLevel: selectGeminiThinkingLevel(model, { falsificationRequired: true, identityAmbiguity: /identity|attribution|collision/i.test(prompt) }) },
              },
            }),
            signal: controller.signal,
          }),
        );
        const body = await response.text(); if (!response.ok) continue;
        const payload = JSON.parse(body); const output = extractOutput(payload);
        const raw = output.answer;
        let parsed: any = null;
        try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
        const episodeClaims = Array.isArray(parsed?.claims)
          ? parsed.claims.filter((item: any) => item && typeof item.claim === "string" && ["supported", "contradicted", "unresolved"].includes(item.status)).map((item: any) => ({ claim: item.claim, status: item.status, rationale: typeof item.rationale === "string" ? item.rationale : "" }))
          : claims.map((claim) => ({ claim, status: "unresolved" as const, rationale: raw ?? "Gemini returned no machine-readable claim classification." }));
        return { status: "completed", model, claims: episodeClaims, citations: output.citations, searchedQueries: output.queries, inspectedUrls: urls, answer: raw || null, error: null };
      } catch (error) {
        if (input.signal?.aborted) throw new Error("cancelled");
      } finally { clearTimeout(timer); }
    }
  }
  return { status: "unavailable", model: null, claims: claims.map((claim) => ({ claim, status: "unresolved" as const, rationale: "Verification provider unavailable." })), citations: [], searchedQueries: [], inspectedUrls: urls, answer: null, error: "Gemini verification episode exhausted bounded attempts." };
}
