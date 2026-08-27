# Volume 204 — Job Status Message Library

Prefer specific over phase theater:

| Situation | Message pattern |
|-----------|-----------------|
| Dig running | `Dig: web_search · {query snippet}` |
| Visit | `Dig: visit · {host}` |
| Promote | `Card: phone {n} ({source})` |
| Agent owns card | `Target agent owns card — parallel OSINT skipped` |
| Timeout partial | `Partial dig preserved · findings={k}` |
| Empty after dig | `Dig finished · no promote-grade contact · evidence={k}` |
| Integrity | `Blocked: bureauIntegrity critical` |
| Cancelled | `Stopped by operator` |

Normalize through existing status normalizer; extend patterns as needed.

