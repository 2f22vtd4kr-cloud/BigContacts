import fs from "node:fs";

const launcher = fs.readFileSync("artifacts/apex-finder/src/lib/launch-atlas.ts", "utf8");
const packageJson = JSON.parse(fs.readFileSync("artifacts/apex-finder/package.json", "utf8"));

const failures = [];
const pass = (name, condition) => {
  if (!condition) failures.push(name);
};

pass(
  "non-2xx launch responses remain failures",
  /if\s*\(!res\.ok\)\s*return\s*\{\s*ok:\s*false/.test(launcher),
);

const extractsTrimmedJobId =
  /const jobId\s*=\s*typeof data\?\.jobId === "string"\s*\?\s*data\.jobId\.trim\(\)\s*:\s*""/.test(launcher);
const rejectsMissingJobId =
  /if\s*\(!jobId\)\s*\{\s*return\s*\{\s*ok:\s*false/.test(launcher) &&
  /"Launch response did not include a valid job ID\."/.test(launcher);
const successfulResultUsesValidatedId =
  /return\s*\{\s*ok:\s*true,\s*jobId,\s*message:\s*data\?\.message/.test(launcher);
pass(
  "only a non-empty trimmed job ID can produce a successful live launch result",
  extractsTrimmedJobId && rejectsMissingJobId && successfulResultUsesValidatedId,
);

pass(
  "mock launches stay explicitly labelled as non-live",
  /mock:\s*true/.test(launcher) && /Mock mode — pipeline not started/.test(launcher),
);

for (const scriptName of ["dev", "build"]) {
  pass(
    `frontend ${scriptName} runs the launch-response contract guard`,
    typeof packageJson.scripts?.[scriptName] === "string" &&
      packageJson.scripts[scriptName].includes("node scripts/check-frontend-atlas-launch-contract.mjs"),
  );
}

if (failures.length) {
  console.error("FRONTEND ATLAS LAUNCH CONTRACT: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("FRONTEND ATLAS LAUNCH CONTRACT: PASS");
