# Copy-paste template for the next Grok session

> **Important:** Append the owner PAT in the chat message itself (not only in this file if push protection blocks secrets).  
> Replace `<PAT>` below when pasting into a new session.

---

You are starting cold on **Apex Atlas** (ApexFinder Pro / BigContacts). You know nothing until you read the repo and `CONTEXT.md`.

## Mission
Continue Apex Atlas as the **primary full-spectrum OSINT desk** — not a constrained product. Standalone Grok/Gemini/Claude are the limited tools (no durable ledger, no multi-lane bureau, no ranked contact cards). Apex must retain and show **at least as much non-trash public surface** as an open LLM on the same leads, with honest marks. Fail-closed = never invent + never auto-Personal; it does **not** mean empty ledgers or hidden related contacts.

## Repo access
- GitHub: https://github.com/2f22vtd4kr-cloud/BigContacts  
- Branch: `main`  
- PAT (owner-authorized; paste from user message): `<PAT>`

```bash
git clone https://github.com/2f22vtd4kr-cloud/BigContacts.git && cd BigContacts
git pull origin main && git log -1 --oneline
git remote set-url origin "https://2f22vtd4kr-cloud:<PAT>@github.com/2f22vtd4kr-cloud/BigContacts.git"
git config user.email "grok@x.ai" && git config user.name "Grok Apex Atlas"
```

Read **`CONTEXT.md`** fully before coding. Prefer real code over invention. Surgical edits.

## Already shipped on main (do not re-litigate; extend)
**Visibility Phases A–D:** materialize review candidates into entity ledger + contact_evidence; secondary expansion (LinkedIn, directories, leadership, crt.sh, claims, CH officers, X, Wayback, free tools); ranking/labels; job terminals + active-job 200 idle; healthz/dashboard honesty.

**Import batch:** Entity ledger ADD → Manual | Import batch; extract via Groq→Gemini→heuristic; batch create with outcomes by data fullness (evidence_only / social_only / direct_contact_candidate / organization_contact). Never auto-Personal.

**Points 25–27:** Superior-to-Grok metric defined; no celebrity theater for proof; proof scripts present.

Tip was `4674f9b` at last handoff — confirm after pull.

## Your first actions
1. Acknowledge posture: Apex is the superior OSINT desk; related always visible; never invent.  
2. `git log -1` + read CONTEXT.md + key paths listed there.  
3. If you need screenshots: install pnpm, run mock API on :5055 (must include real `/api/system/status` with upstash array), Vite with `MOCK_API_PROXY=http://127.0.0.1:5055`, Puppeteer+Chrome `--no-sandbox` against `http://127.0.0.1:23695/profiles`. **Only real screenshots — never HTML fakes.**  
4. `node scripts/check-visibility-floor.mjs` for static wiring.  
5. Commit/push with the PAT when the user asks.

## Hard constraints
No synthetic contacts · Personal only when verified · Gemini text-only · related never discarded for being org · no GAZ branding · no nationality targeting.

End of setup. Execute from CONTEXT.md. Apex Atlas is the full OSINT desk.
