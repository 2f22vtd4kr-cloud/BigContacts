/**
 * Suggest primary L-code from card + dig process signals (Vol 402–406 / 1203–1204).
 * Pure — no DB. Operator/debug aid, not a dig controller.
 */

export type LcodeSuggestInput = {
  hadSearchSpan?: boolean;
  hadVisitSpan?: boolean;
  evidenceContactCount?: number;
  cardPhone?: string | null;
  cardEmail?: string | null;
  phoneSource?: string | null;
  contactOutcome?: string | null;
  /** True if a better public notice/HQ was known in baseline or filing */
  betterPublicRouteKnown?: boolean;
  forceScriptDetected?: boolean;
  integrityCritical?: boolean;
  wrongPerson?: boolean;
};

export type Lcode =
  | "L-EMPTY"
  | "L-ISSUER"
  | "L-ORG-AS-DIRECT"
  | "L-COLLISION"
  | "L-NO-DIG"
  | "L-OVERWRITE"
  | "L-SCRIPT"
  | "L-INTEGRITY"
  | "none";

export function suggestLcode(input: LcodeSuggestInput): Lcode {
  if (input.integrityCritical) return "L-INTEGRITY";
  if (input.forceScriptDetected) return "L-SCRIPT";
  if (input.wrongPerson) return "L-COLLISION";

  const hadDig = Boolean(input.hadSearchSpan || input.hadVisitSpan);
  if (!hadDig) return "L-NO-DIG";

  const hasCard = Boolean(input.cardPhone?.trim() || input.cardEmail?.trim());
  const evidenceN = input.evidenceContactCount ?? 0;

  if (!hasCard && evidenceN > 0) return "L-EMPTY";
  if (!hasCard && hadDig) return "L-EMPTY";

  const src = String(input.phoneSource ?? "");
  const outcome = String(input.contactOutcome ?? "");
  const issuerLike =
    src === "EDGAR-Phone" ||
    src === "EDGAR-Issuer-Phone" ||
    src === "CompaniesHouse-Phone";
  if (issuerLike && input.betterPublicRouteKnown) return "L-ISSUER";

  if (
    (outcome === "direct_contact_candidate" || outcome === "direct_contact_verified") &&
    (src === "agentic-web-org" || src.endsWith("-org") || issuerLike)
  ) {
    return "L-ORG-AS-DIRECT";
  }

  return "none";
}
