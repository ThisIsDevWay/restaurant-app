/**
 * Rate limiter supporting both Upstash Redis (distributed) and In-Memory fallback.
 * Migrated as per Audit Finding #14.
 */

import { logger } from "@/lib/logger";

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

function isPrivateIP(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;

  const cleanIp = ip.replace(/^::ffff:/, "");

  // IPv4 Private ranges
  if (cleanIp.startsWith("10.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;
  if (cleanIp.startsWith("192.168.")) return true;
  if (cleanIp.startsWith("169.254.")) return true;

  // IPv6 Private/Local ranges
  const lowerIp = cleanIp.toLowerCase();
  if (lowerIp.startsWith("fe80:")) return true;
  if (lowerIp.startsWith("fc00:")) return true;
  if (lowerIp.startsWith("fd00:")) return true;

  return false;
}

export function getIPFromHeaders(headersList: Headers): string {
  // cf-connecting-ip (Cloudflare)
  const cfConnectingIp = headersList.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp && !isPrivateIP(cfConnectingIp)) {
    return cfConnectingIp;
  }

  // x-real-ip (Direct Real IP proxy)
  const realIp = headersList.get("x-real-ip")?.trim();
  if (realIp && !isPrivateIP(realIp)) {
    return realIp;
  }

  // x-forwarded-for (first public IP from left to right)
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed && !isPrivateIP(trimmed)) {
        return trimmed;
      }
    }
  }

  return "127.0.0.1";
}

interface LimiterOptions {
  failClosed?: boolean;
}

function createLimiter(maxRequests: number, windowMs: number, options?: LimiterOptions) {
  const failClosed = options?.failClosed ?? false;
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
        if (failClosed) {
          return {
            success: false,
            limit: maxRequests,
            remaining: 0,
            reset: now + windowMs,
          };
        }
        return runMemoryFallback();
      }

      try {
        const bucket = Math.floor(now / windowMs);
        const key = `rl:${identifier}:${bucket}`;

        const controller = new AbortController();
        const isDev = process.env.NODE_ENV === "development";
        const timeoutId = setTimeout(() => controller.abort(), isDev ? 2000 : 400); // 400ms in prod, 2000ms in dev to avoid local latency false positives

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
      } catch (err: any) {
        logger.warn("Upstash Redis rate limiter failed, falling back", {
          identifier,
          error: err.message || String(err),
          failClosed,
        });

        if (failClosed) {
          return {
            success: false,
            limit: maxRequests,
            remaining: 0,
            reset: now + windowMs,
          };
        }
        return runMemoryFallback();
      }
    },
  };
}

export const rateLimiters = {
  paymentWebhook: createLimiter(100, 60_000),  // 100 req/min (calibrated for high concurrent banking webhook bursts)
  orderStatus: createLimiter(100, 60_000), // 100 req/min
  checkout: createLimiter(20, 60_000),     // 20 req/min (calibrated checkout threshold)
  lookup: createLimiter(20, 60_000),       // 20 req/min (calibrated customer lookup threshold)
  imagekitUpload: createLimiter(5, 60_000),   // 5 uploads/min per IP
  tvPairCheck: createLimiter(60, 60_000),     // 60 checks/min per IP — TV polls every 4s (15/min); headroom for several TVs behind one NAT. Still trivially safe vs brute-force on a short-lived 6-char code.
  tvPairInit: createLimiter(5, 60_000, { failClosed: true }),       // 5 requests/min per IP
};

export function getIP(request: Request): string {
  if ("ip" in request && typeof (request as any).ip === "string" && (request as any).ip) {
    const ip = (request as any).ip;
    if (!isPrivateIP(ip)) {
      return ip;
    }
  }
  return getIPFromHeaders(request.headers);
}
