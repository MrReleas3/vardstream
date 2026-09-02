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
  try {
    if (redisClient) {
      const data = await redisClient.get<T>(key);
      return data;
    }
  } catch (err) {
    console.warn("[Redis] Upstash cacheGet error, failing over to local cache:", err);
  }

  // Fallback memory cache
  const cached = global._memoryCache!.get(key);
  if (cached) {
    if (Date.now() > cached.expiresAt) {
      global._memoryCache!.delete(key);
      return null;
    }
    return cached.value as T;
  }
  return null;
}

export async function cacheSet(key: string, value: any, ttlSeconds = 3600): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.set(key, value, { ex: ttlSeconds });
      return;
    }
  } catch (err) {
    console.warn("[Redis] Upstash cacheSet error, storing in local cache:", err);
  }

  // Fallback memory cache
  global._memoryCache!.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.del(key);
    }
  } catch (err) {
    console.warn("[Redis] Upstash cacheDelete error:", err);
  }
  global._memoryCache!.delete(key);
}

export const isRedisConnected = () => !!(upstashUrl && upstashToken);
