/**
 * Investigation progress — standard contact-vector coverage for Case Bureau.
 *
 * Purpose: keep the Bureau aware of which common HNWI / org contact channels
 * have been attempted, found, or verified as personal — without turning the
 * investigation into a rigid fixed pipeline.
 *
 * All discovered routes remain visible. Verified personal routes are marked
 * distinctly; organization and review-only routes stay available.
 */

export type ContactVectorId =
  | "email"
  | "phone"
  | "linkedin"
  | "instagram"
  | "twitter"
  | "telegram"
  | "tiktok"
  | "website"
  | "registries"
  | "username_footprint";

export type ContactVectorStatus =
  | "pending"
  | "attempted"
  | "found"
  | "verified_personal"
  | "organization_only"
  | "negative";

export type ContactVectorProgress = {
  id: ContactVectorId;
  label: string;
  status: ContactVectorStatus;
  values: string[];
  note: string | null;
};

export type InvestigationProgress = {
  vectors: ContactVectorProgress[];
  pendingVectors: ContactVectorId[];
  foundPersonalCount: number;
  foundAnyCount: number;
  coverageRatio: number;
  lastAssessedAt: string;
};

export const STANDARD_CONTACT_VECTORS: Array<{ id: ContactVectorId; label: string }> = [
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone (mobile / direct / landline)" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "twitter", label: "Twitter / X" },
  { id: "telegram", label: "Telegram" },
  { id: "tiktok", label: "TikTok" },
  { id: "website", label: "Personal or official website" },
  { id: "registries", label: "Public registries (Companies House, EDGAR, GLEIF, etc.)" },
  { id: "username_footprint", label: "Username footprint (Sherlock / Maigret / Holehe)" },
];

const VECTOR_ALIASES: Record<ContactVectorId, string[]> = {
  email: ["email", "mail", "e-mail"],
  phone: ["phone", "mobile", "cell", "telephone", "tel", "landline", "direct_line"],
  linkedin: ["linkedin"],
  instagram: ["instagram", "ig"],
  twitter: ["twitter", "x.com", "x_com"],
  telegram: ["telegram", "t.me"],
  tiktok: ["tiktok"],
  website: ["website", "web", "url", "domain", "site"],
  registries: ["registry", "companies house", "edgar", "gleif", "openownership", "filing"],
  username_footprint: ["username", "sherlock", "maigret", "holehe", "footprint", "handle"],
};

type RouteLike = {
  vectorType?: string | null;
  value?: string | null;
  tier?: string | null;
  state?: string | null;
  relationship?: string | null;
  personName?: string | null;
  score?: number | null;
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[_\s-]+/g, " ");
}

function matchVectorId(raw: string): ContactVectorId | null {
  const token = normalizeToken(raw);
  if (!token) return null;
  for (const [id, aliases] of Object.entries(VECTOR_ALIASES) as Array<[ContactVectorId, string[]]>) {
    if (aliases.some((alias) => token.includes(alias) || alias.includes(token))) return id;
  }
  if (token.includes("instagram.com")) return "instagram";
  if (token.includes("linkedin.com")) return "linkedin";
  if (token.includes("twitter.com") || token.includes("x.com")) return "twitter";
  if (token.includes("t.me") || token.includes("telegram")) return "telegram";
  if (token.includes("tiktok.com")) return "tiktok";
  if (token.includes("@") && token.includes(".")) return "email";
  if (/^\+?[\d\s().-]{7,}$/.test(token)) return "phone";
  return null;
}

function isPersonalRoute(route: RouteLike): boolean {
  const tier = normalizeToken(String(route.tier ?? ""));
  const relationship = normalizeToken(String(route.relationship ?? ""));
  const state = normalizeToken(String(route.state ?? ""));
  if (tier.includes("direct") || tier.includes("person")) return true;
  if (relationship.includes("target_person") || relationship.includes("personal")) return true;
  if (state.includes("verified") && Boolean(route.personName)) return true;
  if (route.personName && (tier.includes("executive") || relationship.includes("executive"))) return true;
  return false;
}

function isVerifiedPersonal(route: RouteLike): boolean {
  const state = normalizeToken(String(route.state ?? ""));
  const score = typeof route.score === "number" ? route.score : 0;
  if (!isPersonalRoute(route)) return false;
  if (state.includes("verified") || state.includes("confirmed") || state.includes("exact")) return true;
  if (score >= 80 && Boolean(route.personName)) return true;
  return false;
}

function isOrganizationOnly(route: RouteLike): boolean {
  const tier = normalizeToken(String(route.tier ?? ""));
  const value = String(route.value ?? "");
  if (tier.includes("organization") || tier.includes("context")) return true;
  if (/^(info|contact|office|press|hello|enquiries|sales|admin|support|reception)@/i.test(value)) return true;
  return false;
}

/**
 * Build durable per-vector progress from routes already on the case file plus
 * optional evidence hints (search gaps, negative findings, completed actions).
 */
export function computeInvestigationProgress(input: {
  routes?: RouteLike[];
  sourceRegistries?: string[];
  searchGaps?: string[];
  negativeFindings?: string[];
  completedActionIds?: string[];
  now?: string;
}): InvestigationProgress {
  const routes = input.routes ?? [];
  const byId = new Map<ContactVectorId, ContactVectorProgress>();

  for (const def of STANDARD_CONTACT_VECTORS) {
    byId.set(def.id, {
      id: def.id,
      label: def.label,
      status: "pending",
      values: [],
      note: null,
    });
  }

  for (const route of routes) {
    const vectorId =
      matchVectorId(String(route.vectorType ?? "")) ??
      matchVectorId(String(route.value ?? ""));
    if (!vectorId) continue;
    const entry = byId.get(vectorId)!;
    const value = String(route.value ?? "").trim();
    if (value && !entry.values.includes(value)) entry.values.push(value);

    if (isVerifiedPersonal(route)) {
      entry.status = "verified_personal";
      entry.note = route.personName
        ? `Verified personal route for ${route.personName}`
        : "Verified personal route";
    } else if (entry.status !== "verified_personal") {
      if (isOrganizationOnly(route)) {
        entry.status = entry.status === "found" ? "found" : "organization_only";
        entry.note = entry.note ?? "Organization or shared route retained for review";
      } else {
        entry.status = "found";
        entry.note = entry.note ?? "Public route found; attribution still under review";
      }
    }
  }

  if ((input.sourceRegistries ?? []).length > 0) {
    const entry = byId.get("registries")!;
    if (entry.status === "pending") {
      entry.status = "found";
      entry.values = (input.sourceRegistries ?? []).slice(0, 8);
      entry.note = "Registry sources present on the case";
    }
  }

  const completed = new Set((input.completedActionIds ?? []).map((id) => id.toLowerCase()));
  if (completed.has("run-digital-footprint") || completed.has("run_digital_footprint")) {
    const entry = byId.get("username_footprint")!;
    if (entry.status === "pending") {
      entry.status = "attempted";
      entry.note = "Digital footprint expansion was run";
    }
  }
  if (completed.has("expand-contact-routes") || completed.has("expand_contact_routes")) {
    for (const id of ["email", "phone", "linkedin", "instagram", "twitter", "telegram", "tiktok", "website"] as ContactVectorId[]) {
      const entry = byId.get(id)!;
      if (entry.status === "pending") {
        entry.status = "attempted";
        entry.note = entry.note ?? "Contact hierarchy expansion was attempted";
      }
    }
  }
  if (completed.has("map-ownership-structure") || completed.has("map_ownership_structure")) {
    const entry = byId.get("registries")!;
    if (entry.status === "pending") {
      entry.status = "attempted";
      entry.note = "Ownership / structure mapping was attempted";
    }
  }

  for (const gap of [...(input.searchGaps ?? []), ...(input.negativeFindings ?? [])]) {
    const vectorId = matchVectorId(gap);
    if (!vectorId) continue;
    const entry = byId.get(vectorId)!;
    if (entry.status === "pending") {
      entry.status = /no |not found|unavailable|missing|none/i.test(gap) ? "negative" : "attempted";
      entry.note = gap.slice(0, 240);
    }
  }

  const vectors = STANDARD_CONTACT_VECTORS.map((def) => byId.get(def.id)!);
  const pendingVectors = vectors.filter((v) => v.status === "pending" || v.status === "attempted").map((v) => v.id);
  const foundPersonalCount = vectors.filter((v) => v.status === "verified_personal").length;
  const foundAnyCount = vectors.filter((v) =>
    v.status === "found" || v.status === "verified_personal" || v.status === "organization_only",
  ).length;
  const coverageRatio = Number((foundAnyCount / Math.max(1, vectors.length)).toFixed(3));

  return {
    vectors,
    pendingVectors,
    foundPersonalCount,
    foundAnyCount,
    coverageRatio,
    lastAssessedAt: input.now ?? new Date().toISOString(),
  };
}

/** Human-readable coverage line for Boss / right-hand prompts. */
export function formatProgressForPrompt(progress: InvestigationProgress): string {
  const lines = progress.vectors.map((v) => {
    const values = v.values.length ? ` → ${v.values.slice(0, 3).join(", ")}` : "";
    const note = v.note ? ` (${v.note})` : "";
    return `- ${v.label}: ${v.status}${values}${note}`;
  });
  return [
    `Contact-vector coverage: ${progress.foundAnyCount}/${progress.vectors.length} found · ${progress.foundPersonalCount} verified personal · pending: ${progress.pendingVectors.join(", ") || "none"}`,
    ...lines,
  ].join("\n");
}

/**
 * Classify a route for UI: personal verified, personal review, org, or context.
 * Display ALL routes; only the marker changes.
 */
export function classifyRouteMarker(route: RouteLike): {
  marker: "verified_personal" | "personal_review" | "organization" | "context";
  label: string;
} {
  if (isVerifiedPersonal(route)) {
    return { marker: "verified_personal", label: "Verified personal" };
  }
  if (isPersonalRoute(route)) {
    return { marker: "personal_review", label: "Personal · review" };
  }
  if (isOrganizationOnly(route)) {
    return { marker: "organization", label: "Organization route" };
  }
  return { marker: "context", label: "Contextual route" };
}
