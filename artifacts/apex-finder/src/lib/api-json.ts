import { classifyApexError, emitApexError } from "@/lib/apex-errors";

/** Safe JSON reads for Apex Atlas UI → api-server. */
export async function readApiJson(res: Response): Promise<any> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    const error = res.ok ? "Empty response from API" : `API ${res.status}: empty body`;
    if (!res.ok) emitApexError(classifyApexError(error, res.status));
    throw new Error(error);
  }
  if (trimmed.startsWith("<!") || trimmed.startsWith("<html") || trimmed.startsWith("<HTML")) {
    const error = "Research API is not reachable (got an HTML page instead of JSON). Deploy api-server and proxy /api.";
    emitApexError(classifyApexError(error, res.status));
    throw new Error(error);
  }
  try {
    const data = JSON.parse(trimmed);
    if (!res.ok) {
      const message = data?.userError?.message ?? data?.message ?? data?.error ?? `API request failed (HTTP ${res.status})`;
      emitApexError(data?.userError ?? classifyApexError(message, res.status));
    }
    return data;
  } catch {
    const error = `API returned non-JSON (${res.status}). ${trimmed.slice(0, 80).replace(/\s+/g, " ")}…`;
    if (!res.ok) emitApexError(classifyApexError(error, res.status));
    throw new Error(error);
  }
}

export async function apiFetchJson(input: string, init?: RequestInit): Promise<{ res: Response; data: any }> {
  const res = await fetch(input, init);
  const data = await readApiJson(res);
  return { res, data };
}
