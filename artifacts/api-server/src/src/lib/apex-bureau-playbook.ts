import { readFileSync } from "node:fs";

export const APEX_BUREAU_PLAYBOOK = readFileSync(
  new URL("./APEX_ATLAS_BUREAU_PLAYBOOK.txt", import.meta.url),
  "utf8",
).trim();

if (APEX_BUREAU_PLAYBOOK.length < 4_000 || !APEX_BUREAU_PLAYBOOK.startsWith("APEX ATLAS BUREAU PLAYBOOK")) {
  throw new Error("Apex Atlas Bureau Playbook is missing or incomplete.");
}
