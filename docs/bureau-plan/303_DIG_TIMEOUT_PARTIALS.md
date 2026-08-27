# Volume 303 — Dig Timeouts Keep Partials

## Rule

On hard timeout or cancel, **preserve** findings and evidence already extracted. Never discard the bag because the model did not emit a final `done`.

## Operator expectation

Partial card after timeout is better than empty. Rehydrate + optional second dig at deep is allowed; overwriting with issuer phase is not.
