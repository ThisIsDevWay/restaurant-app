import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/db/queries/settings", () => ({
  getSettingsFresh: vi.fn().mockResolvedValue({
    localDeviceToken: "test-token",
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimiters: {
    paymentWebhook: { limit: vi.fn().mockResolvedValue({ success: true }) },
  },
  getIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("@/lib/crypto", () => ({
  verifyDeviceToken: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "@/app/api/local-notifications/route";
import { parseReceiveTime } from "@/app/api/local-notifications/utils";

describe("parseReceiveTime helper", () => {
  it("parses numeric millisecond timestamps correctly", () => {
    const timestamp = 1719280000000;
    const res = parseReceiveTime(String(timestamp));
    expect(res).not.toBeNull();
    expect(res?.getTime()).toBe(timestamp);
  });

  it("parses ISO strings with timezone offsets correctly", () => {
    const isoString = "2026-06-24T00:43:25Z";
    const res = parseReceiveTime(isoString);
    expect(res).not.toBeNull();
    expect(res?.getTime()).toBe(new Date(isoString).getTime());
  });

  it("parses date strings without timezones as America/Caracas", () => {
    const localStr = "2026-06-23 20:43:25";
    const res = parseReceiveTime(localStr);
    expect(res).not.toBeNull();
    // 2026-06-23 20:43:25 Caracas time (-04:00) should equal 2026-06-24 00:43:25 UTC
    expect(res?.toISOString()).toBe("2026-06-24T00:43:25.000Z");
  });
});

describe("POST /api/local-notifications (SMS Age Validation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects SMS older than 60 minutes", async () => {
    // Current time: 2026-06-24 00:43:25 UTC
    const mockNow = new Date("2026-06-24T00:43:25.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(mockNow);

    // SMS is from 65 minutes ago (2026-06-23 23:38:25 UTC)
    const receiveTime = new Date(mockNow - 65 * 60 * 1000).toISOString();

    const request = new Request("http://localhost/api/local-notifications", {
      method: "POST",
      headers: { "X-Device-Token": "test-token" },
      body: JSON.stringify({
        sender: "278",
        message: "BDV: Pago Movil recibido por Bs. 150,00 de V-12345678 Cel. 04141234567 Ref: 98765432",
        source: "sms",
        receiveTime,
      }),
    });

    const res = await POST(request);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("SMS muy antiguo");
  });

  it("accepts SMS within 60 minutes", async () => {
    const mockNow = new Date("2026-06-24T00:43:25.000Z").getTime();
    vi.spyOn(Date, "now").mockReturnValue(mockNow);

    // SMS is from 10 minutes ago
    const receiveTime = new Date(mockNow - 10 * 60 * 1000).toISOString();

    const request = new Request("http://localhost/api/local-notifications", {
      method: "POST",
      headers: { "X-Device-Token": "test-token" },
      body: JSON.stringify({
        sender: "278",
        message: "BDV: Pago Movil recibido por Bs. 150,00 de V-12345678 Cel. 04141234567 Ref: 98765432",
        source: "sms",
        receiveTime,
      }),
    });

    const res = await POST(request);
    // Since db mock is not fully reconciling, it should not fail on age check and attempt to continue
    expect(res.status).not.toBe(400);
  });
});
