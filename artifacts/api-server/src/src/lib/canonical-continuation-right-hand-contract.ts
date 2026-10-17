export const CONTINUATION_RIGHT_HAND_RESPONSE_FORMAT = {
  type: "text",
  mime_type: "application/json",
  schema: {
    type: "object",
    properties: {
      decision: { type: "string", enum: ["continue", "redirect", "stop"] },
      reason: { type: "string", minLength: 1, maxLength: 1200 },
      focusLanes: {
        type: "array",
        maxItems: 8,
        items: { type: "string", minLength: 1, maxLength: 160 },
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
    required: ["decision", "reason", "focusLanes", "confidence"],
    additionalProperties: false,
  },
} as const;

export type ContinuationRightHandAdvice = {
  decision: "continue" | "redirect" | "stop";
  reason: string;
  focusLanes: string[];
  confidence: number;
};

export function validateContinuationRightHand(
  value: unknown,
): value is ContinuationRightHandAdvice {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const allowed = new Set(["decision", "reason", "focusLanes", "confidence"]);
  if (Object.keys(candidate).some((key) => !allowed.has(key))) return false;
  if (!["decision", "reason", "focusLanes", "confidence"].every((key) =>
    Object.prototype.hasOwnProperty.call(candidate, key))) return false;

  return (candidate.decision === "continue"
      || candidate.decision === "redirect"
      || candidate.decision === "stop")
    && typeof candidate.reason === "string"
    && candidate.reason.trim().length > 0
    && candidate.reason.length <= 1200
    && Array.isArray(candidate.focusLanes)
    && candidate.focusLanes.length <= 8
    && candidate.focusLanes.every((lane) =>
      typeof lane === "string" && lane.trim().length > 0 && lane.length <= 160)
    && typeof candidate.confidence === "number"
    && Number.isFinite(candidate.confidence)
    && candidate.confidence >= 0
    && candidate.confidence <= 1;
}

export function validateContinuationRightHandRaw(raw: string): boolean {
  try {
    return validateContinuationRightHand(JSON.parse(raw) as unknown);
  } catch {
    return false;
  }
}
