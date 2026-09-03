import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const profilePath = path.join(root, "artifacts/apex-finder/src/pages/profile.tsx");
const entitiesPath = path.join(root, "artifacts/apex-finder/src/pages/entities.tsx");

const timestampBlock = `\n              {entity?.cookedAt ? (\n                <span\n                  data-testid="research-committed-at"\n                  className="mt-1 inline-flex items-center rounded border border-[#9CFF1A]/15 bg-[#9CFF1A]/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9CFF1A]/75"\n                  title={\`Research committed ${new Date(entity.cookedAt).toLocaleString()}\`}\n                >\n                  Research committed · {new Date(entity.cookedAt).toLocaleString()}\n                </span>\n              ) : (\n                <span data-testid="research-not-committed" className="mt-1 inline-flex items-center font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/35">Research not committed</span>\n              )}`;

const profile = fs.readFileSync(profilePath, "utf8");
if (!profile.includes("data-testid=\"research-committed-at\"")) {
  const anchor = `              </span>\n            </div>\n`;
  const at = profile.indexOf(anchor);
  if (at < 0) throw new Error("Profile header anchor not found; refusing timestamp patch");
  const next = profile.slice(0, at) + timestampBlock + "\n" + profile.slice(at);
  fs.writeFileSync(profilePath, next);
}

const entities = fs.readFileSync(entitiesPath, "utf8");
if (!entities.includes("data-testid=\"entity-research-committed-at\"")) {
  const anchor = `                        <div className="mt-1 max-w-[260px] truncate text-[10px] leading-4 text-muted-foreground/65" title={entityWorkSummary(entity) ?? undefined}>`;
  const at = entities.indexOf(anchor);
  if (at < 0) throw new Error("Entity ledger name anchor not found; refusing timestamp patch");
  const block = `                        {entity.cookedAt && (\n                          <div data-testid="entity-research-committed-at" className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[#9CFF1A]/60" title={new Date(entity.cookedAt).toLocaleString()}>\n                            Research committed · {new Date(entity.cookedAt).toLocaleString()}\n                          </div>\n                        )}\n`;
  fs.writeFileSync(entitiesPath, entities.slice(0, at) + block + entities.slice(at));
}

console.log("[profile-commit-timestamp] applied");
