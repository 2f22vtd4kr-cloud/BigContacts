#!/usr/bin/env python3
"""Safely apply the model-owned discovery control-plane fix to known source shapes."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
A = ROOT / "artifacts/api-server/src/src/lib/agentic-web-research.ts"
D = ROOT / "artifacts/api-server/src/src/lib/discovery-agent.ts"

for p, minimum in ((A, 2000), (D, 280)):
    text = p.read_text()
    if len(text.splitlines()) < minimum or "PLACEHOLDER" in text:
        raise SystemExit(f"refusing to patch {p}: source is not whole")

at = A.read_text()
dt = D.read_text()

if "modelFindings:" in at and "stopReason:" in at and "result.modelFindings" in dt:
    print("ALREADY_PATCHED")
    raise SystemExit(0)

# 1) Preserve the model's explicit done.findings separately from deterministic extracts.
at = at.replace(
'''  findings: AgenticFinding[];\n  trajectory: string[];\n  error?: string;''',
'''  findings: AgenticFinding[];\n  /** Findings explicitly emitted by the model in action=done; never auto-extracted. */\n  modelFindings: AgenticFinding[];\n  /** Why the ReAct loop stopped; completed alone is not a quality signal. */\n  stopReason: "MODEL_DECIDED_DONE" | "ITERATION_BUDGET" | "HARD_TIMEOUT" | "CANCELLED" | "LLM_UNAVAILABLE" | "PARSE_FAILURE";\n  trajectory: string[];\n  error?: string;''',
)

# 2) Make the parser accept personName-only / vectorType=person output and normalize it
# into the existing fail-closed finding shape used by discovery-agent.ts.
at = at.replace(
'''        const value = typeof row.value === "string" ? row.value.trim() : "";\n        if (!value) continue;''',
'''        const rawPersonName = typeof row.personName === "string" ? row.personName.trim() : "";\n        const rawVector = String(row.vectorType ?? "other").toLowerCase();\n        const isPersonEmit = rawVector === "person" || Boolean(rawPersonName && !row.value);\n        const value = typeof row.value === "string" ? row.value.trim() : (isPersonEmit ? rawPersonName : "");\n        if (!value) continue;''',
)
at = at.replace(
'''        const vectorType = ["email", "phone", "linkedin", "website", "other", "social"].includes(String(row.vectorType))\n          ? (String(row.vectorType) as AgenticFinding["vectorType"])\n          : "other";''',
'''        const vectorType = ["email", "phone", "linkedin", "website", "other", "social"].includes(rawVector)\n          ? (rawVector as AgenticFinding["vectorType"])\n          : "other";''',
)
at = at.replace(
'''        cleaned.push({\n          vectorType,\n          value: finalValue.slice(0, 500),\n          personName: typeof row.personName === "string" ? row.personName.slice(0, 120) : null,''',
'''        const personName = rawPersonName || null;\n        const role = typeof row.role === "string" ? row.role.slice(0, 120) : null;\n        const normalizedPersonValue = isPersonEmit\n          ? `person: ${personName || finalValue}${role ? ` | ${role}` : ""}`.slice(0, 500)\n          : finalValue.slice(0, 500);\n        cleaned.push({\n          vectorType,\n          value: normalizedPersonValue,\n          personName,\n          role,''',
)
at = at.replace(
'''          role: typeof row.role === "string" ? row.role.slice(0, 120) : null,\n          scope: row.scope === "organization" || row.scope === "candidate" ? row.scope : "unknown",''',
'''          scope: isPersonEmit ? "candidate" : (row.scope === "organization" || row.scope === "candidate" ? row.scope : "unknown"),''',
)

# 3) Make discovery prompts explicit about the output contract without dictating hops.
at = at.replace(
'''  return `${apexOrientationCompact("dig_agent")}\n\n---\n\nTARGET: ${input.targetName}''',
'''  const discoveryContract = /^Discovery slot\\b/i.test(input.targetName)\n    ? `\\nDISCOVERY OUTPUT CONTRACT (model-owned, not a search script): if you establish a real named person, emit action=done with a finding containing personName="Full Name" (or value="person: Full Name | role | company"), scope="candidate", and sourceUrls containing the exact HTTPS page you actually observed. A personName-only finding is valid. Do not emit titles, sectors, companies, or prose fragments as people. If identity is not established, return done with findings=[].\\n`\n    : "";\n  return `${apexOrientationCompact("dig_agent")}\\n${discoveryContract}\\n---\\n\\nTARGET: ${input.targetName}''',
)

# 4) Track why the loop stopped. Keep partial findings intact on all exits.
at = at.replace(
'''      return {\n        status: "timeout",\n        model: modelUsed,''',
'''      return {\n        status: "timeout",\n        model: modelUsed,''')
at = at.replace(
'''        findings,\n        trajectory: history,\n        error: `hard timeout ${hardTimeoutMs}ms (partial findings preserved)`,''',
'''        findings,\n        modelFindings: [],\n        stopReason: "HARD_TIMEOUT",\n        trajectory: history,\n        error: `hard timeout ${hardTimeoutMs}ms (partial findings preserved)`,''', 1)
at = at.replace(
'''            findings,\n            trajectory: history,\n            error: "cancelled by operator (partial findings preserved)",''',
'''            findings,\n            modelFindings: [],\n            stopReason: "CANCELLED",\n            trajectory: history,\n            error: "cancelled by operator (partial findings preserved)",''', 1)
at = at.replace(
'''        findings,\n        trajectory: history,\n        error: "No agentic LLM provider available; free-ReAct pass stopped without scripted research",''',
'''        findings,\n        modelFindings: [],\n        stopReason: "LLM_UNAVAILABLE",\n        trajectory: history,\n        error: "No agentic LLM provider available; free-ReAct pass stopped without scripted research",''', 1)
# The successful done return must expose exactly action.findings, not the accumulated auto-extract bag.
at = at.replace(
'''    findings = mergeFindings(findings, action.findings);\n    history.push(\n      `step${i + 1}: done findings=${findings.length}` +''',
'''    const modelFindings = action.findings.slice();\n    findings = mergeFindings(findings, modelFindings);\n    history.push(\n      `step${i + 1}: done modelFindings=${modelFindings.length} totalFindings=${findings.length}` +''',
)
at = at.replace(
'''      model: modelUsed,\n      iterations: i + 1,\n      searches,\n      visits,\n      findings,\n      trajectory: history,''',
'''      model: modelUsed,\n      iterations: i + 1,\n      searches,\n      visits,\n      findings,\n      modelFindings,\n      stopReason: "MODEL_DECIDED_DONE",\n      trajectory: history,''',
)
# Budget exhaustion is distinct from model-selected done.
at = at.replace(
'''    model: modelUsed,\n    iterations: maxIter,\n    searches,\n    visits,\n    findings,\n    trajectory: history,\n    error: "iteration budget exhausted",''',
'''    model: modelUsed,\n    iterations: maxIter,\n    searches,\n    visits,\n    findings,\n    modelFindings: [],\n    stopReason: "ITERATION_BUDGET",\n    trajectory: history,\n    error: "iteration budget exhausted",''',
)
# Invalid JSON twice is not a model-selected completion; it currently loops, so expose a
# parse-failure reason only through the eventual budget/timeout. No synthetic findings are added.

# Ensure every early empty-target return satisfies the new type.
at = at.replace(
'''return { status: "unavailable", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], trajectory: [], error: "empty target" };''',
'''return { status: "unavailable", model: "none", iterations: 0, searches: 0, visits: 0, findings: [], modelFindings: [], stopReason: "LLM_UNAVAILABLE", trajectory: [], error: "empty target" };''')

# Discovery must consume only model-emitted findings. Auto-extracted IR/SEC/contact rows remain
# useful observations for Dig, but can no longer select a discovery identity.
dt = dt.replace(
'''export type DiscoveryAgentResult = { candidates: DiscoveryCandidate[]; model?: string; searches: number; visits: number; degraded: boolean; message: string };''',
'''export type DiscoveryAgentResult = { candidates: DiscoveryCandidate[]; model?: string; searches: number; visits: number; degraded: boolean; message: string };''')
dt = dt.replace(
'''        const slotCandidates = parsePersonFindings(result.findings ?? [], result.trajectory ?? []);''',
'''        const admissionFindings = result.modelFindings ?? [];\n        const slotCandidates = parsePersonFindings(admissionFindings, result.trajectory ?? []);''')

# Sanity checks: the replacement set must have actually matched the known source shape.
required_a = ["modelFindings: AgenticFinding[]", "stopReason:", "const modelFindings = action.findings.slice()", "DISCOVERY OUTPUT CONTRACT"]
required_d = ["const admissionFindings = result.modelFindings ?? []", "parsePersonFindings(admissionFindings"]
for marker in required_a:
    if marker not in at:
        raise SystemExit(f"agentic patch incomplete: missing {marker}")
for marker in required_d:
    if marker not in dt:
        raise SystemExit(f"discovery patch incomplete: missing {marker}")

A.write_text(at)
D.write_text(dt)
print(f"OK agentic {len(at.splitlines())} lines; discovery {len(dt.splitlines())} lines")
