/**
 * Pitch Generator — produces hyper-personalized outreach messages
 * targeting the warm-introduction gatekeeper, not the HNWI directly.
 *
 * Analyzes the MCTS winning path, entity metadata, and asset data
 * to craft a context-specific WhatsApp/Email pitch that maximizes
 * the probability of a gatekeeper making the introduction.
 */

import { PathStep } from "./mcts-agent";

export interface PitchContext {
  targetEntity: {
    name: string;
    type: string;
    nationality?: string | null;
    estimatedNetWorth?: number | null;
    knownResidences?: string | null;
  };
  gatekeeper: PathStep | null;
  assets: Array<{
    category: string;
    identifier: string;
    jurisdiction: string;
    estimatedValue?: number | null;
    address?: string | null;
  }>;
  winningPath: PathStep[];
  pathScore: number;
}

function formatValue(value: number | null | undefined): string {
  if (!value) return "undisclosed";
  if (value >= 1_000_000_000) return `€${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(0)}K`;
  return `€${value.toFixed(0)}`;
}

function describeAssets(
  assets: PitchContext["assets"],
): { primary: string; details: string } {
  if (assets.length === 0) {
    return { primary: "significant assets", details: "" };
  }

  const byCategory: Record<string, typeof assets> = {};
  for (const a of assets) {
    byCategory[a.category] = byCategory[a.category] ?? [];
    byCategory[a.category]!.push(a);
  }

  const parts: string[] = [];
  const details: string[] = [];

  if (byCategory["RealEstate"]) {
    const re = byCategory["RealEstate"]!;
    parts.push(`${re.length} property holding${re.length > 1 ? "s" : ""}`);
    const first = re[0]!;
    if (first.address) details.push(`Real estate: ${first.address} (${first.jurisdiction})`);
  }
  if (byCategory["Aviation"]) {
    const av = byCategory["Aviation"]!;
    parts.push(`private aviation (${av.map((a) => a.identifier).join(", ")})`);
    details.push(`Aircraft: ${av.map((a) => `${a.identifier} — ${a.jurisdiction}`).join("; ")}`);
  }
  if (byCategory["Marine"]) {
    const ma = byCategory["Marine"]!;
    parts.push(`marine vessel${ma.length > 1 ? "s" : ""} (IMO ${ma.map((a) => a.identifier).join(", ")})`);
    details.push(`Marine: ${ma.map((a) => a.identifier).join(", ")} — ${ma[0]!.jurisdiction}`);
  }
  if (byCategory["PrivateClub"]) {
    const cl = byCategory["PrivateClub"]!;
    parts.push(`exclusive club memberships`);
    details.push(`Clubs: ${cl.map((a) => a.identifier).join(", ")}`);
  }

  return {
    primary: parts.length > 0 ? parts.join(", ") : "multi-jurisdictional assets",
    details: details.join("\n"),
  };
}

function getGatekeeperGreeting(gatekeeper: PathStep | null): string {
  if (!gatekeeper) return "Dear Sir/Madam";
  const name = gatekeeper.label.split(":")[0]?.trim() ?? gatekeeper.label;
  // Remove asset prefixes like "RealEstate: " from gatekeeper label
  const cleanName = gatekeeper.label.replace(/^(RealEstate|Aviation|Marine|Corporation|Trust|Gatekeeper):\s*/i, "");
  return `Dear ${cleanName.split(" ").slice(0, 2).join(" ")}`;
}

function getCommissionLine(gatekeeper: PathStep | null): string {
  if (!gatekeeper) return "";
  switch (gatekeeper.nodeType) {
    case "Gatekeeper":
      return "\n\nAs a token of appreciation for any introduction that leads to a successful business conversation, we are prepared to offer a referral arrangement of 5% of any transaction concluded — standard practice in our sector.";
    case "Corporation":
    case "Trust":
      return "\n\nWe would of course structure any arrangement in a manner that is mutually beneficial and appropriate to your position.";
    default:
      return "";
  }
}

function getRegistryVerificationLine(gatekeeper: PathStep | null): string {
  if (!gatekeeper?.registry) return "";
  return `\n\n[Our intelligence is derived from: ${gatekeeper.registry}]`;
}

/**
 * Generate a full personalized pitch targeting the gatekeeper node.
 */
export function generatePitch(ctx: PitchContext): string {
  const { targetEntity, gatekeeper, assets, winningPath, pathScore } = ctx;

  const assetSummary = describeAssets(assets);
  const netWorthStr = targetEntity.estimatedNetWorth
    ? `with an estimated net worth of ${formatValue(targetEntity.estimatedNetWorth)}`
    : "of significant means";
  const residenceStr = targetEntity.knownResidences
    ? ` based ${targetEntity.knownResidences}`
    : targetEntity.nationality
      ? ` (${targetEntity.nationality} national)`
      : "";

  const confidence = pathScore >= 0.7 ? "high" : pathScore >= 0.4 ? "moderate" : "initial";
  const greeting = getGatekeeperGreeting(gatekeeper);
  const commissionLine = getCommissionLine(gatekeeper);
  const registryLine = getRegistryVerificationLine(gatekeeper);

  const pathDescription = winningPath
    .filter((p) => p.role !== "TARGET")
    .map((p) => `${p.role}: ${p.label} (${p.nodeType})`)
    .join(" → ");

  const timestamp = new Date().toISOString().split("T")[0];

  // Select pitch template based on gatekeeper type
  let pitchBody: string;

  const gatekeeperType = gatekeeper?.nodeType ?? "Unknown";

  if (gatekeeperType === "Gatekeeper" || gatekeeperType === "Corporation") {
    pitchBody = `
I am reaching out discreetly in connection with a matter relating to ${targetEntity.name}${residenceStr}, ${netWorthStr}, holding ${assetSummary.primary}.

Our firm is a private intelligence and deal origination platform. We have identified ${targetEntity.name} as a potential participant in a confidential investment opportunity aligned with their documented asset profile (${assetSummary.primary}).

Given your professional proximity to ${targetEntity.name}, I believe you are positioned to facilitate a brief, private introduction — on terms that are entirely comfortable for all parties involved.${commissionLine}

This approach is made in good faith, with full discretion. No cold contact will be made with ${targetEntity.name} without your involvement and consent.

I would welcome a brief call at your convenience to discuss further.

With respect,
[Your Name]
ApexFinder Intelligence Division
${timestamp}

---
INTEL SUMMARY:
Target: ${targetEntity.name} (${targetEntity.type})
Path confidence: ${confidence.toUpperCase()} (score: ${(pathScore * 100).toFixed(0)}/100)
Introduction vector: ${pathDescription}
${assetSummary.details ? "Asset profile:\n" + assetSummary.details : ""}${registryLine}
    `.trim();
  } else if (gatekeeperType === "RealEstate" || gatekeeper?.role === "ASSET") {
    pitchBody = `
I am contacting you in your professional capacity regarding property/asset reference ${gatekeeper?.label ?? "on file"}.

Through registry cross-reference (${gatekeeper?.registry ?? "public sources"}), we have identified the beneficial interest in this asset as connected to ${targetEntity.name}${residenceStr}, ${netWorthStr}.

We represent a private investment group seeking a discreet, non-intrusive introduction to the beneficial owner. We are not interested in the asset itself — only in a brief, confidential conversation regarding a separate opportunity.${commissionLine}

Your cooperation would be treated with the utmost discretion. We have no intention of creating any discomfort or complexity for you professionally.

Would you be open to a brief call to explore how we might proceed?

With appreciation,
[Your Name]
ApexFinder Intelligence Division
${timestamp}

---
INTEL SUMMARY:
Target: ${targetEntity.name} (${targetEntity.type})
Asset on file: ${assetSummary.primary}
Path confidence: ${confidence.toUpperCase()} (score: ${(pathScore * 100).toFixed(0)}/100)
${assetSummary.details ? "Asset detail:\n" + assetSummary.details : ""}${registryLine}
    `.trim();
  } else {
    // Generic professional pitch
    pitchBody = `
I am reaching out regarding a matter of mutual potential interest involving ${targetEntity.name}${residenceStr}, ${netWorthStr}.

Our platform has identified a private investment opportunity that aligns with ${targetEntity.name}'s documented asset profile (${assetSummary.primary}). We are seeking a warm introduction — handled entirely through trusted intermediaries — to explore whether there is appetite for a brief, confidential discussion.

We have identified your connection to ${targetEntity.name}'s network via the path: ${pathDescription}.

Your discretion would be greatly appreciated, as would your assistance in facilitating this introduction.${commissionLine}

Please feel free to contact me at your earliest convenience.

Respectfully,
[Your Name]
ApexFinder Intelligence Division
${timestamp}

---
INTEL SUMMARY:
Target: ${targetEntity.name} (${targetEntity.type})
Path confidence: ${confidence.toUpperCase()} (score: ${(pathScore * 100).toFixed(0)}/100)
Introduction vector: ${pathDescription}
${assetSummary.details ? "Asset profile:\n" + assetSummary.details : ""}${registryLine}
    `.trim();
  }

  return pitchBody;
}
