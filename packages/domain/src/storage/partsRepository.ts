import type { StorageAdapter } from "@thoth/storage";
import type { PartSpecification } from "../parts/types";
import type { GlobalPartsDatabase } from "../parts/registry";

const COLLECTION_NAME = "parts_catalog";

/**
 * Persists a single PartSpecification into the storage backend.
 */
export async function savePart(
  storage: StorageAdapter,
  part: PartSpecification,
): Promise<PartSpecification> {
  return storage.put<PartSpecification>(COLLECTION_NAME, part);
}

/**
 * Loads a single PartSpecification by id from the storage backend.
 */
export async function loadPart(
  storage: StorageAdapter,
  id: string,
): Promise<PartSpecification | undefined> {
  return storage.get<PartSpecification>(COLLECTION_NAME, id);
}

/**
 * Loads all stored PartSpecification records from the storage backend.
 */
export async function loadAllParts(
  storage: StorageAdapter,
): Promise<PartSpecification[]> {
  return storage.list<PartSpecification>(COLLECTION_NAME);
}

/**
 * Batch saves an array of PartSpecification records into the storage backend.
 */
export async function savePartsCatalog(
  storage: StorageAdapter,
  catalog: PartSpecification[],
): Promise<void> {
  await storage.transaction(async () => {
    for (const part of catalog) {
      await storage.put<PartSpecification>(COLLECTION_NAME, part);
    }
  });
}

/**
 * Synchronizes an entire GlobalPartsDatabase registry into the storage backend.
 */
export async function syncCatalogToStorage(
  storage: StorageAdapter,
  db: GlobalPartsDatabase,
): Promise<void> {
  const parts = db.getAllParts();
  await savePartsCatalog(storage, parts);
}
