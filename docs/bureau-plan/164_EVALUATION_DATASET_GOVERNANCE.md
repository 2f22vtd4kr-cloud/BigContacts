# Volume 164 — Evaluation Dataset Governance

## Principles

1. Fixtures are **public-figure / public-filer** oriented where possible; no private doxxing targets in repo docs.
2. Baselines store **methodology**, not harvested personal data dumps.
3. COMPARE files may list scores and outcome labels; avoid republishing unnecessary PII beyond what filings already show.
4. Collision fixtures use intentionally common names with documented wrong-path risks.

## Versioning

- `fixtures/v1/` locked when milestone first passes
- v2 adds jurisdictions / privacy-hardened cases without removing v1

## Contamination

Engineers must not hardcode fixture phone numbers into promote logic. Tests may use synthetic numbers only.

