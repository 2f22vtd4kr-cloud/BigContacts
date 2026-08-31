# Resilient live batch trigger

This file exists only to trigger the provider-resilient 10-target Apex Atlas audit workflow.
The workflow pins the agentic Dig lane to Groq Qwen 3.8 and preserves model-owned research decisions.

## 2026-08-31 recovery run
The live workflow uses one provider decision at a time and a conservative Groq pacing floor to respect the observed token-limited development lane. Discovery slots are labeled as slots rather than pseudo-person targets. The run must produce real trajectories and auditable evidence; completion without ten valid targets remains a failure.

## 2026-08-31 admission-boundary recovery
The discovery admission layer now accepts an explicitly named person discovered on an organization-scoped source, while still rejecting generic organization facts. The ReAct runtime also records a compact summary of model-declared `done` findings in the trajectory so a zero-candidate result can be diagnosed at the model-output boundary rather than guessed from the final card.

## 2026-08-31 final retrigger after forensic addendum
The live run must execute against the current `main` tip, including the recovery specification recorded in `docs/bureau-plan/58_LIVE_RECOVERY_2026-08-31.md` and the organization-scoped admission regression test.
