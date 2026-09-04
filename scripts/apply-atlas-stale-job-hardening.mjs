import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "artifacts/api-server/src/src/routes/atlas.ts");
let source = fs.readFileSync(target, "utf8");

const constants = `const ATLAS_ZOMBIE_MS = (() => {
  const parsed = Number(process.env.ATLAS_ZOMBIE_MS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(parsed, 10 * 60 * 1_000) : 90 * 60 * 1_000;
})();
const ATLAS_STALE_PROGRESS_MS = (() => {
  const parsed = Number(process.env.ATLAS_STALE_PROGRESS_MS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(parsed, 10 * 60 * 1_000) : 10 * 60 * 1_000;
})();
const ATLAS_DISABLE_AUTO_CLEAR = /^(1|true|yes)$/i.test(String(process.env.ATLAS_DISABLE_AUTO_CLEAR ?? ""));`;

const oldConstants = `const ATLAS_ZOMBIE_MS = 90 * 60 * 1_000;\nconst ATLAS_STALE_PROGRESS_MS = 90 * 1_000;`;
if (source.includes(oldConstants)) {
  source = source.replace(oldConstants, constants);
}

const oldCondition = `if (hardZombie || softZombie || !Number.isFinite(startedMs)) {`;
const newCondition = `if (!ATLAS_DISABLE_AUTO_CLEAR && (hardZombie || softZombie || !Number.isFinite(startedMs))) {`;
if (source.includes(oldCondition)) {
  source = source.replace(oldCondition, newCondition);
}

if (!source.includes("ATLAS_DISABLE_AUTO_CLEAR")) {
  throw new Error("atlas stale-job hardening: expected patch anchor not found");
}

fs.writeFileSync(target, source);
console.log("atlas stale-job hardening applied");
