# Run Apex Atlas research / bureau — precise procedure

This is the canonical operational meaning of “Run Apex Atlas”, “Start the bureau”, or “Launch research”.

Do not invent alternate startups, random scripts, partial pipelines, or a second application.

**Repository:** `https://github.com/2f22vtd4kr-cloud/BigContacts` · branch `main`  
**New-account setup:** `docs/REPLIT_NEW_ACCOUNT_SETUP.md`  
**Living architecture/development transcription:** `docs/context.md`

---

## 0. Product law (do not regress)

- Dig is **free ReAct**: investigators invent queries and choose actions; tools execute.
- Never add `force_*` hops, GROK-PARITY, ranked prefer-lists, or scripted research playbooks.
- Never invent people, contacts, relationships, or URLs. Contact claims need real `http(s)` source URLs.
- `bureauIntegrity=critical` means research quality is unhealthy; do not claim quality in that state.
- Boot/build success is not proof of research success. A live claim requires trajectory evidence.

---

## 1. Runtime prerequisites (once per app)

1. Import the repository through the connected Replit ↔ GitHub integration. Do not ask for GitHub PATs or `GITHUB_TOKEN`.
2. Read `docs/context.md` before modifying or running the project.
3. Replit Postgres is platform-managed. `DATABASE_URL` is injected and is not an operator secret.
4. Run one API workflow on `PORT=8080`. Public `/` is the desk; `/api` is the API. Do not run a separate frontend preview as the product entry.
5. Set workflow environment (not operator secrets):
   ```
   ENABLE_AUTO_PIPELINE=false
   INSTALL_PYTHON_OSINT=false
   PORT=8080
   APEX_SKIP_SEMANTIC=1
   CI=true
   RESEARCH_DEPTH=standard
   NODE_OPTIONS=--max-old-space-size=1536
   ```
6. Ask the operator for exactly these 14 runtime secret names:

   ```text
   REDIS_URL_1
   GROQ_API_KEY
   GEMINI_API_KEY
   NVIDIA_NIM_API_KEY
   MISTRAL_API_KEY
   HF_TOKEN
   SERPER_API_KEY
   TAVILY_API_KEY
   SERPAPI_KEY
   EXA_API_KEY
   SCRAPFLY_API_KEY
   ZENROWS_API_KEY
   COMPANIES_HOUSE_API_KEY
   WHOISJSON_API_KEY
   ```

   `REDIS_URL` and `EXA_1` are compatibility aliases, not additional operator asks. Never ask for `DATABASE_URL`, `WHOXY_*`, or `REDIS_URL_2`–`REDIS_URL_5`. Never print secret values.

7. Run `node scripts/replit-preflight.mjs` after secrets are configured. Then follow the repository's install, build, check, and boot commands.

---

## 2. Canonical research launch

Use the repository's current API launch contract. Do not substitute ad-hoc startup scripts or scripted research paths.

For a bounded discovery-first smoke, use the current target count and trajectory acceptance criteria documented in `docs/context.md`.

For an existing admitted entity, a single-target Dig run uses the repository's `singleTargetId` launch path and is judged by actual investigator trajectory and source-backed evidence, not merely by job completion.

Poll `GET /api/ingest/atlas-status` until terminal state. Do not start a second job while the first lock is active. Use `DELETE /api/ingest/atlas-lock` only as the documented stop/recovery action.

---

## 3. What this is NOT

| Do not | Why |
|---|---|
| Ask for GitHub credentials | Replit GitHub integration handles repository access |
| Ask for DATABASE_URL / “attach Postgres” | Platform manages/injects DB |
| Add a second Replit app mid-setup | Stay on the GitHub-imported App |
| Use detached agent execution without project runtime | Environment/runtime may be missing |
| Fake people for demos | Corrupts ledger and proof |
| Treat boot as research proof | Architecture requires trajectory evidence |
| Disable checks for green output | Hides real defects |

---

## 4. Quick setup verify

```bash
git log -1 --oneline
node scripts/replit-preflight.mjs
pnpm run check:no-force-dig
pnpm run check:free-react
pnpm run check:discovery-quality
curl -sS http://127.0.0.1:8080/api/healthz
```

For full setup details, use `docs/REPLIT_NEW_ACCOUNT_SETUP.md`. For product behavior and architecture, use `docs/context.md`.
