export {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  isRedisConnected,
  isRedisAvailable,
  checkRedisHealth,
  getValue,
  setValue,
  deleteValue,
  increment,
} from "./client";

export {
  checkRedisRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  withRedisRateLimit,
  type RedisRateLimitOptions,
  type RateLimitResult,
} from "./rate-limit";

export {
  getCache,
  setCache,
  deleteCache,
  clearCachePattern,
  clearAllCache,
  getOrSet,
  withCache,
  invalidateCache,
  type CacheOptions,
} from "./cache";