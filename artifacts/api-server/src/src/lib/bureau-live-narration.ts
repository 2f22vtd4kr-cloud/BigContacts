/**
 * Right-hand live narration for Reactor — adaptive prose, never scripted templates.
 *
 * Boss keeps orchestration. Right-hand (NVIDIA) writes short operator-facing
 * commentary in parallel so the desk explains what is happening under the hood.
 * Non-blocking: never delays research; rate-limited; fails soft without key.
 */

import { logger } from "./logger";
import { publishBureauEvent, type BureauLiveEvent } from "./bureau-live-log";

let lastNarrationAt = 0;
const MIN_GAP_MS = 4_500;
let inFlight = 0;
const MAX_IN_FLIGHT = 1;

const NARRATABLE = new Set([
  "search",
  "page-fetch",
  "fetch",
  "extract",
  "plan",
  "decision",
  "registry",
  "tool",
  "gate",
  "assignment",
  "observation",
  "footprint",
  "domain",
  "harvest",
  "whois",
  "browser",
  "web_search",
  "visit",
  "boss",
]);

function shouldNarrate(event: BureauLiveEvent): boolean {
  if (event.actor === "right_hand" && event.kind === "narration") return false;
  if (event.level === "error" && !event.title) return false;
  const kind = (event.kind || "").toLowerCase();
  if (kind && NARRATABLE.has(kind)) return true;
  // Tool / web / registry activity without kind
  if (event.actor === "web" || event.actor === "tool" || event.actor === "registry") return true;
  if (event.actor === "boss" && /plan|decision|assign/i.test(event.title + (event.kind || ""))) return true;
  if (event.provider && /serper|tavily|exa|scrapfly|zenrows|holehe|maigret|sherlock|edgar|whois|harvester|whoxy/i.test(event.provider)) return true;
  return Boolean(event.why || event.ask || event.responseSummary);
}

/**
 * Fire-and-forget: publish adaptive right-hand narration for a research event.
 * Safe to call after every publishBureauEvent.
 */
export function scheduleBureauLiveNarration(event: BureauLiveEvent): void {
  if (!shouldNarrate(event)) return;
  const now = Date.now();
  if (now - lastNarrationAt < MIN_GAP_MS) return;
  if (inFlight >= MAX_IN_FLIGHT) return;
  if (!process.env.NVIDIA_NIM_API_KEY?.trim() && !process.env.NVIDIA_API_KEY?.trim() && !process.env.NVIDIA_KEY?.trim()) {
    return;
  }

  lastNarrationAt = now;
  inFlight += 1;
  void (async () => {
    try {
      const { runNvidiaNimFreeJson } = await import("./nvidia-nim-case-reasoning");
      const prompt = [
        "You are the right-hand advisor narrating live research for the Apex Atlas Reactor desk.",
        "Write ONE short operator-facing line (1–2 sentences, max 220 chars) explaining what is happening now under the hood.",
        "Be specific to THIS step — adaptive, not a template. No bullet lists. Never invent contacts, people, or URLs.",
        "Do not give orders to investigators. Do not claim success if the event is incomplete.",
        "",
        `Actor: ${event.actor}`,
        `Kind: ${event.kind ?? "activity"}`,
        `Title: ${event.title}`,
        event.targetName ? `Target: ${event.targetName}` : "",
        event.provider ? `Provider/tool: ${event.provider}` : "",
        event.why ? `Why: ${event.why}` : "",
        event.ask ? `Ask: ${event.ask}` : "",
        event.responseSummary ? `Result so far: ${event.responseSummary}` : "",
        event.detail ? `Detail: ${String(event.detail).slice(0, 280)}` : "",
        "",
        'Return JSON only: { "narration": "your line here" }',
      ]
        .filter(Boolean)
        .join("\n");

      const nv = await runNvidiaNimFreeJson(
        prompt,
        "You narrate live OSINT for operators. Reply with ONE JSON object: {\"narration\":\"...\"}. Never invent contacts.",
      );
      if (nv.status !== "completed" || !nv.raw) return;

      let line = "";
      try {
        const fenced = nv.raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
        const source = fenced || nv.raw.trim();
        const start = source.indexOf("{");
        const end = source.lastIndexOf("}");
        if (start >= 0 && end > start) {
          const parsed = JSON.parse(source.slice(start, end + 1)) as { narration?: string; line?: string };
          line = String(parsed.narration || parsed.line || "").trim();
        }
      } catch {
        line = "";
      }
      if (!line || line.length < 12) return;
      line = line.replace(/\s+/g, " ").slice(0, 280);

      await publishBureauEvent({
        actor: "right_hand",
        kind: "narration",
        title: line,
        caseId: event.caseId,
        jobId: event.jobId,
        targetName: event.targetName,
        provider: event.provider ?? nv.model,
        why: "Live desk narration (right-hand) — explains under-the-hood work without steering the investigation",
        responseSummary: event.title.slice(0, 160),
        level: "info",
      });
    } catch (err: any) {
      logger.debug({ err: err?.message }, "bureau live narration skipped");
    } finally {
      inFlight = Math.max(0, inFlight - 1);
    }
  })();
}
