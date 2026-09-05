#!/usr/bin/env python3
"""Robust desk bugfix: line-level patches (no fragile whole-function match)."""
from __future__ import annotations
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REACTOR = ROOT / "artifacts/apex-finder/src/pages/reactor.tsx"


def die(msg: str) -> None:
    raise SystemExit("FAIL: " + msg)


def main() -> None:
    text = REACTOR.read_text()
    if len(text) < 100000:
        die("reactor too small")
    orig = text

    text = text.replace(
        'if (/whois|rdap|domain/.test(blob)) out.add("whoxy");',
        'if (/domain_lookup|rdap|whoisjson|whois|dns|domain/.test(blob)) out.add("inhouse"); // Dig path = RDAP, not Whoxy product',
    )
    needle = 'if (/promote|card|phone|email/.test(blob) && s.spanType === "promote") out.add("evidence");\n  }\n  return out;\n}'
    insert = (
        'if (/promote|card|phone|email/.test(blob) && s.spanType === "promote") out.add("evidence");\n'
        '    if (/web_search|visit|browser|footprint|domain|registry|harvest|serper|tavily|exa|groq|mistral|llm/.test(blob)\n'
        '      || s.spanType === "tool" || s.spanType === "llm") out.add("mcts");\n'
        '  }\n  return out;\n}'
    )
    if 'out.add("mcts");\n  }\n  return out;\n}' not in text and needle in text:
        text = text.replace(needle, insert, 1)

    if 'out.add("deepweb")' not in text[text.find("schemeNodesFromSpans"): text.find("schemeNodesFromSpans") + 1200]:
        text = text.replace(
            'if (/visit|browser_fetch|page|scrapfly|zenrows|open.?page/.test(blob)) out.add("webdisc");',
            'if (/visit|browser_fetch|page|scrapfly|zenrows|open.?page/.test(blob)) out.add("webdisc");\n'
            '    if (/harvest|theharvester/.test(blob)) out.add("deepweb");',
            1,
        )

    if "Activity-only mobile scheme" not in text:
        old = (
            "                  {EDGES.map(e => {\n"
            "                    const a = MOBILE_NODE_POS[e.from], b = MOBILE_NODE_POS[e.to];\n"
            "                    if (!a || !b) return null;\n"
            "                    const fromStatus = rodStatus(e.from, atlasState, liveNodes);"
        )
        new = (
            "                  {EDGES.map(e => {\n"
            "                    const a = MOBILE_NODE_POS[e.from], b = MOBILE_NODE_POS[e.to];\n"
            "                    if (!a || !b) return null;\n"
            "                    // Activity-only mobile scheme: omit idle tool edges while live\n"
            "                    if (isLive && liveNodes && liveNodes.size > 0) {\n"
            "                      const keep =\n"
            '                        liveNodes.has(e.from) || liveNodes.has(e.to) ||\n'
            '                        e.from === "target" || e.to === "target" ||\n'
            '                        e.from === "mcts" || e.to === "mcts" ||\n'
            '                        e.from === "evidence" || e.to === "evidence";\n'
            "                      if (!keep) return null;\n"
            "                    }\n"
            "                    const fromStatus = rodStatus(e.from, atlasState, liveNodes);"
        )
        if old not in text:
            die("mobile edge anchor missing")
        text = text.replace(old, new, 1)

    if "Activity-only: do not mount idle tool nodes on mobile" not in text:
        old = (
            "                {NODES.map(n => {\n"
            "                  const pos = MOBILE_NODE_POS[n.id];\n"
            "                  if (!pos) return null;\n"
            '                  const isTarget = n.id === "target";\n'
            '                  const isOutput = n.id === "evidence";\n'
            "                  return ("
        )
        new = (
            "                {NODES.map(n => {\n"
            "                  const pos = MOBILE_NODE_POS[n.id];\n"
            "                  if (!pos) return null;\n"
            "                  // Activity-only: do not mount idle tool nodes on mobile while live\n"
            "                  if (isLive && liveNodes && liveNodes.size > 0) {\n"
            "                    const keep =\n"
            '                      liveNodes.has(n.id) || n.id === "target" || n.id === "mcts" || n.id === "evidence";\n'
            "                    if (!keep) return null;\n"
            "                  }\n"
            '                  const isTarget = n.id === "target";\n'
            '                  const isOutput = n.id === "evidence";\n'
            "                  return ("
        )
        if old not in text:
            die("mobile node anchor missing")
        text = text.replace(old, new, 1)

    text = text.replace('sub:"RDAP · domain"', 'sub:"legacy alias → RDAP"', 1)
    text = text.replace('sub:"Domain intel"', 'sub:"domain_lookup path"', 1)

    if text == orig:
        print("NO_CHANGE")
        return
    if 'out.add("inhouse")' not in text:
        die("inhouse mapping missing after patch")
    if "Activity-only mobile scheme" not in text:
        die("mobile edge patch missing")
    REACTOR.write_text(text)
    print("OK desk-bugfix-2b")


if __name__ == "__main__":
    main()
