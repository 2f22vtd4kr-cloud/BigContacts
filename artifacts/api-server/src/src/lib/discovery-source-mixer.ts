/**
 * Discovery source mixer — randomized, mixed Western-ally target finding.
 *
 * Goals:
 * - Mix registry anchors (EU/UK/Nordic/US), FAA plane owners, and web search recipes
 * - Stay within Western-world ally geography (Japan → USA, plus UAE for Dubai routes)
 * - Avoid fixed sequential bias: each cycle picks a shuffled balanced slate
 * - Replit-safe: pure TS, no new infra, cheap defaults
 *
 * Real public data only. No synthetic people or contacts.
 */

export type DiscoverySourceKind = "registry" | "faa" | "broad_web";

/** Western ally / partner jurisdictions used for discovery framing (Japan → USA + UAE). */
export const WESTERN_ALLY_COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Ireland",
  "Norway", "Sweden", "Denmark", "Finland", "Iceland",
  "Germany", "France", "Netherlands", "Belgium", "Luxembourg",
  "Switzerland", "Austria", "Italy", "Spain", "Portugal",
  "Poland", "Czech Republic", "Slovakia", "Slovenia", "Croatia",
  "Estonia", "Latvia", "Lithuania",
  "Australia", "New Zealand",
  "Japan", "South Korea", "Singapore",
  "United Arab Emirates", // Dubai / Abu Dhabi investment routes (explicit product scope)
] as const;

/**
 * Broad-discovery template category IDs that stay inside Western-ally scope.
 * Excludes category 9 (Latin America & non-ally Eastern Europe) by default.
 * Category 13 (Middle East) is optional and UAE-weighted when used.
 */
export const WESTERN_BROAD_CATEGORY_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 14, 15] as const;

export type MixedDiscoverySlot =
  | {
      kind: "registry";
      id: string;
      label: string;
      registryHint: string;
      geography: string;
    }
  | {
      kind: "faa";
      id: string;
      label: string;
      geography: string;
    }
  | {
      kind: "broad_web";
      id: string;
      label: string;
      category: number;
      exampleQueries: string[];
      geography: string;
    };

/** Static pool of mixed discovery slots (registry + FAA + web recipes). */
export const MIXED_DISCOVERY_POOL: MixedDiscoverySlot[] = [
  {
    kind: "registry",
    id: "reg-uk-ch",
    label: "UK Companies House — officers / PSC routes",
    registryHint: "Companies House",
    geography: "United Kingdom",
  },
  {
    kind: "registry",
    id: "reg-us-edgar",
    label: "US EDGAR — filings / insider & issuer principals",
    registryHint: "EDGAR",
    geography: "United States",
  },
  {
    kind: "registry",
    id: "reg-no-brreg",
    label: "Norway BRREG — company directors",
    registryHint: "BRREG",
    geography: "Norway",
  },
  {
    kind: "registry",
    id: "reg-fr-bodacc",
    label: "France BODACC / EU commercial register anchors",
    registryHint: "BODACC",
    geography: "France",
  },
  {
    kind: "registry",
    id: "reg-eu-gleif",
    label: "EU / GLEIF — LEI and legal-entity anchors",
    registryHint: "GLEIF",
    geography: "European Union",
  },
  {
    kind: "faa",
    id: "faa-n-number",
    label: "FAA aircraft owner (N-number) — US plane ownership",
    geography: "United States",
  },
  {
    kind: "broad_web",
    id: "web-nordic-invest",
    label: "Web: investment companies / family offices — Nordic",
    category: 7,
    exampleQueries: [
      '"investment company" OR "family office" Norway (founder OR principal OR partner)',
      '"private equity" Stockholm Oslo Copenhagen (managing partner OR founder)',
      "Norwegian investment company director profile",
    ],
    geography: "Norway / Nordics",
  },
  {
    kind: "broad_web",
    id: "web-dubai-tech",
    label: "Web: Dubai tech / investment companies",
    category: 13,
    exampleQueries: [
      '"Dubai" ("tech company" OR "technology") (founder OR CEO OR principal) profile',
      '"Dubai" ("investment company" OR "family office") (founder OR managing partner)',
      "Dubai free zone technology company owner founder",
    ],
    geography: "United Arab Emirates",
  },
  {
    kind: "broad_web",
    id: "web-jp-invest",
    label: "Web: Japan investment / business principals",
    category: 8,
    exampleQueries: [
      "Japan (family office OR investment company) (founder OR principal) profile",
      "Tokyo (private equity OR venture) (managing partner OR founder)",
      "Japanese company owner chairman billionaire profile",
    ],
    geography: "Japan",
  },
  {
    kind: "broad_web",
    id: "web-us-family-office",
    label: "Web: US family offices & private wealth",
    category: 1,
    exampleQueries: [
      '"family office" (founder OR principal) (New York OR California OR Texas) profile',
      "United States private investment office managing partner",
    ],
    geography: "United States",
  },
  {
    kind: "broad_web",
    id: "web-uk-pe",
    label: "Web: UK PE / investment groups",
    category: 10,
    exampleQueries: [
      '"private equity" London (general partner OR managing partner) profile',
      "UK investment company founder principal",
    ],
    geography: "United Kingdom",
  },
  {
    kind: "broad_web",
    id: "web-eu-venues",
    label: "Web: European operators / venue & estate principals",
    category: 6,
    exampleQueries: [
      "European (hotel OR resort OR estate) owner founder director profile",
      "Italy France Germany (company owner OR principal) investment profile",
    ],
    geography: "European Union",
  },
  {
    kind: "broad_web",
    id: "web-aviation-luxury",
    label: "Web: aviation / luxury asset ownership (Western)",
    category: 2,
    exampleQueries: [
      "private jet owner (United States OR Europe) profile",
      "superyacht owner Mediterranean Europe profile",
    ],
    geography: "United States / Europe",
  },
  {
    kind: "broad_web",
    id: "web-au-nz",
    label: "Web: Australia / New Zealand principals",
    category: 5,
    exampleQueries: [
      "Australia (family office OR investment company) (founder OR principal)",
      "New Zealand company founder owner investment profile",
    ],
    geography: "Australia / New Zealand",
  },
];

function shuffleInPlace<T>(items: T[], rng: () => number = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/**
 * Build a randomized mixed slate for one discovery cycle.
 * Ensures variety: try to include at least one registry, one web, and optionally FAA
 * without repeating the same slot id back-to-back when priorIds provided.
 */

/** E residual: prefer officer/director/shareholder/founder recipes over pure entity shells. */
function personRecipeScore(slot: MixedDiscoverySlot): number {
  const queries =
    slot.kind === "broad_web" && Array.isArray(slot.exampleQueries)
      ? slot.exampleQueries.join(" ")
      : "";
  const hint = slot.kind === "registry" ? String(slot.registryHint ?? "") : "";
  const text = `${slot.label} ${queries} ${hint}`.toLowerCase();
  let score = 0;
  if (/\b(officer|director|psc|shareholder|beneficial owner|board)\b/.test(text)) score += 3;
  if (/\b(founder|co-founder|managing partner|general partner|principal|ceo|operator)\b/.test(text)) score += 2;
  if (slot.kind === "broad_web") score += 1;
  if (slot.kind === "registry") score += 1;
  // Pure legal-entity anchors without person language rank lower for person-scoped discovery.
  if (/\b(lei|legal-entity|legal entity)\b/.test(text) && !/\b(officer|director|psc|shareholder)\b/.test(text)) {
    score -= 2;
  }
  return score;
}

function sortByPersonRecipe(slots: MixedDiscoverySlot[], rng: () => number): MixedDiscoverySlot[] {
  // Stable-ish: score desc, then light shuffle within same score band.
  const scored = slots.map((slot, index) => ({
    slot,
    score: personRecipeScore(slot),
    jitter: rng(),
    index,
  }));
  scored.sort((a, b) => b.score - a.score || a.jitter - b.jitter || a.index - b.index);
  return scored.map((row) => row.slot);
}

export function pickMixedDiscoverySlots(options?: {
  count?: number;
  includeFaa?: boolean;
  priorSlotIds?: string[];
  rng?: () => number;
}): MixedDiscoverySlot[] {
  const count = Math.max(3, Math.min(options?.count ?? 8, MIXED_DISCOVERY_POOL.length));
  const includeFaa = options?.includeFaa ?? true;
  const prior = new Set(options?.priorSlotIds ?? []);
  const rng = options?.rng ?? Math.random;

  const pool = MIXED_DISCOVERY_POOL.filter((slot) => {
    if (slot.kind === "faa" && !includeFaa) return false;
    return true;
  });

  // Person-first within each kind: officers/directors/founders before pure shells.
  const registries = sortByPersonRecipe(pool.filter((s) => s.kind === "registry"), rng);
  const webs = sortByPersonRecipe(pool.filter((s) => s.kind === "broad_web"), rng);
  const faas = shuffleInPlace(pool.filter((s) => s.kind === "faa"), rng);

  const picked: MixedDiscoverySlot[] = [];
  const used = new Set<string>();

  const take = (slot: MixedDiscoverySlot | undefined) => {
    if (!slot || used.has(slot.id) || prior.has(slot.id)) return false;
    picked.push(slot);
    used.add(slot.id);
    return true;
  };

  // Prefer highest person-recipe registry + web first.
  take(registries.find((s) => !prior.has(s.id)) ?? registries[0]);
  take(webs.find((s) => !prior.has(s.id)) ?? webs[0]);
  if (includeFaa) take(faas[0]);
  // Second person-leaning registry when budget allows (officer/director harvest).
  take(registries.find((s) => !used.has(s.id) && !prior.has(s.id)));

  const remainder = shuffleInPlace(
    pool.filter((s) => !used.has(s.id)),
    rng,
  );
  for (const slot of remainder) {
    if (picked.length >= count) break;
    const lastKind = picked[picked.length - 1]?.kind;
    const secondLast = picked[picked.length - 2]?.kind;
    if (lastKind && secondLast && lastKind === secondLast && slot.kind === lastKind) {
      continue;
    }
    take(slot);
  }

  for (const slot of shuffleInPlace([...pool], rng)) {
    if (picked.length >= count) break;
    if (!used.has(slot.id)) {
      picked.push(slot);
      used.add(slot.id);
    }
  }

  return picked.slice(0, count);
}

/** Atlas-compatible source descriptors for one randomized cycle. */
export type AtlasDiscoverySource =
  | { kind: "broad"; category: number; label: string; slotId: string }
  | { kind: "registry"; label: string; slotId: string; clearFirst?: boolean }
  | { kind: "faa"; label: string; slotId: string };

export function slotsToAtlasSources(slots: MixedDiscoverySlot[]): AtlasDiscoverySource[] {
  return slots.map((slot) => {
    if (slot.kind === "registry") {
      return { kind: "registry" as const, label: slot.label, slotId: slot.id };
    }
    if (slot.kind === "faa") {
      return { kind: "faa" as const, label: slot.label, slotId: slot.id };
    }
    return {
      kind: "broad" as const,
      category: slot.category,
      label: slot.label,
      slotId: slot.id,
    };
  });
}

/** Case Bureau discovery candidate lanes reflecting mixed Western sources. */
export function buildMixedDiscoveryCandidateLanes(): string[] {
  return [
    "Randomized Western registry anchors (Companies House, EDGAR, BRREG, BODACC, GLEIF)",
    "FAA / aviation ownership routes (US N-number owners) when scheduled in the mix",
    "Web: Nordic and Northern European investment companies & family offices",
    "Web: Dubai / UAE tech and investment company principals",
    "Web: Japan and other allied Asian wealth-centre principals",
    "Web: UK / US PE, family offices, and operator-investors",
    "Web: European business owners, venues, and private-company principals",
    "Practical introduction routes only — no celebrity-only fame targets",
  ];
}

export const MIXED_DISCOVERY_GEOGRAPHY =
  "Western ally jurisdictions from Japan to the United States (EU/EEA, UK, US, Canada, Australia, New Zealand, Japan, South Korea, Singapore), plus UAE routes such as Dubai tech and investment companies. Exclude non-ally regions unless the human explicitly expands scope.";

/** Short block for Boss discovery prompts. */
export function formatMixedDiscoveryGuidance(slots?: MixedDiscoverySlot[]): string {
  const slate = slots ?? pickMixedDiscoverySlots({ count: 6, includeFaa: true });
  const lines = slate.map((s, i) => {
    if (s.kind === "broad_web") {
      return `${i + 1}. [web] ${s.label} — e.g. ${s.exampleQueries[0] ?? s.geography}`;
    }
    if (s.kind === "faa") {
      return `${i + 1}. [faa] ${s.label}`;
    }
    return `${i + 1}. [registry] ${s.label} (${s.registryHint})`;
  });
  return [
    "Use a randomized MIX of discovery sources this cycle (not one fixed pipeline):",
    ...lines,
    "Geography: " + MIXED_DISCOVERY_GEOGRAPHY,
    "Admit review-only candidates with exact public source URLs only. Do not invent people or wealth.",
  ].join("\n");
}

/** Pick a western broad category, avoiding lastUsed when possible. */
export function pickWesternBroadCategory(lastUsed?: number, rng: () => number = Math.random): number {
  const ids = WESTERN_BROAD_CATEGORY_IDS.filter((id) => id !== lastUsed);
  const pool = ids.length ? ids : [...WESTERN_BROAD_CATEGORY_IDS];
  return pool[Math.floor(rng() * pool.length)]!;
}
