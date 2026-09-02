import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimitInstance: Ratelimit | null = null;

if (upstashUrl && upstashToken) {
  const redis = new Redis({
    url: upstashUrl,
    token: upstashToken,
  });

  ratelimitInstance = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    analytics: true,
  });
}

// In-memory fallback rate limiter
const memoryLimiter = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  identifier: string,
  limit = 60,
  windowSeconds = 60
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  if (ratelimitInstance) {
    try {
      const res = await ratelimitInstance.limit(identifier);
      return {
        success: res.success,
        limit: res.limit,
        remaining: res.remaining,
        reset: res.reset,
      };
    } catch (err) {
      console.warn("[RateLimit] Upstash error, using local fallback:", err);
    }
  }

  const now = Date.now();
  const entry = memoryLimiter.get(identifier);

  if (!entry || now > entry.resetAt) {
    memoryLimiter.set(identifier, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowSeconds * 1000,
    };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  entry.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    reset: entry.resetAt,
  };
}
