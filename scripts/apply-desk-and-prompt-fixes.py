#!/usr/bin/env python3
"""
Bugfix + desk UX:
1) Dig step prompt: stop truncating discovery objective to 1200 chars.
2) Reactor scheme: truly omit inactive tool nodes/edges in Live-tools mode
   (not only opacity 0), and improve tool→node live mapping.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AGENTIC = ROOT / "artifacts/api-server/src/src/lib/agentic-web-research.ts"
REACTOR = ROOT / "artifacts/apex-finder/src/pages/reactor.tsx"


def die(msg: str) -> None:
    raise SystemExit(f"FAIL: {msg}")


def patch_agentic(text: str) -> str:
    old = "OBJECTIVE: ${input.objective.slice(0, 1200)}"
    new = (
        "OBJECTIVE: ${"
        "(/^Discovery slot\\b/i.test(input.targetName)\n"
        "    ? input.objective.slice(0, 4500)\n"
        "    : input.objective.slice(0, 2200))}"
    )
    if old not in text:
        if "4500" in text and "OBJECTIVE:" in text:
            return text
        die("objective slice(0, 1200) not found")
    text = text.replace(old, new, 1)

    if "DISCOVERY OUTPUT CONTRACT" in text and "Visit before claiming identity" not in text:
        old_c = (
            '    ? `\\nDISCOVERY OUTPUT CONTRACT (model-owned, not a search script): if you establish a real named person, '
            'emit action=done with a finding containing personName="Full Name" (or value="person: Full Name | role | company"), '
            'scope="candidate", and sourceUrls containing the exact HTTPS page you actually observed. '
            'A personName-only finding is valid. Do not emit titles, sectors, companies, or prose fragments as people. '
            'If identity is not established, return done with findings=[].\\n`'
        )
        new_c = (
            '    ? `\\nDISCOVERY OUTPUT CONTRACT (model-owned, not a search script): '
            'Invent your own queries. Prefer concrete business/ownership/family-office/operator surfaces; '
            'do not walk Forbes/billionaire rankings. Search snippets are leads — visit the page before claiming identity. '
            'If you establish a real named person, emit action=done with a finding containing personName="Full Name" '
            '(or value="person: Full Name | role | company"), scope="candidate", and sourceUrls containing the exact HTTPS '
            'page you actually observed. A personName-only finding is valid. Do not emit titles, sectors, companies, or '
            'prose fragments as people. If identity is not established, return done with findings=[].\\n`'
        )
        if old_c in text:
            text = text.replace(old_c, new_c, 1)
    return text


def patch_reactor(text: str) -> str:
    old_map = """        for (const tid of toolIds) {
          const x = String(tid).toLowerCase();
          if (x.includes("serper")) light(["perp0"]);
          if (x.includes("tavily")) light(["tavily"]);
          if (x.includes("exa")) light(["exa"]);
          if (x.includes("agentic") || x.includes("web")) light(["mcts", "webdisc"]);
        }"""
    new_map = """        for (const tid of toolIds) {
          const x = String(tid).toLowerCase();
          if (x.includes("serper") || x === "web_search") light(["perp0", "mcts"]);
          if (x.includes("tavily")) light(["tavily", "mcts"]);
          if (x.includes("exa")) light(["exa", "mcts"]);
          if (x.includes("visit") || x.includes("page") || x.includes("browser") || x.includes("scrapfly") || x.includes("zenrows")) light(["webdisc", "mcts"]);
          if (x.includes("harvest") || x.includes("theharvester")) light(["deepweb", "mcts"]);
          if (x.includes("domain") || x.includes("rdap") || x.includes("whois") || x.includes("dns")) light(["inhouse", "mcts"]);
          if (x.includes("maigret") || x.includes("sherlock") || x.includes("holehe") || x.includes("footprint")) light(["maigret", "mcts"]);
          if (x.includes("edgar") || x.includes("sec")) light(["edgar", "mcts"]);
          if (x.includes("companies") || x.includes("registry") || x.includes("brreg") || x.includes("gleif")) light(["ch", "mcts"]);
          if (x.includes("groq") || x.includes("mistral") || x.includes("llm")) light(["groq", "mcts"]);
          if (x.includes("gemini") || x.includes("boss")) light(["gemini"]);
          if (x.includes("agentic") || x.includes("dig") || x === "web") light(["mcts", "webdisc"]);
        }"""
    if old_map in text:
        text = text.replace(old_map, new_map, 1)
    elif "x.includes(\"footprint\")" not in text:
        die("toolIds lighting block not found")

    old_log = """          if (t.includes("edgar")) light(["edgar"]);
        }"""
    new_log = """          if (t.includes("edgar")) light(["edgar"]);
          if (t.includes("footprint") || t.includes("maigret") || t.includes("sherlock") || t.includes("holehe")) light(["maigret", "mcts"]);
          if (t.includes("domain_lookup") || t.includes("rdap") || t.includes("whois")) light(["inhouse", "mcts"]);
          if (t.includes("harvest_domain") || t.includes("theharvester")) light(["deepweb", "mcts"]);
          if (t.includes("registry_search") || t.includes("companies house")) light(["ch", "mcts"]);
          if (t.includes("browser_fetch") || t.includes("scrapfly") || t.includes("zenrows")) light(["webdisc", "mcts"]);
        }"""
    if old_log in text:
        text = text.replace(old_log, new_log, 1)

    old_edge = """          {EDGES.map(e => {
            const A = NM[e.from], B = NM[e.to];
            if (!A || !B) return null;
            const fromStatus = rodStatus(e.from, atlasState, liveNodes);
            const toStatus = rodStatus(e.to, atlasState, liveNodes);"""
    new_edge = """          {EDGES.map(e => {
            const A = NM[e.from], B = NM[e.to];
            if (!A || !B) return null;
            // Activity-only scheme: omit edges that do not touch a live tool (space + truthfulness)
            if (schemeToolsOnly && isLive && liveNodes && liveNodes.size > 0) {
              const keepEdge =
                liveNodes.has(e.from) || liveNodes.has(e.to) ||
                e.from === "target" || e.to === "target" ||
                e.from === "mcts" || e.to === "mcts" ||
                e.from === "evidence" || e.to === "evidence";
              if (!keepEdge) return null;
            }
            const fromStatus = rodStatus(e.from, atlasState, liveNodes);
            const toStatus = rodStatus(e.to, atlasState, liveNodes);"""
    if old_edge in text and "omit edges that do not touch" not in text:
        text = text.replace(old_edge, new_edge, 1)

    old_node_map = """        {NODES.map(n => {
          const status = rodStatus(n.id, atlasState, liveNodes);"""
    new_node_map = """        {NODES.map(n => {
          // Activity-only: do not mount inactive tool nodes while Live tools mode is on
          if (schemeToolsOnly && isLive && liveNodes && liveNodes.size > 0) {
            const keep =
              liveNodes.has(n.id) || n.id === "target" || n.id === "mcts" || n.id === "evidence";
            if (!keep) return null;
          }
          const status = rodStatus(n.id, atlasState, liveNodes);"""
    if "Activity-only: do not mount inactive tool nodes" not in text:
        idx = text.rfind(old_node_map)
        if idx < 0:
            die("desktop NODES.map block not found")
        text = text[:idx] + new_node_map + text[idx + len(old_node_map) :]

    return text


def main() -> None:
    if not AGENTIC.is_file() or not REACTOR.is_file():
        die("missing sources")
    a = AGENTIC.read_text()
    r = REACTOR.read_text()
    if "PLACEHOLDER" in a and len(a) < 5000:
        die("agentic corrupted")
    a2 = patch_agentic(a)
    r2 = patch_reactor(r)
    if a2 == a and r2 == r:
        print("ALREADY_APPLIED")
        return
    if a2 != a:
        if len(a2) < 50000:
            die("agentic too small")
        AGENTIC.write_text(a2)
        print("patched agentic objective + discovery contract")
    if r2 != r:
        if len(r2) < 100000:
            die("reactor too small")
        REACTOR.write_text(r2)
        print("patched reactor activity-only scheme + tool mapping")
    print("OK desk+prompt fixes")


if __name__ == "__main__":
    main()
