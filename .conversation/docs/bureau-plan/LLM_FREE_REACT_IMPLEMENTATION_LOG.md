# Apex Atlas — LLM Free-ReAct Implementation Log

## Operating rule
This log records implementation decisions and observed evidence for the Bureau integrity program. Apex must behave as an agentic researcher: models choose questions, queries, sites, tools, pivots, evidence interpretation, target selection, and stopping. Deterministic code may enforce safety, provenance, schema integrity, budgets, deduplication, and execution mechanics, but must not secretly choose a research playbook, rank targets, force tool hops, or turn scraped labels into people.

## Current implementation cycle

### 1. Stop treating successful execution as successful research
A green workflow is insufficient. Each Bureau batch must be audited for the causal chain: model decision -> tool execution -> observation -> model interpretation -> candidate proposal -> identity/provenance validation -> persistence -> promotion. The batch is not considered successful when it merely creates rows or contacts.

### 2. Identity boundary
The discovery admission boundary must reject malformed semantic fragments such as `com EMAIL`, `President PERSON`, `State St`, `Operational Enablement`, and `Product Comparisons Sage Products`. These are not “bad targets to rank lower”; they are failures of identity binding. Organization-scoped evidence must remain organization evidence unless the model explicitly establishes a person identity with source-backed evidence.

### 3. Model autonomy
Do not replace the failure with a scripted list of approved queries, sites, people, or tool sequences. The model remains responsible for deciding what a competent researcher should do next. Validation occurs after the decision and execution, not before it as a hidden research policy.

### 4. Observation fidelity
Tool output supplied to the model must preserve enough context to distinguish page title, URL, organization, person, role, email labels, navigation text, and surrounding evidence. Heterogeneous scraped fields must not be flattened into a candidate string before model interpretation.

### 5. Candidate provenance
A candidate must carry its source URL and the evidence that binds the source to the named person. A URL alone is not evidence that a person exists on that page. Generic page fragments, field labels, domain components, job titles, and organization names cannot become person identities through coercive parsing.

### 6. Independent same-target comparison
For every completed batch, freeze the exact admitted targets and conduct an independent research pass against the same targets. Compare identity accuracy, source quality, directness of contact route, intermediary quality, unsupported claims, missed public routes, tool efficiency, and stopping judgment. The comparison is diagnostic; it must not be used to force a predetermined Bureau answer.

### 7. Practical reachability
Research objective is attainable public contact routes, not fame. Billionaires, celebrity principals, and Forbes-list searches are not intrinsically prohibited, but they are poor default proxies for reachability. The agent should recognize access friction and pivot toward less famous principals/operators/founders/investors/family-office principals where a plausible public or intermediary route exists.

### 8. Regression prevention
Every discovered causal failure must become a regression test at the correct layer. Tests must distinguish model autonomy from deterministic safety. A regression test that passes only because it hard-codes a preferred person, query, site, or tool order is invalid.

## Live status
The current GitHub Actions batch is being used as an execution test of these controls. Do not declare success until the actual trajectories and frozen outputs have been inspected.
