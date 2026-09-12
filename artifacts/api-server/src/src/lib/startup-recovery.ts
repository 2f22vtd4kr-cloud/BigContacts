/**
 * Startup recovery — lifecycle-only boot hygiene.
 *
 * This module deliberately contains no research, enrichment, discovery, or
 * HTTP triggers. A newly started process must NEVER mutate a distributed job
 * merely because the job predates this process: another healthy replica may
 * own that job. Canonical Redis lease expiry/renewal is the authoritative stale
 * owner mechanism.
 */
import { logger } from "./logger";

/** Main boot recovery entry point. No research or distributed job mutation is initiated here. */
export async function coldStartRecovery(): Promise<void> {
  logger.info("Startup recovery complete — distributed jobs left untouched; lease owner remains authoritative");
}
