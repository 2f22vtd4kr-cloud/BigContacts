/**
 * LLM-Backed Name Validator
 *
 * Replaces brittle hand-written regex rules with a Groq LLaMA call that
 * answers a single question: "Is this a human person's full name?"
 *
 * Usage pattern:
 *   1. Regex pre-filter (fast, removes obvious corporate/fund names)
 *   2. LLM batch-filter (catches ambiguous cases like "Economic Affairs",
 *      "Reducing Marginal", "Please Appoint A", abstract concept pairs)
 *
 * The LLM call is ALWAYS fail-open: if Groq is unavailable or rate-limited,
 * all candidates that passed the regex are accepted. This prevents the
 * validator from blocking ingestion when API keys are exhausted.
 */

import { logger } from "./logger";

const GROQ_KEYS = ["GROQ_API_KEY", "GROQ_API_KEY_1", "GROQ_API_KEY_2", "GROQ_API_KEY_3"]
  .map(k => process.env[k])
  .filter(Boolean) as string[];

/**
 * Filter a batch of candidate name strings down to those that are genuine
 * human person full names. Returns the subset that passes LLM validation.
 *
 * Uses llama-3.1-8b-instant (fast + cheap) — we only need binary yes/no.
 * Batches up to 60 names per call to minimise API round trips.
 * Fail-open: returns all candidates on any error.
 */
export async function filterHumanNamesWithLLM(candidates: string[]): Promise<string[]> {
  if (candidates.length === 0) return [];
  if (GROQ_KEYS.length === 0) {
    logger.debug("llm-name-validator: no GROQ keys — skipping LLM filter (fail-open)");
    return candidates;
  }

  const results: string[] = [];
  const BATCH = 60;

  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const valid = await _validateBatch(batch);
    results.push(...valid);
  }

  return results;
}

async function _validateBatch(names: string[]): Promise<string[]> {
  const key = GROQ_KEYS[Math.floor(Math.random() * GROQ_KEYS.length)];

  const prompt = `You are a human-name classifier for an OSINT database. Your job is to decide whether each string is a human person's name.

IMPORTANT: When in doubt, answer YES. Only answer NO when the string is CLEARLY and OBVIOUSLY not a human person.

Answer YES for:
- Any plausible first + last name combination, even if it sounds famous or matches a brand (e.g. "Ralph Lauren", "Barry Diller", "Mark Zuckerberg" are PEOPLE)
- Names in Last-First order (e.g. "Wagoner Dayne", "Meyer Thomas", "Proceviat Ralph")
- Chinese, Korean, Japanese, Arabic, or other non-Western names (e.g. "Zhu Jun", "HE Boquan", "Yang Tianfu")
- Names with initials or middle names (e.g. "Charles W Ergen", "A Haag Sherman")
- Unusual or rare names that could be real people

Answer NO only when the string is CLEARLY a non-person:
- Contains "LLC", "L.L.C.", "L.P.", "Corp", "Inc", "Ltd", "Fund", "Trust", "REIT", "Holdings", "Partners", "Capital" — e.g. "D. E. Shaw Fund LLC", "Blackrock Capital Corp"
- Two people joined by "&" — e.g. "Gerhard & Ruth Cless", "Edward & Carol Kaplan"
- Government/institutional body — e.g. "Abu Dhabi Investment Authority", "Department of Treasury"
- Financial ticker patterns — e.g. "Corp (ccz, Cmcsa) Comcast", "Inc (qcom) Qualcomm"
- Abstract concept phrase — e.g. "Economic Analysis", "Reducing Marginal Tax"
- Clearly a company operating name — e.g. "Smack Sportswear", "Carvana Jack Ma", "Hydro A S A Norsk"

Names:
${names.map((n, idx) => `${idx + 1}. "${n}"`).join("\n")}

Respond ONLY with a compact JSON array of the 1-based indices of names that are YES (human persons). Example: [1,3,7]
If ALL are human names, respond with all indices. If ALL are clearly non-human, respond with [].
Output nothing else.`;

  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 256,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!resp.ok) {
      logger.debug({ status: resp.status }, "llm-name-validator: Groq non-OK — fail-open");
      return names; // fail-open
    }

    const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = (data.choices?.[0]?.message?.content ?? "").trim();

    const match = text.match(/\[[\d,\s]*\]/);
    if (!match) {
      logger.debug({ text }, "llm-name-validator: no JSON array in response — fail-open");
      return names;
    }

    const validIndices: number[] = JSON.parse(match[0]);
    const accepted = validIndices
      .filter(i => i >= 1 && i <= names.length)
      .map(i => names[i - 1])
      .filter(Boolean);

    const rejected = names.filter(n => !accepted.includes(n));
    if (rejected.length > 0) {
      logger.info({ rejected }, "llm-name-validator: rejected non-human names");
    }

    return accepted;
  } catch (err: any) {
    logger.debug({ err: err?.message }, "llm-name-validator: error — fail-open");
    return names; // fail-open
  }
}
