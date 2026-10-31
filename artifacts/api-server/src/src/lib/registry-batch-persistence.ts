export type RegistryBatchWriteResult = {
  inserted: number;
  errors: number;
};

export type RegistryBatchWriteAdapter<Tx, Entity, Asset> = {
  transaction: <T>(work: (tx: Tx) => Promise<T>) => Promise<T>;
  insertEntities: (tx: Tx, rows: readonly Entity[]) => Promise<unknown>;
  insertAssets: (tx: Tx, rows: readonly Asset[]) => Promise<unknown>;
};

/**
 * Persist a registry batch atomically. Asset-only batches are first-class:
 * public registries can prove an asset/transaction exists without proving who
 * beneficially owns it. The helper never assigns ownerEntityId.
 */
export async function persistRegistryEntityAssetBatch<Tx, Entity, Asset>(input: {
  entities: readonly Entity[];
  assets: readonly Asset[];
  adapter: RegistryBatchWriteAdapter<Tx, Entity, Asset>;
}): Promise<RegistryBatchWriteResult> {
  const attempted = Math.max(input.entities.length, input.assets.length);
  if (attempted === 0) return { inserted: 0, errors: 0 };

  try {
    await input.adapter.transaction(async (tx) => {
      if (input.entities.length > 0) {
        await input.adapter.insertEntities(tx, input.entities);
      }
      if (input.assets.length > 0) {
        await input.adapter.insertAssets(tx, input.assets);
      }
    });
    return { inserted: attempted, errors: 0 };
  } catch {
    // The transaction adapter is responsible for rollback. No caller may mark
    // the batch's external dedup keys after this result.
    return { inserted: 0, errors: attempted };
  }
}

/**
 * External dedup is committed only after the database transaction succeeds.
 * If marking fails, the error is surfaced to the job owner rather than
 * pretending the batch is safely deduplicated.
 */
export async function persistAndMarkRegistryBatch(input: {
  persist: () => Promise<RegistryBatchWriteResult>;
  keys: readonly string[];
  markSeen: (keys: string[]) => Promise<unknown>;
}): Promise<RegistryBatchWriteResult> {
  const result = await input.persist();
  if (result.errors === 0 && input.keys.length > 0) {
    await input.markSeen([...input.keys]);
  }
  return result;
}
