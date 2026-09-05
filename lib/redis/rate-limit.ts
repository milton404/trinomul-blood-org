import { createLogger } from "@/lib/logging/logger";
import {
  getRedisClient,
  isRedisConnected,
  increment,
  getAndIncrement,
} from "./client";

const logger = createLogger("redis-rate-limit");

export interface RedisRateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  lockoutMs?: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
  lockedUntil: number | null;
  retryAfterMs?: number;
}

const DEFAULT_OPTIONS: Required<RedisRateLimitOptions> = {
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
  lockoutMs: 15 * 60 * 1000,
  keyPrefix: "ratelimit",
};

function getKey(
  prefix: string,
  identifier: string,
  windowMs: number,
): string {
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  return `${prefix}:${identifier}:${windowStart}`;
}

function getLockoutKey(prefix: string, identifier: string): string {
  return `${prefix}:lockout:${identifier}`;
}

export async function checkRedisRateLimit(
  identifier: string,
  options: Partial<RedisRateLimitOptions> = {},
): Promise<RateLimitResult> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { maxAttempts, windowMs, lockoutMs } = config;
  const keyPrefix = config.keyPrefix ?? DEFAULT_OPTIONS.keyPrefix;

  if (!isRedisConnected()) {
    logger.warn("Redis not connected, using fallback", { identifier });
    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime: Date.now() + windowMs,
      lockedUntil: null,
    };
  }

  const client = getRedisClient();
  if (!client) {
    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime: Date.now() + windowMs,
      lockedUntil: null,
    };
  }

  const lockoutKey = getLockoutKey(keyPrefix, identifier);

  try {
    const lockoutUntil = await client.get(lockoutKey);

    if (lockoutUntil) {
      const lockoutTime = parseInt(lockoutUntil, 10);
      const now = Date.now();

      if (lockoutTime > now) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: lockoutTime,
          lockedUntil: lockoutTime,
          retryAfterMs: lockoutTime - now,
        };
      }

      await client.del(lockoutKey);
    }

    const { count, resetTime } = await getAndIncrement(
      `${keyPrefix}:${identifier}`,
      windowMs,
    );

    if (count >= maxAttempts) {
      const lockoutUntil = Date.now() + (lockoutMs || windowMs);
      await client.setEx(
        lockoutKey,
        Math.ceil((lockoutMs || windowMs) / 1000),
        String(lockoutUntil),
      );

      logger.warn("Rate limit exceeded, lockout applied", {
        identifier,
        lockoutUntil,
      });

      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: lockoutUntil,
        lockedUntil: lockoutUntil,
        retryAfterMs: lockoutMs || windowMs,
      };
    }

    return {
      allowed: true,
      remainingAttempts: maxAttempts - count,
      resetTime,
      lockedUntil: null,
    };
  } catch (err) {
    logger.logError(
      err instanceof Error ? err : new Error(String(err)),
      { identifier, op: "check" },
    );

    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime: Date.now() + windowMs,
      lockedUntil: null,
    };
  }
}

export async function recordFailedAttempt(
  identifier: string,
  options: Partial<RedisRateLimitOptions> = {},
): Promise<RateLimitResult> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { maxAttempts, windowMs, lockoutMs } = config;
  const keyPrefix = config.keyPrefix ?? DEFAULT_OPTIONS.keyPrefix;

  if (!isRedisConnected()) {
    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime: Date.now() + windowMs,
      lockedUntil: null,
    };
  }

  const { count } = await getAndIncrement(
    `${keyPrefix}:${identifier}`,
    windowMs,
  );

  if (count >= maxAttempts) {
    const lockoutUntil = Date.now() + (lockoutMs || windowMs);
    const client = getRedisClient();
    const lockoutKey = getLockoutKey(keyPrefix, identifier);

    if (client) {
      await client.setEx(
        lockoutKey,
        Math.ceil((lockoutMs || windowMs) / 1000),
        String(lockoutUntil),
      );
    }

    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime: lockoutUntil,
      lockedUntil: lockoutUntil,
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - count,
    resetTime: Date.now() + windowMs,
    lockedUntil: null,
  };
}

export async function clearRateLimit(
  identifier: string,
  options: Partial<RedisRateLimitOptions> = {},
): Promise<void> {
  const keyPrefix = options.keyPrefix ?? DEFAULT_OPTIONS.keyPrefix;

  if (!isRedisConnected()) return;

  const client = getRedisClient();
  if (!client) return;

  const lockoutKey = getLockoutKey(keyPrefix, identifier);

  try {
    const keys = await client.keys(`${keyPrefix}:${identifier}:*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    await client.del(lockoutKey);

    logger.info("Rate limit cleared", { identifier });
  } catch (err) {
    logger.logError(
      err instanceof Error ? err : new Error(String(err)),
      { identifier, op: "clear" },
    );
  }
}

export function withRedisRateLimit(
  handler: (req: Request) => Promise<Response> | Response,
  options: RedisRateLimitOptions,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const url = new URL(req.url);
    const identifier = `${url.pathname}:${ip}`;

    const result = await checkRedisRateLimit(identifier, options);

    if (!result.allowed) {
      logger.warn("Request blocked by rate limit", {
        identifier,
        retryAfterMs: result.retryAfterMs,
      });

      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Try again later.",
          retryAfter: Math.ceil((result.retryAfterMs || 0) / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((result.retryAfterMs || 0) / 1000)),
            "X-RateLimit-Limit": String(options.maxAttempts),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.resetTime),
          },
        },
      );
    }

    const response = await handler(req);

    response.headers.set("X-RateLimit-Limit", String(options.maxAttempts));
    response.headers.set(
      "X-RateLimit-Remaining",
      String(result.remainingAttempts),
    );
    response.headers.set("X-RateLimit-Reset", String(result.resetTime));

    return response;
  };
}