# Repository Development Rules

## Main is authoritative

- `main` is the authoritative development and integration branch for this repository.
- All production fixes, architecture changes, tests, documentation, and agent work must ultimately be written into `main`.
- Agents must not treat another branch as the canonical home for completed work.
- A temporary branch may be used for experimentation, isolation, testing, or security work when necessary, but any completed change that is intended to affect the repository must be propagated into `main` before the work is considered complete.
- Before reporting completion, verify that the intended changes are actually present on `main`; do not report completion based only on a non-main branch.
- When porting changes from another branch, preserve the current contents of `main` and apply the intended changes rather than replacing or truncating unrelated work.
- After writing changes to `main`, re-read the affected files (or otherwise verify their exact repository contents) to ensure no file was truncated or partially written.
- Do not silently leave important fixes only on a feature, audit, security, or test branch.

## Apex Atlas audit work

- The Apex Atlas / Apex Finder repository work is governed by the user's current instructions and the architecture documentation in this repository.
- Do not merge or discard work merely because it originated on another branch; the requirement above means the final intended state belongs on `main`.
- Never claim tests, audits, builds, or workflows passed unless they were actually run and passed.

## Audit artefact boundary

- Keep the private, high-fidelity model trace separate from the tracked chronological run report. The raw trace belongs in .local/audits/ (preferred) or private-audits/; both locations are git-ignored. Never stage, commit, push, or paste the raw trace into a tracked report.
- When the user requests investigation-quality debugging, retain source-derived professional email addresses and phone numbers in the private local trace so the actual model-visible context, selected actions, source attribution, and downstream admission can be critically compared. Do not silently redact these contact values from the private trace when APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA=true.
- Always redact credentials, API keys, bearer tokens, passwords, cookies, database connection values, and other secret values. Never capture provider-hidden private chain-of-thought. The private trace may include visible prompts/completions, tool-call payloads, structured hypothesis/purpose/expectedInformationGain, action/parse results, source URLs, and job/case/run IDs.
- The tracked audits/*.md report is public-facing: keep a sanitized chronology, public source URLs, observable decisions, technical failures, counts, and provenance; redact raw contact values and never copy the private trace into it.
- Before changing trace settings, verify that both root .replit and the API artifact development settings use the same unique .local/audits/ destination, test capture remains disabled, visible/tracked-file opt-in remains disabled, and .local/ remains ignored. Resolve a Replit privacy warning by verifying the private destination and safeguards rather than disabling the requested private trace or redacting the contact values needed for analysis.
