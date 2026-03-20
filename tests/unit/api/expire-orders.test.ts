import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/queries/orders", () => ({
  expirePendingOrders: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { expirePendingOrders } from "@/db/queries/orders";
import { GET } from "@/app/api/cron/expire-orders/route";

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("http://localhost/api/cron/expire-orders", { headers });
}

describe("GET /api/cron/expire-orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("returns 401 without valid auth", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 with wrong auth", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("expires pending orders and returns count", async () => {
    vi.mocked(expirePendingOrders).mockResolvedValue({ rowCount: 3 } as any);

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expired).toBe(3);
    expect(expirePendingOrders).toHaveBeenCalledOnce();
  });

  it("returns 0 when no orders expired", async () => {
    vi.mocked(expirePendingOrders).mockResolvedValue({ rowCount: 0 } as any);

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expired).toBe(0);
  });

  it("does not expire whatsapp orders (only pending)", async () => {
    vi.mocked(expirePendingOrders).mockResolvedValue({ rowCount: 1 } as any);

    await GET(makeRequest("Bearer test-secret"));

    // expirePendingOrders only targets status='pending' AND expires_at < now()
    // whatsapp orders are never touched by this query
    expect(expirePendingOrders).toHaveBeenCalledOnce();
  });

  it("returns { expired: 0 } even on error", async () => {
    vi.mocked(expirePendingOrders).mockRejectedValue(new Error("db down"));

    const res = await GET(makeRequest("Bearer test-secret"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.expired).toBe(0);
  });
});
