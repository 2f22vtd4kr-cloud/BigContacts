import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "artifacts/api-server/src/src/routes/atlas.ts");
let source = fs.readFileSync(target, "utf8");
const original = source;

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
if (source.includes(oldConstants)) source = source.replace(oldConstants, constants);

const launchCondition = `if (hardZombie || softZombie || !Number.isFinite(startedMs)) {`;
const launchGuarded = `if (!ATLAS_DISABLE_AUTO_CLEAR && (hardZombie || softZombie || !Number.isFinite(startedMs))) {`;
if (source.includes(launchCondition)) source = source.replace(launchCondition, launchGuarded);

const statusCondition = `if (hardZombie || softZombie) {`;
const statusGuarded = `if (!ATLAS_DISABLE_AUTO_CLEAR && (hardZombie || softZombie)) {`;
if (source.includes(statusCondition)) source = source.replace(statusCondition, statusGuarded);

if (!source.includes("ATLAS_DISABLE_AUTO_CLEAR")) {
  throw new Error("atlas stale-job hardening: expected patch anchor not found");
}

if (source !== original) fs.writeFileSync(target, source);
console.log(source === original ? "atlas stale-job hardening already applied" : "atlas stale-job hardening applied");
