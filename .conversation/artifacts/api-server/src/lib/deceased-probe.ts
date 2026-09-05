/**
 * Lightweight public deceased probe — Wikipedia + simple page cues.
 * Used at cook time so deceased targets (e.g. Frank H. Pearl) are not
 * treated as live HNWI outreach cards.
 */
import { logger } from "./logger";

export interface DeceasedProbeResult {
  deceased: boolean;
  confidence: number;
  note: string | null;
  sourceUrl: string | null;
}

function timeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

/** Wikipedia summary API — free, no key. */
export async function probeDeceasedPublic(name: string): Promise<DeceasedProbeResult> {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.length < 4) {
    return { deceased: false, confidence: 0, note: null, sourceUrl: null };
  }

  try {
    const title = encodeURIComponent(clean.replace(/ /g, "_"));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
    const resp = await fetch(url, {
      signal: timeout(8_000),
      headers: {
        "User-Agent": "ApexFinder Research research@apexfinder.private",
        Accept: "application/json",
      },
    });
    if (resp.status === 404) {
      // Try with middle initial stripped
      const parts = clean.split(/\s+/);
      if (parts.length >= 3) {
        const alt = `${parts[0]} ${parts[parts.length - 1]}`;
        return probeDeceasedPublic(alt);
      }
      return { deceased: false, confidence: 0, note: null, sourceUrl: null };
    }
    if (!resp.ok) {
      return { deceased: false, confidence: 0, note: null, sourceUrl: null };
    }
    const data = (await resp.json()) as {
      extract?: string;
      description?: string;
      content_urls?: { desktop?: { page?: string } };
      title?: string;
    };
    const extract = `${data.description ?? ""} ${data.extract ?? ""}`;
    const pageUrl = data.content_urls?.desktop?.page ?? null;

    // Strong death cues in lead extract
    const deathRe =
      /\b(died|dead|death|obituary|passed away|was killed|late\s+[A-Z]|is deceased)\b/i;
    const birthDeathSpan = /\b(19\d{2}|20\d{2})\s*[–—-]\s*(19\d{2}|20\d{2})\b/;
    if (deathRe.test(extract) || birthDeathSpan.test(extract)) {
      logger.info({ name: clean, pageUrl }, "[deceased-probe] public death cue");
      return {
        deceased: true,
        confidence: 85,
        note: `Public biography indicates deceased: ${(data.extract ?? data.description ?? "").slice(0, 220)}`,
        sourceUrl: pageUrl,
      };
    }
    return {
      deceased: false,
      confidence: 40,
      note: data.extract ? `Wikipedia lead (no death cue): ${data.extract.slice(0, 120)}` : null,
      sourceUrl: pageUrl,
    };
  } catch (err: any) {
    logger.debug({ err: err?.message, name: clean }, "[deceased-probe] failed");
    return { deceased: false, confidence: 0, note: null, sourceUrl: null };
  }
}
