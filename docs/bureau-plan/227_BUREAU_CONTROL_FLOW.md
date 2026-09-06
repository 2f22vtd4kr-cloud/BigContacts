# Volume 227 — Bureau Control Flow

## Canonical two-layer control

There are only two AI layers:

```text
BOSS (Gemini) + RIGHT-HAND (DeepSeek via NVIDIA NIM)
        │
        │ consult + select Investigator LLM + suggest tools
        ↓
INVESTIGATOR LLM POOL + NON-LLM TOOLS
        │
        │ actual research; free tool choice
        ↓
REPORT EVERY ACT → target/run living investigation document
        │
        └── Boss + Right-hand see and analyse the report
                    ↺ continue / redirect / challenge / stop
```

Groq, Mistral, or any other configured Investigator LLM is an **investigator**, not an additional decision layer. DeepSeek/NVIDIA is Right-hand only. Gemini is Boss only.

## Mode 1 — Single-target re-cook

```text
Operator → Atlas
  → Boss + Right-hand establish assignment and select Investigator LLM
  → Investigator LLM researches freely
       → chooses any permitted search/browser/registry/OSINT capability
       → observation returns
       → report appended to this target/run document
       → Boss + Right-hand review
       ↺ investigator continues / pivots / stops
  → Investigator proposes promotion
  → deterministic provenance/identity/scope gates
  → Card
```

## Mode 2 — Discovery-first desk fill

```text
Operator → Atlas
  → Boss + Right-hand oversee discovery assignment
  → selected Investigator LLM researches freely
       → Serper / Tavily / Exa / browser / Scrapfly / ZenRows / registry / OSINT
       → every act reported to the living discovery document
       ↺ Boss + Right-hand review
  → model-emitted candidate findings
  → identity + provenance admission
  → admitted person(s)
  → Investigator LLM pool continues target research
       ↺ report every act + continuous oversight
  → Investigator proposes promotion
```

There is no the selected Investigator LLM owns the investigation decision between the oversight layer and the Investigator LLM. There is no forced search sequence or deterministic research fallback.

## Mode 3 — Case Bureau adaptive

```text
Case file
  → Boss (Gemini) + Right-hand (DeepSeek/NVIDIA)
       → choose Investigator LLM
       → set assignment / constraints
       → suggest useful tools
  → Investigator LLM + non-LLM research tools
       → actual web/OSINT research
       → report after every act
  → living target/run document
  → Boss + Right-hand inspect the new report
       ↺ redirect / challenge / continue / stop
  → Investigator promotion proposal
  → provenance/identity/scope gates
```

Boss and Right-hand oversee the work; they do not become web-research fallbacks.

## Mode 4 — Degraded integrity

```text
No usable Investigator LLM
  → bureauIntegrity=critical/degraded
  → preserve partial evidence
  → stop/fail closed
```

Never replace a failed Investigator with Gemini or DeepSeek/NVIDIA. Never replace it with deterministic research.

## Tool semantics

Serper, Tavily, Exa, Scrapfly, ZenRows, registries and OSINT executors are **non-LLM capabilities**. They execute the Investigator's chosen action. Boss/Right-hand can recommend them, but the Investigator can also select them independently.
