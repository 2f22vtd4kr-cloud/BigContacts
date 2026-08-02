export type SafeUseStatus = "manual_review" | "approved_for_manual_outreach" | "blocked";

export interface SafeUseDecision {
  status: SafeUseStatus;
  notice: string;
}

/**
 * Research can prepare evidence and a draft, but it must never imply that a
 * person has been contacted or that a draft is authorized to send.
 */
export function getSafeUseDecision(status: string | null | undefined): SafeUseDecision {
  if (status === "approved_for_manual_outreach") {
    return {
      status,
      notice: "Approved for manual outreach only. Verify the cited public evidence and recipient context before sending.",
    };
  }
  if (status === "blocked") {
    return {
      status,
      notice: "Outreach is blocked. Keep this session for research review only.",
    };
  }
  return {
    status: "manual_review",
    notice: "Research output is a draft from public evidence. Manual review is required; Apex Atlas does not send messages.",
  };
}

export function canApproveForManualOutreach(input: {
  reviewerNote?: string | null;
  identityScore?: number | null;
  accessScore?: number | null;
}): boolean {
  return Boolean(
    input.reviewerNote?.trim() &&
    (input.identityScore ?? 0) >= 0.65 &&
    (input.accessScore ?? 0) >= 0.35,
  );
}