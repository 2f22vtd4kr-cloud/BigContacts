/**
 * Pitch Generator — hyper-personalised outreach targeting the warm-introduction
 * gatekeeper, engineered to "get close to the body" of the HNWI.
 *
 * Philosophy: We NEVER pitch the HNWI directly. We find the single person in
 * their ecosystem who has PERSONAL (not professional) access and craft a pitch
 * tailored to their relationship type, psychology, and contact channel.
 *
 * Gatekeeper types and optimal approach vectors:
 *   Geometra / Land agent   → WhatsApp, 5-10% referral commission, property angle
 *   Safari PH / Hunting     → WhatsApp off-season (Oct-Nov), goodwill + exclusivity angle
 *   Yacht broker / Captain  → Signal or WhatsApp, marina season timing, vessel angle
 *   Club member / Introducer → Personal email, mutual-interest angle, no commission
 *   Family office           → Formal letter + follow-up call, professional tone
 *   Corporate director      → LinkedIn + email, corporate angle
 */

import { PathStep } from "./mcts-agent";

export interface PitchContext {
  targetEntity: {
    name: string;
    type: string;
    nationality?: string | null;
    estimatedNetWorth?: number | null;
    knownResidences?: string | null;
    notes?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
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

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtValue(v: number | null | undefined): string {
  if (!v) return "undisclosed";
  if (v >= 1e9) return `€${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `€${(v / 1e6).toFixed(1)}M`;
  return `€${v.toLocaleString()}`;
}

function fmtAssets(assets: PitchContext["assets"]): { primary: string; detail: string } {
  if (!assets.length) return { primary: "significant assets", detail: "" };
  const byType: Record<string, typeof assets> = {};
  for (const a of assets) {
    byType[a.category] ??= [];
    byType[a.category]!.push(a);
  }
  const parts: string[] = [];
  const lines: string[] = [];
  if (byType["RealEstate"]) {
    const re = byType["RealEstate"]!;
    parts.push(`${re.length} property holding${re.length > 1 ? "s" : ""}`);
    const f = re[0]!;
    if (f.address) lines.push(`Real estate: ${f.address} (${f.jurisdiction})`);
    else lines.push(`Real estate: ${f.identifier} — ${f.jurisdiction}`);
  }
  if (byType["Aviation"]) {
    const av = byType["Aviation"]!;
    parts.push(`private aviation (${av.map((a) => a.identifier).join(", ")})`);
    lines.push(`Aircraft: ${av.map((a) => `${a.identifier} / ${a.jurisdiction}`).join("; ")}`);
  }
  if (byType["Marine"]) {
    const ma = byType["Marine"]!;
    parts.push(`superyacht${ma.length > 1 ? "s" : ""} (${ma.map((a) => a.identifier).join(", ")})`);
    lines.push(`Marine: ${ma.map((a) => a.identifier).join(", ")} — ${ma[0]!.jurisdiction}`);
  }
  if (byType["PrivateClub"]) {
    const cl = byType["PrivateClub"]!;
    parts.push(`exclusive club memberships`);
    lines.push(`Clubs: ${cl.map((a) => a.identifier).join(", ")}`);
  }
  return {
    primary: parts.join(", ") || "multi-jurisdictional assets",
    detail: lines.join("\n"),
  };
}

// ─── Gatekeeper-type detection ────────────────────────────────────────────────

type GkClass =
  | "GEOMETRA"
  | "SAFARI_PH"
  | "YACHT_BROKER"
  | "MARINA"
  | "CLUB_MEMBER"
  | "FAMILY_OFFICE"
  | "CORPORATE"
  | "GENERIC";

function classifyGatekeeper(gk: PathStep | null): GkClass {
  if (!gk) return "GENERIC";
  const label = (gk.label + " " + (gk.registry ?? "") + " " + (gk.actionRequired ?? "")).toLowerCase();
  if (/geometra|catasto|land agent|surveyor|notai/.test(label)) return "GEOMETRA";
  if (/safari|hunting|ph\b|professional hunter|wildlife|kenya|laikipia|kariuki/.test(label)) return "SAFARI_PH";
  if (/yacht broker|yacht management|superyacht|captain|marina manager/.test(label)) return "YACHT_BROKER";
  if (/marina|port captain|harbour/.test(label)) return "MARINA";
  if (/club|member|boodle|pratt|circolo|caccia|ferrari|gentleman/.test(label)) return "CLUB_MEMBER";
  if (/family office|trustee|fiduciary|wealth manager|private bank/.test(label)) return "FAMILY_OFFICE";
  if (/director|ceo|cfo|company|corporate|secretary/.test(label)) return "CORPORATE";
  return "GENERIC";
}

function contactChannel(gk: PathStep | null, gkClass: GkClass): string {
  if (!gk) return "professional email";
  const a = (gk.actionRequired ?? "").toLowerCase();
  if (a.includes("whatsapp")) return "WhatsApp";
  if (a.includes("signal")) return "Signal";
  if (gkClass === "GEOMETRA") return "WhatsApp";
  if (gkClass === "SAFARI_PH") return "WhatsApp";
  if (gkClass === "YACHT_BROKER" || gkClass === "MARINA") return "WhatsApp or Signal";
  if (gkClass === "CLUB_MEMBER") return "personal email";
  if (gkClass === "FAMILY_OFFICE") return "formal letter followed by phone";
  return "professional email";
}

function commissionLine(gkClass: GkClass, pathScore: number): string {
  const strong = pathScore >= 0.7;
  switch (gkClass) {
    case "GEOMETRA":
      return strong
        ? "\n\nWe are prepared to offer a referral arrangement of 5–8% of any transaction value that materialises from this introduction — paid discreetly and promptly upon completion."
        : "\n\nWe are happy to discuss a discreet referral arrangement should an introduction lead to a completed transaction.";
    case "SAFARI_PH":
      return "\n\nThere is no financial expectation on your part — we simply ask for a brief, informal word at the right moment. We appreciate that your relationship with your clients is built on absolute discretion, and we will never compromise that.";
    case "YACHT_BROKER":
      return strong
        ? "\n\nWe would be pleased to discuss a referral fee of 3–5% for a successful introduction. All arrangements would be handled with full confidentiality."
        : "\n\nA modest referral consideration would naturally be offered for any introduction that leads to a transaction.";
    case "MARINA":
      return "\n\nNo financial expectation is implied — we simply ask for a discreet word or an informal introduction at a moment convenient to all parties.";
    case "CLUB_MEMBER":
      return "\n\nThis is entirely a peer-to-peer conversation — no financial arrangement is suggested or expected. Pure discretion, as one would expect between members.";
    case "FAMILY_OFFICE":
      return "\n\nWe are open to structuring an appropriate arrangement that respects your fiduciary obligations and compensates your involvement appropriately.";
    default:
      return "\n\nA discreet arrangement can be discussed should an introduction lead to a completed transaction.";
  }
}

function timingAdvice(gkClass: GkClass, notes: string): string {
  const n = notes.toLowerCase();
  if (gkClass === "SAFARI_PH") {
    const isSummer = /jan|feb|mar/.test(new Date().toLocaleDateString("en", { month: "short" }).toLowerCase());
    if (isSummer) return "TIMING: Client is likely in camp — approach AFTER season ends (April). Optimal window: September–November (pre-season booking period).";
    return "TIMING: Optimal approach now — pre-season booking window. Client not yet in camp.";
  }
  if (gkClass === "YACHT_BROKER" && n.includes("monaco")) {
    return "TIMING: Monaco Grand Prix (May) and Monaco Yacht Show (September) create natural social contexts. Off-season (Nov–Feb) optimal for direct approach.";
  }
  if (gkClass === "GEOMETRA") {
    return "TIMING: No seasonal restriction. Italian property activity peaks March–June and September–October. WhatsApp approach works year-round.";
  }
  return "";
}

// ─── Intelligence summary block ───────────────────────────────────────────────

function intelBlock(
  ctx: PitchContext,
  gkClass: GkClass,
  channel: string,
  timing: string,
  assets: ReturnType<typeof fmtAssets>
): string {
  const score = (ctx.pathScore * 100).toFixed(0);
  const confidence = ctx.pathScore >= 0.75 ? "APEX" : ctx.pathScore >= 0.5 ? "HIGH" : "MODERATE";
  const pathDesc = ctx.winningPath
    .filter((p) => p.role !== "TARGET")
    .map((p) => `${p.role}: ${p.label}`)
    .join(" → ");

  const lines = [
    `TARGET:       ${ctx.targetEntity.name} (${ctx.targetEntity.type})`,
    `CONFIDENCE:   ${confidence} — ${score}/100`,
    `CHANNEL:      ${channel}`,
    ctx.targetEntity.contactEmail ? `CONTACT:      ${ctx.targetEntity.contactEmail}` : null,
    ctx.targetEntity.contactPhone ? `PHONE:        ${ctx.targetEntity.contactPhone}` : null,
    ctx.gatekeeper ? `GATEKEEPER:   ${ctx.gatekeeper.label} via ${ctx.gatekeeper.registry ?? "Intel"}` : null,
    `PATH:         ${pathDesc}`,
    assets.detail ? `ASSETS:\n${assets.detail.split("\n").map((l) => `  ${l}`).join("\n")}` : null,
    ctx.targetEntity.notes ? `NOTES:        ${ctx.targetEntity.notes.split("\n")[0]}` : null,
    timing ? `\n${timing}` : null,
  ].filter(Boolean);

  const guardrails = [
    `\n[PUBLIC DATA: All intelligence sourced exclusively from public registries, open corporate filings, and OSINT. No private or protected data was accessed.]`,
    `[OPT-OUT: To cease all contact regarding this matter, reply "REMOVE" — no further approach will be made and your details will be purged.]`,
  ].join("\n");
  return `\n\n---\nAPEX INTELLIGENCE BRIEF\n${lines.join("\n")}\n\n${guardrails}`;
}

// ─── Template builder ─────────────────────────────────────────────────────────

export function generatePitch(ctx: PitchContext): string {
  const { targetEntity, gatekeeper, assets, winningPath, pathScore } = ctx;
  const gkClass = classifyGatekeeper(gatekeeper);
  const channel = contactChannel(gatekeeper, gkClass);
  const commission = commissionLine(gkClass, pathScore);
  const timing = timingAdvice(gkClass, targetEntity.notes ?? "");
  const assetSummary = fmtAssets(assets);
  const netWorth = fmtValue(targetEntity.estimatedNetWorth);
  const residence = targetEntity.knownResidences
    ? ` — based ${targetEntity.knownResidences}`
    : targetEntity.nationality
      ? ` (${targetEntity.nationality})`
      : "";
  const ts = new Date().toISOString().split("T")[0];
  const intel = intelBlock(ctx, gkClass, channel, timing, assetSummary);

  // ── GEOMETRA ──────────────────────────────────────────────────────────────
  if (gkClass === "GEOMETRA") {
    return `
Buongiorno ${gatekeeper?.label?.split(" ")[0] ?? ""},

La contatto in via del tutto riservata in merito a una questione professionale che la riguarda indirettamente.

La nostra piattaforma di intelligence privata ha identificato ${targetEntity.name}${residence} come potenziale partecipante a un'operazione d'investimento di carattere confidenziale. Dai registri catastali risulta che lei intrattiene rapporti professionali con il portafoglio immobiliare riferibile a questo nominativo.

Siamo interessati esclusivamente a ottenere una breve presentazione — gestita interamente attraverso di lei, senza alcun contatto diretto non concordato con l'intestatario. Non siamo interessati agli immobili: il nostro obiettivo è unicamente una conversazione riservata su un'opportunità separata.${commission}

La sua collaborazione verrebbe trattata con la massima riservatezza. Nessuna mia azione creerà complessità o imbarazzo nella sua posizione professionale.

È disponibile per una breve chiamata a sua convenienza?

Con stima,
[Il tuo nome]
ApexFinder Intelligence Division
${ts}${intel}
    `.trim();
  }

  // ── SAFARI / HUNTING PH ───────────────────────────────────────────────────
  if (gkClass === "SAFARI_PH") {
    const phFirst = gatekeeper?.label?.split(" ")[0] ?? "";
    return `
Hi ${phFirst},

I hope the season has treated you well.

I'm reaching out on a matter that I'll keep brief and entirely off the record. We are a private intelligence platform that works with select families and investment groups. Through our research, we have identified ${targetEntity.name}${residence} as someone whose investment profile aligns with a confidential opportunity we are exploring.

I understand you have a trusted working relationship built on absolute discretion — and that is precisely why I'm reaching out to you rather than through any formal channel. I have no interest in creating any awkwardness or complexity in your relationship with your client.

I'm simply asking whether, at an appropriate quiet moment — perhaps over a drink at the end of a day — you might mention that a private group is interested in a brief, no-pressure conversation. Nothing more. If there's no interest, we move on entirely.${commission}

I realise this is an unusual ask. I would not be making it unless I believed it could be handled with the discretion you are known for.

Would you be open to a brief call?

Best regards,
[Your name]
ApexFinder Intelligence Division
${ts}${intel}
    `.trim();
  }

  // ── YACHT BROKER / CAPTAIN ────────────────────────────────────────────────
  if (gkClass === "YACHT_BROKER" || gkClass === "MARINA") {
    return `
Dear ${gatekeeper?.label ?? ""},

I am contacting you discreetly in connection with ${targetEntity.name}${residence}, a beneficial owner with documented interests in ${assetSummary.primary}.

Our platform has identified a private investment opportunity that may be of interest to ${targetEntity.name}. Given your professional proximity — and the trust inherent in the maritime relationship — I am reaching out to you as the most appropriate introduction point.

We are not interested in the vessel or any maritime transaction. Our interest is in a brief, confidential conversation on a separate matter — entirely at a time and format that ${targetEntity.name} would find comfortable.${commission}

Your discretion is assumed and appreciated. All communication between us would naturally remain entirely private.

I would welcome a ${channel} conversation at your convenience.

With respect,
[Your name]
ApexFinder Intelligence Division
${ts}${intel}
    `.trim();
  }

  // ── CLUB MEMBER ───────────────────────────────────────────────────────────
  if (gkClass === "CLUB_MEMBER") {
    return `
Dear ${gatekeeper?.label ?? ""},

I hope this message finds you well.

I am reaching out as a fellow enthusiast — with a request that I will keep brief and entirely in the spirit of the trust that defines our community.

Our platform has mapped an opportunity that may be of genuine interest to ${targetEntity.name}${residence}. I understand you share a connection — whether through ${gatekeeper?.registry ?? "a common circle"} or otherwise — and I am reaching out simply to ask whether an informal word might be possible.

There is no financial expectation, no pressure, and no formal arrangement suggested. If ${targetEntity.name} has no interest, we would never follow up. We are simply looking for a moment in a natural setting — perhaps you could mention that a private group expressed interest in a quiet conversation.${commission}

I appreciate the unusual nature of this request. I would not make it if I did not believe it could be handled with the same discretion that governs our shared circles.

Warm regards,
[Your name]
ApexFinder Intelligence Division
${ts}${intel}
    `.trim();
  }

  // ── FAMILY OFFICE ─────────────────────────────────────────────────────────
  if (gkClass === "FAMILY_OFFICE") {
    return `
Dear ${gatekeeper?.label ?? ""},

I am writing in connection with your principal, ${targetEntity.name}${residence}, with a documented asset profile encompassing ${assetSummary.primary} (${netWorth}).

Our firm is a private intelligence and deal origination platform. We have identified an investment opportunity that closely matches the documented profile and deployment preferences of your principal's family office.

We are seeking a discreet, properly-channelled introduction — not a cold approach — and understand that all communication with your principal would appropriately flow through you. We are fully prepared to provide a formal NDA, a full information memorandum, and any other documentation you require before any conversation takes place.${commission}

I would welcome the opportunity to speak briefly by telephone at your convenience. All matters discussed would remain strictly confidential.

Respectfully,
[Your name]
ApexFinder Intelligence Division
${ts}${intel}
    `.trim();
  }

  // ── CORPORATE / GENERIC fallback (also serves as the exported generatePitch
  //    entry-point — guardrails are embedded in the intel block above) ──────
  const pathDesc = winningPath
    .filter((p) => p.role !== "TARGET")
    .map((p) => p.label)
    .join(" → ");

  const introLine = pathDesc
    ? `We have identified your professional connection to ${targetEntity.name}'s network (via ${pathDesc}) and are approaching you as the most appropriate introduction point for a confidential investment opportunity.`
    : `We have identified you as the most appropriate introduction point for a confidential investment opportunity involving ${targetEntity.name}.`;

  return `
Dear ${gatekeeper?.label ?? "Sir/Madam"},

I am reaching out discreetly regarding ${targetEntity.name}${residence}, ${netWorth}, holding ${assetSummary.primary}.

Our platform is a private intelligence and deal origination service. ${introLine}

We are seeking a brief, private introduction — handled entirely through you, with no unsolicited direct contact — to explore whether there is appetite for a conversation.${commission}

I would welcome a brief call at your convenience.

Respectfully,
[Your name]
ApexFinder Intelligence Division
${ts}${intel}
  `.trim();
}

// ── Outreach Sequence ─────────────────────────────────────────────────────────

export interface OutreachSequence {
  initial: string;
  followUp: string;
  introScript: string;
}

/**
 * Generate a complete 3-step outreach sequence:
 *  1. initial     — first message to gatekeeper (uses generatePitch)
 *  2. followUp    — 7-day follow-up if no response
 *  3. introScript — what the gatekeeper says to the HNWI in person
 */
export function generateOutreachSequence(ctx: PitchContext): OutreachSequence {
  const initial = generatePitch(ctx);
  const { targetEntity, gatekeeper, pathScore } = ctx;
  const gkClass = classifyGatekeeper(gatekeeper);
  const ts = new Date().toISOString().split("T")[0];
  const gkFirst = gatekeeper?.label?.split(" ")[0] ?? "there";
  const confidence = pathScore >= 0.75 ? "APEX" : "HIGH";
  const scoreStr = (pathScore * 100).toFixed(0);
  const targetFirst = targetEntity.name.split(" ").slice(-1)[0];
  const targetFull = targetEntity.name;

  // ── Follow-up message ─────────────────────────────────────────────────────
  const followUp = `
Following up on my note from last week, ${gkFirst}.

I appreciate that you receive many such approaches and guard your relationships carefully — that is precisely why you were identified as the right person.

Our interest in ${targetFull} remains active. If there is a more convenient format or timing for this conversation, we are entirely flexible — a call, a brief WhatsApp exchange, or even a written note to pass along is all we would need.

If this simply isn't the right moment, a brief word to that effect is all we ask and we will close our file without any further contact.

With respect,
[Your name]
ApexFinder Intelligence Division
${ts}

---
[APEX PATH SCORE: ${scoreStr}/100 — Confidence: ${confidence}]
[OPT-OUT: Reply "REMOVE" to cease all contact. Your details will be immediately purged.]
[PUBLIC DATA: All intelligence sourced exclusively from public registries and OSINT.]
  `.trim();

  // ── Introduction script ───────────────────────────────────────────────────
  let scriptBody = "";

  if (gkClass === "GEOMETRA") {
    scriptBody = `
Signor ${targetFirst}, approfitto di un momento tranquillo per dirle una cosa in via del tutto informale.

Mi hanno contattato — attraverso una referenza discreta — dei professionisti che gestiscono un'operazione d'investimento riservata. Non mi hanno fornito dettagli specifici, ma il profilo che cercano corrisponde a quello di persone con una visione di lungo periodo e capacità reali.

Non le sto chiedendo niente — le sto semplicemente dicendo che esiste questo contatto, nel caso volesse saperne di più. Se preferisce ignorarlo, capisco perfettamente e non ne parliamo più. Assoluta riservatezza, da parte mia.
    `.trim();
  } else if (gkClass === "SAFARI_PH") {
    scriptBody = `
${targetFirst}, there's something I wanted to mention — absolutely off the record, no agenda.

Some people reached out to me a few weeks back. Very discreet, clearly well-connected, did their homework. They expressed interest in a quiet conversation with someone matching your profile regarding a private investment matter.

I told them I couldn't promise anything — but I said I'd mention it if the moment felt right. This felt like the right moment. Entirely your call what you do with it. I won't raise it again.
    `.trim();
  } else if (gkClass === "YACHT_BROKER" || gkClass === "MARINA") {
    scriptBody = `
${targetFirst}, a word when you have a moment — nothing formal.

A group approached me through a professional contact. Very professional, very discreet. They had clearly done their research. They're interested in a brief, confidential conversation with you about a private investment opportunity — no pressure, no agenda beyond an introductory call.

I have no stake in this whatsoever — I simply thought it worth mentioning. Happy to make an introduction if you're curious, or drop it entirely if not. Your call completely.
    `.trim();
  } else if (gkClass === "CLUB_MEMBER") {
    scriptBody = `
${targetFirst}, something I wanted to mention in passing — nothing that needs to go further than this conversation.

I was approached recently by a very discreet group — clearly well-connected people who do their homework properly. They expressed interest in a quiet conversation with someone of your profile about a private investment matter.

I wouldn't ordinarily pass this kind of thing along, but they struck me as genuinely serious and they were emphatic about discretion. I told them nothing — I'm simply relaying that the interest exists. If you're curious, I can make a brief introduction. If you'd rather I let it drop, I completely understand — and it stops here.
    `.trim();
  } else if (gkClass === "CORPORATE") {
    scriptBody = `
${targetFirst}, I wanted to flag something informally before it goes through any formal channel.

A private group has reached out — they have a time-sensitive interest in a discreet conversation about an investment matter that aligns with your professional network. They approached me because of our connection, and specifically asked that any introduction be made through someone with direct access rather than through the usual channels.

If there's any appetite on your side, I'm happy to facilitate a brief introductory call. No paperwork, no pressure — purely exploratory. If this isn't the right moment, absolutely understood and I won't raise it again.
    `.trim();
  } else if (gkClass === "FAMILY_OFFICE") {
    scriptBody = `
I wanted to mention something informally before putting it through the formal channel.

A private group has reached out expressing interest in a conversation with your principal regarding a confidential investment matter. They've been very proper about it — offered full documentation, NDA, everything channelled through the office.

I wanted to flag it informally first before sending anything formal — just to see whether it's worth the paperwork.
    `.trim();
  } else {
    scriptBody = `
${targetFirst}, I wanted to mention something informally.

A private group reached out to me — they were looking for a discreet introduction to someone of your profile regarding a confidential investment matter. Brief — just an exploratory conversation, no commitment.

I thought of you. Entirely your call. I won't raise it again if you'd prefer.
    `.trim();
  }

  const introScript = `
=== GATEKEEPER INTRODUCTION SCRIPT ===
Deliver in person, casual setting — end of dinner, walking, a brief phone call.
Tone: warm, curious, zero pressure. Never read aloud — adapt naturally.
======================================

${scriptBody}

---
[APEX PATH: ${gkClass} vector — Score ${scoreStr}/100]
[TIMING: ${new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}]
[All data sourced from public registries only]
  `.trim();

  return { initial, followUp, introScript };
}
