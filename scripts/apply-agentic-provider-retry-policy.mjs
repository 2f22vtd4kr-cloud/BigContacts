#!/usr/bin/env node
/**
 * RETIRED: this historical source mutator inserted cross-Investigator provider
 * fallback. Apex requires the Gemini-selected Investigator to remain the sole
 * Investigator for an act; changing provider requires a new control decision.
 */
throw new Error("RETIRED: apply-agentic-provider-retry-policy.mjs must not mutate Apex source; use source-native Investigator selection instead.");
