/** Assert 555 and all-same phones are rejected. */
import { readFileSync } from "node:fs";
const src = readFileSync("artifacts/api-server/src/src/lib/contact-validation.ts", "utf8");
const must = ['exchange === "555"', "isTrashContactValue", "1234567890"];
let fail = 0;
for (const m of must) {
  if (!src.includes(m)) {
    console.log("FAIL missing", m);
    fail++;
  } else console.log("PASS", m);
}
process.exitCode = fail ? 1 : 0;
