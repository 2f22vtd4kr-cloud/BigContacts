# Volume 157 — Visit Extraction Heuristics

## Goal

Maximize **observation quality** so free dig can emit source-backed findings.

## On each visit

1. Capture canonical URL
2. Extract mailto:, tel:, e.164-like patterns
3. Extract obvious social profile URLs
4. Prefer sections matching /contact|about|team|investor|notice/i
5. Cap text length; keep head + contact-rich slices

## Present to model as

`CANDIDATES (not verified):` list — model must still output findings JSON with sourceUrls.

## Never

- Auto-write entity columns from visit regex alone without promote path
- Treat aggregator profile pages as personal without collision check

