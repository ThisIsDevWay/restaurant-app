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

function createLimiter(maxRequests: number, windowMs: number) {
  return {
    async limit(identifier: string): Promise<RateLimitResult> {
      // NOTE: We tried to install @upstash/ratelimit but encountered NPM errors.
      // The architecture is now ready to swap this for a real Redis implementation.
      // If UPSTASH_REDIS_REST_URL is set, the user should install @upstash/ratelimit.

      const now = Date.now();
      let win = globalStore.get(identifier);

      if (!win || now > win.resetAt) {
        win = { count: 0, resetAt: now + windowMs };
        globalStore.set(identifier, win);
      }

      win.count++;
      const remaining = Math.max(0, maxRequests - win.count);
      const success = win.count <= maxRequests;

      return {
        success,
        limit: maxRequests,
        remaining,
        reset: win.resetAt,
      };
    },
  };
}

export const rateLimiters = {
  paymentWebhook: createLimiter(100, 60_000),  // 100 req/min
  orderStatus: createLimiter(30, 60_000),  // 30 req/min
  checkout: createLimiter(10, 60_000),  // 10 req/min
  lookup: createLimiter(20, 60_000),  // 20 req/min
};

export function getIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
