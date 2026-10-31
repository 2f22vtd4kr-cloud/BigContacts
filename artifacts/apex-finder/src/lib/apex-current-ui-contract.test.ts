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
const sharedStatus = readFileSync(new URL("./system-status.ts", import.meta.url), "utf8");
const replitPreflight = readFileSync(new URL("../../../../scripts/replit-preflight.mjs", import.meta.url), "utf8");
const themeCss = readFileSync(new URL("../index.css", import.meta.url), "utf8");

describe("current Apex UI contract", () => {
  it("documents only the canonical Groq model roles and current Replit secret names", () => {
    expect(manual).toContain("Groq Boss");
    expect(manual).toContain("Groq Right-hand");
    expect(manual).toContain("GROQ_INVESTIGATOR_API_KEY");
    expect(manual).toContain("GROQ_BOSS_API_KEY");
    expect(manual).toContain("GROQ_RIGHT_HAND_API_KEY");
    expect(manual).not.toMatch(/GEMINI_API_KEY|GEMINI_RIGHT_HAND_API_KEY|MISTRAL_API_KEY|SERPAPI_KEY|Gemini|Mistral/);
    expect(replitPreflight).toContain("SERPER_API_KEY");
    expect(replitPreflight).not.toContain("SERPAPI_KEY");
  });

  it("does not render retired providers as active system-status services", () => {
    expect(statusPage).toContain("Groq Boss");
    expect(statusPage).toContain("Groq Right-hand");
    expect(statusPage).toContain("Groq Investigator capabilities");
    expect(statusPage).toContain("Serper search");
    expect(statusPage).not.toMatch(/Gemini|Mistral|Perplexity|NVIDIA|geminiBoss/);
    expect(sharedStatus).not.toContain("serpapi");
  });

  it("shows every attested Python OSINT tool, including SpiderFoot, without a scripted order", () => {
    for (const tool of ["holehe", "maigret", "sherlock", "theHarvester", "spiderfoot"]) {
      expect(dataSources).toContain(`${tool}:`);
    }
    expect(dataSources).toContain('label: "SpiderFoot"');
    expect(dataSources).toContain("const pythonTools = payload?.pythonTools");
    expect(dataSources).toContain("setStatus({ tools: pythonTools as Record<string, boolean> })");
    expect(dataSources).toContain("status?.tools[key] === true");
    expect(dataSources).toContain("not a mandatory Maigret fallback");
    expect(dataSources).not.toContain("scripts/install-python-tools.sh");
    expect(dataSources).not.toContain("Review-only fallback after Maigret");
  });

  it("keeps desktop and mobile Reactor diagrams aligned to the active Groq roles and search providers", () => {
    expect(reactorPage).toContain("GROQ BOSS");
    expect(reactorPage).toContain("GROQ RIGHT-HAND");
    expect(reactorPage).toContain("INVESTIGATOR");
    expect(mobileReactor).toContain("Groq Boss directs");
    expect(mobileReactor).toContain("Groq Right-hand reviews");
    expect(mobileReactor).toContain("Groq Investigator chooses");
    for (const source of [reactorPage, mobileReactor]) {
      expect(source).not.toMatch(/Gemini|Mistral|Perplexity|NVIDIA|gemini|mistral|perplexity/i);
    }
  });

  it("keeps provider chrome and operational telemetry aligned with active provider contracts", () => {
    expect(providerIcons).not.toMatch(/Gemini|Perplexity|gemini|perplexity/);
    expect(bureauOps).not.toMatch(/Gemini|Mistral|Perplexity|NVIDIA|gemini|mistral|perplexity/i);
    expect(bureauOps).toContain("/api/healthz/details");
    expect(bureauOps).toContain("groqInvestigator");
    expect(bureauOps).toContain("groqRightHand");
    expect(bureauOps).not.toContain("serpapi");
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
    expect(mockData).toContain("theHarvester");
  });

  it("keeps the header launch control free of the aim/crosshair glyph", () => {
    expect(launchButton).not.toContain("Crosshair");
    expect(launchButton).not.toContain("crosshair");
  });
});


describe("Apex light-theme green identity", () => {
  it("translates the dark lime/emerald brand accents to accessible forest green in light mode", () => {
    expect(themeCss).toContain("--color-primary: #083322;");
    expect(themeCss).toContain("--atlas-lime: #083322;");
    expect(themeCss).toContain('html.light [class*="text-lime-"]');
    expect(themeCss).toContain('html.light [class*="text-green-"]');
    expect(themeCss).toContain("color: #083322 !important;");
    expect(themeCss).toContain("rgba(8,51,34,.08)");
    expect(themeCss).not.toContain("#3e181b");
  });

  it("keeps destructive and disputed/error states red instead of recolouring them green", () => {
    expect(themeCss).toContain("--color-destructive: #7c111a;");
    expect(themeCss).toContain('html.light [class*="text-rose-"]');
    expect(themeCss).toContain('html.light [class*="bg-rose-"]');
    expect(themeCss).toContain("color: #7c111a !important;");
    expect(themeCss).toContain("html.light .atlas-btn-danger");
    const scoreboard = themeCss.slice(themeCss.indexOf('html.light [data-testid="scoreboard-strip"]'));
    expect(scoreboard).not.toContain('[class*="text-rose-"]');
  });
});
