import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token";
});

import { getIPFromHeaders, getIP, rateLimiters } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Mock del logger
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Rate Limit Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isPrivateIP", () => {
    it("should classify loopback and local IPs as private", () => {
      const headers1 = new Headers({ "x-forwarded-for": "127.0.0.1" });
      expect(getIPFromHeaders(headers1)).toBe("127.0.0.1");

      const headers2 = new Headers({ "x-forwarded-for": "::1" });
      expect(getIPFromHeaders(headers2)).toBe("127.0.0.1");

      const headers3 = new Headers({ "x-forwarded-for": "localhost" });
      expect(getIPFromHeaders(headers3)).toBe("127.0.0.1");
    });

    it("should classify RFC 1918 IPv4 private ranges as private", () => {
      // 10.x.x.x
      expect(getIPFromHeaders(new Headers({ "x-forwarded-for": "10.0.0.1" }))).toBe("127.0.0.1");
      // 172.16-31.x.x
      expect(getIPFromHeaders(new Headers({ "x-forwarded-for": "172.16.2.3" }))).toBe("127.0.0.1");
      expect(getIPFromHeaders(new Headers({ "x-forwarded-for": "172.31.255.255" }))).toBe("127.0.0.1");
      expect(getIPFromHeaders(new Headers({ "x-forwarded-for": "172.32.0.1" }))).toBe("172.32.0.1"); // Public
      // 192.168.x.x
      expect(getIPFromHeaders(new Headers({ "x-forwarded-for": "192.168.1.100" }))).toBe("127.0.0.1");
    });

    it("should classify link-local and private IPv6 ranges as private", () => {
      expect(getIPFromHeaders(new Headers({ "x-forwarded-for": "fe80::1" }))).toBe("127.0.0.1");
      expect(getIPFromHeaders(new Headers({ "x-forwarded-for": "fc00::1" }))).toBe("127.0.0.1");
      expect(getIPFromHeaders(new Headers({ "x-forwarded-for": "fd00::1" }))).toBe("127.0.0.1");
    });

    it("should allow public IPv4 and IPv6 addresses", () => {
      expect(getIPFromHeaders(new Headers({ "x-forwarded-for": "8.8.8.8" }))).toBe("8.8.8.8");
      expect(getIPFromHeaders(new Headers({ "x-forwarded-for": "2001:4860:4860::8888" }))).toBe("2001:4860:4860::8888");
    });
  });

  describe("getIPFromHeaders", () => {
    it("should extract first public IP from x-forwarded-for", () => {
      const headers = new Headers({
        "x-forwarded-for": "10.0.0.1, 192.168.1.20, 203.0.113.195, 8.8.8.8",
      });
      expect(getIPFromHeaders(headers)).toBe("203.0.113.195");
    });

    it("should prioritize headers in order: cf-connecting-ip -> x-real-ip -> x-forwarded-for", () => {
      const headers = new Headers({
        "cf-connecting-ip": "1.1.1.1",
        "x-real-ip": "2.2.2.2",
        "x-forwarded-for": "3.3.3.3",
      });
      expect(getIPFromHeaders(headers)).toBe("1.1.1.1");

      const headersNoCf = new Headers({
        "x-real-ip": "2.2.2.2",
        "x-forwarded-for": "3.3.3.3",
      });
      expect(getIPFromHeaders(headersNoCf)).toBe("2.2.2.2");

      const headersOnlyForwarded = new Headers({
        "x-forwarded-for": "3.3.3.3",
      });
      expect(getIPFromHeaders(headersOnlyForwarded)).toBe("3.3.3.3");
    });

    it("should skip private IPs in cf-connecting-ip and x-real-ip", () => {
      const headers = new Headers({
        "cf-connecting-ip": "10.0.0.5", // Private
        "x-real-ip": "8.8.8.8", // Public
      });
      expect(getIPFromHeaders(headers)).toBe("8.8.8.8");

      const headersAllPrivate = new Headers({
        "cf-connecting-ip": "10.0.0.5",
        "x-real-ip": "192.168.1.1",
      });
      expect(getIPFromHeaders(headersAllPrivate)).toBe("127.0.0.1");
    });
  });

  describe("getIP", () => {
    it("should return request.ip if it is a public IP", () => {
      const req = {
        ip: "8.8.8.8",
        headers: new Headers({
          "x-forwarded-for": "1.1.1.1",
        }),
      } as any;
      expect(getIP(req)).toBe("8.8.8.8");
    });

    it("should fallback to headers if request.ip is private or undefined", () => {
      const reqPrivate = {
        ip: "10.0.0.1",
        headers: new Headers({
          "x-forwarded-for": "8.8.8.8",
        }),
      } as any;
      expect(getIP(reqPrivate)).toBe("8.8.8.8");

      const reqUndefined = {
        headers: new Headers({
          "x-forwarded-for": "8.8.8.8",
        }),
      } as any;
      expect(getIP(reqUndefined)).toBe("8.8.8.8");
    });
  });

  describe("createLimiter with failClosed", () => {
    it("should fail-closed on Upstash Redis connection error if failClosed is true", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network Error"));

      const result = await rateLimiters.tvPairInit.limit("test-ip");
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);

      expect(logger.warn).toHaveBeenCalledWith(
        "Upstash Redis rate limiter failed, falling back",
        expect.objectContaining({
          identifier: "test-ip",
          failClosed: true,
        })
      );
      fetchSpy.mockRestore();
    });

    it("should fail-open (in-memory fallback) on Upstash Redis error if failClosed is false", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network Error"));

      const result = await rateLimiters.checkout.limit("test-ip");
      expect(result.success).toBe(true);

      expect(logger.warn).toHaveBeenCalledWith(
        "Upstash Redis rate limiter failed, falling back",
        expect.objectContaining({
          identifier: "test-ip",
          failClosed: false,
        })
      );
      fetchSpy.mockRestore();
    });

    it("should abort call if timeout is reached", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(async (url, init: any) => {
        return new Promise((_, reject) => {
          if (init?.signal) {
            if (init.signal.aborted) {
              reject(new DOMException("The user aborted a request.", "AbortError"));
              return;
            }
            init.signal.addEventListener("abort", () => {
              reject(new DOMException("The user aborted a request.", "AbortError"));
            });
          }
        });
      });

      const limitPromise = rateLimiters.checkout.limit("test-ip-timeout");
      
      const result = await limitPromise;
      expect(result.success).toBe(true);

      expect(logger.warn).toHaveBeenCalledWith(
        "Upstash Redis rate limiter failed, falling back",
        expect.objectContaining({
          identifier: "test-ip-timeout",
          error: expect.stringContaining("aborted"),
        })
      );

      fetchSpy.mockRestore();
    });
  });

  describe("no Redis credentials", () => {
    it("should fail-closed if failClosed is true and credentials are not present", async () => {
      vi.resetModules();
      
      const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
      const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      try {
        const { rateLimiters: noCredLimiters } = await import("@/lib/rate-limit");
        
        // tvPairInit is failClosed
        const result = await noCredLimiters.tvPairInit.limit("test-no-creds");
        expect(result.success).toBe(false);
        expect(result.remaining).toBe(0);

        // checkout is failOpen
        const resultOpen = await noCredLimiters.checkout.limit("test-no-creds-open");
        expect(resultOpen.success).toBe(true);
      } finally {
        process.env.UPSTASH_REDIS_REST_URL = originalUrl;
        process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
      }
    });
  });
});
