/**
 * Pure bounded projection for durable discovery working context.
 *
 * The immutable research_case_events payload is the authoritative record. The
 * caseFile projection must never turn an authoritative URL into another URL:
 * retain it whole when it fits, otherwise omit it whole and expose the count.
 */
export const MAX_DURABLE_DISCOVERY_URL_CHARS = 500;
export const MAX_DURABLE_DISCOVERY_URLS = 24;

type UrlProjection = {
  urls: string[];
  totalCount: number;
  omittedCount: number;
};

export function projectWholeDiscoveryUrls(value: unknown): UrlProjection {
  const unique = [...new Set(
    (Array.isArray(value) ? value : [])
      .filter((item): item is string => typeof item === "string" && item.length > 0),
  )];
  const eligible = unique.filter((url) => url.length <= MAX_DURABLE_DISCOVERY_URL_CHARS);
  const urls = eligible.slice(0, MAX_DURABLE_DISCOVERY_URLS);
  return {
    urls,
    totalCount: unique.length,
    omittedCount: unique.length - urls.length,
  };
}

/**
 * Keep the working projection bounded without ever slicing an authoritative URL.
 * Over-budget URL fields are omitted whole; omission counts make the loss visible
 * to the continuation model while exact source values remain in the event ledger.
 */
export function compactDurableDiscoveryRecords(records: readonly unknown[]): Record<string, unknown>[] {
  return records.slice(Math.max(0, records.length - 64)).map((value) => {
    const record = value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
    const rawArgs = record.args && typeof record.args === "object" && !Array.isArray(record.args)
      ? record.args as Record<string, unknown>
      : {};
    const projectedArgs: Record<string, unknown> = {};
    let urlArgsOmittedFromProjectionCount = 0;
    const argEntries = Object.entries(rawArgs).sort(([left], [right]) =>
      Number(/url/i.test(right)) - Number(/url/i.test(left)));
    for (const [key, item] of argEntries) {
      const urlField = /url/i.test(key);
      if (urlField && typeof item === "string" && item.length > MAX_DURABLE_DISCOVERY_URL_CHARS) {
        urlArgsOmittedFromProjectionCount++;
        continue;
      }
      if (Object.keys(projectedArgs).length >= 24) continue;
      projectedArgs[key] = typeof item === "string" ? item.slice(0, 800) : item;
    }

    const observed = projectWholeDiscoveryUrls(record.observedUrls);
    const leads = projectWholeDiscoveryUrls(record.leadUrls);
    const rawFindings = Array.isArray(record.findings) ? record.findings.slice(0, 24) : [];
    const findings = rawFindings.map((rawFinding) => {
      const finding = rawFinding && typeof rawFinding === "object" && !Array.isArray(rawFinding)
        ? rawFinding as Record<string, unknown>
        : {};
      const sourceUrls = projectWholeDiscoveryUrls(finding.sourceUrls);
      return {
        ...finding,
        value: typeof finding.value === "string" ? finding.value.slice(0, 500) : finding.value,
        personName: typeof finding.personName === "string" ? finding.personName.slice(0, 160) : null,
        role: typeof finding.role === "string" ? finding.role.slice(0, 160) : null,
        sourceUrls: sourceUrls.urls,
        sourceUrlsTotalCount: sourceUrls.totalCount,
        sourceUrlsOmittedFromProjectionCount: sourceUrls.omittedCount,
        note: typeof finding.note === "string" ? finding.note.slice(0, 500) : finding.note,
        promotionReason: typeof finding.promotionReason === "string" ? finding.promotionReason.slice(0, 500) : finding.promotionReason,
      };
    });

    return {
      ...record,
      args: projectedArgs,
      urlArgsOmittedFromProjectionCount,
      thought: typeof record.thought === "string" ? record.thought.slice(0, 600) : record.thought,
      observation: typeof record.observation === "string" ? record.observation.slice(0, 2_000) : record.observation,
      observedUrls: observed.urls,
      observedUrlCount: observed.totalCount,
      observedUrlsOmittedFromProjectionCount: observed.omittedCount,
      leadUrls: leads.urls,
      leadUrlCount: leads.totalCount,
      leadUrlsOmittedFromProjectionCount: leads.omittedCount,
      findings,
    };
  });
}
