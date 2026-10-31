import { describe, expect, it, vi } from "vitest";
import {
  persistAndMarkRegistryBatch,
  persistRegistryEntityAssetBatch,
} from "../lib/registry-batch-persistence";

type Tx = { id: "transaction" };

describe("registry batch persistence", () => {
  it("persists asset-only batches without fabricating an entity owner", async () => {
    const transaction = vi.fn(async (work: (tx: Tx) => Promise<void>) => work({ id: "transaction" }));
    const insertEntities = vi.fn(async () => undefined);
    const insertAssets = vi.fn(async (_tx: Tx, rows: readonly { identifier: string; ownerEntityId?: number | null }[]) => {
      expect(rows).toEqual([{ identifier: "N123AB", ownerEntityId: null }]);
    });

    const result = await persistRegistryEntityAssetBatch({
      entities: [],
      assets: [{ identifier: "N123AB", ownerEntityId: null }],
      adapter: { transaction, insertEntities, insertAssets },
    });

    expect(result).toEqual({ inserted: 1, errors: 0 });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insertEntities).not.toHaveBeenCalled();
    expect(insertAssets).toHaveBeenCalledTimes(1);
  });

  it("writes entity and asset rows inside one transaction", async () => {
    const events: string[] = [];
    const transaction = vi.fn(async (work: (tx: Tx) => Promise<void>) => {
      events.push("begin");
      await work({ id: "transaction" });
      events.push("commit");
    });
    const insertEntities = vi.fn(async () => { events.push("entities"); });
    const insertAssets = vi.fn(async () => { events.push("assets"); });

    const result = await persistRegistryEntityAssetBatch({
      entities: [{ name: "Person Candidate" }],
      assets: [{ identifier: "N123AB", ownerEntityId: null }],
      adapter: { transaction, insertEntities, insertAssets },
    });

    expect(result).toEqual({ inserted: 1, errors: 0 });
    expect(events).toEqual(["begin", "entities", "assets", "commit"]);
  });

  it("reports the whole batch failed when either side of the transaction fails", async () => {
    const transaction = vi.fn(async (work: (tx: Tx) => Promise<void>) => work({ id: "transaction" }));
    const insertEntities = vi.fn(async () => undefined);
    const insertAssets = vi.fn(async () => { throw new Error("asset write failed"); });

    const result = await persistRegistryEntityAssetBatch({
      entities: [{ name: "Person Candidate" }],
      assets: [{ identifier: "N123AB" }],
      adapter: { transaction, insertEntities, insertAssets },
    });

    expect(result).toEqual({ inserted: 0, errors: 1 });
  });

  it("marks external dedup keys only after a successful database commit", async () => {
    const events: string[] = [];
    await persistAndMarkRegistryBatch({
      persist: async () => { events.push("database-commit"); return { inserted: 1, errors: 0 }; },
      keys: ["faa:N123AB"],
      markSeen: async () => { events.push("dedup-commit"); },
    });
    expect(events).toEqual(["database-commit", "dedup-commit"]);
  });

  it("never marks dedup keys after a failed database transaction", async () => {
    const markSeen = vi.fn(async () => undefined);
    const result = await persistAndMarkRegistryBatch({
      persist: async () => ({ inserted: 0, errors: 1 }),
      keys: ["faa:N123AB"],
      markSeen,
    });
    expect(result).toEqual({ inserted: 0, errors: 1 });
    expect(markSeen).not.toHaveBeenCalled();
  });
});
