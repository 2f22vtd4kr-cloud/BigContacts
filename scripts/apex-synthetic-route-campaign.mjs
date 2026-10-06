import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const routesRoot = path.join(root, "artifacts/api-server/src/src/routes");
const base = `http://127.0.0.1:${process.env.PORT || 8080}`;
const token = process.env.APEX_API_AUTH_TOKEN || "";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  }).filter(p => p.endsWith(".ts"));
}

const routes = [];
const re = /router\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g;
for (const file of walk(routesRoot)) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(re)) routes.push({ method: m[1].toUpperCase(), path: m[2], file: path.relative(root, file) });
}

const cases = [...new Map(routes.map(r => [`${r.method} ${r.path}`, r])).values()];
const errors = [];
const statusCounts = {};

function materialize(p) {
  return p.replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
    if (/id/i.test(name)) return "999999999";
    if (/case|job|session|target|entity/i.test(name)) return "00000000-0000-4000-8000-000000000001";
    return "fake";
  });
}

for (const r of cases) {
  const route = materialize(r.path);
  const url = base + (route.startsWith("/") ? route : "/" + route);
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const init = { method: r.method, headers };
  if (["POST","PUT","PATCH","DELETE"].includes(r.method)) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify({});
  }
  try {
    const res = await fetch(url, init);
    const body = await res.text();
    statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
    if (res.status >= 500 && res.status !== 503) {
      errors.push({ route: r, status: res.status, body: body.slice(0, 1000) });
    }
  } catch (e) {
    errors.push({ route: r, error: String(e) });
  }
}

console.log(JSON.stringify({ routeCount: cases.length, statusCounts, errors }, null, 2));
if (errors.length) process.exit(1);
