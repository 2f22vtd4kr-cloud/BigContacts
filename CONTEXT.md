# Apex Atlas / BigContacts — Full Context (for any new Grok session)

**Product names:** Apex Atlas · ApexFinder Pro · BigContacts  
**GitHub:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Tip at handoff write:** `7a554af` (confirm with `git log -1 --oneline` after pull) — gold-standard recovery: Atlas secondary+org surface, cookedAt boundary, 555 trash, collision labels, EDGAR co-filers, Groq-429 deterministic fallback, registry-first, related-person rank+display, companyNameForSecondary hoist, broadened issuer notes recovery  
**PAT:** use the owner-provided PAT from the in-session setup message only. Do not invent credentials. Do not commit PATs into the repo (GitHub push protection will reject them).

---

## 0. Identity — what Apex Atlas is

Apex Atlas is a **bureau-first, full-spectrum OSINT desk** (not a constrained “toy” product).

### Capability posture (non-negotiable — reversed from older framing)

**Rejected framing:** “Apex is constrained; Grok is the open general agent.”

**Required framing:**
- Apex Atlas is the **primary** OSINT desk.
- It must retain and **display more non-trash public surface** (named people, profile URLs, related/org routes, candidate claims with sources) than a standalone Grok / Gemini / Claude session on the same leads.
- Standalone LLMs are the **limited** tools: no durable ledger, no multi-lane orchestration, no persistent evidence graph, no ranked contact cards, no job/event trail.
- Apex uses multiple LLMs + registries + free OSINT tools + enrichment lanes + a permanent evidence store.
- **Losing to an open agent on public surface is a product failure.**

**“Fail-closed” means:**
- Never invent contacts or entities.
- Never mark **Personal** without strong verified evidence + attribution.
- It does **not** mean hide related contacts, drop LinkedIn/profile URLs, or leave the entity ledger at zero after runs that found candidates.

**Contact visibility law:**
1. Every non-trash vector is shown: personal (rare) · related/org · candidate/lead  
2. Ranking: Personal → Related/Org → Candidate/Lead  
3. Labels: “Looks personal” / “Company · related” / “Still a lead”  
4. After candidate-producing runs, People worth knowing / entity ledger must not read 0/0/0/0  

---

## 1. Repo layout

| Path | Role |
|------|------|
| `artifacts/api-server` | Express API, Bureau, ingestion (active code under deep `src/src/`) |
| `artifacts/apex-finder` | React 19 + Vite desktop UI |
| `artifacts/apex-mobile` | Expo |
| `lib/db` | Drizzle + PostgreSQL schema |
| `lib/api-client-react` | Generated React Query client |
| `lib/api-zod` | Zod contracts |
| `scripts/` | apply helpers, visibility checks, live proof script |

Package manager: **pnpm** (workspace). Do not use npm/yarn for installs.

---

## 2. What was implemented in the Ultimate Visibility + Import session

Aligned to handoff Pages 1–3 and points **25–27**.

### Phase A — Visibility floor
- `materializeDiscoveryReviewCandidates` writes review candidates into entities + `contact_evidence` on discovery/verification complete (not only on promote).
- Dashboard counters: `reviewCandidates`, `evidenceOnly`.
- `presented-contacts` ranking + card labels enforced.

### Phase B — Secondary public surface
- LinkedIn public + explicit `linkedin:not-found` honesty marker  
- Directories: Signal.nfx, OpenVC, AngelList/Wellfound, First Round, Tech Coast Angels, Band of Angels, EBAN  
- Official domain leadership/about/team pages  
- crt.sh CT emails as leads only  
- Public web email claims with source URL (never Personal)  
- Companies House corp anchors → named officers as review entities  
- Public X/Twitter profile leads  
- Wayback archived contact/about pages  
- Free tools → evidence: theHarvester, Holehe, Maigret, Sherlock, Whoxy  
- Secondary expansion on: discovery materialize, admit, promote, **single-target open**

### Phase C — Ranking & truth
- Personal → organization → candidate everywhere  
- Never drop related solely because org  
- Boss prompt: never erase related surface on `reject_target`

### Phase D — Operational correctness
- Job terminals: `done | failed | cancelled`  
- `GET /api/ingest/job/active/:type` returns **200** with null when idle (not 404)  
- healthz + dashboard: `lanesHonesty`, `registryShallowRisk`  
- Dashboard UI shallow-risk banner + review candidate count  

### Phase E — Proof tooling
- `scripts/check-visibility-floor.mjs` (static wiring checks)  
- `scripts/proof-visibility-live.mjs` (operator live API checks)  
- Live proof on operator’s deployed API/DB still an operator step when secrets/DB available  

### Manual HNWI / batch import (new)
- UI: Entity ledger → **ADD** → tabs **Manual fields** | **Import batch**  
- Paste research text or load multiple `.txt/.md/.csv/.json` (drag-drop)  
- `POST /api/entities/import/extract` — CSV/JSON parsers → Groq Llama 3.3 70B → Gemini Flash (text-only) → heuristic  
- `POST /api/entities/import/batch` — creates entities + `contact_evidence`  
- Outcomes by data fullness:
  - name-only → `evidence_only` (conf 0)
  - social/LinkedIn only → `social_only` (conf 20)
  - person email/phone → `direct_contact_candidate` (conf 40–55)
  - generic org inbox → `organization_contact` (conf 25)
- Never auto-Personal; contacts stay candidate/related until verified  

### Points 25–27
- **25** Superior to Grok = ≥ non-trash named people + profile URLs + claimed vectors retained, durable, honestly marked; zero invention  
- **26** No celebrity theater for proof (no Cook/Arnault/Huang as yield benchmark)  
- **27** Artifact checklist: tip, healthz, case/evidence path confirmation  

---

## 3. Hard constraints (always)

1. No synthetic / fake contacts or entities  
2. Personal mark only on strong verified evidence  
3. Gemini = text only (`webSearchGrounding: false`)  
4. Surgical edits preferred  
5. Job terminals: done | failed | cancelled  
6. No nationality / political-enemy targeting  
7. No GAZ product branding  
8. Related/org/candidate contacts must stay visible  

---

## 4. Local setup — run UI + take **real** screenshots

### Clone & install
```bash
git clone https://github.com/2f22vtd4kr-cloud/BigContacts.git
cd BigContacts
git checkout main && git pull
git log -1 --oneline

# Push auth: set remote URL with the PAT the user pastes in-session (never commit the PAT)
# git remote set-url origin "https://2f22vtd4kr-cloud:<PAT>@github.com/2f22vtd4kr-cloud/BigContacts.git"
git config user.email "grok@x.ai"
git config user.name "Grok Apex Atlas"

npm install -g pnpm@9
pnpm install --filter @workspace/apex-finder...
```

### Mock API (for screenshots without full Postgres/Redis stack)
The UI crashes if `/api/system/status` lacks `databases.upstash`. Use a small mock on port **5055** that implements at least:

- `GET /api/system/status` — full shape with `ai.*` slots and `databases.{postgres,localRedis,upstash}`
- `GET /api/ingest/atlas-status`
- `GET /api/dashboard/stats`, `GET /api/dashboard/hot-leads`
- `GET/POST /api/entities`
- `POST /api/entities/import/extract`
- `POST /api/entities/import/batch`

### Vite with proxy to mock
```bash
cd artifacts/apex-finder
MOCK_API_PROXY=http://127.0.0.1:5055 PORT=23695 pnpm exec vite --config vite.config.ts --host 127.0.0.1 --port 23695
```
`vite.config.ts` already supports `MOCK_API_PROXY` env for `/api` proxy.

### Real screenshots with Chrome + Puppeteer
```bash
cd /tmp && npm install puppeteer-core@24 --no-save
# Drive http://127.0.0.1:23695/profiles with Chrome --no-sandbox
# Open ADD → Import batch → paste → Extract → Register → reload ledger
# Desktop 1440x900 and mobile 390x844
```
**Do not** fabricate HTML mock screenshots and present them as the app. Only screenshot the running Vite UI.

### Static / live checks
```bash
node scripts/check-visibility-floor.mjs
API_BASE=https://your-deployed-api node scripts/proof-visibility-live.mjs
```

---

## 5. Key code paths

| Concern | Path |
|---------|------|
| Contact persist / secondary expansion | `artifacts/api-server/src/src/lib/bureau-contact-persist.ts` |
| Atlas full-circle + org surface + cookedAt | `artifacts/api-server/src/src/lib/atlas-orchestrator.ts` |
| Phone trash / isTrashContactValue | `artifacts/api-server/src/src/lib/contact-validation.ts` |
| LLM admission + deterministic fallback | `artifacts/api-server/src/src/lib/llm-name-validator.ts` |
| Discovery materialize + officer expansion | `artifacts/api-server/src/src/routes/research/cases.ts` |
| Presented contacts / labels | `artifacts/api-server/src/src/lib/presented-contacts.ts` |
| Manual import extract | `artifacts/api-server/src/src/lib/manual-import-extract.ts` |
| Import + batch routes | `artifacts/api-server/src/src/routes/entities.ts` |
| Entity ledger UI + import modal | `artifacts/apex-finder/src/pages/entities.tsx` |
| Healthz honesty | `artifacts/api-server/src/src/routes/health.ts` |
| Active job idle 200 | `artifacts/api-server/src/src/routes/ingest.ts` |

---

## 6. Definition of done reminders

- Ledger not stuck at zero after candidate-producing work  
- Related/org/candidate visible with correct marks  
- Personal rare and verified only  
- Job queue does not hang on status labels or active-job 404  
- Apex must not under-display public surface vs an open Grok session on the same leads  
- Batch import creates HNWI cards with outcomes matching data fullness  

---

## 7. Commit practice

- Surgical commits; push to `main` when instructed  
- Use the in-session PAT only; **never commit secrets into tracked files**  
- Prefer real code reading over invention  

**Apex Atlas is the full OSINT desk. Related stays visible. Free public tools are in scope. Standalone LLMs are the limited ones. Never invent; never hide what was found.**
