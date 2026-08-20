# Context — living handoff

## Session 2026-08-20 (bureau integrity + multi-LLM failover)

**Tip:** `main` — multi-LLM agentic failover + bureau integrity banner (this commit).

### Why Apex "lost" vs Replit/Grok Agent (not a month of regressions)
1. **Groq model hard-coded** to `llama-3.3-70b-versatile` which this API key cannot use → agentic ReAct control plane dead. Fixed: model fallback + **Mistral + Gemini + NVIDIA** chain (`agentic-web-research.ts`).
2. **Visit loop** did not structure SEC proxy role/related people → zero findings. Fixed: `findingsFromProxyPage`, skip repeat visits, DEF14A URL rank 1, `edgar-identity-boost`.
3. **180s target timeout** → `timeout_review` before tools finished. Fixed: 420s.
4. **Duplicates / domain pollution** — DB name dedupe + sanitizeValue.

### Architecture reminder (Apex = agent on steroids)
- Agentic ReAct (multi-LLM) + forced SERP/visit + EDGAR/proxy deterministic extract + registries + domain surface + fail-closed admission.
- If that stack is **misconfigured**, Apex can look *worse* than a plain Grok/Perplexity/Replit agent. That is a **bureau integrity critical**, not an acceptable product state.

### Operator signal
- `lanesHonesty.bureauIntegrity`: `ok` | `degraded` | `critical`
- Reasons when web search = 0, agentic LLM slots = 0, or last agentic step failed all providers
- UI: `BureauIntegrityBanner` under header (dismissible) → System status / Reactor

### Keys / Replit
- 5 Redis, 2 Exa; ENABLE_AUTO_PIPELINE=false; no fake seed data
- Redeploy tip, clear ledger, one bounded run, re-score CT-001

### Commits this arc
- `61da994` edgar boost + timeout + dedupe
- `9ed5788` reactor story/links feed
- `f8bb80a` Groq model fallback
- `4c002e6` proxy extract + visit rank
- `b038e5c` Gemini 2.5 denylist
- *(this)* multi-LLM agentic + bureau integrity UI

---


(See also docs/archive/Context.md for full history.)
