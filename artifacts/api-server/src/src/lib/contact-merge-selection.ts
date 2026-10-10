import { sanitizePublicEmail, sanitizePublicPhone } from "./contact-validation";

export type MergeContactCandidate = {
  email?: string | null;
  emailSource?: string | null;
  metadata?: string | null;
  phone?: string | null;
  phoneSource?: string | null;
};

export type SelectedMergeContactEvidence = {
  email: string | null;
  /** Metadata from the same entity row that supplied the selected email. */
  emailMetadata: string | null;
  /** Source label from the same entity row that supplied the selected email. */
  emailSource: string | null;
  phone: string | null;
  /** Source label from the same entity row that supplied the selected phone. */
  phoneSource: string | null;
};

/**
 * Select contact values and preserve row-level attribution for each selected
 * value. A metadata union across two entity rows is not safe evidence for the
 * selected email, and a phone source from an unselected phone is not its source.
 */
export function selectMergedContactEvidence(
  primary: MergeContactCandidate,
  target: MergeContactCandidate,
): SelectedMergeContactEvidence {
  const primaryEmail = sanitizePublicEmail(primary.email);
  const targetEmail = sanitizePublicEmail(target.email);
  const emailOwner = primaryEmail ? primary : targetEmail ? target : null;
  const email = primaryEmail ?? targetEmail ?? null;

  const primaryPhone = sanitizePublicPhone(primary.phone);
  const targetPhone = sanitizePublicPhone(target.phone);
  const phoneOwner = primaryPhone ? primary : targetPhone ? target : null;
  const phone = primaryPhone ?? targetPhone ?? null;

  return {
    email,
    emailMetadata: emailOwner?.metadata ?? null,
    emailSource: emailOwner?.emailSource ?? null,
    phone,
    phoneSource: phoneOwner?.phoneSource ?? null,
  };
}
