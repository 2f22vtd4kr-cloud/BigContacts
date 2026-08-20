import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getScoreColor(score: number) {
  if (score >= 0.8) return "text-[#e85d1a] border-[#e85d1a]/50 bg-[#e85d1a]/10";
  if (score >= 0.5) return "text-[#fdba74] border-[#e85d1a]/35 bg-[#e85d1a]/10";
  return "text-muted-foreground border-border bg-muted";
}

export function getScoreBarColor(score: number) {
  if (score >= 0.8) return "bg-[#e85d1a]";
  if (score >= 0.5) return "bg-[#c2410c]";
  return "bg-muted-foreground";
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "Unknown";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  // Registry confidence score — how many independent public registries confirm this person
  if (score == null) return null;
  const colorClasses = getScoreColor(score);
  const pct = Math.round(score * 100);
  const label = pct >= 70 ? "Multi-registry" : pct >= 40 ? "Single-registry" : "Unverified";
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${colorClasses}`}
         title={`Registry confidence ${pct}/100 — strength of public registry verification. Higher means more independent sources confirm this person's wealth profile.`}>
      <span className="font-bold tabular-nums">{pct}</span>
      <span className="opacity-50 text-[9px] uppercase tracking-wide leading-none">{label}</span>
    </div>
  );
}

export function AccessScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null || typeof score !== "number" || isNaN(score)) return null;
  // Accept 0–1 fractions or 0–100 percents (ledger/API historically mixed both).
  const pct = Math.round(score > 1 ? score : score * 100);

  // Plain-language reachability — never cryptic jargon alone
  let label: string;
  let colorClass: string;
  let tip: string;

  if (pct === 0) {
    label = "No path";
    colorClass = "text-stone-300 border-[#2a2a2a] bg-[#141414]";
    tip = "No public contact path found yet";
  } else if (pct < 30) {
    label = "Hard to reach";
    colorClass = "text-[#fdba74] border-[#e85d1a]/40 bg-[#e85d1a]/10";
    tip = `Reachability ${pct}/100 — thin public path`;
  } else if (pct < 60) {
    label = "Possible";
    colorClass = "text-[#f97316] border-[#e85d1a]/35 bg-[#e85d1a]/10";
    tip = `Reachability ${pct}/100 — some public route exists`;
  } else if (pct < 85) {
    label = "Easy to reach";
    colorClass = "text-orange-200 border-orange-400/30 bg-orange-400/10";
    tip = `Reachability ${pct}/100 — solid public contact path`;
  } else {
    label = "Direct path";
    colorClass = "text-[#fdba74] border-[#e85d1a]/35 bg-[#e85d1a]/12";
    tip = `Reachability ${pct}/100 — direct attributable contact`;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-mono ${colorClass}`}
      title={tip}
      data-testid="badge-access-score"
      aria-label={tip}
    >
      <span className="font-bold tabular-nums text-[11px] leading-none">{pct}</span>
      <span className="text-[10px] font-medium leading-none tracking-tight normal-case opacity-90">{label}</span>
    </div>
  );
}

export function ConfidenceBadge({ score }: { score: number | null | undefined }) {
  // How trustworthy the contact evidence is (email/phone/social), not reachability.
  if (score == null || typeof score !== "number" || isNaN(score)) return null;
  const pct = Math.round(score);

  let label: string;
  let colorClass: string;
  let tip: string;

  if (pct === 0) {
    label = "No evidence";
    colorClass = "text-stone-300 border-[#2a2a2a] bg-[#141414]";
    tip = "No contact evidence on file";
  } else if (pct < 30) {
    label = "Thin evidence";
    colorClass = "text-[#fdba74] border-[#e85d1a]/40 bg-[#e85d1a]/10";
    tip = `Contact quality ${pct}/100 — weak or sparse public evidence`;
  } else if (pct < 60) {
    label = "Partial evidence";
    colorClass = "text-[#f97316] border-[#e85d1a]/35 bg-[#e85d1a]/10";
    tip = `Contact quality ${pct}/100 — some public contact data, not fully confirmed`;
  } else if (pct < 85) {
    label = "Solid evidence";
    colorClass = "text-orange-200 border-orange-400/30 bg-orange-400/10";
    tip = `Contact quality ${pct}/100 — strong public contact evidence`;
  } else {
    label = "Confirmed";
    colorClass = "text-[#fdba74] border-[#e85d1a]/35 bg-[#e85d1a]/12";
    tip = `Contact quality ${pct}/100 — verified attributable contact`;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-mono ${colorClass}`}
      title={tip}
      data-testid="badge-confidence-score"
      aria-label={tip}
    >
      <span className="font-bold tabular-nums text-[11px] leading-none">{pct}</span>
      <span className="text-[10px] font-medium leading-none tracking-tight normal-case opacity-90">{label}</span>
    </div>
  );
}

/** Map ISO / common nationality strings to flag emoji for scannable ledger rows */
export function nationalityFlag(nationality: string | null | undefined): string {
  if (!nationality) return "";
  const n = nationality.trim().toUpperCase();
  const map: Record<string, string> = {
    US: "🇺🇸", USA: "🇺🇸", "UNITED STATES": "🇺🇸", AMERICAN: "🇺🇸",
    UK: "🇬🇧", GB: "🇬🇧", "UNITED KINGDOM": "🇬🇧", BRITISH: "🇬🇧", ENGLAND: "🇬🇧",
    CH: "🇨🇭", SWISS: "🇨🇭", SWITZERLAND: "🇨🇭",
    DE: "🇩🇪", GERMAN: "🇩🇪", GERMANY: "🇩🇪",
    FR: "🇫🇷", FRENCH: "🇫🇷", FRANCE: "🇫🇷",
    CA: "🇨🇦", CANADIAN: "🇨🇦", CANADA: "🇨🇦",
    AU: "🇦🇺", AUSTRALIAN: "🇦🇺", AUSTRALIA: "🇦🇺",
    NL: "🇳🇱", DUTCH: "🇳🇱", NETHERLANDS: "🇳🇱",
    IE: "🇮🇪", IRISH: "🇮🇪", IRELAND: "🇮🇪",
    IT: "🇮🇹", ITALIAN: "🇮🇹", ITALY: "🇮🇹",
    ES: "🇪🇸", SPANISH: "🇪🇸", SPAIN: "🇪🇸",
    SE: "🇸🇪", SWEDISH: "🇸🇪", SWEDEN: "🇸🇪",
    NO: "🇳🇴", NORWEGIAN: "🇳🇴", NORWAY: "🇳🇴",
    DK: "🇩🇰", DANISH: "🇩🇰", DENMARK: "🇩🇰",
    SG: "🇸🇬", SINGAPORE: "🇸🇬",
    HK: "🇭🇰", "HONG KONG": "🇭🇰",
    JP: "🇯🇵", JAPANESE: "🇯🇵", JAPAN: "🇯🇵",
    CN: "🇨🇳", CHINESE: "🇨🇳", CHINA: "🇨🇳",
    IN: "🇮🇳", INDIAN: "🇮🇳", INDIA: "🇮🇳",
    AE: "🇦🇪", UAE: "🇦🇪", EMIRATI: "🇦🇪",
    IL: "🇮🇱", ISRAELI: "🇮🇱", ISRAEL: "🇮🇱",
    BR: "🇧🇷", BRAZILIAN: "🇧🇷", BRAZIL: "🇧🇷",
    MX: "🇲🇽", MEXICAN: "🇲🇽", MEXICO: "🇲🇽",
    ZA: "🇿🇦", "SOUTH AFRICA": "🇿🇦",
    NZ: "🇳🇿", "NEW ZEALAND": "🇳🇿",
    AT: "🇦🇹", AUSTRIAN: "🇦🇹", AUSTRIA: "🇦🇹",
    BE: "🇧🇪", BELGIAN: "🇧🇪", BELGIUM: "🇧🇪",
    LU: "🇱🇺", LUXEMBOURG: "🇱🇺",
    PT: "🇵🇹", PORTUGUESE: "🇵🇹", PORTUGAL: "🇵🇹",
    PL: "🇵🇱", POLISH: "🇵🇱", POLAND: "🇵🇱",
    FI: "🇫🇮", FINNISH: "🇫🇮", FINLAND: "🇫🇮",
  };
  return map[n] ?? "";
}

export function NationalityCell({ nationality }: { nationality: string | null | undefined }) {
  if (!nationality) {
    return <span className="text-muted-foreground/50">—</span>;
  }
  const flag = nationalityFlag(nationality);
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground whitespace-nowrap" title={nationality}>
      {flag ? <span className="text-base leading-none" aria-hidden>{flag}</span> : null}
      <span className="text-[12px] tracking-tight text-foreground/80">{nationality}</span>
    </span>
  );
}

export function formatRegistry(source: string | null | undefined) {
  if (!source) return "Unknown";
  return source.split(',').map(s => s.trim()).join(' / ');
}

/**
 * Display-formats entity names stored as ALL CAPS (FAA/EDGAR style).
 * "THIEL PETER" → "Thiel Peter"  |  "Chadwick John Huston" → unchanged
 */
export function formatEntityName(name: string | null | undefined): string {
  if (!name) return "Unknown";
  // Already mixed-case → leave as-is
  if (/[a-z]/.test(name)) return name;
  // ALL CAPS → title-case each word
  return name
    .toLowerCase()
    .replace(/\b([a-z])/g, c => c.toUpperCase());
}

/**
 * Cleans up verbose raw signal text from SEC EDGAR / FAA ingestors.
 * "Source: SEC EDGAR — SC 13G. Filing type: SC 13G." → "SEC EDGAR — SC 13G filing"
 * "Aviation: Jet — N112AE · FAA Releasable Aircraft Database" → unchanged
 */
export function formatSignal(signal: string | null | undefined): string {
  if (!signal) return "No signal";
  return signal
    .replace(/^Source:\s*/i, "")                          // strip "Source: " prefix
    .replace(/\.\s*Filing type:\s*[\w\s\d]+\./gi, " filing") // collapse duplicate filing type
    .replace(/\.$/, "")                                   // trailing period
    .trim();
}

type EntityNarrative = {
  type?: string | null;
  nationality?: string | null;
  knownResidences?: string | null;
  notes?: string | null;
  linkedinHeadline?: string | null;
  twitterBio?: string | null;
  telegramBio?: string | null;
  personalWebsite?: string | null;
  foundationName?: string | null;
  estimatedNetWorth?: number | null;
  name?: string | null;
  sourceRegistries?: string | string[] | null;
  signal?: string | null;
  assetCount?: number | null;
  assetCategories?: string[] | null;
  relationshipCount?: number | null;
};

function narrativeText(value: unknown, max = 220): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").replace(/^[-–—|:]\s*/, "").trim();
  if (!text || text.length < 4) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function parseEntityRegistries(value: EntityNarrative["sourceRegistries"]): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function noteField(notes: string | null | undefined, field: string): string | null {
  if (!notes) return null;
  const match = notes.match(new RegExp(`${field}:\\s*(.*?)(?=\\s+(?:Source|Filing|Company|Nationality|Location|Entity type):|$)`, "i"));
  return narrativeText(match?.[1], 180);
}

function filingLabel(notes: string | null | undefined): string | null {
  const filing = noteField(notes, "Filing");
  return filing ? filing.replace(/\s*\([^)]*\)\s*$/, "").trim() : null;
}

function companyFromNotes(notes: string | null | undefined): string | null {
  return noteField(notes, "Company");
}

function cleanCategory(category: string): string {
  return category
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

export function entityWorkSummary(entity: EntityNarrative): string | null {
  // Bad Rudi voice: short, human, role-first — what this person actually does.
  const publicRole = narrativeText(entity.twitterBio)
    ?? narrativeText(entity.telegramBio)
    ?? narrativeText(entity.linkedinHeadline);
  if (publicRole) return publicRole;

  const filing = filingLabel(entity.notes);
  const company = companyFromNotes(entity.notes);
  if (filing && company) return `Shows up in a public ${filing} for ${company}.`;
  if (company) return `Tied to ${company} in public company records.`;
  if (filing) return `Named in a public filing: ${filing}.`;

  const categories = Array.from(new Set((entity.assetCategories ?? []).filter(Boolean).map(cleanCategory)));
  if (categories.includes("aviation") || categories.some((c) => c.includes("aircraft"))) {
    return "Private aircraft on the public register — not a hobby fleet for most people.";
  }
  if (categories.some((c) => c.includes("real estate") || c.includes("property"))) {
    return "High-value property sits under their name in public land records.";
  }
  if (categories.length > 0) return `Public records point at ${categories.slice(0, 3).join(", ")}.`;

  const foundation = narrativeText(entity.foundationName, 150);
  if (foundation) return `Linked to foundation work: ${foundation}.`;

  const registry = parseEntityRegistries(entity.sourceRegistries);
  const labels = Array.from(new Set(
    registry.flatMap((source) => INVOLVEMENT_LABELS.filter(([pattern]) => pattern.test(source)).map(([, label]) => label)),
  ));
  if (labels.length > 0) return `Public trail in ${labels.slice(0, 2).join(" and ")}.`;
  return null;
}

/** Backward-compatible alias for consumers outside the current narrative cards. */
export function entityBio(entity: EntityNarrative): string | null {
  return entityWorkSummary(entity);
}

export function entityFindingsSummary(entity: EntityNarrative): string {
  // Plain spoken dossier notes — what turned up, not a checklist of system fields.
  const bits: string[] = [];
  const source = parseEntityRegistries(entity.sourceRegistries)
    .filter((item) => !/^(manual|user|seed|imported)$/i.test(item.trim()))[0];
  const filing = filingLabel(entity.notes);
  const company = companyFromNotes(entity.notes);
  const noteNationality = noteField(entity.notes, "Nationality");
  const noteLocation = noteField(entity.notes, "Location");

  if (source) bits.push(`first hit came from ${source}`);
  if (filing && company) bits.push(`${filing} names them with ${company}`);
  else if (filing) bits.push(`filing on record: ${filing}`);
  if (noteNationality || entity.nationality) bits.push(`nationality looks like ${noteNationality ?? entity.nationality}`);
  if (noteLocation || entity.knownResidences) {
    const loc = (noteLocation ?? entity.knownResidences ?? "").split(",")[0]?.trim();
    if (loc) bits.push(`ties to ${loc}`);
  }
  if ((entity.assetCount ?? 0) > 0) {
    const categories = Array.from(new Set((entity.assetCategories ?? []).filter(Boolean).map(cleanCategory)));
    const cat = categories.slice(0, 2).join(" and ");
    bits.push(
      entity.assetCount === 1
        ? `one public asset on file${cat ? ` (${cat})` : ""}`
        : `${entity.assetCount} public assets on file${cat ? ` (${cat})` : ""}`,
    );
  }
  if (entity.personalWebsite) bits.push("a personal site is on the record");
  if (entity.linkedinHeadline || entity.twitterBio || entity.telegramBio) bits.push("public profile text is available");
  if (bits.length === 0) return "Still thin. Name is on file; the personal picture has not filled in yet.";
  return bits.join(". ") + ".";
}

/** Why this person sits in the HNWI ledger — wealth signal in plain language. */
export function entityWhyHnwi(entity: EntityNarrative): string {
  const name = typeof entity.name === "string" && entity.name.trim() ? entity.name.trim().split(/\s+/)[0] : "They";
  const registry = parseEntityRegistries(entity.sourceRegistries);
  const reg = registry.find((item) => !/^(manual|user|seed|imported)$/i.test(item.trim())) ?? "";
  const categories = Array.from(new Set((entity.assetCategories ?? []).filter(Boolean).map(cleanCategory)));
  const company = companyFromNotes(entity.notes);
  const filing = filingLabel(entity.notes);
  const worth = entity.estimatedNetWorth;

  if (/faa/i.test(reg) || categories.some((c) => c.includes("aviation") || c.includes("aircraft"))) {
    const n = entity.assetCount ?? 0;
    return n > 1
      ? `${name} lands here because the FAA list shows ${n} aircraft under their name. Jets are not a lifestyle flex we invent — they are public, expensive, and hard to fake.`
      : `${name} lands here because the FAA register shows aircraft ownership. That is public, costly to run, and a clean wealth signal.`;
  }
  if (/edgar|sec/i.test(reg)) {
    if (company) {
      return `${name} is on the list because SEC filings put them next to ${company} as an owner or senior name. Public markets leave a paper trail.`;
    }
    return `${name} is on the list because SEC EDGAR names them in ownership or board filings. That is the open record, not a rumour.`;
  }
  if (/land.?reg|hmlr/i.test(reg) || categories.some((c) => c.includes("real estate") || c.includes("property"))) {
    return `${name} is here because UK land records show high-value property in their name. Property of that class is a durable wealth marker.`;
  }
  if (/companies.?house/i.test(reg)) {
    return company
      ? `${name} shows up as a director or controller around ${company} at Companies House. That is how the UK keeps score on who runs the shop.`
      : `${name} shows up in Companies House as a director or person with significant control. Official register, not a magazine list.`;
  }
  if (/brreg|norway/i.test(reg)) {
    return `${name} is listed as a director or key officer in Norway's BRREG. We use that plus company scale as the wealth filter.`;
  }
  if (filing && company) {
    return `${name} is on the desk because a public ${filing} links them to ${company}. Role plus public paper is enough to open a card.`;
  }
  if (worth != null && worth > 0) {
    return `${name} carries an estimated wealth signal on file. Treat the number as a lead, not a verdict — the registries and assets are the real story.`;
  }
  if (company) {
    return `${name} is tied to ${company} in public records. That business link is why the card exists.`;
  }
  if (reg) {
    return `${name} appears in ${reg}, a public register we watch for people with serious assets or control.`;
  }
  return `${name} is on a research card. The public case for wealth and role is still being filled in.`;
}

const INVOLVEMENT_LABELS: Array<[RegExp, string]> = [
  [/edgar|sec/i, "public-company ownership or governance"],
  [/faa|aviation|aircraft/i, "private aviation"],
  [/land.?reg|hmlr|property|real.?estate/i, "high-value property"],
  [/companies.?house|house.?uk/i, "UK company directorships"],
  [/brreg|norway/i, "Norwegian company directorships"],
  [/bodacc|france/i, "French corporate filings"],
  [/ares|czech/i, "Czech corporate filings"],
  [/foundation|charity/i, "philanthropic or foundation activity"],
  [/opensky|flight/i, "live aviation activity"],
];

export function entityInvolvement(entity: EntityNarrative): string | null {
  const signal = narrativeText(entity.signal, 180);
  if (signal) return signal;
  const foundation = narrativeText(entity.foundationName, 150);
  if (foundation) return `Foundation activity: ${foundation}`;
  const categories = (entity.assetCategories ?? []).filter(Boolean);
  if (categories.length > 0) {
    const labels = Array.from(new Set(categories)).slice(0, 3).map((category) => category.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase());
    return `${labels.join(", ")} record${labels.length === 1 ? "" : "s"} linked to this profile`;
  }
  const registry = parseEntityRegistries(entity.sourceRegistries);
  const labels = Array.from(new Set(
    registry.flatMap((source) => INVOLVEMENT_LABELS.filter(([pattern]) => pattern.test(source)).map(([, label]) => label)),
  ));
  if (labels.length > 0) return labels.slice(0, 2).join(" · ");
  if ((entity.assetCount ?? 0) > 0) return `${entity.assetCount} public asset${entity.assetCount === 1 ? "" : "s"} linked to this profile`;
  return null;
}

export function entityEvidenceLabel(entity: EntityNarrative): string {
  const registries = parseEntityRegistries(entity.sourceRegistries)
    .filter((source) => !/^(manual|user|seed|imported)$/i.test(source.trim()));
  if (registries.length > 0) return `${registries.length} public source${registries.length === 1 ? "" : "s"}`;
  if (entity.relationshipCount) return `${entity.relationshipCount} public connection${entity.relationshipCount === 1 ? "" : "s"}`;
  return "Evidence detail pending";
}
