import fs from "node:fs";
function maskSource(source, maskStrings) {
  const chars = source.split("");
  let mode = "code";
  let quote = "";
  for (let i = 0; i < source.length; i += 1) {
    const current = source[i];
    const next = source[i + 1];
    if (mode === "code") {
      if (current === "/" && next === "/") {
        chars[i] = chars[i + 1] = " ";
        mode = "line-comment";
        i += 1;
      } else if (current === "/" && next === "*") {
        chars[i] = chars[i + 1] = " ";
        mode = "block-comment";
        i += 1;
      } else if (current === "'" || current === '"' || source.charCodeAt(i) === 96) {
        quote = current;
        mode = "string";
        if (maskStrings) chars[i] = " ";
      }
    } else if (mode === "line-comment") {
      if (current === "\n") {
        mode = "code";
      } else {
        chars[i] = " ";
      }
    } else if (mode === "block-comment") {
      if (current === "*" && next === "/") {
        chars[i] = chars[i + 1] = " ";
        mode = "code";
        i += 1;
      } else if (current !== "\n" && current !== "\r") {
        chars[i] = " ";
      }
    } else if (mode === "string") {
      if (current === "\\") {
        if (maskStrings) chars[i] = " ";
        if (i + 1 < source.length && next !== "\n" && next !== "\r" && maskStrings) chars[i + 1] = " ";
        i += 1;
      } else if (current === quote) {
        if (maskStrings) chars[i] = " ";
        mode = "code";
      } else if (maskStrings && current !== "\n" && current !== "\r") {
        chars[i] = " ";
      }
    }
  }
  return chars.join("");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\import fs from "node:fs";");
}

function hasCallSite(source, functionName, awaited = false) {
  const code = maskSource(source, true);
  const prefix = awaited ? "\\bawait\\s+" : "\\b";
  return new RegExp(prefix + escapeRegExp(functionName) + "\\s*\\(").test(code);
}

function extractAsyncFunctionBody(source, functionName) {
  const code = maskSource(source, true);
  const signature = new RegExp("\\b(?:export\\s+)?async\\s+function\\s+" + escapeRegExp(functionName) + "\\s*\\(").exec(code);
  if (!signature) return null;

  const openParen = code.indexOf("(", signature.index);
  let parenDepth = 0;
  let closeParen = -1;
  for (let i = openParen; i < code.length; i += 1) {
    if (code[i] === "(") parenDepth += 1;
    else if (code[i] === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        closeParen = i;
        break;
      }
    }
  }
  if (closeParen < 0) return null;

  const bodyStart = code.indexOf("{", closeParen + 1);
  if (bodyStart < 0) return null;
  let braceDepth = 0;
  for (let i = bodyStart; i < code.length; i += 1) {
    if (code[i] === "{") braceDepth += 1;
    else if (code[i] === "}") {
      braceDepth -= 1;
      if (braceDepth === 0) return source.slice(bodyStart + 1, i);
    }
  }
  return null;
}


const route = fs.readFileSync("artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts", "utf8");
const control = fs.readFileSync("artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts", "utf8");
const candidateSourceUnion = fs.readFileSync("artifacts/api-server/src/src/lib/candidate-source-url-union.ts", "utf8");
const researchRouter = fs.readFileSync("artifacts/api-server/src/src/routes/research.ts", "utf8");

const routeText = maskSource(route, false);
const controlText = maskSource(control, false);
const routeCode = maskSource(route, true);
const controlCode = maskSource(control, true);
const researchRouterCode = maskSource(researchRouter, true);
const pipelineBody = extractAsyncFunctionBody(control, "runCanonicalAtlasPipeline");
const pipelineScopeFixture = [
  "async function decoy() { await runBureauAgenticWebPass({}); }",
  "export async function runCanonicalAtlasPipeline() { return true; }",
].join("\n");
const pipelineScopeFixtureBody = extractAsyncFunctionBody(pipelineScopeFixture, "runCanonicalAtlasPipeline");

const canonicalMount = "router.use(canonicalCaseDiscoveryRouter)";
const legacyMount = "router.use(legacyCaseExecutionRetirementRouter)";
const checks = [
  ["regression: invocation matcher ignores import-only identifiers", !hasCallSite('import { runBureauAgenticWebPass } from "./bureau-agentic-pass";', "runBureauAgenticWebPass", true)],
  ["regression: invocation matcher ignores commented-out calls", !hasCallSite("// await runBureauAgenticWebPass({});", "runBureauAgenticWebPass", true)],
  ["regression: invocation matcher ignores calls inside strings", !hasCallSite('const prompt = "await runBureauAgenticWebPass({});";', "runBureauAgenticWebPass", true)],
  ["regression: invocation matcher recognizes a real awaited call", hasCallSite("const result = await runBureauAgenticWebPass({});", "runBureauAgenticWebPass", true)],
  ["regression: pipeline scoping ignores a decoy call in another function", pipelineScopeFixtureBody !== null && !hasCallSite(pipelineScopeFixtureBody, "runBureauAgenticWebPass", true)],
  ["canonical Atlas pipeline function body is identifiable", pipelineBody !== null],
  ["case discovery route delegates to canonical Atlas control plane", hasCallSite(route, "runCanonicalAtlasPipeline")],
  ["case discovery route is HTTP/lifecycle-only", !/runGeminiBossDiscovery|runDeepSeekFreeJson|runBureauAgenticWebPass|persistSourceBackedBureauContactsForEntity/.test(routeCode)],
  ["case discovery route passes an existing durable case", /\\bdiscoveryCaseId\\s*:\\s*caseId\\b/.test(routeCode)],
  ["case discovery route requests discovery-only execution", /\\bdiscoveryOnly\\s*:\\s*true\\b/.test(routeCode)],
  ["canonical Atlas control plane invokes Groq Boss and Groq Right-hand", pipelineBody !== null && hasCallSite(pipelineBody, "runGroqBossDiscovery", true) && hasCallSite(pipelineBody, "runGroqRightHandFreeJson")],
  ["canonical Atlas control plane invokes the selected Investigator", pipelineBody !== null && hasCallSite(pipelineBody, "runBureauAgenticWebPass", true)],
  ["canonical Atlas control plane supports an existing discovery case", /\\bdiscoveryCaseId\\?\\s*:\\s*number\\b/.test(controlCode)],
  ["canonical Atlas control plane has a discovery-only mode", /\\bdiscoveryOnly\\?\\s*:\\s*boolean\\b/.test(controlCode)],
  ["discovery uses first-class empty target rather than Discovery slot", !controlText.includes('targetName: "Discovery slot"')],
  ["discovery identity admission no longer creates synthetic contact evidence", !controlText.includes('value: `person:${name}`')],
  ["discovery admission requires candidate scope", controlText.includes('finding.promotionDecision === "promote"') && controlText.includes('finding.scope === "candidate"')],
  ["discovery admission requires successful observed HTTP provenance", controlText.includes("candidateSourceUrls") && controlText.includes('payload.execution === "success"') && controlText.includes("payload.observedUrls") && controlText.includes("candidateSourceUrls.includes(normalized)")],
  ["canonical route is mounted before retired legacy execution routes", researchRouterCode.indexOf(canonicalMount) >= 0 && researchRouterCode.indexOf(legacyMount) >= 0 && researchRouterCode.indexOf(canonicalMount) < researchRouterCode.indexOf(legacyMount)],
  ["research router no longer mounts the retired casesRouter", !/router\\.use\\(casesRouter\\)/.test(researchRouterCode)],
];

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error("SINGLE CANONICAL DISCOVERY CONTROL PLANE: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("SINGLE CANONICAL DISCOVERY CONTROL PLANE: PASS");
for (const [name] of checks) console.log(`- ${name}`);