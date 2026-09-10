# Forensic audit — target control-plane continuation gap — 2026-09-10

## Finding

The canonical single-target path currently has a single Investigator ReAct pass followed by DeepSeek post-review and Gemini final review. `canonical-single-target-runner.ts` does not currently give the Boss a model-owned continuation decision after the Investigator/Right-Hand review.

This is different from the canonical discovery path, which already exposes the explicit Atlas control actions:

- `continue_discovery`
- `research_candidate`
- `revisit_candidate`
- `pivot_discovery`
- `stop`

The institutional contract says Gemini owns research continuation and final high-level decisions. Therefore a target case should not become structurally complete merely because one Investigator pass returned and the deterministic runner advanced to final review.

## Why this matters

A strong target investigation may produce:

```text
Investigator pass
  -> evidence gap discovered
  -> Right Hand identifies the gap
  -> Boss decides another investigation is worthwhile
  -> Investigator resumes with durable context
```

The current target runner instead does:

```text
Investigator pass
  -> Right Hand review
  -> Gemini final review
  -> deterministic case completion
```

That is a control-plane limitation, not a ReAct tool-selection defect.

## Required remediation

Introduce a durable target continuation decision boundary analogous to Atlas discovery control, without creating a deterministic target recipe. Gemini should explicitly decide whether to:

- stop;
- continue target research;
- revisit a prior lead/source;
- pivot the research question;
- request another Investigator pass.

Any continuation must remount the same durable case context and preserve the prior structured trajectory. Deterministic code may enforce hard turn/runtime/resource limits, but must not decide that a target has had enough research based on a fixed number of hops.

No runtime/CI success is claimed by this audit.