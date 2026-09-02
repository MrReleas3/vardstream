import { Redis } from "@upstash/redis";

declare global {
  // eslint-disable-next-line no-var
  var _memoryCache: Map<string, { value: any; expiresAt: number }> | undefined;
}

if (!global._memoryCache) {
  global._memoryCache = new Map();
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient: Redis | null = null;

if (upstashUrl && upstashToken) {
  redisClient = new Redis({
    url: upstashUrl,
    token: upstashToken,
  });
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  // 1. Check L1 in-process memory cache first (0.01ms)
  const cached = global._memoryCache!.get(key);
  if (cached) {
    if (Date.now() <= cached.expiresAt) {
      return cached.value as T;
    }
    global._memoryCache!.delete(key);
  }

  // 2. Check L2 Upstash Redis if configured
  if (redisClient) {
    try {
      const data = await redisClient.get<T>(key);
      if (data !== null && data !== undefined) {
        // Populate L1 cache for subsequent fast reads
        global._memoryCache!.set(key, {
          value: data,
          expiresAt: Date.now() + 300 * 1000, // 5 min L1 TTL
        });
        return data;
      }
    } catch (err: any) {
      if (err?.digest !== "DYNAMIC_SERVER_USAGE") {
        console.warn("[Redis] Upstash cacheGet error:", err);
      }
    }
  }

  return null;
}

export async function cacheSet(key: string, value: any, ttlSeconds = 3600): Promise<void> {
  // 1. Populate L1 memory cache
  global._memoryCache!.set(key, {
    value,
    expiresAt: Date.now() + Math.min(ttlSeconds, 1800) * 1000,
  });

  // 2. Populate L2 Upstash Redis if configured
  if (redisClient) {
    try {
      await redisClient.set(key, value, { ex: ttlSeconds });
    } catch (err: any) {
      if (err?.digest !== "DYNAMIC_SERVER_USAGE") {
        console.warn("[Redis] Upstash cacheSet error:", err);
      }
    }
  }
}

export async function cacheDelete(key: string): Promise<void> {
  global._memoryCache!.delete(key);
  if (redisClient) {
    try {
      await redisClient.del(key);
    } catch (err: any) {
      if (err?.digest !== "DYNAMIC_SERVER_USAGE") {
        console.warn("[Redis] Upstash cacheDelete error:", err);
      }
    }
  }
}

export const isRedisConnected = () => !!(upstashUrl && upstashToken);
