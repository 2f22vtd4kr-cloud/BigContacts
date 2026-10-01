/**
 * Optional Gemini Deep Research escalation boundary.
 *
 * The capability is deliberately disabled by default because Google's Deep
 * Research agent is a paid/background service. Apex's free-tier baseline never
 * invokes it. When an operator explicitly enables the adapter, the result is
 * still treated as external research material requiring normal evidence
 * adjudication.
 */
import { safeOutboundFetch } from "./ssrf-safe-fetch";
import { runProviderCall } from "./provider-gate";

const INTERACTIONS = "https://generativelanguage.googleapis.com/v1beta/interactions";
const AGENT = "deep-research-preview-04-2026";

export type DeepResearchEscalationResult = {
  status: "started" | "completed" | "unavailable";
  interactionId: string | null;
  report: string | null;
  error: string | null;
};

function enabled(): boolean {
  return String(process.env.APEX_ENABLE_GEMINI_DEEP_RESEARCH ?? "").toLowerCase() === "true";
}

function key(): string {
  return (process.env.GEMINI_API_KEY ?? "").trim();
}

function outputText(payload: any): string | null {
  if (typeof payload?.output_text === "string") return payload.output_text.trim() || null;
  const outputs = Array.isArray(payload?.output) ? payload.output : [];
  const texts = outputs.flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .map((item: any) => typeof item?.text === "string" ? item.text : "")
    .filter(Boolean);
  return texts.join("\n").trim() || null;
}

export async function runGeminiDeepResearchEscalation(input: {
  objective: string;
  context: string;
  signal?: AbortSignal;
}): Promise<DeepResearchEscalationResult> {
  if (!enabled()) return { status: "unavailable", interactionId: null, report: null, error: "Deep Research escalation is disabled; free-tier baseline remains unchanged." };
  const apiKey = key();
  if (!apiKey) return { status: "unavailable", interactionId: null, report: null, error: "Gemini API key unavailable." };

  const prompt = [
    "Apex Atlas escalation research. This is a specialist research pass, not an evidence admission.",
    "Investigate the following unresolved high-value question using public sources.",
    `OBJECTIVE: ${input.objective.trim().slice(0, 2_000)}`,
    `CURRENT CASE CONTEXT: ${input.context.trim().slice(0, 8_000)}`,
    "Return a cited report. Do not claim a fact without a source.",
  ].join("\n\n");

  try {
    const response = await runProviderCall(
      { provider: "gemini", account: apiKey, signal: input.signal },
      () => safeOutboundFetch(INTERACTIONS, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          agent: AGENT,
          input: prompt,
          background: true,
          store: true,
          agent_config: { type: "deep-research", thinking_summaries: "none", visualization: "off" },
        }),
        signal: input.signal ?? AbortSignal.timeout(20_000),
      }),
    );
    const body = await response.text();
    if (!response.ok) return { status: "unavailable", interactionId: null, report: null, error: `Deep Research start HTTP ${response.status}.` };
    const payload = JSON.parse(body) as any;
    const interactionId = typeof payload.id === "string" ? payload.id : null;
    if (!interactionId) return { status: "unavailable", interactionId: null, report: null, error: "Deep Research did not return an interaction id." };
    const report = outputText(payload);\n    return { status: report ? "completed" : "started", interactionId, report, error: null };
  } catch (error) {
    if (input.signal?.aborted) throw new Error("cancelled");
    return { status: "unavailable", interactionId: null, report: null, error: error instanceof Error ? error.message : "Deep Research escalation failed." };
  }
}

export async function pollGeminiDeepResearchEscalation(input: {
  interactionId: string;
  signal?: AbortSignal;
}): Promise<DeepResearchEscalationResult> {
  if (!enabled()) return { status: "unavailable", interactionId: input.interactionId, report: null, error: "Deep Research escalation is disabled." };
  const apiKey = key();
  if (!apiKey) return { status: "unavailable", interactionId: input.interactionId, report: null, error: "Gemini API key unavailable." };
  try {
    const response = await runProviderCall(
      { provider: "gemini", account: apiKey, signal: input.signal },
      () => safeOutboundFetch(`${INTERACTIONS}/${encodeURIComponent(input.interactionId)}`, {
        headers: { "x-goog-api-key": apiKey, Accept: "application/json" },
        signal: input.signal ?? AbortSignal.timeout(20_000),
      }),
    );
    const body = await response.text();
    if (!response.ok) return { status: "unavailable", interactionId: input.interactionId, report: null, error: `Deep Research poll HTTP ${response.status}.` };
    const payload = JSON.parse(body) as any;
    const report = outputText(payload);
    const state = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
    if (report && state !== "failed") return { status: "completed", interactionId: input.interactionId, report, error: null };
    if (state === "failed" || state === "cancelled") return { status: "unavailable", interactionId: input.interactionId, report: null, error: `Deep Research interaction state: ${state}.` };
    return { status: "started", interactionId: input.interactionId, report: null, error: null };
  } catch (error) {
    if (input.signal?.aborted) throw new Error("cancelled");
    return { status: "unavailable", interactionId: input.interactionId, report: null, error: error instanceof Error ? error.message : "Deep Research poll failed." };
  }
}
