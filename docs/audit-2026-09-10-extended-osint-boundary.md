# Audit — extended OSINT mutation boundary

## Finding

The canonical legacy Apex mutation guard was mounted immediately before `ingestRouter`, but `extendedOsintRouter` is mounted later in the live API route index. That left the live `/enrich/*` extended-OSINT surface outside the guard.

## Fix

The guard is now mounted immediately after the public health router and before every other API router. This makes its POST `/enrich/*` scope checks apply to extended OSINT as well as ingest routes.

The static regression check now explicitly requires the guard to precede both `ingestRouter` and `extendedOsintRouter`.

## Remaining work

This closes the mutation-boundary placement bug. It does **not** make every extended-OSINT capability safe or model-owned. The endpoint implementations still require leaf-level audit for deterministic research, entity mutation, and outbound-fetch/SSRF behavior.
