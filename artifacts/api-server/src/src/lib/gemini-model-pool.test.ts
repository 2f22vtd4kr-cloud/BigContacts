import { describe, expect, it } from "vitest";
import {
  chooseGeminiControlModels,
  getGeminiControlModel,
  getGeminiThinkingLevel,
  chooseAvailableGeminiControlModels,
  markGeminiModelRateLimited,
} from "./gemini-model-pool";

const CATALOG = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-live",
  "gemini-3.1-flash-lite-preview",
];

describe("Gemini free-tier control model pool", () => {
  it("keeps Right-hand on the high-volume Flash-Lite pool before standard Flash", () => {
    expect(chooseGeminiControlModels("right_hand", CATALOG)).toEqual([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
    ]);
  });

  it("keeps Boss on the stronger standard Flash pool before Lite capacity fallbacks", () => {
    expect(chooseGeminiControlModels("boss", CATALOG)).toEqual([
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ]);
  });

  it("uses only thinking levels documented for each stable control model", () => {
    expect(getGeminiThinkingLevel("gemini-3.8-flash")).toBe("low");
    expect(getGeminiThinkingLevel("gemini-3.7-flash")).toBe("low");
    expect(getGeminiThinkingLevel("gemini-3.6-flash")).toBe("minimal");
    expect(getGeminiThinkingLevel("gemini-3.5-flash")).toBe("minimal");
    expect(getGeminiThinkingLevel("gemini-3.5-flash-lite")).toBe("minimal");
    expect(getGeminiThinkingLevel("gemini-3.1-flash-lite")).toBe("minimal");
  });

  it("does not treat Live or preview models as text control fallbacks", () => {
    expect(chooseGeminiControlModels("right_hand", [
      "gemini-3.8-live",
      "gemini-3.1-flash-lite-preview",
    ])).toEqual([]);
    expect(getGeminiControlModel("gemini-3.8-live")).toBeNull();
  });

  it("does not revive a model when every eligible model is cooling down", () => {
    markGeminiModelRateLimited("gemini-3.5-flash-lite", 60_000, "project-c");
    markGeminiModelRateLimited("gemini-3.1-flash-lite", 60_000, "project-c");
    expect(chooseAvailableGeminiControlModels(
      "right_hand",
      ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
      "project-c",
    )).toEqual([]);
  });

  it("keeps cooldown state isolated when Boss and Right-hand use different projects", () => {
    markGeminiModelRateLimited("gemini-3.5-flash-lite", 60_000, "project-a");
    expect(chooseAvailableGeminiControlModels(
      "right_hand",
      ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
      "project-a",
    )[0]).toBe("gemini-3.1-flash-lite");
    expect(chooseAvailableGeminiControlModels(
      "right_hand",
      ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
      "project-b",
    )[0]).toBe("gemini-3.5-flash-lite");
  });
});
