# Volume 227 — Control Flow by Mode

## Mode 1 — Single-target re-cook

```
Operator → Atlas (singleTargetId)
  → Orchestrator loads target + bounds
  → Investigator LLM decision
       → model chooses ONE research capability
       → tool/browser/OSINT executes
       → observation returns
       → Investigator LLM reasons/pivots/stops
       ↺
  → deterministic promotion/provenance gates
  → Card
```

Boss/RH are not Dig browsers. Discovery is skipped when the operator explicitly supplies a single target.

## Mode 2 — Discovery-first desk fill

```
Operator → Atlas (discoveryFirst)
  → Investigator LLM decision
       → model chooses search/visit/browser/registry/OSINT freely
       → observations
       → model emits candidate findings
       ↺
  → identity + provenance admission
  → admitted person(s)
  → Investigator LLM decision
       → model chooses research actions freely
       → evidence/contact findings
       ↺
  → promotion + card
```

The Investigator LLM decision is the model layer between bureau state and research capabilities. There is no fallback research path, ranked intake, force-hop sequence or deterministic identity extractor in the canonical discovery path.

## Mode 3 — Case Bureau adaptive

```
Case file
  → Boss (Gemini): direction / orchestration / judgment
  → Right-hand (DeepSeek via NVIDIA NIM): critique / evidence gaps / ongoing-work analysis / advice
  → Investigator LLM decision
       → Serper / Tavily / Exa / browser / Scrapfly / ZenRows / registry / OSINT
       → typed observation
       ↺
  → evidence update → promotion
```

The Boss/right-hand hierarchy informs the case; it does not replace or control the Investigator's tool choices.

## Mode 4 — Degraded integrity

```
No usable research capability or no Investigator LLM
  → bureauIntegrity=critical/degraded
  → stop/fail closed or report partial evidence
  → never borrow Gemini for investigation
  → never borrow DeepSeek/NVIDIA right-hand for investigation
  → never substitute deterministic research
```

A provider outage is an operational failure, not permission to replace model research with a fixed playbook.
