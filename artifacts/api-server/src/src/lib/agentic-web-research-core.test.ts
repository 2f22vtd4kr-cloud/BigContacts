import { describe, expect, it } from "vitest";
import { buildGroqInvestigatorRequestBody, buildStepPrompt, describeAgentActionParseFailure, discoverySearchLivenessGate, validateDiscoverySearchQuery, waitForAbortableDelay } from "./agentic-web-research-core";
import { buildInvestigatorContext } from "./investigation-context-compaction";
import { isAcceptedInvestigatorTerminal } from "./research-terminal-gate";

function livenessRecord(action: string, execution: "success" | "error" | "blocked") {
  return {
    turn: 1,
    model: "test-model",
    action,
    args: {},
    execution,
    observation: execution === "success" ? "observed tool response" : "no response",
    observedUrls: [],
    findings: [],
    providerFallback: [],
  } as Parameters<typeof discoverySearchLivenessGate>[0][number];
}

describe("Investigator prompt architecture", () => {
  it("keeps the composed model prompt materially below the old 12k-character live request", () => {
    const prompt = buildStepPrompt({
      targetName: "",
      objective: "Establish a concrete business anchor before identifying a person.",
      history: [],
      trajectoryRecords: Array.from({ length: 24 }, (_, index) => ({
        turn: index + 1,
        model: "openai/gpt-oss-20b",
        action: "parallel_web_search",
        execution: "success",
        args: { query: "generic research " + index },
        observation: "O".repeat(2_000),
        observedUrls: ["https://example" + index + ".com/source"],
        findings: [],
      })),
      lastObservation: "L".repeat(4_000),
      findings: Array.from({ length: 20 }, (_, index) => ({
        vectorType: "other",
        value: "finding-" + index,
        personName: null,
        role: null,
        scope: "unknown",
        sourceUrls: ["https://source" + index + ".example/page"],
        note: "N".repeat(500),
      })),
      priorContext: "P".repeat(4_000),
      intelligenceContext: "I".repeat(8_000),
      mode: "discovery",
    });

    expect(prompt.length).toBeLessThanOrEqual(8_500);
    expect(prompt).toContain("LATEST TRAJECTORY RECORD");
    expect(prompt).toContain("TURN 24");
    expect(prompt).not.toContain('"action":{"type":"string","enum"');
    expect(prompt).not.toContain("APEX MISSION CONTRACT v");
    expect(prompt).toContain("AVAILABLE ACTIONS: web_search | parallel_web_search | visit | browser_fetch | registry_search | domain_lookup | harvest_domain | footprint_email | footprint_username_maigret | footprint_username_sherlock | footprint_spiderfoot | done.");
    expect(prompt).toContain("VALID PROVIDERS: web_search/parallel_web_search = serper | tavily | exa.");
  });

  it("blocks generic discovery searches until the model supplies a concrete anchor", () => {
    expect(validateDiscoverySearchQuery("2023 venture capital investment biotech company CEO", [])).toEqual({
      allowed: false,
      reason: expect.stringContaining("concrete anchor"),
    });
    expect(validateDiscoverySearchQuery("famous casino owners interview", [])).toEqual({ allowed: false, reason: expect.any(String) });
    expect(validateDiscoverySearchQuery("Acme Holdings CEO official", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("Companies House director Kenya", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("casino owners site:example.com", [])).toEqual({ allowed: true });
    expect(validateDiscoverySearchQuery("2026 acquisition of AI startup by large corporation CEO statement", [])).toEqual({
      allowed: false,
      reason: expect.stringContaining("concrete anchor"),
    });
  });

  it("blocks another search action after three successful search-only actions", () => {
    const records = [
      livenessRecord("web_search", "success"),
      livenessRecord("parallel_web_search", "success"),
      livenessRecord("web_search", "success"),
    ];
    const gate = discoverySearchLivenessGate(records);
    expect(gate.allowed).toBe(false);
    expect(gate.reason).toContain("three successful search actions");
  });

  it("resets only after a successful non-search capability observation", () => {
    const records = [
      livenessRecord("web_search", "success"),
      livenessRecord("parallel_web_search", "success"),
      livenessRecord("web_search", "success"),
      livenessRecord("visit", "success"),
      livenessRecord("web_search", "success"),
      livenessRecord("web_search", "success"),
    ];
    expect(discoverySearchLivenessGate(records)).toEqual({ allowed: true, reason: null });

    const failedVisit = [
      livenessRecord("web_search", "success"),
      livenessRecord("web_search", "success"),
      livenessRecord("web_search", "success"),
      livenessRecord("visit", "error"),
    ];
    expect(discoverySearchLivenessGate(failedVisit).allowed).toBe(false);
  });

  it("does not count failed or blocked searches as successful liveness progress", () => {
    const records = [
      livenessRecord("web_search", "success"),
      livenessRecord("web_search", "error"),
      livenessRecord("web_search", "blocked"),
      livenessRecord("web_search", "success"),
    ];
    expect(discoverySearchLivenessGate(records)).toEqual({ allowed: true, reason: null });
  });

  it("enforces the requested maximum when parsing model action text", () => {
    expect(describeAgentActionParseFailure(JSON.stringify({ action: "x".repeat(80) })))
      .toBe(`unsupported_action action=${"x".repeat(40)}`);
  });

  it("keeps the structured response contract at the provider boundary", () => {
    const body = buildGroqInvestigatorRequestBody({
      model: "openai/gpt-oss-20b",
      prompt: "choose the next research action",
      cognitiveTask: "identity_resolution",
    });
    expect(body.response_format).toBeTruthy();
    expect(body.messages).toHaveLength(2);
    expect((body.messages as Array<{ role: string; content: string }>)[0]?.role).toBe("system");
    const responseFormat = body.response_format as { type?: string; json_schema?: { schema?: Record<string, any> } };
    const schema = responseFormat.json_schema?.schema;
    expect(responseFormat.type).toBe("json_schema");
    expect(schema?.additionalProperties).toBe(false);
    expect(schema?.properties?.searches?.minItems).toBeUndefined();
    expect(schema?.properties?.searches?.maxItems).toBeUndefined();
    expect(schema?.properties?.provider).toEqual({ type: ["string", "null"] });
    expect(schema?.properties?.targetType).toEqual({ type: ["string", "null"] });
  });

  it("reserves the latest trajectory exactly once during context compaction", () => {
    const latest = {
      turn: 2,
      model: "openai/gpt-oss-20b",
      action: "visit",
      execution: "success" as const,
      args: { url: "https://example.com/anchor" },
      observation: "LATEST_OBSERVATION_SENTINEL",
      observedUrls: ["https://example.com/anchor"],
      findings: [],
    };
    const context = buildInvestigatorContext({
      targetName: "",
      objective: "Preserve the latest observation while compacting older state.",
      trajectoryRecords: [
        {
          turn: 1,
          model: "openai/gpt-oss-20b",
          action: "web_search",
          execution: "success",
          args: { query: "older context" },
          observation: "O".repeat(2500),
          observedUrls: ["https://example.com/old"],
          findings: [],
        },
        latest,
      ],
      lastObservation: "",
      findings: [],
      mode: "discovery",
      priorContext: "P".repeat(2500),
      maxChars: 3900,
    });

    expect(context.length).toBeLessThanOrEqual(3900);
    expect(context).toContain("LATEST_OBSERVATION_SENTINEL");
    expect(context.match(/LATEST TRAJECTORY RECORD/g)?.length).toBe(1);
    expect(context.match(/https:\/\/example\.com\/anchor/g)?.length).toBe(1);
  });


  it("classifies malformed Investigator responses without persisting response text", () => {
    expect(describeAgentActionParseFailure("")).toBe("empty_response");
    expect(describeAgentActionParseFailure("not json")).toMatch(/^no_json_object chars=\d+ digest=/);
    expect(describeAgentActionParseFailure("{")).toMatch(/^no_json_object chars=\d+ digest=/);
    expect(describeAgentActionParseFailure('{"foo":"bar"}')).toBe("missing_action");
    expect(describeAgentActionParseFailure('{"action":"invented"}')).toBe("unsupported_action action=invented");
    expect(describeAgentActionParseFailure('{"action":"visit"}')).toBe("invalid_action_arguments action=visit invalid=url");
    expect(describeAgentActionParseFailure('{"action":"web_search","query":"anchor","provider":"serper"} trailing text {"noise":true}')).toBe("invalid_action_arguments action=web_search");
    expect(describeAgentActionParseFailure('{"action":"parallel_web_search","searches":[{"query":"anchor","provider":"serper"}]}')).toBe("invalid_action_arguments action=parallel_web_search searches_min=2");
  });

  it("cancels provider-capacity waits promptly and cleans up the pending timer", async () => {
    const controller = new AbortController();
    const pending = waitForAbortableDelay(60_000, controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow("cancelled");
  });


  it("does not treat a blocked or budget-exhausted model-selected done action as terminal", () => {
    expect(isAcceptedInvestigatorTerminal({ action: "done", execution: "blocked", stopReason: "ITERATION_BUDGET" })).toBe(false);
    expect(isAcceptedInvestigatorTerminal({ action: "done", execution: "success", stopReason: "ITERATION_BUDGET" })).toBe(false);
    expect(isAcceptedInvestigatorTerminal({ action: "done", execution: "blocked", stopReason: "MODEL_DECIDED_DONE" })).toBe(false);
  });

  it("accepts done only after the core succeeds and returns an evidence-gated terminal reason", () => {
    expect(isAcceptedInvestigatorTerminal({ action: "done", execution: "success", stopReason: "MODEL_DECIDED_DONE" })).toBe(true);
    expect(isAcceptedInvestigatorTerminal({ action: "visit", execution: "success", stopReason: "MODEL_DECIDED_DONE" })).toBe(false);
  });

});
