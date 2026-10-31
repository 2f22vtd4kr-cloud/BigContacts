/**
 * Structural validation for model-selected candidate names.
 *
 * This helper deliberately does not decide whether a candidate is a person,
 * company, trust, asset owner or HNWI. Those are source- and model-led questions.
 * It rejects only malformed/placeholder values that cannot usefully be sent to
 * a model. It imposes no script, capitalization, length or word-count policy.
 */

const PLACEHOLDER_NAMES = new Set([
  "unknown",
  "unknown person",
  "unknown entity",
  "none",
  "null",
  "undefined",
  "anonymous",
  "redacted",
  "withheld",
  "confidential",
  "not available",
  "not provided",
  "no name",
  "unidentified",
  "not known",
  "not disclosed",
]);

/**
 * Return whether a value is structurally usable as a candidate name.
 *
 * Any Unicode letter is accepted, including one-character and single-token
 * names. Long or multi-part names are not truncated or rejected here; prompt
 * budgeting belongs to the execution/context layer and must preserve identity.
 */
export function isStructurallyValidCandidateName(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const normalizedUnicode = value.normalize("NFKC");
  if (/[\p{Cc}]/u.test(normalizedUnicode)) return false;

  const normalized = normalizedUnicode.trim().replace(/\s+/gu, " ");
  if (!normalized || !/[\p{L}]/u.test(normalized)) return false;

  const placeholderKey = normalized
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");

  return !PLACEHOLDER_NAMES.has(placeholderKey);
}
