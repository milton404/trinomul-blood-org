import { createLogger } from "@/lib/logging/logger";

const logger = createLogger("redis");

let redisClient: unknown = null;

interface RedisConfig {
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: Record<string, unknown>;
}

export function getRedisClient(_config: RedisConfig = {}) {
  if (redisClient) {
    return redisClient as {
      isOpen: boolean;
      connect: () => Promise<void>;
      quit: () => Promise<void>;
      on: (event: string, callback: Function) => void;
      get: (key: string) => Promise<string | null>;
      set: (key: string, value: string) => Promise<void>;
      setEx: (key: string, seconds: number, value: string) => Promise<void>;
      del: (key: string) => Promise<void>;
      incr: (key: string) => Promise<number>;
      expire: (key: string, seconds: number) => Promise<void>;
      ping: () => Promise<string>;
    };
  }

  logger.warn("Redis is not available. Install redis to enable.");
  return null;
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  
  if (!client.isOpen) {
    await client.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    const client = getRedisClient();
    if (client && client.isOpen) {
      await client.quit();
    }
    redisClient = null;
    logger.info("Redis client disconnected");
  }
}

export function isRedisConnected(): boolean {
  const client = getRedisClient();
  return client?.isOpen === true;
}

export async function checkRedisHealth(): Promise<{
  connected: boolean;
  error?: string;
}> {
  const client = getRedisClient();
  
  if (!client) {
    return {
      connected: false,
      error: "Redis client is not available"
    };
  }

  try {
    if (!client.isOpen) {
      await client.connect();
    }
    await client.ping();
    return { connected: true };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function getValue(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client) return null;
  
  if (!client.isOpen) {
    await client.connect();
  }
  return client.get(key);
}

export async function setValue(
  key: string,
  value: string,
  options?: { expiresIn?: number },
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  if (!client.isOpen) {
    await client.connect();
  }

  if (options?.expiresIn) {
    await client.setEx(key, options.expiresIn, value);
  } else {
    await client.set(key, value);
  }
}

export async function deleteValue(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  if (!client.isOpen) {
    await client.connect();
  }
  await client.del(key);
}

export async function increment(
  key: string,
  options?: { expiresIn?: number },
): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  if (!client.isOpen) {
    await client.connect();
  }

  const result = await client.incr(key);

  if (options?.expiresIn) {
    await client.expire(key, options.expiresIn);
  }

  return result;
}

export async function getAndIncrement(
  key: string,
  windowMs: number,
): Promise<{ count: number; resetTime: number }> {
  const client = getRedisClient();
  if (!client) return { count: 0, resetTime: Date.now() + windowMs };

  if (!client.isOpen) {
    await client.connect();
  }

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowKey = `${key}:${windowStart}`;

  const count = await client.eval({
    keys: [windowKey],
    arguments: [String(Math.ceil(windowMs / 1000))],
  }) as number;

  return {
    count,
    resetTime: windowStart + windowMs,
  };
}

export function isRedisAvailable(): boolean {
  return false;
}
