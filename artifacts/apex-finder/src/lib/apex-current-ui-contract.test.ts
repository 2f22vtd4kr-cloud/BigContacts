import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const manual = readFileSync(new URL("../pages/manual.tsx", import.meta.url), "utf8");
const statusPage = readFileSync(new URL("../pages/status.tsx", import.meta.url), "utf8");
const dataSources = readFileSync(new URL("../pages/data-sources.tsx", import.meta.url), "utf8");
const launchButton = readFileSync(new URL("../components/launch-atlas-button.tsx", import.meta.url), "utf8");
const reactorPage = readFileSync(new URL("../pages/reactor.tsx", import.meta.url), "utf8");
const mobileReactor = readFileSync(new URL("../components/mobile-reactor-flow.tsx", import.meta.url), "utf8");
const jobsPage = readFileSync(new URL("../pages/jobs.tsx", import.meta.url), "utf8");
const liveSurface = readFileSync(new URL("../components/reactor-live-surface.tsx", import.meta.url), "utf8");
const profilePage = readFileSync(new URL("../pages/profile.tsx", import.meta.url), "utf8");
const mockData = readFileSync(new URL("./dev-mock-data.ts", import.meta.url), "utf8");
const providerIcons = readFileSync(new URL("../components/provider-icons.tsx", import.meta.url), "utf8");
const bureauOps = readFileSync(new URL("../components/bureau-ops-stage.tsx", import.meta.url), "utf8");
const integrityBanner = readFileSync(new URL("../components/bureau-integrity-banner.tsx", import.meta.url), "utf8");

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
    expect(statusPage).toContain("SerpAPI search");
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

  it("keeps desktop and mobile Reactor diagrams aligned to the active Groq roles and search providers", () => {
    for (const source of [reactorPage, mobileReactor]) {
      expect(source).toContain("GROQ BOSS");
      expect(source).toContain("Groq Investigator");
      expect(source).not.toMatch(/Gemini|Mistral|Perplexity|NVIDIA|gemini|mistral|perplexity/i);
    }
    expect(reactorPage).toContain("GROQ RIGHT-HAND");
    expect(mobileReactor).toContain("right_hand");
  });

  it("keeps provider chrome and operational telemetry aligned with active provider contracts", () => {
    expect(providerIcons).not.toMatch(/Gemini|Perplexity|gemini|perplexity/);
    expect(bureauOps).not.toMatch(/Gemini|Mistral|Perplexity|NVIDIA|gemini|mistral|perplexity/i);
    expect(bureauOps).toContain("/api/healthz/details");
    expect(bureauOps).toContain("groqInvestigator");
    expect(bureauOps).toContain("groqRightHand");
    expect(bureauOps).toContain("serpapi");
    expect(integrityBanner).toContain("/api/system/status");
    expect(integrityBanner).not.toMatch(/Perplexity|multi-LLM/);
  });

  it("keeps all launch surfaces and secondary desk copy free of retired roles and aim glyphs", () => {
    expect(jobsPage).toContain("Groq Boss");
    expect(jobsPage).toContain("Groq Right-hand");
    expect(jobsPage).not.toMatch(/Gemini|Mistral|DeepSeek/);
    expect(liveSurface).not.toMatch(/mistral/i);
    expect(profilePage).not.toContain("Crosshair");
    expect(profilePage).toContain('<Play className="w-4 h-4" />');
    expect(mockData).not.toMatch(/gemini|mistral|perplexity|demo-nim/i);
    expect(mockData).toContain("groqInvestigator");
    expect(mockData).toContain("groqBoss");
    expect(mockData).toContain("groqRightHand");
  });

  it("keeps the header launch control free of the aim/crosshair glyph", () => {
    expect(launchButton).not.toContain("Crosshair");
    expect(launchButton).not.toContain("crosshair");
  });
});
