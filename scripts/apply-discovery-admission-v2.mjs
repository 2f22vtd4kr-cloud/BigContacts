import fs from "node:fs";

const file = "artifacts/api-server/src/src/lib/discovery-agent.ts";
const source = fs.readFileSync(file, "utf8");

const old = '    if (f.scope !== "candidate") continue;\n';
const replacement = `    // A named person discovered on an organization page is still a valid
    // discovery identity. Scope describes the evidence/contact surface, not
    // whether the named human may become a candidate. Require an explicit
    // personName or person: value below; never promote generic organization
    // contact facts.
    const hasExplicitPersonIdentity = Boolean(String(f.personName ?? "").trim()) || /^person:\\s*/i.test(String(f.value ?? ""));
    if (f.scope !== "candidate" && !hasExplicitPersonIdentity) continue;
`;

if (source.includes('const hasExplicitPersonIdentity = Boolean(String(f.personName ?? "").trim())')) {
  console.log("discovery admission v2 already applied");
  process.exit(0);
}
if (!source.includes(old)) throw new Error("discovery admission anchor not found");

fs.writeFileSync(file, source.replace(old, replacement));
console.log("Applied discovery admission v2: explicit named people may be admitted from organization-scoped evidence; generic org facts remain excluded");
