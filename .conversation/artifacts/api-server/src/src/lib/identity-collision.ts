/**
 * Shared name/host collision heuristics for card promote and graph bind.
 * Pure functions — safe for unit tests without DB.
 */

const STOP = new Set(["the", "and", "for", "inc", "llc", "ltd", "company", "corp", "group", "plc"]);

export function identityNameTokens(value: string | null | undefined): string[] {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

const COLLISION_HOSTS = [
  "edwardjones", "edward-jones", "immunovant", "alvarezandmarsal", "alvarez-marsal",
  "fidelity", "vanguard", "schwab", "morganstanley", "goldmansachs",
  "andrewjohnsonbank", "bankofamerica", "wellsfargo", "jpmorgan", "citigroup",
  "raymondjames", "ameriprise", "northwesternmutual", "prudential",
  "merceradvisors", "mercer-advisors", "wealthadvisor", "wealth-advisor",
  "rocketreach", "zoominfo", "signalhire", "contactout", "apollo.io",
  "majesco", "bbgigroup", "bbgi.com",
  "spokeo", "whitepages", "beenverified", "intelius", "truepeoplesearch",
  "fastpeoplesearch", "thatsthem", "radaris", "peoplefinder",
  "hunter.io", "clearbit", "lusha",
  "crunchbase", "pitchbook", "bloomberg.com/profile",
  "dnb.com", "opencorporates", "bbb.org", "yelp.com",
  "yellowpages", "superpages", "manta.com", "bizapedia",
  "prospeo", "adapt.io", "growjo", "theorg.com", "equilar",
];

export type IdentityCollisionResult = {
  risk: boolean;
  identityMatch: number;
  reason: string | null;
};

/**
 * True when evidence blob/personName likely refers to a different person than target.
 *
 * Contact evidence is deliberately stricter than ordinary descriptive evidence:
 * an email/phone without an explicit person attribution is an organization/unknown
 * route, not proof that the target personally owns the contact. This boundary keeps
 * the promotion layer from turning `info@company.com` (or an unlabelled phone) into
 * a direct personal contact merely because the source page belongs to the company.
 */
export function assessIdentityCollision(input: {
  targetName: string;
  companyName?: string | null;
  personName?: string | null;
  value: string;
  sourceUrls: string[];
  note?: string | null;
}): IdentityCollisionResult {
  const targetToks = identityNameTokens(input.targetName);
  const companyToks = identityNameTokens(input.companyName);
  const blob = [
    input.personName ?? "",
    input.value,
    input.note ?? "",
    ...input.sourceUrls,
  ].join(" ").toLowerCase();

  const value = String(input.value ?? "").trim();
  const contactLike =
    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)
    || /^(?:\+?\d[\d\s().-]{6,})$/.test(value);

  // A contact with no named attribution must never be treated as personal merely
  // because the URL/domain contains the target company or target surname. The
  // caller can still retain it as an organization route / review-only evidence.
  if (contactLike && !input.personName?.trim()) {
    return {
      risk: true,
      identityMatch: 0.3,
      reason: "contact has no explicit person attribution; keep as organization/unknown route",
    };
  }

  if (companyToks.length && companyToks.some((t) => blob.includes(t))) {
    return { risk: false, identityMatch: 0.55, reason: null };
  }

  const overlap = targetToks.filter((t) => blob.includes(t));
  const hostHit = COLLISION_HOSTS.some((h) => blob.includes(h));
  if (hostHit && companyToks.length && !companyToks.some((t) => blob.includes(t))) {
    return {
      risk: true,
      identityMatch: 0.15,
      reason: "source host/org does not match target issuer; likely name collision",
    };
  }
  if (targetToks.length >= 2 && overlap.length === 0) {
    return {
      risk: true,
      identityMatch: 0.2,
      reason: "no name-token overlap between target and evidence blob",
    };
  }
  if (targetToks.length >= 2 && overlap.length === 1 && hostHit) {
    return {
      risk: true,
      identityMatch: 0.25,
      reason: "weak name overlap with collision-prone host",
    };
  }
  if (targetToks.length >= 2) {
    const surname = targetToks[targetToks.length - 1]!;
    if (surname.length >= 3 && !blob.includes(surname) && overlap.length < 2) {
      return {
        risk: true,
        identityMatch: 0.22,
        reason: "surname token missing from evidence blob; likely name collision",
      };
    }
  }
  const personToks = identityNameTokens(input.personName);
  if (targetToks.length >= 2 && personToks.length >= 2) {
    const targetSurname = targetToks[targetToks.length - 1]!;
    const personSurname = personToks[personToks.length - 1]!;
    if (
      targetSurname.length >= 3 &&
      personSurname.length >= 3 &&
      targetSurname !== personSurname
    ) {
      return {
        risk: true,
        identityMatch: 0.18,
        reason: `personName surname "${personSurname}" ≠ target surname "${targetSurname}"`,
      };
    }
  }
  return {
    risk: false,
    identityMatch: overlap.length >= 2 ? 0.65 : 0.45,
    reason: null,
  };
}

/**
 * Graph edge name-pair gate: reject same-first-name different-surname without shared id signal.
 */
export function assessGraphNamePairRisk(leftName: string, rightName: string): IdentityCollisionResult {
  const left = identityNameTokens(leftName);
  const right = identityNameTokens(rightName);
  if (left.length < 2 || right.length < 2) {
    return { risk: false, identityMatch: 0.4, reason: null };
  }
  const leftSur = left[left.length - 1]!;
  const rightSur = right[right.length - 1]!;
  if (leftSur !== rightSur && left[0] === right[0]) {
    return {
      risk: true,
      identityMatch: 0.2,
      reason: `same given name, different surname (${leftSur} vs ${rightSur})`,
    };
  }
  if (leftSur !== rightSur && !left.some((t) => right.includes(t))) {
    return {
      risk: true,
      identityMatch: 0.15,
      reason: "no shared name tokens between graph endpoints",
    };
  }
  return {
    risk: false,
    identityMatch: leftSur === rightSur ? 0.7 : 0.5,
    reason: null,
  };
}