from pathlib import Path

root = Path('.')
src = root / 'artifacts/api-server/src/src'

adapter = r'''import type { BureauAction, DiscoveryCaseFile, ResearchCaseFile } from "./case-bureau";

export const GEMINI_RIGHT_HAND_MODEL = "gemini-3.8-flash";
const GEMINI_CHAT_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_RIGHT_HAND_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_RETRIES = 2;

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string | null }> } }> };
export type GeminiRightHandStatus = { configured: boolean; model: string; endpoint: string; role: "right_hand_advisor"; capability: "case_file_reasoning_only" };
export type GeminiRightHandCaseReasoningResult = { status: "completed" | "unavailable"; model: string; actionId: string | null; decision: string | null; reason: string | null; confidence: number | null; error: string | null };
export type GeminiRightHandDiscoveryAdviceResult = { status: "completed" | "unavailable"; model: string; decision: string | null; reason: string | null; focusLanes: string[]; confidence: number | null; error: string | null };
function key(): string | null { return process.env.GEMINI_API_KEY?.trim() || null; }
function textOf(response: GeminiResponse | null): string { return (response?.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join(" ").trim(); }
function extractJson(raw: string): Record<string, unknown> | null { const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim(); const source = fenced || raw.trim(); const start = source.indexOf("{"), end = source.lastIndexOf("}"); if (start < 0 || end <= start) return null; try { const value = JSON.parse(source.slice(start, end + 1)); return value && typeof value === "object" ? value as Record<string, unknown> : null; } catch { return null; } }
async function request(system: string, user: string): Promise<{ raw: string; error: string | null }> {
  const apiKey = key(); if (!apiKey) return { raw: "", error: "GEMINI_API_KEY is not configured." }; let lastError = "Gemini Right-hand request failed.";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS); try {
    const response = await fetch(GEMINI_CHAT_API, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify({ system_instruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048, responseMimeType: "application/json", thinkingConfig: { thinkingLevel: "high" } } }), signal: controller.signal });
    const body = await response.text(); if (response.ok) { try { const raw = textOf(JSON.parse(body) as GeminiResponse); if (raw) return { raw, error: null }; lastError = "Gemini Right-hand returned an empty response."; } catch { lastError = "Gemini Right-hand returned invalid JSON."; } break; }
    lastError = `Gemini API ${GEMINI_RIGHT_HAND_MODEL} HTTP ${response.status}${body ? `: ${body.slice(0, 300)}` : ""}`; const transient = response.status === 408 || response.status === 429 || response.status >= 500; if (!transient || attempt >= MAX_RETRIES) break; await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** attempt));
  } catch (error) { lastError = error instanceof Error && error.name === "AbortError" ? `Gemini Right-hand request timed out after ${REQUEST_TIMEOUT_MS}ms.` : error instanceof Error ? error.message : "Gemini Right-hand request failed."; if (attempt >= MAX_RETRIES) break; await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** attempt)); } finally { clearTimeout(timer); } }
  return { raw: "", error: lastError };
}
function compactCase(file: ResearchCaseFile): string { return JSON.stringify({ target: file.target, hypotheses: file.hypotheses?.slice(-12), evidenceSummary: file.evidenceSummary, specialistRoster: file.specialistRoster, actionQueue: file.actionQueue, contactRoutes: file.contactRoutes?.slice(-16), investigationProgress: file.investigationProgress, researchDepth: file.researchDepth, decisionLog: file.decisionLog?.slice(-8), rightHandAdvice: file.rightHandAdvice, bossPlan: file.bossPlan }, null, 2); }
function compactDiscovery(file: DiscoveryCaseFile): string { return JSON.stringify({ humanBrief: file.humanBrief, bossPremise: file.bossPremise, candidateLanes: file.candidateLanes, initialResearch: file.initialResearch, investigatorReports: file.investigatorReports?.slice(-10), currentProgress: file.currentProgress, discoveredCandidates: file.discoveredCandidates?.slice(-20), orgFootprint: file.orgFootprint, decisionLog: file.decisionLog?.slice(-8) }, null, 2); }
export function getGeminiRightHandStatus(): GeminiRightHandStatus { return { configured: Boolean(key()), model: GEMINI_RIGHT_HAND_MODEL, endpoint: GEMINI_CHAT_API, role: "right_hand_advisor", capability: "case_file_reasoning_only" }; }
export async function runGeminiRightHandCaseReasoning(input: { file: ResearchCaseFile; iteration: number }): Promise<GeminiRightHandCaseReasoningResult> { const queued = input.file.actionQueue.filter((action) => action.status === "queued").slice(0, 16); const system = "You are Apex Atlas Right Hand. Reason only over the supplied case file. Never browse, invent evidence, contacts, people, URLs, or facts. Recommend exactly one existing queued action. Return JSON only."; const user = `Iteration ${input.iteration}. Identify what is newly unresolved, which contact vectors are still pending, and the highest-leverage complementary queued action.\nCASE:\n${compactCase(input.file)}\n\nQUEUED ACTIONS:\n${JSON.stringify(queued, null, 2)}\n\nReturn {"actionId":"exact queued id","decision":"short recommendation","reason":"concrete evidence-gap reason","confidence":0.0}.`; const result = await request(system, user); if (result.error) return { status: "unavailable", model: GEMINI_RIGHT_HAND_MODEL, actionId: null, decision: null, reason: null, confidence: null, error: result.error }; const parsed = extractJson(result.raw); const actionId = typeof parsed?.actionId === "string" ? parsed.actionId.trim() : ""; const action = queued.find((candidate) => candidate.id === actionId); const decision = typeof parsed?.decision === "string" ? parsed.decision.trim() : ""; const reason = typeof parsed?.reason === "string" ? parsed.reason.trim() : ""; const confidence = typeof parsed?.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(1, parsed.confidence)) : null; if (!action || !decision || !reason) return { status: "unavailable", model: GEMINI_RIGHT_HAND_MODEL, actionId: null, decision: null, reason: null, confidence, error: "Gemini Right-hand returned an invalid or non-queued recommendation." }; return { status: "completed", model: GEMINI_RIGHT_HAND_MODEL, actionId: action.id, decision: decision.slice(0, 500), reason: reason.slice(0, 1000), confidence, error: null }; }
export async function runGeminiRightHandDiscoveryAdvice(input: { file: DiscoveryCaseFile; iteration: number }): Promise<GeminiRightHandDiscoveryAdviceResult> { const system = "You are Apex Atlas Right Hand for public-record discovery. Reason only over supplied evidence. Never invent people, contacts, relationships, or URLs. Return JSON only."; const user = `Iteration ${input.iteration}. Recommend the most useful next research direction from the existing discovery frontier.\nDISCOVERY CASE:\n${compactDiscovery(input.file)}\n\nReturn {"decision":"...","reason":"...","focusLanes":["..."],"confidence":0.0}.`; const result = await request(system, user); if (result.error) return { status: "unavailable", model: GEMINI_RIGHT_HAND_MODEL, decision: null, reason: null, focusLanes: [], confidence: null, error: result.error }; const parsed = extractJson(result.raw); if (!parsed) return { status: "unavailable", model: GEMINI_RIGHT_HAND_MODEL, decision: null, reason: null, focusLanes: [], confidence: null, error: "Gemini Right-hand returned invalid discovery JSON." }; return { status: "completed", model: GEMINI_RIGHT_HAND_MODEL, decision: typeof parsed.decision === "string" ? parsed.decision.slice(0, 800) : null, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 1200) : null, focusLanes: Array.isArray(parsed.focusLanes) ? parsed.focusLanes.filter((v): v is string => typeof v === "string").slice(0, 8) : [], confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : null, error: null }; }
export async function runGeminiRightHandFreeJson(userPrompt: string, systemExtra = "Reply with ONE JSON object only. Never invent contacts, people, or URLs."): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { const result = await request("You are the Apex Atlas Right Hand. Advise the Boss only. Never browse or act as Investigator. Never invent evidence, contacts, people, relationships, or URLs. " + systemExtra, userPrompt); return result.raw ? { status: "completed", model: GEMINI_RIGHT_HAND_MODEL, raw: result.raw, error: null } : { status: "unavailable", model: GEMINI_RIGHT_HAND_MODEL, raw: null, error: result.error }; }
export async function runGeminiRightHandFinalReview(prompt: string): Promise<{ status: "completed" | "unavailable"; model: string; raw: string | null; error: string | null }> { return runGeminiRightHandFreeJson(prompt, "You are the Apex Atlas Right Hand reviewing final public-contact evidence. Return ONE JSON object only. Never invent contacts, people, or URLs."); }
export type GeminiRightHandResultAction = BureauAction;
'''

old = src / 'lib/deepseek-case-reasoning.ts'
new = src / 'lib/gemini-right-hand-reasoning.ts'
new.write_text(adapter, encoding='utf-8')
old.unlink()

replacements = {
    './deepseek-case-reasoning': './gemini-right-hand-reasoning',
    'getDeepSeekCaseReasoningStatus': 'getGeminiRightHandStatus',
    'runDeepSeekCaseReasoning': 'runGeminiRightHandCaseReasoning',
    'runDeepSeekDiscoveryAdvice': 'runGeminiRightHandDiscoveryAdvice',
    'runDeepSeekFreeJson': 'runGeminiRightHandFreeJson',
    'runDeepSeekFinalReview': 'runGeminiRightHandFinalReview',
    'DEEPSEEK_CASE_REASONING_MODEL': 'GEMINI_RIGHT_HAND_MODEL',
    'DeepSeekCaseReasoningResult': 'GeminiRightHandCaseReasoningResult',
    'DeepSeekCaseReasoningStatus': 'GeminiRightHandStatus',
    'DeepSeekDiscoveryAdviceResult': 'GeminiRightHandDiscoveryAdviceResult',
    'DeepSeekResultAction': 'GeminiRightHandResultAction',
    'deepseek-ai/deepseek-v4-flash-0731': 'gemini-3.8-flash',
    'deepseek-v4-flash-0731': 'gemini-3.8-flash',
    'deepseek-flash': 'gemini-3.8-flash',
    'DeepSeek/NVIDIA': 'Gemini Right-hand',
    'DeepSeek Right-hand': 'Gemini Right-hand',
    'DeepSeek-V4-Flash-0731 right-hand': 'Gemini Right-hand',
    'DeepSeek-V4-Flash right-hand': 'Gemini Right-hand',
    'DeepSeek-V4-Flash': 'Gemini Right-hand',
    'DeepSeek Right Hand': 'Gemini Right Hand',
    'deepseek-right-hand': 'gemini-right-hand',
    'provider: "deepseek"': 'provider: "gemini"',
    '"provider":"deepseek"': '"provider":"gemini"',
    '"lane": "deepseek-right-hand"': '"lane": "gemini-right-hand"',
    'lane: "deepseek-right-hand"': 'lane: "gemini-right-hand"',
}
for path in src.rglob('*.ts'):
    text = path.read_text(encoding='utf-8'); updated = text
    for a, b in replacements.items(): updated = updated.replace(a, b)
    if updated != text: path.write_text(updated, encoding='utf-8')

for path in root.rglob('*'):
    if not path.is_file() or '.git' in path.parts or path.suffix not in {'.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.yml', '.yaml'}: continue
    try: text = path.read_text(encoding='utf-8')
    except Exception: continue
    lines = [line for line in text.splitlines() if 'DEEPSEEK_API_KEY' not in line]
    updated = '\n'.join(lines) + ('\n' if text.endswith('\n') else '')
    if updated != text: path.write_text(updated, encoding='utf-8')

# Retire the old DeepSeek migration helper; it is no longer part of the Apex toolchain.
(root / 'scripts/migrate-right-hand-to-deepseek.mjs').unlink(missing_ok=True)

# Restore the canonical, commit-isolated five-green workflow after this one-time migration.
canonical = '''# Canonical five-green gate: five consecutive fresh full-codebase audits.
# Deployment-prep sequence: audit after database initialization runbook hardening.
# Certification runs are intentionally push-triggered on the authoritative branch so every fresh tree can earn a new 5/5 streak.
name: Five Green Complete Codebase Audit

on:
  push:
    branches: [audit/genuine-five-green-final]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: five-green-complete-${{ github.ref }}-${{ github.sha }}
  cancel-in-progress: false

env:
  PNPM_VERSION: 9.15.9
  DATABASE_URL: postgresql://apex:apex_local_dev@127.0.0.1:5432/apex
  REDIS_URL: redis://127.0.0.1:6379
  PORT: 8080
  NODE_ENV: development
  ENABLE_AUTO_PIPELINE: "false"
  APEX_SKIP_SEMANTIC: "1"
  APEX_AGENTIC_CONCURRENCY: "1"
  APEX_AGENTIC_PROVIDER_CONCURRENCY: "1"
  APEX_API_AUTH_TOKEN: audit-${{ github.run_id }}-apex-five-green-token

jobs:
  audit-1:
    name: Audit 1 — complete codebase
    runs-on: ubuntu-latest
    steps: &audit_steps
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: 22
          package-manager-cache: true
      - run: npm install -g pnpm@${PNPM_VERSION}
      - run: pnpm install --frozen-lockfile --ignore-scripts --registry=https://registry.npmjs.org/
      - name: Provision local API dependencies
        run: |
          set -euo pipefail
          sudo apt-get update -qq
          sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql redis-server
          sudo service postgresql start
          sudo service redis-server start
          sudo -u postgres psql -c "CREATE USER apex WITH PASSWORD 'apex_local_dev' SUPERUSER;" || true
          sudo -u postgres psql -c "CREATE DATABASE apex OWNER apex;" || true
          cd lib/db
          bash ../../scripts/ci-provision-db.sh
      - run: pnpm run check:bureau
      - run: pnpm run typecheck
      - run: pnpm run build
      - name: Start API for live smoke tests
        run: |
          set -euo pipefail
          redis-cli ping
          nohup node artifacts/api-server/dist/index.mjs </dev/null > /tmp/apex-api.log 2>&1 &
          api_pid=$!
          echo "$api_pid" > /tmp/apex-api.pid
          for i in $(seq 1 60); do
            sleep 1
            if [ "$(curl -sS -m 2 -o /tmp/health.json -w '%{http_code}' http://127.0.0.1:8080/api/healthz || true)" = "200" ]; then
              exit 0
            fi
          done
          cat /tmp/apex-api.log
          exit 1
      - name: Every API test file, isolated
        run: |
          set -euo pipefail
          cd artifacts/api-server
          for test_file in src/src/test/*.test.ts; do
            echo "===== FULL AUDIT TEST: ${test_file} ====="
            pnpm exec vitest run --maxWorkers=1 "${test_file}"
          done
      - name: Restore build-time safety-only source sanitization
        if: always()
        run: git checkout -- artifacts/apex-finder/src/pages/data-sources.tsx
      - run: git diff --exit-code
  audit-2:
    name: Audit 2 — complete codebase
    needs: audit-1
    runs-on: ubuntu-latest
    steps: *audit_steps
  audit-3:
    name: Audit 3 — complete codebase
    needs: audit-2
    runs-on: ubuntu-latest
    steps: *audit_steps
  audit-4:
    name: Audit 4 — complete codebase
    needs: audit-3
    runs-on: ubuntu-latest
    steps: *audit_steps
  audit-5:
    name: Audit 5 — complete codebase
    needs: audit-4
    runs-on: ubuntu-latest
    steps: *audit_steps
'''
(root / '.github/workflows/audit-five-greens.yml').write_text(canonical, encoding='utf-8')
(root / '.github/workflows/migrate-right-hand-to-gemini.yml').unlink(missing_ok=True)
(root / 'scripts/migrate-right-hand-to-gemini.py').unlink(missing_ok=True)

bad = []
for base in (root / 'artifacts', root / '.github/workflows'):
    for path in base.rglob('*'):
        if not path.is_file() or path.suffix in {'.lock'}: continue
        try: text = path.read_text(encoding='utf-8').lower()
        except Exception: continue
        if any(token in text for token in ('deepseek', 'deepseek_api_key', 'api.deepseek.com', 'deepseek-ai/')): bad.append(str(path))
if bad: raise SystemExit('DeepSeek references remain in active Apex files: ' + ', '.join(bad[:20]))
'''
