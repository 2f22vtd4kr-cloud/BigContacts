import { describe, expect, it } from "vitest";
import { buildStepPrompt } from "../lib/agentic-web-research-core";

describe("Investigator prompt-budget recovery after a scope block", () => {
  it("fits the active Central-European ownership-source pivot and latest blocked action into the hard prompt ceiling", () => {
    const objective = [
      "PRIMARY CASE OBJECTIVE:",
      "Discover under-the-radar people with credible wealth potential and realistic public/professional/intermediary contact routes for later target-scoped research. People—not companies or executive prestige—are the target. Prefer private, mid-market, regional and family businesses; their owners/operators/founders/shareholders; investors and private-capital principals; beneficial/controlling owners; and concession, franchise or license holders. Look for public evidence of ownership/equity/investment/control, material business/property assets or a business exit, and a plausible way to approach the person through public professional or business channels. Do not infer wealth from seniority alone. Start from a concrete business/sector/geography, use local-language terms and English when useful, test hypotheses with independent evidence, and pivot after generic or repetitive results. The Investigator chooses each action; no fixed sequence. Promote only exact named people whose role, wealth-potential basis, and realistic approach route are source-supported. Never invent a person, relationship, wealth fact, contact, or URL.",
      "CURRENT BOSS-DIRECTED RESEARCH QUESTION (scope constraint, not a fixed tool sequence):",
      "Shift focus to mid-market family-owned manufacturers or service firms in neighboring Central-European countries (e.g., Czech Republic, Slovakia) and seek publicly listed ownership filings or local business registries for named principals.",
      "Pursue this question unless observed evidence directly disproves it or makes it impossible to pursue.",
      "Choose each next action yourself from the available capabilities and observed evidence."
    ].join("\n");
    const blockedObservation = "pivot_alignment_guard blocked this outbound action before execution. The active Boss-accepted pivot is: Shift focus to mid-market family-owned manufacturers or service firms in neighboring Central-European countries (e.g., Czech Republic, Slovakia) and seek publicly listed ownership filings or local business registries for named principals. A new search query must name the pivot subject, geography, and any required source class; follow-up URL/resource actions must be grounded in pivot-aligned source evidence already observed. Rationale, hypothesis, provider, or registry metadata alone does not satisfy scope. Revise the query/resource or ask Boss/Right-hand to approve a new objective. A first aligned search can seed evidence; no outbound request was made.";
    const trajectoryRecords: Parameters<typeof buildStepPrompt>[0]["trajectoryRecords"] = [
      {
        turn: 1, model: "openai/gpt-oss-120b", action: "web_search", execution: "success",
        args: { query: "private equity founder mid-market manufacturing Poland", provider: "serper", hypothesis: "Polish private-capital principals may control mid-market manufacturing firms", purpose: "Identify candidate individuals meeting the criteria", expectedInformationGain: 0.6 },
        observation: "Search results returned six leads including an investor directory and general private-equity material; no source-backed named target established.",
        observedUrls: ["https://revenuebase.ai/companies/mid-market-private-equity-investors/poland", "https://www.ifc.org/en/pressroom/2024/ifc-investment-to-boost-growth-of-lower-mid-market-firms-in-central-and-eastern-europe"],
        findings: [], providerFallback: [],
      },
      {
        turn: 2, model: "openai/gpt-oss-120b", action: "visit", execution: "success",
        args: { url: "https://revenuebase.ai/companies/mid-market-private-equity-investors/poland" },
        observation: "Third-party vendor list of private-equity firms and aggregate matched-contact counts; no independently corroborated person-level ownership or contact evidence.",
        observedUrls: ["https://revenuebase.ai/companies/mid-market-private-equity-investors/poland"],
        findings: [], providerFallback: [],
      },
      {
        turn: 3, model: "openai/gpt-oss-120b", action: "web_search", execution: "success",
        args: { query: "Poland mid-market private equity firms founders list", provider: "serper", hypothesis: "A focused firm list may identify principals for independent verification", purpose: "Find exact founder names and roles", expectedInformationGain: 0.6 },
        observation: "Six broad list/article results; snippets did not name a verified Polish mid-market owner.",
        observedUrls: ["https://growthcapadvisory.com/the-top-private-equity-firms-of-2025/"],
        findings: [], providerFallback: [],
      },
      {
        turn: 4, model: "openai/gpt-oss-120b", action: "visit", execution: "success",
        args: { url: "https://growthcapadvisory.com/the-top-private-equity-firms-of-2025/" },
        observation: "Global private-equity award/ranking article; no hypothesized Polish mid-market founder list found.",
        observedUrls: ["https://growthcapadvisory.com/the-top-private-equity-firms-of-2025/"],
        findings: [], providerFallback: [],
      },
      {
        turn: 5, model: "openai/gpt-oss-120b", action: "web_search", execution: "blocked",
        args: { query: "Czech Republic family-owned manufacturing company owner", provider: "serper", hypothesis: "A public filing may identify a principal behind a family-owned manufacturer", purpose: "Find named principals via the accepted ownership-source pivot", expectedInformationGain: 0.6 },
        observation: blockedObservation,
        observedUrls: [], findings: [], providerFallback: [],
      },
    ];
    const prompt = buildStepPrompt({
      targetName: "",
      objective,
      history: [],
      trajectoryRecords,
      lastObservation: blockedObservation,
      findings: [],
      priorContext: "Prior source observations and provenance. ".repeat(80),
      intelligenceContext: "Research frontier and unresolved evidence requirements. ".repeat(80),
      mode: "discovery",
    });

    expect(prompt.length).toBeLessThanOrEqual(5_600);
    expect(prompt).toContain("Czech Republic, Slovakia");
    expect(prompt).toContain("ownership filings or local business registries");
    expect(prompt).toContain("SCOPE GUARD BLOCKED ACTION");
    expect(prompt).toContain("VALID PROVIDERS:");
    expect(prompt).toContain("ALL REQUIRED TOP-LEVEL FIELDS:");
    expect(prompt).toContain("two independent evidence/source units");
    expect(prompt).toContain("successful falsification-intent action");
  });
});
