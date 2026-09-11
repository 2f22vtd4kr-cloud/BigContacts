import fs from "node:fs";

const source = fs.readFileSync("artifacts/api-server/src/src/lib/python-tools.ts", "utf8");
const failures = [];
const assert = (ok, message) => { if (!ok) failures.push(message); };

assert(source.includes("authorizePythonSandboxRequest"), "Python OSINT boundary does not require sandbox authorization");
assert(source.includes('capability: "network_osint"'), "Python network capability is not explicitly authorized");
assert(source.includes("PYTHON_SANDBOX_UNAVAILABLE_REASON"), "Python OSINT boundary lacks canonical unavailable reason");
assert(source.includes("return { ...base, error: blocked }"), "blocked Python capabilities do not fail closed with an explicit error");
assert(source.includes("available: false"), "Python capability defaults are not unavailable");
assert(source.includes("state === \"attested\""), "Python availability is not tied to sandbox attestation");
assert(source.includes("allowedCapabilities.includes(\"network_osint\")"), "Python availability does not require the network_osint capability attestation");
assert(!/from \"node:child_process\"|from \"child_process\"/.test(source), "python-tools directly imports child_process and can bypass the sandbox contract");
assert(!/execFile|spawn\(|spawnSync\(|exec\(/.test(source), "python-tools directly invokes subprocess execution and can bypass the sandbox contract");

if (failures.length) {
  console.error("PYTHON OSINT FAIL-CLOSED: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PYTHON OSINT FAIL-CLOSED: PASS");
