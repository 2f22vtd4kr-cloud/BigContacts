import assert from "node:assert/strict";
import { assessResearchFrontier, scoreResearchAction, scoreSourceIndependence } from "./research-policy";

assert(scoreSourceIndependence({ sourceHosts: ["a.example", "b.example"], sourceClasses: ["REGISTRY", "NEWS"] }) > 0.5);
assert(scoreSourceIndependence({ sourceHosts: ["a.example"], sourceClasses: ["NEWS"], repeatedFamilyCount: 5 }) < 0.6);

const falsify = assessResearchFrontier({
  sourceFamilyDiversity: 2,
  repeatedSourceFamilies: 4,
  evidenceCount: 8,
  unresolvedQuestions: 1,
  contradictions: 2,
  contactCount: 0,
});
assert.equal(falsify.nextMovePriority, "falsify");
assert(falsify.reasons.length > 0);

const contact = scoreResearchAction({
  expectedInformationGain: 0.8,
  successProbability: 0.7,
  sourceIndependence: 0.9,
  contradictionValue: 0.2,
  contactRelevance: 1,
  cost: 0.2,
});
const duplicate = scoreResearchAction({
  expectedInformationGain: 0.8,
  successProbability: 0.7,
  sourceIndependence: 0.1,
  contradictionValue: 0,
  contactRelevance: 0.4,
  cost: 0.2,
});
assert(contact > duplicate);

console.log("research-policy tests passed");
