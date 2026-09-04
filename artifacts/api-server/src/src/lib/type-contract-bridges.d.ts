import "./in-house-enricher";
import "./contact-confidence";

declare module "./in-house-enricher" {
  interface InHouseEnrichResult {
    /** Public Instagram handle observed by the in-house social pass, when present. */
    instagram?: string | null;
  }
}

declare module "./contact-confidence" {
  /**
   * Contact classification accepts residence evidence because callers pass the
   * entity record as a shared contract. The classifier may treat it as
   * evidence-only in implementations that use location context.
   */
  export function computeContactOutcome(entity: {
    type?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    twitterHandle?: string | null;
    instagramHandle?: string | null;
    telegramHandle?: string | null;
    website?: string | null;
    bizLocation?: string | null;
    knownResidences?: string | null;
    validatedDirectContact?: boolean;
    emailSource?: string | null;
    phoneSource?: string | null;
    isGenericPrefix?: boolean;
    metadata?: string | Record<string, unknown> | null;
  }): import("./contact-confidence").ContactOutcome;
}
