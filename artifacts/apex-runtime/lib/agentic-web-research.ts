/**
 * Compatibility shim only.
 *
 * Production Apex Atlas runs from artifacts/api-server/src/src/lib. The former
 * standalone apex-runtime copy could silently drift in model selection, tool
 * surface, or iteration semantics. Re-export the canonical implementation so
 * holdout/Walker harnesses cannot revive an obsolete runtime.
 */
export * from "../../api-server/src/src/lib/agentic-web-research.ts";
