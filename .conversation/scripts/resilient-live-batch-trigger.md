# Resilient live batch trigger

This file exists only to trigger the provider-resilient Apex Atlas live audit workflow.
The workflow preserves model-owned discovery and Dig research decisions; it does not define a research playbook.

## 2026-08-31 recovery run
The live workflow uses one provider decision at a time and conservative Groq pacing to respect the observed token-limited development lane. Discovery slots are labeled as slots rather than pseudo-person targets. The run must produce real trajectories and auditable evidence; completion without valid admitted targets remains a failure.

## 2026-08-31 admission-boundary recovery
The discovery admission layer accepts an explicitly named person discovered on an organization-scoped source, while still rejecting generic organization facts. The ReAct runtime records a compact summary of model-declared `done` findings in the trajectory so zero-candidate results can be diagnosed at the model-output boundary rather than guessed from the final card.

## 2026-08-31 Run 33411996869 forensic recovery
The real 10-target run reached terminal state but admitted only the malformed identity `Head of Marketing`, with zero contacts. Forensics showed live provider activity but weak/partially degraded discovery trajectories, followed by a shallow Dig pass. The deterministic identity boundary is now hardened against generic title-shaped identities; this is a safety gate, not a discovery strategy.

## 2026-08-31 Run 33420624242 proxy-candidate forensic recovery
The bounded 3-target smoke completed technically but admitted `Inclusion Recap`, `Inclusion A Business Case`, and `Equity Interview Series Learn` from a shared source with `role=proxy_table`, producing zero contacts. Forensics traced this to deterministic SEC/DEF-14A capitalized-name extraction emitting `related-person:` findings before the model explicitly selected a person. That path is now blocked at discovery admission and covered by a regression test. This is a provenance/autonomy correction, not a replacement search strategy.

## 2026-08-31 bounded smoke — next proof
The next proof is intentionally small: 3 discovery slots, 3 research targets, one agentic research loop at a time, Groq Qwen 3.8 with 20s minimum pacing, and the existing fail-closed provenance/identity gates. Success requires at least one real named-person admit explicitly emitted by the model after observing its source, followed by an actual free-ReAct Dig trajectory. Zero admits, deterministic proxy-name leakage, or title-shaped admissions remain an honest research-quality failure.

## 2026-08-31 Batch 25 — execute the post-proxy-fix smoke
The permanent proxy-candidate admission fix is on `main` (`105683b9`, `329ecd49`) and the discovery-quality guard now enforces the `proxy_table` rejection boundary (`c82ca466`). This entry intentionally triggers the existing resilient workflow through its documented push surface; it does not alter discovery behavior or add a research hop. The run must be judged from its live artifacts, not from workflow completion alone.

## 2026-08-31 Batch 26 — execute after fused-domain/person-output hardening
Commits `914c3ed` and `1b72946` harden fused-domain pseudo-identities and make explicit person emission after source observation part of the discovery output contract. This trigger is for a real bounded 3-target smoke from that tip. No discovery query, source, candidate, or hop is prescribed here. The only acceptable evidence is the live trajectory and resulting source-backed person admission/Dig outcome.

## 2026-08-31 Batch 27 — execute the bounded smoke now
This is an execution-only trigger from the current `main` tip. It deliberately prescribes no target, query, source, ranking, or research hop. The workflow's existing 3-target, one-loop-at-a-time, Groq→Mistral, provenance-gated free-ReAct path is the system under test. Judge the run only from actual workflow artifacts and trajectory evidence.
