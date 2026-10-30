import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const manual = readFileSync(new URL("../pages/manual.tsx", import.meta.url), "utf8");
const statusPage = readFileSync(new URL("../pages/status.tsx", import.meta.url), "utf8");
const dataSources = readFileSync(new URL("../pages/data-sources.tsx", import.meta.url), "utf8");
const launchButton = readFileSync(new URL("../components/launch-atlas-button.tsx", import.meta.url), "utf8");

describe("current Apex UI contract", () => {
  it("documents only the canonical Groq model roles and current Replit secret names", () => {
    expect(manual).toContain("Groq Boss");
    expect(manual).toContain("Groq Right-hand");
    expect(manual).toContain("Groq Investigator pool");
    expect(manual).toContain("GROQ_BOSS_API_KEY");
    expect(manual).toContain("GROQ_RIGHT_HAND_API_KEY");
    expect(manual).not.toMatch(/GEMINI_API_KEY|GEMINI_RIGHT_HAND_API_KEY|MISTRAL_API_KEY|Gemini|Mistral/);
  });

  it("does not render retired providers as active system-status services", () => {
    expect(statusPage).toContain("Groq Boss");
    expect(statusPage).toContain("Groq Right-hand");
    expect(statusPage).toContain("Groq Investigator capabilities");
    expect(statusPage).not.toMatch(/Gemini|Mistral|Perplexity|NVIDIA|geminiBoss|openResearch/);
  });

  it("shows every attested Python OSINT tool, including SpiderFoot, without a scripted order", () => {
    for (const tool of ["holehe", "maigret", "sherlock", "theHarvester", "spiderfoot"]) {
      expect(dataSources).toContain(`${tool}:`);
    }
    expect(dataSources).toContain('label: "SpiderFoot"');
    expect(dataSources).toContain("const tools = data?.pythonTools");
    expect(dataSources).toContain("status?.[key] === true");
    expect(dataSources).not.toContain("scripts/install-python-tools.sh");
    expect(dataSources).not.toContain("Review-only fallback after Maigret");
  });

  it("keeps the header launch control free of the aim/crosshair glyph", () => {
    expect(launchButton).not.toContain("Crosshair");
    expect(launchButton).not.toContain("crosshair");
  });
});
