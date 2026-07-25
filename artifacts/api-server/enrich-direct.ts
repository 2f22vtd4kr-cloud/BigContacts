import { enrichInHouse } from "./src/lib/enrichment/contact-enrichment.js";

const xavina = {
  id: 1, name: "Xavina Moretti-Navarro", type: "INDIVIDUAL",
  nationality: "FR", sourceRegistries: null, knownResidences: "Cannes, France",
  metadata: null, notes: "Présidente Riviera Hospitality SAS, owner Baoli Cannes", bizLocation: "Cannes, France"
};
const jfn = {
  id: 2, name: "Jean-François Navarro", type: "INDIVIDUAL",
  nationality: "FR", sourceRegistries: null, knownResidences: "Cannes, France",
  metadata: null, notes: "Directeur Général Baoli SAS, Cannes", bizLocation: "Cannes, France"
};

console.log("=== Xavina Moretti-Navarro ===");
const r1 = await enrichInHouse(xavina);
console.log(JSON.stringify({ email: r1.email, phone: r1.phone, linkedin: r1.linkedinUrl, website: r1.website, sources: r1.sources, evidence: r1.evidence.map(e=>({type:e.vectorType,value:e.value,source:e.source,url:e.sourceUrl})) }, null, 2));

console.log("\n=== Jean-François Navarro ===");
const r2 = await enrichInHouse(jfn);
console.log(JSON.stringify({ email: r2.email, phone: r2.phone, linkedin: r2.linkedinUrl, website: r2.website, sources: r2.sources, evidence: r2.evidence.map(e=>({type:e.vectorType,value:e.value,source:e.source,url:e.sourceUrl})) }, null, 2));
