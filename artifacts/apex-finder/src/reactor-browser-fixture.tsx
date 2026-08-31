import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BureauOpsStage, type OpsEvent } from "./components/bureau-ops-stage";
import "./index.css";

const target = "Demo Holdings Ltd";

const fixtureEvents: OpsEvent[] = [
  {
    timestamp: new Date(Date.now() - 26_000).toISOString(),
    kind: "search",
    stage: "Web search",
    status: "done",
    targetName: target,
    query: "Demo Holdings Ltd board director",
    resultSummary: "Search results returned a primary company page and a board listing.",
    sourceUrls: ["https://example.com/search/demo-holdings"],
    provider: "search",
    actor: "discovery",
  },
  {
    timestamp: new Date(Date.now() - 8_000).toISOString(),
    kind: "page-fetch",
    stage: "Opening primary source",
    status: "active",
    targetName: target,
    sourceUrls: ["https://example.com/demo-holdings/leadership"],
    resultSummary: "Primary leadership page is being inspected for the named principal and role context.",
    narration: "The search surfaced a primary leadership page, so I am checking the named person against the company context before treating the identity as established.",
    provider: "browser",
    actor: "right_hand",
  },
  {
    timestamp: new Date(Date.now() - 5_000).toISOString(),
    kind: "registry",
    stage: "Public-record cross-check",
    status: "done",
    targetName: target,
    resultSummary: "A registry record corroborates the company identity.",
    sourceUrls: ["https://example.com/registry/demo-holdings"],
    evidence: 1,
    provider: "registry",
    actor: "registry",
  },
  {
    timestamp: new Date(Date.now() - 2_000).toISOString(),
    kind: "extract",
    stage: "Identity evidence",
    status: "done",
    targetName: target,
    resultSummary: "The current identity hypothesis is retained with source-backed context.",
    sourceUrls: ["https://example.com/demo-holdings/leadership"],
    evidence: 2,
    provider: "llm",
    actor: "investigator",
  },
];

function Fixture() {
  const [swipe, setSwipe] = useState("none");
  return (
    <main className="min-h-screen bg-[#080c11] px-3 py-4 text-stone-100 sm:px-6 sm:py-6 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0d1219]/70 px-3 py-2 font-mono text-[9px] uppercase tracking-[.16em] text-stone-600">
          <span>Reactor browser inspection fixture</span>
          <span data-testid="fixture-swipe-status">mobile swipe: {swipe}</span>
        </div>
        <BureauOpsStage
          events={fixtureEvents}
          title="REACTOR LIVE · BROWSER INSPECTION"
          onEdgeSwipe={(direction) => setSwipe(direction)}
        />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
