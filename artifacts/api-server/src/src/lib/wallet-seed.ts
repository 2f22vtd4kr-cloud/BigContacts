/**
 * Wallet-first discovery seed for Apex Atlas.
 *
 * Lane: see a high-value wallet → attribute holder (fail-closed) → hand off to
 * person/company contact research. Wallets are also wealth evidence after person lock.
 *
 * Real public data only. Never invent a holder. Never mark contacts Personal from
 * chain data alone.
 */

export type WalletChain = "eth" | "btc" | "unknown";

export type WalletSeed = {
  address: string;
  chain: WalletChain;
  /** Normalized form used for lookups */
  normalized: string;
  /** Optional operator-supplied note (e.g. why this wallet was selected) */
  note?: string;
};

export type WalletAttributionStatus =
  | "unattributed"
  | "candidate_holder"
  | "attributed"
  | "rejected_non_human"
  | "rejected_no_evidence";

export type WalletSeedPlan = {
  seed: WalletSeed;
  /** Human-readable research objective for Boss / agentic loop */
  objective: string;
  /** Ordered public research steps — attribution before contact hops */
  steps: string[];
  /** Queries the agentic / Boss layer should run (public web only) */
  searchQueries: string[];
  rules: string[];
  /** Minimum USD-equivalent notion for "beefy" (config; balance fetch is separate) */
  beefyUsdThreshold: number;
};

const ETH_RE = /^0x[a-fA-F0-9]{40}$/;
/** Legacy + bech32 BTC (coarse; not a full BIP validator) */
const BTC_RE = /^(bc1[a-zA-HJ-NP-Z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;

/** Default "worth investigating" bar — operator can override per case */
export const DEFAULT_BEEFY_USD_THRESHOLD = 250_000;

/**
 * Detect and normalize a wallet string. Returns null if not a supported address shape.
 */
export function parseWalletSeed(raw: string, note?: string): WalletSeed | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (ETH_RE.test(trimmed)) {
    return {
      address: trimmed,
      chain: "eth",
      normalized: trimmed.toLowerCase(),
      note: note?.trim() || undefined,
    };
  }
  if (BTC_RE.test(trimmed)) {
    return {
      address: trimmed,
      chain: "btc",
      normalized: trimmed.startsWith("bc1") ? trimmed.toLowerCase() : trimmed,
      note: note?.trim() || undefined,
    };
  }
  return null;
}

/** True when text looks like it contains a wallet seed (case intake helper). */
export function extractWalletSeedsFromText(text: string): WalletSeed[] {
  const out: WalletSeed[] = [];
  const seen = new Set<string>();
  const ethHits = text.match(/\b0x[a-fA-F0-9]{40}\b/g) || [];
  const btcHits = text.match(/\b(?:bc1[a-zA-HJ-NP-Z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g) || [];
  for (const hit of [...ethHits, ...btcHits]) {
    const seed = parseWalletSeed(hit);
    if (!seed || seen.has(seed.normalized)) continue;
    seen.add(seed.normalized);
    out.push(seed);
  }
  return out;
}

/**
 * Build the fail-closed research plan for a wallet-first discovery seed.
 * Does not fetch balances or invent holders — only frames the investigation.
 */
export function buildWalletSeedPlan(
  seed: WalletSeed,
  opts?: { beefyUsdThreshold?: number; geography?: string },
): WalletSeedPlan {
  const threshold = opts?.beefyUsdThreshold ?? DEFAULT_BEEFY_USD_THRESHOLD;
  const geo = opts?.geography?.trim() || "Western-ally jurisdictions";
  const addr = seed.address;
  const chainLabel = seed.chain === "eth" ? "Ethereum" : seed.chain === "btc" ? "Bitcoin" : "crypto";

  return {
    seed,
    beefyUsdThreshold: threshold,
    objective:
      `Wallet-first discovery: attribute the holder of ${chainLabel} wallet ${addr}, ` +
      `confirm material holdings when public data allows, then maximize attributable people-contacts ` +
      `for that holder. Geography focus: ${geo}. Never invent a holder or contacts.`,
    steps: [
      "Classify wallet: EOA vs contract; reject known exchange/hot-wallet labels when public labels say so.",
      "Seek public attribution only: ENS/name service, news, interviews, company pages, filings, personal sites that publish this address.",
      "If no attributable human holder → status unattributed / rejected_no_evidence. STOP contact hops.",
      "If holder named with sourceUrls → person lock (candidate → attributed as evidence accumulates).",
      "Run person-scoped contact research (web directories, about/team, registries) — maximize people-contacts.",
      "Record wallet + public value signals as wealth evidence on the person; contacts stay fail-closed.",
    ],
    searchQueries: [
      `"${addr}"`,
      `"${addr}" (owner OR founder OR CEO OR "belongs to" OR ENS OR portfolio)`,
      `"${addr}" (interview OR "personal site" OR github OR linkedin OR company)`,
      seed.chain === "eth" ? `"${addr}" (etherscan OR ens)` : `"${addr}" (blockchain.com OR mempool OR "bitcoin")`,
    ],
    rules: [
      "Fail-closed: no holder name without citable public sourceUrls.",
      "Exchange, mixer, bridge, and protocol treasury wallets → rejected_non_human (not a person target).",
      "Never invent emails, phones, or Personal contacts from chain analysis alone.",
      "Org inboxes found later still organization scope.",
      "Wallet balance/value is wealth evidence after attribution — not a substitute for identity.",
      `Beefy bar for prioritization: ~$${threshold.toLocaleString()} USD-equivalent when balance data is available; absence of balance API does not invent value.`,
    ],
  };
}

/**
 * Format plan for Boss / investigator prompts and discovery case notes.
 */
export function formatWalletSeedPlanForPrompt(plan: WalletSeedPlan): string {
  return [
    `WALLET-FIRST SEED (${plan.seed.chain}): ${plan.seed.address}`,
    plan.seed.note ? `Operator note: ${plan.seed.note}` : null,
    `Objective: ${plan.objective}`,
    "Steps:",
    ...plan.steps.map((s, i) => `  ${i + 1}. ${s}`),
    "Suggested public queries:",
    ...plan.searchQueries.map((q) => `  - ${q}`),
    "Rules:",
    ...plan.rules.map((r) => `  - ${r}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Detect wallet-first objective text (discovery intake).
 */
export function objectiveLooksWalletFirst(objective: string): boolean {
  if (extractWalletSeedsFromText(objective).length > 0) return true;
  return /\b(wallet|0x[a-fA-F0-9]{40}|beefy\s+wallet|on-chain|crypto\s+holder)\b/i.test(objective);
}
