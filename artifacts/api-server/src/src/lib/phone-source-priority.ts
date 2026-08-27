/**
 * Shared phone source priority for promote + enricher overwrite guards.
 * Pure — safe for unit tests without DB.
 */

export function isAgenticPhoneSource(source: string | null | undefined): boolean {
  return typeof source === "string" && /^agentic-web/i.test(source);
}

export function isIssuerSwitchboardSource(source: string | null | undefined): boolean {
  const s = String(source ?? "");
  return (
    s === "EDGAR-Phone" ||
    s === "EDGAR-Issuer-Phone" ||
    s === "CompaniesHouse-Phone"
  );
}

export function isNoticePhoneSource(source: string | null | undefined): boolean {
  const s = String(source ?? "");
  return s === "EDGAR-Notice-Phone" || s === "EDGAR-Notice";
}

/**
 * True when an incoming issuer switchboard must not replace the current card phone.
 */
export function shouldBlockIssuerOverwrite(currentSource: string | null | undefined, incomingSource: string | null | undefined): boolean {
  if (!isIssuerSwitchboardSource(incomingSource)) return false;
  return isAgenticPhoneSource(currentSource) || isNoticePhoneSource(currentSource);
}
