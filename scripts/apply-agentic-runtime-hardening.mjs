import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/agentic-web-research.ts";
const rightHandPath = "artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts";
let s = fs.readFileSync(path, "utf8");
let r = fs.readFileSync(rightHandPath, "utf8");

s = s.replace(/\n      if \(footprintCalls >= 4\) \{[\s\S]*?\n      \}\n/g, "\n");
s = s.replace(/\n      if \(footprintCalls >= 3\) \{[\s\S]*?\n      \}\n/g, "\n");

const currentNvidia = "nvidia/llama-3.3-nemotron-super-49b-v1.5";
s = s.replace('    "z-ai/glm-5.2",', `    "${currentNvidia}",\n    "meta/llama-3.3-70b-instruct",`);
r = r.replace('"z-ai/glm-5.2"', `"${currentNvidia}"`);

// Surface actual provider HTTP failures instead of collapsing them into null.
s = s.replace(
  '        if (!resp.ok) {\n          // model_not_found / access → try next model on same key\n          continue;\n        }',
  '        if (!resp.ok) {\n          logger.warn({ provider: "groq", status: resp.status, model }, "agentic provider rejected request");\n          continue;\n        }',
);
s = s.replace(
  '      if (!resp.ok) continue;',
  '      if (!resp.ok) {\n        logger.warn({ provider: "mistral", status: resp.status, model }, "agentic provider rejected request");\n        continue;\n      }',
);
s = s.replace(
  '      if (!resp.ok) continue;\n      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };',
  '      if (!resp.ok) {\n        logger.warn({ provider: "nvidia", status: resp.status, model }, "agentic provider rejected request");\n        continue;\n      }\n      const data = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };',
);
s = s.replace(
  '  } catch (err: any) {\n    logger.debug({ err: err?.message }, "agentic Gemini call failed");\n  }',
  '  } catch (err: any) {\n    logger.warn({ err: err?.message }, "agentic Gemini call failed");\n  }',
);

if (!s.includes("Tool choice remains unconstrained by footprint counters")) {
  s = s.replace(
    '    // Model-led only. detVisitNext only on all-LLM-fail recovery.',
    '    // Model-led only. Tool choice remains unconstrained by footprint counters; lifecycle budgets are the only runtime ceiling.',
  );
}

if (/footprintCalls >= [34]/.test(s)) throw new Error("hidden footprint tool cap remains");
if (!s.includes(currentNvidia) || !r.includes(currentNvidia)) throw new Error("current NVIDIA model fallback missing");

fs.writeFileSync(path, s);
fs.writeFileSync(rightHandPath, r);
console.log("Applied agentic runtime hardening: removed model-path footprint caps, updated NVIDIA fallback, and surfaced provider HTTP failures");
