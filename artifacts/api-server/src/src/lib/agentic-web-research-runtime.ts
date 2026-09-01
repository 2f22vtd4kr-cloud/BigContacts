/**
 * Runtime gate for the agentic research engine.
 *
 * This wrapper intentionally does NOT alter a run's model trajectory: once a run
 * owns a slot, the underlying ReAct loop retains full control over query wording,
 * tool choice, pivots, depth, and stopping. The only bounded resource here is the
 * number of independent agentic runs executing at the same time.
 */
import {
  runAgenticWebResearch as runAgenticWebResearchUnbounded,
  type AgenticWebResearchResult,
} from "./agentic-web-research";

const AGENTIC_RESEARCH_CONCURRENCY = Math.max(
  1,
  Math.min(4, Number(process.env.APEX_AGENTIC_CONCURRENCY || "1") || 1),
);

let activeAgenticResearch = 0;
const pendingAgenticResearch: Array<() => void> = [];

async function acquireAgenticResearchSlot(): Promise<void> {
  if (activeAgenticResearch < AGENTIC_RESEARCH_CONCURRENCY) {
    activeAgenticResearch += 1;
    return;
  }
  await new Promise<void>((resolve) => pendingAgenticResearch.push(resolve));
  activeAgenticResearch += 1;
}

function releaseAgenticResearchSlot(): void {
  activeAgenticResearch = Math.max(0, activeAgenticResearch - 1);
  const next = pendingAgenticResearch.shift();
  if (next) next();
}

export async function runAgenticWebResearch(
  input: Parameters<typeof runAgenticWebResearchUnbounded>[0],
): Promise<AgenticWebResearchResult> {
  await acquireAgenticResearchSlot();
  try {
    return await runAgenticWebResearchUnbounded(input);
  } finally {
    releaseAgenticResearchSlot();
  }
}

export { AGENTIC_RESEARCH_CONCURRENCY, acquireAgenticResearchSlot, releaseAgenticResearchSlot };
