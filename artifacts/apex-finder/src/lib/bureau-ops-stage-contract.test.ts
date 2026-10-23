import { describe, expect, it } from "vitest";
import { extractQuery, isLogGarbage, toScene } from "../components/bureau-ops-stage";

describe("live Bureau ops projection preserves event truth", () => {
  it("filters internal trace markers without classifying ordinary operator text as garbage", () => {
    expect(isLogGarbage("DISCOVERY_MODEL_STEP turn=3")).toBe(true);
    expect(isLogGarbage("The bureau is checking official company filings")).toBe(false);
    expect(isLogGarbage("Searching official registry filings for a regional owner")).toBe(false);
  });

  it("extracts a recorded query from a real search event", () => {
    expect(extractQuery({
      methodKind: "search",
      activeToolId: "web_search",
      stage: "serper web_search",
      status: "success",
      inputSummary: "Query: official Swedish company ownership filings",
      resultSummary: "Search returned four leads.",
    })).toBe("official Swedish company ownership filings");
  });

  it("does not label a Serper/Tavily/Exa search as Google", () => {
    const scene = toScene({
      methodKind: "search",
      activeToolId: "web_search",
      stage: "serper web_search",
      provider: "serper",
      status: "success",
      timestamp: new Date().toISOString(),
      inputSummary: "Query: official Swedish company ownership filings",
      resultSummary: "Search returned four leads.",
    }, 0);

    expect(scene.kind).toBe("serp");
    expect(scene.provider).toBe("serper");
    expect(scene.query).toBe("official Swedish company ownership filings");
  });

  it("keeps an actual Google event on the Google scene", () => {
    const scene = toScene({
      methodKind: "search",
      activeToolId: "google_search",
      stage: "google search",
      provider: "google",
      status: "success",
      timestamp: new Date().toISOString(),
      inputSummary: "Query: public company filings",
      resultSummary: "Search returned two leads.",
    }, 0);

    expect(scene.kind).toBe("google");
    expect(scene.provider).toBe("google");
  });
});
