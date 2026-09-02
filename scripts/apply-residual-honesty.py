#!/usr/bin/env python3
"""
Residual honesty + desk consistency after ChatGPT control-plane pass.

1) Discovery-first final job message must not say "complete" when outcome is incomplete.
2) Live-tools opacity/visibility must not re-show the full poster when liveNodes is empty Set.
3) Atlas phase strip labels: soft free-Dig language (no pipeline theater in the strip copy).
"""
from __future__ import annotations
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORCH = ROOT / "artifacts/api-server/src/src/lib/atlas-orchestrator.ts"
REACTOR = ROOT / "artifacts/apex-finder/src/pages/reactor.tsx"
CONTEXT = ROOT / "docs/context.md"


def die(msg: str) -> None:
    raise SystemExit("FAIL: " + msg)


def main() -> None:
    changes = []

    o = ORCH.read_text()
    old = (
        '  const finalMsg = [\n'
        '    `Free-ReAct bureau complete in ${Math.round(durationMs / 60_000)}min.`,\n'
        '    `${totalEntities} entities | ${hotLeads} hot leads | ${totalContacts} contacts found.`,\n'
        '    Object.entries(summary).map(([key, value]) => `${key}: ${value}`).join(" | "),\n'
        '  ].join(" ");'
    )
    new = (
        '  const finalMsg = [\n'
        '    processIncomplete\n'
        '      ? `Free-ReAct bureau ended incomplete in ${Math.round(durationMs / 60_000)}min.`\n'
        '      : `Free-ReAct bureau finished in ${Math.round(durationMs / 60_000)}min.`,\n'
        '    `${totalEntities} entities | ${hotLeads} hot leads | ${totalContacts} contacts found.`,\n'
        '    Object.entries(summary).map(([key, value]) => `${key}: ${value}`).join(" | "),\n'
        '  ].join(" ");'
    )
    if "ended incomplete" not in o:
        if old not in o:
            die("orchestrator finalMsg block not found")
        o = o.replace(old, new, 1)
        ORCH.write_text(o)
        changes.append("orchestrator-finalMsg")

    r = REACTOR.read_text()
    r2 = r.replace(
        'if (!schemeToolsOnly || !isLive || !liveNodes || liveNodes.size === 0) return "visible" as const;',
        'if (!schemeToolsOnly || !isLive || !liveNodes) return "visible" as const;',
    )
    r2 = r2.replace(
        'if (!schemeToolsOnly || !isLive || !liveNodes || liveNodes.size === 0) return "auto" as const;',
        'if (!schemeToolsOnly || !isLive || !liveNodes) return "auto" as const;',
    )
    if 'label: "CROSS-REF"' in r2 and 'label: "STANDBY"' not in r2:
        r2 = r2.replace(
            """const ATLAS_PHASES = [
  { n: 0, label: "CROSS-REF", detail: "Existing records and registry anchors" },
  { n: 1, label: "DISCOVERY", detail: "Free dig discovery — model chooses tools" },
  { n: 2, label: "IDENTITY", detail: "Contacts, ownership, and foundation evidence" },
  { n: 3, label: "METADATA", detail: "Notes, assets, and source markers" },
  { n: 4, label: "IN-HOUSE", detail: "Wikidata, GitHub, RDAP, DNS, and filings" },
  { n: 5, label: "SOCIAL", detail: "Public social and messenger discovery" },
  { n: 6, label: "AI OSINT", detail: "Search, extraction, and platform expansion" },
  { n: 7, label: "FORENSICS", detail: "Leaks, WHOIS, vessels, and flight history" },
  { n: 8, label: "ATTRIBUTION", detail: "Domain, footprint, and graph-assisted attribution" },
  { n: 9, label: "SEMANTIC", detail: "Embeddings, wealth, confidence, and outcomes" },
  { n: 10, label: "PATH RESEARCH", detail: "Adaptive paths and evidence review" },
];""",
            """const ATLAS_PHASES = [
  /* Labels are progress chrome only — not a research playbook. Live tools = span telemetry. */
  { n: 0, label: "BRIEF", detail: "Case orientation" },
  { n: 1, label: "DISCOVER", detail: "Model-selected discovery" },
  { n: 2, label: "DIG", detail: "Free-ReAct investigation" },
  { n: 3, label: "DIG", detail: "Free-ReAct investigation" },
  { n: 4, label: "DIG", detail: "Free-ReAct investigation" },
  { n: 5, label: "DIG", detail: "Free-ReAct investigation" },
  { n: 6, label: "DIG", detail: "Free-ReAct investigation" },
  { n: 7, label: "DIG", detail: "Free-ReAct investigation" },
  { n: 8, label: "DIG", detail: "Free-ReAct investigation" },
  { n: 9, label: "CARD", detail: "Evidence and contact routes" },
  { n: 10, label: "CARD", detail: "Evidence and contact routes" },
];""",
        )
    if r2 != r:
        if len(r2) < 100000:
            die("reactor too small")
        REACTOR.write_text(r2)
        changes.append("reactor-desk-consistency")

    if CONTEXT.is_file() and "Batch 40" not in CONTEXT.read_text():
        CONTEXT.write_text(
            CONTEXT.read_text().rstrip()
            + """


### 2026-09-02 Batch 40 — residual honesty after control-plane pass
ChatGPT Batches 29–39 fixed: Boss typed contract, NVIDIA dead helper removal, Whoxy node removal, activity-only quiet-start, Dig stopReason through bureau-agentic-pass, incomplete outcome when Dig terminal/degraded, model-only admission tests, 3-target CI smoke.

**Residual closed here:**
- Discovery-first final status *message* no longer claims "bureau complete" when `outcome: incomplete`.
- Live-tools opacity path no longer treats empty `liveNodes` as “show full poster” (anchors only until first real tool span).
- Phase strip labels softened to BRIEF/DISCOVER/DIG/CARD progress chrome (not a 11-step OSINT playbook).

**Still unproven:** live 3-target trajectory with real admit → free-ReAct Dig → honest card.
"""
        )
        changes.append("context-batch-40")

    print("OK", ",".join(changes) if changes else "NO_CHANGE")


if __name__ == "__main__":
    main()
