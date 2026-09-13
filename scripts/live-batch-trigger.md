# Live Bureau batch trigger

Touch this file to launch the registered complete five-pass code audit gate on `main`.

This marker has no product-runtime behavior. The gate performs five sequential, independent, complete repository audits: architecture contracts, typecheck, build, every API test file in isolation, and source-mutation integrity.
