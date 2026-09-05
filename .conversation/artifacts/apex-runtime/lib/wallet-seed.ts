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
      // Goals for operators / Boss — not a forced execution script for the dig model
      "Attribute a human holder only from citable public sources (or mark unattributed).",
      "Reject exchange/mixer/protocol treasuries as non-person targets when labels say so.",
      "Once a holder is sourced, maximize attributable people-contacts (fail-closed).",
      "Wallet value is wealth evidence after attribution — not identity by itself.",
    ],
    searchQueries: [
      // Thin seeds only — agentic / Boss invent the real dig
      `"${addr}"`,
      seed.chain === "eth" ? `"${addr}" ethereum` : `"${addr}" bitcoin`,
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

/**
 * Gated public balance probe (optional wealth signal).
 * Fail-closed: never invent balances; only public free endpoints; rate-limit friendly.
 * No private RPC keys. Call only after attribution or for prioritization of known beefy candidates.
 */
export type WalletBalanceProbe = {
  address: string;
  chain: WalletChain;
  usdApprox: number | null;
  nativeBalance: string | null;
  source: string;
  fetchedAt: string;
  error?: string;
};

const ETHPLORER_FREE = "https://api.ethplorer.io/getAddressInfo";

/**
 * Probe ETH balance via Ethplorer freekey (public, no key burn).
 * Returns null on any failure / non-ETH / rate limit.
 */
export async function probeWalletBalance(
  seed: WalletSeed,
  opts?: { timeoutMs?: number }
): Promise<WalletBalanceProbe | null> {
  if (seed.chain !== "eth") {
    return {
      address: seed.address,
      chain: seed.chain,
      usdApprox: null,
      nativeBalance: null,
      source: "none",
      fetchedAt: new Date().toISOString(),
      error: "balance probe only implemented for eth (btc pending public endpoint)",
    };
  }
  const timeoutMs = Math.min(12_000, opts?.timeoutMs ?? 8_000);
  const url = `${ETHPLORER_FREE}/${seed.normalized}?apiKey=freekey`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "ApexAtlas/1.0 (public research)" },
    });
    if (!res.ok) {
      return {
        address: seed.address,
        chain: "eth",
        usdApprox: null,
        nativeBalance: null,
        source: "ethplorer",
        fetchedAt: new Date().toISOString(),
        error: `http_${res.status}`,
      };
    }
    const data = (await res.json()) as {
      ETH?: { balance?: number; price?: { rate?: number } };
      error?: { message?: string };
    };
    if (data?.error) {
      return {
        address: seed.address,
        chain: "eth",
        usdApprox: null,
        nativeBalance: null,
        source: "ethplorer",
        fetchedAt: new Date().toISOString(),
        error: data.error.message || "api_error",
      };
    }
    const bal = data?.ETH?.balance;
    const rate = data?.ETH?.price?.rate;
    const native = typeof bal === "number" ? String(bal) : null;
    let usd: number | null = null;
    if (typeof bal === "number" && typeof rate === "number" && rate > 0) {
      usd = Math.round(bal * rate);
    }
    return {
      address: seed.address,
      chain: "eth",
      usdApprox: usd,
      nativeBalance: native,
      source: "ethplorer",
      fetchedAt: new Date().toISOString(),
    };
  } catch (e: any) {
    return {
      address: seed.address,
      chain: "eth",
      usdApprox: null,
      nativeBalance: null,
      source: "ethplorer",
      fetchedAt: new Date().toISOString(),
      error: e?.name === "AbortError" ? "timeout" : String(e?.message || e).slice(0, 120),
    };
  } finally {
    clearTimeout(t);
  }
}

/** True when probe indicates above beefy threshold (for prioritization only). */
export function isBeefyFromProbe(probe: WalletBalanceProbe | null, threshold = DEFAULT_BEEFY_USD_THRESHOLD): boolean {
  if (!probe || probe.usdApprox == null) return false;
  return probe.usdApprox >= threshold;
}
