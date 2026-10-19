export type RuntimeBuildDirtyState = "clean" | "dirty" | "unknown";

export interface RuntimeBuildProvenance {
  buildRevision: string;
  buildDirty: RuntimeBuildDirtyState;
  buildTimestamp: string;
}

/**
 * Normalize build metadata injected by artifacts/api-server/build.mjs.
 * Unknown values stay explicitly unknown rather than being presented as a
 * verified revision. The same normalized fields are copied onto durable jobs.
 */
export function normalizeRuntimeBuildProvenance(input: {
  revision?: unknown;
  dirty?: unknown;
  builtAt?: unknown;
}): RuntimeBuildProvenance {
  const revision = typeof input.revision === "string" && /^[a-f0-9]{40}$/i.test(input.revision.trim())
    ? input.revision.trim().toLowerCase()
    : "unknown";
  const dirtyValue = typeof input.dirty === "string" ? input.dirty.trim().toLowerCase() : "";
  const buildDirty: RuntimeBuildDirtyState = dirtyValue === "clean" || dirtyValue === "dirty" ? dirtyValue : "unknown";
  const builtAtValue = typeof input.builtAt === "string" ? input.builtAt.trim() : "";
  const parsedBuiltAt = builtAtValue ? Date.parse(builtAtValue) : Number.NaN;
  const buildTimestamp = Number.isFinite(parsedBuiltAt) ? new Date(parsedBuiltAt).toISOString() : "unknown";
  return { buildRevision: revision, buildDirty, buildTimestamp };
}

export function getRuntimeBuildProvenance(): RuntimeBuildProvenance {
  return normalizeRuntimeBuildProvenance({
    revision: process.env.APEX_BUILD_REVISION,
    dirty: process.env.APEX_BUILD_DIRTY,
    builtAt: process.env.APEX_BUILD_TIMESTAMP,
  });
}
