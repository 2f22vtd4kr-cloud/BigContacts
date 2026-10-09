import { describe, expect, it } from "vitest";
import {
  describeAgentActionParseFailure,
  isModelSelectableAgentAction,
} from "../lib/agentic-web-research-core";

describe("agentic Python capability execution boundary", () => {
  it.each([
    ["footprint_email", '{"action":"footprint_email","email":"person@example.com"}'],
    ["footprint_username_maigret", '{"action":"footprint_username_maigret","username":"example"}'],
    ["footprint_username_sherlock", '{"action":"footprint_username_sherlock","username":"example"}'],
    ["harvest_domain", '{"action":"harvest_domain","domain":"example.com"}'],
    ["footprint_spiderfoot", '{"action":"footprint_spiderfoot","target":"example.com","targetType":"domain","profile":"domain-infrastructure"}'],
  ])("rejects disabled Python capability %s before tool execution", (action, actionJson) => {
    expect(isModelSelectableAgentAction(action)).toBe(false);
    expect(describeAgentActionParseFailure(actionJson)).toContain(`unsupported_action action=${action}`);
  });

  it("retains the enabled model-directed research capabilities", () => {
    expect(isModelSelectableAgentAction("web_search")).toBe(true);
    expect(isModelSelectableAgentAction("parallel_web_search")).toBe(true);
    expect(isModelSelectableAgentAction("visit")).toBe(true);
    expect(isModelSelectableAgentAction("browser_fetch")).toBe(true);
    expect(isModelSelectableAgentAction("registry_search")).toBe(true);
    expect(isModelSelectableAgentAction("domain_lookup")).toBe(true);
    expect(isModelSelectableAgentAction("done")).toBe(true);
  });
});
