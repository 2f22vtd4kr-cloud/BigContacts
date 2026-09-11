import fs from "node:fs";

const path = "artifacts/api-server/src/src/lib/registry-client.ts";
let source = fs.readFileSync(path, "utf8");

if (!source.includes("function createRegistryRequestSignal")) {
  source = source.replace(
    'import { logger } from "./logger";\n',
    'import { logger } from "./logger";\n\nfunction createRegistryRequestSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {\n  const timeoutSignal = AbortSignal.timeout(timeoutMs);\n  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;\n}\n',
  );
}

if (!source.includes("signal?: AbortSignal;")) {
  source = source.replace(
    "  limit?: number;\n}",
    "  limit?: number;\n  signal?: AbortSignal;\n}",
  );
}

const networkFunctions = [
  "searchOpenCorporates", "searchCompaniesHouse", "searchSecEdgar", "searchBrreg",
  "searchAres", "searchBodacc", "searchCvrDenmark", "searchZefixSwitzerland",
  "searchOffeneregisterGermany", "searchBolagsverketSweden", "searchYtjFinland",
  "searchAtokaItaly", "searchBormeSpain", "searchKvkNetherlands", "searchKboBelgium",
];
for (const name of networkFunctions) {
  const re = new RegExp(`async function ${name}\\(([\\s\\S]*?)\\): Promise`);
  const match = source.match(re);
  if (!match) throw new Error(`registry cancellation: function ${name} not found`);
  if (!match[1].includes("signal?: AbortSignal")) {
    const params = match[1].trimEnd().replace(/,\s*$/, "");
    source = source.replace(match[0], `async function ${name}(${params}${params.trim() ? "," : ""}\n  signal?: AbortSignal,\n): Promise`);
  }
}

source = source.replace(
  "  const signal = AbortSignal.timeout(10_000);\n  const n = Math.min(limit, 20);",
  "  const requestSignal = createRegistryRequestSignal(signal, 10_000);\n  const n = Math.min(limit, 20);",
);
source = source.replaceAll("{ headers, signal },", "{ headers, signal: requestSignal },");
source = source.replace(/signal:\s*AbortSignal\.timeout\((\d+)\)/g, "signal: createRegistryRequestSignal(signal, $1)");

source = source.replace(
  "  const { query, registry, limit = 10 } = params;",
  "  const { query, registry, limit = 10, signal } = params;\n  if (signal?.aborted) throw new Error(\"cancelled\");",
);

const calls = [
  ["searchOpenCorporates(query.trim(), limit)", "searchOpenCorporates(query.trim(), limit, signal)"],
  ["searchCompaniesHouse(query.trim(), apiKey, limit)", "searchCompaniesHouse(query.trim(), apiKey, limit, signal)"],
  ["searchSecEdgar(query.trim(), limit)", "searchSecEdgar(query.trim(), limit, signal)"],
  ["searchBrreg(query.trim(), limit)", "searchBrreg(query.trim(), limit, signal)"],
  ["searchAres(query.trim(), limit)", "searchAres(query.trim(), limit, signal)"],
  ["searchBodacc(query.trim(), limit)", "searchBodacc(query.trim(), limit, signal)"],
  ["searchCvrDenmark(query.trim(), limit)", "searchCvrDenmark(query.trim(), limit, signal)"],
  ["searchZefixSwitzerland(query.trim(), limit)", "searchZefixSwitzerland(query.trim(), limit, signal)"],
  ["searchOffeneregisterGermany(query.trim(), limit)", "searchOffeneregisterGermany(query.trim(), limit, signal)"],
  ["searchBolagsverketSweden(query.trim(), limit)", "searchBolagsverketSweden(query.trim(), limit, signal)"],
  ["searchYtjFinland(query.trim(), limit)", "searchYtjFinland(query.trim(), limit, signal)"],
  ["searchAtokaItaly(query.trim(), limit)", "searchAtokaItaly(query.trim(), limit, signal)"],
  ["searchBormeSpain(query.trim(), limit)", "searchBormeSpain(query.trim(), limit, signal)"],
  ["searchKvkNetherlands(query.trim(), limit)", "searchKvkNetherlands(query.trim(), limit, signal)"],
  ["searchKboBelgium(query.trim(), limit)", "searchKboBelgium(query.trim(), limit, signal)"],
];
for (const [from, to] of calls) source = source.replaceAll(from, to);
source = source.replace(
  "const results = await searchGleif(query.trim(), limit);",
  "const results = await searchGleif(query.trim(), limit, signal);",
);

if (!source.includes("signal?: AbortSignal;")) throw new Error("registry cancellation: public signal field missing");
if (!source.includes("function createRegistryRequestSignal")) throw new Error("registry cancellation: timeout composition helper missing");
if (!source.includes("searchOpenCorporates(query.trim(), limit, signal)")) throw new Error("registry cancellation: public signal is not propagated");
if (!source.includes("searchGleif(query.trim(), limit, signal)")) throw new Error("registry cancellation: GLEIF signal is not propagated");
if (/searchOpenCorporates\(query\.trim\(\), limit\)\b/.test(source)) throw new Error("registry cancellation: stale OpenCorporates call remains");
if (/signal:\s*AbortSignal\.timeout\(/.test(source)) throw new Error("registry cancellation: raw timeout-only fetch remains");

fs.writeFileSync(path, source);
console.log("registry cancellation boundary: applied");
