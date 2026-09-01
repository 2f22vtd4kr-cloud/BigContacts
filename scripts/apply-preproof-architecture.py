#!/usr/bin/env python3
"""Compact pre-proof hardener for Apex. No force hops. No Gemini Dig."""
from __future__ import annotations
import re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
A = ROOT / "artifacts/api-server/src/src/lib/agentic-web-research.ts"
T = ROOT / "artifacts/api-server/src/src/lib/atlas-orchestrator.ts"
O = ROOT / "artifacts/api-server/src/src/lib/apex-bureau-orientation.ts"
R = ROOT / "docs/REPLIT_UPDATE_PROMPT_LATEST.md"
W = ROOT / "artifacts/api-server/src/src/lib/whoxy-enricher.ts"
C = ROOT / "docs/bureau-plan/10_TOOL_CATALOG.md"

def die(m): raise SystemExit("FAIL: " + m)

def main():
    if not A.is_file() or not T.is_file(): die("missing sources")
    a = A.read_text()
    if "PLACEHOLDER" in a and len(a) < 5000: die("agentic corrupted")
    if "DISCOVERY STATE" in T.read_text() and "Whoxy deprecated" in a:
        print("ALREADY_APPLIED"); return

    a = a.replace('  | { action: "reverse_whois"; query: string; thought?: string }\n', "")
    a = a.replace(
        '    if ((action === "reverse_whois" || action === "whoxy") && typeof o.query === "string" && o.query.trim().length >= 3) {\n'
        '      return { action: "reverse_whois", query: o.query.trim().slice(0, 200), thought: typeof o.thought === "string" ? o.thought : undefined };\n'
        '    }\n', "")
    a = a.replace('"browser_fetch", "reverse_whois", "done"', '"browser_fetch", "done"')
    a = a.replace('{"action":"reverse_whois","query":"name or email","thought":"..."}  // Whoxy when keyed\n', "")
    a = a.replace(
        "footprint_email, footprint_username, domain_lookup, harvest_domain, registry_search, reverse_whois, done.",
        "footprint_email, footprint_username, domain_lookup, harvest_domain, registry_search, done.")
    a = a.replace(
        "web_search | visit | browser_fetch | footprint_* | domain_lookup | harvest_domain | registry_search | reverse_whois | done",
        "web_search | visit | browser_fetch | footprint_* | domain_lookup | harvest_domain | registry_search | done")

    pat = re.compile(r"    if \(action\.action === \"reverse_whois\"\) \{.*?\n      continue;\n    \}\n\n", re.S)
    repl = (
        "    // Whoxy removed from canonical Dig. Use domain_lookup (RDAP→WhoisJSON).\n"
        "    if ((action as { action?: string }).action === \"reverse_whois\" || (action as { action?: string }).action === \"whoxy\") {\n"
        "      history.push(`step${i + 1}: reverse_whois rejected (Whoxy deprecated; use domain_lookup)`);\n"
        "      lastObservation = \"TOOL_UNAVAILABLE: reverse_whois/Whoxy removed. Use domain_lookup (RDAP→WhoisJSON).\";\n"
        "      emitLive({ action: \"tool\", query: \"reverse_whois\", provider: \"none\", summary: \"whoxy deprecated\" });\n"
        "      continue;\n"
        "    }\n\n"
    )
    if not pat.search(a):
        if "Whoxy deprecated" not in a: die("reverse_whois block missing")
    else:
        a = pat.sub(repl, a, count=1)

    a = a.replace(
        "        scope: \"candidate\",\n"
        "        sourceUrls: [sourceUrl],\n"
        "        note: `Related officer in contact/IR block on ${sourceUrl}`,",
        "        scope: \"unknown\",\n"
        "        sourceUrls: [sourceUrl],\n"
        "        note: `auto_extract: Related officer in contact/IR block on ${sourceUrl}`,",
    )
    a = re.sub(
        r"(value: `related-person:\$\{cand\}`,\s*personName: cand,\s*role: \"proxy_table\",\s*)scope: \"candidate\"",
        r'\1scope: "unknown"', a)
    a = a.replace(
        "        note: `related person from snippet; ${role}`,",
        "        note: `auto_extract: related person from snippet; ${role}`,",
    )
    a = a.replace(
        "        role: role || \"related_contact\",\n"
        "        scope: \"organization\",\n"
        "        sourceUrls: [src],\n"
        "        note: `auto_extract: related person from snippet; ${role}`,",
        "        role: role || \"related_contact\",\n"
        "        scope: \"unknown\",\n"
        "        sourceUrls: [src],\n"
        "        note: `auto_extract: related person from snippet; ${role}`,",
    )

    if len(a) < 50000: die("agentic too small after patch")
    if 'await import("./whoxy-enricher")' in a and "Whoxy deprecated" not in a: die("whoxy still live")
    A.write_text(a)

    t = T.read_text()
    if "DISCOVERY STATE" not in t:
        mstart = t.find('    "MODEL TARGET"')
        start = t.find('      const agentic = await runBureauAgenticWebPass({', mstart if mstart > 0 else 0)
        end = t.find("      });", start)
        if start < 0 or end < 0: die("atlas bounds")
        new_call = (
            "      const discoveryUrls = Array.isArray(metadata.sourceUrls)\n"
            "        ? (metadata.sourceUrls as unknown[]).map(String).filter((u) => /^https?:\\/\\//i.test(u)).slice(0, 8)\n"
            "        : [];\n"
            "      const discoveryRole = typeof metadata.role === \"string\" ? metadata.role : null;\n"
            "      const discoveryBasis = typeof entity.notes === \"string\"\n"
            "        ? entity.notes.split(\"\\n\").slice(0, 6).join(\" | \").slice(0, 600)\n"
            "        : \"\";\n"
            "      const agentic = await runBureauAgenticWebPass({\n"
            "        targetName: entity.name,\n"
            "        companyName,\n"
            "        jobId: atlasJobId,\n"
            "        entityId: entity.id,\n"
            "        persist: true,\n"
            "        objective: [\n"
            "          apexOrientationCompact(\"investigator\"),\n"
            "          `Research the public identity and contact surface for ${entity.name}${companyName ? ` (${companyName})` : \"\"}.`,\n"
            "          \"DISCOVERY STATE (already established — do not re-prove identity from zero unless evidence conflicts):\",\n"
            "          `- person: ${entity.name}`,\n"
            "          discoveryRole ? `- role: ${discoveryRole}` : null,\n"
            "          companyName ? `- organization: ${companyName}` : null,\n"
            "          discoveryUrls.length ? `- sourceUrls: ${discoveryUrls.join(\" | \")}` : null,\n"
            "          discoveryBasis ? `- discovery notes: ${discoveryBasis}` : null,\n"
            "          \"Use discovery sources as prior evidence. Choose every next action yourself from available non-LLM tools.\",\n"
            "          \"Do not follow a checklist or fixed hop order. Stop only when evidence is exhausted or the budget is reached.\",\n"
            "          \"Every finding must retain an exact public source URL; never invent a person, route, relationship, or URL.\",\n"
            "        ].filter(Boolean).join(\"\\n\"),\n"
            "      });"
        )
        t = t[:start] + new_call + t[end + len("      });"):]
        if "BOSS_DISCOVERY_DIRECTION" not in t:
            old = '  await status("AI discovery agent: model-selected public people hunt…", 0);'
            boss = (
                '  await status("Boss: research direction for discovery-first…", 0);\n'
                '  try {\n'
                '    const { resolveGeminiBossModel, generateGeminiBossText } = await import("./case-bureau");\n'
                '    const selection = await resolveGeminiBossModel();\n'
                '    if (selection?.model) {\n'
                '      const brief = await generateGeminiBossText(\n'
                '        "Apex Boss: short direction for finding reachable principals (founders/owners/operators), not celebrity lists. "\n'
                '        + "No search queries or tool hop lists. 3-6 sentences only.",\n'
                '      );\n'
                '      if (brief?.text) {\n'
                '        await appendJobLog(atlasJobId, `BOSS_DISCOVERY_DIRECTION model=${brief.model} ${String(brief.text).slice(0, 400)}`).catch(() => {});\n'
                '      }\n'
                '    }\n'
                '  } catch { /* optional */ }\n'
                '  await status("AI discovery agent: model-selected public people hunt…", 0);'
            )
            if old in t:
                t = t.replace(old, boss, 1)
        T.write_text(t)

    if O.is_file():
        o = O.read_text().replace("- reverse_whois — Whoxy (when keyed)", "- domain_lookup — RDAP → WhoisJSON (Whoxy removed)")
        O.write_text(o)
    if R.is_file():
        r = R.read_text().replace(
            "  GROQ_API_KEY         (or GEMINI / MISTRAL / NVIDIA_NIM)",
            "  GROQ_API_KEY or MISTRAL_API_KEY   ← Dig only (NOT Gemini/NVIDIA)",
        )
        R.write_text(r)
    if C.is_file():
        c = C.read_text()
        c = re.sub(r"\| reverse_whois \|[^\n]+\n",
                   "| domain_lookup | Infra | RDAP → WhoisJSON | Domain (Whoxy removed) |\n", c, count=1)
        C.write_text(c)
    if W.is_file() and not W.read_text().startswith("/**\n * DEPRECATED"):
        W.write_text("/**\n * DEPRECATED — not part of canonical Apex Dig. Use domain_lookup.\n */\n" + W.read_text())

    print("OK compact pre-proof applied")

if __name__ == "__main__":
    main()
