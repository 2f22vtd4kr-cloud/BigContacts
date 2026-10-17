export type InvestigatorEpisodeFailureCode =
  | "investigator_episode_error"
  | "investigator_episode_unavailable_without_provider_record"
  | "investigator_episode_no_action";

export type InvestigatorEpisodeHealthInput = {
  status: string;
  iterations: number;
  stopReason?: string | null;
  trajectoryRecords?: readonly { action?: string | null; execution?: string | null; observation?: string | null; stopReason?: string | null; failureDomain?: string | null; failureKind?: string | null }[];
};

/**
 * True only when this episode contains a non-terminal research capability
 * that was actually attempted. A done/parse/provider record, or a proposal
 * that was merely selected/blocked, is not research execution.
 */
export function hasExecutedInvestigatorResearchAction(
  records: readonly { action?: string | null; execution?: string | null }[],
): boolean {
  return records.some((record) => {
    const action = record.action ?? "";
    if (!action || ["done", "parse_failure", "investigator_provider_error"].includes(action)) return false;
    if (record.execution === "selected" || record.execution === "blocked") return false;
    return typeof record.execution === "string" && record.execution.length > 0;
  });
}

/**
 * A failed or empty continuation must not be mistaken for a completed research
 * episode. A structurally recorded terminal action-parse failure is different
 * from an orchestration exception: send it to the model-owned Boss control turn,
 * which may continue within the existing budget or stop. Unstructured errors fail closed.
 */
export function classifyInvestigatorEpisodeFailure(
  input: InvestigatorEpisodeHealthInput,
): { code: InvestigatorEpisodeFailureCode } | null {
  // Inputs are episode-local results from runBureauAgenticWebPass, not the
  // case's cumulative history. Every supplied record belongs to this episode.
  const episodeRecords = input.trajectoryRecords ?? [];
  if (input.status === "error") {
    const hasDurableTerminalParseFailure = input.stopReason === "PARSE_FAILURE" && episodeRecords.some((record) =>
      record.action === "parse_failure" &&
      record.execution === "error" &&
      record.stopReason === "PARSE_FAILURE" &&
      record.failureDomain === "model_action" &&
      record.failureKind === "invalid_contract",
    );
    if (hasDurableTerminalParseFailure) return null;
    return { code: "investigator_episode_error" };
  }
  if (input.status === "unavailable") {
    if (input.stopReason === "LLM_UNAVAILABLE" && episodeRecords.some((record) => record.action === "investigator_provider_error")) {
      return null;
    }
    return { code: "investigator_episode_unavailable_without_provider_record" };
  }
  const deliberatePivotGuardRecovery = input.stopReason === "ITERATION_BUDGET"
    && episodeRecords.length > 0
    && episodeRecords.every((record) =>
      record.execution === "blocked"
      && String(record.observation ?? "").includes("pivot_alignment_guard"),
    );
  if (input.status !== "cancelled" && !hasExecutedInvestigatorResearchAction(episodeRecords) && !deliberatePivotGuardRecovery) {
    return { code: "investigator_episode_no_action" };
  }
  return null;
}

export type AtlasDiscoveryHealthRecord = {
  action?: string | null;
  execution?: string | null;
  observation?: string | null;
  observedUrls?: readonly string[];
  leadUrls?: readonly string[];
  failureDomain?: string | null;
  failureKind?: string | null;
};

/**
 * A bounded, source-provenance-aware health summary for run reports.
 * Search leads are counted separately from successful fetches and admitted people.
 */
export function summarizeAtlasDiscoveryResearchHealth(
  records: readonly AtlasDiscoveryHealthRecord[],
  admittedCandidates: number,
): {
  trajectoryRecords: number;
  blockedActions: number;
  scopeGuardBlocks: number;
  unsupportedRegistryActions: number;
  actionContractFailures: number;
  providerRateLimitEvents: number;
  successfulFetchedPages: number;
  unfetchedSearchLeadUrls: number;
  admittedCandidates: number;
} {
  const isSearch = (action: string) =>
    ["web_search", "parallel_web_search", "registry_search", "parallel_registry_search"].includes(action);
  const normalizeUrl = (value: string): string | null => {
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      url.hash = "";
      url.hostname = url.hostname.toLowerCase();
      return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href;
    } catch {
      return null;
    }
  };
  const fetchedUrlKeys = new Set(records
    .filter((record) => record.execution === "success"
      && ["visit", "browser_fetch"].includes(String(record.action ?? ""))
      && Boolean(String(record.observation ?? "").trim()))
    .flatMap((record) => (record.observedUrls ?? []).map(normalizeUrl).filter((url): url is string => Boolean(url))));
  const unfetchedLeadUrlKeys = new Set(records
    .filter((record) => record.execution === "success" && isSearch(String(record.action ?? "")))
    .flatMap((record) => (record.leadUrls ?? []).map(normalizeUrl).filter((url): url is string => Boolean(url)))
    .filter((url) => !fetchedUrlKeys.has(url)));
  const isPageFetch = (record: AtlasDiscoveryHealthRecord) =>
    record.execution === "success"
    && ["visit", "browser_fetch"].includes(String(record.action ?? ""))
    && Array.isArray(record.observedUrls)
    && record.observedUrls.some((url) => typeof url === "string" && /^https?:\/\//i.test(url))
    && Boolean(String(record.observation ?? "").trim());
  return {
    trajectoryRecords: records.length,
    blockedActions: records.filter((record) => record.execution === "blocked").length,
    scopeGuardBlocks: records.filter((record) =>
      record.execution === "blocked" && /\b(?:repeat_)?pivot_alignment_guard\b/i.test(String(record.observation ?? ""))).length,
    unsupportedRegistryActions: records.filter((record) =>
      record.execution === "blocked" && ["registry_search", "parallel_registry_search"].includes(String(record.action ?? ""))
      && /unsupported registry|unknown registry/i.test(String(record.observation ?? ""))).length,
    actionContractFailures: records.filter((record) =>
      record.action === "parse_failure" || (record.failureDomain === "model_action" && record.failureKind === "invalid_contract")).length,
    providerRateLimitEvents: records.filter((record) =>
      record.failureKind === "provider_rate_limited"
      || /\b(?:HTTP[_ ]429|rate_limit_exceeded|upstream_rate_limited|too many requests)\b/i.test(String(record.observation ?? ""))).length,
    successfulFetchedPages: records.filter(isPageFetch).length,
    unfetchedSearchLeadUrls: unfetchedLeadUrlKeys.size,
    admittedCandidates: Math.max(0, Number.isFinite(admittedCandidates) ? Math.floor(admittedCandidates) : 0),
  };
}
