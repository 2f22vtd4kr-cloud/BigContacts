# Volume 227 — Control Flow by Mode

## Mode 1 — Single-target re-cook

```
Operator → Atlas (singleTargetId)
  → Orchestrator loads target + bounds
  → Dig investigator (Groq → Mistral)
       → model chooses tools/actions freely
       → observations/evidence
  → deterministic promotion/provenance gates
  → Card
```

Boss/RH are not Dig browsers. Discovery is skipped when the operator explicitly supplies a single target.

## Mode 2 — Discovery-first desk fill

```
Operator → Atlas (discoveryFirst)
  → Discovery investigator (Groq → Mistral)
       → model chooses search/visit/pivots freely
       → model emits candidate findings
  → identity + provenance admission
  → admitted person(s)
  → Dig investigator (Groq → Mistral)
       → model chooses research actions freely
       → evidence/contact findings
  → promotion + card
```

There is no fallback research path, ranked intake, force-hop sequence or deterministic identity extractor in the canonical discovery path.

## Mode 3 — Case Bureau adaptive

```
Case file
  → Boss (Gemini): direction/judgment, no browsing
  → Right-hand (NVIDIA NIM): critique/advice, no browsing
  → Investigator (Groq → Mistral): actual web/OSINT research
       → model-selected tools and pivots
  → evidence update → promotion
```

The Boss/right-hand hierarchy informs the case; it does not control a scripted research DAG.

## Mode 4 — Degraded integrity

```
No usable search capability or no Dig investigator
  → bureauIntegrity=critical/degraded
  → stop/fail closed or report partial evidence
  → never borrow Gemini/NVIDIA for Dig
  → never substitute deterministic research
```

A provider outage is an operational failure, not permission to replace model research with a fixed playbook.
