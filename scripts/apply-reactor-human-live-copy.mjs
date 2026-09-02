#!/usr/bin/env node
/** Reactor live copy: plain spoken English; strip internal dumps. */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const libDir = path.join(root, "artifacts/apex-finder/src/lib");
fs.mkdirSync(libDir, { recursive: true });

const humanizePath = path.join(libDir, "humanize-live-copy.ts");
if (!fs.existsSync(humanizePath)) {
  console.error("missing humanize-live-copy.ts — pull main first");
  process.exit(1);
}

// dig-span-trajectory
{
  const p = path.join(root, "artifacts/apex-finder/src/components/dig-span-trajectory.tsx");
  let t = fs.readFileSync(p, "utf8");
  if (!t.includes("humanizeLiveStep")) {
    t = t.replace(
      'import { cn } from "@/lib/utils";',
      'import { cn } from "@/lib/utils";\nimport { humanizeLiveStep } from "@/lib/humanize-live-copy";',
    );
    t = t.replace(
      "{s.toolName || s.name}",
      "{humanizeLiveStep({ name: s.name, spanType: s.spanType, status: s.status, toolName: s.toolName, inputSummary: s.inputSummary, resultSummary: s.resultSummary, active: s.status === \"active\" }).detail}",
    );
    t = t.replace(
      "{s.spanType}",
      "{humanizeLiveStep({ name: s.name, spanType: s.spanType, status: s.status, toolName: s.toolName, inputSummary: s.inputSummary, resultSummary: s.resultSummary, active: s.status === \"active\" }).title}",
    );
    t = t.replace(
      "No live dig spans yet — free-ReAct steps appear here when tools run.",
      "Nothing on the desk yet — searches and page reads will show up here in plain English.",
    );
    fs.writeFileSync(p, t);
    console.log("OK dig-span-trajectory");
  } else console.log("SKIP dig-span-trajectory");
}

// mobile-reactor-flow
{
  const p = path.join(root, "artifacts/apex-finder/src/components/mobile-reactor-flow.tsx");
  let t = fs.readFileSync(p, "utf8");
  if (!t.includes("humanizeLiveStep")) {
    if (t.includes('from "@/components/dig-span-trajectory"')) {
      t = t.replace(
        'from "@/components/dig-span-trajectory";',
        'from "@/components/dig-span-trajectory";\nimport { humanizeLiveStep, isInternalLiveDump } from "@/lib/humanize-live-copy";',
      );
    } else {
      t = 'import { humanizeLiveStep, isInternalLiveDump } from "@/lib/humanize-live-copy";\n' + t;
    }
    t = t.replace(
      /let story = "";[\s\S]*?if \(result && !active && !story\.includes\(result\.slice\(0, 40\)\)\) \{\s*story = story \+ " — " \+ result;\s*\}/,
      `const human = humanizeLiveStep({
          name,
          spanType: String(s.spanType || ""),
          status: String(s.status || ""),
          inputSummary: input,
          resultSummary: result,
          active,
        });
        const story = human.title + ": " + human.detail;`,
    );
    if (!t.includes("HUMAN_DESK_FILTER_V1") && t.includes("const out = scoped.slice(-6);")) {
      t = t.replace(
        "const out = scoped.slice(-6);",
        `// HUMAN_DESK_FILTER_V1
    const cleanedScoped = scoped.filter((e: any) => {
      const blob = [e?.story, e?.inputSummary, e?.resultSummary, e?.stage, e?.raw].filter(Boolean).join(" ");
      if (isInternalLiveDump(blob) && !e?.targetName) return false;
      if (/BOSS_DISCOVERY_DIRECTION/i.test(blob)) {
        e.story = "Boss set the research brief";
        e.stage = "boss";
        e.inputSummary = undefined;
        e.resultSummary = undefined;
      }
      return true;
    });
    const out = cleanedScoped.slice(-6);`,
      );
    }
    fs.writeFileSync(p, t);
    console.log("OK mobile-reactor-flow");
  } else console.log("SKIP mobile");
}

// bureau-ops-stage garbage
{
  const p = path.join(root, "artifacts/apex-finder/src/components/bureau-ops-stage.tsx");
  let t = fs.readFileSync(p, "utf8");
  if (!t.includes("BOSS_DISCOVERY_DIRECTION")) {
    t = t.replace(
      /function isLogGarbage\(s: string\): boolean \{[\s\S]*?\n\}/,
      `function isLogGarbage(s: string): boolean {
  if (!s) return true;
  const t = s.trim();
  if (t.length < 3) return true;
  if (/^[{\[]/.test(t)) return true;
  if (/BOSS_DISCOVERY_DIRECTION|DISCOVERY_MODEL_STEP|DISCOVERY_ADMIT|DURABLE_PROMOTION|BUREAU\|/i.test(t)) return true;
  if (/modelFindings|vectorType|atlasPhase|sourceUrls.{0,40}https/i.test(t) && t.length > 90) return true;
  if (/slot=\d+\/\d+.*concurrent=/i.test(t)) return true;
  return /DIRECTOR\s+\d{4}-|jobId=/i.test(t) && t.length > 100;
}`,
    );
    fs.writeFileSync(p, t);
    console.log("OK bureau-ops-stage");
  } else console.log("SKIP bureau-ops-stage");
}

console.log("REACTOR_HUMAN_LIVE_COPY_APPLIED");
