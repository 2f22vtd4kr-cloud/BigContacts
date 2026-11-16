/**
 * Parse a JSON object from either a serialized text value or a driver-decoded
 * JSON/JSONB object. Invalid primitives and arrays are rejected rather than
 * being silently treated as metadata.
 */
export function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || value === "") return {};
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
