# Run 219 — Qwen3.8 TPM forensics

Run: `33402261430`
Head: `9ef57a94e6cf36eba4eb096188a82b6ec7b7e79e`

## Verdict

**FAIL — provider capacity, not research quality.** The run completed the real discovery-first path, but the deterministic audit rejected the result because no validated candidates were persisted.

## Observed evidence

- Model: `qwen/qwen3.8-27b`.
- Real model-selected actions were emitted: 12 searches and 3 visits.
- Final state: 0 entities, 0 admitted candidates, 0 contacts.
- Groq repeatedly returned HTTP 429 for the 8K TPM ceiling. Individual requests were asking roughly 1.7K–2.1K tokens while the minute window already contained ~6.4K–7.3K tokens.
- The previous 5-second pacing was therefore insufficient even with concurrency=1.

## Repair

The live workflow now uses a 30-second minimum interval and a preflight headroom check. Groq model selection remains strict at Qwen3.8; there is no silent fallback to the exhausted GPT-OSS/Qwen3.6 lane.

## Evaluation integrity

This run is not a successful Apex target batch. No blind baseline is run against an empty Apex result. The next run must first produce real target cards/evidence; only then is the independent OpenAI comparison valid.
