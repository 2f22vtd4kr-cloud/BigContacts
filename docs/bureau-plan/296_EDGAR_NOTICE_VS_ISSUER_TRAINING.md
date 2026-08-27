# Volume 296 — EDGAR Notice vs Issuer (Training for Operators, Not Models)

## Field knowledge

SEC SC 13D/G often lists a **notices and communications** phone for the reporting person or their counsel—distinct from the **issuer** company switchboard in header/CIK data.

## Apex rules

- Prefer notice-line extraction into dig/evidence with class like `EDGAR-Notice-Phone`
- Issuer CIK main line → organization_contact only
- Do not micro-train the dig model with a mandatory “always open SC13 first” hop list; expose registry tools and let the model choose

## Evaluation

COMPARE losses where Apex shows issuer 267/408-class numbers while notice 609/203-class numbers are public are **L-ISSUER** / promote bugs, not “LLM too weak.”
