export type DiscoverySourceAttribution = {
  sourceName: string;
  sourceNameKind: "publisher_name" | "domain_fallback";
  sourceDomain: string;
  sourceClass: string;
  sourceContributor: string | null;
  sourceMechanism: string;
  originalObservedAt: string | null;
  retrievedAt: string | null;
  independentCorroborationStatus: "not_assessed";
};

export const COMMUNITY_SOURCE_OBSERVATION_NOTE =
  "COMMUNITY SOURCE LEAD: user-submitted observation; source class is community_user_submitted_unverified, not an authority rating. Preserve the source page, any displayed contributor and original observation date, and the retrieval timestamp. The Investigator may interpret the public text as a lead, but material claims require independent corroboration. Do not copy images or retain precise residential coordinates.";

/** Compatibility alias; community classification no longer withholds fetched text. */
export const RESTRICTED_COMMUNITY_SOURCE_MANUAL_REVIEW_NOTE = COMMUNITY_SOURCE_OBSERVATION_NOTE;

/** Community observation pages are source classes for provenance, not automatic exclusions. */
export function isCommunityObservationSourceUrl(sourceUrl: string): boolean {
  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
    return hostname === "virtualglobetrotting.com"
      || hostname.endsWith(".virtualglobetrotting.com");
  } catch {
    return false;
  }
}

/** @deprecated Use isCommunityObservationSourceUrl; the page is not restricted from model interpretation. */
export const isRestrictedCommunitySourceUrl = isCommunityObservationSourceUrl;

/** Remove precise coordinate pairs from community text while retaining descriptive context. */
export function sanitizeCommunityObservationText(text: string): string {
  return text.replace(/-?\d{1,3}\.\d{4,}\s*[,;]\s*-?\d{1,3}\.\d{4,}/g, "[precise coordinates withheld]");
}

/** Extract only explicit page attribution/date labels; absence remains unknown. */
export function extractCommunityObservationMetadata(text: string): { sourceContributor: string | null; originalObservedAt: string | null } {
  const contributorMatch = text.match(/(?:submitted|uploaded|contributed|posted|added)\s+by\s+([^\n|;,]{2,100})/i);
  const datePattern = "(\\d{4}-\\d{2}-\\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{1,2},?\\s+\\d{4})";
  const sourceContributor = contributorMatch?.[1]?.trim().replace(new RegExp("\\s+(?:on|at)\\s+" + datePattern + "\\.?$", "i"), "").replace(/\\s{2,}/g, " ").slice(0, 100) || null;
  const dateMatch = text.match(new RegExp("(?:submitted|uploaded|contributed|posted|added|observed|updated)\\s+(?:by\\s+[^.\\n|;,]{2,100}?\\s+)?(?:on\\s+)?" + datePattern, "i"));
  const parsed = dateMatch?.[1] ? new Date(dateMatch[1]) : null;
  const originalObservedAt = parsed && Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
  return { sourceContributor, originalObservedAt };
}

/**
 * Keep publisher/source identity separate from the transport that fetched it.
 * When a publisher name or class is not supplied by the adapter, preserve an
 * explicit unclassified/domain-fallback state rather than inventing authority.
 */
export function buildDiscoverySourceAttribution(input: {
  sourceUrl: string;
  action: string;
  observedAt?: Date | string | null;
  retrievedAt?: Date | string | null;
  sourceName?: string | null;
  sourceDomain?: string | null;
  sourceClass?: string | null;
  sourceContributor?: string | null;
}): DiscoverySourceAttribution {
  let urlDomain = "";
  try {
    const url = new URL(input.sourceUrl);
    if (url.protocol === "https:" || url.protocol === "http:") urlDomain = url.hostname.toLowerCase();
  } catch {
    // A malformed source URL remains visibly unclassified; it is not repaired here.
  }
  const communityObservationSource = isCommunityObservationSourceUrl(input.sourceUrl);
  const suppliedName = typeof input.sourceName === "string" ? input.sourceName.trim() : "";
  const suppliedDomain = typeof input.sourceDomain === "string" ? input.sourceDomain.trim().toLowerCase() : "";
  const sourceDomain = suppliedDomain || urlDomain || "unknown";
  const sourceClass = communityObservationSource
    ? "community_user_submitted_unverified"
    : typeof input.sourceClass === "string" && input.sourceClass.trim()
      ? input.sourceClass.trim()
      : /registry/i.test(input.action) ? "registry_adapter_unclassified" : "public_web_unclassified";
  const sourceContributor = typeof input.sourceContributor === "string" && input.sourceContributor.trim()
    ? input.sourceContributor.trim()
    : null;
  const parseTimestamp = (value: Date | string | null | undefined): string | null => {
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
    if (typeof value === "string" && value.trim()) {
      const parsed = new Date(value);
      if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
    }
    return null;
  };
  const originalObservedAt = parseTimestamp(input.observedAt);
  const retrievedAt = parseTimestamp(input.retrievedAt);
  return {
    sourceName: communityObservationSource ? "Virtual Globetrotting" : suppliedName || sourceDomain,
    sourceNameKind: communityObservationSource || suppliedName ? "publisher_name" : "domain_fallback",
    sourceDomain,
    sourceClass,
    sourceContributor,
    sourceMechanism: input.action || "unknown",
    originalObservedAt,
    retrievedAt,
    independentCorroborationStatus: "not_assessed",
  };
}
