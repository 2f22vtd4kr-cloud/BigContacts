#!/usr/bin/env node
/**
 * Mobile live feed: when Atlas is LIVE but bureau eventLog is empty/stale,
 * synthesize human-readable tool lines from recentSpans so operators never
 * see "Standby — no live tool scenes" during real discovery/Dig work.
 */
import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), "artifacts/apex-finder/src/components/mobile-reactor-flow.tsx");
let src = fs.readFileSync(file, "utf8");

if (src.includes("SPAN_FEED_FALLBACK_V1")) {
  console.log("ALREADY mobile span feed");
  process.exit(0);
}

const old = `    if (isLive && tel?.targetName && (out.length === 0 || allDone)) {
      out.push({
        timestamp: new Date().toISOString(),
        kind: "log",
        stage: tel.stage || atlasState?.detail || "Research",
        status: "active",
        targetName: tel.targetName,
        activeToolId: tel.activeToolId,
        toolIds: Array.isArray(tel.toolIds) ? tel.toolIds : [],
        inputSummary: tel.inputSummary,
        resultSummary: tel.resultSummary,
        story: tel.story || tel.inputSummary || tel.stage,
      } as any);
    }
    return out;
  }, [showHistory, filteredDeskEvents, deskEvents, atlasState?.atlasTelemetry, atlasState?.targetName, atlasState?.detail, isLive]);`;

const neu = `    if (isLive && tel?.targetName && (out.length === 0 || allDone)) {
      out.push({
        timestamp: new Date().toISOString(),
        kind: "log",
        stage: tel.stage || atlasState?.detail || "Research",
        status: "active",
        targetName: tel.targetName,
        activeToolId: tel.activeToolId,
        toolIds: Array.isArray(tel.toolIds) ? tel.toolIds : [],
        inputSummary: tel.inputSummary,
        resultSummary: tel.resultSummary,
        story: tel.story || tel.inputSummary || tel.stage,
      } as any);
    }
    // SPAN_FEED_FALLBACK_V1: map recentSpans → plain-language Now/Done lines when
    // eventLog/deskEvents are empty (common during discovery-first free-ReAct).
    if (isLive && out.length === 0) {
      const spans = Array.isArray(atlasState?.recentSpans) ? atlasState!.recentSpans! : [];
      const toolish = spans.filter((s) => {
        const t = String(s.spanType || "");
        const n = String(s.name || "");
        return t === "tool" || n === "web_search" || n === "visit" || n === "browser_fetch"
          || n === "llm_step" || t === "stage" || n === "discovery_slot";
      }).slice(-8);
      for (const s of toolish) {
        const name = String(s.name || s.spanType || "step");
        const active = String(s.status || "") === "active";
        const input = String(s.inputSummary || "").slice(0, 160);
        const result = String(s.resultSummary || "").slice(0, 120);
        let story = "";
        if (name === "web_search" || (name.includes("search") && !/^https?:/i.test(input))) {
          story = active ? ("Now searching: " + (input || "web")) : ("Done search: " + (input || name));
        } else if (name === "visit" || name === "browser_fetch" || /^https?:\/\//i.test(input)) {
          story = active ? ("Now reading page: " + (input || name)) : ("Done page: " + (input || name));
        } else if (name === "discovery_slot" || name === "discovery_agent") {
          story = active ? ("Now discovery " + (input || name)) : ("Done discovery " + (result || input || name));
        } else if (name === "llm_step" || name === "llm_wait") {
          story = active ? "Now model deciding next step…" : "Done model step";
        } else {
          story = active ? ("Now: " + name + " " + input).trim() : ("Done: " + name + " " + (result || input)).trim();
        }
        if (result && !active && !story.includes(result.slice(0, 40))) {
          story = story + " — " + result;
        }
        out.push({
          timestamp: s.startedAt || new Date().toISOString(),
          kind: "log",
          stage: name,
          status: active ? "active" : (String(s.status) === "error" ? "error" : "complete"),
          targetName: s.targetName || atlasState?.detail || "discovery",
          activeToolId: name,
          toolIds: [name],
          inputSummary: input,
          resultSummary: result,
          story,
        } as any);
      }
      if (out.length === 0 && atlasState?.detail) {
        out.push({
          timestamp: new Date().toISOString(),
          kind: "log",
          stage: "atlas",
          status: "active",
          targetName: atlasState.detail,
          story: "Now: " + atlasState.detail,
        } as any);
      }
    }
    return out;
  }, [showHistory, filteredDeskEvents, deskEvents, atlasState?.atlasTelemetry, atlasState?.targetName, atlasState?.detail, atlasState?.recentSpans, isLive]);`;

if (!src.includes(old)) {
  console.error("needle not found for mobile liveEvents");
  process.exit(1);
}
src = src.replace(old, neu);

src = src.replace(
  `: "Standby — no live tool scenes yet"}`,
  `: isLive
                          ? "Live — waiting for the next tool step"
                          : "Standby — no live tool scenes yet"}`,
);

fs.writeFileSync(file, src);
console.log("OK mobile-reactor-flow span feed");
