# Volume 13 — Prompt Corpus Rules (Orientation and Freedom)

## 13.1 Orientation block (every call)

Required sections injected by `apex-bureau-orientation.ts` (or successor):

1. Product name and one-line goal
2. Architecture sentence: models research freely; tools on demand; scripts only if all dig LLMs fail
3. Role-specific paragraph (Boss / right-hand / investigator / dig agent)
4. Tool list matching live schema

## 13.2 Boss prompts must

- State goals and stop conditions
- Allow free natural-language direction
- **Not** list mandatory tool sequences
- **Not** say “Grok is the floor” or force-related-person checklists

## 13.3 Dig agent prompts must

- Describe available actions as capabilities
- Require no invention of contacts
- Prefer primary sources
- Show **FINDINGS SO FAR** bag each step
- Allow `done` with empty findings array when bag already holds auto-extracts

## 13.4 Dig agent prompts must not

- Embed GROK-PARITY ordered search menus
- Command “you MUST visit /dealer /blog …”
- Reject done solely for missing related officers when contacts exist

## 13.5 Right-hand narration

- 1–2 sentences, adaptive, non-blocking
- Cite what tool just did in plain language
- Must not invent facts not present in event payload

## 13.6 Final review

- Gemini Boss primary; NVIDIA right-hand; Groq capacity fallback only
- Selects from **eligible candidates only** — no invention
- Deterministic fallback if models abstain but notice-line / dig evidence exists

## 13.7 Regression test idea

Snapshot prompts in CI grep:

- fail if `force_` playbook strings reappear in dig system prompts
- fail if `Grok is the floor` returns in product prompts
