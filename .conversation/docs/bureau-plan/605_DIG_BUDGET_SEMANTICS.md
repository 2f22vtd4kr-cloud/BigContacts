# Volume 605 — Dig Budget Semantics

maxIterations and hardTimeoutMs bound free dig. They are **not** a script of what to do each step.

On timeout: keep partial findings. On cancel: keep partials. On done: accept if not pure no-op.
