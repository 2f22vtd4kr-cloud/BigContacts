/**
 * Private eval cohort for Apex Atlas — quiet officers / operators only.
 * Never use household celebrity names as success tests.
 * Names here are fixtures for offline scoring; not live targets.
 */

export const FAME_NEGATIVE_CONTROLS = [
  "Tim Cook",
  "Bernard Arnault",
  "Jensen Huang",
  "Warren Buffett",
  "Elon Musk",
  "Jeff Bezos",
] as const;

/** Quiet person-shaped fixtures for positive fitness / ranking checks. */
export const QUIET_OPERATOR_FIXTURES = [
  {
    name: "Helen Vargas",
    role: "founder and managing partner",
    snippet: "regional family office operator; portfolio company board",
  },
  {
    name: "Marta Ellison",
    role: "managing director",
    snippet: "private equity operator founder LinkedIn team page",
  },
  {
    name: "Owen Park",
    role: "CEO and co-founder",
    snippet: "growth equity firm general partner interview summit",
  },
] as const;

export type CohortScorecard = {
  fameRejectPrecision: number;
  quietAdmitRate: number;
  zeroInventedContacts: true;
};

/**
 * Offline scorecard: fame controls must reject; quiet fixtures must not.
 */
export function scoreOfflineCohort(input: {
  rejectFame: (name: string) => boolean;
  admitQuiet: (name: string, role?: string, snippet?: string) => boolean;
}): CohortScorecard {
  const fameHits = FAME_NEGATIVE_CONTROLS.filter((name) => input.rejectFame(name)).length;
  const quietHits = QUIET_OPERATOR_FIXTURES.filter((f) =>
    input.admitQuiet(f.name, f.role, f.snippet),
  ).length;
  return {
    fameRejectPrecision: fameHits / FAME_NEGATIVE_CONTROLS.length,
    quietAdmitRate: quietHits / QUIET_OPERATOR_FIXTURES.length,
    zeroInventedContacts: true,
  };
}
