import * as SQLite from 'expo-sqlite';

const DB_NAME = 'bloodbank_cache.db';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cache_store (
  key TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await dbInstance.execAsync(SCHEMA);
  return dbInstance;
}

export interface CacheEntry<T> {
  data: T[];
  updatedAt: number;
}

export async function saveCache<T>(key: string, data: T[]): Promise<void> {
  try {
    const db = await getDb();
    const now = Date.now();
    await db.runAsync(
      `INSERT INTO cache_store (key, data, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at;`,
      [key, JSON.stringify(data), now],
    );
  } catch {
    // ignore cache write errors
  }
}

export async function loadCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ data: string; updated_at: number }>(
      `SELECT data, updated_at FROM cache_store WHERE key = ?;`,
      [key],
    );
    if (!row) return null;
    const parsed = JSON.parse(row.data);
    if (!Array.isArray(parsed)) return null;
    return { data: parsed as T[], updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

export async function getCacheAge(key: string): Promise<number | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ updated_at: number }>(
      `SELECT updated_at FROM cache_store WHERE key = ?;`,
      [key],
    );
    if (!row) return null;
    return Date.now() - row.updated_at;
  } catch {
    return null;
  }
}

export async function clearCache(key?: string): Promise<void> {
  try {
    const db = await getDb();
    if (key) {
      await db.runAsync(`DELETE FROM cache_store WHERE key = ?;`, [key]);
    } else {
      await db.execAsync(`DELETE FROM cache_store;`);
    }
  } catch {
    // ignore
  }
}

export const CACHE_KEYS = {
  donors: 'donors',
  requests: 'requests',
  feed: 'feed',
  feedAll: 'feed:all',
  leaderboard: 'leaderboard',
} as const;