// Server-only module - do not import from client components
import Database from "better-sqlite3";
import path from "path";
import { createLogger } from "@/lib/logging/logger";

const logger = createLogger("database");

// Use relative path for server-only module
const DB_PATH = path.resolve("data/bloodbank.db");

let db: Database.Database | null = null;
let isConnected = false;

export interface DatabaseConfig {
  path?: string;
  readonly?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export function getDb(config: DatabaseConfig = {}): Database.Database {
  if (db && isConnected) {
    return db;
  }

  const dbPath = config.path || DB_PATH;

  try {
    logger.info("Initializing database connection", {
      path: dbPath,
      readonly: config.readonly,
    });

    db = new Database(dbPath, {
      readonly: config.readonly || false,
      timeout: config.timeout || 5000,
      verbose: config.verbose ? console.log : undefined,
    });

    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("synchronous = NORMAL");
    db.pragma("cache_size = -8000");
    db.pragma("temp_store = MEMORY");
    db.pragma("mmap_size = 268435456");

    isConnected = true;

    logger.info("Database connection established", {
      path: dbPath,
    });

    return db;
  } catch (err) {
    logger.logError(
      err instanceof Error ? err : new Error(String(err)),

      { path: dbPath },
    );
    throw err;
  }
}

export function closeDb(): void {
  if (db && isConnected) {
    try {
      db.close();
      logger.info("Database connection closed");
    } catch (err) {
      logger.logError(
        err instanceof Error ? err : new Error(String(err)),

      );
    } finally {
      db = null;
      isConnected = false;
    }
  }
}

export function resetDbConnection(): void {
  closeDb();
  getDb();
}

export function isDbConnected(): boolean {
  return isConnected && db !== null;
}

export function getDbStats(): {
  tables: number;
  size: number;
  journalMode: string;
} {
  const database = getDb();

  const tableCount = (
    database
      .prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .get() as { count: number }
  ).count;

  const size = (
    database
      .prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")
      .get() as { size: number }
  ).size;

  const journalMode = (
    database.prepare("PRAGMA journal_mode").get() as { journal_mode: string }
  ).journal_mode;

  return {
    tables: tableCount,
    size,
    journalMode,
  };
}

export function backupDb(backupPath: string): void {
  const database = getDb();

  try {
    logger.info("Starting database backup", { backupPath });

    database.backup(backupPath);

    logger.info("Database backup completed", { backupPath });
  } catch (err) {
    logger.logError(
      err instanceof Error ? err : new Error(String(err)),

      { backupPath },
    );
    throw err;
  }
}

export function vacuumDb(): void {
  const database = getDb();

  try {
    logger.info("Starting VACUUM");
    database.exec("VACUUM");
    logger.info("VACUUM completed");
  } catch (err) {
      logger.logError(
        err instanceof Error ? err : new Error(String(err)),
      );
    throw err;
  }
}

export function optimizeDb(): void {
  const database = getDb();

  try {
    logger.info("Starting database optimization");
    database.exec("ANALYZE");
    database.exec("PRAGMA optimize");
    logger.info("Database optimization completed");
  } catch (err) {
    logger.logError(
      err instanceof Error ? err : new Error(String(err)),

    );
    throw err;
  }
}

export function executePragmas(): void {
  const database = getDb();

  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("synchronous = NORMAL");
  database.pragma("cache_size = -8000");
  database.pragma("temp_store = MEMORY");
  database.pragma("mmap_size = 268435456");
}

export function beginTransaction(): void {
  const database = getDb();
  database.exec("BEGIN TRANSACTION");
}

export function commitTransaction(): void {
  const database = getDb();
  database.exec("COMMIT");
}

export function rollbackTransaction(): void {
  const database = getDb();
  database.exec("ROLLBACK");
}

export function inTransaction<T>(callback: () => T): T {
  beginTransaction();
  try {
    const result = callback();
    commitTransaction();
    return result;
  } catch (err) {
    rollbackTransaction();
    throw err;
  }
}

export function validateConnection(): boolean {
  try {
    const database = getDb();
    database.prepare("SELECT 1").get();
    return true;
  } catch {
    return false;
  }
}