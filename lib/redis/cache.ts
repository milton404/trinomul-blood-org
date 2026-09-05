import { createLogger } from "@/lib/logging/logger";
import {
  getRedisClient,
  isRedisConnected,
  getValue,
  setValue,
  deleteValue,
} from "./client";

const logger = createLogger("cache");

export interface CacheOptions {
  ttl?: number;
  keyPrefix?: string;
}

const DEFAULT_TTL = 60 * 60;
const DEFAULT_PREFIX = "cache";

function getCacheKey(prefix: string, key: string): string {
  return `${prefix}:${key}`;
}

export async function getCache<T = unknown>(
  key: string,
  options: CacheOptions = {},
): Promise<T | null> {
  if (!isRedisConnected()) {
    return null;
  }

  const { keyPrefix = DEFAULT_PREFIX } = options;
  const cacheKey = getCacheKey(keyPrefix, key);

  try {
    const value = await getValue(cacheKey);

    if (!value) {
      logger.debug("Cache miss", { key });
      return null;
    }

    logger.debug("Cache hit", { key });
    return JSON.parse(value) as T;
  } catch (err) {
    logger.logError(
      err instanceof Error ? err : new Error(String(err)),
      "Cache get failed",
      { key },
    );
    return null;
  }
}

export async function setCache(
  key: string,
  value: unknown,
  options: CacheOptions = {},
): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  const { ttl = DEFAULT_TTL, keyPrefix = DEFAULT_PREFIX } = options;
  const cacheKey = getCacheKey(keyPrefix, key);

  try {
    const serialized = JSON.stringify(value);
    await setValue(cacheKey, serialized, { expiresIn: ttl });

    logger.debug("Cache set", { key, ttl });
  } catch (err) {
    logger.logError(
      err instanceof Error ? err : new Error(String(err)),
      "Cache set failed",
      { key },
    );
  }
}

export async function deleteCache(
  key: string,
  options: CacheOptions = {},
): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  const { keyPrefix = DEFAULT_PREFIX } = options;
  const cacheKey = getCacheKey(keyPrefix, key);

  try {
    await deleteValue(cacheKey);
    logger.debug("Cache deleted", { key });
  } catch (err) {
    logger.logError(
      err instanceof Error ? err : new Error(String(err)),
      "Cache delete failed",
      { key },
    );
  }
}

export async function clearCachePattern(
  pattern: string,
  options: CacheOptions = {},
): Promise<void> {
  if (!isRedisConnected()) {
    return;
  }

  const { keyPrefix = DEFAULT_PREFIX } = options;
  const cachePattern = `${keyPrefix}:${pattern}`;

  try {
    const client = getRedisClient();
    const keys = await client.keys(cachePattern);

    if (keys.length > 0) {
      await client.del(...keys);
      logger.info("Cache cleared by pattern", { pattern, count: keys.length });
    }
  } catch (err) {
    logger.logError(
      err instanceof Error ? err : new Error(String(err)),
      "Cache clear failed",
      { pattern },
    );
  }
}

export async function clearAllCache(
  options: CacheOptions = {},
): Promise<void> {
  await clearCachePattern("*", options);
}

export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const cached = await getCache<T>(key, options);

  if (cached !== null) {
    return cached;
  }

  const value = await fetcher();
  await setCache(key, value, options);

  return value;
}

export function withCache<T>(
  fetcher: () => Promise<T>,
  key: string,
  options: CacheOptions = {},
): () => Promise<T> {
  return async (): Promise<T> => {
    return getOrSet(key, fetcher, options);
  };
}

export async function invalidateCache(
  keys: string[],
  options: CacheOptions = {},
): Promise<void> {
  for (const key of keys) {
    await deleteCache(key, options);
  }
}