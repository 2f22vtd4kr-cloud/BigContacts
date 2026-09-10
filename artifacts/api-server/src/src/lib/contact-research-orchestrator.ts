/**
 * Retired contact-research control plane.
 *
 * The previous coordinator encoded a deterministic sequence of persona -> web
 * OSINT -> Phase J work and could resume that sequence after a restart. That is
 * incompatible with the canonical Apex architecture: research strategy,
 * trajectory, tool choice, pivots, and stopping belong to the model-owned
 * Investigator path.
 *
 * The public legacy endpoints and startup resume hook remain source-compatible
 * for callers during migration, but they cannot launch or resume research.
 */

export const CONTACT_RESEARCH_JOB_TYPE = "contact-research" as const;

const RETIRED_MESSAGE =
  "The legacy contact-research control plane is retired. Use the canonical Atlas Investigator path; research strategy is model-owned.";

export async function startContactResearch(_options?: {
  limit?: number;
  entityIds?: number[];
  resumeJobId?: string;
}): Promise<never> {
  throw new Error(RETIRED_MESSAGE);
}

export async function cancelContactResearch(_jobId?: string): Promise<never> {
  throw new Error(RETIRED_MESSAGE);
}

/** Startup compatibility hook. It intentionally performs no work. */
export async function resumeContactResearchAfterRestart(): Promise<void> {
  return;
}
