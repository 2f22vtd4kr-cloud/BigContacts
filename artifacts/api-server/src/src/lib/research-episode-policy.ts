/**
 * Episode-level oversight policy.
 *
 * The Investigator keeps ownership of the research trajectory. This module only
 * decides when the Right-hand/Boss oversight boundary is worth paying for. It never
 * chooses a tool, query, target, or research route.
 */
export type ResearchEpisodeCheckpointReason =
  | "episode_boundary"
  | "contradiction"
  | "identity_change"
  | "high_value_contact"
  | "failed_action"
  | "terminal_claim"
  | "low_information_gain";

export type ResearchEpisodeCheckpoint = {
  checkpoint: boolean;
  reasons: ResearchEpisodeCheckpointReason[];
};

const DEFAULT_EPISODE_MIN_ACTIONS = 3;
const DEFAULT_EPISODE_MAX_ACTIONS = 5;

function bounded(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value))) : fallback;
}

export function getResearchEpisodeWindow(): { minActions: number; maxActions: number } {
  return {
    minActions: bounded(process.env.APEX_RESEARCH_EPISODE_MIN_ACTIONS, DEFAULT_EPISODE_MIN_ACTIONS, 2, 8),
    maxActions: bounded(process.env.APEX_RESEARCH_EPISODE_MAX_ACTIONS, DEFAULT_EPISODE_MAX_ACTIONS, 3, 10),
  };
}

export function shouldCheckpointResearchEpisode(input: {
  actionsSinceCheckpoint: number;
  contradictionCount?: number;
  identityChanged?: boolean;
  highValueContact?: boolean;
  actionExecution?: string;
  terminalClaim?: boolean;
  informationGain?: number;
}): ResearchEpisodeCheckpoint {
  const window = getResearchEpisodeWindow();
  const reasons: ResearchEpisodeCheckpointReason[] = [];
  if (input.actionsSinceCheckpoint >= window.maxActions) reasons.push("episode_boundary");
  if (input.contradictionCount && input.contradictionCount > 0) reasons.push("contradiction");
  if (input.identityChanged) reasons.push("identity_change");
  if (input.highValueContact) reasons.push("high_value_contact");
  if (input.actionExecution && !["success", "selected"].includes(input.actionExecution)) reasons.push("failed_action");
  if (input.terminalClaim) reasons.push("terminal_claim");
  if (typeof input.informationGain === "number" && input.actionsSinceCheckpoint >= window.minActions && input.informationGain < 0.12) {
    reasons.push("low_information_gain");
  }

  const urgent = reasons.some((reason) =>
    ["contradiction", "identity_change", "high_value_contact", "failed_action", "terminal_claim"].includes(reason),
  );
  const boundary = input.actionsSinceCheckpoint >= window.maxActions;
  const softBoundary = input.actionsSinceCheckpoint >= window.minActions && reasons.includes("low_information_gain");

  return {
    checkpoint: urgent || boundary || softBoundary,
    reasons: [...new Set(reasons)],
  };
}
