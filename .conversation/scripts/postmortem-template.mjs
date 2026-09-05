#!/usr/bin/env node
/** L-code postmortem template (Vol 1002/1003/1402). */
const d = new Date().toISOString().slice(0, 10);
const lcode = process.argv[2] || "L-EMPTY";
const entity = process.argv[3] || "ENTITY_ID";
const sha = process.argv[4] || "TIP_SHA";
console.log(`# POSTMORTEM_${lcode}_${d}_${entity}

Tip: \`${sha}\`
Entity id: ${entity}
L-code: ${lcode}
jobId:
Integrity:

## Symptom
(card fields / UI)

## Spans (quote 3–10 lines)
\`\`\`
\`\`\`

## Evidence bag
count:
sample values:

## Root cause
(one of: promote not called | final-review null | enricher overwrite | present layer | cache | identity gate | no dig | issuer priority)

## Fix
PR / tip:
tests run:

## Re-cook
before phone/source/outcome:
after:
`);
