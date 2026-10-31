export type DiscoverySourceAttribution = {
  sourceName: string;
  sourceNameKind: "publisher_name" | "domain_fallback";
  sourceDomain: string;
  sourceClass: string;
  sourceContributor: string | null;
  sourceMechanism: string;
  originalObservedAt: string | null;
  independentCorroborationStatus: "not_assessed";
};

/**
 * Keep publisher/source identity separate from the transport that fetched it.
 * When a publisher name or class is not supplied by the adapter, preserve an
 * explicit unclassified/domain-fallback state rather than inventing authority.
 */
export function buildDiscoverySourceAttribution(input: {
  sourceUrl: string;
  action: string;
  observedAt?: Date | string | null;
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
  const suppliedName = typeof input.sourceName === "string" ? input.sourceName.trim() : "";
  const suppliedDomain = typeof input.sourceDomain === "string" ? input.sourceDomain.trim().toLowerCase() : "";
  const sourceDomain = suppliedDomain || urlDomain || "unknown";
  const sourceClass = typeof input.sourceClass === "string" && input.sourceClass.trim()
    ? input.sourceClass.trim()
    : /registry/i.test(input.action) ? "registry_adapter_unclassified" : "public_web_unclassified";
  const sourceContributor = typeof input.sourceContributor === "string" && input.sourceContributor.trim()
    ? input.sourceContributor.trim()
    : null;
  let originalObservedAt: string | null = null;
  if (input.observedAt instanceof Date && Number.isFinite(input.observedAt.getTime())) {
    originalObservedAt = input.observedAt.toISOString();
  } else if (typeof input.observedAt === "string" && input.observedAt.trim()) {
    const parsed = new Date(input.observedAt);
    if (Number.isFinite(parsed.getTime())) originalObservedAt = parsed.toISOString();
  }
  return {
    sourceName: suppliedName || sourceDomain,
    sourceNameKind: suppliedName ? "publisher_name" : "domain_fallback",
    sourceDomain,
    sourceClass,
    sourceContributor,
    sourceMechanism: input.action || "unknown",
    originalObservedAt,
    independentCorroborationStatus: "not_assessed",
  };
}
