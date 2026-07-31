---
name: Phase J2 registry coverage
description: Durable boundaries for the Western registry coverage matrix and live adapters.
---

The Phase J2 matrix may document more sources than the live search client supports. Bulk-only ingestors such as FAA and HMLR should remain visible as coverage entries but must not be accepted by the live registry-search selector unless a normalized search adapter exists.

**Why:** A coverage matrix describes the research landscape, while the search endpoint promises an executable adapter. Treating every matrix row as searchable creates false capabilities and confusing runtime failures.

**How to apply:** Keep live registry IDs in an explicit allowlist separate from the matrix. Preserve source provenance, identifier validation, and source-specific evidence semantics; commercial announcements are evidence, not beneficial-ownership proof.