/**
 * Admit discovery-agent candidates into the ledger (person entities, review notes).
 * Uses target-fitness fame/shell gates only for the legacy non-model-selected path.
 */
import { db, entitiesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { isWellFormedPersonCandidate, type DiscoveryCandidate } from "./discovery-agent";
import { logger } from "./logger";
import { evaluateTargetFitness, shouldRejectTarget } from "./target-fitness";

const SEARCH_ENGINE_HOSTS = new Set([
  "google.com", "www.google.com", "bing.com", "www.bing.com",
  "duckduckgo.com", "www.duckduckgo.com", "search.yahoo.com",
]);

function normalizedEvidenceText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Identity safety boundary: a model-supplied name + arbitrary URL is not enough
 * to create a person. Verify that at least one claimed source actually contains
 * the claimed name. This is not a ranking rule; it only prevents a malformed or
 * hallucinated identity claim from crossing into the durable entity ledger.
 */
async function sourceActuallyMentionsCandidate(candidate: DiscoveryCandidate): Promise<boolean> {
  const name = candidate.name.trim();
  const tokens = normalizedEvidenceText(name).split(" ").filter((t) => t.length >= 2);
  if (tokens.length < 2) return false;

  const urls = (candidate.sourceUrls ?? [])
    .filter((url) => /^https?:\/\/\S+$/i.test(String(url)))
    .filter((url) => {
      try {
        return !SEARCH_ENGINE_HOSTS.has(new URL(url).hostname.toLowerCase());
      } catch {
        return false;
      }
    })
    .slice(0, 3);

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "ApexAtlas/1.0 identity-evidence-check",
          Accept: "text/html,text/plain,application/json",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") ?? "";
      if (!/(?:text\/html|text\/plain|application\/json)/i.test(contentType)) continue;
      const text = normalizedEvidenceText((await response.text()).slice(0, 250_000));
      if (!text) continue;

      const fullName = tokens.join(" ");
      if (text.includes(fullName)) return true;

      // Accommodate common "LAST, First" / "LAST First" source formatting
      // without accepting an unrelated page that merely contains one token.
      const first = tokens[0]!;
      const last = tokens[tokens.length - 1]!;
      if (first !== last && new RegExp(`\\b${first}\\b[\\s\\S]{0,500}\\b${last}\\b`, "i").test(text)) return true;
      if (first !== last && new RegExp(`\\b${last}\\b[\\s\\S]{0,500}\\b${first}\\b`, "i").test(text)) return true;
    } catch {
      // A blocked/unavailable source is not positive identity evidence.
    }
  }
  return false;
}

export async function createEntityFromDiscoveryCandidate(
  c: DiscoveryCandidate,
  options: { modelSelected?: boolean } = {},
): Promise<number | null> {
  const name = c.name.trim();
  if (name.length < 3) return null;

  if (options.modelSelected) {
    // Model-selected discovery is deliberately not ranked, scored, or filtered
    // by target fitness. Only identity/provenance safety is enforced here.
    if (!isWellFormedPersonCandidate(c)) {
      logger.info({ name }, "[discovery-agent-admit] rejected malformed model-selected person candidate");
      return null;
    }
    // The URL itself is provenance, not proof of identity. Check the claimed
    // source before allowing the model's identity hypothesis into durable state.
    if (!(await sourceActuallyMentionsCandidate(c))) {
      logger.info(
        { name, sourceUrls: c.sourceUrls?.slice(0, 3) ?? [] },
        "[discovery-agent-admit] rejected candidate whose claimed source does not establish the name",
      );
      return null;
    }
  }

  const fitness = options.modelSelected
    ? null
    : evaluateTargetFitness({
      name,
      notes: [c.basis, c.role, c.company].filter(Boolean).join(" | "),
    });
  if (fitness && shouldRejectTarget(fitness)) {
    logger.info({ name, fit: fitness.fit, reasons: fitness.reasons }, "[discovery-agent-admit] rejected by fitness");
    return null;
  }

  const existing = await db
    .select({ id: entitiesTable.id })
    .from(entitiesTable)
    .where(sql`lower(${entitiesTable.name}) = ${name.toLowerCase()}`)
    .limit(1);
  if (existing[0]?.id) return existing[0].id;

  const notes = [
    `Discovery agent: ${c.basis}`,
    c.role ? `Role: ${c.role}` : null,
    c.company ? `Company: ${c.company}` : null,
    c.sourceUrls?.length ? `Sources: ${c.sourceUrls.slice(0, 4).join(" | ")}` : null,
    fitness ? `Fitness: ${fitness.fit} (${fitness.reasons.slice(0, 2).join("; ")})` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const [row] = await db
    .insert(entitiesTable)
    .values({
      name,
      type: "HNWI",
      // Do not synthesize a discovery score. Model-selected admission preserves
      // model order; the value below is only a neutral seed for legacy list UI.
      bayesianScore: options.modelSelected ? 0.2 : Math.max(0.2, Math.min(0.45, fitness?.score ?? 0.2)),
      notes,
      sourceRegistries: JSON.stringify(["discovery-agent"]),
      metadata: JSON.stringify({
        discoveryAgent: true,
        lane: c.lane,
        sourceUrls: c.sourceUrls?.slice(0, 8) ?? [],
        role: c.role,
        company: c.company,
        ...(fitness ? { fitness: fitness.fit } : {}),
      }),
      contactConfidence: 0,
      contactOutcome: "evidence_only",
    })
    .returning({ id: entitiesTable.id });

  logger.info({ id: row?.id, name, modelSelected: options.modelSelected === true }, "[discovery-agent-admit] inserted");
  return row?.id ?? null;
}
