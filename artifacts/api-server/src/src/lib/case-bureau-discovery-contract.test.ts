import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISCOVERY_EXCLUSIONS,
  buildBossDiscoveryResponseFormat,
  buildGroqBossDiscoveryPrompt,
  parseBossDiscoveryResponse,
} from "./case-bureau";
import { buildApexAtlasBossPlanPrompt } from "./case-bureau-prompt";
import type { InvestigatorCapability } from "./investigator-capability-registry";

const investigator = "groq-investigator-1" as InvestigatorCapability;

describe("objective-aligned Boss planning", () => {
  it("includes the human B2B brief and does not impose an unstated less-public preference", () => {
    const objective = "Find B2B software companies and their current decision-makers.";
    const motivation = "Identify companies and relevant professional roles; do not infer personal wealth.";
    const prompt = buildApexAtlasBossPlanPrompt({
      iteration: 1,
      rightHandAdvice: null,
      file: {
        discoveryContext: {
          humanBrief: { objective, motivation, geography: "No geographic restriction", exclusions: [] },
          bossPremise: "Discover objective-relevant B2B companies and professional routes.",
        },
        actionQueue: [],
        target: { name: "B2B software company", type: "company", knownDomains: [] },
        evidenceSummary: { discoveredPeople: [], relatedOrganizations: [], searchGaps: [], negativeFindings: [] },
        contactRoutes: [],
        hypotheses: [],
        specialistRoster: [],
        humanDirectives: [],
        decisionLog: [],
        researchDepth: "standard",
      },
    });

    expect(prompt).toContain(objective);
    expect(prompt).toContain(motivation);
    expect(prompt).toContain("The human mission in CASE STATE is authoritative");
        expect(prompt).toContain("Fame, prominence, wealth labels, seniority, size, listing status, ranking badges and route categories are contextual signals, not eligibility gates.");
    expect(prompt).toContain("General company/press/IR channels are organization routes, not personal access; they may remain useful leads or intermediaries.");
    expect(prompt).toContain("Preserve objective-relevant companies and people regardless of brand fame or listing status.");
    expect(prompt).not.toMatch(/globally famous|household-name.*poor-access|Require a documented person-specific professional route or an explicit human request/i);
    expect(prompt).not.toContain("Prefer less-public, source-backed operators");
    expect(prompt).not.toContain("Ignore incidental famous/celebrity/household-name ultra-wealthy people");
    expect(prompt).not.toMatch(/globally famous|household-name.*poor-access/i);
    expect(prompt).not.toContain("Operating firms need evidence of current private/mid-market operations");
  });
});

describe("default discovery exclusions", () => {
  it("does not impose fame, ranking or route eligibility priors in default discovery", () => {
    const exclusions = DEFAULT_DISCOVERY_EXCLUSIONS.join("\\n");
    expect(exclusions).toContain("Fame, prominence and rankings alone are neither qualifications nor exclusions.");
    expect(exclusions).toContain("Classify generic reception numbers and shared inboxes as organization/shared routes");
    expect(exclusions).not.toMatch(/do not surface globally famous|poor-access prospects|require a documented person-specific professional route/i);
  });
});

describe("source-grounded Boss opening contract", () => {
  it("does not expose candidate URLs or contact evidence in the Boss output schema", () => {
    const format = buildBossDiscoveryResponseFormat([investigator]) as {
      schema?: { properties?: Record<string, unknown>; required?: string[] };
    };
    expect(format.schema?.properties).not.toHaveProperty("report");
    expect(format.schema?.properties).not.toHaveProperty("candidates");
    expect(format.schema?.properties).not.toHaveProperty("nextDirections");
    expect(format.schema?.required).not.toContain("report");
    expect(format.schema?.required).not.toContain("candidates");
    expect(format.schema?.required).not.toContain("nextDirections");
  });

  it("parses only control guidance and never accepts model-generated candidate records", () => {
    const result = parseBossDiscoveryResponse(JSON.stringify({
      investigatorLlm: investigator,
    }), [investigator]);
    expect(result.investigatorLlm).toBe(investigator);
    expect(result.report).toContain("No source observations exist yet");
    expect(result.candidates).toEqual([]);
    expect(result.nextDirections).toEqual([]);

    const fabricated = parseBossDiscoveryResponse(JSON.stringify({
      report: "James Watt is a lead.",
      investigatorLlm: investigator,
      candidates: [{
        name: "James Watt",
        type: "person",
        relevance: "Founder",
        reachability: "Company contact form",
        sourceUrls: ["https://example.test/profile"],
        contactEvidence: [],
      }],
      uncertainties: [],
    }), [investigator]);
    expect(fabricated.investigatorLlm).toBeNull();
    expect(fabricated.candidates).toEqual([]);
  });

  it("instructs Boss to authorize discovery without inventing a target, source, or jurisdiction", () => {
    const prompt = buildGroqBossDiscoveryPrompt({
      objective: "Find source-backed business owners and practical professional routes.",
      motivation: "Identify useful private-company leads.",
    }, [investigator]);
    expect(prompt).toContain("select an available Investigator execution capability");
    expect(prompt).toContain("Investigator model economy: prefer groq-investigator-20b for routine discovery and action selection");
    expect(prompt).toContain("MASTER REFERENCE — APEX ATLAS BUREAU PLAYBOOK");
    expect(prompt).toContain("This is guidance, not a workflow engine.");
    expect(prompt).toContain("Do not choose or name a person, company, asset, registry, provider, country, jurisdiction, query, source URL, contact route, or research direction.");
    expect(prompt).toContain("Do not invent or imply that any target has been discovered.");
    expect(prompt).toContain("After this capability assignment, the Investigator owns research execution.");
    expect(prompt).toContain("randomized, runtime-callable registry/asset-register catalog");
    expect(prompt).toContain("Do not add geographic scope or a target preference.");
    expect(prompt).not.toContain("Geographic premise");
    expect(prompt).not.toContain("Global");
    expect(prompt).not.toContain("Companies House");
    expect(prompt).not.toContain("sourceUrls");
    expect(prompt).not.toContain("contactEvidence");
  });
});
