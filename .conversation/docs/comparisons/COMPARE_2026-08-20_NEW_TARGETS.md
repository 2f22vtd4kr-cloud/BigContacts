# Honest comparison — new targets (2026-08-20)

**Groq key:** new `gsk_25apko…` (GPT-OSS / Qwen post Llama 3.3 decommission)  
**Method:** Same model class (`openai/gpt-oss-120b`), Serper SERP, visit tool.  
**Apex mode** = DEF14A-first prompts + forced visit extract (email/phone/linkedin/role).  
**Plain mode** = generic agent instructions (Grok-Agent-like), same tools.

> Full monorepo boot was attempted (Postgres/Redis up; pnpm install progressing then sandbox session reset). Comparison below is the **agentic research lane** in isolation — the core failure mode from CT-001.

## Target 1 — Ian McDonald / Bright Minds Biosciences (not prior CT-001)

| Signal | Apex mode | Plain mode |
|--------|-----------|------------|
| Role | (via SEC visit path) | CEO/Director (team page) |
| Personal email | **ian@brightmindsbio.com** (SEC 20-F) | same + info@ |
| Phone | **(647) 407-2515** | same |
| Website | — | brightmindsbio.com |
| Searches / visits | 1 / 1 | 1 / 0 |

**Read:** Both strong (very public CEO). Apex prioritized SEC and extracted personal email from filing; plain used SERP snippets and also got role + generic inbox without visiting.

## Target 2 — Eric Ashleman / IDEX Corporation (fresh)

| Signal | Apex mode | Plain mode |
|--------|-----------|------------|
| Role | CEO & President | CEO & President |
| Email | **eashleman@idexcorp.com** (leadership page) | eric.ashleman@idexcorp.com (**RocketReach** — weaker provenance) |
| Phone | 703-841-9000 | +1 703-841-9000 |
| LinkedIn | linkedin.com/in/eric-ashleman-803a9010 | same |
| Address | **1000 E. 5th Street, Alexandria, VA** (DEF 14A) | — |
| SEC source | DEF 14A linked | — |
| Searches / visits | (visited leadership + SEC) | 2 / 0 |

**Read:** Apex found **company-domain email + street address + SEC primary source**. Plain found similar contact surface but relied on **RocketReach** for email (Apex admission would reject or downrank aggregator-only claims) and **no address**.

## Verdict
With working Groq models, Apex-mode research is **at least as good** as plain agent and **better on provenance / address / anti-aggregator** for Ashleman. McDonald was a wash on contact quantity (public figure).

## Still blocked in this sandbox
- Full `pnpm install` + API server + Drizzle (session reset mid-install)
- End-to-end HTTP Launch Atlas job

## Operator
Redeploy tip `2583587`+ with new Groq key; run these two names through live Atlas desk for full-pipeline confirmation.
