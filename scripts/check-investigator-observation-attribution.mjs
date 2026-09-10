import fs from "node:fs";

const corePath = "artifacts/api-server/src/src/lib/agentic-web-research-core.ts";
const source = fs.existsSync(corePath) ? fs.readFileSync(corePath, "utf8") : "";

let failed = false;
if (!source) {
  console.log(`FAIL canonical Investigator core is missing: ${corePath}`);
  failed = true;
} else {
  // Deterministic observations may report raw facts and observed provenance, but they
  // must not inherit the target input as a person identity. Identity attribution belongs
  // to the Investigator model's explicit finding/promotion decision.
  const forbiddenAssignments = [
    { re: /personName\s*:\s*targetName\b/g, label: "personName: targetName" },
    { re: /personName\s*:\s*name\b/g, label: "personName: name" },
  ];
  for (const { re, label } of forbiddenAssignments) {
    if (re.test(source)) {
      console.log(`FAIL deterministic Investigator observation still assigns identity directly: ${label}`);
      failed = true;
    } else {
      console.log(`PASS no deterministic identity assignment: ${label}`);
    }
  }

  // Footprint observations are especially dangerous because they can look like identity
  // proof while being produced by a deterministic tool branch. Keep the guard explicit.
  const footprintBlock = source.match(/if \(action\.action === "footprint_email"\)[\s\S]*?if \(action\.action === "footprint_username"\)/)?.[0] ?? "";
  if (/personName\s*:\s*name\b/.test(footprintBlock)) {
    console.log("FAIL footprint-email observation inherits target identity into FINDINGS SO FAR.");
    failed = true;
  } else {
    console.log("PASS footprint-email observation does not inherit target identity.");
  }

  const usernameBlock = source.match(/if \(action\.action === "footprint_username"\)[\s\S]*?\/\/ done is entirely model-owned/)?.[0] ?? "";
  if (/personName\s*:\s*name\b/.test(usernameBlock)) {
    console.log("FAIL footprint-username observation inherits target identity into FINDINGS SO FAR.");
    failed = true;
  } else {
    console.log("PASS footprint-username observation does not inherit target identity.");
  }
}

if (failed) process.exit(1);
