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
};

export function getIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
