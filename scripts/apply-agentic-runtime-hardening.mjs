import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
let s = fs.readFileSync(path, "utf8");

// Model choice must not be silently overridden by footprint-call counters.
// Runtime iteration/time budgets remain the lifecycle guard; individual tools
// remain model-selected. These caps were deterministic research-path controls.
s = s.replace(/\n      if \(footprintCalls >= 4\) \{[\s\S]*?\n      \}\n/g, "\n");
s = s.replace(/\n      if \(footprintCalls >= 3\) \{[\s\S]*?\n      \}\n/g, "\n");

// NVIDIA's current hosted API exposes this model on the OpenAI-compatible
// chat endpoint. Keep the environment override first, but do not default to
// a stale/partner-only model.
s = s.replace('    "z-ai/glm-5.2",', '    "nvidia/llama-3.3-nemotron-super-49b-v1.5",\n    "meta/llama-3.3-70b-instruct",');

// Provider failures must be observable. A swallowed 401/403/404/429 made every
// model look like a generic "all providers failed" condition and wasted ten
// discovery slots without producing one model action.
s = s.replace(
  '        if (!resp.ok) {\n          // model_not_found / access → try next model on same key\n          continue;\n        }',
  '        if (!resp.ok) {\n          logger.warn({ provider: "groq", status: resp.status, model }, "agentic provider rejected request");\n          continue;\n        }',
);
s = s.replace(
  '      if (!resp.ok) continue;',
  '      if (!resp.ok) {\n        logger.warn({ provider: "mistral", status: resp.status, model }, "agentic provider rejected request");\n        continue;\n      }',
);
// NVIDIA has the same compact rejection branch in its provider loop.
s = s.replace(
  '      if (!resp.ok) continue;\n      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };',
  '      if (!resp.ok) {\n        logger.warn({ provider: "nvidia", status: resp.status, model }, "agentic provider rejected request");\n        continue;\n      }\n      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };',
);

// Keep the exact provider exception instead of reducing it to a silent null.
s = s.replace(
  '  } catch (err: any) {\n    logger.debug({ err: err?.message }, "agentic Gemini call failed");\n  }',
  '  } catch (err: any) {\n    logger.warn({ err: err?.message }, "agentic Gemini call failed");\n  }',
);

// Make the current source self-describing for static audits.
if (!s.includes("model-choice remains unconstrained by footprint counters")) {
  s = s.replace(
    '    // Model-led only. detVisitNext only on all-LLM-fail recovery.',
    '    // Model-led only. Tool choice remains unconstrained by footprint counters; lifecycle budgets are the only runtime ceiling.',
  );
}

if (/footprintCalls >= [34]/.test(s)) throw new Error("hidden footprint tool cap remains");
if (!s.includes("nvidia/llama-3.3-nemotron-super-49b-v1.5")) throw new Error("current NVIDIA model fallback missing");

fs.writeFileSync(path, s);
console.log("Applied agentic runtime hardening: removed model-path footprint caps, updated NVIDIA fallback, and surfaced provider HTTP failures");
