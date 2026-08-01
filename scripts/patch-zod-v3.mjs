import fs from "node:fs";

const file = new URL("../lib/api-zod/src/generated/api.ts", import.meta.url);
const source = fs.readFileSync(file, "utf8");
const patched = source.replaceAll("zod.coerce.number().int()", "zod.coerce.number().int()");
// Orval 8 may emit zod.int() for OpenAPI integer schemas. This workspace uses
// Zod 3, where integer validation is expressed as zod.number().int().
const compatible = patched.replaceAll("zod.int()", "zod.number().int()");
if (compatible !== source) fs.writeFileSync(file, compatible);