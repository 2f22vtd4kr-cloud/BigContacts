import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const libDir = path.resolve(process.cwd(), "src/src/lib");
const targetAgent = fs.readFileSync(path.join(libDir, "target-contact-agent.ts"), "utf8");
const targetRunner = fs.readFileSync(path.join(libDir, "canonical-single-target-runner.ts"), "utf8");
const strictPersistence = fs.readFileSync(path.join(libDir, "bureau-contact-persist-strict.ts"), "utf8");

describe("canonical target contact promotion ordering", () => {
  it("defers card-field promotion while the caller owns target oversight", () => {
    expect(targetAgent).toContain('deferCardPromotion: input.oversightMode === "caller"');
    expect(targetAgent).toContain("promotionCandidates: input.oversightMode === \"caller\" ? contacts.filter((item) => item.promote === true) : []");
    expect(strictPersistence).toContain("options?:{deferCardPromotion?:boolean}");
    expect(strictPersistence).toContain("if(agenticSource&&!options?.deferCardPromotion)");
  });

  it("retries strict promotion only after the immutable Boss oversight evidence is persisted", () => {
    const oversight = targetRunner.indexOf("lastOversight = await reviewTargetInvestigationAct({");
    const promotion = targetRunner.indexOf("await persistSourceBackedBureauContactsForEntity(", oversight);
    const promotionGuard = targetRunner.lastIndexOf("if (\n      latestResult.status === \"completed\"", promotion);
    expect(oversight).toBeGreaterThanOrEqual(0);
    expect(promotion).toBeGreaterThan(oversight);
    expect(promotionGuard).toBeGreaterThan(oversight);
    const promotionBlock = targetRunner.slice(promotionGuard, targetRunner.indexOf("recentActs.push(currentAct)", promotion));
    expect(promotionBlock).toContain('lastOversight.status === "completed"');
    expect(promotionBlock).toContain("(lastOversight.evidenceGraphCount ?? 0) > 0");
    expect(promotionBlock).toContain('promotionJob.status !== "running"');
    expect(promotionBlock).toContain('isCanonicalJobOwner("atlas-run", atlasJobId)');
    expect(promotionBlock).toContain("latestResult.promotionProvenance");
  });
});
