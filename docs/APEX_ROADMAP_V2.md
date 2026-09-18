# Apex Post-Certification Roadmap v2

Status: implementation complete on the authoritative branch, 2026-09-18.

This roadmap follows the latest implementation bugs rather than assuming the first quality-contract layer is sufficient.

## 1. Make contracts executable, not illustrative
Validate registry, research runs, evidence graphs, source intelligence, failure records, and campaign envelopes structurally. Reject malformed or ambiguous artifacts before scoring.

## 2. Make campaign scoring evidence-safe
A campaign scorer must validate every run before aggregating it, reject duplicate run/trial identities, require matched configuration envelopes, and never treat missing runs as a successful experiment.

## 3. Make provenance canonical
Normalize URLs consistently, require source records for observations, preserve original URL separately from normalized URL, and bind every evidence assertion to an observation.

## 4. Make failure telemetry trustworthy
Failure IDs must be unique within a campaign, evidence references must resolve, failure classes must be canonical, and system failures must remain distinct from research failures.

## 5. Make Investigator evolution regression-driven
Every prompt/policy change gets a before/after campaign artifact and affected regression cases. No behavioral improvement may be declared from a single trial or a single metric.

## 6. Make safety regression permanent
Keep redirect handling, response-size limits, cancellation, prompt-injection resistance, provider fail-closed behavior, and Python OSINT isolation as explicit regression surfaces.

## 7. Make workstation evidence-first
The UI remains a presentation layer over the canonical case/evidence state. Evidence paths must be inspectable without creating an alternate research controller.

## 8. Make CI certification layered
Research-contract CI validates artifacts and type safety. Complete-codebase CI remains the engineering certification. Live-audit failures remain separately visible and are never relabeled as green.

## 9. Run the empirical campaign
Execute at least three matched trials across the current 38 grounded cases, then expand the registry to 50+ grounded cases. Preserve raw artifacts and independently adjudicate ambiguous outcomes.

## 10. Release only on evidence
Do not promote the Gauntlet to a release gate until 50+ grounded cases and repeated campaigns demonstrate stable evidence-backed behavior across identity, attribution, contradiction, source quality, and safety dimensions. Never collapse these dimensions into a single score.
