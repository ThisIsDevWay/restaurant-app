/**
 * In-memory rate limiter using a sliding window algorithm.
 * Zero external dependencies. Works in Node.js and Vercel serverless.
 *
 * Note: Each serverless function instance has its own memory. This means
 * limits are per-instance, which is suitable for burst protection but not
 * for strict global quotas across many concurrent users.
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

function createLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, Window>();

  // Periodically clean up expired windows to prevent memory leaks.
  const cleanup = () => {
    const now = Date.now();
    for (const [key, win] of store) {
      if (now > win.resetAt) store.delete(key);
    }
  };
  // Run cleanup every minute (only in long-running environments)
  if (typeof setInterval !== "undefined") {
    setInterval(cleanup, 60_000).unref?.();
  }

  return {
    limit(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();
      let win = store.get(identifier);

      if (!win || now > win.resetAt) {
        win = { count: 0, resetAt: now + windowMs };
        store.set(identifier, win);
      }

      win.count++;
      const remaining = Math.max(0, maxRequests - win.count);
      const success = win.count <= maxRequests;

      return Promise.resolve({
        success,
        limit: maxRequests,
        remaining,
        reset: win.resetAt,
      });
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
