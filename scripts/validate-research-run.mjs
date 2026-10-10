#!/usr/bin/env node
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate-research-run.mjs <run.json>");
  process.exit(2);
}

const doc = JSON.parse(fs.readFileSync(file, "utf8"));
if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
  throw new Error("Run artifact must be a JSON object.");
}
if (doc.schemaVersion !== "research-run-v1") {
  throw new Error("Unknown run schemaVersion.");
}

for (const key of ["caseId", "system", "trialId"]) {
  if (typeof doc[key] !== "string" || !doc[key].trim()) {
    throw new Error("Missing " + key);
  }
}

for (const collection of [
  "identities",
  "claims",
  "contacts",
  "contradictions",
  "observations",
  "trajectory",
]) {
  if (!Array.isArray(doc[collection])) {
    throw new Error(collection + " must be an array.");
  }
}
if (doc.failureRecords !== undefined && !Array.isArray(doc.failureRecords)) {
  throw new Error("failureRecords must be an array when present.");
}

const ids = doc.observations.map((observation) =>
  typeof observation?.id === "string" ? observation.id.trim() : "",
);
if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
  throw new Error("Observation IDs must be unique and non-empty.");
}

const known = new Set(ids);
for (const collection of ["identities", "claims", "contacts", "contradictions"]) {
  for (const item of doc[collection]) {
    for (const id of item.supportingObservationIds || []) {
      if (!known.has(String(id))) {
        throw new Error(collection + " references unknown observation " + id);
      }
    }
  }
}
for (const item of doc.failureRecords || []) {
  for (const id of item.evidenceObservationIds || []) {
    if (!known.has(String(id))) {
      throw new Error("failure record references unknown observation " + id);
    }
  }
}

const validOutcomes = [
  "verified",
  "insufficient_evidence",
  "wrong_answer",
  "system_failure",
  "cancelled",
  "exhausted",
  "contradicted",
];
if (!validOutcomes.includes(String(doc.outcome))) {
  throw new Error("Invalid outcome.");
}
if (doc.outcome === "verified" && (!doc.observations.length || !doc.trajectory.length)) {
  throw new Error("Verified runs require non-empty observations and trajectory.");
}

console.log(
  JSON.stringify(
    {
      valid: true,
      schemaVersion: doc.schemaVersion,
      caseId: doc.caseId,
      trialId: doc.trialId,
      observations: ids.length,
      trajectory: doc.trajectory.length,
    },
    null,
    2,
  ),
);
