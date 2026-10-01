import assert from "node:assert/strict";
import { ResearchIntelligenceEngine } from "./research-intelligence-engine";

const engine = new ResearchIntelligenceEngine({
  executionId: "test-contact-scope",
  target: "Target Person",
  objective: "Find attributable public contact routes",
});

engine.recordAction({
  turn: 1,
  action: "visit",
  execution: "success",
  observation: "Alice Person email alice@example.org",
  urls: ["https://example.org/alice"],
  findings: [{
    vectorType: "email",
    value: "shared@example.org",
    personName: "Alice Person",
    role: "Director",
    sourceUrls: ["https://example.org/alice"],
    note: "Published on Alice's profile",
  }],
});
engine.recordAction({
  turn: 2,
  action: "visit",
  execution: "success",
  observation: "Bob Person email shared@example.org",
  urls: ["https://other.example/bob"],
  findings: [{
    vectorType: "email",
    value: "shared@example.org",
    personName: "Bob Person",
    role: "Director",
    sourceUrls: ["https://other.example/bob"],
    note: "Published on Bob's profile",
  }],
});

const context = engine.buildContext();
const routes = context.contacts.filter((contact) => contact.value === "shared@example.org");
assert.equal(routes.length, 2);
assert.deepEqual(new Set(routes.map((contact) => contact.personName)), new Set(["Alice Person", "Bob Person"]));
assert(context.facts.some((fact) => fact.claim.startsWith("Alice Person email shared@example.org")));
assert(context.facts.some((fact) => fact.claim.startsWith("Bob Person email shared@example.org")));
assert.equal(typeof context.sourceIndependence, "number");
assert.equal(context.frontier.nextMovePriority, "contact");

console.log("research intelligence attribution tests passed");
