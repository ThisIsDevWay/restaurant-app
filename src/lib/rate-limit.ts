import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

const passthrough: RateLimitResult = {
  success: true,
  limit: 999,
  remaining: 999,
  reset: 0,
};

function createLimiter(
  limiter: ReturnType<typeof Ratelimit.slidingWindow>,
  prefix: string,
) {
  if (!isConfigured()) {
    return { limit: () => Promise.resolve(passthrough) };
  }

  return new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    }),
    limiter,
    prefix,
  });
}

export const rateLimiters = {
  paymentWebhook: createLimiter(
    Ratelimit.slidingWindow(100, "1 m"),
    "rl:webhook",
  ),
  orderStatus: createLimiter(
    Ratelimit.slidingWindow(30, "1 m"),
    "rl:order-status",
  ),
  checkout: createLimiter(
    Ratelimit.slidingWindow(10, "1 m"),
    "rl:checkout",
  ),
};

export function getIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
