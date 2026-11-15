/**
 * Targetability context is an evidence inventory, not a deterministic ranking
 * or eligibility policy. The Investigator interprets these observations
 * against the human objective and chooses whether/how to continue.
 *
 * Deliberately absent: wealth cutoffs, reachability scores, source-count
 * minimums, company-growth penalties, and direct/intermediary stop rules.
 */
export type ReachabilityMode = "model_assessment";
export type ReachabilityStatus = "unassessed";

export interface ReachabilityEvidenceRecord {
  collection: string;
  details: string;
  sourceUrl?: string;
  sourceType?: string;
  verified?: boolean;
}

export interface CompanyRealismAssessment {
  status: "unassessed";
  evidence: ReachabilityEvidenceRecord[];
  sourceUrls: string[];
  independentSourceCount: number;
}

export interface ReachabilityAssessment {
  status: ReachabilityStatus;
  mode: ReachabilityMode;
  evidence: string[];
  sourceUrls: string[];
  companyAssessment?: CompanyRealismAssessment;
}

export interface ReachabilityInput {
  type?: string | null;
  estimatedNetWorth?: number | null;
  email?: string | null;
  phone?: string | null;
  phoneSource?: string | null;
  contactOutcome?: string | null;
  contactConfidence?: number | null;
  linkedinUrl?: string | null;
  twitterHandle?: string | null;
  instagramHandle?: string | null;
  telegramHandle?: string | null;
  knownResidences?: string | null;
  notes?: string | null;
  metadata?: string | null;
  sourceRegistries?: string | null;
  networkDegree?: number;
  gatekeeperConnections?: number;
  intermediaryConnections?: number;
}

export interface ReachabilityDirective {
  mode: ReachabilityMode;
  status: ReachabilityStatus;
  evidence: string[];
  sourceUrls: string[];
  companyAssessment?: CompanyRealismAssessment;
}

const METADATA_EVIDENCE_COLLECTIONS = [
  "companyScaleEvidence",
  "companyCapitalEvidence",
  "companyInvestmentEvidence",
  "companyRegistryEvidence",
  "companyOwnershipEvidence",
  "companyRouteEvidence",
  "companyGrowthRanking",
  "growthRankingEvidence",
  "ownershipEvidence",
  "investmentEvidence",
  "assetEvidence",
  "transactionEvidence",
] as const;

const RECORD_FIELDS = [
  "name", "label", "title", "metric", "value", "unit", "currency",
  "activityType", "activity", "kind", "status", "type", "date", "year",
  "sourceType", "sourceUrl", "verified", "quote", "exactQuote",
  "personName", "owner", "role", "jurisdiction", "ownershipPercentage",
  "rank", "rankLabel", "program", "ranking", "description",
] as const;

function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function objectRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)));
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? [value as Record<string, unknown>]
    : [];
}

function isPublicHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function normalizedHost(value: string): string | null {
  if (!isPublicHttpsUrl(value)) return null;
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function safeFieldValue(value: unknown): string | number | boolean | null {
  if (typeof value === "string") return value.trim().slice(0, 220) || null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean") return value;
  return null;
}

function recordSummary(collection: string, record: Record<string, unknown>): ReachabilityEvidenceRecord {
  const summary: Record<string, string | number | boolean> = {};
  for (const field of RECORD_FIELDS) {
    const value = safeFieldValue(record[field]);
    if (value !== null) summary[field] = value;
  }
  const sourceUrl = isPublicHttpsUrl(record.sourceUrl) ? record.sourceUrl.trim() : undefined;
  const sourceType = typeof record.sourceType === "string" ? record.sourceType.trim().slice(0, 80) : undefined;
  const verified = typeof record.verified === "boolean" ? record.verified : undefined;
  return {
    collection,
    details: Object.keys(summary).length ? JSON.stringify(summary) : "A metadata record is present; no descriptive fields were stored.",
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(sourceType ? { sourceType } : {}),
    ...(verified !== undefined ? { verified } : {}),
  };
}

function metadataEvidence(metadata: Record<string, unknown>): ReachabilityEvidenceRecord[] {
  const records: ReachabilityEvidenceRecord[] = [];
  for (const collection of METADATA_EVIDENCE_COLLECTIONS) {
    for (const record of objectRecords(metadata[collection])) {
      records.push(recordSummary(collection, record));
    }
  }
  if (metadata.officialWebsiteVerified === true || isPublicHttpsUrl(metadata.officialWebsiteSourceUrl)) {
    records.push(recordSummary("officialWebsite", {
      type: "officialWebsite",
      verified: metadata.officialWebsiteVerified === true,
      sourceUrl: metadata.officialWebsiteSourceUrl,
    }));
  }
  return records.slice(0, 12);
}

function uniqueSourceUrls(records: ReachabilityEvidenceRecord[]): string[] {
  return [...new Set(records.map((record) => record.sourceUrl).filter((value): value is string => Boolean(value)))].slice(0, 12);
}

function sourceHostCount(urls: string[]): number {
  return new Set(urls.map(normalizedHost).filter((value): value is string => Boolean(value))).size;
}

/**
 * Returns source-linked company observations without deciding company
 * materiality, target eligibility, source sufficiency, or mission relevance.
 */
export function assessCompanyRealism(input: {
  metadata?: string | null;
  contactOutcome?: string | null;
}): CompanyRealismAssessment {
  const evidence = metadataEvidence(parseMetadata(input.metadata));
  const sourceUrls = uniqueSourceUrls(evidence);
  return {
    status: "unassessed",
    evidence,
    sourceUrls,
    independentSourceCount: sourceHostCount(sourceUrls),
  };
}

/**
 * Capture fields already stored on the target as neutral observations. Stored
 * values and labels are not independently re-verified or promoted here.
 */
export function assessTargetReachability(input: ReachabilityInput): ReachabilityAssessment {
  const metadata = parseMetadata(input.metadata);
  const companyAssessment = assessCompanyRealism({
    metadata: input.metadata,
    contactOutcome: input.contactOutcome,
  });
  const evidence = [
    input.type ? "Stored entity type: " + input.type.trim().slice(0, 80) + "." : "",
    typeof input.estimatedNetWorth === "number" && Number.isFinite(input.estimatedNetWorth)
      ? "An existing net-worth estimate is stored (" + input.estimatedNetWorth + "); its basis and accuracy have not been assessed here."
      : "",
    input.email?.trim() ? "A stored email field is present; this alone does not establish person-specific attribution." : "",
    input.phone?.trim() ? "A stored phone field is present; this alone does not establish person-specific attribution." : "",
    input.phoneSource?.trim() ? "A phone-source label is stored: " + input.phoneSource.trim().slice(0, 120) + "." : "",
    input.contactOutcome?.trim() ? "A prior contact-outcome label is stored (" + input.contactOutcome.trim().slice(0, 80) + "); treat it as contextual metadata, not a route decision." : "",
    input.linkedinUrl?.trim() ? "A LinkedIn URL field is stored." : "",
    input.twitterHandle?.trim() ? "A Twitter/X handle field is stored." : "",
    input.instagramHandle?.trim() ? "An Instagram handle field is stored." : "",
    input.telegramHandle?.trim() ? "A Telegram handle field is stored." : "",
    typeof input.networkDegree === "number" ? "Stored relationship-edge count: " + input.networkDegree + "." : "",
    typeof input.gatekeeperConnections === "number" ? "Stored gatekeeper-edge count: " + input.gatekeeperConnections + "." : "",
    typeof input.intermediaryConnections === "number" ? "Stored intermediary-edge count: " + input.intermediaryConnections + "." : "",
    input.sourceRegistries?.trim() ? "Stored registry identifiers: " + input.sourceRegistries.trim().slice(0, 220) + "." : "",
    metadata.publicProminence !== undefined
      ? "Stored public-prominence metadata: " + String(metadata.publicProminence).slice(0, 80) + "."
      : "",
  ].filter(Boolean);
  const sourceUrls = uniqueSourceUrls(companyAssessment.evidence);
  return {
    status: "unassessed",
    mode: "model_assessment",
    evidence: [...evidence, ...companyAssessment.evidence.map((record) =>
      "Stored evidence record (" + record.collection + "; verified flag=" + String(record.verified ?? "not recorded") + "): " + record.details
      + (record.sourceUrl ? " Source URL: " + record.sourceUrl : " No source URL stored."))],
    sourceUrls,
    companyAssessment,
  };
}

export function reachabilityDirective(assessment: ReachabilityAssessment): ReachabilityDirective {
  return {
    mode: assessment.mode,
    status: assessment.status,
    evidence: assessment.evidence,
    sourceUrls: assessment.sourceUrls,
    companyAssessment: assessment.companyAssessment,
  };
}

/**
 * This is context for model judgement, not a directive to stop, rank, or
 * restrict research. The model decides targetability from the case objective,
 * actual source passages, uncertainty, expected information gain and budget.
 */
export function formatReachabilityDirective(
  assessment?: ReachabilityAssessment | ReachabilityDirective | null,
): string {
  const evidence = assessment?.evidence ?? [];
  const sourceUrls = assessment?.sourceUrls ?? [];
  const evidenceLines = evidence.slice(0, 12).map((item) => "- " + item.slice(0, 300));
  const sourceLines = sourceUrls.slice(0, 8).map((url) => "- " + url);
  return [
    "TARGETABILITY CONTEXT — unassessed observations, not a classification or workflow rule:",
    ...evidenceLines,
    sourceUrls.length ? "Stored source URLs (existence is not independent corroboration):" : "",
    ...sourceLines,
    "MODEL DECISION AUTHORITY: Decide whether the target and any direct, shared, assistant, organization or intermediary route matter to the exact human objective. Choose searches, fetches, pivots, corroboration or stopping by actual source context, uncertainty, expected information gain and remaining resource budget.",
    "No fixed wealth cutoff, score, source-count minimum, growth-ranking penalty, company-size gate, or requirement for a pre-existing direct route applies. A missing contact route is an unresolved evidence gap, not proof of unreachability. A stored contact field or social handle is not a person-specific route without contextual source interpretation and exact-quote/provenance verification.",
  ].filter(Boolean).join("\n");
}
