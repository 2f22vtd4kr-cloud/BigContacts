/**
 * Shared phone source priority for promote + enricher overwrite guards.
 * Pure — safe for unit tests without DB.
 */

export function isAgenticPhoneSource(source: string | null | undefined): boolean {
  return typeof source === "string" && /^agentic-web/i.test(source);
}

/** Issuer switchboards + parallel pipeline sources that must not beat dig/notice. */
export function isIssuerSwitchboardSource(source: string | null | undefined): boolean {
  const s = String(source ?? "");
  return (
    s === "EDGAR-Phone" ||
    s === "EDGAR-Issuer-Phone" ||
    s === "CompaniesHouse-Phone" ||
    s === "web-osint" ||
    s === "deep-web-osint" ||
    s === "ai-web-osint" ||
    s === "in-house" ||
    s === "contact-cache" ||
    s === "final-review"
  );
}

export function isNoticePhoneSource(source: string | null | undefined): boolean {
  const s = String(source ?? "");
  return s === "EDGAR-Notice-Phone" || s === "EDGAR-Notice";
}

/** Dig / notice phones must survive pipeline and final-review writes. */
export function isProtectedPhoneSource(source: string | null | undefined): boolean {
  return isAgenticPhoneSource(source) || isNoticePhoneSource(source);
}

/**
 * True when incoming source must not replace the current card phone.
 * Protected (agentic dig / notice-line) always wins over pipeline/issuer.
 */
export function shouldBlockIssuerOverwrite(
  currentSource: string | null | undefined,
  incomingSource: string | null | undefined,
): boolean {
  if (!incomingSource) return false;
  if (!isProtectedPhoneSource(currentSource)) return false;
  // Protected current: block anything that is not also protected
  return !isProtectedPhoneSource(incomingSource);
}

/**
 * Final-review / pipeline card resolution: never drop protected dig phones.
 */
export function resolveProtectedCardPhone(input: {
  currentPhone?: string | null;
  currentSource?: string | null;
  incomingPhone?: string | null;
  incomingSource?: string | null;
}): { phone: string | null; phoneSource: string | null } {
  const cur = input.currentPhone?.trim() || null;
  const curSrc = input.currentSource ?? null;
  const inc = input.incomingPhone?.trim() || null;
  const incSrc = input.incomingSource ?? null;

  if (isProtectedPhoneSource(curSrc) && cur) {
    return { phone: cur, phoneSource: curSrc };
  }
  if (inc && !shouldBlockIssuerOverwrite(curSrc, incSrc)) {
    return { phone: inc, phoneSource: incSrc ?? curSrc };
  }
  if (cur) return { phone: cur, phoneSource: curSrc };
  return { phone: inc, phoneSource: incSrc };
}
