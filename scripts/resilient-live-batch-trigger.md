# Resilient live batch trigger

This file exists only to trigger the provider-resilient 10-target Apex Atlas audit workflow.
The workflow pins the agentic Dig lane to Groq Qwen 3.8 and preserves model-owned research decisions.

## 2026-08-31 recovery run
The live workflow now uses one provider decision at a time and a 20-second Groq pacing floor to respect the observed token-limited development lane. Discovery slots are labeled as slots rather than pseudo-person targets. The run must produce real trajectories and auditable evidence; completion without ten valid targets remains a failure.