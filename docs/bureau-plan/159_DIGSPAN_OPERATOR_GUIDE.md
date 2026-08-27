# Volume 159 — DigSpan Operator Guide

## What you should see on a healthy dig

1. `target_contact_agent_start` (stage, active→ok)
2. Multiple `llm_step` or model-named spans
3. `web_search` tool spans with query summaries
4. `visit` or `browser_fetch` spans with URLs
5. `card_promote` or target_contact_agent_done with findings count

## Red flags

| Observation | Likely issue |
|-------------|--------------|
| Only start/done, no tools | Model parse fail or no tool execution |
| Only llm_step | JSON parse loop |
| search but no visit | Model stopped early or SERP empty |
| promote with empty input | Findings lacked sourceUrls |
| Spans from previous job after stop | clearDigSpans regression |

## Mapping to L-codes

No tool spans → L-NO-DIG. Promote empty with evidence elsewhere → L-PROMOTE. etc.

