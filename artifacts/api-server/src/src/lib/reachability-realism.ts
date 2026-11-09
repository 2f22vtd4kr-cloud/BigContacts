import { hasMeaningfulDirectContact } from "./contact-confidence";

export type ReachabilityMode = "full" | "targeted" | "research_only";
export type ReachabilityStatus = "direct" | "intermediary" | "bounded" | "research_only";

export interface CompanyRealismAssessment {
  status: "materiality_evidenced" | "single_source_scale" | "growth_signal_lead" | "registry_only" | "unverified";
  score: number;
  hasGrowthRankingSignal: boolean;
  hasSourceBackedScale: boolean;
  hasCapitalCapacityEvidence: boolean;
  hasInvestmentActivityEvidence: boolean;
  hasActiveCompanyRegistry: boolean;
  hasOwnershipControlEvidence: boolean;
  hasOfficialWebsite: boolean;
  hasOfficialBusinessRoute: boolean;
  hasOrganizationContactCandidate: boolean;
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
  companyAssessment?: CompanyRealismAssessment;
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

function sourceHostKey(value: unknown): string | null {
  if (!isHttpsSourceUrl(value)) return null;
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isCompanyTargetType(type?: string | null): boolean {
  return /^(corporation|corp|company|organization|org|professional firm|partnership|llc|limited liability company)$/i.test((type ?? "").trim());
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
    const rank = Number(record.rank);
    const sourceType = String(record.sourceType ?? "").toLowerCase();
    const supportedPublisher = ["ranking_publisher", "official_ranking", "official_company"].includes(sourceType);
    const hasRank = (Number.isFinite(rank) && rank > 0) || (typeof record.rankLabel === "string" && Boolean(record.rankLabel.trim()));
    return record.verified === true
      && isHttpsSourceUrl(record.sourceUrl)
      && supportedPublisher
      && /(inc\.?\s*5000|fast[-\s]?growth|unicorn)/i.test(rankingName)
      && hasRank
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
  const capitalRecords = verifiedCompanyEvidence(metadata.companyCapitalEvidence, [
    "official_filing", "audited_report", "official_company", "reputable_media",
  ]).filter((record) => {
    const metric = String(record.metric ?? "").toLowerCase();
    const value = Number(record.value);
    return ["fund_size", "aum", "assets_under_management", "committed_capital", "deployable_capital", "investment_capacity"].includes(metric)
      && Number.isFinite(value)
      && value > 0;
  });
  const investmentRecords = verifiedCompanyEvidence(metadata.companyInvestmentEvidence, [
    "official_filing", "official_company", "official_registry", "reputable_media",
  ]).filter((record) => {
    const activity = String(record.activityType ?? record.activity ?? record.kind ?? "").toLowerCase();
    return record.investmentActivity === true
      || ["investment", "portfolio_investment", "capital_deployment", "funding", "acquisition", "deal", "portfolio_company"].includes(activity);
  });
  const registryRecords = verifiedCompanyEvidence(metadata.companyRegistryEvidence, ["official_registry"])
    .filter((record) => String(record.status ?? "").toLowerCase() === "active");
  const ownershipRecords = verifiedCompanyEvidence(metadata.companyOwnershipEvidence, ["official_registry", "official_filing"]);
  const routeRecords = verifiedCompanyEvidence(metadata.companyRouteEvidence, ["official_company", "official_registry"])
    .filter((record) => ["official_website", "contact_page", "switchboard", "business_email"].includes(String(record.type ?? "").toLowerCase()));
  const officialWebsite = metadata.officialWebsiteVerified === true
    && isHttpsSourceUrl(metadata.officialWebsiteSourceUrl);
  const sourceHosts = new Set<string>();
  for (const record of [
    ...rankingRecords,
    ...scaleRecords,
    ...capitalRecords,
    ...investmentRecords,
    ...registryRecords,
    ...ownershipRecords,
    ...routeRecords,
  ]) {
    const host = sourceHostKey(record.sourceUrl);
    if (host) sourceHosts.add(host);
  }
  if (officialWebsite) {
    const host = sourceHostKey(metadata.officialWebsiteSourceUrl);
    if (host) sourceHosts.add(host);
  }
  const independentSourceCount = sourceHosts.size;
  const hasGrowthRankingSignal = rankingRecords.length > 0;
  const hasSourceBackedScale = scaleRecords.length > 0;
  const hasCapitalCapacityEvidence = capitalRecords.length > 0;
  const hasInvestmentActivityEvidence = investmentRecords.length > 0;
  const hasActiveCompanyRegistry = registryRecords.length > 0;
  const hasOwnershipControlEvidence = ownershipRecords.length > 0;
  const hasOfficialBusinessRoute = routeRecords.length > 0;
  const reasons: string[] = [];
  const blockers: string[] = [];

  if (hasGrowthRankingSignal) reasons.push("an Inc. 5000/fast-growth/unicorn ranking is a poor-fit signal, not positive qualification; ranking-only mentions remain leads");
  if (hasSourceBackedScale) reasons.push("company scale has a verified source-bound revenue, employee, asset, or valuation observation");
  if (hasCapitalCapacityEvidence) reasons.push("capital capacity has a verified source-bound fund-size, AUM, committed-capital, or deployable-capital observation");
  if (hasInvestmentActivityEvidence) reasons.push("actual investment activity has a verified source-bound transaction or portfolio observation");
  if (hasActiveCompanyRegistry) reasons.push("an active company-registry record is source-bound");
  if (hasOwnershipControlEvidence) reasons.push("ownership/control has separate official filing or registry evidence");
  if (officialWebsite) reasons.push("an official company website is source-bound");
  if (hasOfficialBusinessRoute) reasons.push("a verified official organization-level business contact route is present; it is not personal access");
  else if (input.contactOutcome === "organization_contact") reasons.push("an organization-level contact candidate is present but still requires source validation; it is not personal access");
  if (independentSourceCount >= 2) reasons.push(`${independentSourceCount} independent source URLs support the company evidence`);

  if (!hasSourceBackedScale && !hasCapitalCapacityEvidence && !hasInvestmentActivityEvidence) blockers.push("no source-backed operating scale or investor capital-capacity/investment-activity evidence is recorded");
  if (independentSourceCount < 2) blockers.push("fewer than two independent source domains support company materiality");
  if (!hasActiveCompanyRegistry) blockers.push("current legal status has not been confirmed in an official company registry");
  if (!hasOwnershipControlEvidence) blockers.push("ownership/control remains unverified; require it only when the objective depends on ownership, control, or personal wealth");
  if (!hasOfficialBusinessRoute) blockers.push("no verified official company contact route is recorded");

  const hasSourceBackedMateriality = hasSourceBackedScale || hasCapitalCapacityEvidence || hasInvestmentActivityEvidence;
  const status: CompanyRealismAssessment["status"] = hasSourceBackedMateriality && independentSourceCount >= 2
    ? "materiality_evidenced"
    : hasSourceBackedMateriality
      ? "single_source_scale"
      : hasGrowthRankingSignal
        ? "growth_signal_lead"
        : hasActiveCompanyRegistry
          ? "registry_only"
          : "unverified";
  const score = Math.max(0, Math.min(100,
    (hasSourceBackedScale ? 35 : 0)
    + (hasCapitalCapacityEvidence || hasInvestmentActivityEvidence ? 35 : 0)
    + (hasActiveCompanyRegistry ? 15 : 0)
    + (hasOwnershipControlEvidence ? 15 : 0)
    + (officialWebsite ? 10 : 0)
    + (hasOfficialBusinessRoute ? 10 : 0)
    + (independentSourceCount >= 2 ? 10 : 0)
    - (hasGrowthRankingSignal ? 10 : 0),
  ));
  return {
    status,
    score,
    hasGrowthRankingSignal,
    hasSourceBackedScale,
    hasCapitalCapacityEvidence,
    hasInvestmentActivityEvidence,
    hasActiveCompanyRegistry,
    hasOwnershipControlEvidence,
    hasOfficialWebsite: officialWebsite,
    hasOfficialBusinessRoute,
    hasOrganizationContactCandidate: input.contactOutcome === "organization_contact",
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

  if (isCompanyTargetType(input.type)) {
    const companyAssessment = assessCompanyRealism({
      metadata: input.metadata,
      contactOutcome: input.contactOutcome,
    });
    const gatekeeperConnections = input.gatekeeperConnections ?? 0;
    const intermediaryConnections = input.intermediaryConnections ?? 0;
    const hasIntermediaryPath = gatekeeperConnections > 0 || intermediaryConnections > 0;
    const hasCompanyEvidence = companyAssessment.hasSourceBackedScale
      || companyAssessment.hasCapitalCapacityEvidence
      || companyAssessment.hasInvestmentActivityEvidence
      || companyAssessment.hasActiveCompanyRegistry
      || companyAssessment.hasOfficialWebsite
      || companyAssessment.hasOrganizationContactCandidate;
    const mode: ReachabilityMode = companyAssessment.status === "materiality_evidenced"
      && companyAssessment.hasOfficialBusinessRoute
      ? "full"
      : hasCompanyEvidence
        ? "targeted"
        : "research_only";
    const status: ReachabilityStatus = mode === "research_only" ? "research_only" : "bounded";
    return {
      status,
      mode,
      score: companyAssessment.score,
      hasDirectContact: false,
      hasIntermediaryPath,
      ultraWealthSignal: false,
      publicProminenceSignal: false,
      reasons: [...companyAssessment.reasons, ...(hasIntermediaryPath ? ["a stored gatekeeper/intermediary relationship exists"] : [])],
      blockers: companyAssessment.blockers,
      companyAssessment,
    };
  }

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
- For people, direct reachability must be supported by a validated person-level phone/email or a corroborated intermediary.
- For companies, assess active legal status, actual operations, source-backed scale and growth separately from individual owner wealth.
- Inc. 5000/fast-growth/unicorn rankings are poor-fit signals, not positive qualification; ranking-only mentions are leads, not qualified targets.
- Company growth is not owner wealth. Verify ownership/control and personal wealth independently.
- A company website, contact page or switchboard is an organization-level route, not personal access.
- If no credible company evidence or corroborated person-level route exists, use research_only; do not pad the result with speculative contact paths.`;
  }

  if (assessment.companyAssessment) {
    const company = assessment.companyAssessment;
    const companyObjective = assessment.mode === "research_only"
      ? "This is a COMPANY RESEARCH-ONLY target. Confirm the legal entity and operating reality before searching for contacts."
      : assessment.mode === "targeted"
        ? "This is a TARGETED COMPANY REALISM pass. Verify scale and growth from independent sources, then confirm the official organization route."
        : "This company has source-backed materiality and an official business route; continue with evidence-led organization-level research.";
    const companyReasons = company.reasons.length ? company.reasons.join("; ") : "No positive company evidence is recorded.";
    const companyBlockers = company.blockers.length ? company.blockers.join("; ") : "No known company evidence blockers.";
    return `COMPANY REALISM / REACHABILITY CONTROL:
Company evidence status: ${company.status.toUpperCase()} · company realism score ${company.score}/100.
${companyObjective}
Positive evidence: ${companyReasons}
Known blockers: ${companyBlockers}
Inc. 5000/fast-growth/unicorn rankings are poor-fit signals, not positive qualification; ranking-only mentions are leads, not qualified targets.
Company materiality requires source-backed operating scale or, for investor firms, capital capacity/actual investment activity supported by at least two independent source domains. Verify active legal status and actual operations. Verify ownership/control separately when the objective requires it; an FAA registrant is not necessarily a beneficial owner. Potential-investor firms require relevant mandate fit plus capital-capacity or actual investment-activity evidence.
A verified company website, contact page or switchboard is organization-level reachability, not personal access. Company growth is not owner wealth; never infer founders' or shareholders' personal wealth from rankings, revenue, assets or growth.`;
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