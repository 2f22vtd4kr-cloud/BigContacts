import { hasMeaningfulDirectContact } from "./contact-confidence";

export type ReachabilityMode = "full" | "targeted" | "research_only";
export type ReachabilityStatus = "direct" | "intermediary" | "bounded" | "research_only";

export interface CompanyRealismAssessment {
  status: "materiality_evidenced" | "single_source_scale" | "growth_signal_lead" | "registry_only" | "unverified";
  score: number;
  hasGrowthRankingSignal: boolean;
  hasSourceBackedScale: boolean;
  hasActiveCompanyRegistry: boolean;
  hasOwnershipControlEvidence: boolean;
  hasOfficialWebsite: boolean;
  hasOfficialBusinessRoute: boolean;
  independentSourceCount: number;
  reasons: string[];
  blockers: string[];
}

export interface ReachabilityAssessment {
  status: ReachabilityStatus;
  mode: ReachabilityMode;
  score: number;
  hasDirectContact: boolean;
  hasIntermediaryPath: boolean;
  ultraWealthSignal: boolean;
  publicProminenceSignal: boolean;
  reasons: string[];
  blockers: string[];
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
  score: number;
  reasons: string[];
  blockers: string[];
}

function parseMetadata(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value?.trim() && value.trim() !== "[]" && value.trim() !== "null");
}

function objectRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)));
  return value && typeof value === "object" ? [value as Record<string, unknown>] : [];
}

function isHttpsSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isCompanyTargetType(type?: string | null): boolean {
  return /^(corporation|corp|company|trust|organization|org|professional firm)$/i.test((type ?? "").trim());
}

function verifiedCompanyEvidence(value: unknown, allowedSourceTypes: string[]): Record<string, unknown>[] {
  return objectRecords(value).filter((record) =>
    record.verified === true
    && isHttpsSourceUrl(record.sourceUrl)
    && allowedSourceTypes.includes(String(record.sourceType ?? "").toLowerCase()),
  );
}

export function assessCompanyRealism(input: {
  metadata?: string | null;
  contactOutcome?: string | null;
}): CompanyRealismAssessment {
  const metadata = parseMetadata(input.metadata);
  const rankingRecords = objectRecords(metadata.companyGrowthRanking ?? metadata.growthRankingEvidence).filter((record) => {
    const rankingName = String(record.name ?? record.ranking ?? record.program ?? "").toLowerCase();
    const year = Number(record.year);
    return record.verified === true
      && isHttpsSourceUrl(record.sourceUrl)
      && /(inc\.?\s*5000|fast[-\s]?growth|unicorn)/i.test(rankingName)
      && Number.isInteger(year)
      && year >= 2000
      && year <= new Date().getUTCFullYear() + 1;
  });
  const scaleRecords = verifiedCompanyEvidence(metadata.companyScaleEvidence, [
    "official_filing", "official_company", "audited_report", "official_registry", "reputable_media",
  ]).filter((record) => {
    const metric = String(record.metric ?? "").toLowerCase();
    const value = Number(record.value);
    return ["revenue", "employees", "employee_count", "assets", "valuation"].includes(metric)
      && Number.isFinite(value)
      && value > 0;
  });
  const registryRecords = verifiedCompanyEvidence(metadata.companyRegistryEvidence, ["official_registry"])
    .filter((record) => String(record.status ?? "").toLowerCase() === "active");
  const ownershipRecords = verifiedCompanyEvidence(metadata.companyOwnershipEvidence, ["official_registry", "official_filing"]);
  const routeRecords = verifiedCompanyEvidence(metadata.companyRouteEvidence, ["official_company", "official_registry"])
    .filter((record) => ["official_website", "contact_page", "switchboard", "business_email"].includes(String(record.type ?? "").toLowerCase()));
  const officialWebsite = metadata.officialWebsiteVerified === true
    && isHttpsSourceUrl(metadata.officialWebsiteSourceUrl);
  const sourceUrls = new Set<string>([
    ...rankingRecords,
    ...scaleRecords,
    ...registryRecords,
    ...ownershipRecords,
    ...routeRecords,
  ].map((record) => String(record.sourceUrl)));
  if (officialWebsite && typeof metadata.officialWebsiteSourceUrl === "string") sourceUrls.add(metadata.officialWebsiteSourceUrl);
  const independentSourceCount = sourceUrls.size;
  const hasGrowthRankingSignal = rankingRecords.length > 0;
  const hasSourceBackedScale = scaleRecords.length > 0;
  const hasActiveCompanyRegistry = registryRecords.length > 0;
  const hasOwnershipControlEvidence = ownershipRecords.length > 0;
  const hasOfficialBusinessRoute = routeRecords.length > 0;
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (hasGrowthRankingSignal) reasons.push("a source-backed Inc. 5000/fast-growth/unicorn ranking is a company-level discovery signal only");
  if (hasSourceBackedScale) reasons.push("company scale has a verified source-bound revenue, employee, asset, or valuation observation");
  if (hasActiveCompanyRegistry) reasons.push("an active company-registry record is source-bound");
  if (hasOwnershipControlEvidence) reasons.push("ownership/control has separate official filing or registry evidence");
  if (officialWebsite) reasons.push("an official company website is source-bound");
  if (hasOfficialBusinessRoute || input.contactOutcome === "organization_contact") reasons.push("an organization-level business contact route is present; it is not personal access");
  if (independentSourceCount >= 2) reasons.push(`${independentSourceCount} independent source URLs support the company evidence`);

  if (!hasSourceBackedScale) blockers.push("no source-backed company scale (revenue, employees, assets, or valuation) is recorded");
  if (independentSourceCount < 2) blockers.push("fewer than two independent source URLs support company materiality");
  if (!hasActiveCompanyRegistry) blockers.push("current legal status has not been confirmed in an official company registry");
  if (!hasOwnershipControlEvidence) blockers.push("beneficial ownership/control remains unverified");
  if (!hasOfficialBusinessRoute && input.contactOutcome !== "organization_contact") blockers.push("no verified official company contact route is recorded");

  const status: CompanyRealismAssessment["status"] = hasSourceBackedScale && independentSourceCount >= 2
    ? "materiality_evidenced"
    : hasSourceBackedScale
      ? "single_source_scale"
      : hasGrowthRankingSignal
        ? "growth_signal_lead"
        : hasActiveCompanyRegistry
          ? "registry_only"
          : "unverified";
  const score = Math.min(100,
    (hasSourceBackedScale ? 35 : 0)
    + (hasGrowthRankingSignal ? 15 : 0)
    + (hasActiveCompanyRegistry ? 15 : 0)
    + (hasOwnershipControlEvidence ? 15 : 0)
    + (officialWebsite ? 10 : 0)
    + (hasOfficialBusinessRoute || input.contactOutcome === "organization_contact" ? 10 : 0)
    + (independentSourceCount >= 2 ? 10 : 0),
  );
  return {
    status,
    score,
    hasGrowthRankingSignal,
    hasSourceBackedScale,
    hasActiveCompanyRegistry,
    hasOwnershipControlEvidence,
    hasOfficialWebsite: officialWebsite,
    hasOfficialBusinessRoute: hasOfficialBusinessRoute || input.contactOutcome === "organization_contact",
    independentSourceCount,
    reasons: [...new Set(reasons)],
    blockers: [...new Set(blockers)],
  };
}

/**
 * Classify practical access before spending deep research budget.
 *
 * Wealth, fame, assets, social handles, and registry presence are evidence of
 * importance, not evidence that a person can be reached. A target can remain
 * valuable for intelligence while being explicitly research-only for outreach.
 */
export function assessTargetReachability(input: ReachabilityInput): ReachabilityAssessment {
  const metadata = parseMetadata(input.metadata);

  const hasDirectContact = hasMeaningfulDirectContact({
    type: input.type,
    email: input.email,
    phone: input.phone,
    phoneSource: input.phoneSource,
  });
  const gatekeeperConnections = input.gatekeeperConnections ?? 0;
  const intermediaryConnections = input.intermediaryConnections ?? 0;
  const networkDegree = input.networkDegree ?? 0;
  const hasIntermediaryPath = gatekeeperConnections > 0 || intermediaryConnections > 0;

  const ultraWealthSignal = (input.estimatedNetWorth ?? 0) >= 500_000_000;
  // Only canonical structured markers may change the resource strategy.
  // Notes, registry names and source text commonly mention media/celebrity
  // vocabulary; lexical mention alone is not a prominence assessment.
  const publicProminenceSignal = metadata.publicProminence === true || metadata.prominence === "high";

  const reasons: string[] = [];
  const blockers: string[] = [];

  if (hasDirectContact) {
    reasons.push("validated person-level direct contact is present");
  } else {
    blockers.push("no validated person-level direct phone or email is present");
  }
  if (hasIntermediaryPath) {
    reasons.push("a stored gatekeeper or intermediary relationship exists");
  } else {
    blockers.push("no corroborated assistant, family-office, executive-office, foundation, or other intermediary path is stored");
  }
  if (ultraWealthSignal) {
    reasons.push("ultra-high wealth signal increases the prior that access is protected");
    blockers.push("wealth evidence is not access evidence");
  }
  if (publicProminenceSignal) {
    reasons.push("public-prominence markers indicate a high-noise public profile");
    blockers.push("public visibility, press coverage, and social presence do not imply a monitored contact route");
  }
  if (networkDegree > 0) {
    reasons.push(`${networkDegree} relationship edge${networkDegree === 1 ? "" : "s"} can support targeted path discovery`);
  }
  if (input.contactOutcome === "social_only") {
    blockers.push("social-only presence is evidence of identity, not a reliable outreach channel");
  } else if (input.contactOutcome === "organization_contact") {
    blockers.push("organization contact is not personal access to the individual");
  }

  let status: ReachabilityStatus;
  let mode: ReachabilityMode;
  let score: number;

  if (hasDirectContact) {
    status = "direct";
    mode = "full";
    score = 82;
  } else if (hasIntermediaryPath) {
    status = "intermediary";
    mode = "full";
    score = 58;
  } else if (
    ultraWealthSignal &&
    (publicProminenceSignal || (input.type === "HNWI" && (input.estimatedNetWorth ?? 0) >= 1_000_000_000)) &&
    networkDegree < 2 &&
    !hasValue(input.knownResidences)
  ) {
    status = "research_only";
    mode = "research_only";
    score = 8;
  } else if (
    publicProminenceSignal &&
    input.contactOutcome === "social_only" &&
    networkDegree < 2
  ) {
    status = "research_only";
    mode = "research_only";
    score = 12;
  } else {
    status = "bounded";
    mode = "targeted";
    score = Math.min(42, 18 + Math.min(networkDegree, 3) * 6 + (hasValue(input.knownResidences) ? 5 : 0));
  }

  return {
    status,
    mode,
    score,
    hasDirectContact,
    hasIntermediaryPath,
    ultraWealthSignal,
    publicProminenceSignal,
    reasons: [...new Set(reasons)],
    blockers: [...new Set(blockers)],
  };
}

export function reachabilityDirective(assessment: ReachabilityAssessment): ReachabilityDirective {
  return {
    mode: assessment.mode,
    status: assessment.status,
    score: assessment.score,
    reasons: assessment.reasons,
    blockers: assessment.blockers,
  };
}

export function formatReachabilityDirective(assessment?: ReachabilityAssessment | ReachabilityDirective | null): string {
  if (!assessment) {
    return `REALISM RULES:
- Direct reachability must be supported by a validated person-level phone or email.
- A social profile, public prominence, wealth signal, asset, registry entry, press address, or company switchboard is not personal access.
- If no direct or corroborated intermediary route is found, explicitly return research_only and do not pad the result with speculative contact paths.`;
  }

  const reasons = assessment.reasons.length ? assessment.reasons.join("; ") : "No positive access evidence is recorded.";
  const blockers = assessment.blockers.length ? assessment.blockers.join("; ") : "No known blockers.";
  const objective = assessment.mode === "research_only"
    ? "This is a RESEARCH-ONLY target. Spend the bounded pass on confirming identity, control structure, and whether an authorized intermediary exists. Do not keep searching indefinitely for a personal email or phone."
    : assessment.mode === "targeted"
      ? "This is a TARGETED reachability pass. Prioritize one or two plausible intermediary routes before broad contact discovery."
      : "This target has enough access evidence for a normal, evidence-led research pass.";

  return `REALISM / REACHABILITY CONTROL:
Status: ${assessment.status.toUpperCase()} · practical access score ${assessment.score}/100.
${objective}
Positive evidence: ${reasons}
Known blockers: ${blockers}
Never upgrade reachability because the person is famous, wealthy, visible on social media, mentioned in the press, owns an asset, or appears in a registry.`;
}