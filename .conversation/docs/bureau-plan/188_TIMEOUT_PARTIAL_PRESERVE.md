# Volume 188 — Timeout and Cancel: Partial Preserve

## Law

Hard timeout and operator cancel **must** persist findings collected so far and run promote/rehydrate. Discarding partial dig on timeout is a historic failure mode (findings in memory, empty card).

## Checklist

- [ ] agentic return includes findings array on timeout
- [ ] target agent always persistBureauContacts + rehydrate after agentic returns
- [ ] DigSpan records timeout status without clearing prior tool spans
- [ ] Job message mentions partial findings when applicable

## Acceptance

Artificial short timeout on a target that already had 1+ findings in-loop still yields non-empty evidence after job ends.

