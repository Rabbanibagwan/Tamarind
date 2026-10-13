import type { CollectionName, CollectionRowMap, DataStore } from "./types";

/** In-memory store for unit tests (no IndexedDB / SQLite required). */
export function createMemoryStore(): DataStore {
  const tables = new Map<CollectionName, Map<string, unknown>>();
  const ensure = (c: CollectionName) => {
    if (!tables.has(c)) tables.set(c, new Map());
    return tables.get(c)!;
  };

  let depth = 0;
  const store: DataStore = {
    async get(collection, id) {
      return ensure(collection).get(id) as never;
    },
    async put(collection, row) {
      const r = row as { id: string };
      ensure(collection).set(r.id, structuredClone(row));
    },
    async update(collection, id, patch) {
      const cur = ensure(collection).get(id);
      if (!cur) return;
      ensure(collection).set(id, { ...(cur as object), ...patch, id });
    },
    async delete(collection, id) {
      ensure(collection).delete(id);
    },
    async getAll(collection) {
      return [...ensure(collection).values()].map((v) => structuredClone(v)) as never;
    },
    async clear(collection) {
      ensure(collection).clear();
    },
    async bulkPut(collection, rows) {
      const m = ensure(collection);
      for (const row of rows) {
        const r = row as { id: string };
        m.set(r.id, structuredClone(row));
      }
    },
    async count(collection) {
      return ensure(collection).size;
    },
    async filter(collection, predicate) {
      const rows = [...ensure(collection).values()] as CollectionRowMap[typeof collection][];
      return rows.filter(predicate).map((v) => structuredClone(v)) as never;
    },
    async whereEquals(collection, field, value) {
      const rows = [...ensure(collection).values()] as Array<Record<string, unknown>>;
      return rows
        .filter((r) => r[field] === value)
        .map((v) => structuredClone(v)) as never;
    },
    async transaction(fn) {
      depth += 1;
      try {
        return await fn();
      } finally {
        depth -= 1;
        void depth;
      }
    },
  };
  return store;
}
