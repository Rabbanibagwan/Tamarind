import * as SQLite from "expo-sqlite";
import type { CollectionName, CollectionRowMap, DataStore } from "@tamarind/core";
import { ALL_COLLECTIONS } from "@tamarind/core";

const DB_NAME = "tamarind_billing_v1.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS records (
          collection TEXT NOT NULL,
          id TEXT NOT NULL,
          json TEXT NOT NULL,
          PRIMARY KEY (collection, id)
        );
        CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
      `);
      return db;
    })();
  }
  return dbPromise;
}

function parseRow<T>(json: string): T {
  return JSON.parse(json) as T;
}

/**
 * SQLite-backed DataStore for native. Rows stored as JSON per collection.
 * Suitable for single-merchant offline scale; filters run in JS.
 */
export function createSqliteStore(): DataStore {
  let txDepth = 0;

  const store: DataStore = {
    async get(collection, id) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ json: string }>(
        "SELECT json FROM records WHERE collection = ? AND id = ?",
        [collection, id],
      );
      return row ? (parseRow(row.json) as never) : undefined;
    },

    async put(collection, row) {
      const db = await getDb();
      const r = row as { id: string };
      await db.runAsync(
        `INSERT INTO records (collection, id, json) VALUES (?, ?, ?)
         ON CONFLICT(collection, id) DO UPDATE SET json = excluded.json`,
        [collection, r.id, JSON.stringify(row)],
      );
    },

    async update(collection, id, patch) {
      const cur = await store.get(collection, id);
      if (!cur) return;
      await store.put(collection, { ...cur, ...patch, id } as CollectionRowMap[typeof collection]);
    },

    async delete(collection, id) {
      const db = await getDb();
      await db.runAsync("DELETE FROM records WHERE collection = ? AND id = ?", [
        collection,
        id,
      ]);
    },

    async getAll(collection) {
      const db = await getDb();
      const rows = await db.getAllAsync<{ json: string }>(
        "SELECT json FROM records WHERE collection = ?",
        [collection],
      );
      return rows.map((r) => parseRow(r.json)) as never;
    },

    async clear(collection) {
      const db = await getDb();
      await db.runAsync("DELETE FROM records WHERE collection = ?", [collection]);
    },

    async bulkPut(collection, rows) {
      const db = await getDb();
      await db.withTransactionAsync(async () => {
        for (const row of rows) {
          const r = row as { id: string };
          await db.runAsync(
            `INSERT INTO records (collection, id, json) VALUES (?, ?, ?)
             ON CONFLICT(collection, id) DO UPDATE SET json = excluded.json`,
            [collection, r.id, JSON.stringify(row)],
          );
        }
      });
    },

    async count(collection) {
      const db = await getDb();
      const row = await db.getFirstAsync<{ c: number }>(
        "SELECT COUNT(*) as c FROM records WHERE collection = ?",
        [collection],
      );
      return row?.c ?? 0;
    },

    async filter(collection, predicate) {
      const all = await store.getAll(collection);
      return all.filter(predicate) as never;
    },

    async whereEquals(collection, field, value) {
      const all = (await store.getAll(collection)) as Array<Record<string, unknown>>;
      return all.filter((r) => r[field] === value) as never;
    },

    async transaction(fn) {
      if (txDepth > 0) {
        return fn();
      }
      const db = await getDb();
      txDepth += 1;
      try {
        let result!: Awaited<ReturnType<typeof fn>>;
        await db.withTransactionAsync(async () => {
          result = await fn();
        });
        return result;
      } finally {
        txDepth -= 1;
      }
    },
  };

  return store;
}

export async function resetSqliteDatabase(): Promise<void> {
  const db = await getDb();
  for (const c of ALL_COLLECTIONS) {
    await db.runAsync("DELETE FROM records WHERE collection = ?", [c]);
  }
}

export type { CollectionName };
