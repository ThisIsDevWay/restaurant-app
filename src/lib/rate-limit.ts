/**
 * Rate limiter supporting both Upstash Redis (distributed) and In-Memory fallback.
 * Migrated as per Audit Finding #14.
 */

interface Window {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory store for fallback
const globalStore = new Map<string, Window>();

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function createLimiter(maxRequests: number, windowMs: number) {
  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();

      // Fallback in-memory logic
      const runMemoryFallback = (): RateLimitResult => {
        let win = globalStore.get(identifier);

        if (!win || now > win.resetAt) {
          win = { count: 0, resetAt: now + windowMs };
          globalStore.set(identifier, win);
        }

        if (win.count >= maxRequests) {
          return {
            success: false,
            limit: maxRequests,
            remaining: 0,
            reset: win.resetAt,
          };
        }

        win.count++;
        const remaining = maxRequests - win.count;

        return {
          success: true,
          limit: maxRequests,
          remaining,
          reset: win.resetAt,
        };
      };

      if (!redisUrl || !redisToken) {
        return runMemoryFallback();
      }

      try {
        const bucket = Math.floor(now / windowMs);
        const key = `rl:${identifier}:${bucket}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout for safety

        const res = await fetch(`${redisUrl}/pipeline`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${redisToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            ["INCR", key],
            ["EXPIRE", key, Math.ceil((windowMs * 2) / 1000)],
          ]),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Upstash response not ok: ${res.status}`);
        }

        const data = await res.json();
        const count = data?.[0]?.result;

        if (typeof count !== "number") {
          throw new Error("Invalid response format from Upstash");
        }

        const resetTime = (bucket + 1) * windowMs;

        if (count > maxRequests) {
          return {
            success: false,
            limit: maxRequests,
            remaining: 0,
            reset: resetTime,
          };
        }

        return {
          success: true,
          limit: maxRequests,
          remaining: maxRequests - count,
          reset: resetTime,
        };
      } catch (err) {
        // Fallback to memory on any error
        return runMemoryFallback();
      }
    },
  };
}

export const rateLimiters = {
  paymentWebhook: createLimiter(30, 60_000),  // 30 req/min
  orderStatus: createLimiter(100, 60_000), // 100 req/min
  checkout: createLimiter(30, 60_000),     // 30 req/min
  lookup: createLimiter(40, 60_000),       // 40 req/min
  imagekitUpload: createLimiter(5, 60_000),   // 5 uploads/min per IP
  tvPairCheck: createLimiter(60, 60_000),     // 60 checks/min per IP — TV polls every 4s (15/min); headroom for several TVs behind one NAT. Still trivially safe vs brute-force on a short-lived 6-char code.
  tvPairInit: createLimiter(5, 60_000),       // 5 requests/min per IP
};

export function getIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
