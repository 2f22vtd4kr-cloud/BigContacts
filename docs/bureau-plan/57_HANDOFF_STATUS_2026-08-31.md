# Apex Atlas — 57-point handoff status

Updated 2026-08-31 during active engineering continuation. Statuses are evidence-based; **GREEN means verified**, **AMBER means implemented/partially verified but still gated**, and **RED means a real failure exists or the requested proof is not yet complete**. No greenwashing.

1. **Repository/source of truth — GREEN.** `main` is continuously re-verified from GitHub.
2. **Context/handoff recovery — GREEN.** `docs/context.md` and the current session-progress record were inspected.
3. **40K living plan audit — AMBER.** Core architecture/state is documented, but a complete all-file reconciliation remains a continuing workstream.
4. **Boss architecture — GREEN.** Gemini is the Boss; the code/docs enforce that role.
5. **Right Hand architecture — GREEN.** NVIDIA NIM is the Right Hand; it is not the Dig browser/research lane.
6. **Actual research/tool layer — GREEN.** Dig owns web/OSINT actions; tools execute model-selected actions.
7. **Free-ReAct discovery — GREEN.** Discovery remains model-selected rather than a fixed hop sequence.
8. **Canonical Dig loop — GREEN.** `agentic-web-research.ts` is the canonical free-ReAct investigator implementation.
9. **Provider routing — GREEN.** Current Dig chain is Groq → Mistral; Gemini/NVIDIA leakage is guarded.
10. **Provider timeout reliability — GREEN (FIXED, RERUN REQUIRED).** The live run exposed an 18s race against a 40s provider fetch; the race was hardened and wired into the canonical build.
11. **Identity boundary — GREEN.** Observation, hypothesis, identity, evidence, validation and promotion are distinct layers.
12. **Namesake protection — AMBER.** Collision-aware evidence is represented, but must be scored against a clean live batch.
13. **Contact/person separation — GREEN.** Organization routes are not silently promoted to direct personal routes.
14. **Provenance — GREEN.** Contact findings require HTTP(S) source URLs and fail-closed admission.
15. **Promotion/rehydration — AMBER.** The path is implemented and audited statically; live card correctness still needs a successful research batch.
16. **Persistence — AMBER.** Persistence/rehydration code exists; target-by-target live verification remains required.
17. **Tool-result quality — AMBER.** Challenge/blocked-page handling exists; full provider/tool live coverage remains open.
18. **HTML extraction — GREEN.** Contact extraction is observation-only in the canonical hardened source; it cannot manufacture PERSON findings.
19. **Research state representation — GREEN.** Target/objective/history/findings/tool availability are supplied to the Dig loop.
20. **Intelligent stopping — GREEN.** No fixed force-hop floor is present; model-selected `done` remains available.
21. **Budgeting — GREEN.** Iteration/provider concurrency limits constrain expenditure without prescribing research actions.
22. **Fallback transparency — AMBER.** Provider health/error telemetry exists; quality impact still needs live measurement.
23. **Historical 10-target batch — GREEN (ARCHIVED FAILURE, NOT A SUCCESS).** Run `33381234172` failed during polling with `groq:timeout`; the failure is preserved as evidence and is not counted as a passing batch.
24. **10-target fix — GREEN.** Timeout hardening was committed and regression-gated.
25. **10-target rerun — AMBER.** A new rerun was triggered after a newly discovered provider-model mismatch; terminal quality verdict is still required.
26. **API build gate — GREEN.** The live audit build phase has passed on the relevant runs.
27. **Static autonomy gate — GREEN.** The live audit has passed the current autonomy checks.
28. **Provider preflight — GREEN.** Configured Dig generation preflight has passed.
29. **10-target launch gate — GREEN.** The discovery-first Bureau launch endpoint successfully starts a real provider-backed job.
30. **Live research quality — AMBER.** The most recent completed run produced zero admitted entities and therefore correctly failed its quality gate; this is being fixed, not hidden.
31. **Trajectory forensics — AMBER.** The latest artifact proves 19 searches, 6 visits and 25 discovery spans, but produced zero source-backed candidates; detailed target-level forensic tooling remains to be completed.
32. **Independent baseline — AMBER.** Required for the first valid batch; not honestly claimable until Apex produces comparable terminal outputs.
33. **Failure taxonomy F1–F16 — GREEN.** The taxonomy is documented and available for forensic classification.
34. **Reactor truthfulness — GREEN.** Live UI is driven by actual event/state data and suppresses stale live chrome.
35. **No fake browser/query theatre — GREEN.** Explicit-query-only and live-event integrity guards are present.
36. **Live Desk polling — GREEN.** `use-bureau-live.ts` stops polling when Atlas is not live and cleans up its interval.
37. **Mobile Reactor liveness — GREEN.** Mobile derives liveness from running state plus recent event heartbeat and avoids zombie Redis live state.
38. **Discovery span observability — GREEN.** Incorrect completion signatures were fixed so discovery spans terminate correctly.
39. **Source parity — GREEN.** Canonical source materialization/parity gates are present in CI.
40. **Frontend production build — GREEN.** Recent frontend CI passed the production Vite build and Reactor integrity checks.
41. **Responsive contract — GREEN.** CI responsive checks exist and have recently passed; manual browser inspection is still a separate gate.
42. **Desktop browser-level QA — AMBER.** Source has been inspected; fresh deployed visual inspection remains to be completed.
43. **Tablet browser-level QA — AMBER.** Responsive implementation exists; fresh browser-level verification remains.
44. **Mobile browser-level QA — AMBER.** Mobile-specific Reactor flow is implemented; fresh browser-level verification remains.
45. **Figma integration — AMBER / WORKAROUND ACTIVE.** Figma connector is unavailable; no fake Figma inspection is claimed. Work continues from code, GitHub, Context7, Canva and Vercel.
46. **Canva frontend/product support — GREEN.** Canva connector is available for visual collateral/design exploration when useful; it is not treated as a substitute for executable UI code.
47. **Context7 current-library research — GREEN.** Current React guidance was checked, including cleanup for live subscriptions/polling.
48. **Vercel integration — GREEN.** `apex-atlas` project is connected and discoverable.
49. **Vercel deployment — AMBER.** Project currently has zero deployments; deployment validation remains open and the available deployment connector currently rejects its own required arguments before creating a deployment.
50. **Notion operator dashboard — GREEN.** Apex Atlas OSINT Bureau Dashboard and HNWI intelligence database/views exist and were updated with the current verified posture.
51. **HNWI card UX — GREEN/AMBER.** Required concepts (identity, role, evidence, route, uncertainty, next action) are represented; richer production card evolution remains.
52. **Wealth/ownership visualization — AMBER.** Data model/UI direction is documented; sourced estimates and relationship visualization need implementation depth.
53. **Repeated 10-target loop — AMBER.** The latest run exposed a concrete provider configuration defect after the earlier timeout defect; the next run must prove the correction before another clean batch is counted.
54. **100-target validation — AMBER.** Correctly deferred until repeated clean 10-target batches.
55. **Security/secrets — GREEN for engineering handling.** Pasted credentials are treated as compromised and must not enter source/docs/logs; active credentials should be rotated. No credentials are reproduced here.
56. **Operational work style — GREEN.** Work is continuing without requiring repeated “continue” prompts; expensive live work is allowed to run while repository/frontend work proceeds.
57. **Success criterion — AMBER.** The product is not declared victorious until Apex demonstrates materially better truthful research than an independent baseline. The objective remains to drive every open gate to GREEN with real evidence.

## Latest forensic finding — provider model mismatch
The completed rerun on `de86c848` did **not** fail because the API died. It reached `done`, but the quality gate correctly rejected it: **0 entities, 0 source-backed candidates, 19 searches, 6 visits, 25 discovery spans, `degraded=true`**. The API log shows repeated Dig provider failures using Groq model `openai/gpt-oss-20b` with `400` responses while the workflow preflight had successfully tested `openai/gpt-oss-120b`. The workflow therefore had a false-positive preflight/runtime model alignment defect. This was fixed on main by explicitly setting `GROQ_AGENTIC_MODEL: openai/gpt-oss-120b` and making the preflight read the same environment variable. The expensive audit was intentionally retriggered by touching `scripts/live-batch-trigger.md`.

## Current priority stack
1. Let the model-aligned 10-target rerun reach terminal state and inspect the actual artifact.
2. If it produces valid candidates, perform target-by-target identity/provenance/contact forensics.
3. If it produces zero/weak candidates again, diagnose the next actual failure from the trajectory rather than weakening the admission gate.
4. Run the blind independent baseline only after Apex has a real comparable terminal batch.
5. Continue frontend QA/deployment and HNWI workspace implementation in parallel.
6. Repeat clean 10-target batches; only then begin 100-target validation.
