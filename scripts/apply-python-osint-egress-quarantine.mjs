import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/python-tools.ts";
let source = fs.readFileSync(path, "utf8");

const marker = 'const MAX_SUBPROCESS_OUTPUT_BYTES = 2_000_000;';
if (!source.includes("PYTHON_OSINT_EGRESS_GOVERNED")) {
  if (!source.includes(marker)) throw new Error("python-tools quarantine anchor missing");
  source = source.replace(marker, `${marker}\n\n// SECURITY QUARANTINE (#139/#141): child Python tools own their network stack.\n// Until Apex has a real OS-level sandbox/egress broker, these capabilities must\n// not perform network I/O merely because an Investigator selected them. This\n// is intentionally not an environment-variable opt-in: an env flag cannot\n// constitute an enforcement boundary outside the agent/tool process.\nconst PYTHON_OSINT_EGRESS_GOVERNED = false;\nconst PYTHON_OSINT_EGRESS_ERROR = "Python OSINT capability unavailable: subprocess network egress is not yet governed by the Apex sandbox/egress boundary.";`);
}

const emailNeedle = '  if (!email?.includes("@")) return { ...base, error: "Invalid email" };';
const emailReplacement = '  if (!PYTHON_OSINT_EGRESS_GOVERNED) return { ...base, error: PYTHON_OSINT_EGRESS_ERROR };\n' + emailNeedle;
if (source.includes(emailNeedle) && !source.includes(emailReplacement)) source = source.replace(emailNeedle, emailReplacement);

const usernameNeedle = '  const sanitized = username.replace(/[^a-zA-Z0-9._\\-]/g, "");\n  if (!sanitized) return { ...base, error: "Invalid username" };';
const usernameReplacement = '  if (!PYTHON_OSINT_EGRESS_GOVERNED) return { ...base, error: PYTHON_OSINT_EGRESS_ERROR };\n' + usernameNeedle;
const usernameCount = source.split(usernameNeedle).length - 1;
if (usernameCount > 0 && source.split(usernameReplacement).length - 1 < usernameCount) {
  source = source.split(usernameNeedle).join(usernameReplacement);
}

const gate = 'if (!PYTHON_OSINT_EGRESS_GOVERNED) return { ...base, error: PYTHON_OSINT_EGRESS_ERROR };';
const gateCount = source.split(gate).length - 1;
if (gateCount < 3) throw new Error(`Python OSINT quarantine gates incomplete: expected >=3, found ${gateCount}`);
if (!source.includes("const PYTHON_OSINT_EGRESS_GOVERNED = false;")) throw new Error("Python OSINT quarantine must fail closed");

fs.writeFileSync(path, source);
console.log("Python OSINT subprocess egress quarantine applied: Holehe/Maigret/Sherlock fail closed until governed sandbox egress exists.");
