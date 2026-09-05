import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const file = path.resolve(root, "artifacts/api-server/src/src/lib/agentic-web-research.ts");

if (!fs.existsSync(file)) {
  throw new Error(`Agentic runtime source not found: ${file}`);
}

let source = fs.readFileSync(file, "utf8");
let changes = 0;

function replaceOnce(pattern, replacement, label) {
  const before = source;
  if (!pattern.test(source)) {
    throw new Error(`Expected patch anchor not found: ${label}`);
  }
  source = source.replace(pattern, replacement);
  if (source === before) throw new Error(`Patch made no change: ${label}`);
  changes += 1;
}

// These two loggers were copy/paste defects: one referenced an undefined `model`
// variable and both reported the wrong provider. They could hide the real search
// failure behind a secondary runtime error.
replaceOnce(
  /logger\.warn\(\{ provider: "mistral", status: resp\.status, model \}, "agentic provider rejected request"\);/,
  'logger.warn({ provider: "serper", status: resp.status }, "agentic provider rejected request");',
  "Serper provider logger",
);
replaceOnce(
  /logger\.warn\(\{ provider: "nvidia", status: resp\.status, model \}, "agentic provider rejected request"\);/,
  'logger.warn({ provider: "mistral", status: resp.status, model }, "agentic provider rejected request");',
  "Mistral provider logger",
);

// Gemini 3.x is an agentic reasoning model. The previous runtime used one key,
// imposed an 18s outer deadline on calls whose own timeout was 30s, and set
// temperature=0.25. Current Gemini guidance recommends leaving sampling at the
// model default for Gemini 3.x; the runtime therefore gives the model enough
// response time, rotates every configured Gemini key, and uses high thinking
// effort for the actual ReAct decision. This changes transport reliability and
// model quality, not the model's research choices.
const geminiReplacement = `async function callGeminiJson(prompt: string): Promise<{ model: string; raw: string } | null> {
  const keys = [
    "GEMINI_API_KEY",
    "GEMINI_KEY",
    ...Array.from({ length: 13 }, (_, i) => \`GEMINI_API_KEY_\${i + 1}\`),
  ]
    .map((n) => ({ name: n, key: (process.env[n] ?? "").trim() }))
    .filter((entry) => entry.key.length > 0);
  if (!keys.length) return null;

  const models = [
    process.env.GEMINI_AGENTIC_MODEL,
    process.env.GEMINI_BOSS_MODEL,
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ].filter((m, i, all): m is string => Boolean(m && m.trim()) && all.indexOf(m) === i);

  for (const entry of keys) {
    for (const model of models) {
      try {
        const resp = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent",
          {
            method: "POST",
            headers: { "x-goog-api-key": entry.key, "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{
                  text: apexOrientationFor("dig_agent") +
                    "\\nReturn exactly one JSON action object. Preserve your own research judgment; the harness only executes the action you choose.",
                }],
              },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingLevel: "high" },
              },
            }),
            signal: AbortSignal.timeout(50_000),
          },
        );
        if (!resp.ok) {
          const body = (await resp.text()).slice(0, 500);
          logger.warn({ provider: "gemini", keyName: entry.name, status: resp.status, model, body }, "agentic provider rejected request");
          // 401/403 is a key problem; move to the next key. 404 is a model
          // lifecycle problem; move to the next model. 429/503 are capacity
          // problems; move through the configured pool instead of killing the turn.
          continue;
        }
        const data = await resp.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("").trim() || "";
        if (raw) return { model: \`gemini:\${model}\`, raw };
      } catch (err: any) {
        logger.warn({ provider: "gemini", keyName: entry.name, model, error: err?.message }, "agentic provider call failed");
      }
    }
  }
  return null;
}`;

replaceOnce(
  /async function callGeminiJson\(prompt: string\): Promise<\{ model: string; raw: string \} \| null> \{[\s\S]*?\n\}\n\nasync function callMistralJson/,
  `${geminiReplacement}\n\nasync function callMistralJson`,
  "Gemini multi-key/high-thinking runtime",
);

// The provider functions have their own meaningful deadlines (30–50s). The old
// 18s Promise.race made the outer harness kill healthy model turns before they
// could answer, especially reasoning-heavy Gemini/NVIDIA/Mistral calls.
replaceOnce(
  /const providerDecisionTimeoutMs = 18_000;/,
  "const providerDecisionTimeoutMs = 55_000;",
  "provider decision deadline",
);

// Research judgment belongs to the model. Repeating a search or deciding to
// finish early is not a harness error. Remove the old deterministic stagnation
// nudge so the agent is never forced onto a different query merely because the
// strings happened to repeat.
replaceOnce(
  /\n    \/\/ Soft stagnation:[\s\S]*?\n    \}\n\n    const llmStepWithHeartbeat/,
  "\n\n    const llmStepWithHeartbeat",
  "deterministic stagnation nudge",
);

// The executor may observe search URLs, but it must not tell the model that it
// should visit one. The model decides whether a visit is worthwhile.
replaceOnce(
  /\n      \/\/ Soft nudge: if we already have company-looking URLs and no visits yet, tell the model to visit[\s\S]*?\n      \}\n      emitLive\(\{\n        action: "web_search",/,
  "\n      emitLive({\n        action: \"web_search\",",
  "post-search visit nudge",
);

// `done` is a model decision. The previous guard forced an initial search even
// when the model deliberately judged that it already had enough context. The
// runtime still fails closed on fabricated contacts and source-less claims.
replaceOnce(
  /\n    \/\/ done — only soft-reject pure no-ops \(zero work \+ zero findings\)\. Model owns when to finish\.[\s\S]*?\n    findings = mergeFindings\(findings, action\.findings\);/,
  "\n    // done is entirely model-owned. Empty findings are valid: they mean the\n    // model judged that no attributable route was established. Deterministic\n    // validation still applies to any findings that the model does return.\n    findings = mergeFindings(findings, action.findings);",
  "forced-first-search done guard",
);

fs.writeFileSync(file, source);
console.log(`[apex-agentic-runtime] applied ${changes} idempotent runtime hardening change(s)`);
