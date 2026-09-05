/**
 * Safe JSON reads for Apex Atlas UI → api-server.
 * Static hosts often return SPA HTML for /api/*; never JSON.parse that blindly.
 */

export async function readApiJson(res: Response): Promise<any> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(res.ok ? "Empty response from API" : `API ${res.status}: empty body`);
  }
  if (
    trimmed.startsWith("<!") ||
    trimmed.startsWith("<html") ||
    trimmed.startsWith("<HTML")
  ) {
    throw new Error(
      "Research API is not reachable (got an HTML page instead of JSON). Deploy api-server and proxy /api.",
    );
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error(
      `API returned non-JSON (${res.status}). ${trimmed.slice(0, 80).replace(/\s+/g, " ")}…`,
    );
  }
}

export async function apiFetchJson(
  input: string,
  init?: RequestInit,
): Promise<{ res: Response; data: any }> {
  const res = await fetch(input, init);
  const data = await readApiJson(res);
  return { res, data };
}
