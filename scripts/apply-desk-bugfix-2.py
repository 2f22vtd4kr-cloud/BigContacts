#!/usr/bin/env python3
"""
Desk / live-scheme bugfixes (round 2):

1) schemeNodesFromSpans mapped domain/rdap/whois → node id "whoxy" while Dig uses
   domain_lookup → RDAP (node id "inhouse"). Wrong node lit; activity-only desk lies.
2) Spans for dig tools often omit "mcts" / FREE DIG core.
3) Mobile scheme always mounts every NODES/EDGES entry (desktop got activity-only).
4) WHOIS poster node subtitle still reads like a mandatory registry stage.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REACTOR = ROOT / "artifacts/apex-finder/src/pages/reactor.tsx"


def die(msg: str) -> None:
    raise SystemExit(f"FAIL: {msg}")


def main() -> None:
    if not REACTOR.is_file():
        die("missing reactor.tsx")
    text = REACTOR.read_text()
    if "PLACEHOLDER" in text and len(text) < 5000:
        die("reactor corrupted")
    orig = text

    old_spans = """function schemeNodesFromSpans(spans: DigSpanView[] | undefined | null): Set<string> {
  const out = new Set<string>();
  if (!spans?.length) return out;
  for (const s of spans) {
    const blob = `${s.name} ${s.inputSummary ?? ""} ${s.spanType}`.toLowerCase();
    if (/web_search|serper|search/.test(blob)) out.add("perp0");
    if (/tavily/.test(blob)) out.add("tavily");
    if (/\\bexa\\b/.test(blob)) out.add("exa");
    if (/visit|browser_fetch|page|scrapfly|zenrows|open.?page/.test(blob)) out.add("webdisc");
    if (/edgar|sec/.test(blob)) out.add("edgar");
    if (/companies.?house|\\bch\\b|brreg|bodacc/.test(blob)) out.add("ch");
    if (/faa|aircraft/.test(blob)) out.add("faa");
    if (/occrp/.test(blob)) out.add("occrp");
    if (/maigret|sherlock|holehe|footprint/.test(blob)) out.add("maigret");
    if (/gemini|boss/.test(blob)) out.add("gemini");
    if (/groq/.test(blob)) out.add("groq");
    if (/whois|rdap|domain/.test(blob)) out.add("whoxy");
    if (/promote|card|phone|email/.test(blob) && s.spanType === "promote") out.add("evidence");
  }
  return out;
}"""
    new_spans = """function schemeNodesFromSpans(spans: DigSpanView[] | undefined | null): Set<string> {
  const out = new Set<string>();
  if (!spans?.length) return out;
  for (const s of spans) {
    const blob = `${s.name} ${s.inputSummary ?? ""} ${s.spanType} ${s.toolName ?? ""}`.toLowerCase();
    let toolHit = false;
    if (/web_search|serper|\\bsearch\\b/.test(blob)) { out.add("perp0"); toolHit = true; }
    if (/tavily/.test(blob)) { out.add("tavily"); toolHit = true; }
    if (/\\bexa\\b/.test(blob)) { out.add("exa"); toolHit = true; }
    if (/visit|browser_fetch|page-fetch|scrapfly|zenrows|open.?page/.test(blob)) { out.add("webdisc"); toolHit = true; }
    if (/harvest|theharvester/.test(blob)) { out.add("deepweb"); toolHit = true; }
    // Dig domain path is RDAP / WhoisJSON → inhouse. Never light deprecated Whoxy product node.
    if (/domain_lookup|\\brdap\\b|whoisjson|\\bwhois\\b|\\bdns\\b/.test(blob)) { out.add("inhouse"); toolHit = true; }
    if (/edgar|sec-edgar|\\bsec\\b/.test(blob)) { out.add("edgar"); toolHit = true; }
    if (/companies.?house|registry_search|\\bch\\b|brreg|bodacc|gleif|opencorporates/.test(blob)) { out.add("ch"); toolHit = true; }
    if (/faa|aircraft/.test(blob)) { out.add("faa"); toolHit = true; }
    if (/occrp/.test(blob)) { out.add("occrp"); toolHit = true; }
    if (/maigret|sherlock|holehe|footprint/.test(blob)) { out.add("maigret"); toolHit = true; }
    if (/gemini|boss/.test(blob)) out.add("gemini");
    if (/groq|mistral|llm_step|llm_wait/.test(blob)) { out.add("groq"); toolHit = true; }
    if (/promote|card|phone|email/.test(blob) && s.spanType === "promote") out.add("evidence");
    // Any real dig tool activity lights FREE DIG core
    if (toolHit || s.spanType === "tool" || s.spanType === "llm") out.add("mcts");
  }
  return out;
}"""
    if "Dig domain path is RDAP" not in text:
        if old_spans not in text:
            if 'out.add("whoxy")' in text and "schemeNodesFromSpans" in text:
                text = text.replace(
                    'if (/whois|rdap|domain/.test(blob)) out.add("whoxy");',
                    'if (/domain_lookup|\\brdap\\b|whoisjson|\\bwhois\\b|\\bdns\\b/.test(blob)) { out.add("inhouse"); }\n'
                    '    else if (/whois|rdap|domain/.test(blob)) { out.add("inhouse"); }',
                    1,
                )
            else:
                die("schemeNodesFromSpans block not found")
        else:
            text = text.replace(old_spans, new_spans, 1)

    mobile_edge_anchor = """                  {EDGES.map(e => {
                    const a = MOBILE_NODE_POS[e.from], b = MOBILE_NODE_POS[e.to];
                    if (!a || !b) return null;
                    const fromStatus = rodStatus(e.from, atlasState, liveNodes);"""
    mobile_edge_new = """                  {EDGES.map(e => {
                    const a = MOBILE_NODE_POS[e.from], b = MOBILE_NODE_POS[e.to];
                    if (!a || !b) return null;
                    // Activity-only mobile scheme: omit idle tool edges while live
                    if (isLive && liveNodes && liveNodes.size > 0) {
                      const keep =
                        liveNodes.has(e.from) || liveNodes.has(e.to) ||
                        e.from === "target" || e.to === "target" ||
                        e.from === "mcts" || e.to === "mcts" ||
                        e.from === "evidence" || e.to === "evidence";
                      if (!keep) return null;
                    }
                    const fromStatus = rodStatus(e.from, atlasState, liveNodes);"""
    if "Activity-only mobile scheme" not in text and mobile_edge_anchor in text:
        text = text.replace(mobile_edge_anchor, mobile_edge_new, 1)

    mobile_node_anchor = """                {NODES.map(n => {
                  const pos = MOBILE_NODE_POS[n.id];
                  if (!pos) return null;
                  const isTarget = n.id === "target";
                  const isOutput = n.id === "evidence";
                  return ("""
    mobile_node_new = """                {NODES.map(n => {
                  const pos = MOBILE_NODE_POS[n.id];
                  if (!pos) return null;
                  // Activity-only: do not mount idle tool nodes on mobile while live
                  if (isLive && liveNodes && liveNodes.size > 0) {
                    const keep =
                      liveNodes.has(n.id) || n.id === "target" || n.id === "mcts" || n.id === "evidence";
                    if (!keep) return null;
                  }
                  const isTarget = n.id === "target";
                  const isOutput = n.id === "evidence";
                  return ("""
    if "Activity-only: do not mount idle tool nodes on mobile" not in text and mobile_node_anchor in text:
        text = text.replace(mobile_node_anchor, mobile_node_new, 1)

    text = text.replace(
        '{ id:"whoxy",   label:"WHOIS",           sub:"RDAP · domain",              cx:1320, cy:480, w:140, h:54,  type:"registry", Icon:Rss,        color:"#38bdf8" },',
        '{ id:"whoxy",   label:"WHOIS",           sub:"legacy alias → use RDAP",  cx:1320, cy:480, w:140, h:54,  type:"registry", Icon:Rss,        color:"#38bdf8" },',
        1,
    )
    text = text.replace(
        '{ id:"inhouse", label:"RDAP / DNS",      sub:"Domain intel",               cx:1180, cy:340, w:150, h:56,  type:"discovery",Icon:Globe,      color:"#fb923c" },',
        '{ id:"inhouse", label:"RDAP / DNS",      sub:"domain_lookup path",         cx:1180, cy:340, w:150, h:56,  type:"discovery",Icon:Globe,      color:"#fb923c" },',
        1,
    )

    if text == orig:
        print("ALREADY_APPLIED_OR_NO_MATCH")
        return
    if len(text) < 100000:
        die("reactor too small after patch")
    REACTOR.write_text(text)
    print("OK desk bugfix round 2")


if __name__ == "__main__":
    main()
