# Next forensic audit leaves

## 1. Free-ReAct initial action — issue #120
Remove the forced `web_search` opening observation from the canonical Investigator loop. The first model turn must receive the durable case objective/context and choose any valid action. No deterministic initial tool.

## 2. Deterministic secondary surface — issue #125
`expandSecondaryPublicSurface()` currently chooses a fixed research sequence. Retire its automatic canonical invocation. If capabilities survive, expose them as model-selectable tools behind the canonical Investigator boundary.

## 3. Secondary-surface SSRF — issue #126
Any surviving website/leadership fetch must use the shared pinned-IP SSRF-safe transport and must not follow unvalidated redirects.

## 4. Startup/UI retired-route cleanup
The API guard now returns 410 for known legacy enrichment research routes, but startup and operator UI still contain stale references. Remove those callers so the system does not attempt retired research lanes.

## 5. Frontend API authorization
`setAuthTokenGetter()` exists in the shared client but has no application registration. The API now requires a bearer token outside `/healthz` and loopback CI compatibility. Trace the real web authentication/session model before runtime verification; never embed the server bearer secret into a browser bundle.

## 6. Continue mounted-route audit
Inspect `ingest-migrations`, `ingest-enrichment`, `ingest-pipeline`, `extended-osint`, and registry enrichers for deterministic mutations or research sequencing that remain reachable after the legacy-route retirement.
