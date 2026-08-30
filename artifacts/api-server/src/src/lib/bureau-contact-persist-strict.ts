/**
 * Strict persistence boundary for model-led research.
 *
 * The legacy persistence helper can manufacture a search/registry URL when a
 * caller supplies contact evidence without provenance. That is useful for old
 * repair workflows but is not acceptable for the canonical agentic path:
 * a query URL is evidence that a search was made, not evidence for the claim.
 *
 * This wrapper therefore drops any contact item that does not already carry an
 * exact HTTP(S) source URL before calling the legacy projector. It deliberately
 * does not rank or otherwise alter the research decision.
 */
import {
  persistBureauContactsForEntity,
  type BureauContactLike,
} from "./bureau-contact-persist";

const HTTP_SOURCE = /^https?:\/\/\S+$/i;

export function sourceBackedBureauContacts(
  items: readonly BureauContactLike[] | null | undefined,
): BureauContactLike[] {
  return (items ?? []).filter((item) =>
    Array.isArray(item.sourceUrls)
    && item.sourceUrls.some((url) => typeof url === "string" && HTTP_SOURCE.test(url)),
  ).map((item) => ({
    ...item,
    sourceUrls: (item.sourceUrls ?? []).filter((url) => typeof url === "string" && HTTP_SOURCE.test(url)),
  }));
}

export async function persistSourceBackedBureauContactsForEntity(
  entityId: number,
  items: readonly BureauContactLike[] | null | undefined,
  source: string,
  jobId?: string | null,
): Promise<number> {
  return persistBureauContactsForEntity(
    entityId,
    sourceBackedBureauContacts(items),
    source,
    jobId,
  );
}
