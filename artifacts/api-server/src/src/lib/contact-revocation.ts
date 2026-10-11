const REVOCABLE_CONTACT_FIELDS = ["email", "phone", "linkedinUrl", "twitterHandle", "instagramHandle", "telegramHandle", "personalWebsite"] as const;
export type RevocableContactField = typeof REVOCABLE_CONTACT_FIELDS[number];
export type ContactRevocationValidation =
  | { ok: true; provenance: Record<string, unknown> | null }
  | { ok: false; reason: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** Validate optimistic value binding plus the immutable promotion provenance for protected person cards. */
export function validateValueBoundContactRevocation(input: {
  field: string;
  currentValue: unknown;
  expectedValue: unknown;
  provenance: unknown;
  requireCanonicalProvenance: boolean;
}): ContactRevocationValidation {
  if (!(REVOCABLE_CONTACT_FIELDS as readonly string[]).includes(input.field)) {
    return { ok: false, reason: "This field is not a supported contact value." };
  }
  if (typeof input.currentValue !== "string" || !input.currentValue.trim()) {
    return { ok: false, reason: "The contact field is already empty." };
  }
  if (typeof input.expectedValue !== "string" || input.expectedValue !== input.currentValue) {
    return { ok: false, reason: "The displayed value is stale or no longer matches the current field." };
  }

  const provenance = asRecord(input.provenance);
  if (!provenance) {
    return input.requireCanonicalProvenance
      ? { ok: false, reason: "Protected person contacts require active immutable promotion provenance." }
      : { ok: true, provenance: null };
  }
  if (typeof provenance.value !== "string" || provenance.value !== input.currentValue) {
    return { ok: false, reason: "The contact provenance does not match the current field value." };
  }
  if (typeof provenance.personName !== "string" || !provenance.personName.trim()
    || typeof provenance.jobId !== "string" || !provenance.jobId.trim()
    || provenance.claimEventId === null || provenance.claimEventId === undefined
    || typeof provenance.recordedAt !== "string" || !Number.isFinite(Date.parse(provenance.recordedAt))) {
    return { ok: false, reason: "The contact promotion provenance is incomplete." };
  }
  const sourceUrls = Array.isArray(provenance.sourceUrls) ? provenance.sourceUrls : [];
  const observationEventIds = Array.isArray(provenance.observationEventIds) ? provenance.observationEventIds : [];
  if (!sourceUrls.length || sourceUrls.some((value) => {
    if (typeof value !== "string") return true;
    try { return new URL(value).protocol !== "https:"; } catch { return true; }
  }) || !observationEventIds.length || observationEventIds.some((value) => value === null || value === undefined || String(value).trim() === "")) {
    return { ok: false, reason: "The contact provenance has no complete observed-source binding." };
  }
  return { ok: true, provenance };
}
